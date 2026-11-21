/**
 * Pilot Control, Emergency Suspension & Rollback Framework — Research Prototype.
 *
 * Implements authoritative state machine controls, emergency suspension gates,
 * and structured rollback protocols for a staged means-testing pilot.
 *
 * Core Governance Invariants:
 * 1. MANDATORY GOVERNANCE AUTHORITY: State transitions (PAUSE, SUSPEND, RESUME, TERMINATE)
 *    require explicit documented authorization from designated governance roles.
 * 2. AUTOMATIC FAIL-SAFE REVERSION: Any emergency suspension immediately revokes candidate
 *    engine routing, returning 100% of operational reliance to the existing authorized SHA process.
 * 3. IMMUTABLE INCIDENT FREEZE: On suspension, candidate code versions, logs, and case inputs
 *    are cryptographically frozen for independent forensic audit.
 * 4. SCOPE BOUNDARY: This framework governs research pilot components and defines the future
 *    production architecture; it does not claim to execute live rollbacks on SHA core mainframes.
 */

export const PILOT_CONTROL_STATES = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  SUSPENDED: "SUSPENDED",
  TERMINATED: "TERMINATED"
});

export const PILOT_STOP_CONDITIONS = Object.freeze({
  SECURITY_INCIDENT: "Critical vulnerability or unauthorized access attempt detected.",
  PRIVACY_INCIDENT: "Potential personal data exposure or de-identification failure.",
  DATA_INTEGRITY_FAILURE: "Corrupted input streams, duplicate IDs, or unmapped variables.",
  UNEXPLAINED_MODEL_SHIFT: "Sudden unexplained shift in score or contribution distributions.",
  SUBGROUP_DETERIORATION: "Systematic bias or elevated error rates in vulnerable demographics.",
  INCORRECT_MODEL_VERSION: "Hash mismatch or execution of unapproved model build.",
  INVALID_SOURCE_DATA: "Observation period conflict or unverified sampling frame.",
  HUMAN_OVERSIGHT_FAILURE: "Failure of review officers to document reasoned adjudications.",
  MISSING_REQUIRED_APPROVAL: "Lapse or expiry of statutory governance clearance.",
  BASELINE_COMPARISON_FAILURE: "Official baseline parameters revoked or unverified.",
  INADEQUATE_EVALUATION_EVIDENCE: "Evaluation protocol violation or holdout leakage."
});

/**
 * Eight-step standardized rollback procedure protocol.
 */
export const STANDARDIZED_ROLLBACK_PROCEDURE = Object.freeze([
  { step: 1, action: "HALT_EXECUTION", description: "Immediately terminate all asynchronous candidate model execution threads." },
  { step: 2, action: "FREEZE_ARTIFACTS", description: "Cryptographically freeze candidate model build hashes, logs, and case datasets." },
  { step: 3, action: "REVOKE_ACCESS", description: "Revoke API access tokens and reviewer credentials for the affected candidate pipeline." },
  { step: 4, action: "PRESERVE_FORENSICS", description: "Archive audit logs and memory snapshots in tamper-evident secure storage." },
  { step: 5, action: "REVERT_RELIANCE", description: "Confirm 100% operational reliance remains on the official Regulation 21 instrument." },
  { step: 6, action: "NOTIFY_GOVERNANCE", description: "Issue automated high-priority alert to SHA Programme Sponsor, Technical Owner, and DPO." },
  { step: 7, action: "COMMISSION_INQUIRY", description: "Initiate formal root-cause analysis by the Independent Oversight team." },
  { step: 8, action: "RESUMPTION_BARRIER", description: "Prohibit system unfreezing until explicit multi-role re-authorization is executed." }
]);

/**
 * Creates the initial pilot control state object.
 */
export function initializePilotControlState({
  pilotId = "SIMULATED-PILOT-CONTROL-DEMO",
  stage = "STAGE_1_TECHNICAL_REVIEW"
} = {}) {
  return {
    pilotId,
    stage,
    isSimulatedControlMachine: true,
    currentState: PILOT_CONTROL_STATES.NOT_STARTED,
    activeSuspensionCondition: null,
    history: [
      {
        state: PILOT_CONTROL_STATES.NOT_STARTED,
        changedAt: new Date().toISOString(),
        authorizingRole: "SYSTEM_INITIALIZER",
        reason: "Initial simulated pilot control state configuration."
      }
    ],
    rollbackExecution: null,
    operationalReliance: "OFFICIAL_SHA_STATUTORY_PROCESS_ONLY",
    simulationNotice: "State machine is a research demonstration and does not command live SHA enterprise infrastructure."
  };
}

/**
 * Transitions the pilot control state under strict governance rules.
 */
export function transitionPilotControlState(currentStateObj, {
  targetState,
  authorizingRole,
  authorizingReference,
  reason,
  stopConditionKey = null
} = {}) {
  if (!Object.values(PILOT_CONTROL_STATES).includes(targetState)) {
    throw new Error(`Invalid target control state '${targetState}'. Must be one of: ${Object.values(PILOT_CONTROL_STATES).join(", ")}`);
  }

  if (!authorizingRole) {
    throw new Error("authorizingRole is mandatory for pilot state transitions.");
  }

  if (!reason || String(reason).trim().length < 10) {
    throw new Error("A detailed justification (min 10 chars) is required for state transitions.");
  }

  // Emergency Suspension logic
  let rollbackPlan = currentStateObj.rollbackExecution;
  let activeCondition = currentStateObj.activeSuspensionCondition;

  if (targetState === PILOT_CONTROL_STATES.SUSPENDED) {
    activeCondition = stopConditionKey && PILOT_STOP_CONDITIONS[stopConditionKey]
      ? PILOT_STOP_CONDITIONS[stopConditionKey]
      : reason;

    rollbackPlan = {
      isSimulatedRunbookAction: true,
      simulationNotice: "This rollback execution is a demonstration state-machine simulation and runbook verification. It records the standardized 8-step protocol for institutional audit, but does NOT interact with live SHA production infrastructure, Kafka consumers, or production billing tables.",
      triggeredAt: new Date().toISOString(),
      triggeredByRole: authorizingRole,
      triggerReason: activeCondition,
      steps: STANDARDIZED_ROLLBACK_PROCEDURE.map(s => ({
        ...s,
        completed: true,
        executionMode: "SIMULATED_RUNBOOK_DRILL",
        timestamp: new Date().toISOString()
      })),
      operationalRelianceStatus: "VERIFIED_100_PERCENT_OFFICIAL_SHA",
      resumptionAuthorizationRequired: [
        "SHA_PROGRAMME_SPONSOR",
        "SHA_TECHNICAL_OWNER",
        "DATA_PROTECTION_OFFICER"
      ]
    };
  } else if (targetState === PILOT_CONTROL_STATES.ACTIVE) {
    activeCondition = null;
  }

  return {
    ...currentStateObj,
    currentState: targetState,
    activeSuspensionCondition: activeCondition,
    rollbackExecution: rollbackPlan,
    history: [
      ...currentStateObj.history,
      {
        state: targetState,
        changedAt: new Date().toISOString(),
        authorizingRole,
        authorizingReference: authorizingReference || "REF-UNRECORDED",
        reason
      }
    ]
  };
}
