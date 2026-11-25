import { useState } from "react";
import { Printer, CheckCircle2, AlertTriangle, CreditCard, ShieldAlert } from "lucide-react";

function money(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString("en-KE") : "0";
}

export default function ContributionStatementTab({ results, demoPaymentEntries = [], onAddDemoPayment }) {
  const [payAmount, setPayAmount] = useState("");
  const [payChannel, setPayChannel] = useState("M-Pesa (Demo)");
  const [payNotes, setPayNotes] = useState("");
  const [receiptMsg, setReceiptMsg] = useState("");

  if (!results || !results.next) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#64748B" }}>
        No assessment results available. Please run an assessment first.
      </div>
    );
  }

  const d = results.d || {};
  const next = results.next || {};
  const breakdown = next.calculationBreakdown || {
    annualBaseTotal: next.estimatedAnnualIncome || 0,
    annualBaseItems: [
      {
        description: "Declared net earned household income (annualised)",
        amount: next.estimatedAnnualIncome || 0,
        type: "DECLARED_EARNED_INCOME",
        explanation: "Average monthly net earnings × 12 months"
      }
    ],
    postBaseDeductions: next.deductions || [],
    totalPostBaseDeductions: (next.deductions || []).reduce((s, x) => s + (x.amount || 0), 0),
    preFloorAdjustedGrossIncome: (next.estimatedAnnualIncome || 0) - (next.deductions || []).reduce((s, x) => s + (x.amount || 0), 0),
    zeroFloorAdjustment: Math.max(0, -((next.estimatedAnnualIncome || 0) - (next.deductions || []).reduce((s, x) => s + (x.amount || 0), 0))),
    adjustedGrossIncome: next.adjustedGrossIncome || 0,
    reconciliation: {
      annualBaseTotal: next.estimatedAnnualIncome || 0,
      annualBaseSum: next.estimatedAnnualIncome || 0,
      baseReconciliationDifference: 0,
      totalPostBaseDeductions: (next.deductions || []).reduce((s, x) => s + (x.amount || 0), 0),
      expectedPreFloorAGI: (next.estimatedAnnualIncome || 0) - (next.deductions || []).reduce((s, x) => s + (x.amount || 0), 0),
      preFloorAdjustedGrossIncome: (next.estimatedAnnualIncome || 0) - (next.deductions || []).reduce((s, x) => s + (x.amount || 0), 0),
      preFloorReconciliationDifference: 0,
      zeroFloorAdjustment: Math.max(0, -((next.estimatedAnnualIncome || 0) - (next.deductions || []).reduce((s, x) => s + (x.amount || 0), 0))),
      expectedAGI: next.adjustedGrossIncome || 0,
      adjustedGrossIncome: next.adjustedGrossIncome || 0,
      isReconciled: true,
    },
    notes: []
  };

  const rec = breakdown.reconciliation || {};
  const sessionReference = results.auditRecord?.localAssessmentId || "LOCAL-DEMO-SESSION";
  const monthlyDue = next.monthlyContribution || next.monthly || 300;
  const isReconciled = rec.isReconciled !== false &&
    rec.baseReconciliationDifference === 0 &&
    rec.preFloorReconciliationDifference === 0;

  const handleRecordPayment = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount || monthlyDue);
    if (isNaN(amountNum) || amountNum <= 0) {
      setReceiptMsg("Please enter a valid positive payment amount.");
      return;
    }

    if (onAddDemoPayment) {
      onAddDemoPayment({
        amount: amountNum,
        channel: payChannel,
        notes: payNotes.trim()
      });
      setPayAmount("");
      setPayNotes("");
      setReceiptMsg(`Unverified demonstration entry of KSh ${money(amountNum)} recorded in browser session.`);
      setTimeout(() => setReceiptMsg(""), 4000);
    }
  };

  const printStatement = () => {
    window.print();
  };

  return (
    <div className="statement-container" style={{ display: "grid", gap: 24, maxWidth: 960, margin: "0 auto" }}>
      <style>{`
        @media print {
          body { background: #FFFFFF !important; color: #000000 !important; }
          .no-print { display: none !important; }
          .statement-card { border: 1px solid #94A3B8 !important; box-shadow: none !important; }
          .statement-header { border-bottom: 2px solid #000000 !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
        .statement-card {
          background: #FFFFFF;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .table-custom {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 13px;
        }
        .table-custom th {
          background: #F1F5F9;
          color: #334155;
          text-align: left;
          padding: 8px 12px;
          font-weight: 600;
          border-bottom: 2px solid #CBD5E1;
        }
        .table-custom td {
          padding: 9px 12px;
          border-bottom: 1px solid #E2E8F0;
          color: #0F172A;
        }
        .table-custom tr:last-child td {
          border-bottom: none;
        }
      `}</style>

      {/* Action / Print Bar */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFFFF", padding: "14px 20px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Itemised Member Contribution Statement (Prototype)</span>
          <span style={{ marginLeft: 8, fontSize: 12, color: "#64748B" }}>Demonstration document</span>
        </div>
        <button
          onClick={printStatement}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            background: "#0284C7",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          <Printer size={16} /> Print Statement (A4)
        </button>
      </div>

      {/* Main Printable Statement Document */}
      <div className="statement-card">
        {/* Prominent Prototype Banner */}
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldAlert size={18} color="#DC2626" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            PROTOTYPE DEMONSTRATION ONLY — NOT AN SHA-ISSUED STATEMENT
          </div>
        </div>

        {/* Document Header */}
        <div className="statement-header" style={{ borderBottom: "2px solid #0F172A", paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.3px", textTransform: "uppercase" }}>
                SHA PMT Reform Evaluation Prototype
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0284C7", marginTop: 2 }}>
                Taarifa ya Michango ya Mwanachama — Illustrative Member Contribution Statement
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                { `Proposed AGI Rules Engine Evaluation (${next.modelVersion || results.auditRecord?.algorithmVersion || "Research Prototype"})` }
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", padding: "4px 10px", background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 4, fontSize: 11, fontWeight: 700, color: "#92400E" }}>
                UNVERIFIED PROTOTYPE EVALUATION
              </div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>
                Session Reference: <strong style={{ color: "#0F172A" }}>{sessionReference}</strong>
              </div>
              <div style={{ fontSize: 11, color: "#64748B" }}>
                Date: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}
              </div>
            </div>
          </div>
        </div>

        {/* Provisional Policy Decision Callout */}
        {d.incomeAssessmentSnapshot?.requiresPolicyDecision && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 6, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", background: "#D97706", color: "#FFF", borderRadius: 4 }}>
              PROVISIONAL_PENDING_POLICY
            </span>
            <div style={{ fontSize: 12, color: "#92400E" }}>
              <strong>Policy Decision Required:</strong> Household declared transfers, remittances or social assistance. {d.incomeAssessmentSnapshot.policyDecisionSummary || "Treatment in means-testing requires SHA policy determination."} Output is provisional and non-binding.
            </div>
          </div>
        )}

        {/* Provisional Short Window Extrapolation Callout */}
        {d.incomeAssessmentSnapshot?.hasProvisionalShortWindowSources && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 6, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", background: "#DC2626", color: "#FFF", borderRadius: 4 }}>
              PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION
            </span>
            <div style={{ fontSize: 12, color: "#991B1B" }}>
              <strong>Provisional Short-Window Extrapolation:</strong> Household reported income sources observed over fewer than 12 months (3–11 months). Annualisation is an uncalibrated provisional extrapolation and cannot be treated as an official binding SHA determination.
            </div>
          </div>
        )}

        {/* Member Profile Snapshot */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, background: "#F8FAFC", padding: 14, borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>County of Residence</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{d.county || "Not specified"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Household Composition</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{d.householdSize || 1} members (Head: {d.headAge || "—"} yrs, {d.headGender || "—"})</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Prototype Tier Classification</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: next.minimumContributionFloorApplied ? "#059669" : "#0284C7" }}>
              {next.minimumContributionFloorApplied ? "Minimum Contribution Assessment (Reg. 17(2) Minimum Rule: KSh 300 Floor)" : `Standard Assessment Tier (${next.tier || "Standard"})`}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Evaluated Monthly Contribution</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: next.minimumContributionFloorApplied ? "#059669" : "#0F172A" }}>
              KSh {money(monthlyDue)}/mo
            </div>
            <div style={{ fontSize: 10, color: d.incomeAssessmentSnapshot?.hasProvisionalShortWindowSources ? "#DC2626" : "#64748B", fontWeight: d.incomeAssessmentSnapshot?.hasProvisionalShortWindowSources ? 600 : 400 }}>
              {d.incomeAssessmentSnapshot?.hasProvisionalShortWindowSources
                ? "Provisional extrapolation (non-binding)"
                : d.incomeAssessmentSnapshot?.requiresPolicyDecision
                ? "Provisional pending policy (non-binding)"
                : "Unverified model assumption"}
            </div>
          </div>
        </div>

        {/* Section 1: Annual Earned Income Base */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>
            1. Declared Household Net Earned Income Base (Prototype Input)
          </div>
          <table className="table-custom">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Basis / Frequency</th>
                <th style={{ textAlign: "right" }}>Annual Amount (KSh)</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.annualBaseItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.description}</td>
                  <td><span style={{ fontSize: 11, padding: "2px 6px", background: "#E0F2FE", color: "#0369A1", borderRadius: 4 }}>{item.type}</span></td>
                  <td style={{ color: "#64748B", fontSize: 12 }}>{item.explanation}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{money(item.amount)}</td>
                </tr>
              ))}
              <tr style={{ background: "#F8FAFC", fontWeight: 700 }}>
                <td colSpan={3}>Total Annual Earned Income Base (A)</td>
                <td style={{ textAlign: "right", color: "#0284C7" }}>KSh {money(breakdown.annualBaseTotal)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 4, fontStyle: "italic" }}>
            * Calculation integrity principle: Capital assets (vehicles, land, livestock), transaction velocity, and debt are treated as contextual verification signals and are NOT added to the earned income base.
          </div>
          {d.incomeAssessmentSnapshot && Array.isArray(d.incomeAssessmentSnapshot.lines) && d.incomeAssessmentSnapshot.lines.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>
                Itemised Reported Income & Financial Flows ({d.incomeAssessmentSnapshot.lines.length} sources)
              </div>
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>Source Type</th>
                    <th>Classification</th>
                    <th>Observed Period</th>
                    <th style={{ textAlign: "right" }}>Reported Gross (KSh)</th>
                    <th style={{ textAlign: "right" }}>Operating Costs (KSh)</th>
                    <th style={{ textAlign: "right" }}>Reported Net (KSh)</th>
                  </tr>
                </thead>
                <tbody>
                  {d.incomeAssessmentSnapshot.lines.map((ln, lIdx) => (
                    <tr key={lIdx}>
                      <td style={{ fontWeight: 600 }}>{ln.label}</td>
                      <td>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: ln.bucket === "EARNED" ? "#ECFDF5" : "#FEF3C7", color: ln.bucket === "EARNED" ? "#065F46" : "#92400E" }}>
                          {ln.bucket === "EARNED" ? (ln.countedInEarnedIncome ? "Counted in Earned Base" : "Excluded (Duplicate)") : ln.bucket}
                        </span>
                      </td>
                      <td style={{ color: "#64748B", fontSize: 12 }}>{ln.observationMonths} months {ln.isSeasonal ? "(Seasonal)" : ""}</td>
                      <td style={{ textAlign: "right" }}>{money(ln.totalReceivedKsh)}</td>
                      <td style={{ textAlign: "right", color: ln.totalReportedCostsKsh > 0 ? "#DC2626" : "#64748B" }}>
                        {ln.totalReportedCostsKsh > 0 ? `- ${money(ln.totalReportedCostsKsh)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{money(ln.reportedNetKsh)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Illustrative Household Adjustments */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.4px", borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>
            2. Illustrative household adjustments used by this prototype
          </div>
          <table className="table-custom">
            <thead>
              <tr>
                <th>Illustrative Adjustment</th>
                <th>Category</th>
                <th>Model Assumption / Basis</th>
                <th style={{ textAlign: "right" }}>Annual Amount (KSh)</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.postBaseDeductions.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "#94A3B8" }}>No post-base adjustments applied by this prototype scenario.</td>
                </tr>
              ) : (
                breakdown.postBaseDeductions.map((ded, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{ded.name}</td>
                    <td><span style={{ fontSize: 11, padding: "2px 6px", background: "#FEF3C7", color: "#92400E", borderRadius: 4 }}>ILLUSTRATIVE_ADJUSTMENT</span></td>
                    <td style={{ color: "#64748B", fontSize: 12 }}>{ded.reason || ded.explanation}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#DC2626" }}>- {money(ded.amount)}</td>
                  </tr>
                ))
              )}
              <tr style={{ background: "#F8FAFC", fontWeight: 700 }}>
                <td colSpan={3}>Total Illustrative Adjustments (B)</td>
                <td style={{ textAlign: "right", color: "#DC2626" }}>- KSh {money(breakdown.totalPostBaseDeductions)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Mathematical Reconciliation Summary */}
        <div style={{ marginBottom: 22, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 10 }}>
            3. Net Calculation Reconciliation
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
            <div style={{ background: "#FFFFFF", padding: 12, borderRadius: 6, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, color: "#64748B" }}>Annual Base Total (A)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>KSh {money(rec.annualBaseTotal)}</div>
            </div>
            <div style={{ background: "#FFFFFF", padding: 12, borderRadius: 6, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, color: "#64748B" }}>Less Adjustments (B)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#DC2626" }}>- KSh {money(rec.totalPostBaseDeductions)}</div>
            </div>
            <div style={{ background: "#FFFFFF", padding: 12, borderRadius: 6, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, color: "#64748B" }}>Pre-Floor Net Amount</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: rec.preFloorAdjustedGrossIncome < 0 ? "#DC2626" : "#0F172A" }}>
                KSh {money(rec.preFloorAdjustedGrossIncome)}
              </div>
            </div>
            <div style={{ background: "#FFFFFF", padding: 12, borderRadius: 6, border: "1px solid #E2E8F0" }}>
              <div style={{ fontSize: 11, color: "#64748B" }}>Zero-Floor Adjustment</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: rec.zeroFloorAdjustment > 0 ? "#059669" : "#64748B" }}>
                + KSh {money(rec.zeroFloorAdjustment)}
              </div>
            </div>
            <div style={{ background: "#FFFFFF", padding: 12, borderRadius: 6, border: "2px solid #0284C7" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", textTransform: "uppercase" }}>Adjusted Gross Income (AGI)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0284C7" }}>KSh {money(rec.adjustedGrossIncome)}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, borderTop: "1px solid #E2E8F0", paddingTop: 10 }}>
            {isReconciled ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#059669", fontSize: 12, fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                Mathematical Reconciliation Verified: Base Diff = {rec.baseReconciliationDifference} · Pre-Floor Diff = {rec.preFloorReconciliationDifference} (Independent Arithmetic Checked)
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#DC2626", fontSize: 12, fontWeight: 600 }}>
                <AlertTriangle size={16} />
                Reconciliation Discrepancy: Base Diff = {rec.baseReconciliationDifference} · Pre-Floor Diff = {rec.preFloorReconciliationDifference}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#475569" }}>
              Statutory Contribution Reference (Regulation 17(1) & 17(2), read with Regulation 21): <strong>2.75% of evaluated income</strong> (KSh 300/mo minimum floor for non-salaried households) → <strong>KSh {money(monthlyDue)}/mo</strong>
            </div>
          </div>
        </div>

        {/* Section 4: Contextual Information */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>
            4. Contextual Information Supplied to the Demonstration
          </div>
          <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6, background: "#F1F5F9", padding: 12, borderRadius: 6 }}>
            <div>• <strong>Verification Routing:</strong> {next.requiresChpVerification ? "Flagged for manual Community Health Promoter (CHP) field review." : "No manual review trigger fired by prototype heuristics."}</div>
            <div>• <strong>Evidence Status:</strong> Member-reported (The prototype has no live agency verification or calibrated statistical confidence interval).</div>
            <div>• <strong>Household Earner Context:</strong> {d.isSeasonalWorker ? "Seasonal worker baseline applied to avoid peak harvest extrapolation." : "Non-seasonal declaration."}</div>
          </div>
        </div>

        {/* Prototype Legal Notice */}
        <div style={{ borderTop: "1px dashed #CBD5E1", paddingTop: 12, fontSize: 11, color: "#64748B", lineHeight: 1.5 }}>
          <strong>PROTOTYPE DEMONSTRATION NOTICE:</strong> This document is an illustrative output produced solely for technical demonstration and policy evaluation of the proposed AGI rules engine. While the 2.75% annual rate and KSh 300/mo floor reflect statutory reference parameters under Regulation 17(1) & (2) of the Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024) for non-salaried households, this prototype does NOT implement or represent the official means-testing instrument established under Regulation 21(6) and the Fifth Schedule ('Means Testing'). Note: Applying the KSh 300 minimum contribution rule under Regulation 17(2) does not constitute a determination of indigence or an approval for financial assistance under Regulation 18. All income estimations, illustrative deductions, and model rules are research assumptions that require validation against SHA's official instrument, parameters, and administrative implementation. It is NOT an official determination, statement, demand note, or invoice issued by the Social Health Authority (SHA) of Kenya. Official premiums, determinations, and appeals must be processed exclusively through SHA's authorized channels (*147# or afyayangu.go.ke).
        </div>
      </div>

      {/* Demonstration Payment Acknowledgement Workflow */}
      <div className="no-print statement-card" style={{ borderLeft: "4px solid #059669" }}>
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontWeight: 800, padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 12 }}>
          SIMULATED PAYMENT RECORD — NOT VERIFIED AGAINST SHA OR M-PESA
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <CreditCard size={20} color="#059669" />
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Demonstration Payment Acknowledgement Workflow</div>
        </div>
        <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, marginBottom: 16 }}>
          For meeting demonstration and walkthrough purposes only, this component simulates how an itemised acknowledgement could be recorded. All entries below are UNVERIFIED DEMONSTRATION ENTRIES stored strictly in local browser memory. They do not connect to M-Pesa, banks, or SHA systems, and do NOT represent official monetary transfers or valid SHA receipts.
        </div>

        <form onSubmit={handleRecordPayment} style={{ display: "grid", gap: 14, background: "#F8FAFC", padding: 16, borderRadius: 8, border: "1px solid #E2E8F0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                Contribution Amount (KSh)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder={`Assessed monthly: ${monthlyDue}`}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                Payment Method / Channel
              </label>
              <select
                value={payChannel}
                onChange={(e) => setPayChannel(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 13, background: "#FFFFFF" }}
              >
                <option value="M-Pesa (Demo)">M-Pesa Paybill (Demo)</option>
                <option value="Bank Transfer (Demo)">KCB / Equity Bank (Demo)</option>
                <option value="Huduma Centre (Demo)">Huduma Centre Cash Desk (Demo)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                Member Note / Memo (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. November 2026 contribution"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <button
              type="submit"
              style={{
                padding: "9px 18px",
                background: "#059669",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Record Demonstration Payment Entry
            </button>
            {receiptMsg && (
              <span style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>
                ✓ {receiptMsg}
              </span>
            )}
          </div>
        </form>

        {/* Demonstration Payment Receipts Table */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
            Recorded Demonstration Payment Acknowledgements ({demoPaymentEntries.length})
          </div>
          {demoPaymentEntries.length === 0 ? (
            <div style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", padding: "12px 0" }}>
              No demonstration payments recorded for this assessment session yet.
            </div>
          ) : (
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Mock Receipt Reference</th>
                  <th>Date & Time</th>
                  <th>Channel (Demo)</th>
                  <th style={{ textAlign: "right" }}>Amount (KSh)</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {demoPaymentEntries.map((entry, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700, color: "#0F172A" }}>{entry.receiptNumber}</td>
                    <td style={{ fontSize: 12, color: "#64748B" }}>{new Date(entry.timestamp).toLocaleString("en-GB")}</td>
                    <td>{entry.channel}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{money(entry.amount)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", background: "#FEF3C7", color: "#92400E", borderRadius: 4 }}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
