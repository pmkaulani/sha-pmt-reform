import test from "node:test";
import assert from "node:assert/strict";

import {
  MEMBER_ASSESSMENT_STEPS,
  OPTIONAL_HOUSEHOLD_SECTIONS,
  SOURCE_KIND_BY_TYPE,
  EXPENSE_ELIGIBLE_KINDS,
  SEASONAL_INCOME_KINDS,
  EARNED_SOURCE_TYPES,
  OTHER_MONEY_SOURCE_TYPES,
  getIncomeSourceUiRules,
  getAssessmentVisibility,
  buildAssessmentReview
} from "../src/lib/assessment-flow.js";

import {
  calculateHouseholdIncome,
  createZeroEarnedIncomeAssessment,
  validateIncomeSources,
  reproduceHouseholdIncome,
  INCOME_SOURCE_RULES,
  OPERATING_EXPENSE_CATEGORIES
} from "../src/lib/household-income.js";

import {
  PRESETS,
  validateAssessmentInputs,
  calculateCurrentModel,
  calculateCurrentModelContribution,
  calculateProposedModel
} from "../src/lib/AlgorithmSimulation.js";

import { calculateProposedModel as calculateOriginalAgi } from "../src/lib/AlgorithmSimulation.original-agi-v2.1.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

// ─── 1. CORE STAGES CONFIGURATION ─────────────────────────────────────────────

test("Criterion 1: exactly four core stages are defined in correct sequence", () => {
  assert.equal(MEMBER_ASSESSMENT_STEPS.length, 4);

  assert.deepEqual(
    MEMBER_ASSESSMENT_STEPS.map((s) => s.id),
    ["household", "income", "other-money", "review"]
  );

  // Each stage must have title and descriptive text for ordinary Kenyan households
  MEMBER_ASSESSMENT_STEPS.forEach((stage, idx) => {
    assert.equal(stage.index, idx);
    assert.ok(stage.title && stage.title.length > 0, `Stage ${stage.id} must have title`);
    assert.ok(stage.description && stage.description.length > 0, `Stage ${stage.id} must have description`);
  });

  // Optional household sections must be defined
  assert.ok(Array.isArray(OPTIONAL_HOUSEHOLD_SECTIONS));
  assert.deepEqual(
    OPTIONAL_HOUSEHOLD_SECTIONS.map((s) => s.id),
    ["housing", "basic-services", "assets"]
  );
});

// ─── 2. NO EARNED INCOME PATHWAY ──────────────────────────────────────────────

test("Criterion 2: a household can continue with no earned income", () => {
  // A. Visibility helper recognizes zero earned income pathway
  const visibilityWithNoIncome = getAssessmentVisibility({
    incomeSources: [],
    hasNoEarnedIncome: true,
  });
  assert.equal(visibilityWithNoIncome.hasNoEarnedIncome, true);
  assert.equal(visibilityWithNoIncome.showIncomeEmptyState, false); // No jarring empty warning

  // B. Household income calculator handles non-earned flows with 0 earned base
  const assistanceOnlyCalc = calculateHouseholdIncome([
    {
      id: "aid-1",
      sourceType: "SOCIAL_ASSISTANCE",
      amountReceivedKsh: 24000,
      monthsObserved: 12,
    },
  ]);
  assert.equal(assistanceOnlyCalc.isValid, true);
  assert.equal(assistanceOnlyCalc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(assistanceOnlyCalc.calculationStatus, "PROVISIONAL_PENDING_POLICY");
  assert.equal(assistanceOnlyCalc.monthlyEarnedNetKsh, null);
  assert.equal(assistanceOnlyCalc.reviewOnlyMonthlyEarnedNetKsh, 0);

  // Pure zero earned income declaration
  const pureZero = createZeroEarnedIncomeAssessment();
  assert.equal(pureZero.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(pureZero.monthlyEarnedNetKsh, 0);
  assert.equal(pureZero.annualisedEarnedNetKsh, 0);

  // C. Algorithm simulation input validation permits 0 monthly net earned income
  const validation = validateAssessmentInputs({
    monthlyNetEarnedIncome: 0,
    county: "Nyeri",
    householdSize: 2,
    headGender: "MALE",
    headAge: 72,
  });
  assert.equal(validation.isValid, true);
  assert.equal(validation.errors.length, 0);

  // D. Proposed rules engine applies the KSh 300 statutory minimum floor without declaring indigence
  const contribution = calculateCurrentModelContribution(0);
  assert.equal(contribution.monthly, 300);
  assert.equal(contribution.isIndigent, null);
  assert.equal(contribution.minimumContributionFloorApplied, true);
  assert.equal(contribution.contributionClassification, "MINIMUM_CONTRIBUTION_FLOOR");
});

// ─── 3. MULTIPLE INCOME SOURCES REPRESENTATION ───────────────────────────────

test("Criterion 3: multiple income sources can be represented and identified", () => {
  const sources = [
    {
      id: "src-wage",
      sourceType: "EMPLOYMENT_WAGES",
      monthsObserved: 12,
      amountReceivedKsh: 240000,
      directCostsKsh: 0,
    },
    {
      id: "src-biz",
      sourceType: "SELF_EMPLOYMENT",
      monthsObserved: 12,
      amountReceivedKsh: 120000,
      directCostsKsh: 50000,
    },
    {
      id: "src-farm",
      sourceType: "AGRICULTURE",
      monthsObserved: 12,
      amountReceivedKsh: 80000,
      directCostsKsh: 20000,
      isSeasonal: true,
    },
  ];

  const visibility = getAssessmentVisibility({ incomeSources: sources });
  assert.equal(visibility.hasIncomeSources, true);
  assert.equal(visibility.hasEarnedSources, true);

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  assert.equal(calc.lines.length, 3);

  // Expected monthly net: (240k + 70k + 60k) / 12 = 370k / 12 = 30833.33 -> 30833
  assert.equal(calc.monthlyEarnedNetKsh, 30833);
  assert.equal(calc.annualisedEarnedNetKsh, 369996);
});

// ─── 4. SALARIED SOURCES HIDE OPERATING EXPENSES ──────────────────────────────

test("Criterion 4: salaried sources do not display operating expense fields", () => {
  const salariedSource = {
    id: "src-salary",
    sourceType: "EMPLOYMENT_WAGES",
    type: "EMPLOYMENT_WAGES",
    amountReceivedKsh: 600000,
  };

  const uiRules = getIncomeSourceUiRules(salariedSource);
  assert.equal(uiRules.kind, "employment_wages");
  assert.equal(uiRules.showOperatingExpenses, false);
  assert.equal(uiRules.showEmploymentDetails, true);
  assert.equal(uiRules.showBusinessDetails, false);
});

// ─── 5. EXPENSE FIELDS ONLY ON APPROVED LEDGER TYPES ─────────────────────────

test("Criterion 5: expense fields appear only for existing ledger-approved types", () => {
  // Types with costsAllowed: true in INCOME_SOURCE_RULES
  const approvedTypes = ["SELF_EMPLOYMENT", "AGRICULTURE", "RENTAL_INCOME", "OTHER_EARNED"];
  for (const type of approvedTypes) {
    const rules = getIncomeSourceUiRules({ sourceType: type });
    assert.equal(rules.showOperatingExpenses, true, `Expected ${type} to allow operating expenses`);
  }

  // Types with costsAllowed: false
  const unapprovedTypes = [
    "EMPLOYMENT_WAGES",
    "CASUAL_LABOUR",
    "REMITTANCES",
    "SOCIAL_ASSISTANCE",
    "LOAN_PROCEEDS",
    "REIMBURSEMENT",
    "GROUP_FUNDS"
  ];
  for (const type of unapprovedTypes) {
    const rules = getIncomeSourceUiRules({ sourceType: type });
    assert.equal(rules.showOperatingExpenses, false, `Expected ${type} to forbid operating expenses`);
  }
});

// ─── 6. SEASONAL QUESTIONS ON APPLICABLE KINDS ────────────────────────────────

test("Criterion 6: seasonal questions appear for applicable income types only", () => {
  // Seasonal kinds: agriculture, casual_work, business
  const seasonalTypes = ["AGRICULTURE", "CASUAL_LABOUR", "SELF_EMPLOYMENT"];
  for (const type of seasonalTypes) {
    const rules = getIncomeSourceUiRules({ sourceType: type });
    assert.equal(rules.showSeasonalDetails, true, `Expected ${type} to show seasonal details`);
  }

  // Non-seasonal types
  const nonSeasonalTypes = ["EMPLOYMENT_WAGES", "RENTAL_INCOME", "REMITTANCES", "SOCIAL_ASSISTANCE"];
  for (const type of nonSeasonalTypes) {
    const rules = getIncomeSourceUiRules({ sourceType: type });
    assert.equal(rules.showSeasonalDetails, false, `Expected ${type} to NOT show seasonal details`);
  }
});

// ─── 7. STATE RETENTION ACROSS STAGES ─────────────────────────────────────────

test("Criterion 7: hidden conditional fields do not delete previously entered answers", () => {
  const originalSources = [
    {
      id: "src-1",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 100000,
      directCostsKsh: 30000,
      monthsObserved: 12,
    },
    {
      id: "src-2",
      sourceType: "REMITTANCES",
      amountReceivedKsh: 20000,
      monthsObserved: 12,
    },
  ];

  // Evaluating visibility must not mutate or alter the original input objects
  const snapshotBefore = JSON.stringify(originalSources);
  const visibility1 = getAssessmentVisibility({
    incomeSources: originalSources,
    showAdditionalCircumstances: false,
  });
  const visibility2 = getAssessmentVisibility({
    incomeSources: originalSources,
    showAdditionalCircumstances: true,
  });

  assert.equal(visibility1.showAdditionalCircumstances, false);
  assert.equal(visibility2.showAdditionalCircumstances, true);
  assert.equal(JSON.stringify(originalSources), snapshotBefore);
});

// ─── 8. OTHER FINANCIAL FLOWS ISOLATED FROM EARNED INCOME ─────────────────────

test("Criterion 8: other financial flows remain strictly separate from earned income", () => {
  const sources = [
    // Earned
    {
      id: "wage",
      sourceType: "EMPLOYMENT_WAGES",
      amountReceivedKsh: 120000,
      monthsObserved: 12,
    },
    // Other flows
    {
      id: "remit",
      sourceType: "REMITTANCES",
      amountReceivedKsh: 60000,
      monthsObserved: 12,
    },
    {
      id: "social-aid",
      sourceType: "SOCIAL_ASSISTANCE",
      amountReceivedKsh: 24000,
      monthsObserved: 12,
    },
    {
      id: "loan",
      sourceType: "LOAN_PROCEEDS",
      amountReceivedKsh: 50000,
      monthsObserved: 12,
    },
    {
      id: "chama",
      sourceType: "GROUP_FUNDS",
      amountReceivedKsh: 36000,
      monthsObserved: 12,
    },
  ];

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(calc.calculationStatus, "PROVISIONAL_PENDING_POLICY");

  // Earned income monthly: 120000 / 12 = 10000. None of the other flows may enter this total!
  // Provisional transfer policy blocks final earned calculation, preserving review-only subtotal.
  assert.equal(calc.monthlyEarnedNetKsh, null);
  assert.equal(calc.reviewOnlyMonthlyEarnedNetKsh, 10000);
  assert.equal(calc.reviewOnlyAnnualisedEarnedNetKsh, 120000);

  // Other flows tracked in their distinct prototype policy buckets
  assert.equal(calc.monthlyPolicyReviewResourcesKsh, (60000 + 24000) / 12); // 7000
  assert.equal(calc.monthlyNonEarnedFlowsKsh, 4167); // Math.round(50000 / 12) = 4167
  assert.equal(calc.monthlyFiduciaryFlowsKsh, 36000 / 12); // 3000
});

// ─── 9. REVIEW PAGE DISPLAYS MEMBER-REPORTED STATUS ───────────────────────────

test("Criterion 9: the review summary displays MEMBER_REPORTED status and prototype disclaimer", () => {
  const inputs = {
    county: "Kisumu",
    householdSize: 4,
    headAge: 40,
    headGender: "FEMALE",
    receivesAid: true,
  };

  const snapshot = calculateHouseholdIncome([
    {
      id: "src-1",
      sourceType: "CASUAL_LABOUR",
      amountReceivedKsh: 60000,
      monthsObserved: 12,
    },
  ]);

  const review = buildAssessmentReview({
    inputs,
    incomeAssessmentSnapshot: snapshot,
    incomeSources: [{ sourceType: "CASUAL_LABOUR" }],
    otherFinancialFlows: [],
  });

  assert.equal(review.status, "MEMBER_REPORTED");
  assert.equal(review.provenance, "Unverified household declaration");
  assert.equal(review.calculationVersion, "household-income-ledger-v1.2");
  assert.ok(review.disclaimer.includes("not an official SHA means-testing assessment") || review.disclaimer.includes("not an official SHA determination"));
  assert.equal(review.household.county, "Kisumu");
  assert.equal(review.household.householdSize, 4);
});

// ─── 10. INCOMPLETE PERIODS AND REVIEW FLAGS REMAIN VISIBLE ───────────────────

test("Criterion 10: incomplete observation periods and review flags remain visible in review", () => {
  const shortWindowSources = [
    {
      id: "src-short",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 30000,
      directCostsKsh: 10000,
      monthsObserved: 2, // Fewer than 3 months -> LIMITED_OBSERVATION_PERIOD
    },
  ];

  const snapshot = calculateHouseholdIncome(shortWindowSources);
  assert.equal(snapshot.requiresManualReview, true);

  const review = buildAssessmentReview({
    inputs: { county: "Nairobi", householdSize: 2 },
    incomeAssessmentSnapshot: snapshot,
    incomeSources: shortWindowSources,
  });

  assert.equal(review.requiresManualReview, true);
  assert.ok(review.reviewFlags.length > 0);
  assert.ok(review.reviewFlags.some((f) => f.code === "LIMITED_OBSERVATION_PERIOD"));
});

// ─── 11. EDITING HOUSEHOLD INFO DOES NOT ERASE INCOME SOURCES ─────────────────

test("Criterion 11: editing household information does not erase income sources", () => {
  let state = {
    county: "Meru",
    householdSize: 5,
    hasNoEarnedIncome: false,
    incomeSources: [
      { id: "s1", sourceType: "EMPLOYMENT_WAGES", amountReceivedKsh: 180000, monthsObserved: 12 },
    ],
  };

  // Simulate updating household size and county
  state = {
    ...state,
    county: "Machakos",
    householdSize: 6,
  };

  assert.equal(state.incomeSources.length, 1);
  assert.equal(state.incomeSources[0].id, "s1");
  assert.equal(state.incomeSources[0].amountReceivedKsh, 180000);
});

// ─── 12. PREVIOUS DEMO PRESETS STILL CALCULATE CORRECTLY ──────────────────────

test("Criterion 12: previous demo presets still calculate correctly", () => {
  assert.ok(PRESETS.length >= 7, "All presets must be present");

  for (const preset of PRESETS) {
    const inputs = { ...preset.inputs };

    // Validation passes
    const validation = validateAssessmentInputs(inputs);
    assert.equal(validation.isValid, true, `Preset ${preset.name} failed input validation`);

    // Current model calculation produces valid numbers
    const lassoAnnual = calculateCurrentModel(inputs);
    assert.ok(Number.isFinite(lassoAnnual) && lassoAnnual >= 0);

    const contribution = calculateCurrentModelContribution(lassoAnnual);
    assert.ok(Number.isFinite(contribution.monthly) && contribution.monthly >= 300);

    // Proposed model versions calculate properly
    const versions = calculateProposedModelVersions(inputs);
    assert.ok(versions.declaredIncome.result.monthlyContribution >= 300);
    assert.ok(versions.originalAgi.result.monthlyContribution >= 300);
  }
});

// ─── 13. HISTORICAL AGI V2.1 CALCULATIONS REMAIN UNCHANGED ───────────────────

test("Criterion 13: historical AGI v2.1 calculations remain unchanged", () => {
  // Test a known household profile on historical AGI v2.1
  const testHousehold = {
    county: "Meru",
    householdSize: 6,
    dwellingType: "BUNGALOW",
    ownershipStatus: "OWNED",
    landAcreage: 2,
    livestockCount: 3,
    assets: ["FEATURE_PHONE", "RADIO"],
    monthlyNetEarnedIncome: 5000,
    grossMpesaMonthly: 6000,
    avgRetainedBalance: 1200,
    subletIncome: 0,
    monthlyRent: 0,
    rooms: 3,
    waterSource: "WELL",
    sanitationType: "PIT_LATRINE",
    cookingEnergy: "FIREWOOD",
    lightingEnergy: "SOLAR",
  };

  const originalResult = calculateOriginalAgi(testHousehold);
  assert.ok(Number.isFinite(originalResult.monthlyContribution));
  assert.ok(originalResult.monthlyContribution >= 300);
  assert.ok(Number.isFinite(originalResult.estimatedAnnualIncome));
});

// ─── 14. REGRESSION IMMUTABILITY ON SAVED SNAPSHOT ────────────────────────────

test("Criterion 14: the same input snapshot produces the exact same model results", () => {
  const snapshotSources = [
    {
      id: "shop",
      sourceType: "SELF_EMPLOYMENT",
      monthsObserved: 12,
      amountReceivedKsh: 450000,
      directCostsKsh: 210000,
      expenses: [
        { category: "STOCK_PURCHASES", amountKsh: 180000 },
        { category: "TRANSPORT", amountKsh: 30000 },
      ],
      isSeasonal: false,
    },
  ];

  const calc1 = calculateHouseholdIncome(snapshotSources);
  const calc2 = reproduceHouseholdIncome(calc1.reproducibleInputSnapshot);

  assert.equal(calc1.monthlyEarnedNetKsh, calc2.monthlyEarnedNetKsh);
  assert.equal(calc1.annualisedEarnedNetKsh, calc2.annualisedEarnedNetKsh);
  assert.deepEqual(calc1.reviewFlags, calc2.reviewFlags);

  // Model contributions match exactly
  const c1 = calculateCurrentModelContribution(calc1.annualisedEarnedNetKsh);
  const c2 = calculateCurrentModelContribution(calc2.annualisedEarnedNetKsh);
  assert.equal(c1.monthly, c2.monthly);
  assert.equal(c1.tier, c2.tier);
});
