import { useState } from "react";
import {
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  UserCheck,
  Download,
  Printer,
  Info,
  HelpCircle,
  Search,
  Inbox,
  Sparkles,
  Trash2
} from "lucide-react";
import {
  DEMO_REVIEW_STATUSES,
  DEMO_REVIEW_ACTIONS,
  RECOMMENDATION_OPTIONS,
  EVIDENCE_ANNOTATION_STATUSES,
  createInitialReviewRecord,
  validateReviewAction,
  getIllustrativeImpactSimulation,
  formatUnifiedCaseSummary
} from "./lib/review-workflow.js";

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("en-KE") : "N/A";
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

const styles = {
  card: {
    background: "#FFFFFF",
    border: "1px solid #CBD5E1",
    borderRadius: 10,
    padding: 20,
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
  },
  heading: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 8
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    color: "#475569",
    marginBottom: 6
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: 7,
    fontSize: 13,
    color: "#0F172A",
    background: "#FFFFFF",
    fontFamily: "inherit"
  },
  textarea: {
    width: "100%",
    padding: 11,
    border: "1px solid #CBD5E1",
    borderRadius: 7,
    fontSize: 13,
    color: "#0F172A",
    background: "#FFFFFF",
    fontFamily: "inherit",
    resize: "vertical"
  },
  buttonPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 16px",
    border: 0,
    borderRadius: 6,
    background: "#0284C7",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer"
  },
  buttonSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    border: "1px solid #CBD5E1",
    borderRadius: 6,
    background: "#F8FAFC",
    color: "#334155",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700
  }
};

export default function OfficerReviewTab({
  challengeDrafts = [],
  reviewRecords = {},
  onReviewAction,
  onEvidenceAnnotation,
  onLoadSyntheticDemo,
  onRemoveSyntheticDemo,
}) {
  const [selectedRef, setSelectedRef] = useState(
    challengeDrafts[0]?.draftReference || null
  );

  // Active form state for new officer review action
  const [selectedAction, setSelectedAction] = useState(DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION);
  const [finding, setFinding] = useState("");
  const [recommendation, setRecommendation] = useState("DEMO_RECOMMEND_ADJUSTMENT");
  const [reason, setReason] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [reviewerLabel, setReviewerLabel] = useState("Demonstration Reviewer");
  const [actionError, setActionError] = useState("");

  // Locate the currently selected draft
  const selectedDraft = challengeDrafts.find(d => d.draftReference === selectedRef) ||
    challengeDrafts[0] ||
    null;

  // Locate the associated review record or initialize a fallback
  const activeRecord = selectedDraft
    ? (reviewRecords[selectedDraft.draftReference] || createInitialReviewRecord(selectedDraft.draftReference))
    : null;

  // Safeguarded calculation impact simulation
  const impactSim = selectedDraft
    ? getIllustrativeImpactSimulation(selectedDraft)
    : null;

  const hasSyntheticDemo = challengeDrafts.some(d => d.isSyntheticDemoCase || d.draftReference === "LOCAL-DRAFT-20261121-MEETING-SAMPLE");

  const handleSelectDraft = (ref) => {
    setSelectedRef(ref);
    setActionError("");
    setFinding("");
    setReason("");
    setAdditionalInfo("");
  };

  const handleUpdateEvidenceAnnotation = (attName, statusKey) => {
    if (!selectedDraft || !onEvidenceAnnotation) return;
    onEvidenceAnnotation(selectedDraft.draftReference, attName, statusKey);
  };

  const handleSubmitAction = (e) => {
    if (e) e.preventDefault();
    if (!selectedDraft) return;

    const actionData = {
      finding,
      recommendation: selectedAction === DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION ? recommendation : null,
      reason: selectedAction === DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION || selectedAction === DEMO_REVIEW_ACTIONS.REFER_MANUAL ? reason : "",
      additionalInformationRequested: selectedAction === DEMO_REVIEW_ACTIONS.REQUEST_INFORMATION ? additionalInfo : "",
      evidenceNotes,
      evidenceAnnotations,
      reviewerLabel: reviewerLabel.trim() || "Demonstration Reviewer",
      simulatedImpactSummary: impactSim?.canSimulate ? {
        prototypeOriginalMonthlyKsh: impactSim.prototypeOriginalMonthlyKsh,
        prototypeCorrectedMonthlyKsh: impactSim.prototypeCorrectedMonthlyKsh,
        prototypeMonthlyDifferenceKsh: impactSim.prototypeMonthlyDifferenceKsh
      } : null
    };

    const validation = validateReviewAction(selectedAction, actionData);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      setActionError(firstError || "Please review the required action fields.");
      return;
    }

    setActionError("");

    if (onReviewAction) {
      onReviewAction(selectedDraft.draftReference, {
        action: selectedAction,
        ...actionData
      });
      setFinding("");
      setReason("");
      setAdditionalInfo("");
    }
  };

  const handleDownloadUnifiedSummary = () => {
    if (!selectedDraft) return;
    const summaryText = formatUnifiedCaseSummary(selectedDraft, activeRecord, impactSim);
    const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDraft.draftReference}-case-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintA4Summary = () => {
    window.print();
  };

  return (
    <div className="officer-workspace" style={{ display: "grid", gap: 20, maxWidth: 1040, margin: "0 auto" }}>
      <style>{`
        @media print {
          body { background: #FFFFFF !important; color: #000000 !important; }
          .no-print, .officer-queue-panel, .officer-action-form { display: none !important; }
          .officer-case-details { width: 100% !important; border: 1px solid #94A3B8 !important; box-shadow: none !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
      `}</style>

      {/* Workspace Header */}
      <div className="no-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 24, fontWeight: 700, color: "#0F172A" }}>
            Assessment Challenge Review — Demonstration Workspace
          </div>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            Demonstration Staff Role · Illustrative Review Flow
          </div>
        </div>
        <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
          Examine disputed member assessment items, inspect supporting evidence metadata, evaluate potential calculation impacts, and record a reasoned review determination.
        </div>
      </div>

      {/* Permanent Notice */}
      <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, display: "flex", gap: 12, alignItems: "center" }}>
        <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.5 }}>
          <strong>PROTOTYPE DEMONSTRATION ONLY:</strong> This workspace is not connected to SHA staff systems. No official case is created, updated, approved, or closed here.
        </div>
      </div>

      {/* Main Grid: Queue on Left / Details on Right */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, alignItems: "start" }}>
        {/* Left Column: Challenge Queue */}
        <div className="officer-queue-panel no-print" style={{ display: "grid", gap: 16 }}>
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={styles.heading}>
                <Inbox size={18} color="#0284C7" />
                <span>Challenge Review Queue ({challengeDrafts.length})</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {!hasSyntheticDemo ? (
                  <button
                    type="button"
                    onClick={onLoadSyntheticDemo}
                    style={{ ...styles.buttonSecondary, background: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" }}
                  >
                    <Sparkles size={13} /> Load Sample Demo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRemoveSyntheticDemo}
                    style={{ ...styles.buttonSecondary, color: "#DC2626", borderColor: "#FCA5A5" }}
                  >
                    <Trash2 size={13} /> Remove Sample
                  </button>
                )}
              </div>
            </div>

            {challengeDrafts.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "#64748B", fontSize: 13, background: "#F8FAFC", borderRadius: 8, border: "1px dashed #CBD5E1" }}>
                <FileText size={32} color="#94A3B8" style={{ margin: "0 auto 8px", opacity: 0.8 }} />
                <div style={{ fontWeight: 600, color: "#334155", marginBottom: 4 }}>No challenges in demonstration queue</div>
                <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                  Go to the <strong>Prepare Challenge</strong> tab to save a draft, or click below to load a meeting sample challenge.
                </div>
                <button
                  type="button"
                  onClick={onLoadSyntheticDemo}
                  style={styles.buttonPrimary}
                >
                  <Sparkles size={14} /> Load Synthetic Meeting Demonstration
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {challengeDrafts.map((draft) => {
                  const record = reviewRecords[draft.draftReference] || createInitialReviewRecord(draft.draftReference);
                  const isSelected = selectedDraft?.draftReference === draft.draftReference;
                  return (
                    <div
                      key={draft.draftReference}
                      onClick={() => handleSelectDraft(draft.draftReference)}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        border: `1px solid ${isSelected ? "#0284C7" : "#E2E8F0"}`,
                        background: isSelected ? "#F0F9FF" : "#FFFFFF",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 2px 4px rgba(2,132,199,0.08)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: isSelected ? "#0369A1" : "#0F172A" }}>
                          {draft.draftReference}
                        </div>
                        <span style={{
                          ...styles.badge,
                          background: record.currentStatus === DEMO_REVIEW_STATUSES.COMPLETED ? "#DCFCE7" :
                            record.currentStatus === DEMO_REVIEW_STATUSES.RECOMMENDATION_RECORDED ? "#FEF3C7" :
                            record.currentStatus === DEMO_REVIEW_STATUSES.INFO_REQUESTED ? "#EDE9FE" : "#F1F5F9",
                          color: record.currentStatus === DEMO_REVIEW_STATUSES.COMPLETED ? "#166534" :
                            record.currentStatus === DEMO_REVIEW_STATUSES.RECOMMENDATION_RECORDED ? "#92400E" :
                            record.currentStatus === DEMO_REVIEW_STATUSES.INFO_REQUESTED ? "#5B21B6" : "#475569"
                        }}>
                          {record.currentStatus}
                        </span>
                      </div>

                      {draft.isSyntheticDemoCase && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ ...styles.badge, background: "#FEF3C7", color: "#92400E", fontSize: 10 }}>
                            SYNTHETIC DEMONSTRATION DATA — NOT A REAL MEMBER CASE
                          </span>
                        </div>
                      )}

                      <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>
                        Applicant Persona: <strong>{draft.householdContext?.activeScenario || "Custom"}</strong> <span style={{ fontSize: 10, color: "#64748B" }}>(Synthetic)</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 11, color: "#64748B" }}>
                        <span>Assessed: <strong>KSh {money(draft.assessment.assessedMonthlyContribution)}/mo</strong></span>
                        <span>Disputes: <strong>{draft.disputes.length}</strong></span>
                        <span>{new Date(draft.createdAt).toLocaleDateString("en-GB")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Case Examination & Reviewer Console */}
        {selectedDraft ? (
          <div className="officer-case-details" style={{ display: "grid", gap: 16 }}>
            {/* 1. Case Header & Assessment Identity */}
            <div style={styles.card}>
              {selectedDraft.isSyntheticDemoCase && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: "#92400E" }}>
                  ⚠️ SYNTHETIC DEMONSTRATION DATA — NOT A REAL MEMBER CASE
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, borderBottom: "1px solid #E2E8F0", paddingBottom: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: "#0F172A" }}>
                      {selectedDraft.draftReference}
                    </span>
                    <span style={{ ...styles.badge, background: "#FEF3C7", color: "#92400E" }}>
                      {activeRecord?.currentStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Session Created: {new Date(selectedDraft.createdAt).toLocaleString("en-GB")} · Household: {selectedDraft.householdContext?.activeScenario || "Custom"} (Synthetic)
                  </div>
                </div>
                <div className="no-print" style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={handlePrintA4Summary}
                    style={styles.buttonSecondary}
                  >
                    <Printer size={13} /> Print Case Summary (A4)
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadUnifiedSummary}
                    style={styles.buttonSecondary}
                  >
                    <Download size={13} /> Download Summary (.txt)
                  </button>
                </div>
              </div>

              {/* Assessment details grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Official Assessment Ref</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>
                    {selectedDraft.assessment.officialAssessmentReference || "Not provided by member"}
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>Member-entered · Unverified</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Date Received</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>
                    {selectedDraft.assessment.receivedDate || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Disputed Period</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginTop: 2 }}>
                    {selectedDraft.assessment.assessmentPeriodStart} to {selectedDraft.assessment.assessmentPeriodEnd}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Member-Reported SHA Assessed</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#DC2626", marginTop: 2 }}>
                    KSh {money(selectedDraft.assessment.assessedMonthlyContribution)}/mo
                  </div>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>Supplied by member · Unverified</div>
                </div>
              </div>

              {/* Member General Statement */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 4 }}>
                  Member's Summary Statement & Requested Outcome
                </div>
                <div style={{ fontSize: 13, color: "#0F172A", background: "#FFFFFF", border: "1px solid #E2E8F0", padding: 12, borderRadius: 6, lineHeight: 1.5 }}>
                  "{selectedDraft.generalExplanation}"
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 12, color: "#475569" }}>
                  <span>Requested Action: <strong>{selectedDraft.requestedResolution}</strong></span>
                  {selectedDraft.assessment.memberRequestedMonthlyContribution !== null && (
                    <span>Member Proposed Contribution: <strong>KSh {money(selectedDraft.assessment.memberRequestedMonthlyContribution)}/mo</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Structured Comparison (Original vs Corrected) */}
            <div style={styles.card}>
              <div style={styles.heading}>
                <FileCheck size={18} color="#0284C7" />
                <span>Original Assessment Data vs. Member Correction ({selectedDraft.disputes.length})</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                Side-by-side comparison of data points disputed by the member. Original figures reflect the member-reported assessment values.
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {selectedDraft.disputes.map((disp, i) => (
                  <div key={disp.id || i} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, background: "#FFFFFF" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7" }}>
                        Item #{i + 1}: {disp.fieldLabel}
                      </span>
                      {disp.numericDifference !== null && (
                        <span style={{ ...styles.badge, background: "#EFF6FF", color: "#1D4ED8" }}>
                          Delta: {disp.numericDifference > 0 ? "+" : ""}{disp.numericDifference}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                      <div style={{ background: "#FEF2F2", padding: 10, borderRadius: 6, border: "1px solid #FECACA" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", textTransform: "uppercase" }}>Original As Presented</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginTop: 4 }}>{disp.valueAsPresented}</div>
                      </div>
                      <div style={{ background: "#F0FDF4", padding: 10, borderRadius: 6, border: "1px solid #BBF7D0" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>Member's Corrected Value</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginTop: 4 }}>{disp.correctedValue}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                      <div>• <strong>Explanation:</strong> {disp.explanation}</div>
                      {disp.reasonMatters && <div>• <strong>Why it matters:</strong> {disp.reasonMatters}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Calculation Impact Safeguard */}
            <div style={{ ...styles.card, borderLeft: impactSim?.canSimulate ? "4px solid #0284C7" : "4px solid #F59E0B" }}>
              <div style={styles.heading}>
                <Info size={18} color={impactSim?.canSimulate ? "#0284C7" : "#D97706"} />
                <span>Calculation Impact Safeguard (Safe Model Comparison)</span>
              </div>

              {impactSim?.canSimulate ? (
                <div>
                  <div style={{ fontSize: 13, color: "#0F172A", marginBottom: 10 }}>
                    The disputed field (<strong>{impactSim.mappedFieldLabel}</strong>) can be safely mapped to prototype rules. Below, the original input snapshot is compared against the corrected input snapshot using the exact same calculation function.
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, background: "#F0F9FF", padding: 14, borderRadius: 8, border: "1px solid #BAE6FD" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#0369A1", fontWeight: 700, textTransform: "uppercase" }}>1. Member-Reported SHA Assessed</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#DC2626", marginTop: 2 }}>
                        KSh {money(impactSim.memberReportedMonthlyKsh)}/mo
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>Supplied by member · Unverified</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: "#0369A1", fontWeight: 700, textTransform: "uppercase" }}>2. Original Prototype Scenario</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                        KSh {money(impactSim.prototypeOriginalMonthlyKsh)}/mo
                      </div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>From saved input snapshot ({impactSim.mappedFieldLabel}: {impactSim.originalInputValue})</div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: "#0369A1", fontWeight: 700, textTransform: "uppercase" }}>3. Corrected Prototype Scenario</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#0284C7", marginTop: 2 }}>
                        KSh {money(impactSim.prototypeCorrectedMonthlyKsh)}/mo
                      </div>
                      <div style={{ fontSize: 11, color: impactSim.prototypeMonthlyDifferenceKsh < 0 ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                        {impactSim.prototypeMonthlyDifferenceKsh < 0 ? "" : "+"}{money(impactSim.prototypeMonthlyDifferenceKsh)} KSh vs Original Prototype
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 8, fontStyle: "italic" }}>
                    * {impactSim.disclaimer}
                  </div>
                </div>
              ) : (
                <div style={{ background: "#FFFBEB", padding: 14, borderRadius: 8, border: "1px solid #FDE68A" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#B45309", marginBottom: 4 }}>
                    {impactSim?.reason || "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED."}
                  </div>
                  <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
                    {impactSim?.detail || "Disputed values cannot be mapped safely to automated recalculation. A field investigation or document review is required before any contribution adjustment."}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Supporting Evidence Review */}
            <div style={styles.card}>
              <div style={styles.heading}>
                <FileText size={18} color="#0284C7" />
                <span>Supporting Evidence Inspection</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 10 }}>
                Review staged evidence categories and attachment metadata. Staged files represent local demonstration metadata only. Document contents have not been uploaded, inspected, or verified by this prototype.
              </div>

              {/* Checklist items */}
              <div style={{ marginBottom: 12 }}>
                <div style={styles.label}>Member-Declared Evidence Types:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedDraft.evidenceChecklist.length === 0 ? (
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>No categories selected by member.</span>
                  ) : (
                    selectedDraft.evidenceChecklist.map((cat, idx) => (
                      <span key={idx} style={{ ...styles.badge, background: "#F1F5F9", color: "#334155" }}>
                        ✓ {cat.replace(/_/g, " ")}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Attachment Metadata Table */}
              <div style={{ marginTop: 10 }}>
                <div style={styles.label}>Staged Demonstration Files ({selectedDraft.attachmentMetadata.length}):</div>
                {selectedDraft.attachmentMetadata.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", padding: "8px 0" }}>
                    No files staged for this challenge.
                  </div>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left" }}>
                        <th style={{ padding: "8px 10px" }}>Document Name</th>
                        <th style={{ padding: "8px 10px" }}>Size</th>
                        <th style={{ padding: "8px 10px" }}>Type</th>
                        <th style={{ padding: "8px 10px" }}>Demonstration Status</th>
                        <th style={{ padding: "8px 10px" }}>Review Annotation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDraft.attachmentMetadata.map((att) => {
                        const currentAnno = activeRecord?.evidenceAnnotations?.[att.name] || "DEMO_METADATA_NOTED";
                        return (
                          <tr key={att.name} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0F172A" }}>{att.name}</td>
                            <td style={{ padding: "8px 10px", color: "#64748B" }}>{formatFileSize(att.size)}</td>
                            <td style={{ padding: "8px 10px", color: "#64748B" }}>{att.type}</td>
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{ ...styles.badge, background: "#FEF3C7", color: "#92400E" }}>
                                {att.uploadStatus}
                              </span>
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <select
                                value={currentAnno}
                                onChange={(e) => handleUpdateEvidenceAnnotation(att.name, e.target.value)}
                                style={{ ...styles.input, padding: "4px 8px", fontSize: 11 }}
                              >
                                {EVIDENCE_ANNOTATION_STATUSES.map(s => (
                                  <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Reviewer evidence notes */}
              <div style={{ marginTop: 12 }}>
                <label style={styles.label}>Reviewer Observations on Evidence</label>
                <input
                  type="text"
                  placeholder="e.g. Staged metadata for birth certificates noted; contents have not been uploaded or examined in this prototype..."
                  value={evidenceNotes}
                  onChange={(e) => setEvidenceNotes(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            {/* 5. Officer Review Action Console */}
            <div className="officer-action-form no-print" style={{ ...styles.card, border: "2px solid #0284C7" }}>
              <div style={styles.heading}>
                <UserCheck size={18} color="#0284C7" />
                <span>Officer Action & Reasoned Determination</span>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
                Record a review event. Substantive decisions require entering a reasoned finding and justification.
              </div>

              <form onSubmit={handleSubmitAction} style={{ display: "grid", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={styles.label}>Select Review Action *</label>
                    <select
                      value={selectedAction}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      style={styles.input}
                    >
                      <option value={DEMO_REVIEW_ACTIONS.BEGIN_REVIEW}>1. Begin Review (Move to Under Review)</option>
                      <option value={DEMO_REVIEW_ACTIONS.REQUEST_INFORMATION}>2. Request Additional Information</option>
                      <option value={DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION}>3. Record Proposed Recommendation</option>
                      <option value={DEMO_REVIEW_ACTIONS.REFER_MANUAL}>4. Refer for Manual CHP Assessment</option>
                      <option value={DEMO_REVIEW_ACTIONS.COMPLETE_REVIEW}>5. Complete Demonstration Review</option>
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Reviewer Identity Label</label>
                    <input
                      type="text"
                      value={reviewerLabel}
                      onChange={(e) => setReviewerLabel(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                {selectedAction === DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION && (
                  <div>
                    <label style={styles.label}>Proposed Recommendation Outcome *</label>
                    <select
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      style={styles.input}
                    >
                      {RECOMMENDATION_OPTIONS.map(opt => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedAction === DEMO_REVIEW_ACTIONS.REQUEST_INFORMATION && (
                  <div>
                    <label style={styles.label}>Additional Documents / Clarification Requested *</label>
                    <input
                      type="text"
                      placeholder="e.g. Certified M-Pesa statements for the last 6 months or official tenancy lease agreement..."
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                )}

                <div>
                  <label style={styles.label}>Reasoned Finding / Examination Summary *</label>
                  <textarea
                    rows={3}
                    placeholder="Document the examination findings, evidence considered, and factual conclusions (min 10 characters)..."
                    value={finding}
                    onChange={(e) => setFinding(e.target.value)}
                    style={styles.textarea}
                  />
                </div>

                {(selectedAction === DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION || selectedAction === DEMO_REVIEW_ACTIONS.REFER_MANUAL) && (
                  <div>
                    <label style={styles.label}>Detailed Rationale & Justification *</label>
                    <textarea
                      rows={2}
                      placeholder="Explain the policy and economic justification for this recommendation (min 10 characters)..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      style={styles.textarea}
                    />
                  </div>
                )}

                {actionError && (
                  <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 600 }}>
                    ⚠️ {actionError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>
                    Action appends an immutable event to the case history.
                  </span>
                  <button type="submit" style={styles.buttonPrimary}>
                    Commit Demonstration Review Action
                  </button>
                </div>
              </form>
            </div>

            {/* 6. Append-Only Review History Log */}
            <div style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={styles.heading}>
                  <Clock size={18} color="#0284C7" />
                  <span>Case Review History & Event Log ({activeRecord?.events.length || 0})</span>
                </div>
                <span style={{ fontSize: 11, color: "#64748B" }}>Append-only ledger</span>
              </div>

              {!activeRecord || activeRecord.events.length === 0 ? (
                <div style={{ padding: 16, background: "#F8FAFC", borderRadius: 8, fontSize: 12, color: "#64748B", textAlign: "center", fontStyle: "italic" }}>
                  No review actions recorded for this draft yet. Use the console above to record findings.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {activeRecord.events.map((ev, i) => (
                    <div key={ev.id || i} style={{ padding: 12, background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ fontWeight: 700, color: "#0F172A" }}>
                          Event #{i + 1}: <span style={{ color: "#0284C7" }}>{ev.action}</span>
                        </div>
                        <span style={{ fontSize: 11, color: "#64748B" }}>
                          {new Date(ev.timestamp).toLocaleString("en-GB")} · Actor: {ev.actorLabel}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, color: "#475569" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11 }}>{ev.previousStatus}</span>
                        <ArrowRight size={12} />
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#0284C7" }}>{ev.newStatus}</span>
                      </div>

                      {ev.finding && (
                        <div style={{ marginTop: 6, color: "#0F172A" }}>
                          <strong>Finding:</strong> {ev.finding}
                        </div>
                      )}

                      {ev.recommendation && (
                        <div style={{ marginTop: 4, color: "#047857" }}>
                          <strong>Recommendation:</strong> {ev.recommendation}
                        </div>
                      )}

                      {ev.reason && (
                        <div style={{ marginTop: 4, color: "#475569" }}>
                          <strong>Reason:</strong> {ev.reason}
                        </div>
                      )}

                      {ev.additionalInformationRequested?.length > 0 && (
                        <div style={{ marginTop: 4, color: "#7C3AED" }}>
                          <strong>Requested Information:</strong> {ev.additionalInformationRequested.join("; ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10, borderTop: "1px dashed #E2E8F0", paddingTop: 8 }}>
                LOCAL DEMONSTRATION REVIEW HISTORY — NOT AN OFFICIAL SHA AUDIT RECORD.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...styles.card, textAlign: "center", padding: 40, color: "#64748B" }}>
            Select a challenge from the queue to examine its details.
          </div>
        )}
      </div>
    </div>
  );
}
