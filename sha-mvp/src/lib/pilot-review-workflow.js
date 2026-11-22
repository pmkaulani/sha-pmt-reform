/**
 * Pilot Human Review & Discrepancy Adjudication Workflow — Research Prototype.
 *
 * Implements Stage D assisted human review procedures, enabling designated review officers
 * and Community Health Promoters (CHPs) to inspect candidate assessment breakdowns,
 * evaluate evidence gaps, and record structured discrepancy findings.
 *
 * Strict Operational Invariants:
 * 1. ZERO AUTOMATIC LIVE CHANGES: Review outcomes never alter official SHA contribution
 *    records, bills, or statutory eligibility.
 * 2. NOT AN OFFICIAL APPEAL TRIBUNAL: Experimental review records are research artifacts,
 *    not legal substitutes for the formal SHA Dispute Tribunal.
 * 3. MANDATORY STRUCTURED REASONING: Reviewers must document specific factual observations
 *    and evidence examined before recording a recommendation.
 */

export const PILOT_REVIEW_OUTCOMES = Object.freeze({
  NO_DISCREPANCY: "NO_DISCREPANCY",
  REQUIRES_MORE_EVIDENCE: "REQUIRES_MORE_EVIDENCE",
  POTENTIAL_MODEL_ERROR: "POTENTIAL_MODEL_ERROR",
  POLICY_INTERPRETATION_REQUIRED: "POLICY_INTERPRETATION_REQUIRED",
  TECHNICAL_ESCALATION: "TECHNICAL_ESCALATION",
  REFERRED_TO_AUTHORISED_SHA_PROCESS: "REFERRED_TO_AUTHORISED_SHA_PROCESS"
});

export const REVIEWER_ROLES = Object.freeze({
  SUBCOUNTY_REVIEW_OFFICER: "SUBCOUNTY_REVIEW_OFFICER",
  COMMUNITY_HEALTH_PROMOTER: "COMMUNITY_HEALTH_PROMOTER",
  LEAD_ACTUARIAL_ANALYST: "LEAD_ACTUARIAL_ANALYST",
  INDEPENDENT_AUDITOR: "INDEPENDENT_AUDITOR"
});

/**
 * Creates an immutable human review case record.
 */
export function createPilotReviewCase({
  candidateAssessmentReference,
  modelVersion,
  reviewReason,
  evidenceExamined = [],
  differenceFromOfficialProcess = "",
  reviewerRole = REVIEWER_ROLES.SUBCOUNTY_REVIEW_OFFICER,
  reviewerId = "officer-anon-001",
  reviewerObservations = "",
  correctionRecommendation = "",
  escalationStatus = "NONE",
  independentSecondReviewStatus = "PENDING",
  finalReviewOutcome = PILOT_REVIEW_OUTCOMES.REQUIRES_MORE_EVIDENCE
} = {}) {
  const errors = [];
  if (!candidateAssessmentReference) errors.push("candidateAssessmentReference is required.");
  if (!modelVersion) errors.push("modelVersion is required.");
  if (!reviewReason) errors.push("reviewReason is required.");
  if (!reviewerObservations || String(reviewerObservations).trim().length < 10) {
    errors.push("reviewerObservations must provide detailed factual observations (min 10 chars).");
  }

  if (errors.length > 0) {
    throw new Error(`Cannot create pilot review case: ${errors.join("; ")}`);
  }

  return {
    reviewCaseId: `rev-case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    candidateAssessmentReference,
    modelVersion,
    reviewReason,
    evidenceExamined: Array.isArray(evidenceExamined) ? evidenceExamined : [evidenceExamined],
    differenceFromOfficialProcess,
    reviewer: {
      role: reviewerRole,
      id: reviewerId
    },
    reviewerObservations,
    correctionRecommendation,
    escalationStatus,
    independentSecondReviewStatus,
    finalReviewOutcome,
    isBindingOnOfficialRecord: false,
    disclaimer: "RESEARCH REVIEW ONLY: This evaluation does not alter official SHA contributions, billing statements, or statutory eligibility under the Social Health Insurance Act.",
    recordedAt: new Date().toISOString()
  };
}

/**
 * Adjudicates a pilot review case, assigning an approved outcome.
 */
export function adjudicatePilotReviewCase(existingCase, {
  outcome,
  justification,
  adjudicatorId,
  secondReviewConfirmed = false
} = {}) {
  if (!Object.values(PILOT_REVIEW_OUTCOMES).includes(outcome)) {
    throw new Error(`Invalid review outcome '${outcome}'. Must be one of: ${Object.values(PILOT_REVIEW_OUTCOMES).join(", ")}`);
  }

  if (!justification || String(justification).trim().length < 15) {
    throw new Error("Adjudication requires a substantive justification (min 15 chars).");
  }

  return {
    ...existingCase,
    finalReviewOutcome: outcome,
    adjudication: {
      justification,
      adjudicatorId: adjudicatorId || "supervisor-anon-01",
      adjudicatedAt: new Date().toISOString(),
      secondReviewConfirmed: Boolean(secondReviewConfirmed)
    },
    history: [
      ...(existingCase.history || []),
      {
        action: "ADJUDICATED",
        outcome,
        timestamp: new Date().toISOString()
      }
    ]
  };
}
