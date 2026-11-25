import React from "react";
import { ArrowRight, AlertCircle, ShoppingBag, CheckCircle2 } from "lucide-react";

export default function DemoProblemStatement({ onStart, S = {} }) {
  const blue = S.blue || "#2563eb";
  const text = S.text || "#0f172a";
  const muted = S.muted || "#64748b";
  const surface = S.surface || "#ffffff";
  const border = S.border || "#e2e8f0";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px" }}>
      {/* Eyebrow */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: blue, marginBottom: 8 }}>
        SHA PMT REFORM · GUIDED DEMONSTRATION
      </div>

      {/* Main Title */}
      <h1 style={{ fontSize: 28, fontWeight: 800, color: text, lineHeight: 1.25, marginBottom: 16 }}>
        How do we make a household contribution understandable?
      </h1>

      {/* Intro Narrative */}
      <p style={{ fontSize: 15, color: text, lineHeight: 1.6, marginBottom: 24 }}>
        Many households outside salaried employment do not earn a predictable monthly salary. A small business may collect money that must be used to replace stock. A farmer may earn most of their income during a harvest. A casual worker may earn different amounts each month. Money received may also include loans, reimbursements, family support or funds held for other people.
      </p>

      {/* Mama Wanjiku Kiosk Example Card */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "24px 20px", marginBottom: 28, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: blue }}>
            <ShoppingBag size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", color: muted }}>
              An illustrative small business (Retail Market Trader)
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: text }}>
              Wanjiru's retail market stall in Nakuru
            </div>
          </div>
        </div>

        {/* Visual Arithmetic Table */}
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: 16, border: "1px solid #e2e8f0", marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 14, color: text }}>
            <span>Money collected from customers (Gross Turnover)</span>
            <strong>KSh 45,000/mo <span style={{ fontSize: 12, color: muted }}>(KSh 540,000/yr)</span></strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 14, color: "#dc2626" }}>
            <span>Stock replacement and operating costs</span>
            <strong>− KSh 15,000/mo <span style={{ fontSize: 12, color: "#dc2626" }}>(− KSh 180,000/yr)</span></strong>
          </div>
          <div style={{ borderTop: "2px solid #cbd5e1", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16, fontWeight: 800, color: text }}>
            <span>Net earnings recognised by income ledger</span>
            <span style={{ color: "#059669" }}>KSh 30,000/mo <span style={{ fontSize: 13, color: "#059669" }}>(KSh 360,000/yr)</span></span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: text, background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "10px 12px", borderRadius: 6 }}>
          <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Key principle:</strong> Money collected by a business is not automatically the money available to support the household. Operating costs and stock must be accounted for first.
          </span>
        </div>
      </div>

      {/* The Core Challenge */}
      <div style={{ background: "#f8fafc", border: `1px solid ${border}`, borderRadius: 10, padding: 20, marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 8 }}>
          The explainability challenge
        </h2>
        <p style={{ fontSize: 14, color: muted, lineHeight: 1.6, marginBottom: 12 }}>
          A contribution estimate is difficult to understand when a household sees only a final assigned amount. People need to know what information was used, how income was treated, how the contribution was calculated, and which details they can question or correct.
        </p>
        <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
          The challenge is to make the assessment understandable, traceable and correctable — not simply to produce an algorithmic score.
        </div>
      </div>

      {/* Action Button */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <button
          type="button"
          onClick={onStart}
          style={{
            background: blue,
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            padding: "14px 28px",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
            transition: "transform 0.15s, background 0.15s"
          }}
        >
          <span>Let's assess a household</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* Prototype Disclosure */}
      <div style={{ textAlign: "center", fontSize: 11, color: muted, lineHeight: 1.5 }}>
        This is a research prototype demonstrating transparent assessment, itemised receipts, and correction workflows. It is not the official SHA means-testing instrument.
      </div>
    </div>
  );
}
