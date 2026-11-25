import React from "react";
import { Info, HelpCircle, Check, ChevronDown, ChevronUp } from "lucide-react";

export default function ContributionExplainer({ S = {} }) {
  const [expanded, setExpanded] = React.useState(false);

  const blue = S.blue || "#2563eb";
  const text = S.text || "#0f172a";
  const muted = S.muted || "#64748b";
  const surface = S.surface || "#ffffff";
  const border = S.border || "#e2e8f0";

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <HelpCircle size={18} color={blue} />
        <h3 style={{ fontSize: 15, fontWeight: 700, color: text, margin: 0 }}>
          How do we arrive at the contribution estimate?
        </h3>
      </div>

      <p style={{ fontSize: 13, color: text, lineHeight: 1.5, marginBottom: 12 }}>
        To make healthcare contributions understandable and fair, this prototype keeps three categories strictly separate:
      </p>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#f8fafc", padding: 10, borderRadius: 6 }}>
          <span style={{ background: blue, color: "#fff", width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            A
          </span>
          <div>
            <strong style={{ fontSize: 13, color: text }}>Information about your household:</strong>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>
              Household size, county, head of household age, living circumstances, assets and digital accounts. These provide vital context for verification and vulnerability checks, but assets and loans are NOT added directly to income.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#f8fafc", padding: 10, borderRadius: 6 }}>
          <span style={{ background: blue, color: "#fff", width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            B
          </span>
          <div>
            <strong style={{ fontSize: 13, color: text }}>Counted earned income:</strong>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>
              Money actually earned from active livelihoods (business net profit, farm proceeds, wages), observed over a full 12-month calendar window with stock purchases and documented operating expenses deducted. Loans, reimbursements and group funds are excluded from earned income.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#f8fafc", padding: 10, borderRadius: 6 }}>
          <span style={{ background: blue, color: "#fff", width: 22, height: 22, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            C
          </span>
          <div>
            <strong style={{ fontSize: 13, color: text }}>The contribution calculation:</strong>
            <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>
              The statutory 2.75% annual rate is applied to the counted annual Adjusted Gross Income (AGI). The monthly equivalent is compared against the statutory minimum floor of KSh 300/month.
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Statutory Disclosure */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none",
          border: "none",
          color: blue,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 4
        }}
      >
        <span>{expanded ? "Hide statutory rules" : "Learn more about the statutory rules (Legal Notice No. 49 of 2024)"}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div style={{ marginTop: 12, padding: 12, background: "#f1f5f9", borderRadius: 6, fontSize: 11, color: text, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Social Health Insurance (General) Regulations, 2024 Citations:
          </div>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            <li>
              <strong>Regulation 17(1):</strong> Annual contribution for non-salaried households is calculated at 2.75% of the proportion of household income determined by the means-testing instrument under Regulation 21.
            </li>
            <li>
              <strong>Regulation 17(2):</strong> The monthly contribution for non-salaried households cannot be less than KSh 300 per month.
            </li>
            <li>
              <strong>Regulation 18:</strong> Provides the separate institutional process for financial assistance for indigent households. Paying the KSh 300 floor does not determine that a household is indigent.
            </li>
            <li>
              <strong>Regulation 21:</strong> Prescribes the means-testing framework considering housing characteristics, services, and socioeconomic indicators.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
