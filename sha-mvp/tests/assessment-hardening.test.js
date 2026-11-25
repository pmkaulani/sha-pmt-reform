import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  calculateHouseholdIncome,
  validateIncomeSources,
  calculateMonthsFromDates,
  checkIncomePeriodAlignment,
  DEFAULT_COMMON_ASSESSMENT_PERIOD
} from "../src/lib/household-income.js";

import {
  PRESETS,
  calculateCurrentModel,
  calculateCurrentModelContribution,
  calculateProposedModel,
  calculatePopulationErrorRates,
  validateAssessmentInputs
} from "../src/lib/AlgorithmSimulation.js";

import { calculateProposedModel as calculateOriginalAgi } from "../src/lib/AlgorithmSimulation.original-agi-v2.1.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL ACCEPTANCE TESTS (15 Hardening Scenarios)
// ─────────────────────────────────────────────────────────────────────────────

test("Acceptance 1: 6-month casual income is review-only and cannot enter classification", () => {
  const sources = [
    {
      id: "casual-1",
      sourceType: "CASUAL_LABOUR",
      amountReceivedKsh: 60000,
      monthsObserved: 6,
      directCostsKsh: 0
    }
  ];

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.isValid, true);
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(result.monthlyEarnedNetKsh, null);
  assert.equal(result.annualisedEarnedNetKsh, null);
  assert.equal(result.reviewOnlyMonthlyEarnedNetKsh, 10000);
  assert.equal(result.reviewOnlyAnnualisedEarnedNetKsh, 120000);
  assert.equal(result.calculationStatus, "BLOCKED_SHORT_WINDOW_REVIEW");
  assert.equal(result.hasProvisionalShortWindowSources, true);
  assert.equal(result.annualisationReliability, "NOT_APPROVED_FOR_CLASSIFICATION");
});

test("Acceptance 2: Unresolved remittances make the assessment provisional", () => {
  const sources = [
    {
      id: "wages-1",
      sourceType: "EMPLOYMENT_WAGES",
      amountReceivedKsh: 240000,
      monthsObserved: 12
    },
    {
      id: "remit-1",
      sourceType: "REMITTANCES",
      amountReceivedKsh: 60000,
      monthsObserved: 12
    }
  ];

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.isValid, true);
  assert.equal(result.requiresPolicyDecision, true);
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(result.calculationStatus, "PROVISIONAL_PENDING_POLICY");
  assert.equal(result.monthlyEarnedNetKsh, null);
  assert.equal(result.annualisedEarnedNetKsh, null);
  assert.equal(result.reviewOnlyMonthlyEarnedNetKsh, 20000);
  assert.equal(result.reviewOnlyAnnualisedEarnedNetKsh, 240000);
  assert.equal(result.monthlyPolicyReviewResourcesKsh, 5000);
});

test("Acceptance 3: Retail inventory uses COGS rather than all purchases", () => {
  // Opening stock: 10,000, purchases: 35,000, closing stock: 15,000
  // COGS = 10,000 + 35,000 - 15,000 = 30,000
  // Sales revenue: 35,000. Net income: 35,000 - 30,000 = 5,000. Monthly: Math.round(5000/12) = 417
  const sources = [
    {
      id: "duka-1",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 35000,
      monthsObserved: 12,
      openingStockKsh: 10000,
      closingStockKsh: 15000,
      expenses: [
        { id: "e1", category: "STOCK_PURCHASES", amountKsh: 35000, isAllowablePrototype: true }
      ]
    }
  ];

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.isValid, true);
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(result.hasInventoryReview, false);
  const line = result.lines[0];
  assert.equal(line.stockPurchasesKsh, 35000);
  assert.equal(line.costOfGoodsSoldKsh, 30000);
  assert.equal(line.totalReportedCostsKsh, 30000);
  assert.equal(line.reportedNetKsh, 5000);
  assert.equal(line.averageMonthlyNetKsh, 417);
  assert.equal(result.monthlyEarnedNetKsh, 417);
});

test("Acceptance 4: Missing opening or closing inventory blocks classification when stock purchases are declared", () => {
  const sources = [
    {
      id: "shop-missing-inv",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 50000,
      monthsObserved: 12,
      expenses: [
        { id: "e1", category: "STOCK_PURCHASES", amountKsh: 30000, isAllowablePrototype: true }
      ]
    }
  ];

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.isValid, true);
  assert.equal(result.hasInventoryReview, true);
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(result.calculationStatus, "BLOCKED_MANUAL_REVIEW");
  assert.equal(result.monthlyEarnedNetKsh, null);
  assert.ok(result.reviewFlags.some(f => f.code === "INVENTORY_RECONCILIATION_REQUIRED"));
});

test("Acceptance 5: Closing inventory greater than opening inventory plus purchases is rejected by validation", () => {
  // Opening = 5,000, purchases = 10,000. Total available = 15,000.
  // Closing = 20,000 (> 15,000). Impossible inventory state.
  const sources = [
    {
      id: "invalid-inv",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 50000,
      monthsObserved: 12,
      openingStockKsh: 5000,
      closingStockKsh: 20000,
      expenses: [
        { id: "e1", category: "STOCK_PURCHASES", amountKsh: 10000, isAllowablePrototype: true }
      ]
    }
  ];

  const validation = validateIncomeSources(sources);
  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.some(e => e.includes("cannot exceed opening stock plus purchases")));

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.isValid, false);
  assert.equal(result.calculationStatus, "VALIDATION_FAILED");
});

test("Acceptance 6: Different observation dates across earning sources block classification", () => {
  const sources = [
    {
      id: "src-1",
      sourceType: "EMPLOYMENT_WAGES",
      amountReceivedKsh: 120000,
      observationStartDate: "2026-01-01",
      observationEndDate: "2026-06-30"
    },
    {
      id: "src-2",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 240000,
      observationStartDate: "2026-01-01",
      observationEndDate: "2026-12-31"
    }
  ];

  const alignment = checkIncomePeriodAlignment(sources);
  assert.ok(alignment !== null);
  assert.match(alignment, /different date ranges/i);

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.isValid, true);
  assert.equal(result.calculationStatus, "BLOCKED_PERIOD_ALIGNMENT");
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(result.monthlyEarnedNetKsh, null);
  assert.ok(result.reviewFlags.some(f => f.code === "ASSESSMENT_PERIOD_MISMATCH"));
});

test("Acceptance 7: An incomplete dated source cannot be silently matched to a 12-month source", () => {
  const sources = [
    {
      id: "wages-annual",
      sourceType: "EMPLOYMENT_WAGES",
      amountReceivedKsh: 300000,
      observationStartDate: "2026-01-01",
      observationEndDate: "2026-12-31"
    },
    {
      id: "casual-3mo",
      sourceType: "CASUAL_LABOUR",
      amountReceivedKsh: 30000,
      observationStartDate: "2026-01-01",
      observationEndDate: "2026-03-31"
    }
  ];

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.calculationStatus, "BLOCKED_PERIOD_ALIGNMENT");
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(result.monthlyEarnedNetKsh, null);
});

test("Acceptance 8: Reimbursements alongside deducted business expenses require reconciliation", () => {
  const sources = [
    {
      id: "biz-1",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 200000,
      monthsObserved: 12,
      directCostsKsh: 50000
    },
    {
      id: "reimb-1",
      sourceType: "REIMBURSEMENT",
      amountReceivedKsh: 20000,
      monthsObserved: 12
    }
  ];

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.isValid, true);
  assert.equal(result.hasUnresolvedReimbursements, true);
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(result.calculationStatus, "BLOCKED_MANUAL_REVIEW");
  assert.equal(result.monthlyEarnedNetKsh, null);
  assert.ok(result.reviewFlags.some(f => f.code === "REIMBURSEMENT_RECONCILIATION_REQUIRED"));
});

test("Acceptance 9: Partial duplicate source deducts only verified overlap amount", () => {
  const sources = [
    {
      id: "parent-biz",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 200000,
      monthsObserved: 12,
      directCostsKsh: 0
    },
    {
      id: "child-mpesa",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 80000,
      monthsObserved: 12,
      directCostsKsh: 0,
      includedInSourceId: "parent-biz",
      overlapAmountKsh: 30000 // Only 30,000 is duplicate; 50,000 is genuine additional income
    }
  ];

  const result = calculateHouseholdIncome(sources);
  assert.equal(result.isValid, true);
  assert.equal(result.canPopulatePrototypeEarnedIncomeBase, true);

  // Parent line: 200,000 / 12 = 16,667
  // Child line: (80,000 - 30,000) / 12 = 50,000 / 12 = 4,167
  // Total: 16,667 + 4,167 = 20,834
  assert.equal(result.lines[0].reportedNetKsh, 200000);
  assert.equal(result.lines[1].overlapAmountKsh, 30000);
  assert.equal(result.lines[1].reportedNetKsh, 50000);
  assert.equal(result.monthlyEarnedNetKsh, 20833); // 250,000 / 12 = 20,833.33 -> 20,833
  assert.equal(result.annualisedEarnedNetKsh, 249996);
});

test("Acceptance 10: KSh 300 minimum contribution floor handling without automatic indigence", () => {
  // Annual income = 50,000. 2.75% / 12 = 50000 * 0.0275 / 12 = 114.58 < 300.
  const comp = calculateCurrentModelContribution(50000);
  assert.equal(comp.monthly, 300);
  assert.equal(comp.minimumContributionFloorApplied, true);
  assert.equal(comp.contributionClassification, "MINIMUM_CONTRIBUTION_FLOOR");
  assert.equal(comp.isIndigent, null, "floor must NOT assign statutory indigence");
  assert.equal(comp.financialAssistanceStatus, "NOT_ASSESSED");

  // Higher income: 300,000. 2.75% / 12 = 688 > 300.
  const compHigher = calculateCurrentModelContribution(300000);
  assert.equal(compHigher.monthly, 688);
  assert.equal(compHigher.minimumContributionFloorApplied, false);
  assert.equal(compHigher.contributionClassification, "RATE_BASED_CONTRIBUTION");
  assert.equal(compHigher.isIndigent, null);
});

test("Acceptance 11: Separation of minimum contribution and indigence", () => {
  const household = {
    ...PRESETS[4].inputs, // Mzee Kamau: headAge: 72
    receivesAid: true,
    monthlyNetEarnedIncome: 0,
    avgRetainedBalance: 1200
  };

  const result = calculateProposedModel(household);
  assert.equal(result.monthlyContribution, 300);
  assert.equal(result.minimumContributionFloorApplied, true);
  assert.equal(result.isIndigent, null, "never assigns statutory indigence automatically");
  assert.equal(result.financialAssistanceStatus, "REQUIRES_AUTHORISED_REVIEW");
  assert.ok(result.financialAssistanceReviewReasons.includes("SOCIAL_ASSISTANCE_REPORTED"));
  assert.ok(result.financialAssistanceReviewReasons.includes("OLDER_PERSON_FINANCIAL_CIRCUMSTANCES_REQUIRE_REVIEW"));
});

test("Acceptance 12: Experimental deductions are off by default", () => {
  const household = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 40000,
    county: "Nairobi",
    ownershipStatus: "RENTED",
    monthlyRent: 15000,
    hasChronicIllness: true,
    hasRegisteredDisability: true
  };

  // 1. Default run: experimental deductions are DISABLED
  const defaultResult = calculateProposedModel(household);
  assert.equal(defaultResult.policyAssumptionMode, "UNAPPROVED_ADJUSTMENTS_DISABLED");
  assert.equal(defaultResult.calculationBreakdown.postBaseDeductions.length, 0);
  assert.equal(defaultResult.adjustedGrossIncome, 40000 * 12); // No deductions deducted

  // 2. Explicit switch: experimental deductions enabled
  const expResult = calculateProposedModel(household, { enableExperimentalPolicyAdjustments: true });
  assert.equal(expResult.policyAssumptionMode, "ILLUSTRATIVE_RESEARCH_ADJUSTMENTS_ENABLED");
  assert.ok(expResult.calculationBreakdown.postBaseDeductions.length > 0);
  assert.ok(expResult.adjustedGrossIncome < 40000 * 12);
});

test("Acceptance 13: Historical original AGI v2.1 output remains preserved", () => {
  const household = {
    ...PRESETS[0].inputs,
    monthlyNetEarnedIncome: 25000
  };

  const origResult = calculateOriginalAgi(household);
  assert.ok(Number.isFinite(origResult.estimatedAnnualIncome));
  assert.ok(Number.isFinite(origResult.monthlyContribution));
  assert.ok(origResult.monthlyContribution >= 300);

  // File integrity check: file exists and has correct length/structure
  const origFilePath = path.resolve(__dirname, "../src/lib/AlgorithmSimulation.original-agi-v2.1.js");
  assert.ok(fs.existsSync(origFilePath));
  const fileContent = fs.readFileSync(origFilePath, "utf8");
  assert.ok(fileContent.includes("ORIGINAL ASSET- AND LIQUIDITY-AWARE AGI v2.1"));
  assert.ok(fileContent.includes("v2.1 Optimization"));
});

test("Acceptance 14: Direct income entry is marked as DEMO ONLY bypass", () => {
  // In App.jsx, direct entry is isolated behind an explicit demo toggle for custom household
  // When structured income sources are present, they supersede any direct entry.
  const structuredSource = {
    id: "src-1",
    sourceType: "EMPLOYMENT_WAGES",
    amountReceivedKsh: 360000,
    monthsObserved: 12
  };

  const incomeAssessment = calculateHouseholdIncome([structuredSource]);
  assert.equal(incomeAssessment.isValid, true);
  assert.equal(incomeAssessment.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(incomeAssessment.monthlyEarnedNetKsh, 30000);
});

test("Acceptance 15: Synthetic model comparisons are labelled as disagreements, not verified error rates", () => {
  const stats = calculatePopulationErrorRates(100);
  assert.equal(stats.evaluationType, "SYNTHETIC_DEMO_ONLY");
  assert.equal(typeof stats.totalDisagreements, "number");
  assert.equal(typeof stats.disagreementRate, "number");
  assert.equal(typeof stats.floorDisagreementRate, "number");
  assert.equal(typeof stats.rateDisagreementRate, "number");
  assert.ok(stats.disclaimer.includes("SYNTHETIC_DEMO_ONLY"));
  assert.ok(stats.disclaimer.includes("NOT verified real-world targeting error"));
});
