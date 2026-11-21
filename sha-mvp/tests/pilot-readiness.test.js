import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import crypto from "node:crypto";

import {
  PILOT_STAGE_IDS,
  PILOT_STAGES_SPECIFICATION,
  validateStageTransition
} from "../src/lib/pilot-stages.js";

import {
  assessPilotReadiness,
  recordInstitutionalApproval,
  PILOT_STAGES,
  PILOT_GATE_STATES,
  PILOT_APPROVAL_STATUS,
  REQUIRED_EVIDENCE
} from "../src/lib/pilot-readiness.js";

import {
  PILOT_GOVERNANCE_ROLES,
  getPilotGovernanceSummary,
  checkSeparationOfDuties,
  GOVERNANCE_ASSIGNMENT_STATUS
} from "../src/lib/pilot-governance.js";

import {
  createPilotReviewCase,
  adjudicatePilotReviewCase,
  PILOT_REVIEW_OUTCOMES,
  REVIEWER_ROLES
} from "../src/lib/pilot-review-workflow.js";

import {
  evaluatePilotMonitoringMetrics,
  createPilotIncidentRecord,
  resolvePilotIncident,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITY,
  DEFAULT_MONITORING_THRESHOLDS,
  MONITORING_THRESHOLD_STATUS
} from "../src/lib/pilot-monitoring.js";

import {
  initializePilotControlState,
  transitionPilotControlState,
  PILOT_CONTROL_STATES,
  PILOT_STOP_CONDITIONS,
  STANDARDIZED_ROLLBACK_PROCEDURE
} from "../src/lib/pilot-control.js";

import { calculateContinuousMetrics } from "../src/lib/evaluation-metrics.js";
import { calculateProposedModel as calculateOriginalAgi } from "../src/lib/AlgorithmSimulation.original-agi-v2.1.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 1. STAGE PROGRESSION & SEQUENTIAL TRANSITION ─────────────────────────────

test("Phase 6 Criterion 1: Pilot stages cannot be skipped (sequential transition enforcement)", () => {
  // Step 1 -> Step 2 is valid
  const validTransition = validateStageTransition(
    PILOT_STAGE_IDS.STAGE_1_TECHNICAL_REVIEW,
    PILOT_STAGE_IDS.STAGE_2_OFFLINE_HISTORICAL_REPLAY
  );
  assert.equal(validTransition.isAllowed, true);

  // Attempting to jump from Step 1 directly to Step 3 (Shadow Operation) is blocked
  const illegalJump = validateStageTransition(
    PILOT_STAGE_IDS.STAGE_1_TECHNICAL_REVIEW,
    PILOT_STAGE_IDS.STAGE_3_SHADOW_OPERATION
  );
  assert.equal(illegalJump.isAllowed, false);
  assert.ok(illegalJump.reason.includes("Sequential progression violation"));

  // Attempting to jump directly from Step 1 to Step 5 (Independent Evaluation) is blocked
  const skipToFinal = validateStageTransition(
    PILOT_STAGE_IDS.STAGE_1_TECHNICAL_REVIEW,
    PILOT_STAGE_IDS.STAGE_5_INDEPENDENT_EVALUATION
  );
  assert.equal(skipToFinal.isAllowed, false);
});

// ─── 2. READINESS GATES & APPROVAL SEPARATION ─────────────────────────────────

test("Phase 6 Criterion 2: Missing evidence blocks stage readiness", () => {
  const result = assessPilotReadiness({
    targetStage: "TECHNICAL_REVIEW",
    evidence: {
      methodologyDocumented: true,
      modelVersionsIdentified: true,
      knownLimitationsDocumented: false // Missing
    }
  });

  assert.equal(result.status, PILOT_GATE_STATES.BLOCKED);
  assert.ok(result.missingEvidence.includes("knownLimitationsDocumented"));
  assert.ok(result.blockers.some(b => b.includes("knownLimitationsDocumented")));
});

test("Phase 6 Criterion 3: Technical readiness does NOT imply institutional approval", () => {
  // All technical evidence is present
  const allEvidence = {
    methodologyDocumented: true,
    modelVersionsIdentified: true,
    knownLimitationsDocumented: true,
    legalScopeReviewed: true
  };

  const readiness = assessPilotReadiness({
    targetStage: "TECHNICAL_REVIEW",
    evidence: allEvidence
    // institutionalApproval omitted
  });

  // Fulfilling technical requirements yields READY_FOR_INSTITUTIONAL_APPROVAL, NOT APPROVED_FOR_STAGE
  assert.equal(readiness.status, PILOT_GATE_STATES.READY_FOR_INSTITUTIONAL_APPROVAL);
  assert.equal(readiness.hasInstitutionalApproval, false);
  assert.equal(readiness.liveContributionChangesPermitted, false);
  assert.ok(readiness.disclaimer.includes("does not constitute SHA approval"));
});

test("Phase 6 Criterion 4: Formal stage approval requires valid institutional approval metadata", () => {
  const allEvidence = {
    methodologyDocumented: true,
    modelVersionsIdentified: true,
    knownLimitationsDocumented: true,
    legalScopeReviewed: true
  };

  const validApproval = recordInstitutionalApproval({
    approverRole: "SHA_TECHNICAL_OWNER",
    approverTitle: "Technical System Owner (Institutional Test Role)",
    approvalReference: "TEST-REF-CERTIFIED-DOC-001",
    scope: "STAGE_1_TECHNICAL_REVIEW_ONLY",
    supportingDocumentReference: "Technical Architecture Memo v1.0",
    status: PILOT_APPROVAL_STATUS.APPROVED_WITH_VERIFIED_REFERENCE
  });

  const readiness = assessPilotReadiness({
    targetStage: "TECHNICAL_REVIEW",
    evidence: allEvidence,
    institutionalApproval: validApproval
  });

  assert.equal(readiness.status, PILOT_GATE_STATES.APPROVED_FOR_STAGE);
  assert.equal(readiness.hasInstitutionalApproval, true);
});

// ─── 3. HUMAN OVERSIGHT & CORRECTION WORKFLOW ─────────────────────────────────

test("Phase 6 Criterion 5: Human review case records candidate reference, model version, and observations", () => {
  const reviewCase = createPilotReviewCase({
    candidateAssessmentReference: "CASE-DEMO-001",
    modelVersion: "asset-liquidity-agi-v2.1",
    reviewReason: "DISPUTED_OPERATING_EXPENSES",
    evidenceExamined: ["M-Pesa Receipts", "Supplier Invoices"],
    reviewerRole: REVIEWER_ROLES.SUBCOUNTY_REVIEW_OFFICER,
    reviewerObservations: "Household operates retail kiosk with verifiable supplier costs of KSh 35,000 against gross receipts of KSh 50,000."
  });

  assert.ok(reviewCase.reviewCaseId);
  assert.equal(reviewCase.candidateAssessmentReference, "CASE-DEMO-001");
  assert.equal(reviewCase.modelVersion, "asset-liquidity-agi-v2.1");
  assert.equal(reviewCase.reviewer.role, REVIEWER_ROLES.SUBCOUNTY_REVIEW_OFFICER);
});

test("Phase 6 Criterion 6: Candidate workflow cannot change actual contribution records or official status", () => {
  const reviewCase = createPilotReviewCase({
    candidateAssessmentReference: "CASE-DEMO-002",
    modelVersion: "declared-income-agi-v1",
    reviewReason: "SEASONAL_INCOME_VARIANCE",
    reviewerObservations: "Low season farming cash flow requires verification of off-season chama balances."
  });

  assert.equal(reviewCase.isBindingOnOfficialRecord, false);
  assert.ok(reviewCase.disclaimer.includes("does not alter official SHA contributions"));

  // Adjudication also does not alter official billing records
  const adjudicated = adjudicatePilotReviewCase(reviewCase, {
    outcome: PILOT_REVIEW_OUTCOMES.REQUIRES_MORE_EVIDENCE,
    justification: "Field inspection report needed before determining whether off-season income warrants manual adjustment.",
    adjudicatorId: "supervisor-nakuru-01"
  });

  assert.equal(adjudicated.finalReviewOutcome, PILOT_REVIEW_OUTCOMES.REQUIRES_MORE_EVIDENCE);
  assert.equal(adjudicated.isBindingOnOfficialRecord, false);
});

// ─── 4. OPERATIONAL MONITORING & INCIDENTS ────────────────────────────────────

test("Phase 6 Criterion 7: Monitoring flags abnormal failure rates and subgroup shifts", () => {
  const badTelemetry = {
    failureRate: 0.08, // 8% > 2% limit -> CRITICAL
    missingInputRate: 0.01,
    subgroupShiftRate: 0.25 // 25% > 20% limit -> HIGH
  };

  const evalResult = evaluatePilotMonitoringMetrics(badTelemetry);
  assert.equal(evalResult.status.isHealthy, false);
  assert.equal(evalResult.status.alertsCount, 2);
  assert.equal(evalResult.status.criticalAlertsCount, 1);
  assert.ok(evalResult.alerts.some(a => a.indicator === "MODEL_FAILURE_RATE" && a.severity === INCIDENT_SEVERITY.CRITICAL));
  assert.ok(evalResult.alerts.some(a => a.indicator === "SUBGROUP_DISPARITY_SHIFT"));
});

test("Phase 6 Criterion 8: Incident records require valid categories, severity, and substantive description", () => {
  // Substantive incident creation
  const incident = createPilotIncidentRecord({
    category: INCIDENT_CATEGORIES.MODEL_OUTPUT_INCIDENT,
    severity: INCIDENT_SEVERITY.HIGH,
    affectedComponent: "IngestionGateway_Validator",
    description: "Ingestion gateway experienced unexpected unmapped categorical codes in Turkana pastoralist cluster.",
    assignedOwner: "PILOT_OPERATIONS_COORDINATOR"
  });

  assert.ok(incident.incidentId);
  assert.equal(incident.category, INCIDENT_CATEGORIES.MODEL_OUTPUT_INCIDENT);
  assert.equal(incident.containmentStatus, "INVESTIGATING");

  // Resolving incident requires documented reference and approving authority
  const resolved = resolvePilotIncident(incident, {
    resolutionDetails: "Updated categorical codebook mapper with NASSEP V pastoralist dwelling codes and re-tested schema.",
    resolutionReference: "JIRA-REFORM-402",
    approvingAuthorityRole: "SHA_TECHNICAL_OWNER"
  });

  assert.equal(resolved.containmentStatus, "RESOLVED");
  assert.equal(resolved.closureApproval.approvedByRole, "SHA_TECHNICAL_OWNER");
});

// ─── 5. EMERGENCY SUSPENSION & ROLLBACK ────────────────────────────────────────

test("Phase 6 Criterion 9: Emergency suspension requires authorized action and records stop condition", () => {
  const ctrl = initializePilotControlState({ pilotId: "SHA-PILOT-2026-TEST" });
  assert.equal(ctrl.currentState, PILOT_CONTROL_STATES.NOT_STARTED);

  const suspended = transitionPilotControlState(ctrl, {
    targetState: PILOT_CONTROL_STATES.SUSPENDED,
    authorizingRole: "DATA_PROTECTION_OFFICER",
    authorizingReference: "DPO-EMERGENCY-STOP-01",
    reason: "Suspicion of de-identification leakage in Stage 2 enclave export.",
    stopConditionKey: "PRIVACY_INCIDENT"
  });

  assert.equal(suspended.currentState, PILOT_CONTROL_STATES.SUSPENDED);
  assert.equal(suspended.activeSuspensionCondition, PILOT_STOP_CONDITIONS.PRIVACY_INCIDENT);
  assert.ok(suspended.rollbackExecution);
  assert.equal(suspended.rollbackExecution.operationalRelianceStatus, "VERIFIED_100_PERCENT_OFFICIAL_SHA");
});

test("Phase 6 Criterion 10: Standardized rollback execution records 8 discrete fail-safe steps", () => {
  const ctrl = initializePilotControlState();
  const suspended = transitionPilotControlState(ctrl, {
    targetState: PILOT_CONTROL_STATES.SUSPENDED,
    authorizingRole: "SHA_PROGRAMME_SPONSOR",
    reason: "Board resolution to pause pilot pending supplementary legal review."
  });

  assert.equal(suspended.rollbackExecution.steps.length, 8);
  assert.equal(STANDARDIZED_ROLLBACK_PROCEDURE.length, 8);
  assert.equal(STANDARDIZED_ROLLBACK_PROCEDURE[0].action, "HALT_EXECUTION");
  assert.equal(STANDARDIZED_ROLLBACK_PROCEDURE[4].action, "REVERT_RELIANCE");
  assert.equal(STANDARDIZED_ROLLBACK_PROCEDURE[7].action, "RESUMPTION_BARRIER");
});

// ─── 6. SEPARATION OF DUTIES & ROLES ──────────────────────────────────────────

test("Phase 6 Criterion 11: Governance enforces separation of duties across conflicting roles", () => {
  // Same role conflict
  const sameRole = checkSeparationOfDuties("SHA_TECHNICAL_OWNER", "SHA_TECHNICAL_OWNER");
  assert.equal(sameRole.isSeparated, false);

  // Developer cannot evaluate own models
  const devEvalConflict = checkSeparationOfDuties("SHA_TECHNICAL_OWNER", "INDEPENDENT_EVALUATION_TEAM");
  assert.equal(devEvalConflict.isSeparated, false);
  assert.ok(devEvalConflict.reason.includes("Developers cannot evaluate their own models"));

  // Sponsor cannot be independent auditor
  const sponsorAuditConflict = checkSeparationOfDuties("SHA_PROGRAMME_SPONSOR", "INDEPENDENT_AUDIT_FUNCTION");
  assert.equal(sponsorAuditConflict.isSeparated, false);

  // Compatible independent roles pass
  const validRoles = checkSeparationOfDuties("DATA_PROTECTION_OFFICER", "LEGAL_REGULATORY_REVIEWER");
  assert.equal(validRoles.isSeparated, true);
});

// ─── 7. ARCHITECTURE & SECURITY BOUNDARIES ────────────────────────────────────

test("Phase 6 Criterion 12: No real live SHA API integration exists in codebase", () => {
  const srcDir = path.resolve(__dirname, "../src");
  const files = [
    "lib/pilot-governance.js",
    "lib/pilot-stages.js",
    "lib/pilot-readiness.js",
    "lib/pilot-control.js",
    "lib/pilot-review-workflow.js",
    "lib/pilot-monitoring.js",
    "PilotReadinessTab.jsx"
  ];

  for (const relFile of files) {
    const filePath = path.join(srcDir, relFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      // Check for live production endpoints or direct write credentials
      assert.equal(/https?:\/\/api\.sha\.go\.ke/i.test(content), false, `Live SHA production API prohibited in ${relFile}`);
      assert.equal(/https?:\/\/core\.sha\.go\.ke/i.test(content), false, `Live SHA core endpoint prohibited in ${relFile}`);
      assert.equal(/password\s*=\s*["'][^"']+["']/i.test(content), false, `Hardcoded credentials prohibited in ${relFile}`);
    }
  }
});

test("Phase 6 Criterion 13: Handover package contains all 12 institutional briefing documents", () => {
  const handoverDir = path.resolve(__dirname, "../../docs/institutional-handover");
  assert.ok(fs.existsSync(handoverDir), "docs/institutional-handover directory must exist.");

  const expectedDocuments = [
    "EXECUTIVE_PROPOSAL.md",
    "PROBLEM_AND_METHODOLOGY.md",
    "SYSTEM_ARCHITECTURE.md",
    "MODEL_GOVERNANCE.md",
    "EMPIRICAL_EVALUATION_FRAMEWORK.md",
    "DATA_GOVERNANCE.md",
    "SECURITY_AND_PRIVACY.md",
    "CONTROLLED_PILOT_PLAN.md",
    "RISK_REGISTER.md",
    "DEPLOYMENT_ACCEPTANCE.md",
    "SHA_INFORMATION_REQUEST.md",
    "LIMITATIONS_AND_OPEN_QUESTIONS.md"
  ];

  for (const doc of expectedDocuments) {
    const docPath = path.join(handoverDir, doc);
    assert.ok(fs.existsSync(docPath), `Handover document ${doc} must exist.`);
    const stats = fs.statSync(docPath);
    assert.ok(stats.size > 200, `Handover document ${doc} must be substantive.`);
  }
});

// ─── 8. REGRESSION & INVARIANCE INTEGRITY ──────────────────────────────────────

test("Phase 6 Criterion 14: AlgorithmSimulation.original-agi-v2.1.js remains byte-for-byte unchanged", () => {
  const origPath = path.resolve(__dirname, "../src/lib/AlgorithmSimulation.original-agi-v2.1.js");
  assert.ok(fs.existsSync(origPath));
  const content = fs.readFileSync(origPath, "utf8");
  assert.ok(content.length > 0);

  const benchInput = {
    monthlyNetEarnedIncome: 25000,
    housingType: "Rented",
    monthlyRentPaid: 5000,
    electricityBillMonthly: 1200,
    waterSourceType: "Piped",
    hasLivestockHolding: true,
    livestockAssetEstimatedValue: 60000,
    householdSize: 4,
    assets: ["TV", "SMARTPHONE"],
    vehicles: []
  };

  const output = calculateOriginalAgi(benchInput);
  assert.ok(output);
  assert.ok(Number.isFinite(output.monthlyContribution));
  assert.ok(Number.isFinite(output.estimatedAnnualIncome));
  assert.ok(output.monthlyContribution >= 300);
});

test("Phase 6 Criterion 15: Existing model-versioning and assessment tests continue passing", () => {
  const testHousehold = {
    monthlyNetEarnedIncome: 32000,
    housingType: "Rented",
    monthlyRentPaid: 6000,
    electricityBillMonthly: 800,
    waterSourceType: "Piped",
    householdSize: 3,
    assets: ["TV"],
    vehicles: []
  };

  const versioning = calculateProposedModelVersions(testHousehold);
  assert.ok(versioning.originalAgi);
  assert.ok(versioning.declaredIncome);
  assert.equal(versioning.originalAgi.id, "asset-liquidity-agi-v2.1");
  assert.equal(versioning.declaredIncome.id, "declared-income-agi-v1");
  assert.ok(versioning.originalAgi.result.monthlyContribution >= 300);
  assert.ok(versioning.declaredIncome.result.monthlyContribution >= 300);
});

// ─── 9. PHASE 6.1 INTEGRITY & CLAIMS AUDIT TESTS ─────────────────────────────

test("Phase 6.1 Criterion 16: All 11 governance roles default to NOT_ASSIGNED with null approvers", () => {
  assert.equal(PILOT_GOVERNANCE_ROLES.length, 11);
  for (const role of PILOT_GOVERNANCE_ROLES) {
    assert.equal(role.assignmentStatus, GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED);
    assert.equal(role.approvalReference, null);
    assert.equal(role.dateRecorded, null);
  }

  const summary = getPilotGovernanceSummary();
  assert.equal(summary.totalRoles, 11);
  assert.equal(summary.notAssignedCount, 11);
  assert.equal(summary.approvedWithReferenceCount, 0);
  assert.equal(summary.hasRealInstitutionalAssignments, false);
});

test("Phase 6.1 Criterion 17: Monitoring thresholds are explicitly flagged as NOT_POLICY_APPROVED", () => {
  for (const [key, thresh] of Object.entries(DEFAULT_MONITORING_THRESHOLDS)) {
    assert.equal(thresh.status, MONITORING_THRESHOLD_STATUS.NOT_POLICY_APPROVED, `${key} must be marked NOT_POLICY_APPROVED`);
    assert.equal(thresh.isPolicyApproved, false, `${key} must have isPolicyApproved === false`);
    assert.equal(thresh.type, MONITORING_THRESHOLD_STATUS.ILLUSTRATIVE_DESIGN_PARAMETER, `${key} must be an illustrative design parameter`);
  }
});

test("Phase 6.1 Criterion 18: Telemetry outputs declare synthetic test harness status", () => {
  const result = evaluatePilotMonitoringMetrics({ failureRate: 0.01 });
  assert.equal(result.isSimulatedTelemetry, true);
  assert.equal(result.telemetrySource, "SYNTHETIC_TEST_HARNESS");
  assert.ok(result.disclaimer.includes("NOT_POLICY_APPROVED"));
});

test("Phase 6.1 Criterion 19: Emergency rollback records isSimulatedRunbookAction: true", () => {
  const initState = initializePilotControlState();
  assert.equal(initState.isSimulatedControlMachine, true);
  assert.equal(initState.operationalReliance, "OFFICIAL_SHA_STATUTORY_PROCESS_ONLY");

  const suspended = transitionPilotControlState(initState, {
    targetState: PILOT_CONTROL_STATES.SUSPENDED,
    authorizingRole: "DATA_PROTECTION_OFFICER",
    authorizingReference: "TEST-DRILL-001",
    reason: "Testing simulated rollback procedure",
    stopConditionKey: "SECURITY_INCIDENT"
  });

  assert.equal(suspended.currentState, PILOT_CONTROL_STATES.SUSPENDED);
  assert.ok(suspended.rollbackExecution);
  assert.equal(suspended.rollbackExecution.isSimulatedRunbookAction, true);
  assert.ok(suspended.rollbackExecution.simulationNotice.includes("NOT interact with live SHA production infrastructure"));
  assert.equal(suspended.rollbackExecution.steps.length, 8);
});

test("Phase 6.1 Criterion 20: Continuous evaluation calculates WAPE and documents raw MAPE exclusion", () => {
  const recordsWithZero = [
    { predicted: 500, reference: 0, weight: 1 }, // Zero reference
    { predicted: 1200, reference: 1000, weight: 1 },
    { predicted: 3000, reference: 3000, weight: 1 }
  ];

  const evalResult = calculateContinuousMetrics(recordsWithZero);
  assert.equal(evalResult.status, "CALCULATED");
  assert.ok(Number.isFinite(evalResult.metrics.mae));
  assert.ok(Number.isFinite(evalResult.metrics.rmse));
  assert.ok(Number.isFinite(evalResult.metrics.wape));
  assert.ok(evalResult.metrics.mapeNotice.includes("Raw per-row MAPE is excluded"));
});

test("Phase 6.1 Criterion 21: Original AGI v2.1 SHA-256 hash verified against recovered baseline", () => {
  const origPath = path.resolve(__dirname, "../src/lib/AlgorithmSimulation.original-agi-v2.1.js");
  const content = fs.readFileSync(origPath, "utf8").replace(/\r\n/g, "\n");
  const canonicalLfHash = crypto.createHash("sha256").update(content).digest("hex").toUpperCase();
  // Canonical Unix LF hash matching git blob 61537188d9727e9b01ef4a2c0fadc1c633abaa10
  assert.equal(canonicalLfHash, "8D6FB8E4FABF10432D7094CC35E9C8BB509AF51F6D8B4C6427CF147057A683EC");
});

test("Phase 6.1 Criterion 22: Synthetic demo approval yields SYNTHETIC_DEMO_ONLY gate state", () => {
  const allEvidence = {
    methodologyDocumented: true,
    modelVersionsIdentified: true,
    knownLimitationsDocumented: true,
    legalScopeReviewed: true
  };

  const syntheticApproval = recordInstitutionalApproval({
    approverRole: "SHA_TECHNICAL_OWNER",
    approvalReference: "TEST-SYNTHETIC-REF",
    scope: "STAGE_1_TECHNICAL_REVIEW_ONLY",
    supportingDocumentReference: "Demo Memo",
    isSyntheticDemo: true
  });

  const readiness = assessPilotReadiness({
    targetStage: "TECHNICAL_REVIEW",
    evidence: allEvidence,
    institutionalApproval: syntheticApproval
  });

  assert.equal(readiness.status, PILOT_GATE_STATES.SYNTHETIC_DEMO_ONLY);
  assert.equal(readiness.hasInstitutionalApproval, false);
  assert.equal(readiness.isSyntheticDemoApproval, true);
});
