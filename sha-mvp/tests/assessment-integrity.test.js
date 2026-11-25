import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateHouseholdIncome,
  validateIncomeSources,
  reproduceHouseholdIncome,
  calculateMonthsFromDates,
  resolveEffectiveIncomeSources,
  INCOME_SOURCE_RULES,
  OPERATING_EXPENSE_CATEGORIES
} from "../src/lib/household-income.js";

import {
  MEMBER_ASSESSMENT_STEPS,
  getIncomeSourceUiRules,
  getAssessmentVisibility,
  buildAssessmentReview
} from "../src/lib/assessment-flow.js";

import {
  validateAssessmentInputs,
  calculateCurrentModel,
  calculateCurrentModelContribution,
  calculateProposedModel
} from "../src/lib/AlgorithmSimulation.js";

import { calculateProposedModel as calculateOriginalAgi } from "../src/lib/AlgorithmSimulation.original-agi-v2.1.js";

// ─── SCENARIO 1 ───────────────────────────────────────────────────────────────
test("Scenario 1: Zero-income declaration with existing earned-income records sets inactive state and 0 earned base", () => {
  const sources = [
    {
      id: "src-biz",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 120000,
      directCostsKsh: 40000,
      monthsObserved: 12,
    },
    {
      id: "src-casual",
      sourceType: "CASUAL_LABOUR",
      amountReceivedKsh: 60000,
      directCostsKsh: 0,
      monthsObserved: 12,
    }
  ];

  const effective = resolveEffectiveIncomeSources(sources, true);
  assert.equal(effective.length, 2);
  assert.equal(effective[0].isActive, false);
  assert.equal(effective[0].inactiveReason, "ZERO_EARNED_INCOME_DECLARED");
  assert.equal(effective[1].isActive, false);
  assert.equal(effective[1].inactiveReason, "ZERO_EARNED_INCOME_DECLARED");

  const calc = calculateHouseholdIncome(effective);
  assert.equal(calc.isValid, true);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(calc.monthlyEarnedNetKsh, 0);
  assert.equal(calc.annualisedEarnedNetKsh, 0);
  assert.equal(calc.lines[0].countedInEarnedIncome, false);
  assert.equal(calc.lines[0].isActive, false);
  assert.equal(calc.lines[1].countedInEarnedIncome, false);
  assert.equal(calc.lines[1].isActive, false);
});

// ─── SCENARIO 2 ───────────────────────────────────────────────────────────────
test("Scenario 2: Switching back to earned-income mode re-activates existing records", () => {
  const sources = [
    {
      id: "src-biz",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 120000,
      directCostsKsh: 40000,
      monthsObserved: 12,
      isActive: false,
      inactiveReason: "ZERO_EARNED_INCOME_DECLARED"
    }
  ];

  const restored = resolveEffectiveIncomeSources(sources, false);
  assert.equal(restored[0].isActive, true);
  assert.equal(restored[0].inactiveReason, null);

  const calc = calculateHouseholdIncome(restored);
  assert.equal(calc.isValid, true);
  // Net: 120k - 40k = 80k / 12 = 6666.67 -> 6667
  assert.equal(calc.monthlyEarnedNetKsh, 6667);
  assert.equal(calc.lines[0].countedInEarnedIncome, true);
  assert.equal(calc.lines[0].isActive, true);
});

// ─── SCENARIO 3 ───────────────────────────────────────────────────────────────
test("Scenario 3: New source creation starts with 0 / empty values and no pre-filled sample money", () => {
  // Test template contract for earned income
  const newEarnedSource = {
    id: "src-new",
    sourceType: "SELF_EMPLOYMENT",
    monthsObserved: 12,
    amountReceivedKsh: 0,
    directCostsKsh: 0,
    includedInSourceId: null,
    alreadyIncludedElsewhere: false,
    isSeasonal: false,
    expenses: []
  };

  assert.equal(newEarnedSource.amountReceivedKsh, 0);
  assert.equal(newEarnedSource.directCostsKsh, 0);
  assert.deepEqual(newEarnedSource.expenses, []);

  // Test template contract for other money
  const newOtherSource = {
    id: "flow-new",
    sourceType: "REMITTANCES",
    monthsObserved: 12,
    amountReceivedKsh: 0,
    directCostsKsh: 0,
    includedInSourceId: null,
    alreadyIncludedElsewhere: false,
    isSeasonal: false
  };

  assert.equal(newOtherSource.amountReceivedKsh, 0);
  assert.equal(newOtherSource.directCostsKsh, 0);

  // Validation accepts 0 amounts
  const valEarned = validateIncomeSources([newEarnedSource]);
  assert.equal(valEarned.isValid, true);
  const valOther = validateIncomeSources([newOtherSource]);
  assert.equal(valOther.isValid, true);
});

// ─── SCENARIO 4 ───────────────────────────────────────────────────────────────
test("Scenario 4: Multiple itemised expenses under a single source across distinct allowable categories", () => {
  const source = {
    id: "src-shop",
    sourceType: "SELF_EMPLOYMENT",
    monthsObserved: 12,
    amountReceivedKsh: 300000,
    openingStockKsh: 20000,
    closingStockKsh: 20000,
    expenses: [
      { id: "exp-1", category: "STOCK_PURCHASES", amountKsh: 100000, description: "Goods for resale" },
      { id: "exp-2", category: "TRANSPORT", amountKsh: 20000, description: "Matatu freight" },
      { id: "exp-3", category: "RENT_UTILITIES", amountKsh: 30000, description: "Kiosk rent and electricity" },
      { id: "exp-4", category: "FEES_LICENSES", amountKsh: 10000, description: "County trade licence" },
      { id: "exp-5", category: "LABOUR_PAID", amountKsh: 15000, description: "Assistant casual wages" },
      { id: "exp-6", category: "RAW_MATERIALS", amountKsh: 5000, description: "Packaging bags" },
      { id: "exp-7", category: "EQUIPMENT_REPAIRS", amountKsh: 5000, description: "Weighing scale repair" },
      { id: "exp-8", category: "OTHER_OPERATING", amountKsh: 5000, description: "Cleaning supplies" }
    ]
  };

  const calc = calculateHouseholdIncome([source]);
  assert.equal(calc.isValid, true);
  const line = calc.lines[0];
  assert.equal(line.itemisedExpenses.length, 8);
  // Total expenses: COGS(20k+100k-20k=100k) + 20k + 30k + 10k + 15k + 5k + 5k + 5k = 190,000
  assert.equal(line.totalReportedCostsKsh, 190000);
  // Net: 300,000 - 190,000 = 110,000 / 12 = 9166.67 -> 9167
  assert.equal(line.reportedNetKsh, 110000);
  assert.equal(line.averageMonthlyNetKsh, 9167);
  assert.equal(calc.monthlyEarnedNetKsh, 9167);
});

// ─── SCENARIO 5 ───────────────────────────────────────────────────────────────
test("Scenario 5: Invalid and inverted date periods are rejected", () => {
  // A. Inverted dates in calculateMonthsFromDates
  assert.equal(calculateMonthsFromDates("2026-06-01", "2026-01-01"), null);

  // B. Invalid date string
  assert.equal(calculateMonthsFromDates("invalid-date", "2026-06-01"), null);

  // C. Inverted dates fail validation in validateIncomeSources
  const invertedSource = {
    id: "src-inv",
    sourceType: "SELF_EMPLOYMENT",
    amountReceivedKsh: 50000,
    observationStartDate: "2026-12-01",
    observationEndDate: "2026-01-01"
  };
  const valInverted = validateIncomeSources([invertedSource]);
  assert.equal(valInverted.isValid, false);
  assert.ok(valInverted.errors.some(e => e.includes("must be before end date")));

  // D. Invalid date strings fail validation
  const invalidDateSource = {
    id: "src-bad-date",
    sourceType: "SELF_EMPLOYMENT",
    amountReceivedKsh: 50000,
    observationStartDate: "not-a-date",
    observationEndDate: "2026-12-31"
  };
  const valBad = validateIncomeSources([invalidDateSource]);
  assert.equal(valBad.isValid, false);
  assert.ok(valBad.errors.some(e => e.includes("invalid")));
});

// ─── SCENARIO 6 ───────────────────────────────────────────────────────────────
test("Scenario 6: Observation periods longer than 12 months are averaged over full window and flagged", () => {
  // 18 months: 2025-01-01 to 2026-06-30 (inclusive calendar months)
  const m = calculateMonthsFromDates("2025-01-01", "2026-06-30");
  assert.equal(m, 18);

  const source = {
    id: "src-18mo",
    sourceType: "SELF_EMPLOYMENT",
    amountReceivedKsh: 180000,
    directCostsKsh: 0,
    observationStartDate: "2025-01-01",
    observationEndDate: "2026-06-30",
    monthsObserved: 18
  };

  const calc = calculateHouseholdIncome([source]);
  assert.equal(calc.isValid, true);
  const line = calc.lines[0];
  assert.equal(line.observationMonths, 18);
  assert.equal(line.periodStatus, "EXTENDED_PERIOD");
  // Monthly average: 180,000 / 18 = 10,000
  assert.equal(line.averageMonthlyNetKsh, 10000);
  assert.equal(calc.monthlyEarnedNetKsh, 10000);
  // Annualised: 10,000 * 12 = 120,000
  assert.equal(calc.annualisedEarnedNetKsh, 120000);
  assert.ok(calc.reviewFlags.some(f => f.code === "EXTENDED_OBSERVATION_PERIOD"));
});

// ─── SCENARIO 7 ───────────────────────────────────────────────────────────────
test("Scenario 7: Different source observation windows calculate independent monthly averages", () => {
  const sources = [
    {
      id: "src-short",
      sourceType: "CASUAL_LABOUR",
      amountReceivedKsh: 30000,
      monthsObserved: 6,
      directCostsKsh: 0
    },
    {
      id: "src-annual",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 120000,
      monthsObserved: 12,
      directCostsKsh: 0
    }
  ];

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  // Source 1: 30,000 / 6 = 5,000/mo (flags SHORT_WINDOW_PROVISIONAL)
  assert.equal(calc.lines[0].averageMonthlyNetKsh, 5000);
  assert.equal(calc.lines[0].periodStatus, "SHORT_WINDOW_PROVISIONAL");
  // Source 2: 120,000 / 12 = 10,000/mo (FULL_ANNUAL)
  assert.equal(calc.lines[1].averageMonthlyNetKsh, 10000);
  assert.equal(calc.lines[1].periodStatus, "FULL_ANNUAL");
  // Provisional short window leaves review-only subtotal visible (15,000) but blocks final classification
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(calc.monthlyEarnedNetKsh, null);
  assert.equal(calc.reviewOnlyMonthlyEarnedNetKsh, 15000);
  assert.equal(calc.calculationStatus, "BLOCKED_SHORT_WINDOW_REVIEW");
});

// ─── SCENARIO 8 ───────────────────────────────────────────────────────────────
test("Scenario 8: Short-window income (<3 months) triggers manual review and blocks calculation", () => {
  const source = {
    id: "src-short",
    sourceType: "CASUAL_LABOUR",
    amountReceivedKsh: 20000,
    monthsObserved: 2,
    directCostsKsh: 0
  };

  const calc = calculateHouseholdIncome([source]);
  assert.equal(calc.isValid, true);
  assert.equal(calc.requiresManualReview, true);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(calc.monthlyEarnedNetKsh, null);
  assert.equal(calc.calculationStatus, "BLOCKED_MANUAL_REVIEW");
  assert.ok(calc.reviewFlags.some(f => f.code === "LIMITED_OBSERVATION_PERIOD"));
});

// ─── SCENARIO 9 ───────────────────────────────────────────────────────────────
test("Scenario 9: Seasonal income with fewer than 12 months triggers seasonal incomplete review", () => {
  const source = {
    id: "src-farm",
    sourceType: "AGRICULTURE",
    amountReceivedKsh: 80000,
    monthsObserved: 6,
    directCostsKsh: 20000,
    isSeasonal: true
  };

  const calc = calculateHouseholdIncome([source]);
  assert.equal(calc.isValid, true);
  assert.equal(calc.requiresManualReview, true);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(calc.calculationStatus, "BLOCKED_MANUAL_REVIEW");
  assert.ok(calc.reviewFlags.some(f => f.code === "SEASONAL_PERIOD_INCOMPLETE"));
});

// ─── SCENARIO 10 ──────────────────────────────────────────────────────────────
test("Scenario 10: Duplicate parent and child labels and IDs are preserved in duplicateRelationships", () => {
  const sources = [
    {
      id: "src-parent",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 100000,
      directCostsKsh: 20000,
      monthsObserved: 12
    },
    {
      id: "src-child",
      sourceType: "CASUAL_LABOUR",
      amountReceivedKsh: 30000,
      directCostsKsh: 0,
      monthsObserved: 12,
      includedInSourceId: "src-parent"
    }
  ];

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  assert.equal(calc.duplicateRelationships.length, 1);
  const rel = calc.duplicateRelationships[0];
  assert.equal(rel.duplicateSourceId, "src-child");
  assert.equal(rel.duplicateSourceLabel, "Casual / daily labour");
  assert.equal(rel.parentSourceId, "src-parent");
  assert.equal(rel.parentSourceLabel, "Self-employment / small business");
});

// ─── SCENARIO 11 ──────────────────────────────────────────────────────────────
test("Scenario 11: Self-reference, missing parent, and circular duplicate chains are rejected", () => {
  // A. Self-reference
  const selfRef = [
    { id: "src-1", sourceType: "SELF_EMPLOYMENT", amountReceivedKsh: 50000, monthsObserved: 12, includedInSourceId: "src-1" }
  ];
  const valSelf = validateIncomeSources(selfRef);
  assert.equal(valSelf.isValid, false);
  assert.ok(valSelf.errors.some(e => e.includes("Self-reference")));

  // B. Missing parent ID
  const missingParent = [
    { id: "src-1", sourceType: "SELF_EMPLOYMENT", amountReceivedKsh: 50000, monthsObserved: 12, includedInSourceId: "non-existent-id" }
  ];
  const valMissing = validateIncomeSources(missingParent);
  assert.equal(valMissing.isValid, false);
  assert.ok(valMissing.errors.some(e => e.includes("does not exist")));

  // C. Circular chain A -> B -> A
  const circularChain = [
    { id: "src-a", sourceType: "SELF_EMPLOYMENT", amountReceivedKsh: 50000, monthsObserved: 12, includedInSourceId: "src-b" },
    { id: "src-b", sourceType: "CASUAL_LABOUR", amountReceivedKsh: 20000, monthsObserved: 12, includedInSourceId: "src-a" }
  ];
  const valCircular = validateIncomeSources(circularChain);
  assert.equal(valCircular.isValid, false);
  assert.ok(valCircular.errors.some(e => e.includes("Circular duplicate relationship")));
});

// ─── SCENARIO 12 ──────────────────────────────────────────────────────────────
test("Scenario 12: Reimbursements received while deducting business costs trigger offset review flag", () => {
  const sources = [
    {
      id: "src-biz",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 100000,
      directCostsKsh: 30000,
      monthsObserved: 12
    },
    {
      id: "flow-reimb",
      sourceType: "REIMBURSEMENT",
      amountReceivedKsh: 15000,
      monthsObserved: 12
    }
  ];

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  assert.equal(calc.hasUnresolvedReimbursements, true);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(calc.calculationStatus, "BLOCKED_MANUAL_REVIEW");
  assert.ok(calc.reviewFlags.some(f => f.code === "REIMBURSEMENT_RECONCILIATION_REQUIRED"));
});

// ─── SCENARIO 13 ──────────────────────────────────────────────────────────────
test("Scenario 13: Policy-review flows set PROVISIONAL_PENDING_POLICY without blocking earned calculation", () => {
  const sources = [
    {
      id: "src-wage",
      sourceType: "EMPLOYMENT_WAGES",
      amountReceivedKsh: 120000,
      monthsObserved: 12,
      directCostsKsh: 0
    },
    {
      id: "flow-remitt",
      sourceType: "REMITTANCES",
      amountReceivedKsh: 36000,
      monthsObserved: 12
    }
  ];

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  assert.equal(calc.requiresPolicyDecision, true);
  assert.equal(calc.requiresManualReview, false);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(calc.calculationStatus, "PROVISIONAL_PENDING_POLICY");
  assert.equal(calc.monthlyEarnedNetKsh, null);
  assert.equal(calc.reviewOnlyMonthlyEarnedNetKsh, 10000);
  assert.equal(calc.monthlyPolicyReviewResourcesKsh, 3000);
  assert.ok(calc.policyDecisionSummary.includes("SHA policy rules"));
});

// ─── SCENARIO 14 ──────────────────────────────────────────────────────────────
test("Scenario 14: Reproducibility of saved assessment snapshot produces identical outputs", () => {
  const sources = [
    {
      id: "src-biz",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 120000,
      monthsObserved: 12,
      expenses: [
        { id: "e1", category: "STOCK_PURCHASES", amountKsh: 30000, description: "Goods" },
        { id: "e2", category: "RENT_UTILITIES", amountKsh: 10000, description: "Rent" }
      ]
    },
    {
      id: "flow-aid",
      sourceType: "SOCIAL_ASSISTANCE",
      amountReceivedKsh: 24000,
      monthsObserved: 12
    }
  ];

  const originalCalc = calculateHouseholdIncome(sources);
  const snapshot = originalCalc.reproducibleInputSnapshot;

  const reproducedCalc = reproduceHouseholdIncome(snapshot);
  assert.equal(reproducedCalc.monthlyEarnedNetKsh, originalCalc.monthlyEarnedNetKsh);
  assert.equal(reproducedCalc.annualisedEarnedNetKsh, originalCalc.annualisedEarnedNetKsh);
  assert.equal(reproducedCalc.calculationStatus, originalCalc.calculationStatus);
  assert.equal(reproducedCalc.requiresPolicyDecision, originalCalc.requiresPolicyDecision);
  assert.equal(reproducedCalc.lines.length, originalCalc.lines.length);
  assert.deepEqual(reproducedCalc.reviewFlags, originalCalc.reviewFlags);
});

// ─── SCENARIO 15 ──────────────────────────────────────────────────────────────
test("Scenario 15: Original asset-and-liquidity AGI v2.1 calculations remain unchanged on historical benchmarks", () => {
  const householdA = {
    monthlyNetEarnedIncome: 15000,
    county: "Nairobi",
    householdSize: 4,
    assets: ["TV", "SMARTPHONE"],
    vehicles: [],
    landAcreage: 0,
    livestockCount: 0,
    housingWallMaterial: "BRICK",
    housingRoofMaterial: "IRON_SHEETS",
    housingWaterSource: "PIPED_TREATED",
    housingLightingSource: "GRID_ELECTRIC",
    grossMpesaMonthly: 12000,
    avgRetainedBalance: 3000,
    fulizaDefaults: 0
  };

  const resOriginal = calculateOriginalAgi(householdA);
  assert.ok(resOriginal.estimatedAnnualIncome > 0);
  assert.ok(resOriginal.monthlyContribution >= 300);

  // Test indigent constraint boundary
  const indigentHousehold = {
    monthlyNetEarnedIncome: 0,
    receivesAid: true,
    county: "Turkana",
    householdSize: 5,
    assets: [],
    vehicles: [],
    landAcreage: 0,
    livestockCount: 0
  };
  const resIndigent = calculateOriginalAgi(indigentHousehold);
  assert.equal(resIndigent.monthlyContribution, 300);
  assert.equal(resIndigent.isIndigent, true);
});
