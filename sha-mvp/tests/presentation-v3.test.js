import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PRESETS } from "../src/lib/AlgorithmSimulation.js";
import {
  calculateHouseholdIncome,
  DEFAULT_COMMON_ASSESSMENT_PERIOD
} from "../src/lib/household-income.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";
import { buildReceiptViewModel } from "../src/presentation/receipt-view-model.js";
import { recalculateCorrectedSource } from "../src/presentation/recalculate-correction.js";
import { formatV3TextStatement } from "../src/presentation/v3-statement-formatter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runWanjiruAssessment(adminParams = { enableExperimentalPolicyAdjustments: false }) {
  const preset = PRESETS.find((p) => p.name === "Wanjiru — Retail Market Trader");
  assert.ok(preset, "Wanjiru preset must exist");

  const snapshot = calculateHouseholdIncome(
    preset.inputs.incomeSources,
    DEFAULT_COMMON_ASSESSMENT_PERIOD
  );
  assert.equal(snapshot.isValid, true);
  assert.equal(snapshot.canPopulatePrototypeEarnedIncomeBase, true);

  const inputs = {
    ...preset.inputs,
    activeScenario: preset.name,
    monthlyNetEarnedIncome: snapshot.monthlyEarnedNetKsh,
    incomeAssessmentSnapshot: snapshot
  };

  const versions = calculateProposedModelVersions(inputs, adminParams);
  const nxt = {
    ...versions.declaredIncome.result,
    modelVersion: versions.declaredIncome.id,
    annualIncome: versions.declaredIncome.result.estimatedAnnualIncome,
    monthly: versions.declaredIncome.result.monthlyContribution,
    incomeAssessmentSnapshot: snapshot
  };

  return {
    d: inputs,
    next: nxt,
    modelVersions: versions,
    adminParamsSnapshot: { ...adminParams },
    auditRecord: { localAssessmentId: "DEMO-WANJIRU-RETAIL-001" }
  };
}

test("Presentation v3: App initializes experimental policy adjustments as false", () => {
  const appSource = fs.readFileSync(path.resolve(__dirname, "../src/App.jsx"), "utf8");
  assert.match(appSource, /enableExperimentalPolicyAdjustments:\s*false/);
  assert.match(appSource, /const DEFAULT_SCENARIO\s*=\s*"Wanjiru — Retail Market Trader"/);
});

test("Presentation v3: Wanjiru baseline (experimental adjustments OFF) computes KSh 360,000 AGI and KSh 825/month", () => {
  const results = runWanjiruAssessment({ enableExperimentalPolicyAdjustments: false });
  const receipt = buildReceiptViewModel(results);

  assert.equal(receipt.household.headName, "Wanjiru");
  assert.equal(receipt.household.dependantCount, 4);
  assert.equal(receipt.totals.totalGrossAnnualKsh, 540000);
  assert.equal(receipt.totals.totalExpensesAnnualKsh, 180000);
  assert.equal(receipt.totals.totalNetAnnualKsh, 360000);
  assert.equal(receipt.incomeLines[0].openingStockKsh, 15000);
  assert.equal(receipt.incomeLines[0].stockPurchasesKsh, 120000);
  assert.equal(receipt.incomeLines[0].closingStockKsh, 15000);
  assert.equal(receipt.incomeLines[0].costOfGoodsSoldKsh, 120000);
  assert.equal(receipt.incomeLines[0].operatingCostsKsh, 60000);

  assert.equal(receipt.colAdjustment.amount, 0);
  assert.equal(receipt.depAdjustment.amount, 0);
  assert.equal(receipt.totalAdjustmentsKsh, 0);
  assert.equal(receipt.reconciliation.adjustedGrossIncomeKsh, 360000);
  assert.equal(receipt.contribution.annualContributionAtRate, 9900);
  assert.equal(receipt.contribution.finalMonthlyEquivalent, 825);
  assert.equal(receipt.contribution.minimumContributionFloorApplied, false);
});

test("Presentation v3: formatV3TextStatement produces complete 100-col statement bound to live results", () => {
  const results = runWanjiruAssessment({ enableExperimentalPolicyAdjustments: false });
  const receipt = buildReceiptViewModel(results);
  const text = formatV3TextStatement(results, receipt);

  assert.ok(text.includes("TAARIFA YA MICHANGO YA MWANACHAMA"));
  assert.ok(text.includes("CALCULATED PROTOTYPE CONTRIBUTION: KSh 825 PER MONTH · KSh 9,900 PER YEAR"));
  assert.ok(text.includes("Experimental household deductions DISABLED for this baseline run"));
  assert.ok(text.includes("COGS = KSh 15,000 + KSh 120,000 − KSh 15,000 = KSh 120,000"));
  assert.ok(text.includes("FINAL ADJUSTED GROSS INCOME (AGI):"));
  assert.ok(text.includes("09. PAYMENT STATUS — NOT A PAYMENT RECEIPT"));
  assert.ok(text.includes("Payment initiated: NO"));
  assert.ok(text.includes("END OF STATEMENT — NOT AN OFFICIAL SHA DOCUMENT"));
});

test("Presentation v3: formatV3TextStatement updates dynamically when experimental adjustments are enabled", () => {
  const results = runWanjiruAssessment({ enableExperimentalPolicyAdjustments: true });
  const receipt = buildReceiptViewModel(results);
  const text = formatV3TextStatement(results, receipt);

  assert.equal(receipt.contribution.finalMonthlyEquivalent, 374);
  assert.ok(text.includes("CALCULATED PROTOTYPE CONTRIBUTION: KSh 374 PER MONTH · KSh 4,488 PER YEAR"));
  assert.ok(text.includes("Experimental household deductions ENABLED"));
});

test("Presentation v3: Correction workflow recalculates via engine without mutating original Wanjiru baseline", () => {
  const originalResults = runWanjiruAssessment({ enableExperimentalPolicyAdjustments: false });
  const originalReceipt = buildReceiptViewModel(originalResults);
  assert.equal(originalReceipt.contribution.finalMonthlyEquivalent, 825);

  const corrected = recalculateCorrectedSource({
    originalInputs: originalResults.d,
    originalResults,
    sourceId: "src-wanjiru-retail",
    correctedAmountReceivedKsh: 520000,
    correctedCostsKsh: 180000,
    explanation: "Duplicated sales notebook entry removed",
    adminParams: originalResults.adminParamsSnapshot
  });

  // Original remains untouched
  assert.equal(originalResults.d.incomeSources[0].amountReceivedKsh, 540000);
  assert.equal(originalResults.next.monthlyContribution, 825);

  // Revised matches engine calculation (340,000 net -> 28,333/mo * 12 = 339,996 -> 779/mo)
  assert.equal(corrected.comparison.originalMonthlyContribution, 825);
  assert.equal(corrected.comparison.revisedMonthlyContribution, 779);
  assert.equal(corrected.comparison.monthlyDifference, -46);

  // Also test floor application at 300,000 gross (120,000 net -> 275/mo -> floor 300)
  const floored = recalculateCorrectedSource({
    originalInputs: originalResults.d,
    originalResults,
    sourceId: "src-wanjiru-retail",
    correctedAmountReceivedKsh: 300000,
    correctedCostsKsh: 180000,
    explanation: "Lower verified turnover",
    adminParams: originalResults.adminParamsSnapshot
  });

  assert.equal(floored.comparison.revisedMonthlyContribution, 300);
  assert.equal(floored.comparison.minimumFloorStillApplied, true);
  assert.ok(floored.comparison.explanationText.includes("minimum floor"));

  // Gross-only correction preserves inventory purchases/stock breakdown
  const grossOnly = recalculateCorrectedSource({
    originalInputs: originalResults.d,
    originalResults,
    sourceId: "src-wanjiru-retail",
    correctedAmountReceivedKsh: 300000,
    correctedCostsKsh: null,
    explanation: "Lower verified turnover",
    adminParams: originalResults.adminParamsSnapshot
  });
  const grossOnlyLine = grossOnly.correctedSnapshot.lines[0];
  assert.equal(grossOnly.comparison.originalSourceCosts, 180000);
  assert.equal(grossOnly.comparison.correctedSourceCosts, 180000);
  assert.equal(grossOnlyLine.stockPurchasesKsh, 120000);
  assert.equal(grossOnlyLine.costOfGoodsSoldKsh, 120000);
  assert.equal(grossOnlyLine.otherOperatingCostsKsh, 60000);
});

test("Presentation v3: formatV3TextStatement preserves long asset lists without truncating", () => {
  const results = runWanjiruAssessment({ enableExperimentalPolicyAdjustments: false });
  results.d = {
    ...results.d,
    assets: ["RADIO", "SMARTPHONE", "TV", "FRIDGE", "COMPUTER", "CAR"]
  };
  const receipt = buildReceiptViewModel(results);
  const text = formatV3TextStatement(results, receipt);

  assert.ok(text.includes("Radio, Smartphone, TV, Fridge, Computer, Car"));
  assert.ok(text.includes("External records: Not connected"));
});
