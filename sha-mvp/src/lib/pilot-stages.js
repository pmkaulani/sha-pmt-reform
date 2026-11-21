/**
 * Staged Pilot Progression Model — Sequential Pilot Governance.
 *
 * Defines the 5 sequential stages of a controlled, non-disruptive implementation
 * pilot for the Social Health Authority (SHA).
 *
 * Methodological Invariants:
 * 1. STRICT SEQUENTIAL PROGRESSION: Stages cannot be skipped or executed out of order.
 * 2. TECHNICAL READINESS != INSTITUTIONAL APPROVAL: Passing automated checks does NOT
 *    constitute permission to advance; explicit statutory sign-offs are required.
 * 3. ZERO LIVE EFFECT IN EARLY STAGES: Shadow operations run completely silently alongside
 *    official systems with zero member-facing billing or eligibility impacts.
 * 4. FORMAL EXIT & SUSPENSION GATES: Every stage defines verifiable exit criteria and
 *    automatic emergency suspension triggers.
 */

export const PILOT_STAGE_IDS = Object.freeze({
  STAGE_1_TECHNICAL_REVIEW: "STAGE_1_TECHNICAL_REVIEW",
  STAGE_2_OFFLINE_HISTORICAL_REPLAY: "STAGE_2_OFFLINE_HISTORICAL_REPLAY",
  STAGE_3_SHADOW_OPERATION: "STAGE_3_SHADOW_OPERATION",
  STAGE_4_ASSISTED_HUMAN_REVIEW: "STAGE_4_ASSISTED_HUMAN_REVIEW",
  STAGE_5_INDEPENDENT_EVALUATION: "STAGE_5_INDEPENDENT_EVALUATION"
});

export const PILOT_STAGES_SPECIFICATION = Object.freeze([
  {
    stageId: PILOT_STAGE_IDS.STAGE_1_TECHNICAL_REVIEW,
    stageNumber: 1,
    title: "Stage 1 — Technical Review & Methodology Audit",
    purpose: "Enable SHA technical teams, legal counsel, and policy analysts to thoroughly inspect candidate formulas, model assumptions, code provenance, and regulatory compliance.",
    preconditions: [
      "Candidate models frozen and version-tagged in repository.",
      "Variable dictionaries and assessment flows documented.",
      "Technical architecture documentation completed."
    ],
    requiredApprovals: [
      "SHA_TECHNICAL_OWNER",
      "LEGAL_REGULATORY_REVIEWER",
      "DATA_PROTECTION_OFFICER"
    ],
    requiredEvidence: [
      "Methodology Whitepaper",
      "Code Repository Audit Report",
      "Preliminary Legal Compatibility Memorandum",
      "Initial Data Protection Impact Assessment (DPIA)"
    ],
    permittedActivities: [
      "Formula and parameter inspection in sandbox environments.",
      "Review of synthetic demonstration fixtures.",
      "Legal and policy gap analysis against Regulation 21.",
      "Specification of required SHA information requests."
    ],
    prohibitedActivities: [
      "Processing of real member records.",
      "Connecting to live SHA network infrastructure.",
      "Making any household assessment determinations."
    ],
    exitCriteria: [
      "Technical Owner signs off on code integrity and architecture.",
      "Legal Counsel certifies lawful research scope under Kenya DPA Sec 3.",
      "DPO approves preliminary DPIA."
    ],
    suspensionConditions: [
      "Identification of critical architectural security vulnerabilities.",
      "Legal determination that technical review exceeds research boundaries."
    ]
  },
  {
    stageId: PILOT_STAGE_IDS.STAGE_2_OFFLINE_HISTORICAL_REPLAY,
    stageNumber: 2,
    title: "Stage 2 — Offline Historical Replay in Secure Enclave",
    purpose: "Evaluate candidate models on approved, de-identified historical assessment records within a certified air-gapped research enclave without live network access.",
    preconditions: [
      "Stage 1 formal exit sign-off completed.",
      "Statutory Data Transfer Agreement (DTA) executed.",
      "Secure air-gapped environment certified by Cybersecurity team.",
      "Pre-registered evaluation protocol registered and frozen."
    ],
    requiredApprovals: [
      "DATA_CONTROLLER",
      "SECURITY_INFRASTRUCTURE_TEAM",
      "INDEPENDENT_EVALUATION_TEAM"
    ],
    requiredEvidence: [
      "Executed Data Transfer Agreement (DTA)",
      "Secure Enclave Certification Certificate",
      "De-identification Verification Certificate",
      "Pre-Registered Evaluation Protocol"
    ],
    permittedActivities: [
      "Batch execution of historical cases in isolated environment.",
      "Paired error calculation against verified historical baselines.",
      "Subgroup accuracy and distribution profiling.",
      "Decoupled contribution affordability analysis."
    ],
    prohibitedActivities: [
      "Internet egress or transmission of microdata outside enclave.",
      "Updating or modifying historical member assessment snapshots.",
      "Issuing member communications, bills, or re-assessments."
    ],
    exitCriteria: [
      "Historical replay completed with failure rate below 1%.",
      "Independent evaluation report completed on held-out partitions.",
      "Zero leakage verified across household groups."
    ],
    suspensionConditions: [
      "Data privacy or security breach within the enclave.",
      "Unexpected candidate model crash rate exceeding 5% of cases.",
      "Failure to verify independent ground-truth outcomes."
    ]
  },
  {
    stageId: PILOT_STAGE_IDS.STAGE_3_SHADOW_OPERATION,
    stageNumber: 3,
    title: "Stage 3 — Non-Interventional Shadow Operation",
    purpose: "Run candidate models asynchronously in parallel with official SHA registration systems, capturing incoming live requests to test scalability and distribution stability without affecting decisions.",
    preconditions: [
      "Stage 2 formal exit sign-off completed.",
      "SHA Executive Programme Sponsor formal pilot charter approved.",
      "Real-time monitoring infrastructure configured.",
      "Full DPIA certified under Kenya DPA Sec 31."
    ],
    requiredApprovals: [
      "SHA_PROGRAMME_SPONSOR",
      "SHA_TECHNICAL_OWNER",
      "DATA_PROTECTION_OFFICER"
    ],
    requiredEvidence: [
      "Executive Board Pilot Authorization Resolution",
      "Certified Final DPIA and ODPC Notification",
      "Shadow Pipeline Automated Rollback Test Report",
      "Real-Time Monitoring Plan & Disparity Alert Thresholds"
    ],
    permittedActivities: [
      "Asynchronous ingestion of read-only registration inputs.",
      "Parallel computation of candidate assessment scores.",
      "Real-time logging of score distributions and variance.",
      "Tracking system throughput and latency."
    ],
    prohibitedActivities: [
      "STRICT: No modification of official SHA member contribution figures.",
      "STRICT: No generation of member bills, invoices, or payment requests.",
      "STRICT: No member-facing UI exposure of candidate scores.",
      "STRICT: No automatic changes to member coverage or subsidy status.",
      "STRICT: No write-access to primary SHA production databases."
    ],
    exitCriteria: [
      "Continuous shadow operation for minimum 30 calendar days.",
      "Zero operational interference with primary SHA transactions.",
      "Distributional stability confirmed across 47 counties."
    ],
    suspensionConditions: [
      "Any performance impact or latency increase on live SHA systems.",
      "Detection of unauthorized write-attempts to production databases.",
      "Severe unexplained divergence (>25%) in subgroup assessment distributions."
    ]
  },
  {
    stageId: PILOT_STAGE_IDS.STAGE_4_ASSISTED_HUMAN_REVIEW,
    stageNumber: 4,
    title: "Stage 4 — Assisted Human Review & Discrepancy Adjudication",
    purpose: "Provide designated SHA review officers and Community Health Promoters (CHPs) with candidate model insights during member-initiated reviews, testing human oversight and correction pathways.",
    preconditions: [
      "Stage 3 formal exit sign-off completed.",
      "Human review operating manual approved by Policy Owner.",
      "Reviewer access controls and conflict-of-interest charters signed.",
      "Staff training completed for participating sub-county review officers."
    ],
    requiredApprovals: [
      "SHA_POLICY_OWNER",
      "PILOT_OPERATIONS_COORDINATOR",
      "INDEPENDENT_AUDIT_FUNCTION"
    ],
    requiredEvidence: [
      "Human Review Standard Operating Procedure (SOP)",
      "Reviewer Training and Certification Log",
      "Discrepancy Escalation Protocol",
      "Conflict of Interest Register"
    ],
    permittedActivities: [
      "Designated officers view candidate breakdown alongside official score.",
      "Officers record structured reasons for discrepancies.",
      "Testing of informal-sector expense verification ledgers.",
      "Recording qualitative feedback on assessment accuracy."
    ],
    prohibitedActivities: [
      "Candidate scores cannot automatically override official determinations.",
      "Reviewers cannot modify underlying model formulas.",
      "Presenting experimental review interfaces as statutory SHA appeal tribunals."
    ],
    exitCriteria: [
      "Minimum 500 review cases processed across diverse counties.",
      "Human correction agreement rate documented and reviewed.",
      "Zero due-process or administrative-action complaints."
    ],
    suspensionConditions: [
      "Reviewer confusion leading to incorrect official billing advice.",
      "Failure of human reviewers to document reasoning in over 10% of cases.",
      "Identification of systematic procedural bias in review outcomes."
    ]
  },
  {
    stageId: PILOT_STAGE_IDS.STAGE_5_INDEPENDENT_EVALUATION,
    stageNumber: 5,
    title: "Stage 5 — Independent Evaluation & Final Decision Gate",
    purpose: "Commission a comprehensive independent audit and evaluation of the entire pilot, delivering rigorous empirical evidence to SHA Executive Leadership and the Cabinet Secretary for Health.",
    preconditions: [
      "Stage 4 formal exit sign-off completed.",
      "All operational logs, review records, and performance metrics frozen.",
      "Independent Evaluation Team given full access to audit trails."
    ],
    requiredApprovals: [
      "INDEPENDENT_EVALUATION_TEAM",
      "INDEPENDENT_AUDIT_FUNCTION",
      "SHA_PROGRAMME_SPONSOR"
    ],
    requiredEvidence: [
      "Comprehensive Independent Evaluation Report",
      "Independent Cybersecurity and Privacy Audit",
      "Statutory Impact & Universal Health Coverage (UHC) Assessment",
      "Final Policy Proposal & Draft Regulatory Amendments"
    ],
    permittedActivities: [
      "Independent statistical analysis of pilot outcomes.",
      "Actuarial modeling of long-term SHIF fund solvency under reform.",
      "Formulation of recommendations to SHA Board and Parliament."
    ],
    prohibitedActivities: [
      "Live operational deployment prior to formal Cabinet / Parliamentary approval.",
      "Post-hoc alteration of pilot evaluation datasets."
    ],
    exitCriteria: [
      "Delivery of Independent Evaluation Report to SHA Board.",
      "Formal decision by SHA Board: Adopt, Modify, Continue Pilot, or Terminate."
    ],
    suspensionConditions: [
      "Compromise of evaluation independence or data integrity.",
      "Discovery of unrecorded protocol violations during pilot execution."
    ]
  }
]);

/**
 * Validates whether a proposed stage transition is permitted sequentially.
 */
export function validateStageTransition(currentStageId, targetStageId) {
  const stageOrder = [
    PILOT_STAGE_IDS.STAGE_1_TECHNICAL_REVIEW,
    PILOT_STAGE_IDS.STAGE_2_OFFLINE_HISTORICAL_REPLAY,
    PILOT_STAGE_IDS.STAGE_3_SHADOW_OPERATION,
    PILOT_STAGE_IDS.STAGE_4_ASSISTED_HUMAN_REVIEW,
    PILOT_STAGE_IDS.STAGE_5_INDEPENDENT_EVALUATION
  ];

  const currIdx = stageOrder.indexOf(currentStageId);
  const tgtIdx = stageOrder.indexOf(targetStageId);

  if (currIdx === -1) {
    return { isAllowed: false, reason: `Unknown current stage '${currentStageId}'.` };
  }
  if (tgtIdx === -1) {
    return { isAllowed: false, reason: `Unknown target stage '${targetStageId}'.` };
  }

  if (tgtIdx !== currIdx + 1) {
    return {
      isAllowed: false,
      reason: `Sequential progression violation: Cannot transition from Stage ${currIdx + 1} to Stage ${tgtIdx + 1}. Stages must be completed strictly in sequence.`
    };
  }

  return { isAllowed: true, reason: "Stage sequence valid." };
}
