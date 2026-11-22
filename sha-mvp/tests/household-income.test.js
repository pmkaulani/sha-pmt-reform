import test from "node:test";
import assert from "node:assert/strict";

import {
  validateIncomeSources,
  calculateHouseholdIncome,
  reproduceHouseholdIncome,
  calculateMonthsFromDates,
  OPERATING_EXPENSE_CATEGORIES,
} from "../src/lib/household-income.js";
import {
  PRESETS,
  calculateProposedModel,
  calculateCurrentModel,
  calculateCurrentModelContribution,
} from "../src/lib/AlgorithmSimulation.js";
import { calculateProposedModel as calculateOriginalAgi } from "../src/lib/AlgorithmSimulation.original-agi-v2.1.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

function source(overrides = {}) {
  return {
    id: "income-1",
    sourceType: "EMPLOYMENT_WAGES",
    monthsObserved: 12,
    amountReceivedKsh: 216000,
    directCostsKsh: 0,
    alreadyIncludedElsewhere: false,
    isSeasonal: false,
    ...overrides,
  };
}

// ─── 1. CORE SOURCE CALCULATIONS & RECONCILIATION ─────────────────────────────

test("calculates wages and business net earnings separately", () => {
  const result = calculateHouseholdIncome([
    source({
      id: "wages",
      amountReceivedKsh: 216000,
    }),

    source({
      id: "business",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 360000,
      directCostsKsh: 180000,
    }),
  ]);

  assert.equal(result.isValid, true);
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, true);

  // Wages: 216,000 / 12 = 18,000
  // Business: (360,000 - 180,000) / 12 = 15,000
  assert.equal(result.monthlyEarnedNetKsh, 33000);
  assert.equal(result.annualisedEarnedNetKsh, 396000);
});

test("calculates casual labour and rental income with allowable costs", () => {
  const result = calculateHouseholdIncome([
    source({
      id: "casual",
      sourceType: "CASUAL_LABOUR",
      monthsObserved: 6,
      amountReceivedKsh: 72000, // 12,000/mo
      directCostsKsh: 0,
    }),
    source({
      id: "rental",
      sourceType: "RENTAL_INCOME",
      monthsObserved: 12,
      amountReceivedKsh: 120000,
      directCostsKsh: 24000, // net 96,000 / 12 = 8,000/mo
    }),
  ]);

  assert.equal(result.isValid, true);
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(result.monthlyEarnedNetKsh, 20000);
  assert.equal(result.annualisedEarnedNetKsh, 240000);
});

// ─── 2. REFERENCE PERIOD & OBSERVATION WINDOW TESTS ───────────────────────────

test("1. Common reference-period validation accepts valid dates and rejects inverted periods", () => {
  const validPeriod = { startDate: "2026-01-01", endDate: "2026-12-31" };
  const validCheck = validateIncomeSources([source()], validPeriod);
  assert.equal(validCheck.isValid, true);

  const invertedPeriod = { startDate: "2026-12-31", endDate: "2026-01-01" };
  const invertedCheck = validateIncomeSources([source()], invertedPeriod);
  assert.equal(invertedCheck.isValid, false);
  assert.match(invertedCheck.errors[0], /start date cannot be after end date/i);
});

test("2. Different source observation windows calculate correct duration from explicit dates", () => {
  const calculatedMonths = calculateMonthsFromDates("2026-01-01", "2026-06-30");
  assert.equal(calculatedMonths, 6);

  const result = calculateHouseholdIncome([
    source({
      id: "trader-6mo",
      sourceType: "SELF_EMPLOYMENT",
      observationStartDate: "2026-01-01",
      observationEndDate: "2026-06-30",
      amountReceivedKsh: 120000,
      directCostsKsh: 30000, // net 90,000 / 6 = 15,000/mo
    }),
    source({
      id: "wages-12mo",
      sourceType: "EMPLOYMENT_WAGES",
      observationStartDate: "2026-01-01",
      observationEndDate: "2026-12-31",
      amountReceivedKsh: 240000, // 20,000/mo
    }),
  ]);

  assert.equal(result.isValid, true);
  assert.equal(result.monthlyEarnedNetKsh, 35000);
  assert.ok(result.reviewFlags.some(f => f.code === "SHORT_WINDOW_PROVISIONAL"));
});

test("3. Missing periods and invalid observation dates are rejected", () => {
  const missing = validateIncomeSources([
    source({ monthsObserved: undefined, observationStartDate: null, observationEndDate: null }),
  ]);
  assert.equal(missing.isValid, false);
  assert.match(missing.errors[0], /Observation period must be between 1 and 12 months/i);

  const invertedDates = validateIncomeSources([
    source({ observationStartDate: "2026-10-01", observationEndDate: "2026-02-01" }),
  ]);
  assert.equal(invertedDates.isValid, false);
  assert.match(invertedDates.errors[0], /start date must be before end date/i);
});

// ─── 3. DUPLICATE RELATIONSHIP SAFEGUARDS ──────────────────────────────────────

test("4. Duplicate relationships: includedInSourceId correctly identifies parent source without double counting", () => {
  const result = calculateHouseholdIncome([
    source({
      id: "shop-main",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 240000,
      directCostsKsh: 60000, // net 180,000 / 12 = 15,000/mo
    }),
    source({
      id: "shop-mobile-receipts",
      sourceType: "OTHER_EARNED",
      amountReceivedKsh: 120000,
      includedInSourceId: "shop-main",
    }),
  ]);

  assert.equal(result.isValid, true);
  assert.equal(result.monthlyEarnedNetKsh, 15000);
  assert.equal(result.duplicateRelationships.length, 1);
  assert.equal(result.duplicateRelationships[0].childSourceId, "shop-mobile-receipts");
  assert.equal(result.duplicateRelationships[0].parentSourceId, "shop-main");

  const dupFlag = result.reviewFlags.find(f => f.code === "DUPLICATE_SOURCE_NOT_COUNTED");
  assert.ok(dupFlag);
  assert.match(dupFlag.message, /shop-main/);
});

test("5. Circular duplicate references and non-existent parent sources are rejected", () => {
  // Missing parent reference
  const missingParent = validateIncomeSources([
    source({ id: "src-1", includedInSourceId: "non-existent-source" }),
  ]);
  assert.equal(missingParent.isValid, false);
  assert.match(missingParent.errors[0], /does not exist/i);

  // Self reference
  const selfRef = validateIncomeSources([
    source({ id: "src-1", includedInSourceId: "src-1" }),
  ]);
  assert.equal(selfRef.isValid, false);
  assert.match(selfRef.errors[0], /cannot refer to itself/i);

  // Circular reference: src-1 -> src-2 -> src-1
  const circular = validateIncomeSources([
    source({ id: "src-1", includedInSourceId: "src-2" }),
    source({ id: "src-2", includedInSourceId: "src-1" }),
  ]);
  assert.equal(circular.isValid, false);
  assert.match(circular.errors[0], /circular duplicate relationship detected/i);
});

// ─── 4. EXPENSE CATEGORIES & BUSINESS RECONCILIATION ──────────────────────────

test("6. Expense-category validation accepts legitimate operating expenses and rejects invalid categories", () => {
  const validExpenses = [
    { category: "STOCK_PURCHASES", amountKsh: 50000, description: "Wholesale grain stock" },
    { category: "FUEL_TRANSPORT", amountKsh: 10000, description: "Truck transport" },
    { category: "RENT_UTILITIES", amountKsh: 15000, description: "Market stall fee" },
  ];

  const validSource = source({
    id: "retail",
    sourceType: "SELF_EMPLOYMENT",
    amountReceivedKsh: 200000,
    expenses: validExpenses,
  });

  const validResult = validateIncomeSources([validSource]);
  assert.equal(validResult.isValid, true);

  const invalidSource = source({
    id: "retail-invalid",
    sourceType: "SELF_EMPLOYMENT",
    amountReceivedKsh: 200000,
    expenses: [{ category: "UNSUPPORTED_EXPENSE_TYPE", amountKsh: 5000 }],
  });

  const invalidResult = validateIncomeSources([invalidSource]);
  assert.equal(invalidResult.isValid, false);
  assert.match(invalidResult.errors[0], /Invalid expense category/i);
});

test("7. Business source gross/net reconciliation computes allowable deductions accurately", () => {
  const result = calculateHouseholdIncome([
    source({
      id: "workshop",
      sourceType: "SELF_EMPLOYMENT",
      monthsObserved: 12,
      amountReceivedKsh: 500000,
      expenses: [
        { category: "RAW_MATERIALS_INPUTS", amountKsh: 180000 },
        { category: "LABOUR_PAYMENTS", amountKsh: 70000 },
        { category: "FEES_LICENCES", amountKsh: 10000 },
      ],
    }),
  ]);

  const line = result.lines[0];
  assert.equal(line.totalReceivedKsh, 500000);
  assert.equal(line.totalReportedCostsKsh, 260000);
  assert.equal(line.reportedNetKsh, 240000);
  assert.equal(line.averageMonthlyNetKsh, 20000);
  assert.equal(result.monthlyEarnedNetKsh, 20000);
  assert.equal(result.annualisedEarnedNetKsh, 240000);
});

test("8. Reimbursement and expense double-counting safeguard flags potential offsets", () => {
  const result = calculateHouseholdIncome([
    source({
      id: "transport-biz",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 180000,
      directCostsKsh: 40000,
    }),
    source({
      id: "travel-reimbursement",
      sourceType: "REIMBURSEMENT",
      amountReceivedKsh: 30000,
    }),
  ]);

  assert.equal(result.monthlyNonEarnedFlowsKsh, 2500); // 30,000 / 12
  const offsetFlag = result.reviewFlags.find(f => f.code === "REIMBURSEMENT_EXPENSE_OFFSET");
  assert.ok(offsetFlag, "Reimbursement offset flag must be raised when expenses and reimbursements co-occur");
});

test("9. Seasonal income with incomplete annual coverage requires manual review", () => {
  const result = calculateHouseholdIncome([
    source({
      id: "farm-harvest",
      sourceType: "AGRICULTURE",
      monthsObserved: 4,
      amountReceivedKsh: 240000,
      directCostsKsh: 60000,
      isSeasonal: true,
    }),
  ]);

  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(result.monthlyEarnedNetKsh, null);
  assert.ok(result.reviewFlags.some(f => f.code === "SEASONAL_PERIOD_INCOMPLETE"));
});

test("10. Reproducibility from an immutable input snapshot reproduces exact output", () => {
  const sources = [
    source({ id: "w1", amountReceivedKsh: 240000 }),
    source({ id: "b1", sourceType: "SELF_EMPLOYMENT", amountReceivedKsh: 300000, directCostsKsh: 120000 }),
  ];

  const firstRun = calculateHouseholdIncome(sources);
  const reproduced = reproduceHouseholdIncome(firstRun.reproducibleInputSnapshot);

  assert.equal(firstRun.monthlyEarnedNetKsh, reproduced.monthlyEarnedNetKsh);
  assert.equal(firstRun.annualisedEarnedNetKsh, reproduced.annualisedEarnedNetKsh);
  assert.equal(firstRun.monthlyPolicyReviewResourcesKsh, reproduced.monthlyPolicyReviewResourcesKsh);
  assert.deepEqual(firstRun.lines.map(l => l.reportedNetKsh), reproduced.lines.map(l => l.reportedNetKsh));
});

// ─── 5. NON-EARNED & FIDUCIARY FLOWS ──────────────────────────────────────────

test("remittances remain visible in policy review bucket and do not enter earned income", () => {
  const result = calculateHouseholdIncome([
    source({ id: "wages", amountReceivedKsh: 216000 }),
    source({ id: "remittance", sourceType: "REMITTANCES", amountReceivedKsh: 60000 }),
  ]);

  assert.equal(result.monthlyEarnedNetKsh, 18000);
  assert.equal(result.monthlyPolicyReviewResourcesKsh, 5000);
  assert.equal(result.requiresPolicyDecision, true);
});

test("group funds are classified as fiduciary flow and not earner's personal income", () => {
  const result = calculateHouseholdIncome([
    source({ id: "shop", amountReceivedKsh: 180000 }),
    source({ id: "chama", sourceType: "GROUP_FUNDS", amountReceivedKsh: 240000 }),
  ]);

  assert.equal(result.monthlyEarnedNetKsh, 15000);
  assert.equal(result.monthlyFiduciaryFlowsKsh, 20000);
});

test("one-month loan or chama flow does not block calculation of valid earned income", () => {
  // Household with a 12-month business and a 1-month loan
  const loanResult = calculateHouseholdIncome([
    source({ id: "business", sourceType: "SELF_EMPLOYMENT", amountReceivedKsh: 240000, monthsObserved: 12 }),
    source({ id: "loan", sourceType: "LOAN_PROCEEDS", amountReceivedKsh: 10000, monthsObserved: 1 }),
  ]);

  assert.equal(loanResult.isValid, true);
  assert.equal(loanResult.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(loanResult.calculationStatus, "CALCULATED_STANDARD");
  assert.equal(loanResult.monthlyEarnedNetKsh, 20000);
  assert.equal(loanResult.annualisedEarnedNetKsh, 240000);
  assert.equal(loanResult.monthlyNonEarnedFlowsKsh, 10000);
  assert.equal(loanResult.requiresManualReview, false);

  // Household with a 12-month business, a 1-month loan, and a 1-month chama flow
  const multiFlowResult = calculateHouseholdIncome([
    source({ id: "business", sourceType: "SELF_EMPLOYMENT", amountReceivedKsh: 360000, monthsObserved: 12 }),
    source({ id: "loan", sourceType: "LOAN_PROCEEDS", amountReceivedKsh: 5000, monthsObserved: 1 }),
    source({ id: "chama", sourceType: "GROUP_FUNDS", amountReceivedKsh: 3000, monthsObserved: 1 }),
  ]);

  assert.equal(multiFlowResult.isValid, true);
  assert.equal(multiFlowResult.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(multiFlowResult.calculationStatus, "CALCULATED_STANDARD");
  assert.equal(multiFlowResult.monthlyEarnedNetKsh, 30000);
  assert.equal(multiFlowResult.annualisedEarnedNetKsh, 360000);
  assert.equal(multiFlowResult.monthlyNonEarnedFlowsKsh, 5000);
  assert.equal(multiFlowResult.monthlyFiduciaryFlowsKsh, 3000);
  assert.equal(multiFlowResult.requiresManualReview, false);

  // But a 1-month earned income source STILL requires manual review
  const earnedShortResult = calculateHouseholdIncome([
    source({ id: "casual", sourceType: "CASUAL_LABOUR", amountReceivedKsh: 5000, monthsObserved: 1 }),
  ]);
  assert.equal(earnedShortResult.requiresManualReview, true);
  assert.equal(earnedShortResult.calculationStatus, "BLOCKED_MANUAL_REVIEW");
  assert.equal(earnedShortResult.monthlyEarnedNetKsh, null);

  // And a 6-month seasonal source STILL requires manual review
  const seasonalShortResult = calculateHouseholdIncome([
    source({ id: "farm", sourceType: "AGRICULTURE", amountReceivedKsh: 50000, monthsObserved: 6 }),
  ]);
  assert.equal(seasonalShortResult.requiresManualReview, true);
  assert.equal(seasonalShortResult.calculationStatus, "BLOCKED_MANUAL_REVIEW");
  assert.equal(seasonalShortResult.monthlyEarnedNetKsh, null);
});

// ─── 6. PRESET & SYSTEM INTEGRATION CHECKS ────────────────────────────────────

test("11. Existing synthetic preset compatibility is preserved", () => {
  for (const preset of PRESETS) {
    assert.ok(preset.inputs.monthlyNetEarnedIncome !== undefined);
    const result = calculateProposedModel(preset.inputs);
    assert.equal(typeof result.monthlyContribution, "number");
    assert.equal(typeof result.adjustedGrossIncome, "number");
  }
});

test("12. Historical AGI v2.1 output preservation and confidence interval removal", () => {
  const sampleInput = PRESETS[1].inputs;
  const originalDirect = calculateOriginalAgi(sampleInput);
  const versions = calculateProposedModelVersions(sampleInput);

  assert.equal(
    originalDirect.estimatedAnnualIncome,
    versions.originalAgi.result.estimatedAnnualIncome
  );
  assert.equal(
    originalDirect.adjustedGrossIncome,
    versions.originalAgi.result.adjustedGrossIncome
  );
  assert.equal(
    originalDirect.monthlyContribution,
    versions.originalAgi.result.monthlyContribution
  );

  assert.equal(versions.originalAgi.result.confidenceTier, null);
  assert.equal(versions.originalAgi.result.agiRangeLow, null);
  assert.equal(versions.originalAgi.result.agiRangeHigh, null);
  assert.equal(versions.declaredIncome.result.confidenceTier, null);
  assert.equal(versions.declaredIncome.result.agiRangeLow, null);
  assert.equal(versions.declaredIncome.result.agiRangeHigh, null);
});
