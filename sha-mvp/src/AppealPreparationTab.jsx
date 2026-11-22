import { useState } from "react";
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Paperclip,
  Download,
  ShieldAlert,
  Info
} from "lucide-react";
import {
  DISPUTE_CATEGORIES,
  EVIDENCE_CATEGORIES,
  REQUESTED_RESOLUTIONS,
  generateLocalDraftReference,
  validateChallengeData,
  createNormalizedChallengeDraft
} from "./lib/appeal-workflow.js";

const GROUNDS = [
  ["household_details", "Household or dependant details are incorrect"],
  ["income_or_liquidity", "Income, M-Pesa activity or retained balance is misunderstood"],
  ["asset_or_land", "An asset, vehicle or land detail is incorrect or incomplete"],
  ["deduction_missing", "A deduction, expense or vulnerability was not considered"],
  ["identity_or_linkage", "Records may have been linked to the wrong person or household"],
  ["other", "Another reason"],
];

const styles = {
  panel: {
    padding: 20,
    background: "#FFFFFF",
    border: "1px solid #CBD5E1",
    borderRadius: 10,
    display: "grid",
    gap: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
  },
  heading: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0F172A",
    marginBottom: 4,
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
    padding: "10px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: 7,
    fontSize: 13,
    color: "#0F172A",
    fontFamily: "inherit",
    background: "#FFFFFF"
  },
  textarea: {
    width: "100%",
    padding: 12,
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "inherit",
    resize: "vertical",
    color: "#0F172A",
    background: "#FFFFFF"
  },
  buttonPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    border: 0,
    borderRadius: 7,
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
    borderRadius: 7,
    background: "#F8FAFC",
    color: "#334155",
    fontWeight: 600,
    fontSize: 12,
    cursor: "pointer"
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
    fontWeight: 500
  }
};

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString("en-KE") : "Not available";
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function AppealPreparationTab({
  results,
  challengeDrafts = [],
  onSaveChallengeDraft
}) {
  // Assessment Details (member-entered)
  const [officialAssessmentRef, setOfficialAssessmentRef] = useState(
    ""
  );
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodStart, setPeriodStart] = useState("2026-01-01");
  const [periodEnd, setPeriodEnd] = useState("2026-12-31");
  const [assessedMonthly, setAssessedMonthly] = useState(
    ""
  );
  const [requestedMonthly, setRequestedMonthly] = useState(
    ""
  );

  // Grounds
  const [grounds, setGrounds] = useState(["household_details"]);

  // Structured Disputes
  const [disputes, setDisputes] = useState([
    {
      id: "disp-1",
      fieldKey: "household_size",
      valueAsPresented: results?.d?.householdSize ? String(results.d.householdSize) : "1",
      correctedValue: "",
      explanation: "",
      reasonMatters: "",
      evidenceTypes: []
    }
  ]);

  // Evidence Checklist & Attachments
  const [evidenceChecklist, setEvidenceChecklist] = useState(["household_dependant_doc"]);
  const [attachments, setAttachments] = useState([]);

  // Requested Action & General Explanation
  const [requestedAction, setRequestedAction] = useState("human_review");
  const [generalExplanation, setGeneralExplanation] = useState(
    "The assessed household information misrepresents our actual economic circumstances."
  );

  // Status & Saved State
  const [validationErrors, setValidationErrors] = useState({});
  const [savedDraft, setSavedDraft] = useState(null);
  const [activeTabSub, setActiveTabSub] = useState("form"); // "form" | "saved"

  const toggleGround = (value) => {
    setGrounds((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
    setSavedDraft(null);
  };

  const toggleEvidence = (key) => {
    setEvidenceChecklist((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
    setSavedDraft(null);
  };

  const handleAddDispute = () => {
    const newId = `disp-${Date.now()}-${disputes.length + 1}`;
    setDisputes((prev) => [
      ...prev,
      {
        id: newId,
        fieldKey: "other",
        valueAsPresented: "",
        correctedValue: "",
        explanation: "",
        reasonMatters: "",
        evidenceTypes: []
      }
    ]);
    setSavedDraft(null);
  };

  const handleUpdateDispute = (idx, field, val) => {
    setDisputes((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
    setSavedDraft(null);
  };

  const handleRemoveDispute = (idx) => {
    if (disputes.length <= 1) return;
    setDisputes((prev) => prev.filter((_, i) => i !== idx));
    setSavedDraft(null);
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Store METADATA ONLY — do not read or store file contents
      newAttachments.push({
        id: `att-${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified,
        uploadStatus: "LOCAL_METADATA_ONLY"
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    setSavedDraft(null);
    e.target.value = "";
  };

  const handleRemoveAttachment = (attId) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attId));
    setSavedDraft(null);
  };

  const handleSaveDraft = (e) => {
    if (e) e.preventDefault();

    const rawData = {
      assessment: {
        officialAssessmentReference: officialAssessmentRef.trim(),
        receivedDate,
        assessmentPeriodStart: periodStart,
        assessmentPeriodEnd: periodEnd,
        assessedMonthlyContribution: assessedMonthly === "" ? null : assessedMonthly,
        memberRequestedMonthlyContribution: requestedMonthly === "" ? null : requestedMonthly
      },
      grounds,
      disputes,
      evidenceChecklist,
      attachmentMetadata: attachments,
      requestedResolution: requestedAction,
      generalExplanation: generalExplanation.trim(),
      modelVersionId: results?.next?.modelVersion || results?.modelVersions?.declaredIncome?.id || "declared-income-agi-v1",
      modelParameterSnapshot: results?.adminParamsSnapshot || {},
      prototypeComparisonSnapshot: {
        modelVersionId: results?.next?.modelVersion || results?.modelVersions?.declaredIncome?.id || "declared-income-agi-v1",
        modelParameterSnapshot: results?.adminParamsSnapshot || {},
        county: results?.d?.county || null,
        householdSize: results?.d?.householdSize ?? null,
        headAge: results?.d?.headAge ?? null,
        illustrativeBaselineMonthlyKsh: results?.current?.monthly ?? null,
        proposedRulesEngineMonthlyKsh: results?.next?.monthlyContribution ?? results?.next?.monthly ?? null,
        proposedAdjustedGrossIncomeKsh: results?.next?.adjustedGrossIncome ?? null
      }
    };

    const valResult = validateChallengeData(rawData);
    if (!valResult.isValid) {
      setValidationErrors(valResult.errors);
      return;
    }

    setValidationErrors({});

    const normalized = createNormalizedChallengeDraft(
      rawData,
      {
        county: results?.d?.county,
        householdSize: results?.d?.householdSize,
        headAge: results?.d?.headAge,
        activeScenario: results?.activeScenario || "Current Scenario"
      },
      results?.d
    );

    setSavedDraft(normalized);

    if (onSaveChallengeDraft) {
      onSaveChallengeDraft(normalized);
    }
  };

  const downloadDraft = (draftToDownload = savedDraft) => {
    if (!draftToDownload) return;
    const requested = REQUESTED_RESOLUTIONS.find(r => r.key === draftToDownload.requestedResolution)?.label ||
      draftToDownload.requestedResolution;

    const groundsList = draftToDownload.grounds.map(g => {
      const match = GROUNDS.find(item => item[0] === g);
      return "- " + (match ? match[1] : g);
    }).join("\n");

    const disputeLines = draftToDownload.disputes.map((d, i) => [
      `DISPUTE ITEM ${i + 1}: ${d.fieldLabel}`,
      `  Original value as presented: ${d.valueAsPresented}`,
      `  Corrected value:             ${d.correctedValue}`,
      d.numericDifference !== null ? `  Numeric difference:          ${d.numericDifference > 0 ? "+" : ""}${d.numericDifference}` : null,
      `  Explanation:                 ${d.explanation}`,
      d.reasonMatters ? `  Reason correction matters:   ${d.reasonMatters}` : null,
    ].filter(Boolean).join("\n")).join("\n\n");

    const evidenceList = draftToDownload.evidenceChecklist.map(e => {
      const match = EVIDENCE_CATEGORIES.find(item => item.key === e);
      return "- " + (match ? match.label : e);
    }).join("\n") || "- No evidence categories selected.";

    const fileList = draftToDownload.attachmentMetadata.map(f =>
      `- ${f.name} (${formatFileSize(f.size)}) [${f.uploadStatus}]`
    ).join("\n") || "- No local files staged.";

    const statement = [
      "================================================================================",
      "SHA MEANS-TESTING ASSESSMENT CHALLENGE — LOCAL PREPARATION DRAFT",
      "================================================================================",
      `Draft Reference:    ${draftToDownload.draftReference}`,
      `Prepared On:        ${draftToDownload.createdAt}`,
      `Status:             LOCAL_DRAFT (NOT SUBMITTED TO SHA)`,
      "",
      "IMPORTANT NOTICE:",
      "This document is a locally generated preparation statement created in a research",
      "prototype. It has NOT been transmitted to the Social Health Authority (SHA),",
      "no official appeal case has been registered, and no legal review period has started.",
      "To lodge a formal dispute, submit this information through SHA's authorized",
      "appeal channels (*147# or afyayangu.go.ke).",
      "",
      "--------------------------------------------------------------------------------",
      "1. ASSESSMENT DETAILS (MEMBER-ENTERED)",
      "--------------------------------------------------------------------------------",
      `Official Assessment Reference:      ${draftToDownload.assessment.officialAssessmentReference || "Not provided by member"}`,
      `Date Assessment Received:           ${draftToDownload.assessment.receivedDate || "Not provided"}`,
      `Disputed Assessment Period:         ${draftToDownload.assessment.assessmentPeriodStart} to ${draftToDownload.assessment.assessmentPeriodEnd}`,
      `Assessed Monthly Contribution:      KSh ${money(draftToDownload.assessment.assessedMonthlyContribution)}/mo (member-supplied)`,
      draftToDownload.assessment.memberRequestedMonthlyContribution !== null
        ? `Requested Monthly Contribution:     KSh ${money(draftToDownload.assessment.memberRequestedMonthlyContribution)}/mo (member-proposed)`
        : "Requested Monthly Contribution:     Not specified",
      "",
      "--------------------------------------------------------------------------------",
      "2. GROUNDS FOR CHALLENGE",
      "--------------------------------------------------------------------------------",
      groundsList || "- None specified.",
      "",
      "--------------------------------------------------------------------------------",
      "3. STRUCTURED DISPUTED ITEMS",
      "--------------------------------------------------------------------------------",
      disputeLines || "No structured items recorded.",
      "",
      "--------------------------------------------------------------------------------",
      "4. SUPPORTING EVIDENCE CHECKLIST & STAGED DOCUMENTS",
      "--------------------------------------------------------------------------------",
      "Identified Evidence Types:",
      evidenceList,
      "",
      "Locally Staged Document Metadata (not uploaded):",
      fileList,
      "",
      "--------------------------------------------------------------------------------",
      "5. REQUESTED RESOLUTION & GENERAL EXPLANATION",
      "--------------------------------------------------------------------------------",
      `Requested Action:   ${requested}`,
      "",
      "General Explanation:",
      draftToDownload.generalExplanation,
      "",
      "--------------------------------------------------------------------------------",
      "PROTOTYPE SIMULATION COMPARISON (CONTEXTUAL REFERENCE ONLY)",
      "--------------------------------------------------------------------------------",
      `Illustrative Baseline Monthly:     KSh ${money(draftToDownload.prototypeComparisonSnapshot?.illustrativeBaselineMonthlyKsh)}`,
      `Proposed Rules-Engine Monthly:     KSh ${money(draftToDownload.prototypeComparisonSnapshot?.proposedRulesEngineMonthlyKsh)}`,
      `Proposed Adjusted Gross Income:    KSh ${money(draftToDownload.prototypeComparisonSnapshot?.proposedAdjustedGrossIncomeKsh)}`,
      "",
      "================================================================================",
      "END OF LOCAL DRAFT STATEMENT — PROTOTYPE ONLY — NOT AN OFFICIAL SHA RECORD",
      "================================================================================"
    ].join("\n");

    const blob = new Blob([statement], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${draftToDownload.draftReference}-challenge-draft.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 960, margin: "0 auto" }}>
      {/* Top Banner & Header */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 24, fontWeight: 700, color: "#0F172A" }}>
            Member Assessment Challenge Preparation
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setActiveTabSub("form")}
              style={{
                ...styles.buttonSecondary,
                background: activeTabSub === "form" ? "#0284C7" : "#F8FAFC",
                color: activeTabSub === "form" ? "#FFFFFF" : "#334155",
                borderColor: activeTabSub === "form" ? "#0284C7" : "#CBD5E1"
              }}
            >
              Drafting Workspace
            </button>
            <button
              onClick={() => setActiveTabSub("saved")}
              style={{
                ...styles.buttonSecondary,
                background: activeTabSub === "saved" ? "#0284C7" : "#F8FAFC",
                color: activeTabSub === "saved" ? "#FFFFFF" : "#334155",
                borderColor: activeTabSub === "saved" ? "#0284C7" : "#CBD5E1"
              }}
            >
              Saved Session Drafts ({challengeDrafts.length})
            </button>
          </div>
        </div>
        <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
          Prepare an evidence-backed statement identifying specific disputed items, corrected figures, and verification documents before lodging an appeal through official SHA channels.
        </div>
      </div>

      {/* Non-submission disclaimer banner */}
      <div style={{ padding: "14px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, display: "flex", gap: 12, alignItems: "center" }}>
        <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.5 }}>
          <strong>PROTOTYPE BOUNDARY — LOCAL DEMONSTRATION ONLY:</strong> Saving or downloading this statement does NOT transmit data to the Social Health Authority, does NOT open an official case, and does NOT commence a statutory appeal window.
        </div>
      </div>

      {activeTabSub === "saved" ? (
        /* Saved Drafts List View */
        <div style={styles.panel}>
          <div style={styles.heading}>
            <FileText size={18} color="#0284C7" />
            <span>Saved Challenge Drafts in this Session ({challengeDrafts.length})</span>
          </div>
          {challengeDrafts.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "#64748B", fontSize: 13, fontStyle: "italic" }}>
              No challenge drafts saved in this browser session yet. Use the Drafting Workspace to create one.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {challengeDrafts.map((draft, idx) => (
                <div key={idx} style={{ padding: 16, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                        {draft.draftReference}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#FEF3C7", color: "#92400E", borderRadius: 4 }}>
                        {draft.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                      Created: {new Date(draft.createdAt).toLocaleString("en-GB")} · Household: {draft.householdContext?.activeScenario || "Custom"} · Disputed Items: {draft.disputes.length}
                    </div>
                    <div style={{ fontSize: 12, color: "#334155", marginTop: 2 }}>
                      Assessed: <strong>KSh {money(draft.assessment.assessedMonthlyContribution)}/mo</strong>
                      {draft.assessment.officialAssessmentReference && <span> · SHA Ref: <em>{draft.assessment.officialAssessmentReference}</em></span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => downloadDraft(draft)}
                      style={styles.buttonSecondary}
                    >
                      <Download size={14} /> Download Statement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Main Drafting Form */
        <form onSubmit={handleSaveDraft} style={{ display: "grid", gap: 20 }}>
          {/* Section 1: Assessment Details */}
          <div style={styles.panel}>
            <div style={styles.heading}>
              <Info size={18} color="#0284C7" />
              <span>1. Official SHA Assessment Details (Member-Supplied)</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
              Enter the figures exactly as stated on the assessment notification you received from SHA (via SMS, *147#, or web portal). These values are entered by you and are not independently verified by this prototype.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div>
                <label style={styles.label}>Official SHA Assessment Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. SHA-2026-NBI-89412 or *147# reference"
                  value={officialAssessmentRef}
                  onChange={(e) => { setOfficialAssessmentRef(e.target.value); setSavedDraft(null); }}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Date Assessment Received *</label>
                <input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => { setReceivedDate(e.target.value); setSavedDraft(null); }}
                  style={styles.input}
                />
                {validationErrors.assessment?.receivedDate && (
                  <div style={styles.errorText}>{validationErrors.assessment.receivedDate}</div>
                )}
              </div>

              <div>
                <label style={styles.label}>Assessment Period Start *</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => { setPeriodStart(e.target.value); setSavedDraft(null); }}
                  style={styles.input}
                />
                {validationErrors.assessment?.assessmentPeriodStart && (
                  <div style={styles.errorText}>{validationErrors.assessment.assessmentPeriodStart}</div>
                )}
              </div>

              <div>
                <label style={styles.label}>Assessment Period End *</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => { setPeriodEnd(e.target.value); setSavedDraft(null); }}
                  style={styles.input}
                />
                {validationErrors.assessment?.assessmentPeriodEnd && (
                  <div style={styles.errorText}>{validationErrors.assessment.assessmentPeriodEnd}</div>
                )}
              </div>

              <div>
                <label style={styles.label}>Monthly Contribution Stated by SHA (KSh) *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 2500"
                  value={assessedMonthly}
                  onChange={(e) => { setAssessedMonthly(e.target.value); setSavedDraft(null); }}
                  style={styles.input}
                />
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                  Amount stated in your SHA assessment notice. Zero is accepted if indigent.
                </div>
                {validationErrors.assessment?.assessedMonthlyContribution && (
                  <div style={styles.errorText}>{validationErrors.assessment.assessedMonthlyContribution}</div>
                )}
              </div>

              <div>
                <label style={styles.label}>Requested Monthly Contribution (KSh, Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 300"
                  value={requestedMonthly}
                  onChange={(e) => { setRequestedMonthly(e.target.value); setSavedDraft(null); }}
                  style={styles.input}
                />
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                  Amount you believe should apply based on your actual earnings.
                </div>
                {validationErrors.assessment?.memberRequestedMonthlyContribution && (
                  <div style={styles.errorText}>{validationErrors.assessment.memberRequestedMonthlyContribution}</div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Grounds */}
          <div style={styles.panel}>
            <div style={styles.heading}>
              <span>2. Grounds for Challenging the Assessment</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {GROUNDS.map(([value, label]) => (
                <label
                  key={value}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: 11,
                    border: "1px solid " + (grounds.includes(value) ? "#BAE6FD" : "#E2E8F0"),
                    borderRadius: 8,
                    background: grounds.includes(value) ? "#F0F9FF" : "#FFFFFF",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={grounds.includes(value)}
                    onChange={() => toggleGround(value)}
                    style={{ marginTop: 3 }}
                  />
                  <span style={{ fontSize: 13, color: "#0F172A", lineHeight: 1.45 }}>{label}</span>
                </label>
              ))}
            </div>
            {validationErrors.grounds && (
              <div style={styles.errorText}>{validationErrors.grounds}</div>
            )}
          </div>

          {/* Section 3: Structured Disputed Items */}
          <div style={styles.panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={styles.heading}>
                <span>3. Specific Disputed Assessment Items</span>
              </div>
              <button
                type="button"
                onClick={handleAddDispute}
                style={styles.buttonSecondary}
              >
                <Plus size={14} /> Add Another Disputed Item
              </button>
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Identify each specific piece of data used in the assessment that you believe is inaccurate. Provide the original value, your corrected value, and why the difference matters.
            </div>

            {disputes.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  padding: 16,
                  display: "grid",
                  gap: 12
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7" }}>
                    Disputed Item #{idx + 1}
                  </span>
                  {disputes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDispute(idx)}
                      style={{ ...styles.buttonSecondary, color: "#DC2626", borderColor: "#FCA5A5" }}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={styles.label}>Disputed Category *</label>
                    <select
                      value={item.fieldKey}
                      onChange={(e) => handleUpdateDispute(idx, "fieldKey", e.target.value)}
                      style={styles.input}
                    >
                      {DISPUTE_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Original Value as Presented *</label>
                    <input
                      type="text"
                      placeholder="e.g. 1 vehicle valued at KSh 800,000 or HH size: 1"
                      value={item.valueAsPresented}
                      onChange={(e) => handleUpdateDispute(idx, "valueAsPresented", e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div>
                    <label style={styles.label}>Member's Corrected Value *</label>
                    <input
                      type="text"
                      placeholder="e.g. 0 vehicles (sold in 2024) or HH size: 4"
                      value={item.correctedValue}
                      onChange={(e) => handleUpdateDispute(idx, "correctedValue", e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Explanation of the Correction *</label>
                  <input
                    type="text"
                    placeholder="Describe why this value is incorrect and what the true situation is (min 10 characters)..."
                    value={item.explanation}
                    onChange={(e) => handleUpdateDispute(idx, "explanation", e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div>
                  <label style={styles.label}>Why This Correction Matters (Impact on Assessment)</label>
                  <input
                    type="text"
                    placeholder="e.g. Household head is supporting 3 school-age dependants; per-capita income is below threshold"
                    value={item.reasonMatters}
                    onChange={(e) => handleUpdateDispute(idx, "reasonMatters", e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>
            ))}

            {validationErrors.disputes && (
              <div style={styles.errorText}>
                {Array.isArray(validationErrors.disputes) && typeof validationErrors.disputes[0] === "string"
                  ? validationErrors.disputes[0]
                  : "Please review the disputed item fields above."}
              </div>
            )}
          </div>

          {/* Section 4: Evidence Checklist & Local Attachments */}
          <div style={styles.panel}>
            <div style={styles.heading}>
              <Paperclip size={18} color="#0284C7" />
              <span>4. Supporting Evidence Checklist & Staged Documents</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Select the evidence types you can provide and optionally stage mock verification documents. Files are retained as local demonstration metadata only.
            </div>

            <div>
              <label style={styles.label}>Evidence Types Available</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8 }}>
                {EVIDENCE_CATEGORIES.map((cat) => (
                  <label
                    key={cat.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      background: evidenceChecklist.includes(cat.key) ? "#F0F9FF" : "#F8FAFC",
                      border: "1px solid " + (evidenceChecklist.includes(cat.key) ? "#BAE6FD" : "#E2E8F0"),
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={evidenceChecklist.includes(cat.key)}
                      onChange={() => toggleEvidence(cat.key)}
                    />
                    <span>{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Local demonstration file staging */}
            <div style={{ marginTop: 10, padding: 14, background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                    Stage Verification Files (Demonstration Only)
                  </span>
                  <div style={{ fontSize: 11, color: "#64748B" }}>
                    Accepts PDF, JPG, PNG, DOCX · File metadata only · Never uploaded to remote servers
                  </div>
                </div>
                <label style={styles.buttonSecondary}>
                  <Paperclip size={13} /> Select Files
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {attachments.length > 0 ? (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: 6,
                        fontSize: 12
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FileText size={16} color="#0284C7" />
                        <span style={{ fontWeight: 600, color: "#0F172A" }}>{att.name}</span>
                        <span style={{ color: "#64748B" }}>({formatFileSize(att.size)})</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", background: "#FEF3C7", color: "#92400E", borderRadius: 4 }}>
                          LOCAL METADATA ONLY — NOT UPLOADED
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", textAlign: "center", padding: "8px 0" }}>
                  No files staged. Use "Select Files" to simulate attaching supporting proof.
                </div>
              )}
            </div>
          </div>

          {/* Section 5: General Explanation & Action */}
          <div style={styles.panel}>
            <div style={styles.heading}>
              <span>5. General Explanation & Requested Resolution</span>
            </div>

            <div>
              <label style={styles.label}>Summary Explanation for the Reviewing Officer *</label>
              <textarea
                rows={4}
                maxLength={3000}
                placeholder="Summarize the core reason for this appeal, explaining how your actual household circumstances differ from the assessment..."
                value={generalExplanation}
                onChange={(e) => { setGeneralExplanation(e.target.value); setSavedDraft(null); }}
                style={styles.textarea}
              />
              <div style={{ fontSize: 11, color: "#64748B", textAlign: "right", marginTop: 4 }}>
                {generalExplanation.length}/3000 characters (min 20)
              </div>
              {validationErrors.generalExplanation && (
                <div style={styles.errorText}>{validationErrors.generalExplanation}</div>
              )}
            </div>

            <div>
              <label style={styles.label}>Requested Resolution Outcome *</label>
              <select
                value={requestedAction}
                onChange={(e) => { setRequestedAction(e.target.value); setSavedDraft(null); }}
                style={styles.input}
              >
                {REQUESTED_RESOLUTIONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Saving creates a structured draft in your browser session for inspection in the Officer Review workspace.
              </div>
              <button
                type="submit"
                style={styles.buttonPrimary}
              >
                <CheckCircle2 size={16} /> Save Challenge Draft (Local Demo)
              </button>
            </div>
          </div>

          {/* Post-Save Confirmation Banner */}
          {savedDraft && (
            <div style={{ padding: 18, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#065F46" }}>
                    ✓ Challenge Draft Saved Locally
                  </div>
                  <div style={{ fontSize: 13, color: "#0F172A", marginTop: 4 }}>
                    Reference: <strong style={{ fontFamily: "monospace" }}>{savedDraft.draftReference}</strong> · Status: <span style={{ fontWeight: 700, color: "#B45309" }}>{savedDraft.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>
                    This draft is now available in your active session and can be examined in the planned Officer Review workspace.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadDraft(savedDraft)}
                  style={{ ...styles.buttonPrimary, background: "#0F172A" }}
                >
                  <Download size={15} /> Download Statement (.txt)
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
