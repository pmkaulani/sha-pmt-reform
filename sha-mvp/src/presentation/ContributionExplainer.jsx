import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function ContributionExplainer({ S = {} }) {
  const [expanded, setExpanded] = useState(false);

  const blue = S.blue || "#0284c7";
  const text = S.text || "#0f172a";
  const muted = S.muted || "#64748b";

  return (
    <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, background: "#f8fafc", padding: "14px 18px", marginTop: 24, marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: text, marginBottom: 8 }}>
        How the Assessment Arrives at the Contribution Estimate
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: 12, lineHeight: 1.45, color: text }}>
        <div>
          <strong>A. Household Information:</strong> Housing, services, composition, and contextual assets. These provide context for vulnerability checks, but assets and debt are not added to earned income.
        </div>
        <div>
          <strong>B. Counted Earned Income:</strong> Resolved earned-income ledger observed over a 12-month window with stock purchases and documented business expenses deducted.
        </div>
        <div>
          <strong>C. Contribution Calculation:</strong> Statutory 2.75% rate applied to evaluated annual AGI, compared against the Regulation 17(2) minimum floor of KSh 300/month.
        </div>
      </div>

      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed #cbd5e1" }}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none",
            border: "none",
            color: blue,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4
          }}
          aria-expanded={expanded}
        >
          <span>{expanded ? "Hide statutory citations" : "View statutory citations (Legal Notice No. 49 of 2024)"}</span>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expanded && (
          <div style={{ marginTop: 8, fontSize: 11, color: muted, lineHeight: 1.5 }}>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>
                <strong>Regulation 17(1):</strong> Annual contribution for non-salaried households is calculated at 2.75% of income determined by means testing under Regulation 21.
              </li>
              <li>
                <strong>Regulation 17(2):</strong> The monthly contribution for non-salaried households cannot be less than KSh 300 per month.
              </li>
              <li>
                <strong>Regulation 18:</strong> Governs the separate process for identifying indigent households requiring financial assistance. Paying the KSh 300 floor does not determine indigence.
              </li>
              <li>
                <strong>Regulation 21:</strong> Governs means-testing instruments, scoring criteria, and administrative verification parameters.
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
