import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  calculateProposedModel,
  calculateCurrentModel,
  calculateCurrentModelContribution,
  validateAssessmentInputs,
  PRESETS
} from "../src/lib/AlgorithmSimulation.js";

import {
  calculateProposedModelVersions
} from "../src/lib/model-versioning.js";

import {
  calculateHouseholdIncome,
  createZeroEarnedIncomeAssessment,
  reproduceHouseholdIncome,
  INCOME_SOURCE_RULES
} from "../src/lib/household-income.js";

import {
  buildAssessmentReview,
  getAssessmentVisibility
} from "../src/lib/assessment-flow.js";

import {
  createEvaluationProtocol,
  freezeProtocol,
  PROTOCOL_STATUSES,
  EVALUATION_MODES
} from "../src/lib/evaluation-protocol.js";

import {
  partitionEvaluationDataset,
  PARTITION_TYPES,
  SPLIT_STRATEGIES
} from "../src/lib/evaluation-partitioning.js";

import {
  runEmpiricalComparison
} from "../src/lib/empirical-comparison-runner.js";

import {
  evaluateSamplingUncertainty,
  calculateAffordabilityMetrics
} from "../src/lib/evaluation-metrics.js";

import {
  PILOT_STAGE_IDS,
  PILOT_STAGES_SPECIFICATION
} from "../src/lib/pilot-stages.js";

import {
  assessPilotReadiness,
  recordInstitutionalApproval,
  PILOT_APPROVAL_STATUS,
  PILOT_GATE_STATES
} from "../src/lib/pilot-readiness.js";

import {
  initializePilotControlState,
  transitionPilotControlState,
  PILOT_CONTROL_STATES,
  ALLOWED_PILOT_CONTROL_TRANSITIONS
} from "../src/lib/pilot-control.js";

import {
  DEMO_KIHBS_MAPPING_DICTIONARY,
  REVIEWER_STATUSES
} from "../src/lib/data-dictionary-mapper.js";

import {
  DATA_ACCESS_REGISTER
} from "../src/lib/data-access-register.js";

import {
  buildShaRequestPackJson
} from "../src/lib/sha-request-pack.js";

import {
  executeOfflineShadowReplay,
  buildShadowReplayReportJson
} from "../src/lib/shadow-replay.js";

import {
  REGISTERED_EVALUATION_DATASETS,
  REGISTERED_EVALUATION_TARGETS
} from "../src/lib/evaluation-contracts.js";

import {
  REGISTERED_EVALUATION_MODELS
} from "../src/lib/evaluation-model-registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 1: HOUSEHOLD FORM -> INCOME CALCULATOR -> CLASSIFICATION -> REVIEW
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 1: Multi-source informal livelihood executes complete pipeline", () => {
  // Scenario A: Microbusiness with allowable itemised expenses + casual labour
  const incomeLedger = [
    {
      id: "INC-SHOP",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 35000,
      monthsObserved: 12,
      directCostsKsh: 12000,
      expenses: [
        { category: "STOCK_PURCHASES", amountKsh: 8000, isAllowablePrototype: true },
        { category: "RENT_UTILITIES", amountKsh: 4000, isAllowablePrototype: true }
      ]
    },
    {
      id: "INC-CASUAL",
      sourceType: "CASUAL_LABOUR",
      amountReceivedKsh: 5000,
      monthsObserved: 12
    }
  ];

  // 1. Calculate household income
  const incomeAssessment = calculateHouseholdIncome(incomeLedger);
  assert.equal(incomeAssessment.isValid, true);
  assert.equal(incomeAssessment.canPopulatePrototypeEarnedIncomeBase, true);
  // Net: (35000 - 12000) / 12 = 1917/mo. Casual: 5000 / 12 = 417/mo. Total: 2334 (or 2333 rounded)
  assert.ok(incomeAssessment.monthlyEarnedNetKsh > 2000);
  assert.ok(incomeAssessment.annualisedEarnedNetKsh > 25000);

  // 2. Build assessment inputs
  const assessmentInputs = {
    monthlyNetEarnedIncome: incomeAssessment.monthlyEarnedNetKsh,
    county: "Nakuru",
    householdSize: 4,
    headGender: "FEMALE",
    headAge: 38,
    dwellingType: "SINGLE_ROOM",
    wallMaterial: "STONE",
    roofMaterial: "IRON_SHEETS",
    floorMaterial: "CEMENT",
    rooms: 2,
    ownershipStatus: "RENTED",
    monthlyRent: 4000,
    subletIncome: 0,
    waterSource: "PUBLIC_TAP",
    sanitationType: "PIT_LATRINE",
    cookingEnergy: "CHARCOAL",
    lightingEnergy: "ELECTRICITY",
    assets: ["SMARTPHONE"],
    motorcycleIsCommercial: false,
    landAcreage: 0,
    livestockCount: 0,
    receivesAid: false,
    hasSevereIllness: false,
    chronicIllnessCount: 0,
    hasDisability: false,
    disabilityType: "NONE",
    isSeasonalWorker: false,
    grossMpesaMonthly: 30000,
    avgRetainedBalance: 2500,
    isGroupTreasurer: false,
    hasNoEarnedIncome: false,
    incomeSources: incomeLedger,
    incomeAssessmentSnapshot: incomeAssessment
  };

  const validation = validateAssessmentInputs(assessmentInputs);
  assert.equal(validation.isValid, true);

  // 3. Run classification model versions
  const versions = calculateProposedModelVersions(assessmentInputs);
  assert.ok(versions.declaredIncome);
  assert.ok(versions.originalAgi);
  assert.equal(versions.declaredIncome.result.estimatedAnnualIncome, incomeAssessment.annualisedEarnedNetKsh);
  assert.ok(versions.declaredIncome.result.monthlyContribution >= 300);

  // 4. Generate structured review summary
  const review = buildAssessmentReview({
    inputs: assessmentInputs,
    incomeAssessmentSnapshot: incomeAssessment,
    incomeSources: incomeLedger
  });

  assert.equal(review.status, "MEMBER_REPORTED");
  assert.equal(review.calculationStatus, "CALCULATED_STANDARD");
  assert.equal(review.household.householdSize, 4);
  assert.equal(review.earnedSources.totalMonthlyNet, incomeAssessment.monthlyEarnedNetKsh);
  assert.equal(review.requiresManualReview, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 2: ZERO EARNED INCOME -> VALID ASSESSMENT SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 2: Explicit zero-earned-income produces valid qualified state without empty-array corruption", () => {
  // Scenario B: Subsistence household with explicit zero earned income
  const zeroAssessment = createZeroEarnedIncomeAssessment();
  assert.equal(zeroAssessment.isValid, true);
  assert.equal(zeroAssessment.hasDeclaredNoEarnedIncome, true);
  assert.equal(zeroAssessment.monthlyEarnedNetKsh, 0);
  assert.equal(zeroAssessment.annualisedEarnedNetKsh, 0);
  assert.equal(zeroAssessment.calculationStatus, "CALCULATED_EXPLICIT_ZERO_EARNED");

  const assessmentInputs = {
    monthlyNetEarnedIncome: 0,
    county: "Turkana",
    householdSize: 6,
    headGender: "MALE",
    headAge: 52,
    dwellingType: "MANYATTA",
    wallMaterial: "MUD_WOOD",
    roofMaterial: "THATCH",
    floorMaterial: "EARTH",
    rooms: 1,
    ownershipStatus: "OWNED",
    monthlyRent: 0,
    subletIncome: 0,
    waterSource: "RIVER",
    sanitationType: "NONE",
    cookingEnergy: "FIREWOOD",
    lightingEnergy: "KEROSENE",
    assets: [],
    motorcycleIsCommercial: false,
    landAcreage: 0,
    livestockCount: 1,
    receivesAid: false,
    hasSevereIllness: false,
    chronicIllnessCount: 0,
    hasDisability: false,
    disabilityType: "NONE",
    isSeasonalWorker: false,
    grossMpesaMonthly: 0,
    avgRetainedBalance: 0,
    isGroupTreasurer: false,
    hasNoEarnedIncome: true,
    incomeSources: [],
    incomeAssessmentSnapshot: zeroAssessment
  };

  const validation = validateAssessmentInputs(assessmentInputs);
  assert.equal(validation.isValid, true);

  const versions = calculateProposedModelVersions(assessmentInputs);
  assert.equal(versions.declaredIncome.result.estimatedAnnualIncome, 0);
  // Evaluated contribution is statutory non-salaried floor (Regulation 18(2): KSh 300/mo minimum; cf. Reg 17(2) for salaried)
  assert.equal(versions.declaredIncome.result.monthlyContribution, 300);
  assert.equal(versions.declaredIncome.result.isIndigent, true);

  // Review summary captures zero-income state
  const review = buildAssessmentReview({
    inputs: assessmentInputs,
    incomeAssessmentSnapshot: zeroAssessment,
    incomeSources: []
  });

  assert.equal(review.household.householdSize, 6);
  assert.equal(review.earnedSources.totalMonthlyNet, 0);
  assert.ok(review.reviewFlags.some(f => f.code === "EXPLICIT_ZERO_EARNED_INCOME"));
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 3: UNEARNED TRANSFER -> POLICY BLOCKER QUALIFICATION
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 3: Unearned transfers trigger PROVISIONAL_PENDING_POLICY without inflating earned base", () => {
  // Scenario C: Cash transfer + remittances without active earned livelihood
  const transferLedger = [
    {
      id: "TR-01",
      sourceType: "SOCIAL_ASSISTANCE",
      amountReceivedKsh: 2000,
      monthsObserved: 12
    },
    {
      id: "TR-02",
      sourceType: "REMITTANCES",
      amountReceivedKsh: 3000,
      monthsObserved: 12
    }
  ];

  const assessment = calculateHouseholdIncome(transferLedger);
  assert.equal(assessment.isValid, true);
  assert.equal(assessment.monthlyEarnedNetKsh, 0); // Earned base is strictly 0
  assert.equal(assessment.monthlyPolicyReviewResourcesKsh, 417); // (2000 + 3000) / 12 = 417
  assert.equal(assessment.requiresPolicyDecision, true);
  assert.equal(assessment.calculationStatus, "PROVISIONAL_PENDING_POLICY");

  const review = buildAssessmentReview({
    inputs: { hasNoEarnedIncome: true, county: "Kilifi", householdSize: 3 },
    incomeAssessmentSnapshot: assessment,
    incomeSources: transferLedger
  });

  assert.equal(review.requiresPolicyDecision, true);
  assert.equal(review.isProvisionalPolicyPending, true);
  assert.equal(review.calculationStatus, "PROVISIONAL_PENDING_POLICY");
  assert.ok(review.policyDecisionSummary.includes("Transfers and social assistance"));
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 4: SHORT OBSERVATION WINDOW -> PROVISIONAL STATUS PROPAGATION
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 4: Short observation window (3-11 months) flags provisional extrapolation", () => {
  // Scenario D: Microbusiness observed for only 5 months
  const shortWindowLedger = [
    {
      id: "INC-SHORT",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 25000, // 5,000/mo over 5 months
      monthsObserved: 5,
      directCostsKsh: 0
    }
  ];

  const assessment = calculateHouseholdIncome(shortWindowLedger);
  assert.equal(assessment.isValid, true);
  assert.equal(assessment.monthlyEarnedNetKsh, 5000);
  assert.equal(assessment.hasProvisionalShortWindowSources, true);
  assert.equal(assessment.annualisationReliability, "PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION");

  const review = buildAssessmentReview({
    inputs: { county: "Nairobi", householdSize: 2 },
    incomeAssessmentSnapshot: assessment,
    incomeSources: shortWindowLedger
  });

  assert.equal(review.hasProvisionalShortWindowSources, true);
  assert.equal(review.annualisationReliability, "PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION");
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 5 & 6: SURVEY MANIFEST + SYNTHETIC FIXTURES & UNAPPROVED DATASET
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 5 & 6: Survey manifest with synthetic records is blocked with provenance mismatch", () => {
  const protocol = freezeProtocol(
    createEvaluationProtocol({
      protocolId: "EP-PROVENANCE-INT",
      title: "Provenance Test",
      researchQuestion: "Does PMT estimate consumption?",
      datasetId: "KNBS_KIHBS_2015_16",
      referenceOutcomeId: "INDEPENDENT_ANNUAL_CONSUMPTION",
      candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"]
    }),
    { reviewer: "Lead Methodologist" }
  );

  const syntheticRecords = [
    {
      id: "REC-FAKE-01",
      _isSynthetic: true,
      referenceValue: 120000,
      pred_COMPARATOR_PMT_ILLUSTRATIVE: 110000
    }
  ];

  const surveyManifest = {
    id: "KNBS_KIHBS_2015_16",
    datasetType: "SURVEY",
    isApprovedForEmpiricalEvaluation: true
  };

  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"],
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    protocol,
    datasetManifest: surveyManifest,
    evaluationRecords: syntheticRecords
  });

  assert.equal(result.status, "BLOCKED");
  assert.ok(result.blockers.some(b => b.includes("Provenance mismatch")));
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 7 & 8: PROTOCOL APPROVAL STATUS & EVALUATION GATE
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 7 & 8: Unfrozen demo protocol template blocks empirical survey evaluation", () => {
  const unfrozenTemplate = {
    protocolId: "EP-TEMPLATE",
    title: "Demo Protocol Template",
    approvalStatus: PROTOCOL_STATUSES.DEMO_PROTOCOL_TEMPLATE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"]
  };

  const surveyManifest = {
    id: "SURVEY-REAL",
    datasetType: "SURVEY",
    isApprovedForEmpiricalEvaluation: true
  };

  const records = [
    { id: "REC-01", referenceValue: 100000, pred_COMPARATOR_PMT_ILLUSTRATIVE: 95000 }
  ];

  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"],
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    protocol: unfrozenTemplate,
    datasetManifest: surveyManifest,
    evaluationRecords: records
  });

  assert.equal(result.status, "BLOCKED");
  assert.ok(result.blockers.some(b => b.includes("Protocol freeze required")));
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 9: HOLDOUT SELECTION ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 9: Evaluation partitioning separates holdout and prevents contamination", () => {
  const testRecords = Array.from({ length: 500 }, (_, i) => ({
    householdId: `HH-${i}`,
    income: 20000 + i * 500
  }));

  const partitionSummary = partitionEvaluationDataset(testRecords, {
    householdGroupingKey: "householdId",
    devRatio: 0.50,
    calRatio: 0.20,
    holdoutRatio: 0.30
  });

  assert.ok(partitionSummary.partitions[PARTITION_TYPES.HOLDOUT].length > 0);
  assert.ok(partitionSummary.partitions[PARTITION_TYPES.DEVELOPMENT].length > 0);
  assert.ok(partitionSummary.partitions[PARTITION_TYPES.CALIBRATION].length > 0);

  // Households must not cross partitions
  const devIds = new Set(partitionSummary.partitions[PARTITION_TYPES.DEVELOPMENT].map(r => r.householdId));
  const holdoutIds = new Set(partitionSummary.partitions[PARTITION_TYPES.HOLDOUT].map(r => r.householdId));

  for (const id of devIds) {
    assert.equal(holdoutIds.has(id), false, `Household ${id} leaked into holdout!`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 10 & 11: MODEL ATTRIBUTION & MISSING PREDICTION ACCOUNTING
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 10 & 11: Predictions strictly attributed to model ID; missing predictions counted", () => {
  const records = [
    { id: "1", referenceValue: 100000, pred_COMPARATOR_PMT_ILLUSTRATIVE: 95000 },
    { id: "2", referenceValue: 200000, pred_COMPARATOR_PMT_ILLUSTRATIVE: null }, // Missing prediction
    { id: "3", referenceValue: 150000, pred_COMPARATOR_PMT_ILLUSTRATIVE: 140000 }
  ];

  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"],
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    datasetManifest: REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"],
    evaluationRecords: records
  });

  // Records 1 and 3 are evaluable; record 2 is excluded
  assert.equal(result.pairedSampleSize, 2);
  assert.equal(result.excludedObservationsCount, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 12: STATISTICAL UNCERTAINTY WITHOUT DESIGN-AWARE ESTIMATOR
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 12: Complex survey design metadata reports UNCERTAINTY_NOT_ESTIMATED", () => {
  const complexSurveyManifest = {
    id: "COMPLEX_SURVEY_TEST",
    datasetType: "SURVEY",
    clusterField: "ea_code",
    strataField: "county_stratum"
  };

  const uncertainty = evaluateSamplingUncertainty(complexSurveyManifest);
  assert.equal(uncertainty.hasValidDesign, true);
  assert.equal(uncertainty.confidenceIntervalsAvailable, false);
  assert.equal(uncertainty.status, "UNCERTAINTY_NOT_ESTIMATED");
  assert.ok(uncertainty.reason.includes("variance estimation"));
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 13, 14, 15, 16: PILOT READINESS, TRANSITION GRAPH & ROLLBACK
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 13, 14, 15, 16: Pilot Readiness lifecycle, transition graph, and simulated rollback", () => {
  // 13: All five stages produce valid readiness assessments
  for (const stageKey of Object.keys(PILOT_STAGE_IDS)) {
    const stageId = PILOT_STAGE_IDS[stageKey];
    const assessment = assessPilotReadiness({ targetStage: stageId });
    assert.ok(assessment.requestedStage);
    assert.equal(assessment.hasInstitutionalApproval, false);
  }

  // 14: Ready for institutional approval when evidence is complete
  const readinessCompleteEvidence = assessPilotReadiness({
    targetStage: PILOT_STAGE_IDS.STAGE_1_TECHNICAL_REVIEW,
    evidence: {
      methodologyDocumented: true,
      modelVersionsIdentified: true,
      knownLimitationsDocumented: true,
      legalScopeReviewed: true
    }
  });
  assert.equal(readinessCompleteEvidence.status, PILOT_GATE_STATES.READY_FOR_INSTITUTIONAL_APPROVAL);
  assert.equal(readinessCompleteEvidence.hasInstitutionalApproval, false);

  // 15: State machine strictly enforces permitted transitions graph
  const control = initializePilotControlState({ pilotId: "PILOT-INT-01" });
  assert.equal(control.currentState, PILOT_CONTROL_STATES.NOT_STARTED);

  // Illegal transition: NOT_STARTED to PAUSED
  assert.throws(
    () => {
      transitionPilotControlState(control, {
        targetState: PILOT_CONTROL_STATES.PAUSED,
        authorizingRole: "OPERATOR",
        reason: "Illegal skip"
      });
    },
    /Illegal state transition/
  );

  // Valid transition: NOT_STARTED to ACTIVE
  const activeControl = transitionPilotControlState(control, {
    targetState: PILOT_CONTROL_STATES.ACTIVE,
    authorizingRole: "SHA_PROGRAMME_SPONSOR",
    reason: "Stage 1 approvals complete"
  });
  assert.equal(activeControl.currentState, PILOT_CONTROL_STATES.ACTIVE);

  // 16: Simulated rollback execution records unchanged official reliance
  const suspendedControl = transitionPilotControlState(activeControl, {
    targetState: PILOT_CONTROL_STATES.SUSPENDED,
    authorizingRole: "SAFETY_OFFICER",
    reason: "Discrepancy spike in shadow replay",
    stopConditionKey: "UNEXPLAINED_MODEL_SHIFT"
  });

  assert.equal(suspendedControl.currentState, PILOT_CONTROL_STATES.SUSPENDED);
  assert.ok(suspendedControl.rollbackExecution);
  assert.equal(
    suspendedControl.rollbackExecution.operationalRelianceStatus,
    "SIMULATION_ASSUMES_OFFICIAL_PROCESS_UNCHANGED"
  );
  assert.ok(suspendedControl.rollbackExecution.simulationNotice.includes("does NOT interact with live SHA production infrastructure"));
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 17: KNBS MAPPING REMINDS DEMO-ONLY
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 17: KNBS codebook mappings remain explicitly marked DEMO_ONLY", () => {
  for (const mapping of DEMO_KIHBS_MAPPING_DICTIONARY) {
    assert.equal(mapping.reviewerStatus, REVIEWER_STATUSES.DEMO_ONLY);
    assert.ok(mapping.sourceDatasetField);
    assert.ok(mapping.canonicalConcept);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCE 18: EXPORT & PROVENANCE INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

test("Integration 18: Synthetic demonstration report exports with DEMO_ONLY and no identifiable PII", () => {
  const protocol = freezeProtocol(
    createEvaluationProtocol({
      protocolId: "EP-EXPORT-TEST",
      title: "Export Integrity Test",
      researchQuestion: "Demo export verification",
      datasetId: "SYNTHETIC_DEMO_2026",
      referenceOutcomeId: "INDEPENDENT_ANNUAL_CONSUMPTION",
      candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"]
    }),
    { reviewer: "Audit Lead" }
  );

  const syntheticRecords = [
    { id: "REC-01", referenceValue: 100000, pred_COMPARATOR_PMT_ILLUSTRATIVE: 95000 },
    { id: "REC-02", referenceValue: 200000, pred_COMPARATOR_PMT_ILLUSTRATIVE: 210000 }
  ];

  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"],
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    protocol,
    datasetManifest: REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"],
    evaluationRecords: syntheticRecords
  });

  assert.equal(result.status, "DEMO_ONLY");
  assert.ok(result.warnings.some(w => w.includes("DEMONSTRATION RUN: Evaluated using synthetic data fixtures.")));

  const exportedJson = JSON.stringify(result);
  // Verify no raw national ID, phone number or PII is leaked
  assert.equal(exportedJson.includes("nationalId"), false);
  assert.equal(exportedJson.includes("phoneNumber"), false);
  assert.equal(exportedJson.includes("idNumber"), false);
});
