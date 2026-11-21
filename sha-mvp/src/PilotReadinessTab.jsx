import React, { useState, useMemo } from "react";
import {
  Shield,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Download,
  Info,
  Layers,
  Activity,
  Users,
  Lock,
  RotateCcw,
  Sliders,
  ExternalLink
} from "lucide-react";

import {
  PILOT_STAGES_SPECIFICATION,
  PILOT_STAGE_IDS,
  validateStageTransition
} from "./lib/pilot-stages.js";

import {
  assessPilotReadiness,
  PILOT_GATE_STATES
} from "./lib/pilot-readiness.js";

import {
  PILOT_GOVERNANCE_ROLES,
  getPilotGovernanceSummary,
  checkSeparationOfDuties
} from "./lib/pilot-governance.js";

import {
  evaluatePilotMonitoringMetrics,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITY
} from "./lib/pilot-monitoring.js";

import {
  initializePilotControlState,
  transitionPilotControlState,
  PILOT_CONTROL_STATES,
  PILOT_STOP_CONDITIONS,
  STANDARDIZED_ROLLBACK_PROCEDURE
} from "./lib/pilot-control.js";

const S = {
  ink: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  panel: "#FFFFFF",
  faint: "#F8FAFC",
  blue: "#0284C7",
  blueD: "#E0F2FE",
  blueBd: "#BAE6FD",
  sage: "#059669",
  sageD: "#ECFDF5",
  sageBd: "#A7F3D0",
  terra: "#DC2626",
  terraD: "#FEF2F2",
  terraBd: "#FECACA",
  amber: "#D97706",
  amberD: "#FFFBEB",
  amberBd: "#FDE68A",
  purple: "#7C3AED",
  purpleD: "#F5F3FF",
  purpleBd: "#DDD6FE"
};

export default function PilotReadinessTab() {
  const [selectedStageId, setSelectedStageId] = useState(PILOT_STAGE_IDS.STAGE_1_TECHNICAL_REVIEW);
  const [controlState, setControlState] = useState(() => initializePilotControlState());
  const [subTab, setSubTab] = useState("stages"); // "stages", "governance", "monitoring", "rollback", "handover"
  const [demoNotice, setDemoNotice] = useState(null);

  // Simulated documented evidence state for demonstration purposes
  const [evidenceState, setEvidenceState] = useState({
    methodologyDocumented: true,
    modelVersionsIdentified: true,
    knownLimitationsDocumented: true,
    legalScopeReviewed: true,
    // Stage 2 requirements
    evaluationProtocolApproved: true,
    datasetUseAuthorised: false, // Pending formal SHA data sharing agreement
    dataGovernanceApproved: true,
    secureEnvironmentApproved: false, // Pending air-gap enclave certification
    evaluationBaselineVerified: false, // Pending official SHA parameters
    rollbackProcedureDocumented: true,
    // Stage 3 requirements
    institutionalPilotApproval: false,
    dataSharingAgreementApproved: false,
    securityAssessmentPassed: false,
    privacyImpactReviewCompleted: false,
    incidentResponseApproved: true,
    monitoringPlanApproved: true,
    rollbackTestPassed: false,
    staffTrainingCompleted: false
  });

  // Calculate readiness for current selected stage
  const readiness = useMemo(() => {
    return assessPilotReadiness({
      targetStage: selectedStageId,
      evidence: evidenceState
    });
  }, [selectedStageId, evidenceState]);

  // Governance Summary
  const govSummary = useMemo(() => getPilotGovernanceSummary(), []);

  // Synthetic monitoring telemetry for demonstration
  const monitoringEval = useMemo(() => {
    return evaluatePilotMonitoringMetrics({
      failureRate: 0.008, // 0.8% failure rate (simulated)
      missingInputRate: 0.021, // 2.1% missing inputs (simulated)
      subgroupShiftRate: 0.05 // 5% shift (simulated)
    });
  }, []);

  const selectedStageSpec = useMemo(() => {
    return PILOT_STAGES_SPECIFICATION.find(s => s.stageId === selectedStageId);
  }, [selectedStageId]);

  const handleSimulateSuspension = () => {
    try {
      const next = transitionPilotControlState(controlState, {
        targetState: PILOT_CONTROL_STATES.SUSPENDED,
        authorizingRole: "DATA_PROTECTION_OFFICER",
        authorizingReference: "DEMO-RUNBOOK-ORDER-01",
        reason: "Simulated emergency stop runbook drill: Verifying state machine reversion to official SHA reliance.",
        stopConditionKey: "PRIVACY_INCIDENT"
      });
      setControlState(next);
      setDemoNotice("Emergency suspension executed in simulation. State machine records 100% operational reliance on official SHA process.");
      setTimeout(() => setDemoNotice(null), 5000);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetControl = () => {
    setControlState(initializePilotControlState());
    setDemoNotice("Simulated pilot control state reset to NOT_STARTED.");
    setTimeout(() => setDemoNotice(null), 4000);
  };

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 1200, margin: "0 auto", paddingBottom: 40 }}>
      {/* ─── 1. TOP STATUTORY & READINESS BANNER ──────────────────────────────── */}
      <div style={{ background: S.amberD, border: `1px solid ${S.amberBd}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <ShieldAlert size={22} color={S.amber} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#92400E", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Phase 6.1: Institutional Readiness, Claims Audit & Pilot Proposal
              </div>
              <div style={{ fontSize: 13, color: S.ink, marginTop: 4, lineHeight: 1.5 }}>
                This interface presents an institutional research proposal for SHA examination and independent audit.
                <strong> Technical demonstration does NOT constitute institutional approval, operational readiness, or legal clearance.</strong>
                Zero live integration with SHA production databases, KRA, NTSA, or M-Pesa exists.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 4, background: S.amber, color: "#FFF" }}>
              PROPOSED ARCHITECTURE
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 4, background: S.purple, color: "#FFF" }}>
              SYNTHETIC DEMO ONLY
            </span>
          </div>
        </div>

        {/* Status Legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${S.amberBd}`, flexWrap: "wrap", fontSize: 11 }}>
          <span style={{ color: "#78350F", fontWeight: 700 }}>System Component Statuses:</span>
          <span style={{ color: S.sage, fontWeight: 600 }}>● Implemented & Local Unit Tested (Calculations & Schemas)</span>
          <span style={{ color: S.purple, fontWeight: 600 }}>● Synthetic Demonstration (Telemetry & Rollback Drills)</span>
          <span style={{ color: S.blue, fontWeight: 600 }}>● Proposed Architecture (Kafka Tap & WORM Vault)</span>
          <span style={{ color: S.terra, fontWeight: 600 }}>● Pending SHA Approval & Legal Review</span>
        </div>
      </div>

      {demoNotice && (
        <div style={{ background: S.blueD, color: S.blue, border: `1px solid ${S.blueBd}`, borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 600 }}>
          {demoNotice}
        </div>
      )}

      {/* ─── 2. STAGE PROGRESSION PIPELINE ────────────────────────────────────── */}
      <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Staged Pilot Implementation Pathway (Sequential Progression)
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {PILOT_STAGES_SPECIFICATION.map((stage) => {
            const isSelected = stage.stageId === selectedStageId;
            return (
              <button
                key={stage.stageId}
                onClick={() => setSelectedStageId(stage.stageId)}
                style={{
                  textAlign: "left",
                  padding: 12,
                  borderRadius: 8,
                  border: isSelected ? `2px solid ${S.blue}` : `1px solid ${S.border}`,
                  background: isSelected ? S.blueD : S.faint,
                  cursor: "pointer"
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 800, color: isSelected ? S.blue : S.muted }}>
                  STAGE {stage.stageNumber}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: S.ink, marginTop: 2 }}>
                  {stage.title.split("—")[1]?.trim() || stage.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 3. SUB-NAVIGATION TABS ──────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${S.border}`, display: "flex", gap: 20 }}>
        {[
          { id: "stages", label: "Stage Gate Details" },
          { id: "governance", label: "Governance & Roles" },
          { id: "monitoring", label: "Operational Telemetry" },
          { id: "rollback", label: "Emergency Rollback" },
          { id: "handover", label: "Handover Documents (12)" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              padding: "10px 4px",
              background: "none",
              border: "none",
              borderBottom: subTab === t.id ? `2px solid ${S.blue}` : "2px solid transparent",
              fontSize: 13,
              fontWeight: subTab === t.id ? 700 : 500,
              color: subTab === t.id ? S.blue : S.muted,
              cursor: "pointer"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 4. SUBTAB PANELS ────────────────────────────────────────────────── */}

      {/* TAB 1: STAGE DETAILS & READINESS GATE */}
      {subTab === "stages" && selectedStageSpec && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: S.ink, margin: 0 }}>
                  {selectedStageSpec.title}
                </h3>
                <p style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
                  {selectedStageSpec.purpose}
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 4,
                  background: readiness.status === PILOT_GATE_STATES.READY_FOR_INSTITUTIONAL_APPROVAL ? S.blueD : S.terraD,
                  color: readiness.status === PILOT_GATE_STATES.READY_FOR_INSTITUTIONAL_APPROVAL ? S.blue : S.terra,
                  border: `1px solid ${readiness.status === PILOT_GATE_STATES.READY_FOR_INSTITUTIONAL_APPROVAL ? S.blueBd : S.terraBd}`
                }}
              >
                {readiness.status}
              </span>
            </div>

            {/* Evidence Checklist */}
            <div style={{ marginTop: 18, borderTop: `1px solid ${S.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 750, color: S.ink, textTransform: "uppercase", marginBottom: 8 }}>
                Required Documentary Evidence Checklist
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {selectedStageSpec.requiredEvidence.map((evKey, i) => {
                  const isChecked = evidenceState[evKey] === true;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      {isChecked ? (
                        <CheckCircle2 size={16} color={S.sage} />
                      ) : (
                        <AlertTriangle size={16} color={S.amber} />
                      )}
                      <span style={{ color: isChecked ? S.ink : S.muted }}>
                        {evKey}
                      </span>
                      <span style={{ fontSize: 10, color: isChecked ? S.sage : S.terra, fontWeight: 600 }}>
                        {isChecked ? "(Verified Documented)" : "(Missing Approval)"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Permitted vs Prohibited */}
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12 }}>
              <div style={{ background: S.sageD, border: `1px solid ${S.sageBd}`, padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 700, color: S.sage, marginBottom: 4 }}>Permitted Activities</div>
                <ul style={{ margin: 0, paddingLeft: 16, color: S.ink }}>
                  {selectedStageSpec.permittedActivities.map((a, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{a}</li>
                  ))}
                </ul>
              </div>

              <div style={{ background: S.terraD, border: `1px solid ${S.terraBd}`, padding: 12, borderRadius: 8 }}>
                <div style={{ fontWeight: 700, color: S.terra, marginBottom: 4 }}>Strictly Prohibited</div>
                <ul style={{ margin: 0, paddingLeft: 16, color: "#991B1B" }}>
                  {selectedStageSpec.prohibitedActivities.map((p, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOVERNANCE & ROLES */}
      {subTab === "governance" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 750, color: S.ink, textTransform: "uppercase" }}>
                  Institutional Pilot Governance Charter (11 Proposed Roles)
                </div>
                <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>
                  {govSummary.disclaimer}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: S.amberD, color: S.amber, border: `1px solid ${S.amberBd}` }}>
                {govSummary.notAssignedCount} Roles Unassigned
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: S.faint, textAlign: "left" }}>
                    <th style={{ padding: "8px 10px" }}>Role Identifier</th>
                    <th style={{ padding: "8px 10px" }}>Proposed Institution</th>
                    <th style={{ padding: "8px 10px" }}>Key Responsibilities</th>
                    <th style={{ padding: "8px 10px" }}>Authorized Decisions</th>
                    <th style={{ padding: "8px 10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {PILOT_GOVERNANCE_ROLES.map(r => (
                    <tr key={r.roleId} style={{ borderBottom: `1px solid ${S.border}` }}>
                      <td style={{ padding: "10px", fontWeight: 700, color: S.ink }}>
                        {r.roleTitle}
                        <div style={{ fontSize: 10, color: S.muted, fontFamily: "monospace" }}>{r.roleId}</div>
                      </td>
                      <td style={{ padding: "10px", color: S.muted }}>{r.institution}</td>
                      <td style={{ padding: "10px", color: S.ink, maxWidth: 300 }}>
                        {r.responsibilities[0]}
                      </td>
                      <td style={{ padding: "10px", color: S.muted, fontSize: 11 }}>
                        <code>{r.authorizedDecisions[0]}</code>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: S.terraD, border: `1px solid ${S.terraBd}`, color: S.terra }}>
                          {r.assignmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OPERATIONAL TELEMETRY */}
      {subTab === "monitoring" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 750, color: S.ink, textTransform: "uppercase" }}>
                  Pilot Operational Monitoring (Simulated Telemetry Demonstration)
                </div>
                <p style={{ fontSize: 12, color: S.muted, margin: "4px 0 0 0" }}>
                  Automated observability tracking simulated failure rates and demographic disparity shifts against illustrative parameters.
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, background: S.purpleD, color: S.purple, border: `1px solid ${S.purpleBd}` }}>
                SYNTHETIC TEST HARNESS · NOT LIVE SHA TELEMETRY
              </span>
            </div>

            {/* Threshold provenance banner */}
            <div style={{ background: S.amberD, border: `1px solid ${S.amberBd}`, borderRadius: 6, padding: 10, fontSize: 11, color: "#92400E", marginBottom: 16 }}>
              <strong>Notice on Monitoring Thresholds:</strong> All limits shown below are <strong>NOT POLICY APPROVED</strong>. They are unapproved illustrative design parameters derived from research assumptions. Formal pilot adoption requires SHA Service Level Agreements (SLAs), Data Protection Officer review, and health equity charters.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 8, background: S.sageD, border: `1px solid ${S.sageBd}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.sage, textTransform: "uppercase" }}>Model Failure Rate</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: S.ink, marginTop: 2 }}>0.8% <span style={{ fontSize: 11, color: S.muted, fontWeight: 400 }}>(Simulated)</span></div>
                <div style={{ fontSize: 11, color: S.amber, fontWeight: 600, marginTop: 4 }}>
                  Threshold: 2.0% (NOT POLICY APPROVED)
                </div>
                <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>
                  Illustrative engineering default. Real limits require SHA ICT SLA.
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: S.sageD, border: `1px solid ${S.sageBd}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.sage, textTransform: "uppercase" }}>Missing Input Rate</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: S.ink, marginTop: 2 }}>2.1% <span style={{ fontSize: 11, color: S.muted, fontWeight: 400 }}>(Simulated)</span></div>
                <div style={{ fontSize: 11, color: S.amber, fontWeight: 600, marginTop: 4 }}>
                  Threshold: 5.0% (NOT POLICY APPROVED)
                </div>
                <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>
                  Illustrative data-quality threshold. Requires DPO/KNBS review.
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, background: S.sageD, border: `1px solid ${S.sageBd}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.sage, textTransform: "uppercase" }}>Subgroup Disparity Shift</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: S.ink, marginTop: 2 }}>5.0% <span style={{ fontSize: 11, color: S.muted, fontWeight: 400 }}>(Simulated)</span></div>
                <div style={{ fontSize: 11, color: S.amber, fontWeight: 600, marginTop: 4 }}>
                  Stability limit: 20.0% (NOT POLICY APPROVED)
                </div>
                <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>
                  Illustrative parity flag. Requires formal health equity charter.
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: S.muted, background: S.faint, padding: 10, borderRadius: 6, border: `1px solid ${S.border}` }}>
              ℹ️ <strong>Demonstration State:</strong> Synthetic telemetry shows zero critical incidents within test harness. No real-time connection to SHA infrastructure exists.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMERGENCY SUSPENSION & ROLLBACK */}
      {subTab === "rollback" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 750, color: S.ink, textTransform: "uppercase" }}>
                  Emergency Rollback Controller (Simulated Runbook Demonstration)
                </div>
                <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>
                  Current State: <strong>{controlState.currentState}</strong> · Operational Reliance: <strong>{controlState.operationalReliance}</strong>
                </div>
                <div style={{ fontSize: 11, color: S.amber, marginTop: 2, fontWeight: 600 }}>
                  Drill simulation only. Does NOT stop real Kafka consumers or alter live SHA databases.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {controlState.currentState !== PILOT_CONTROL_STATES.SUSPENDED ? (
                  <button
                    onClick={handleSimulateSuspension}
                    style={{
                      background: S.terra,
                      color: "#FFF",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Simulate Emergency Suspension Drill
                  </button>
                ) : (
                  <button
                    onClick={handleResetControl}
                    style={{
                      background: S.blue,
                      color: "#FFF",
                      border: "none",
                      borderRadius: 6,
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Reset Control State
                  </button>
                )}
              </div>
            </div>

            {/* Rollback Procedure Table */}
            <div style={{ marginTop: 14, borderTop: `1px solid ${S.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: S.ink, marginBottom: 8 }}>
                Standardized 8-Step Rollback Execution Plan
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {STANDARDIZED_ROLLBACK_PROCEDURE.map(step => (
                  <div key={step.step} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 12, padding: "6px 0", borderBottom: `1px solid ${S.faint}` }}>
                    <span style={{ fontWeight: 800, color: S.blue, width: 60 }}>Step {step.step}:</span>
                    <span style={{ fontWeight: 700, color: S.ink, width: 160 }}><code>{step.action}</code></span>
                    <span style={{ color: S.muted, flex: 1 }}>{step.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HANDOVER PACKAGE */}
      {subTab === "handover" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: S.panel, border: `1px solid ${S.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 750, color: S.ink, textTransform: "uppercase", marginBottom: 4 }}>
              Final SHA Handover Package (12 Technical Briefings)
            </div>
            <p style={{ fontSize: 12, color: S.muted, marginBottom: 16 }}>
              All 12 governance, architecture, and empirical briefing documents generated in <code>docs/institutional-handover/</code>.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
              {[
                { name: "1. Executive Proposal", file: "EXECUTIVE_PROPOSAL.md", desc: "Strategic policy brief for the SHA CEO and Board." },
                { name: "2. Problem & Methodology", file: "PROBLEM_AND_METHODOLOGY.md", desc: "Informal sector liquidity friction analysis." },
                { name: "3. System Architecture", file: "SYSTEM_ARCHITECTURE.md", desc: "Read-only non-interference integration design." },
                { name: "4. Model Governance", file: "MODEL_GOVERNANCE.md", desc: "Model registry and separation of duties." },
                { name: "5. Evaluation Framework", file: "EMPIRICAL_EVALUATION_FRAMEWORK.md", desc: "Pre-registered protocol & zero-leakage partitions." },
                { name: "6. Data Governance", file: "DATA_GOVERNANCE.md", desc: "Statutory compliance under Kenya DPA 2019." },
                { name: "7. Security & Privacy", file: "SECURITY_AND_PRIVACY.md", desc: "Cryptographic controls and air-gap isolation." },
                { name: "8. Staged Pilot Plan", file: "CONTROLLED_PILOT_PLAN.md", desc: "5-stage progression pathway & exit criteria." },
                { name: "9. Risk Register", file: "RISK_REGISTER.md", desc: "Institutional risk matrix and mitigation strategy." },
                { name: "10. Deployment Acceptance", file: "DEPLOYMENT_ACCEPTANCE.md", desc: "Multi-domain quality gates before live adoption." },
                { name: "11. Information Request", file: "SHA_INFORMATION_REQUEST.md", desc: "Formal technical disclosure schedule for SHA." },
                { name: "12. Limitations & Questions", file: "LIMITATIONS_AND_OPEN_QUESTIONS.md", desc: "Inherent research limitations and open policy questions." }
              ].map(doc => (
                <div key={doc.file} style={{ padding: 10, borderRadius: 6, background: S.faint, border: `1px solid ${S.border}` }}>
                  <div style={{ fontWeight: 700, color: S.ink }}>{doc.name}</div>
                  <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{doc.desc}</div>
                  <div style={{ fontSize: 10, color: S.blue, marginTop: 4, fontFamily: "monospace" }}>docs/institutional-handover/{doc.file}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
