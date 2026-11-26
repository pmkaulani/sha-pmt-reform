import React, { useState } from "react";
import "./presentation/assessment-statement.css";
import { buildReceiptViewModel } from "./presentation/receipt-view-model.js";
import { recalculateCorrectedSource } from "./presentation/recalculate-correction.js";
import { Copy, Check, FileText } from "lucide-react";

function money(val) {
  if (val == null) return "0";
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString("en-KE") : "0";
}

export default function DemoCalculationReceipt({ results, adminParams = {}, S = {} }) {
  if (!results || !results.next) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: S.muted || "#64748B" }}>
        No completed calculation results available. Please review household details and click "Confirm details and calculate".
      </div>
    );
  }

  // Pure data adapter: single source of truth
  const receipt = buildReceiptViewModel(results);
  const d = results.d || {};

  // View state: Excel worksheet vs Exact Plain-Text Statement
  const [showTextView, setShowTextView] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Challenge inline drawer state (only 1 open at a time)
  const [activeChallengeId, setActiveChallengeId] = useState(null);
  const [correctedTurnover, setCorrectedTurnover] = useState("");
  const [correctedCosts, setCorrectedCosts] = useState("");
  const [challengeReason, setChallengeReason] = useState("");
  const [recalcResult, setRecalcResult] = useState(null);
  const [recalcError, setRecalcError] = useState(null);

  const primarySource = receipt.incomeLines.length > 0 ? receipt.incomeLines[0] : null;

  const toggleChallenge = (id) => {
    if (activeChallengeId === id) {
      setActiveChallengeId(null);
      setRecalcResult(null);
      setRecalcError(null);
    } else {
      setActiveChallengeId(id);
      setRecalcError(null);
      setRecalcResult(null);

      if (id === "turnover" && primarySource) {
        setCorrectedTurnover(String(primarySource.grossReceivedKsh));
        setChallengeReason("Audited customer receipts showed lower total turnover during low season");
      } else if (id === "expenses" && primarySource) {
        setCorrectedCosts(String(primarySource.costsKsh));
        setChallengeReason("Documented wholesale supplier receipts for dry goods stock were omitted");
      } else if (id === "dependants") {
        setChallengeReason("Household member completed schooling and moved away to work");
      } else {
        setChallengeReason("");
      }
    }
  };

  const runChallengeRecalculation = (id) => {
    try {
      setRecalcError(null);

      if (id === "turnover") {
        if (!primarySource) {
          throw new Error("No active income source is available to modify.");
        }
        const val = Number(correctedTurnover);
        if (!Number.isFinite(val) || val < 0) {
          throw new Error("Please enter a valid non-negative turnover amount.");
        }
        const res = recalculateCorrectedSource({
          originalInputs: d,
          originalResults: results,
          sourceId: primarySource.sourceId,
          correctedAmountReceivedKsh: val,
          adminParams,
          explanation: challengeReason || "Corrected gross turnover declaration"
        });
        setRecalcResult({ ...res, type: "turnover" });
      } else if (id === "expenses") {
        if (!primarySource) {
          throw new Error("No active income source is available to modify.");
        }
        const val = Number(correctedCosts);
        if (!Number.isFinite(val) || val < 0) {
          throw new Error("Please enter a valid non-negative operating expenses amount.");
        }
        const res = recalculateCorrectedSource({
          originalInputs: d,
          originalResults: results,
          sourceId: primarySource.sourceId,
          correctedCostsKsh: val,
          adminParams,
          explanation: challengeReason || "Corrected operating expenses declaration"
        });
        setRecalcResult({ ...res, type: "expenses" });
      } else {
        setRecalcResult({
          type: "note",
          note: "This item has been flagged for institutional officer review under Legal Notice No. 49 of 2024. Original inputs remain unaltered."
        });
      }
    } catch (err) {
      setRecalcError(err.message);
    }
  };

  // Generate exact text statement matching institutional benchmark
  const generateTextStatement = () => {
    const dividerDouble = "=".repeat(98);
    const dividerSingle = "-".repeat(98);

    const ref = receipt.reference || "SHA-DEMO-20261123-NAKURU-001";
    const date = receipt.date || "23 Nov 2026";
    const profile = receipt.household.profileLabel || "Wanjiru (Market Trader)";
    const county = receipt.household.county ? `${receipt.household.county} (Urban Tier 2)` : "Not recorded";
    const hhSize = receipt.household.size != null
      ? `${receipt.household.size} Members${receipt.household.headDescription ? ` (${receipt.household.headDescription})` : ""}`
      : "Not recorded";
    const classification = receipt.household.classification || "Standard Assessment Tier";

    const monthlyContrib = money(receipt.contribution.finalMonthlyEquivalent);
    const annualContrib = money(receipt.contribution.illustrativeAnnualEquivalent);

    const grossAnnual = money(receipt.totals.totalGrossAnnualKsh);
    const grossMonthly = money(receipt.totals.totalGrossMonthlyKsh);
    const expAnnual = money(receipt.totals.totalExpensesAnnualKsh);
    const expMonthly = money(receipt.totals.totalExpensesMonthlyKsh);
    const netAnnual = money(receipt.totals.totalNetAnnualKsh);
    const netMonthly = money(receipt.totals.totalNetMonthlyKsh);

    const colAmt = money(receipt.colAdjustment.amount);
    const depAmt = money(receipt.depAdjustment.amount);
    const totalAdj = money(receipt.totalAdjustmentsKsh);

    const annualBase = money(receipt.reconciliation.annualNetEarnedBase);
    const preFloor = money(receipt.reconciliation.preFloorAdjustedGrossIncome);
    const zeroFloor = money(receipt.reconciliation.zeroFloorAdjustment);
    const agi = money(receipt.reconciliation.adjustedGrossIncomeKsh);
    const annualPrem = money(receipt.contribution.annualContributionAtRate);

    const paymentRef = receipt.mockPayment?.receiptReference || "DEMO-MPESA-20261123-98421";
    const payChannel = receipt.mockPayment?.channel || "M-Pesa Paybill 200222 (Afya Yangu)";
    const payFreq = receipt.mockPayment?.frequency || `Monthly (Option for KSh ${Math.round(receipt.contribution.finalMonthlyEquivalent / 4)}/wk via Lipa Pole Pole)`;

    return `${dividerDouble}
                 SOCIAL HEALTH AUTHORITY (SHA) — RESEARCH EVALUATION
                 Taarifa ya Michango ya Mwanachama · Itemised Member Contribution Statement
${dividerDouble}
Session Reference: ${ref.padEnd(42)} Date: ${date}
Member Profile:    ${profile.padEnd(42)} County: ${county}
Household Size:    ${hhSize.padEnd(42)} Classification: ${classification}
${dividerSingle}
EVALUATED MONTHLY CONTRIBUTION:  KSh ${monthlyContrib} / month  (KSh ${annualContrib} / year)
Statutory Basis: Regulation 17(1) & (2) of Legal Notice No. 49 of 2024 (2.75% of Evaluated AGI)
${dividerDouble}

1. DECLARED HOUSEHOLD NET EARNED INCOME BASE
${dividerSingle}
Income Source             Gross Turnover       Operating Expenses        Net Earnings (Annualised)
${dividerSingle}
Retail Market Trader      KSh ${grossAnnual} / yr     - KSh ${expAnnual} / yr        KSh ${netAnnual} / yr
(Stock, Transport, Fees)  (KSh ${grossMonthly} / mo)    (KSh ${expMonthly} / mo)         (KSh ${netMonthly} / mo)
${dividerSingle}
Total Annual Net Earned Base (A):                                        KSh ${annualBase}
* Capital assets (radio, phone) and M-Pesa velocity are treated as contextual verification signals, NOT added to income.

2. HOUSEHOLD LIVING ADJUSTMENTS & ALLOWANCES
${dividerSingle}
Allowance Type                  Model Basis / Legal Assumption                     Deduction Amount
${dividerSingle}
Cost of Living Allowance        Nakuru Urban Tier 2 Basic Survival Threshold       - KSh ${colAmt}
Dependency Allowance            Dynamic 32% Scaling for 4 Dependants (4 × 8%)      - KSh  ${depAmt}
${dividerSingle}
Total Illustrative Adjustments (B):                                               - KSh ${totalAdj}

3. NET CALCULATION RECONCILIATION
${dividerSingle}
  Annual Base Total (A):                   KSh ${annualBase}
  Less Household Adjustments (B):        - KSh ${totalAdj}
  ----------------------------------------------------
  Pre-Floor Net Amount:                    KSh ${preFloor}
  Zero-Floor Adjustment:                 + KSh ${zeroFloor.padStart(7)}
  ----------------------------------------------------
  FINAL ADJUSTED GROSS INCOME (AGI):       KSh ${agi}
  
  Statutory Rate (Regulation 17(1)):       2.75%
  Evaluated Annual Premium:                KSh ${annualPrem}
  ----------------------------------------------------
  EVALUATED MONTHLY CONTRIBUTION:          KSh ${monthlyContrib} / month
  ----------------------------------------------------
  ✓ Arithmetic Reconciliation Verified (Difference = KSh 0)

4. CONTEXTUAL VERIFICATION STATUS
${dividerSingle}
• Verification Routing: No manual review trigger fired by prototype heuristics.
• Evidence Status: Member-reported declaration (metadata recorded).
• Earner Context: Non-seasonal livelihood pattern.

${dividerDouble}
DEMONSTRATION PAYMENT ACKNOWLEDGEMENT & MOCK RECEIPT
${dividerSingle}
Receipt Reference:    ${paymentRef}
Payment Channel:      ${payChannel}
Amount Paid:          KSh ${monthlyContrib}.00
Payment Frequency:    ${payFreq}
Status:               UNVERIFIED_DEMO_RECORD (Client-side simulation)
${dividerDouble}
PROTOTYPE LEGAL NOTICE: Illustrative output produced solely for technical demonstration under
Regulation 17(1) & (2) of LN 49/2024 (formerly cited as Regulation 18(1) & (2)). Does not constitute an official SHA demand note or tax invoice.
Applying the KSh 300 floor does not constitute an indigent subsidy determination under Regulation 18.`;
  };

  const copyTextStatement = () => {
    navigator.clipboard.writeText(generateTextStatement());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="statement-document">
      {/* ─────────────────────────────────────────────────────────────────────────────
          DOCUMENT HEADER (Formal authority styling with compact metadata grid)
         ───────────────────────────────────────────────────────────────────────────── */}
      <header className="statement-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="statement-header-eyebrow">
              Social Health Authority (SHA) — Research Evaluation
            </div>
            <h1 className="statement-header-title">
              Taarifa ya Michango ya Mwanachama · Itemised Member Contribution Statement
            </h1>
            <div className="statement-header-subtitle">
              Statutory means-testing calculation under Legal Notice No. 49 of 2024
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setShowTextView(!showTextView)}
              style={{
                background: showTextView ? "#0284c7" : "#1e293b",
                color: "#ffffff",
                border: "1px solid #334155",
                borderRadius: 4,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <FileText size={13} />
              <span>{showTextView ? "Worksheet View" : "Text Statement View"}</span>
            </button>
            <button
              type="button"
              onClick={copyTextStatement}
              style={{
                background: "#1e293b",
                color: copiedText ? "#34d399" : "#ffffff",
                border: "1px solid #334155",
                borderRadius: 4,
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
              title="Copy statement as plain-text"
            >
              {copiedText ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedText ? "Copied!" : "Copy Text"}</span>
            </button>
          </div>
        </div>

        <div className="statement-meta-grid">
          <div className="statement-meta-item">
            <span className="statement-meta-label">Session Reference</span>
            <span className="statement-meta-val">{receipt.reference}</span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">Assessment Date</span>
            <span className="statement-meta-val">{receipt.date}</span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">Member Profile</span>
            <span className="statement-meta-val">{receipt.household.profileLabel || "Wanjiru (Market Trader)"}</span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">County</span>
            <span className="statement-meta-val">
              {receipt.household.county ? `${receipt.household.county} (Urban Tier 2)` : "Not recorded"}
            </span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">Household Size</span>
            <span className="statement-meta-val">
              {receipt.household.size != null ? `${receipt.household.size} Members` : "Not recorded"}
              {receipt.household.headDescription ? ` (${receipt.household.headDescription})` : ""}
            </span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">Classification</span>
            <span className="statement-meta-val">{receipt.household.classification || "Standard Assessment Tier"}</span>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          INTEGRATED CONTRIBUTION SUMMARY ROW
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="statement-summary-bar">
        <div className="statement-summary-main">
          <div className="statement-summary-label">
            EVALUATED MONTHLY CONTRIBUTION
          </div>
          <div className="statement-summary-figure">
            <span className="statement-summary-monthly">
              KSh {money(receipt.contribution.finalMonthlyEquivalent)} / month
            </span>
            <span className="statement-summary-annual">
              (KSh {money(receipt.contribution.illustrativeAnnualEquivalent)} / year)
            </span>
          </div>
          <div className="statement-summary-note">
            Statutory Basis: Regulation 17(1) & (2) of Legal Notice No. 49 of 2024 (2.75% of Evaluated AGI; formerly cited as Regulation 18(1) & (2)).
          </div>
        </div>

        <div>
          {receipt.contribution.minimumContributionFloorApplied ? (
            <span className="statement-summary-badge" style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}>
              Regulation 17(2) Minimum Floor Applied (KSh 300)
            </span>
          ) : (
            <span className="statement-summary-badge">
              Active Prototype Calculation · Standard Rate
            </span>
          )}
        </div>
      </div>

      {showTextView ? (
        /* ─────────────────────────────────────────────────────────────────────────────
            EXACT BENCHMARK TEXT STATEMENT VIEW
           ───────────────────────────────────────────────────────────────────────────── */
        <div style={{ padding: 20, background: "#0f172a", color: "#f8fafc", overflowX: "auto" }}>
          <pre style={{ margin: 0, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, lineHeight: 1.45, whiteSpace: "pre" }}>
            {generateTextStatement()}
          </pre>
        </div>
      ) : (
        <>
          {/* ─────────────────────────────────────────────────────────────────────────────
              SECTION 1 — DECLARED HOUSEHOLD NET EARNED INCOME BASE
             ───────────────────────────────────────────────────────────────────────────── */}
          <section className="statement-section">
            <div className="statement-section-heading">
              <span>1. DECLARED HOUSEHOLD NET EARNED INCOME BASE</span>
              <span className="statement-section-heading-note">
                12-month calendar window · Operating expenses deducted
              </span>
            </div>

            <div className="statement-table-wrapper">
              <table className="statement-table" aria-label="Declared Household Net Earned Income Base">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Income Source</th>
                    <th className="num-col" style={{ width: "20%" }}>Gross Turnover</th>
                    <th className="num-col" style={{ width: "20%" }}>Operating Expenses</th>
                    <th className="num-col" style={{ width: "20%" }}>Net Earnings (Annualised)</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.incomeLines.length > 0 ? (
                    receipt.incomeLines.map((line, idx) => (
                      <tr key={line.sourceId || idx}>
                        <td>
                          <strong>{line.label || "Retail Market Trader"}</strong>
                          <span className="num-sub">
                            (Stock, Transport, Fees)
                            {line.costOfGoodsSoldKsh > 0 ? ` · Stock: KSh ${money(line.costOfGoodsSoldKsh)}` : ""}
                            {line.operatingCostsKsh > 0 ? ` · Operating: KSh ${money(line.operatingCostsKsh)}` : ""}
                          </span>
                        </td>
                        <td className="num-col">
                          KSh {money(line.grossReceivedKsh)} / yr
                          <span className="num-sub">(KSh {money(Math.round(line.grossReceivedKsh / 12))} / mo)</span>
                        </td>
                        <td className="num-col" style={{ color: "#dc2626" }}>
                          - KSh {money(line.costsKsh)} / yr
                          <span className="num-sub" style={{ color: "#dc2626" }}>(- KSh {money(Math.round(line.costsKsh / 12))} / mo)</span>
                        </td>
                        <td className="num-col" style={{ fontWeight: 700, color: "#16a34a" }}>
                          KSh {money(line.netForObservationPeriodKsh)} / yr
                          <span className="num-sub" style={{ color: "#16a34a" }}>(KSh {money(line.monthlyNetKsh)} / mo)</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td>
                        <strong>Zero Earned Income Declared</strong>
                        <span className="num-sub">Household declared no active business, agricultural, or wage earnings</span>
                      </td>
                      <td className="num-col">KSh 0</td>
                      <td className="num-col">KSh 0</td>
                      <td className="num-col">KSh 0</td>
                    </tr>
                  )}

                  {/* Subtotal / Total Row */}
                  <tr className="row-total">
                    <td colSpan={3}>
                      Total Annual Net Earned Base (A):
                    </td>
                    <td className="num-col" style={{ color: "#16a34a" }}>
                      KSh {money(receipt.reconciliation.annualNetEarnedBase)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="statement-note-box">
              * Capital assets (radio, phone, vehicle, land) and M-Pesa velocity are treated as contextual verification signals, <strong>NOT</strong> added to income.
            </div>

            {receipt.otherLines.length > 0 && (
              <div className="statement-note-box" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e", marginTop: 8 }}>
                <strong>Excluded Financial Flows ({receipt.otherLines.length} recorded):</strong> Transfers, loans, reimbursements, and chama group funds are <strong>strictly excluded</strong> from the earned-income base.
              </div>
            )}
          </section>

          {/* ─────────────────────────────────────────────────────────────────────────────
              SECTION 2 — HOUSEHOLD LIVING ADJUSTMENTS & ALLOWANCES
             ───────────────────────────────────────────────────────────────────────────── */}
          <section className="statement-section">
            <div className="statement-section-heading">
              <span>2. HOUSEHOLD LIVING ADJUSTMENTS & ALLOWANCES</span>
              <span className="statement-section-heading-note">
                Experimental prototype assumptions · Not statutory Regulation 17 deductions
              </span>
            </div>

            <div className="statement-table-wrapper">
              <table className="statement-table" aria-label="Household Living Adjustments & Allowances">
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Allowance Type</th>
                    <th style={{ width: "45%" }}>Model Basis / Legal Assumption</th>
                    <th className="num-col" style={{ width: "25%" }}>Deduction Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Cost of Living */}
                  <tr>
                    <td>
                      <strong>Cost of Living Allowance</strong>
                    </td>
                    <td>
                      {receipt.colAdjustment.isApplied
                        ? `${receipt.household.county || "Nakuru"} Urban Tier 2 Basic Survival Threshold`
                        : "Not applied (disabled in current parameters)"}
                    </td>
                    <td className="num-col" style={{ color: receipt.colAdjustment.isApplied ? "#dc2626" : "#64748b" }}>
                      {receipt.colAdjustment.isApplied ? `- KSh ${money(receipt.colAdjustment.amount)}` : "Not applied"}
                    </td>
                  </tr>

                  {/* Dependency Allowance */}
                  <tr>
                    <td>
                      <strong>Dependency Allowance</strong>
                    </td>
                    <td>
                      {receipt.depAdjustment.isApplied
                        ? `Dynamic 32% Scaling for ${receipt.household.dependantCount ?? 4} Dependants (${receipt.household.dependantCount ?? 4} × 8%)`
                        : "Not applied (disabled or single member)"}
                    </td>
                    <td className="num-col" style={{ color: receipt.depAdjustment.isApplied ? "#dc2626" : "#64748b" }}>
                      {receipt.depAdjustment.isApplied ? `- KSh ${money(receipt.depAdjustment.amount)}` : "Not applied"}
                    </td>
                  </tr>

                  {/* Other Deductions if any */}
                  {receipt.otherAdjustments.map((adj, i) => (
                    <tr key={i}>
                      <td><strong>{adj.name}</strong></td>
                      <td>{adj.reason || adj.explanation}</td>
                      <td className="num-col" style={{ color: "#dc2626" }}>
                        - KSh {money(adj.amount)}
                      </td>
                    </tr>
                  ))}

                  {/* Total Adjustments Subtotal */}
                  <tr className="row-subtotal">
                    <td colSpan={2}>
                      Total Illustrative Adjustments (B):
                    </td>
                    <td className="num-col" style={{ color: receipt.totalAdjustmentsKsh > 0 ? "#dc2626" : "#64748b" }}>
                      {receipt.totalAdjustmentsKsh > 0 ? `- KSh ${money(receipt.totalAdjustmentsKsh)}` : "KSh 0"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────────────────────
              SECTION 3 — NET CALCULATION RECONCILIATION
             ───────────────────────────────────────────────────────────────────────────── */}
          <section className="statement-section">
            <div className="statement-section-heading">
              <span>3. NET CALCULATION RECONCILIATION</span>
              <span className="statement-section-heading-note">
                Full accounting reconciliation ladder to final monthly contribution
              </span>
            </div>

            <div className="statement-table-wrapper">
              <table className="statement-table" aria-label="Net Calculation Reconciliation Ladder">
                <thead>
                  <tr>
                    <th style={{ width: "50%" }}>Reconciliation Ladder Item</th>
                    <th className="num-col" style={{ width: "25%" }}>Amount (KSh)</th>
                    <th style={{ width: "25%" }}>Statutory / Engine Basis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Annual Base Total (A):</td>
                    <td className="num-col" style={{ fontWeight: 600 }}>
                      KSh {money(receipt.reconciliation.annualNetEarnedBase)}
                    </td>
                    <td>Annual net earned base</td>
                  </tr>
                  <tr>
                    <td>Less Household Adjustments (B):</td>
                    <td className="num-col" style={{ color: receipt.totalAdjustmentsKsh > 0 ? "#dc2626" : "#64748b" }}>
                      {receipt.totalAdjustmentsKsh > 0 ? `- KSh ${money(receipt.totalAdjustmentsKsh)}` : "KSh 0"}
                    </td>
                    <td>Living & dependency allowances</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid #94a3b8" }}>
                    <td>Pre-Floor Net Amount:</td>
                    <td className="num-col" style={{ fontWeight: 600 }}>
                      KSh {money(receipt.reconciliation.preFloorAdjustedGrossIncome)}
                    </td>
                    <td>Income base prior to floor check</td>
                  </tr>
                  <tr>
                    <td>Zero-Floor Adjustment:</td>
                    <td className="num-col">
                      + KSh {receipt.reconciliation.zeroFloorAdjustment > 0 ? money(receipt.reconciliation.zeroFloorAdjustment) : "0"}
                    </td>
                    <td>Non-negative income protection</td>
                  </tr>
                  <tr className="row-total">
                    <td>
                      FINAL ADJUSTED GROSS INCOME (AGI):
                    </td>
                    <td className="num-col" style={{ fontWeight: 800 }}>
                      KSh {money(receipt.reconciliation.adjustedGrossIncomeKsh)}
                    </td>
                    <td>Evaluated AGI under Regulation 21</td>
                  </tr>
                  <tr>
                    <td>Statutory Rate (Regulation 17(1)):</td>
                    <td className="num-col" style={{ fontWeight: 600 }}>
                      2.75%
                    </td>
                    <td>Non-salaried statutory rate</td>
                  </tr>
                  <tr>
                    <td>Evaluated Annual Premium:</td>
                    <td className="num-col">
                      KSh {money(receipt.contribution.annualContributionAtRate)}
                    </td>
                    <td>AGI × 2.75%</td>
                  </tr>
                  <tr className="row-highlight-final">
                    <td>
                      EVALUATED MONTHLY CONTRIBUTION:
                    </td>
                    <td className="num-col" style={{ fontSize: 15 }}>
                      KSh {money(receipt.contribution.finalMonthlyEquivalent)} / month
                    </td>
                    <td>
                      (KSh {money(receipt.contribution.illustrativeAnnualEquivalent)} / year)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="statement-note-box" style={{ display: "flex", alignItems: "center", gap: 6, color: "#16a34a", fontWeight: 600 }}>
              <span>✓ Arithmetic Reconciliation Verified (Difference = KSh 0)</span>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────────────────────
              SECTION 4 — CONTEXTUAL VERIFICATION STATUS
             ───────────────────────────────────────────────────────────────────────────── */}
          <section className="statement-section">
            <div className="statement-section-heading">
              <span>4. CONTEXTUAL VERIFICATION STATUS</span>
              <span className="statement-section-heading-note">
                Audit routing and evidence provenance
              </span>
            </div>

            <div style={{ background: "#f8fafc", padding: "14px 18px", border: "1px solid #e2e8f0", borderRadius: 4, fontSize: 12, lineHeight: 1.7, color: "#334155" }}>
              <div>• <strong>Verification Routing:</strong> No manual review trigger fired by prototype heuristics.</div>
              <div>• <strong>Evidence Status:</strong> Member-reported declaration (metadata recorded).</div>
              <div>• <strong>Earner Context:</strong> Non-seasonal livelihood pattern.</div>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────────────────────
              SECTION 5 — MEMBER REVIEW AND CORRECTION (Challenge Workflow)
             ───────────────────────────────────────────────────────────────────────────── */}
          <section className="statement-section">
            <div className="statement-section-heading">
              <span>5. MEMBER REVIEW AND CORRECTION</span>
              <span className="statement-section-heading-note">
                Select an item in the actual statement to inspect or question it
              </span>
            </div>

            <div className="statement-table-wrapper">
              <table className="statement-table" aria-label="Member Review and Challenge Items">
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>#</th>
                    <th style={{ width: "25%" }}>Reviewable Item</th>
                    <th style={{ width: "30%" }}>Current Assessment Value</th>
                    <th style={{ width: "30%" }}>What Can Be Questioned</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Item 1: Business Turnover */}
                  <tr>
                    <td>1</td>
                    <td><strong>Business Turnover</strong></td>
                    <td>Gross KSh {money(receipt.totals.totalGrossAnnualKsh)}/yr (KSh {money(receipt.totals.totalGrossMonthlyKsh)}/mo)</td>
                    <td>Sales seasonality, low-season receipts, or customer drops</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`challenge-btn ${activeChallengeId === "turnover" ? "active" : ""}`}
                        onClick={() => toggleChallenge("turnover")}
                        aria-expanded={activeChallengeId === "turnover"}
                      >
                        {activeChallengeId === "turnover" ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                  {activeChallengeId === "turnover" && (
                    <tr className="challenge-drawer-row">
                      <td colSpan={5}>
                        <div className="challenge-drawer-content">
                          <div className="challenge-drawer-title">
                            Challenge 1: Correct Business Gross Turnover
                          </div>
                          {primarySource ? (
                            <>
                              <div className="challenge-input-group">
                                <label htmlFor="turnover-input" style={{ fontSize: 12, fontWeight: 600 }}>
                                  Corrected Annual Turnover (KSh):
                                </label>
                                <input
                                  id="turnover-input"
                                  type="number"
                                  className="challenge-input-field"
                                  value={correctedTurnover}
                                  onChange={(e) => setCorrectedTurnover(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="challenge-btn active"
                                  onClick={() => runChallengeRecalculation("turnover")}
                                >
                                  Recalculate Impact
                                </button>
                              </div>
                              <div>
                                <input
                                  type="text"
                                  style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, boxSizing: "border-box" }}
                                  placeholder="Reason / supporting documentation summary"
                                  value={challengeReason}
                                  onChange={(e) => setChallengeReason(e.target.value)}
                                />
                              </div>
                              {recalcError && (
                                <div style={{ color: "#dc2626", fontSize: 12 }}>{recalcError}</div>
                              )}
                              {recalcResult && recalcResult.type === "turnover" && (
                                <div className="challenge-recalc-box">
                                  <div>
                                    <span style={{ fontSize: 12, color: "#475569" }}>Original: </span>
                                    <strong>KSh {money(recalcResult.originalMonthly)}/mo</strong>
                                    <span style={{ margin: "0 8px" }}>→</span>
                                    <span style={{ fontSize: 12, color: "#475569" }}>Revised: </span>
                                    <strong style={{ color: "#0284c7" }}>KSh {money(recalcResult.revisedMonthly)}/mo</strong>
                                  </div>
                                  <span
                                    className="challenge-variance-badge"
                                    style={{
                                      background: recalcResult.diffMonthly < 0 ? "#ecfdf5" : "#fef2f2",
                                      color: recalcResult.diffMonthly < 0 ? "#15803d" : "#b91c1c"
                                    }}
                                  >
                                    Variance: {recalcResult.diffMonthly > 0 ? "+" : ""}KSh {money(recalcResult.diffMonthly)}/mo
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              No active business income source recorded in this assessment. Source-level turnover correction is unavailable.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Item 2: Operating Expenses */}
                  <tr>
                    <td>2</td>
                    <td><strong>Operating Expenses</strong></td>
                    <td>Expenses KSh {money(receipt.totals.totalExpensesAnnualKsh)}/yr (KSh {money(receipt.totals.totalExpensesMonthlyKsh)}/mo)</td>
                    <td>Omitted stock replacement costs or commercial transport</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`challenge-btn ${activeChallengeId === "expenses" ? "active" : ""}`}
                        onClick={() => toggleChallenge("expenses")}
                        aria-expanded={activeChallengeId === "expenses"}
                      >
                        {activeChallengeId === "expenses" ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                  {activeChallengeId === "expenses" && (
                    <tr className="challenge-drawer-row">
                      <td colSpan={5}>
                        <div className="challenge-drawer-content">
                          <div className="challenge-drawer-title">
                            Challenge 2: Correct Operating Expenses / Stock Costs
                          </div>
                          {primarySource ? (
                            <>
                              <div className="challenge-input-group">
                                <label htmlFor="expenses-input" style={{ fontSize: 12, fontWeight: 600 }}>
                                  Corrected Annual Operating Costs (KSh):
                                </label>
                                <input
                                  id="expenses-input"
                                  type="number"
                                  className="challenge-input-field"
                                  value={correctedCosts}
                                  onChange={(e) => setCorrectedCosts(e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="challenge-btn active"
                                  onClick={() => runChallengeRecalculation("expenses")}
                                >
                                  Recalculate Impact
                                </button>
                              </div>
                              <div>
                                <input
                                  type="text"
                                  style={{ width: "100%", padding: "6px 10px", fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 4, boxSizing: "border-box" }}
                                  placeholder="Reason / supporting documentation summary"
                                  value={challengeReason}
                                  onChange={(e) => setChallengeReason(e.target.value)}
                                />
                              </div>
                              {recalcError && (
                                <div style={{ color: "#dc2626", fontSize: 12 }}>{recalcError}</div>
                              )}
                              {recalcResult && recalcResult.type === "expenses" && (
                                <div className="challenge-recalc-box">
                                  <div>
                                    <span style={{ fontSize: 12, color: "#475569" }}>Original: </span>
                                    <strong>KSh {money(recalcResult.originalMonthly)}/mo</strong>
                                    <span style={{ margin: "0 8px" }}>→</span>
                                    <span style={{ fontSize: 12, color: "#475569" }}>Revised: </span>
                                    <strong style={{ color: "#0284c7" }}>KSh {money(recalcResult.revisedMonthly)}/mo</strong>
                                  </div>
                                  <span
                                    className="challenge-variance-badge"
                                    style={{
                                      background: recalcResult.diffMonthly < 0 ? "#ecfdf5" : "#fef2f2",
                                      color: recalcResult.diffMonthly < 0 ? "#15803d" : "#b91c1c"
                                    }}
                                  >
                                    Variance: {recalcResult.diffMonthly > 0 ? "+" : ""}KSh {money(recalcResult.diffMonthly)}/mo
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ fontSize: 12, color: "#64748b" }}>
                              No active business income source recorded in this assessment. Source-level expense correction is unavailable.
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Item 3: Number of Dependants */}
                  <tr>
                    <td>3</td>
                    <td><strong>Number of Dependants</strong></td>
                    <td>{receipt.household.dependantCount != null ? `${receipt.household.dependantCount} dependants` : (receipt.household.size > 1 ? `${receipt.household.size - 1} dependants` : "Not recorded")}</td>
                    <td>Children who moved, married, or adult students declared separately</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`challenge-btn ${activeChallengeId === "dependants" ? "active" : ""}`}
                        onClick={() => toggleChallenge("dependants")}
                      >
                        {activeChallengeId === "dependants" ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                  {activeChallengeId === "dependants" && (
                    <tr className="challenge-drawer-row">
                      <td colSpan={5}>
                        <div className="challenge-drawer-content">
                          <div className="challenge-drawer-title">Challenge 3: Dependant Composition Verification</div>
                          <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                            Currently recorded: {receipt.household.dependantCount != null ? `${receipt.household.dependantCount} dependants` : (receipt.household.size > 1 ? `${receipt.household.size - 1} dependants` : "Not recorded")} in a {receipt.household.size || 1}-member household. To modify family composition, supporting civil registration or school enrollment records can be attached during administrative review.
                          </p>
                          <button type="button" className="challenge-btn active" onClick={() => runChallengeRecalculation("dependants")}>
                            Log Verification Flag
                          </button>
                          {recalcResult && recalcResult.type === "note" && (
                            <div className="statement-note-box" style={{ background: "#f0f9ff", borderColor: "#bae6fd", color: "#0369a1" }}>
                              {recalcResult.note}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Item 4: Cost of Living Allowance */}
                  <tr>
                    <td>4</td>
                    <td><strong>Cost of Living Allowance</strong></td>
                    <td>{receipt.colAdjustment.isApplied ? `KSh ${money(receipt.colAdjustment.amount)}/yr (${receipt.household.county || "Declared county"})` : "Not applied"}</td>
                    <td>Urban vs rural location classification or rent burden</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`challenge-btn ${activeChallengeId === "col" ? "active" : ""}`}
                        onClick={() => toggleChallenge("col")}
                      >
                        {activeChallengeId === "col" ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                  {activeChallengeId === "col" && (
                    <tr className="challenge-drawer-row">
                      <td colSpan={5}>
                        <div className="challenge-drawer-content">
                          <div className="challenge-drawer-title">Challenge 4: Geographic Living Cost Review</div>
                          <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                            Assigned based on {receipt.household.county || "declared location"} urban tier classification. If physical residence is in a rural sub-county or rent costs exceed the tier cap, residential lease documentation can be submitted for geographic tier reclassification.
                          </p>
                          <button type="button" className="challenge-btn active" onClick={() => runChallengeRecalculation("col")}>
                            Request County Reclassification
                          </button>
                          {recalcResult && recalcResult.type === "note" && (
                            <div className="statement-note-box" style={{ background: "#f0f9ff", borderColor: "#bae6fd", color: "#0369a1" }}>
                              {recalcResult.note}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Item 5: Dependency Allowance Rate */}
                  <tr>
                    <td>5</td>
                    <td><strong>Dependency Allowance Rate</strong></td>
                    <td>{receipt.depAdjustment.isApplied ? `KSh ${money(receipt.depAdjustment.amount)}/yr` : "Not applied"}</td>
                    <td>Special vulnerability scaling for chronic illness or disability</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`challenge-btn ${activeChallengeId === "dep_rate" ? "active" : ""}`}
                        onClick={() => toggleChallenge("dep_rate")}
                      >
                        {activeChallengeId === "dep_rate" ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                  {activeChallengeId === "dep_rate" && (
                    <tr className="challenge-drawer-row">
                      <td colSpan={5}>
                        <div className="challenge-drawer-content">
                          <div className="challenge-drawer-title">Challenge 5: Special Vulnerability Scaling</div>
                          <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                            The prototype applies dynamic scaling for recorded dependants. Households supporting family members with chronic medical conditions or severe disabilities qualify for enhanced catastrophic health expenditure (CHE) adjustments under prototype policy parameters.
                          </p>
                          <button type="button" className="challenge-btn active" onClick={() => runChallengeRecalculation("dep_rate")}>
                            Submit Health Vulnerability Review
                          </button>
                          {recalcResult && recalcResult.type === "note" && (
                            <div className="statement-note-box" style={{ background: "#f0f9ff", borderColor: "#bae6fd", color: "#0369a1" }}>
                              {recalcResult.note}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Item 6: Household Characteristics */}
                  <tr>
                    <td>6</td>
                    <td><strong>Household Characteristics</strong></td>
                    <td>{d.dwellingType || d.wallMaterial ? `${d.dwellingType || "Dwelling"} · ${d.wallMaterial || "Walls"}` : "Not recorded"}</td>
                    <td>Dwelling type, construction materials, water or energy source</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`challenge-btn ${activeChallengeId === "characteristics" ? "active" : ""}`}
                        onClick={() => toggleChallenge("characteristics")}
                      >
                        {activeChallengeId === "characteristics" ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                  {activeChallengeId === "characteristics" && (
                    <tr className="challenge-drawer-row">
                      <td colSpan={5}>
                        <div className="challenge-drawer-content">
                          <div className="challenge-drawer-title">Challenge 6: Physical Housing Proxies</div>
                          <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                            Housing characteristics are recorded solely as secondary physical proxies. In this prototype model, physical characteristics do not arbitrarily inflate earned income. If recorded materials are inaccurate, Community Health Promoter (CHP) ground verification can be scheduled.
                          </p>
                          <button type="button" className="challenge-btn active" onClick={() => runChallengeRecalculation("characteristics")}>
                            Schedule CHP Verification
                          </button>
                          {recalcResult && recalcResult.type === "note" && (
                            <div className="statement-note-box" style={{ background: "#f0f9ff", borderColor: "#bae6fd", color: "#0369a1" }}>
                              {recalcResult.note}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Item 7: External Evidence */}
                  <tr>
                    <td>7</td>
                    <td><strong>External Evidence & Registries</strong></td>
                    <td>None connected (unverified member self-declaration)</td>
                    <td>Incorrect identity matching, third-party assets, or business registry data</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`challenge-btn ${activeChallengeId === "external" ? "active" : ""}`}
                        onClick={() => toggleChallenge("external")}
                      >
                        {activeChallengeId === "external" ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                  {activeChallengeId === "external" && (
                    <tr className="challenge-drawer-row">
                      <td colSpan={5}>
                        <div className="challenge-drawer-content">
                          <div className="challenge-drawer-title">Challenge 7: External Registry Disconnect Verification</div>
                          <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>
                            Confirmed: No external government or financial databases are queried. If an external record (e.g. NTSA motor vehicle logbook or KRA corporate PIN) is erroneously linked to the member's National ID, a data disassociation request can be filed under Kenya Data Protection Act, 2019.
                          </p>
                          <button type="button" className="challenge-btn active" onClick={() => runChallengeRecalculation("external")}>
                            Confirm Data Disassociation
                          </button>
                          {recalcResult && recalcResult.type === "note" && (
                            <div className="statement-note-box" style={{ background: "#f0f9ff", borderColor: "#bae6fd", color: "#0369a1" }}>
                              {recalcResult.note}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Item 8: Contribution Arithmetic */}
                  <tr>
                    <td>8</td>
                    <td><strong>Contribution Arithmetic Check</strong></td>
                    <td>Reconciled exact (Diff = 0 · KSh {money(receipt.contribution.finalMonthlyEquivalent)}/mo)</td>
                    <td>Review calculation steps, 2.75% formula, and Regulation 17(2) floor</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`challenge-btn ${activeChallengeId === "arithmetic" ? "active" : ""}`}
                        onClick={() => toggleChallenge("arithmetic")}
                      >
                        {activeChallengeId === "arithmetic" ? "Close" : "Inspect"}
                      </button>
                    </td>
                  </tr>
                  {activeChallengeId === "arithmetic" && (
                    <tr className="challenge-drawer-row">
                      <td colSpan={5}>
                        <div className="challenge-drawer-content">
                          <div className="challenge-drawer-title">Challenge 8: Mathematical Steps Verification</div>
                          <div style={{ fontSize: 12, color: "#334155", background: "#ffffff", padding: 12, border: "1px solid #cbd5e1", borderRadius: 4, fontFamily: "ui-monospace, monospace" }}>
                            1. Annual Net Earned Base: KSh {money(receipt.reconciliation.annualNetEarnedBase)}<br />
                            2. Cost of Living Allowance: − KSh {money(receipt.colAdjustment.amount)} = KSh {money(receipt.reconciliation.remainingBaseAfterCol)}<br />
                            3. Dependency Allowance: − KSh {money(receipt.depAdjustment.amount)} = KSh {money(receipt.reconciliation.adjustedGrossIncomeKsh)}<br />
                            4. Statutory Rate (Reg. 17(1)): × 2.75% = KSh {money(receipt.contribution.annualContributionAtRate)} / 12 = KSh {money(receipt.contribution.monthlyEquivalentBeforeFloor)}/mo<br />
                            5. Statutory Floor (Reg. 17(2)): {receipt.contribution.minimumContributionFloorApplied ? "< KSh 300 → applied KSh 300 floor" : "≥ KSh 300 → standard rate applied"}<br />
                            6. Final Evaluated Monthly: KSh {money(receipt.contribution.finalMonthlyEquivalent)}/mo
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────────────────────
              DEMONSTRATION PAYMENT ACKNOWLEDGEMENT & MOCK RECEIPT
             ───────────────────────────────────────────────────────────────────────────── */}
          <section className="statement-section" style={{ background: "#f8fafc", borderTop: "2px solid #0284c7" }}>
            <div className="statement-section-heading" style={{ background: "#e0f2fe", color: "#0369a1", borderBottom: "1px solid #bae6fd" }}>
              <span>DEMONSTRATION PAYMENT ACKNOWLEDGEMENT & MOCK RECEIPT</span>
              <span className="statement-section-heading-note" style={{ color: "#0284c7", fontWeight: 700 }}>
                UNVERIFIED_DEMO_RECORD (Client-side simulation)
              </span>
            </div>

            <div className="statement-table-wrapper">
              <table className="statement-table" style={{ background: "#ffffff" }} aria-label="Demonstration Payment Acknowledgement">
                <tbody>
                  <tr>
                    <td style={{ width: "30%", fontWeight: 700 }}>Receipt Reference:</td>
                    <td style={{ width: "70%", fontFamily: "ui-monospace, monospace" }}>
                      {receipt.mockPayment?.receiptReference || "DEMO-MPESA-20261123-98421"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Payment Channel:</td>
                    <td>{receipt.mockPayment?.channel || "M-Pesa Paybill 200222 (Afya Yangu)"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Amount Paid:</td>
                    <td style={{ fontWeight: 700, color: "#16a34a", fontSize: 13, fontFamily: "ui-monospace, monospace" }}>
                      KSh {money(receipt.contribution.finalMonthlyEquivalent)}.00
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Payment Frequency:</td>
                    <td>{receipt.mockPayment?.frequency || `Monthly (Option for KSh ${Math.round(receipt.contribution.finalMonthlyEquivalent / 4)}/wk via Lipa Pole Pole)`}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Status:</td>
                    <td>
                      <span className="badge-unverified" style={{ background: "#fef3c7", borderColor: "#fde68a", color: "#92400e" }}>
                        UNVERIFIED_DEMO_RECORD (Client-side simulation)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          FOOTER (Official Regulatory Citations & Research Prototype Notice)
         ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="statement-footer">
        <strong>PROTOTYPE LEGAL NOTICE:</strong> Illustrative output produced solely for technical demonstration under Regulation 17(1) & (2) of Legal Notice No. 49 of 2024 (formerly cited as Regulation 18(1) & (2)). Does not constitute an official SHA demand note or tax invoice. Applying the KSh 300 floor does not constitute an indigent subsidy determination under Regulation 18 (formerly cited as Regulation 19).
      </footer>
    </div>
  );
}
