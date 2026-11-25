import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMonthsFromDates,
  createPreviousCompletedTwelveMonthPeriod,
  isCompleteCalendarMonthWindow,
  checkIncomePeriodAlignment,
  calculateHouseholdIncome,
  createZeroEarnedIncomeAssessment,
  DEFAULT_COMMON_ASSESSMENT_PERIOD
} from "../src/lib/household-income.js";
import {
  calculateModelOutputDifference,
  calculateIllustrativeRevenueScenario,
  generateRevenueStressTest,
  testCurrentModelDisparityByCounty,
  calculateCurrentModel,
  calculateCurrentModelContribution,
  calculateProposedModel
} from "../src/lib/AlgorithmSimulation.js";
import {
  MODEL_VERSION_METADATA,
  calculateProposedModelVersions
} from "../src/lib/model-versioning.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CALENDAR MONTH WINDOW INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

test("Final Demo & Integrity 1: createPreviousCompletedTwelveMonthPeriod returns exact 12-month window in Nairobi timezone", () => {
  const asOf = new Date("2026-11-25T14:30:00Z");
  const period = createPreviousCompletedTwelveMonthPeriod(asOf);

  assert.equal(period.startDate, "2025-11-01");
  assert.equal(period.endDate, "2026-10-31");
  assert.equal(period.windowMonths, 12);
  assert.equal(period.timezone, "Africa/Nairobi");

  const inclusiveMonths = calculateMonthsFromDates(period.startDate, period.endDate);
  assert.equal(inclusiveMonths, 12);
  assert.equal(isCompleteCalendarMonthWindow(period.startDate, period.endDate, 12), true);
});

test("Final Demo & Integrity 2: isCompleteCalendarMonthWindow validates start and end of calendar months", () => {
  // Exact 12-month window
  assert.equal(isCompleteCalendarMonthWindow("2025-01-01", "2025-12-31", 12), true);
  // Exact 6-month window
  assert.equal(isCompleteCalendarMonthWindow("2026-01-01", "2026-06-30", 6), true);

  // Mid-month start (not day 1)
  assert.equal(isCompleteCalendarMonthWindow("2025-01-15", "2025-12-31", 12), false);
  // Mid-month end (not last day)
  assert.equal(isCompleteCalendarMonthWindow("2025-01-01", "2025-12-15", 12), false);
  // Wrong month count
  assert.equal(isCompleteCalendarMonthWindow("2025-01-01", "2025-06-30", 12), false);
  // Invalid dates
  assert.equal(isCompleteCalendarMonthWindow("not-a-date", "2025-12-31"), false);
  assert.equal(isCompleteCalendarMonthWindow("2025-12-31", "2025-01-01"), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXTENDED OBSERVATION PERIODS (>12 MONTHS)
// ─────────────────────────────────────────────────────────────────────────────

test("Final Demo & Integrity 3: Observation periods exceeding 12 months are blocked from classification", () => {
  const source = {
    id: "src-18mo-extended",
    sourceType: "SELF_EMPLOYMENT",
    amountReceivedKsh: 360000,
    directCostsKsh: 0,
    observationStartDate: "2025-01-01",
    observationEndDate: "2026-06-30",
    monthsObserved: 18
  };

  const calc = calculateHouseholdIncome([source]);
  assert.equal(calc.isValid, true);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(calc.calculationStatus, "BLOCKED_EXTENDED_OBSERVATION_PERIOD");
  assert.equal(calc.hasExtendedPeriod, true);
  assert.equal(calc.monthlyEarnedNetKsh, null);
  assert.equal(calc.annualisedEarnedNetKsh, null);

  // Retains review-only monthly average: 360,000 / 18 = 20,000
  assert.equal(calc.reviewOnlyMonthlyEarnedNetKsh, 20000);
  assert.equal(calc.reviewOnlyAnnualisedEarnedNetKsh, 240000);

  const flag = calc.reviewFlags.find(f => f.code === "EXTENDED_OBSERVATION_PERIOD");
  assert.ok(flag, "EXTENDED_OBSERVATION_PERIOD flag must be present");
  assert.ok(flag.message.includes("blocked from automated annualisation"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SOURCE-SPECIFIC REIMBURSEMENT MATCHING
// ─────────────────────────────────────────────────────────────────────────────

test("Final Demo & Integrity 4: Unrelated personal reimbursement does not block unrelated business expenses", () => {
  const sources = [
    {
      id: "biz-1",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 120000,
      directCostsKsh: 30000, // Deducting business expenses
      monthsObserved: 12
    },
    {
      id: "reimb-personal",
      sourceType: "REIMBURSEMENT",
      amountReceivedKsh: 15000,
      isPersonalReimbursement: true, // Explicitly personal / medical
      monthsObserved: 12
    }
  ];

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(calc.hasUnresolvedReimbursements, false);
  assert.equal(calc.calculationStatus, "CALCULATED_STANDARD");
  // Business net: (120,000 - 30,000) / 12 = 7,500/mo
  assert.equal(calc.monthlyEarnedNetKsh, 7500);
});

test("Final Demo & Integrity 5: Linked reimbursement to a business source with expenses triggers reconciliation", () => {
  const sources = [
    {
      id: "biz-kiosk",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 150000,
      directCostsKsh: 40000,
      monthsObserved: 12
    },
    {
      id: "reimb-fuel",
      sourceType: "REIMBURSEMENT",
      amountReceivedKsh: 10000,
      targetSourceId: "biz-kiosk",
      monthsObserved: 12
    }
  ];

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  assert.equal(calc.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(calc.hasUnresolvedReimbursements, true);
  assert.equal(calc.calculationStatus, "BLOCKED_MANUAL_REVIEW");

  const reimbFlag = calc.reviewFlags.find(f => f.code === "REIMBURSEMENT_RECONCILIATION_REQUIRED");
  assert.ok(reimbFlag);
  assert.equal(reimbFlag.targetSourceId, "biz-kiosk");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. MEMBER-DECLARED OVERLAP TERMINOLOGY
// ─────────────────────────────────────────────────────────────────────────────

test("Final Demo & Integrity 6: Duplicate relationships use unverified member-declared terminology", () => {
  const sources = [
    {
      id: "src-parent",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 200000,
      directCostsKsh: 0,
      monthsObserved: 12
    },
    {
      id: "src-child",
      sourceType: "OTHER_EARNED",
      amountReceivedKsh: 50000,
      includedInSourceId: "src-parent",
      overlapAmountKsh: 30000,
      directCostsKsh: 0,
      monthsObserved: 12
    }
  ];

  const calc = calculateHouseholdIncome(sources);
  assert.equal(calc.isValid, true);
  const dupRel = calc.duplicateRelationships[0];
  assert.ok(dupRel);
  assert.ok(dupRel.reason.includes("Member-declared overlap — unverified pending supporting evidence"));
  assert.ok(dupRel.treatment.includes("Member-declared overlap (unverified pending supporting evidence)"));

  const flag = calc.reviewFlags.find(f => f.code === "PARTIAL_DUPLICATE_OVERLAP_DEDUCTED");
  assert.ok(flag);
  assert.ok(flag.message.includes("Member-declared overlap — unverified pending supporting evidence"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. NEUTRAL MODEL OUTPUT DIFFERENCES (NO UNVALIDATED BIAS/OVERCHARGE CLAIMS)
// ─────────────────────────────────────────────────────────────────────────────

test("Final Demo & Integrity 7: calculateModelOutputDifference returns neutral comparative metrics", () => {
  const current = { monthly: 1500, annualIncome: 654545, minimumContributionFloorApplied: false };
  const proposed = { monthly: 520, estimatedAnnualIncome: 226909, minimumContributionFloorApplied: false };

  const diff = calculateModelOutputDifference(current, proposed);
  assert.equal(diff.evalType, "PROTOTYPE_MODEL_COMPARISON");
  assert.equal(diff.differenceKsh, 980);
  assert.equal(diff.direction, "BASELINE_HIGHER");
  assert.ok(diff.percentageDifference > 0);
  assert.equal(diff.caveat, "Synthetic model comparison only; not a measure of actual overcharge or empirical fairness");

  // Verify unvalidated claim fields are absent
  assert.equal(diff.fairnessScore, undefined);
  assert.equal(diff.overchargeAmount, undefined);
  assert.equal(diff.equityImprovement, undefined);
  assert.equal(diff.complianceLikelihood, undefined);
});

test("Final Demo & Integrity 8: testCurrentModelDisparityByCounty is a descriptive diagnostic without pass/fail verdicts", () => {
  const assessments = [
    {
      inputs: { county: "Nairobi" },
      currentResult: { monthly: 800, minimumContributionFloorApplied: false },
      proposedResult: { monthly: 300, minimumContributionFloorApplied: true }
    }
  ];

  const diag = testCurrentModelDisparityByCounty(assessments, "county", 1);
  assert.equal(diag.evaluationType, "SYNTHETIC_ONLY_NOT_VALIDATED");
  assert.equal(diag.passed, undefined); // No pass/fail verdict
  assert.ok(diag.caveat.includes("Real administrative ground truth and representative sampling are required"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ILLUSTRATIVE REVENUE SCENARIO ARITHMETIC
// ─────────────────────────────────────────────────────────────────────────────

test("Final Demo & Integrity 9: calculateIllustrativeRevenueScenario calculates transparent arithmetic without fixed subsidy costs", () => {
  const sc = calculateIllustrativeRevenueScenario({
    eligibleMembers: 15500000,
    participationRate: 0.60,
    averageMonthlyContribution: 520
  });

  assert.equal(sc.scenarioType, "ILLUSTRATIVE_ARITHMETIC_ONLY");
  assert.equal(sc.activeMembers, 9300000);
  assert.equal(sc.monthlyRevenueKsh, 4836000000);
  assert.equal(sc.annualRevenueKsh, 58032000000);
  assert.equal(sc.monthlyRevenueBillions, 4.84);
  assert.equal(sc.annualRevenueBillions, 58.03);

  const stressTest = generateRevenueStressTest(15500000, 520);
  assert.equal(stressTest.scenarioType, "ILLUSTRATIVE_ARITHMETIC_ONLY");
  assert.equal(stressTest.scenarios.length, 5);
  // Verify fixed 3.2B subsidy references are removed
  assert.equal(stressTest.breakeven, undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. MODEL VERSIONING & SOURCE COMMIT HASH
// ─────────────────────────────────────────────────────────────────────────────

test("Final Demo & Integrity 10: Model versioning references b8095765247dce9751fc4f32bf35f0611f86ce52 for declaredIncome", () => {
  const declaredIncomeMeta = MODEL_VERSION_METADATA.declaredIncome;
  assert.equal(declaredIncomeMeta.id, "declared-income-agi-v1.1");
  assert.equal(declaredIncomeMeta.sourceCommit, "b8095765247dce9751fc4f32bf35f0611f86ce52");

  const versions = calculateProposedModelVersions({ monthlyNetEarnedIncome: 10000, assets: [] });
  assert.equal(versions.declaredIncome.id, "declared-income-agi-v1.1");
  assert.equal(versions.declaredIncome.sourceCommit, "b8095765247dce9751fc4f32bf35f0611f86ce52");
});
