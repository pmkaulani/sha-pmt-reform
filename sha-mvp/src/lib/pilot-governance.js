/**
 * Pilot Governance Framework — Institutional Roles & Separation of Duties.
 *
 * Defines the proposed institutional governance architecture for a future
 * Social Health Authority (SHA) controlled pilot.
 *
 * Core Governance Invariants:
 * 1. ZERO INVENTED COMMITMENTS: All roles, approvals, and assignments are explicitly
 *    marked PROPOSED until formal statutory instruments are executed.
 * 2. STRICT SEPARATION OF DUTIES: Developers cannot approve production models; operational
 *    reviewers cannot alter evaluation methodology; evaluators cannot issue binding contributions.
 * 3. TRANSPARENT ACCOUNTABILITY: Every pilot transition requires recorded, auditable approvals
 *    from distinct institutional authorities.
 */

export const GOVERNANCE_ASSIGNMENT_STATUS = Object.freeze({
  NOT_ASSIGNED: "NOT_ASSIGNED",
  NOT_REQUESTED: "NOT_REQUESTED",
  PENDING: "PENDING",
  SYNTHETIC_DEMO_ONLY: "SYNTHETIC_DEMO_ONLY",
  APPROVED_WITH_VERIFIED_REFERENCE: "APPROVED_WITH_VERIFIED_REFERENCE"
});

export const PILOT_GOVERNANCE_ROLES = Object.freeze([
  {
    roleId: "SHA_PROGRAMME_SPONSOR",
    roleTitle: "SHA Executive Programme Sponsor",
    institution: "Social Health Authority (Executive Leadership / Board)",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Authorise initiation and scope of pilot phases.",
      "Receive and evaluate stage exit reports and independent audit findings.",
      "Authorise transition between pilot stages (e.g. from Shadow to Human Review).",
      "Issue emergency suspension or termination orders if pilot risks arise."
    ],
    authorizedDecisions: [
      "STAGE_TRANSITION_APPROVAL",
      "EMERGENCY_PILOT_SUSPENSION",
      "PILOT_TERMINATION",
      "SUBMISSION_TO_BOARD_OF_DIRECTORS"
    ],
    prohibitedDecisions: [
      "ALGORITHM_CODE_MODIFICATION",
      "INDIVIDUAL_HOUSEHOLD_ADJUDICATION"
    ],
    evidenceRequired: [
      "Executive Board briefing pack",
      "Independent evaluation report",
      "DPIA and regulatory compliance certificate"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "SHA_POLICY_OWNER",
    roleTitle: "SHA / MoH Policy Owner",
    institution: "Ministry of Health / SHA Policy & Planning Directorate",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Ensure candidate assessment rules align with national health financing policy.",
      "Review tariff band schedules and indigent subsidy cutoff definitions.",
      "Assess legal implications of alternative means-testing formulas under Regulation 21.",
      "Draft policy revisions if candidate models demonstrate superior equity."
    ],
    authorizedDecisions: [
      "POLICY_ASSUMPTION_APPROVAL",
      "SUBSIDY_THRESHOLD_SPECIFICATION",
      "REGULATORY_REVISION_RECOMMENDATION"
    ],
    prohibitedDecisions: [
      "SECURITY_CLEARANCE_APPROVAL",
      "CODE_DEPLOYMENT_APPROVAL"
    ],
    evidenceRequired: [
      "Affordability impact analysis",
      "County disparity analysis",
      "Legal and regulatory compliance review"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "SHA_TECHNICAL_OWNER",
    roleTitle: "SHA Technical System Owner",
    institution: "Social Health Authority Information & Communication Technology (ICT)",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Oversee integration boundaries between official systems and pilot engines.",
      "Verify that candidate models run in isolated, air-gapped environments.",
      "Ensure zero write-access to production member contribution databases.",
      "Enforce code signing, container immutability, and version tagging."
    ],
    authorizedDecisions: [
      "SYSTEM_ARCHITECTURE_APPROVAL",
      "AIR_GAP_VERIFICATION",
      "TECHNICAL_ENVIRONMENT_PROVISIONING"
    ],
    prohibitedDecisions: [
      "EXECUTIVE_PILOT_TERMINATION",
      "STATUTORY_POLICY_MODIFICATION"
    ],
    evidenceRequired: [
      "Technical architecture documentation",
      "Container vulnerability scans",
      "API isolation test results"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "DATA_CONTROLLER",
    roleTitle: "Statutory Data Controller Representative",
    institution: "Social Health Authority / Kenya National Bureau of Statistics (KNBS)",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Determine lawful basis and purpose limitation for evaluation datasets.",
      "Authorize research data licensing and inter-agency data transfer agreements.",
      "Enforce data minimization and retention schedules under Kenya DPA 2019.",
      "Ensure historical evaluation records are certified de-identified prior to ingestion."
    ],
    authorizedDecisions: [
      "DATASET_USE_AUTHORIZATION",
      "DATA_TRANSFER_AGREEMENT_EXECUTION",
      "RETENTION_LIMIT_ENFORCEMENT"
    ],
    prohibitedDecisions: [
      "MODEL_WEIGHT_MODIFICATION",
      "INDIVIDUAL_DISPUTE_ADJUDICATION"
    ],
    evidenceRequired: [
      "Data Access Application",
      "Data Transfer Agreement (DTA)",
      "De-identification certificate"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "DATA_PROTECTION_OFFICER",
    roleTitle: "Certified Data Protection Officer (DPO)",
    institution: "Social Health Authority Office of the DPO",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Conduct and certify the Data Protection Impact Assessment (DPIA) under DPA Sec 31.",
      "Verify adherence to ODPC Research Processing Guidelines (2025).",
      "Audit automated decision-making and profiling safeguards under DPA Sec 35.",
      "Receive, investigate, and report privacy breach incidents to the ODPC."
    ],
    authorizedDecisions: [
      "DPIA_SIGN_OFF",
      "PRIVACY_SAFEGUARD_CERTIFICATION",
      "DATA_PROTECTION_STOP_ORDER"
    ],
    prohibitedDecisions: [
      "MODEL_SELECTION",
      "CONTRIBUTION_TARIFF_DETERMINATION"
    ],
    evidenceRequired: [
      "Completed ODPC-compliant DPIA",
      "Privacy risk mitigation matrix",
      "Audit trail verification report"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "LEGAL_REGULATORY_REVIEWER",
    roleTitle: "Legal & Regulatory Counsel",
    institution: "SHA Legal Services / Ministry of Health Legal Directorate",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Review pilot operations against the Social Health Insurance Act, 2023.",
      "Verify compliance with Regulation 21(6) and Fifth Schedule statutory bounds.",
      "Ensure pilot outputs do not create ultra vires billing liabilities for citizens.",
      "Draft proposed regulatory amendments if reform advances to adoption."
    ],
    authorizedDecisions: [
      "LEGAL_COMPLIANCE_CLEARANCE",
      "STATUTORY_BOUND_INTERPRETATION",
      "REGULATORY_INSTRUMENT_DRAFTING"
    ],
    prohibitedDecisions: [
      "SOFTWARE_CODE_APPROVAL",
      "TECHNICAL_INFRASTRUCTURE_PROVISIONING"
    ],
    evidenceRequired: [
      "Legal risk opinion",
      "Regulation 21 compatibility memorandum",
      "Constitutional fair-administrative-action review"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "INDEPENDENT_EVALUATION_TEAM",
    roleTitle: "Independent Evaluation Team Lead",
    institution: "Academic / Independent Research Consortium (Non-Commercial)",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Pre-register evaluation protocols before analyzing holdout datasets.",
      "Calculate predictive accuracy, error distributions, and calibration metrics.",
      "Conduct subgroup equity analyses across settlement types and demographics.",
      "Publish unbiased, peer-reviewable evaluation reports."
    ],
    authorizedDecisions: [
      "PROTOCOL_FREEZE_AUTHORIZATION",
      "METRIC_METHODOLOGY_SELECTION",
      "INDEPENDENT_EVALUATION_SIGN_OFF"
    ],
    prohibitedDecisions: [
      "PRODUCTION_CODE_DEPLOYMENT",
      "PILOT_STAGE_AUTHORIZATION"
    ],
    evidenceRequired: [
      "Pre-registered evaluation protocol",
      "Reproducible validation code repository",
      "Independent peer review sign-off"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "SECURITY_INFRASTRUCTURE_TEAM",
    roleTitle: "Lead Cybersecurity & Infrastructure Architect",
    institution: "SHA Cybersecurity Directorate / National Computer & Cybercrimes Co-ord",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Perform independent vulnerability assessments and penetration testing.",
      "Enforce TLS 1.3 in transit and AES-256 at rest encryption.",
      "Configure role-based access control and multi-factor authentication.",
      "Monitor security event logs and coordinate incident response."
    ],
    authorizedDecisions: [
      "SECURITY_CLEARANCE_SIGN_OFF",
      "EMERGENCY_NETWORK_ISOLATION",
      "VULNERABILITY_REMEDIATION_REQUIREMENT"
    ],
    prohibitedDecisions: [
      "POLICY_TARIFF_DETERMINATION",
      "HOUSEHOLD_DISPUTE_RESOLUTION"
    ],
    evidenceRequired: [
      "Penetration test report",
      "Infrastructure isolation audit",
      "Cryptographic key management protocol"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "PILOT_OPERATIONS_COORDINATOR",
    roleTitle: "Pilot Operations Coordinator",
    institution: "SHA Operations & Member Services",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Manage daily operational execution of shadow batches.",
      "Track and report operational exceptions, processing latency, and failure rates.",
      "Coordinate training for human reviewers and verification officers.",
      "Maintain the centralized pilot incident and rollback log."
    ],
    authorizedDecisions: [
      "DAILY_BATCH_EXECUTION",
      "INCIDENT_LOGGING_AND_ESCALATION",
      "REVIEWER_TASK_ROUTING"
    ],
    prohibitedDecisions: [
      "STAGE_EXIT_APPROVAL",
      "MODEL_WEIGHT_MODIFICATION"
    ],
    evidenceRequired: [
      "Daily operational log",
      "Reviewer training register",
      "Weekly incident summary"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "HUMAN_ASSESSMENT_REVIEWERS",
    roleTitle: "Designated Assessment Reviewers / CHPs",
    institution: "SHA Sub-County Review Officers & Community Health Promoters (CHPs)",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Examine candidate assessment outputs and evidence gaps in Stage D.",
      "Document structured observations regarding discrepancies with official scores.",
      "Route disputed cases to authorised official SHA correction workflows.",
      "Provide qualitative field feedback on practical means-testing friction points."
    ],
    authorizedDecisions: [
      "REVIEW_OBSERVATION_RECORDING",
      "EVIDENCE_INSUFFICIENCY_FLAGGING",
      "ESCALATION_TO_OFFICIAL_PROCESS"
    ],
    prohibitedDecisions: [
      "DIRECT_CONTRIBUTION_ALTERATION",
      "MODEL_CODE_ALTERATION",
      "STAGE_PROGRESSION_APPROVAL"
    ],
    evidenceRequired: [
      "Certified reviewer qualification",
      "Completed review case record",
      "Conflict-of-interest declaration"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  },
  {
    roleId: "INDEPENDENT_AUDIT_FUNCTION",
    roleTitle: "Independent Oversight & Audit Lead",
    institution: "Internal Audit Directorate / Auditor-General Representative",
    assignmentStatus: GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED,
    responsibilities: [
      "Audit pilot compliance against pre-registered protocols and governance charters.",
      "Verify separation of duties and investigate unauthorized access attempts.",
      "Confirm that no candidate model outputs affected live billing or member records.",
      "Issue periodic audit reports to the Executive Sponsor and Board."
    ],
    authorizedDecisions: [
      "AUDIT_FINDING_ISSUANCE",
      "INVESTIGATION_RECOMMENDATION",
      "GOVERNANCE_NON_COMPLIANCE_ESCALATION"
    ],
    prohibitedDecisions: [
      "OPERATIONAL_MANAGEMENT",
      "MODEL_CALIBRATION"
    ],
    evidenceRequired: [
      "Periodic audit report",
      "Access control audit log",
      "Zero-live-impact verification certificate"
    ],
    approvalReference: null,
    dateRecorded: null,
    reviewDate: null
  }
]);

/**
 * Validates separation of duties across two roles.
 * Returns { isSeparated: boolean, reason: string }
 */
export function checkSeparationOfDuties(roleAId, roleBId) {
  if (roleAId === roleBId) {
    return {
      isSeparated: false,
      reason: `Separation of duties violation: The same role '${roleAId}' cannot perform conflicting functions.`
    };
  }

  // Explicit conflicting pairs
  const conflicts = [
    ["SHA_TECHNICAL_OWNER", "INDEPENDENT_EVALUATION_TEAM", "Developers cannot evaluate their own models."],
    ["SHA_PROGRAMME_SPONSOR", "INDEPENDENT_AUDIT_FUNCTION", "Audit function must remain independent of executive sponsorship."],
    ["HUMAN_ASSESSMENT_REVIEWERS", "LEGAL_REGULATORY_REVIEWER", "Reviewers cannot provide their own legal compliance sign-off."],
    ["DATA_CONTROLLER", "DATA_PROTECTION_OFFICER", "DPO must maintain supervisory independence from the data controller."]
  ];

  for (const [r1, r2, desc] of conflicts) {
    if ((roleAId === r1 && roleBId === r2) || (roleAId === r2 && roleBId === r1)) {
      return {
        isSeparated: false,
        reason: `Separation of duties violation: ${desc}`
      };
    }
  }

  return { isSeparated: true, reason: "Separation of duties maintained." };
}

/**
 * Returns a summary of assigned vs proposed governance roles.
 */
export function getPilotGovernanceSummary() {
  const totalRoles = PILOT_GOVERNANCE_ROLES.length;
  const notAssignedCount = PILOT_GOVERNANCE_ROLES.filter(r => r.assignmentStatus === GOVERNANCE_ASSIGNMENT_STATUS.NOT_ASSIGNED).length;
  const pendingCount = PILOT_GOVERNANCE_ROLES.filter(r => r.assignmentStatus === GOVERNANCE_ASSIGNMENT_STATUS.PENDING).length;
  const syntheticDemoCount = PILOT_GOVERNANCE_ROLES.filter(r => r.assignmentStatus === GOVERNANCE_ASSIGNMENT_STATUS.SYNTHETIC_DEMO_ONLY).length;
  const approvedWithReferenceCount = PILOT_GOVERNANCE_ROLES.filter(r => r.assignmentStatus === GOVERNANCE_ASSIGNMENT_STATUS.APPROVED_WITH_VERIFIED_REFERENCE).length;

  return {
    totalRoles,
    notAssignedCount,
    pendingCount,
    syntheticDemoCount,
    approvedWithReferenceCount,
    isFullyAssigned: approvedWithReferenceCount === totalRoles,
    hasRealInstitutionalAssignments: approvedWithReferenceCount > 0,
    disclaimer: "All 11 governance roles are currently NOT_ASSIGNED. No actual SHA personnel or appointments have been made. Formal assignment requires SHA Executive Board resolutions and ministerial appointments."
  };
}
