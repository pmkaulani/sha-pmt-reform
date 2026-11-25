import React from "react";
import { ArrowRight } from "lucide-react";

export default function DemoProblemStatement({ onStart, S = {} }) {
  const blue = S.blue || "#0284c7";
  const text = S.text || "#0f172a";
  const muted = S.muted || "#64748b";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px" }}>
      {/* Eyebrow */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: blue, marginBottom: 8 }}>
        SHA PMT REFORM · RESEARCH DEMONSTRATION
      </div>

      {/* Title */}
      <h1 style={{ fontSize: 26, fontWeight: 800, color: text, lineHeight: 1.3, marginBottom: 16 }}>
        Why should a household contribution be understandable?
      </h1>

      {/* Short Problem */}
      <p style={{ fontSize: 15, color: text, lineHeight: 1.6, marginBottom: 20 }}>
        For households outside salaried employment, assessing income is notoriously difficult. Small market traders, artisans, and casual workers do not earn a predictable monthly salary. Money flowing through a business stall or mobile wallet frequently includes stock purchases, customer credit, debt repayments, or funds held for relatives.
      </p>

      {/* Wanjiru Example (Small Excel-style 3-line calculation) */}
      <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, background: "#ffffff", padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: muted, marginBottom: 10 }}>
          Illustrative Example: Wanjiru's Retail Market Stall in Nakuru
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "ui-monospace, monospace" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "6px 0", color: text }}>Gross sales (money collected from customers):</td>
              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600 }}>KSh 45,000 / month</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "6px 0", color: "#dc2626" }}>Business expenses (stock replacement & stall fees):</td>
              <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>− KSh 15,000 / month</td>
            </tr>
            <tr style={{ borderTop: "2px solid #94a3b8" }}>
              <td style={{ padding: "8px 0 4px 0", fontWeight: 700, color: text }}>Net earnings recognised by income ledger:</td>
              <td style={{ padding: "8px 0 4px 0", textAlign: "right", fontWeight: 800, color: "#16a34a" }}>KSh 30,000 / month</td>
            </tr>
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: muted, marginTop: 8, fontStyle: "italic" }}>
          Key principle: Business turnover is not household income. Replacing stock is a necessary cost of staying in business.
        </div>
      </div>

      {/* Core Question */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: text, lineHeight: 1.5, margin: 0 }}>
          When an assessment assigns a contribution figure, the household must be able to see:{" "}
          <span style={{ color: blue }}>
            What information was used, how did it affect the estimate, and what can the household challenge?
          </span>
        </p>
      </div>

      {/* One clear action */}
      <div style={{ textAlign: "center" }}>
        <button
          type="button"
          onClick={onStart}
          style={{
            background: blue,
            color: "#ffffff",
            border: "none",
            borderRadius: 4,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}
        >
          <span>Start Household Assessment</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
