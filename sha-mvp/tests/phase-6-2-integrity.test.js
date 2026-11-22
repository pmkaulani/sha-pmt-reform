import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  OFFICIAL_SHA_BASELINE_SPECIFICATION,
  validateShaBaselineCompleteness,
  SHA_BASELINE_STATUSES
} from "../src/lib/sha-baseline-registry.js";

import {
  REGISTERED_EVALUATION_MODELS,
  getModelRegistryEntry
} from "../src/lib/evaluation-model-registry.js";

import {
  evaluateEvidenceReadinessGate,
  READINESS_GATE_STATUSES
} from "../src/lib/evidence-readiness.js";

import {
  REGISTERED_EVALUATION_DATASETS,
  REGISTERED_EVALUATION_TARGETS
} from "../src/lib/evaluation-contracts.js";

import {
  runEmpiricalComparison
} from "../src/lib/empirical-comparison-runner.js";

import {
  evaluateSamplingUncertainty,
  calculateAffordabilityMetrics
} from "../src/lib/evaluation-metrics.js";

import {
  createEvaluationProtocol,
  freezeProtocol,
  PROTOCOL_STATUSES,
  EVALUATION_MODES,
  STANDARD_REGISTERED_PROTOCOLS
} from "../src/lib/evaluation-protocol.js";

import {
  calculateHouseholdIncome,
  createZeroEarnedIncomeAssessment
} from "../src/lib/household-income.js";

import {
  buildAssessmentReview,
  getAssessmentVisibility
} from "../src/lib/assessment-flow.js";

import {
  PILOT_STAGE_IDS,
  PILOT_STAGES_SPECIFICATION
} from "../src/lib/pilot-stages.js";

import {
  assessPilotReadiness,
  recordInstitutionalApproval,
  PILOT_STAGES,
  PILOT_APPROVAL_STATUS
} from "../src/lib/pilot-readiness.js";

import {
  initializePilotControlState,
  transitionPilotControlState,
  PILOT_CONTROL_STATES,
  ALLOWED_PILOT_CONTROL_TRANSITIONS
} from "../src/lib/pilot-control.js";

import {
  DEMO_KIHBS_MAPPING_DICTIONARY,
  REVIEWER_STATUSES,
  CANONICAL_CONCEPTS
} from "../src/lib/data-dictionary-mapper.js";

import {
  profileDatasetQuality,
  DOCUMENTED_PLAUSIBILITY_RULES
} from "../src/lib/data-quality-profiler.js";

import {
  DATA_ACCESS_REGISTER
} from "../src/lib/data-access-register.js";

import {
  buildShaRequestPackJson,
  generateShaRequestPackMarkdown
} from "../src/lib/sha-request-pack.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATUTORY BASELINE SPECIFICATION & LEGAL BASES
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 6.2 — Statutory Baseline: Official SHA Means-Testing Instrument reframed & Fifth Schedule clarified", () => {
  assert.equal(
    OFFICIAL_SHA_BASELINE_SPECIFICATION.officialModelName,
    "Official SHA Means-Testing Instrument — Implementation Details Pending Verification"
  );
  assert.equal(
    OFFICIAL_SHA_BASELINE_SPECIFICATION.status,
    SHA_BASELINE_STATUSES.NOT_CONFIGURED
  );
  assert.ok(
    OFFICIAL_SHA_BASELINE_SPECIFICATION.legalBasis.includes("Section 27")
  );
  assert.ok(
    OFFICIAL_SHA_BASELINE_SPECIFICATION.legalBasis.includes("Regulations 18, 19, and 21(6)")
  );

  // Must note that the Fifth Schedule is titled "Means Testing" and contains a stated equation
  assert.ok(
    OFFICIAL_SHA_BASELINE_SPECIFICATION.officialSourceReferences.some(ref =>
      ref.includes("Fifth Schedule 'Means Testing'")
    )
  );

  // Must note that proxy variables are external disclosures pending verification
  assert.equal(
    OFFICIAL_SHA_BASELINE_SPECIFICATION.urbanModelSpecification.notes.includes("not been officially published"),
    true
  );
});

test("Phase 6.2 — Statutory Baseline: Evaluation Model Registry reflects verified legal basis", () => {
  const shaModel = REGISTERED_EVALUATION_MODELS["OFFICIAL_SHA_REG21_BASELINE"];
  assert.ok(shaModel);
  assert.equal(
    shaModel.name,
    "Official SHA Means-Testing Instrument — Implementation Details Pending Verification"
  );
  assert.ok(shaModel.sourceProvenance.includes("Section 27"));
  assert.ok(shaModel.sourceProvenance.includes("Regulations 18 and 21(6)"));
  assert.ok(shaModel.sourceProvenance.includes("Fifth Schedule"));
  assert.ok(shaModel.knownLimitations.includes("Fifth Schedule ('Means Testing')"));
});

test("Phase 6.2 — Model Registry: AGI models are de-listed from claiming independent poverty classification", () => {
  const agiOriginal = REGISTERED_EVALUATION_MODELS["AGI_ORIGINAL_V2_1"];
  const agiDeclared = REGISTERED_EVALUATION_MODELS["AGI_DECLARED_INCOME_V1"];

  for (const model of [agiOriginal, agiDeclared]) {
    const povertyEligibility = model.evaluationAdapters["INDEPENDENT_POVERTY_STATUS"];
    assert.ok(povertyEligibility, `Model ${model.id} missing evaluationAdapters for poverty status`);
    assert.equal(
      povertyEligibility.isEligible,
      false,
      `Model ${model.id} must not claim eligibility for poverty status`
    );
    assert.equal(povertyEligibility.status, "NOT_EVALUABLE_INCOMPATIBLE");
  }

  // Original AGI v2.1 specifically cites Regulation 18(2) statutory minimum contribution floor
  assert.ok(
    agiOriginal.evaluationAdapters["INDEPENDENT_POVERTY_STATUS"].reason.includes("Regulation 18(2)"),
    "Must cite Regulation 18(2) administrative minimum contribution"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FAIL-CLOSED EMPIRICAL COMPARISON RUNNER
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 6.2 — Comparison Runner: Rejects run when dataset is SURVEY but records contain synthetic demo fixtures", () => {
  const protocol = freezeProtocol(
    createEvaluationProtocol({
      protocolId: "EP-TEST-SURVEY",
      title: "Test Protocol",
      researchQuestion: "Does PMT estimate consumption accurately?",
      datasetId: "SURVEY_MICRODATA_DEMO",
      referenceOutcomeId: "INDEPENDENT_ANNUAL_CONSUMPTION",
      candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"]
    }),
    { reviewer: "Chief Researcher" }
  );

  const syntheticRecords = [
    {
      id: "REC-01",
      _isSynthetic: true,
      referenceValue: 100000,
      pred_COMPARATOR_PMT_ILLUSTRATIVE: 95000
    }
  ];

  const surveyManifest = {
    id: "SURVEY_MICRODATA_DEMO",
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

test("Phase 6.2 — Comparison Runner: Rejects empirical survey evaluation when protocol is not frozen", () => {
  const unfrozenProtocol = {
    protocolId: "EP-DEMO-TEMPLATE",
    title: "Demo Protocol Template",
    approvalStatus: PROTOCOL_STATUSES.DEMO_PROTOCOL_TEMPLATE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"]
  };

  const surveyManifest = {
    id: "SURVEY_MICRODATA_DEMO",
    datasetType: "SURVEY",
    isApprovedForEmpiricalEvaluation: true
  };

  const records = [
    {
      id: "REC-01",
      referenceValue: 100000,
      pred_COMPARATOR_PMT_ILLUSTRATIVE: 95000
    }
  ];

  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"],
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    protocol: unfrozenProtocol,
    datasetManifest: surveyManifest,
    evaluationRecords: records
  });

  assert.equal(result.status, "BLOCKED");
  assert.ok(result.blockers.some(b => b.includes("Protocol freeze required")));
});

test("Phase 6.2 — Comparison Runner: Rejects generic prediction fallbacks; requires model-specific keys", () => {
  const records = [
    {
      id: "REC-GENERIC",
      referenceValue: 100000,
      predicted: 95000 // Generic fallback that should be ignored
    }
  ];

  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"],
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    datasetManifest: REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"],
    evaluationRecords: records
  });

  assert.equal(result.status, "NOT_EVALUABLE");
  assert.ok(result.blockers.some(b => b.includes("No mutually valid observations")));
});

test("Phase 6.2 — Comparison Runner: Isolates zero/negative disposable resources into dedicated category", () => {
  const records = [
    {
      id: "HH-POSITIVE",
      monthlyIncome: 20000,
      contrib_COMPARATOR_PMT_ILLUSTRATIVE: 500
    },
    {
      id: "HH-ZERO-RESOURCE",
      monthlyIncome: 0,
      contrib_COMPARATOR_PMT_ILLUSTRATIVE: 300
    },
    {
      id: "HH-NEGATIVE-RESOURCE",
      monthlyIncome: -5000,
      contrib_COMPARATOR_PMT_ILLUSTRATIVE: 300
    }
  ];

  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.AFFORDABILITY,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"],
    datasetManifest: REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"],
    evaluationRecords: records
  });

  assert.ok(result.zeroOrNegativeResourcesSummary);
  assert.equal(result.zeroOrNegativeResourcesSummary.category, "ZERO_OR_NEGATIVE_RESOURCES");
  assert.equal(result.zeroOrNegativeResourcesSummary.count, 2);
  assert.equal(result.pairedSampleSize, 1);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATISTICAL UNCERTAINTY & AFFORDABILITY POLICY STATUS
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 6.2 — Evaluation Metrics: Sampling uncertainty returns UNCERTAINTY_NOT_ESTIMATED", () => {
  const uncertainty = evaluateSamplingUncertainty({
    id: "COMPLEX_SURVEY",
    datasetType: "SURVEY",
    clusterField: "cluster_id",
    strataField: "stratum_id"
  });

  assert.equal(uncertainty.status, "UNCERTAINTY_NOT_ESTIMATED");
  assert.equal(uncertainty.confidenceIntervalsAvailable, false);
  assert.ok(uncertainty.reason.includes("variance estimation"));
});

test("Phase 6.2 — Evaluation Metrics: Affordability thresholds are marked NOT_POLICY_APPROVED", () => {
  const affordability = calculateAffordabilityMetrics([
    { proposedContributionMonthly: 300, measuredMonthlyResources: 10000 }
  ]);

  assert.equal(affordability.metrics.policyStatus, "NOT_POLICY_APPROVED");
  assert.ok(affordability.metrics.policyDisclaimer.includes("NOT official SHA statutory limits"));
  assert.ok(affordability.metrics.highBurdenThreshold.includes("NOT an official SHA policy standard"));
  assert.ok(affordability.metrics.severeBurdenThreshold.includes("NOT an official SHA policy standard"));
  assert.equal(affordability.zeroOrNegativeResourcesCategory.category, "ZERO_OR_NEGATIVE_RESOURCES");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ASSESSMENT CALCULATION INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 6.2 — Household Income: createZeroEarnedIncomeAssessment produces valid explicit zero state", () => {
  const assessment = createZeroEarnedIncomeAssessment();

  assert.equal(assessment.isValid, true);
  assert.equal(assessment.hasDeclaredNoEarnedIncome, true);
  assert.equal(assessment.monthlyEarnedNetKsh, 0);
  assert.equal(assessment.annualisedEarnedNetKsh, 0);
  assert.equal(assessment.calculationStatus, "CALCULATED_EXPLICIT_ZERO_EARNED");
  assert.equal(assessment.reviewFlags[0].code, "EXPLICIT_ZERO_EARNED_INCOME");
  assert.ok(assessment.disclaimer.includes("Regulation 18(2)"));
  assert.ok(assessment.disclaimer.includes("Regulation 19"));
});

test("Phase 6.2 — Assessment Flow: Declaration of unearned transfers triggers requiresPolicyDecision", () => {
  const ledger = [
    {
      id: "TR-01",
      sourceType: "SOCIAL_ASSISTANCE",
      amountReceivedKsh: 3000,
      monthsObserved: 12
    }
  ];

  const assessment = calculateHouseholdIncome(ledger);
  assert.equal(assessment.isValid, true);
  assert.equal(assessment.requiresPolicyDecision, true);
  assert.equal(assessment.calculationStatus, "PROVISIONAL_PENDING_POLICY");
  assert.ok(assessment.policyDecisionSummary.includes("Transfers and social assistance require approved SHA policy rules"));

  const review = buildAssessmentReview({
    inputs: { hasNoEarnedIncome: true },
    incomeAssessmentSnapshot: assessment,
    incomeSources: ledger
  });

  assert.equal(review.requiresPolicyDecision, true);
  assert.equal(review.isProvisionalPolicyPending, true);
  assert.equal(review.calculationStatus, "PROVISIONAL_PENDING_POLICY");
});

test("Phase 6.2 — Assessment Flow: Provisional short-window sources (3-11 months) are flagged", () => {
  const incomeLedger = [
    {
      id: "INC-TRADE",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 30000,
      monthsObserved: 6
    }
  ];

  const assessment = calculateHouseholdIncome(incomeLedger);
  assert.equal(assessment.isValid, true);
  assert.equal(assessment.hasProvisionalShortWindowSources, true);
  assert.equal(assessment.annualisationReliability, "PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION");
});

test("Phase 6.2 — Assessment Flow: Allowable costs carry research policy disclaimer", () => {
  const assessment = calculateHouseholdIncome([
    {
      id: "INC-01",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 50000,
      monthsObserved: 12
    }
  ]);
  assert.equal(assessment.isValid, true);
  assert.ok(assessment.allowableCostsPolicyNotice.includes("Reported operating cost deductions represent research prototype assumptions"));
  assert.ok(assessment.reimbursementReconciliationNotice.includes("No reimbursements reported"));

  const zeroAssessment = createZeroEarnedIncomeAssessment();
  assert.ok(zeroAssessment.allowableCostsPolicyNotice.includes("Operating expense rules reflect research assumptions"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. PILOT READINESS & STATE MACHINE TRANSITION GRAPH
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 6.2 — Pilot Readiness: Stage normalization handles STAGE_2_OFFLINE_HISTORICAL_REPLAY", () => {
  const readiness = assessPilotReadiness({
    targetStage: PILOT_STAGE_IDS.STAGE_2_OFFLINE_HISTORICAL_REPLAY
  });

  assert.equal(readiness.requestedStage, "OFFLINE_REPLAY");
  assert.ok(readiness.missingEvidence.length > 0);
});

test("Phase 6.2 — Pilot Readiness: All 5 stage IDs in PILOT_STAGE_IDS are accepted", () => {
  for (const stageKey of Object.keys(PILOT_STAGE_IDS)) {
    const fullStageId = PILOT_STAGE_IDS[stageKey];
    const readiness = assessPilotReadiness({ targetStage: fullStageId });
    assert.ok(readiness, `Failed readiness assessment for ${fullStageId}`);
    assert.ok(readiness.requestedStage, `Stage normalization failed for ${fullStageId}`);
  }
});

test("Phase 6.2 — Pilot Readiness: recordInstitutionalApproval defaults to NOT_REQUESTED", () => {
  const approval = recordInstitutionalApproval({
    approverRole: "LEGAL_REVIEWER",
    approvalReference: "APP-REF-1234",
    scope: "STAGE_1_TECHNICAL_REVIEW",
    supportingDocumentReference: "DOC-LEGAL-OPINION-01"
  });

  assert.equal(approval.status, PILOT_APPROVAL_STATUS.NOT_REQUESTED);
  assert.equal(approval.isSyntheticDemo, false);
});

test("Phase 6.2 — Pilot Control: Permitted state transitions graph enforced", () => {
  const initialState = initializePilotControlState({ pilotId: "PILOT-TEST-01" });
  assert.equal(initialState.currentState, PILOT_CONTROL_STATES.NOT_STARTED);

  // Valid transition: NOT_STARTED -> ACTIVE
  const activeState = transitionPilotControlState(initialState, {
    targetState: PILOT_CONTROL_STATES.ACTIVE,
    authorizingRole: "SHA_PROGRAMME_SPONSOR",
    reason: "Formal institutional authorization granted"
  });
  assert.equal(activeState.currentState, PILOT_CONTROL_STATES.ACTIVE);

  // Invalid transition: ACTIVE -> NOT_STARTED (not in permitted list)
  assert.throws(
    () => {
      transitionPilotControlState(activeState, {
        targetState: PILOT_CONTROL_STATES.NOT_STARTED,
        authorizingRole: "OPS",
        reason: "Rewind"
      });
    },
    /Illegal state transition/
  );

  // Valid suspension / rollback: ACTIVE -> SUSPENDED
  const suspendedState = transitionPilotControlState(activeState, {
    targetState: PILOT_CONTROL_STATES.SUSPENDED,
    authorizingRole: "SAFETY_OFFICER",
    reason: "Anomalous score distribution detected",
    stopConditionKey: "UNEXPLAINED_MODEL_SHIFT"
  });
  assert.equal(suspendedState.currentState, PILOT_CONTROL_STATES.SUSPENDED);
  assert.equal(
    suspendedState.rollbackExecution.operationalRelianceStatus,
    "SIMULATION_ASSUMES_OFFICIAL_PROCESS_UNCHANGED"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. KNBS CODEBOOK & PROFILER PLAUSIBILITY
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 6.2 — Data Dictionary: DEMO_KIHBS_MAPPING_DICTIONARY uses standard KNBS fields & DEMO_ONLY status", () => {
  const mappings = DEMO_KIHBS_MAPPING_DICTIONARY;
  assert.ok(mappings.length > 0);

  // Standard KNBS fields: hhid, resid, hhsize, totcons_annual
  const mappedSourceFields = mappings.map(m => m.sourceDatasetField);
  assert.ok(mappedSourceFields.includes("hhid"), "Must include hhid");
  assert.ok(mappedSourceFields.includes("resid"), "Must include resid");
  assert.ok(mappedSourceFields.includes("hhsize"), "Must include hhsize");
  assert.ok(mappedSourceFields.includes("totcons_annual"), "Must include totcons_annual");

  // Reviewer status must be DEMO_ONLY
  for (const mapping of mappings) {
    assert.equal(
      mapping.reviewerStatus,
      REVIEWER_STATUSES.DEMO_ONLY,
      `Mapping for ${mapping.sourceDatasetField} must be marked DEMO_ONLY`
    );
  }
});

test("Phase 6.2 — Profiler: Plausibility checks use Number.isFinite() and preserve extended households", () => {
  const rule = DOCUMENTED_PLAUSIBILITY_RULES["HHSIZE"];
  assert.ok(rule);
  assert.ok(rule.doc.includes("without automatic exclusion"));

  // Check profiling detects NaN and Infinity
  const records = [
    { id: "REC-FINITE", hh_size: 5 },
    { id: "REC-NAN", hh_size: NaN },
    { id: "REC-INF", hh_size: Infinity }
  ];

  const profile = profileDatasetQuality(records, { idField: "id" });
  assert.equal(profile.invalidValueCounts.nonFiniteNumbers, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. BYTE-FOR-BYTE PRESERVATION OF ORIGINAL AGI V2.1
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 6.2 — Byte-for-byte SHA-256 and Git blob integrity of AlgorithmSimulation.original-agi-v2.1.js", () => {
  const filePath = path.resolve(__dirname, "../src/lib/AlgorithmSimulation.original-agi-v2.1.js");
  assert.ok(fs.existsSync(filePath), "AlgorithmSimulation.original-agi-v2.1.js must exist");

  const rawBytes = fs.readFileSync(filePath);

  // Normalize CRLF to LF for canonical git blob and Unix SHA-256
  const textContent = rawBytes.toString("utf8").replace(/\r\n/g, "\n");
  const unixLfBytes = Buffer.from(textContent, "utf8");

  // Git blob hash check: git hash-object sha-mvp/src/lib/AlgorithmSimulation.original-agi-v2.1.js
  const header = `blob ${unixLfBytes.length}\0`;
  const gitBlobHash = crypto.createHash("sha1").update(header).update(unixLfBytes).digest("hex");
  assert.equal(
    gitBlobHash,
    "61537188d9727e9b01ef4a2c0fadc1c633abaa10",
    "Git blob SHA-1 must match canonical 61537188d9727e9b01ef4a2c0fadc1c633abaa10"
  );

  const unixLfSha256 = crypto.createHash("sha256").update(unixLfBytes).digest("hex").toUpperCase();
  assert.equal(
    unixLfSha256,
    "8D6FB8E4FABF10432D7094CC35E9C8BB509AF51F6D8B4C6427CF147057A683EC",
    "Canonical Unix LF SHA-256 must match 8D6FB8E4FABF10432D7094CC35E9C8BB509AF51F6D8B4C6427CF147057A683EC"
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. DATA ACCESS REGISTER & DATA PROTECTION CITATIONS
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 6.2 — Legal & Governance: Data Access Register & Request Pack use accurate DPA 2019 citations", () => {
  // Check Data Access Register
  const kihbsEntry = DATA_ACCESS_REGISTER.find(r => r.resourceId === "KNBS-KIHBS-MICRODATA");
  assert.ok(kihbsEntry, "KNBS-KIHBS-MICRODATA must exist in DATA_ACCESS_REGISTER");

  const mtiEntry = DATA_ACCESS_REGISTER.find(r => r.resourceId === "SHA-DOC-MTI-TECH-SPEC");
  assert.ok(mtiEntry, "SHA-DOC-MTI-TECH-SPEC must exist in DATA_ACCESS_REGISTER");
  assert.ok(mtiEntry.notesAndNextAction.includes("Sections 30 and 53"));

  // Check SHA Request Pack
  const requestPack = buildShaRequestPackJson();
  assert.ok(requestPack.statutoryBasis.some(b => b.includes("Sections 25, 30(1)(b)(viii), 30(1)(e), 35, 53")));
  assert.ok(requestPack.statutoryBasis.some(b => b.includes("Regulation 22")));
  assert.ok(requestPack.statutoryBasis.some(b => b.includes("Regulations 18, 19, and 21(6)")));
  assert.ok(requestPack.statutoryBasis.some(b => b.includes("Fifth Schedule 'Means Testing'")));
});
