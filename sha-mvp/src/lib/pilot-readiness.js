/**
 * Pilot Readiness Gate & Evidence Validator — Research Prototype.
 *
 * Enforces verifiable technical, legal, and operational evidence standards
 * before any pilot stage can be presented for institutional approval.
 *
 * Core Governance Invariants:
 * 1. TECHNICAL READINESS != INSTITUTIONAL APPROVAL: Fulfilling technical requirements
 *    makes a stage READY_FOR_INSTITUTIONAL_APPROVAL, NOT automatically approved.
 * 2. EXPLICIT RECORDED SIGN-OFF: Progression to APPROVED_FOR_STAGE requires documented,
 *    traceable external approval metadata from authorized statutory roles.
 * 3. NO AUTOMATIC LIVE DECISIONS: All gates strictly prohibit automatic citizen billing,
 *    live database modification, or unilateral eligibility determinations.
 */

export const PILOT_STAGES = Object.freeze([
  "TECHNICAL_REVIEW",
  "OFFLINE_REPLAY",
  "SHADOW_OPERATION",
  "ASSISTED_HUMAN_REVIEW",
  "INDEPENDENT_EVALUATION"
]);

export const PILOT_APPROVAL_STATUS = Object.freeze({
  NOT_ASSIGNED: "NOT_ASSIGNED",
  NOT_REQUESTED: "NOT_REQUESTED",
  PENDING: "PENDING",
  SYNTHETIC_DEMO_ONLY: "SYNTHETIC_DEMO_ONLY",
  APPROVED_WITH_VERIFIED_REFERENCE: "APPROVED_WITH_VERIFIED_REFERENCE"
});

export const PILOT_GATE_STATES = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  BLOCKED: "BLOCKED",
  READY_FOR_INSTITUTIONAL_APPROVAL: "READY_FOR_INSTITUTIONAL_APPROVAL",
  SYNTHETIC_DEMO_ONLY: "SYNTHETIC_DEMO_ONLY",
  APPROVED_FOR_STAGE: "APPROVED_FOR_STAGE",
  SUSPENDED: "SUSPENDED",
  COMPLETED: "COMPLETED",
  TERMINATED: "TERMINATED"
});

export const REQUIRED_EVIDENCE = Object.freeze({
  TECHNICAL_REVIEW: [
    "methodologyDocumented",
    "modelVersionsIdentified",
    "knownLimitationsDocumented",
    "legalScopeReviewed"
  ],

  OFFLINE_REPLAY: [
    "evaluationProtocolApproved",
    "datasetUseAuthorised",
    "dataGovernanceApproved",
    "secureEnvironmentApproved",
    "evaluationBaselineVerified",
    "rollbackProcedureDocumented"
  ],

  SHADOW_OPERATION: [
    "institutionalPilotApproval",
    "dataSharingAgreementApproved",
    "securityAssessmentPassed",
    "privacyImpactReviewCompleted",
    "incidentResponseApproved",
    "monitoringPlanApproved",
    "rollbackTestPassed",
    "staffTrainingCompleted"
  ],

  ASSISTED_HUMAN_REVIEW: [
    "shadowEvaluationReviewed",
    "humanReviewProcedureApproved",
    "reviewerAccessApproved",
    "correctionProcedureApproved",
    "independentOversightApproved"
  ],

  INDEPENDENT_EVALUATION: [
    "independentEvaluatorAppointed",
    "allOperationalLogsFrozen",
    "peerReviewProtocolExecuted",
    "longTermSolvencyModeled",
    "boardHandoverPackApproved"
  ]
});

/**
 * Assesses readiness for a target pilot stage based on documented evidence.
 *
 * Aligned with user prompt starter specification:
 * - Returns BLOCKED if evidence is missing or blockers are present.
 * - Returns READY_FOR_INSTITUTIONAL_APPROVAL when all technical evidence is recorded.
 * - Requires explicit formal sign-off metadata to reach APPROVED_FOR_STAGE.
 */
export function assessPilotReadiness({
  targetStage,
  evidence = {},
  blockers = [],
  institutionalApproval = null
} = {}) {
  // Normalize stage string if passed with prefix (e.g. STAGE_1_TECHNICAL_REVIEW -> TECHNICAL_REVIEW)
  const normStage = String(targetStage).replace(/^STAGE_\d+_/, "");

  if (!PILOT_STAGES.includes(normStage)) {
    throw new Error(`Unsupported pilot stage '${targetStage}'. Must be one of: ${PILOT_STAGES.join(", ")}`);
  }

  const requiredList = REQUIRED_EVIDENCE[normStage] || [];
  const missingEvidence = requiredList.filter(field => evidence[field] !== true);

  const allBlockers = [
    ...blockers,
    ...missingEvidence.map(field => `Required evidence not approved: ${field}`)
  ];

  let status = PILOT_GATE_STATES.READY_FOR_INSTITUTIONAL_APPROVAL;

  if (allBlockers.length > 0) {
    status = PILOT_GATE_STATES.BLOCKED;
  } else if (institutionalApproval) {
    // Validate institutional approval metadata structure
    const isApprovalValid = Boolean(
      institutionalApproval.approverRole &&
      institutionalApproval.approvalReference &&
      institutionalApproval.approvalDate &&
      institutionalApproval.scope &&
      institutionalApproval.supportingDocumentReference
    );

    if (!isApprovalValid) {
      allBlockers.push("Institutional approval metadata is incomplete (missing approverRole, reference, or supporting doc).");
      status = PILOT_GATE_STATES.BLOCKED;
    } else if (
      institutionalApproval.isSyntheticDemo === true ||
      institutionalApproval.status === PILOT_APPROVAL_STATUS.SYNTHETIC_DEMO_ONLY
    ) {
      status = PILOT_GATE_STATES.SYNTHETIC_DEMO_ONLY;
    } else if (institutionalApproval.status === PILOT_APPROVAL_STATUS.APPROVED_WITH_VERIFIED_REFERENCE) {
      status = PILOT_GATE_STATES.APPROVED_FOR_STAGE;
    } else {
      status = PILOT_GATE_STATES.READY_FOR_INSTITUTIONAL_APPROVAL;
    }
  }

  return {
    requestedStage: normStage,
    status,
    missingEvidence,
    blockers: allBlockers,
    hasInstitutionalApproval: Boolean(
      institutionalApproval &&
      status === PILOT_GATE_STATES.APPROVED_FOR_STAGE &&
      institutionalApproval.status === PILOT_APPROVAL_STATUS.APPROVED_WITH_VERIFIED_REFERENCE
    ),
    isSyntheticDemoApproval: Boolean(
      institutionalApproval &&
      (status === PILOT_GATE_STATES.SYNTHETIC_DEMO_ONLY || institutionalApproval.isSyntheticDemo === true)
    ),
    automaticDecisionMakingPermitted: false,
    liveContributionChangesPermitted: false,
    disclaimer: "Technical readiness does not constitute SHA approval, legal authorisation, or deployment permission."
  };
}

/**
 * Creates an immutable institutional approval sign-off record.
 */
export function recordInstitutionalApproval({
  approverRole,
  approverTitle,
  approvalReference,
  approvalDate = new Date().toISOString().split("T")[0],
  scope,
  reviewDate,
  supportingDocumentReference,
  conditions = [],
  status = PILOT_APPROVAL_STATUS.APPROVED_WITH_VERIFIED_REFERENCE,
  isSyntheticDemo = false
} = {}) {
  const errors = [];
  if (!approverRole) errors.push("approverRole is required.");
  if (!approvalReference) errors.push("approvalReference is required.");
  if (!scope) errors.push("scope is required.");
  if (!supportingDocumentReference) errors.push("supportingDocumentReference is required.");

  if (errors.length > 0) {
    throw new Error(`Invalid institutional approval record: ${errors.join("; ")}`);
  }

  const effectiveStatus = isSyntheticDemo 
    ? PILOT_APPROVAL_STATUS.SYNTHETIC_DEMO_ONLY 
    : status;

  return {
    approvalId: `appr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: effectiveStatus,
    isSyntheticDemo: Boolean(isSyntheticDemo),
    approverRole,
    approverTitle: approverTitle || approverRole,
    approvalReference,
    approvalDate,
    scope,
    reviewDate: reviewDate || null,
    supportingDocumentReference,
    conditions: Array.isArray(conditions) ? conditions : [conditions],
    recordedAt: new Date().toISOString()
  };
}
