/**
 * Pilot Operational Monitoring & Incident Response Engine — Research Prototype.
 *
 * Implements real-time operational health checks, anomaly detection, and formal
 * incident tracking for a staged means-testing pilot.
 *
 * Methodological Invariants:
 * 1. CONFIGURABLE THRESHOLDS: Metric alert limits tie to documented governance sources,
 *    never arbitrary hardcoded numbers masquerading as legal standards.
 * 2. STRUCTURED INCIDENT AUDITING: Every anomaly or failure produces a traceable incident record
 *    with assigned severity, containment status, and resolution sign-off.
 * 3. NO FICTITIOUS LIVE CLAIMS: Operates cleanly as a monitoring framework without claiming
 *    connection to live SHA telemetry.
 */

export const INCIDENT_CATEGORIES = Object.freeze({
  DATA_QUALITY_INCIDENT: "DATA_QUALITY_INCIDENT",
  MODEL_OUTPUT_INCIDENT: "MODEL_OUTPUT_INCIDENT",
  SECURITY_INCIDENT: "SECURITY_INCIDENT",
  PRIVACY_INCIDENT: "PRIVACY_INCIDENT",
  ACCESS_CONTROL_INCIDENT: "ACCESS_CONTROL_INCIDENT",
  OPERATIONAL_OUTAGE: "OPERATIONAL_OUTAGE",
  POLICY_CONFIGURATION_INCIDENT: "POLICY_CONFIGURATION_INCIDENT"
});

export const INCIDENT_SEVERITY = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

export const MONITORING_THRESHOLD_STATUS = Object.freeze({
  NOT_POLICY_APPROVED: "NOT_POLICY_APPROVED",
  ILLUSTRATIVE_DESIGN_PARAMETER: "ILLUSTRATIVE_DESIGN_PARAMETER",
  PENDING_EMPIRICAL_CALIBRATION: "PENDING_EMPIRICAL_CALIBRATION",
  POLICY_APPROVED: "POLICY_APPROVED"
});

export const DEFAULT_MONITORING_THRESHOLDS = Object.freeze({
  MAX_MODEL_FAILURE_RATE: {
    limit: 0.02, // 2%
    status: MONITORING_THRESHOLD_STATUS.NOT_POLICY_APPROVED,
    type: MONITORING_THRESHOLD_STATUS.ILLUSTRATIVE_DESIGN_PARAMETER,
    source: "Unapproved Research Default (Illustrative engineering estimate; requires SHA SLA)",
    authority: "Pending SHA Technical Owner Review",
    isPolicyApproved: false
  },
  MAX_MISSING_INPUT_RATE: {
    limit: 0.05, // 5%
    status: MONITORING_THRESHOLD_STATUS.NOT_POLICY_APPROVED,
    type: MONITORING_THRESHOLD_STATUS.ILLUSTRATIVE_DESIGN_PARAMETER,
    source: "Unapproved Research Default (Illustrative data-quality threshold; requires DPO/KNBS review)",
    authority: "Pending SHA Data Governance Review",
    isPolicyApproved: false
  },
  MAX_SUBGROUP_DISPARITY_SHIFT: {
    limit: 0.20, // 20% shift
    status: MONITORING_THRESHOLD_STATUS.NOT_POLICY_APPROVED,
    type: MONITORING_THRESHOLD_STATUS.ILLUSTRATIVE_DESIGN_PARAMETER,
    source: "Unapproved Research Default (Illustrative parity flag; requires health equity charter)",
    authority: "Pending SHA Policy & Planning Directorate Review",
    isPolicyApproved: false
  },
  MAX_ASSESSMENT_ESCALATION_SPIKE_RATE: {
    limit: 0.03, // 3% of cases experiencing >3x increase
    status: MONITORING_THRESHOLD_STATUS.NOT_POLICY_APPROVED,
    type: MONITORING_THRESHOLD_STATUS.ILLUSTRATIVE_DESIGN_PARAMETER,
    source: "Unapproved Research Default (Illustrative escalation threshold; requires actuarial review)",
    authority: "Pending SHA Executive Programme Sponsor Review",
    isPolicyApproved: false
  }
});

/**
 * Evaluates operational telemetry metrics against documented alert thresholds.
 */
export function evaluatePilotMonitoringMetrics(metrics = {}, thresholds = DEFAULT_MONITORING_THRESHOLDS) {
  const alerts = [];
  const status = {
    isHealthy: true,
    alertsCount: 0,
    criticalAlertsCount: 0
  };

  // 1. Failure rate check
  if (typeof metrics.failureRate === "number") {
    const limit = thresholds.MAX_MODEL_FAILURE_RATE.limit;
    if (metrics.failureRate > limit) {
      alerts.push({
        indicator: "MODEL_FAILURE_RATE",
        observedValue: `${(metrics.failureRate * 100).toFixed(1)}%`,
        thresholdLimit: `${(limit * 100).toFixed(1)}%`,
        severity: metrics.failureRate > 0.05 ? INCIDENT_SEVERITY.CRITICAL : INCIDENT_SEVERITY.HIGH,
        authority: thresholds.MAX_MODEL_FAILURE_RATE.authority,
        message: `Model failure rate (${(metrics.failureRate * 100).toFixed(1)}%) exceeds threshold of ${(limit * 100).toFixed(1)}%.`
      });
    }
  }

  // 2. Missing input rate check
  if (typeof metrics.missingInputRate === "number") {
    const limit = thresholds.MAX_MISSING_INPUT_RATE.limit;
    if (metrics.missingInputRate > limit) {
      alerts.push({
        indicator: "MISSING_INPUT_RATE",
        observedValue: `${(metrics.missingInputRate * 100).toFixed(1)}%`,
        thresholdLimit: `${(limit * 100).toFixed(1)}%`,
        severity: INCIDENT_SEVERITY.MEDIUM,
        authority: thresholds.MAX_MISSING_INPUT_RATE.authority,
        message: `Rate of incomplete or unmapped inputs (${(metrics.missingInputRate * 100).toFixed(1)}%) exceeds threshold of ${(limit * 100).toFixed(1)}%.`
      });
    }
  }

  // 3. Subgroup shift check
  if (typeof metrics.subgroupShiftRate === "number") {
    const limit = thresholds.MAX_SUBGROUP_DISPARITY_SHIFT.limit;
    if (metrics.subgroupShiftRate > limit) {
      alerts.push({
        indicator: "SUBGROUP_DISPARITY_SHIFT",
        observedValue: `${(metrics.subgroupShiftRate * 100).toFixed(1)}%`,
        thresholdLimit: `${(limit * 100).toFixed(1)}%`,
        severity: INCIDENT_SEVERITY.HIGH,
        authority: thresholds.MAX_SUBGROUP_DISPARITY_SHIFT.authority,
        message: `Subgroup performance distribution shift (${(metrics.subgroupShiftRate * 100).toFixed(1)}%) exceeds stability limit of ${(limit * 100).toFixed(1)}%.`
      });
    }
  }

  status.alertsCount = alerts.length;
  status.criticalAlertsCount = alerts.filter(a => a.severity === INCIDENT_SEVERITY.CRITICAL).length;
  status.isHealthy = status.alertsCount === 0;

  return {
    status,
    alerts,
    isSimulatedTelemetry: true,
    telemetrySource: "SYNTHETIC_TEST_HARNESS",
    disclaimer: "Telemetry is generated from synthetic demonstration data. Thresholds are unapproved illustrative parameters marked NOT_POLICY_APPROVED and cannot trigger binding operational decisions."
  };
}

/**
 * Creates an immutable incident response record.
 */
export function createPilotIncidentRecord({
  category,
  severity = INCIDENT_SEVERITY.MEDIUM,
  affectedComponent,
  detectionSource = "AUTOMATED_MONITORING",
  description,
  assignedOwner,
  containmentAction = null
} = {}) {
  const errors = [];
  if (!category || !Object.values(INCIDENT_CATEGORIES).includes(category)) {
    errors.push(`Valid incident category required. Must be one of: ${Object.values(INCIDENT_CATEGORIES).join(", ")}`);
  }
  if (!severity || !Object.values(INCIDENT_SEVERITY).includes(severity)) {
    errors.push(`Valid incident severity required. Must be one of: ${Object.values(INCIDENT_SEVERITY).join(", ")}`);
  }
  if (!affectedComponent) errors.push("affectedComponent is required.");
  if (!description || String(description).trim().length < 10) {
    errors.push("Substantive incident description is required (min 10 chars).");
  }
  if (!assignedOwner) errors.push("assignedOwner role is required.");

  if (errors.length > 0) {
    throw new Error(`Invalid incident record: ${errors.join("; ")}`);
  }

  return {
    incidentId: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    dateDetected: new Date().toISOString(),
    category,
    severity,
    affectedComponent,
    detectionSource,
    description,
    assignedOwner,
    containmentStatus: containmentAction ? "CONTAINED" : "INVESTIGATING",
    containmentAction,
    resolutionReference: null,
    closureApproval: null,
    resolvedAt: null
  };
}

/**
 * Closes an incident with formal resolution sign-off.
 */
export function resolvePilotIncident(existingIncident, {
  resolutionDetails,
  resolutionReference,
  approvingAuthorityRole
} = {}) {
  if (!resolutionDetails || String(resolutionDetails).trim().length < 15) {
    throw new Error("Resolution requires detailed documentation (min 15 chars).");
  }
  if (!resolutionReference) {
    throw new Error("resolutionReference is required.");
  }
  if (!approvingAuthorityRole) {
    throw new Error("approvingAuthorityRole is required to close an incident.");
  }

  return {
    ...existingIncident,
    containmentStatus: "RESOLVED",
    resolutionDetails,
    resolutionReference,
    closureApproval: {
      approvedByRole: approvingAuthorityRole,
      approvedAt: new Date().toISOString()
    },
    resolvedAt: new Date().toISOString()
  };
}
