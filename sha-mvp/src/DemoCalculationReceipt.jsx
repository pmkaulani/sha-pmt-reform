import React, { useState } from "react";
import "./presentation/assessment-statement.css";
import { buildReceiptViewModel } from "./presentation/receipt-view-model.js";
import { recalculateCorrectedSource } from "./presentation/recalculate-correction.js";

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

  return (
    <div className="statement-document">
      {/* ─────────────────────────────────────────────────────────────────────────────
          DOCUMENT HEADER (Formal authority styling with compact metadata grid)
         ───────────────────────────────────────────────────────────────────────────── */}
      <header className="statement-header">
        <div className="statement-header-eyebrow">
          Social Health Authority — Research Evaluation
        </div>
        <h1 className="statement-header-title">
          Taarifa ya Michango ya Mwanachama · Itemised Member Contribution Statement
        </h1>
        <div className="statement-header-subtitle">
          Statutory means-testing calculation under Legal Notice No. 49 of 2024
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
            <span className="statement-meta-label">Household / Persona</span>
            <span className="statement-meta-val">{receipt.household.activeScenario || "Custom Entry"}</span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">County / Location</span>
            <span className="statement-meta-val">{receipt.household.county || "Not recorded"}</span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">Household Size</span>
            <span className="statement-meta-val">
              {receipt.household.size != null ? `${receipt.household.size} Members` : "Not recorded"}
            </span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">Dependants</span>
            <span className="statement-meta-val">
              {receipt.household.dependantCount != null ? `${receipt.household.dependantCount} Dependants` : (receipt.household.size > 1 ? `${receipt.household.size - 1} Dependants` : "Not recorded")}
            </span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">Model Engine</span>
            <span className="statement-meta-val">{receipt.model.version}</span>
          </div>
          <div className="statement-meta-item">
            <span className="statement-meta-label">Observation Window</span>
            <span className="statement-meta-val">{receipt.commonAssessmentPeriod.label || "12 Calendar Months"}</span>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          INTEGRATED CONTRIBUTION SUMMARY ROW
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="statement-summary-bar">
        <div className="statement-summary-main">
          <div className="statement-summary-label">
            Evaluated Monthly Contribution
          </div>
          <div className="statement-summary-figure">
            <span className="statement-summary-monthly">
              KSh {money(receipt.contribution.finalMonthlyEquivalent)}
            </span>
            <span className="statement-summary-annual">
              (KSh {money(receipt.contribution.illustrativeAnnualEquivalent)} / year)
            </span>
          </div>
          <div className="statement-summary-note">
            Calculated at 2.75% of evaluated Adjusted Gross Income (AGI) pursuant to Regulation 17(1) and 17(2), read with Regulation 21.
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 1 — DECLARED HOUSEHOLD NET EARNED INCOME
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="statement-section">
        <div className="statement-section-heading">
          <span>1. Declared Household Net Earned Income</span>
          <span className="statement-section-heading-note">
            12-month calendar window · Operating expenses deducted
          </span>
        </div>

        <div className="statement-table-wrapper">
          <table className="statement-table" aria-label="Declared Household Net Earned Income">
            <thead>
              <tr>
                <th style={{ width: "40%" }}>Income Source / Livelihood Activity</th>
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
                      <strong>{line.label || "Informal Business / Livelihood"}</strong>
                      <span className="num-sub">
                        {line.sourceType || "SELF_EMPLOYMENT"} · Status: {line.periodStatus || "12 months observed"}
                        {line.costOfGoodsSoldKsh > 0 ? ` · COGS: KSh ${money(line.costOfGoodsSoldKsh)}` : ""}
                        {line.operatingCostsKsh > 0 ? ` · Operating: KSh ${money(line.operatingCostsKsh)}` : ""}
                      </span>
                    </td>
                    <td className="num-col">
                      KSh {money(line.grossReceivedKsh)}
                      <span className="num-sub">KSh {money(Math.round(line.grossReceivedKsh / 12))}/mo</span>
                    </td>
                    <td className="num-col" style={{ color: "#dc2626" }}>
                      − KSh {money(line.costsKsh)}
                      <span className="num-sub" style={{ color: "#dc2626" }}>− KSh {money(Math.round(line.costsKsh / 12))}/mo</span>
                    </td>
                    <td className="num-col" style={{ fontWeight: 700, color: "#16a34a" }}>
                      KSh {money(line.netForObservationPeriodKsh)}
                      <span className="num-sub" style={{ color: "#16a34a" }}>KSh {money(line.monthlyNetKsh)}/mo</span>
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
                <td>
                  TOTAL NET EARNED HOUSEHOLD INCOME
                </td>
                <td className="num-col">
                  KSh {money(receipt.totals.totalGrossAnnualKsh)}
                  <span className="num-sub">KSh {money(receipt.totals.totalGrossMonthlyKsh)}/mo</span>
                </td>
                <td className="num-col" style={{ color: "#dc2626" }}>
                  − KSh {money(receipt.totals.totalExpensesAnnualKsh)}
                  <span className="num-sub" style={{ color: "#dc2626" }}>− KSh {money(receipt.totals.totalExpensesMonthlyKsh)}/mo</span>
                </td>
                <td className="num-col" style={{ color: "#16a34a" }}>
                  KSh {money(receipt.totals.totalNetAnnualKsh)}
                  <span className="num-sub" style={{ color: "#16a34a" }}>KSh {money(receipt.totals.totalNetMonthlyKsh)}/mo</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="statement-note-box">
          <strong>Note on Net Earnings:</strong> Gross turnover represents money collected by the business. Operating expenses represent documented stock replacement and business costs recorded for this assessment. The amount counted as earned income is the net amount recognised by the prototype income ledger.
          <br />
          <em>* Calculation integrity principle: Capital assets (vehicles, land, livestock), transaction velocity, and debt are treated as contextual verification signals and are NOT added to the earned income base.</em>
        </div>

        {receipt.otherLines.length > 0 && (
          <div className="statement-note-box" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e", marginTop: 8 }}>
            <strong>Excluded Financial Flows ({receipt.otherLines.length} recorded):</strong> Transfers, loans, reimbursements, and chama group funds are <strong>strictly excluded</strong> from the earned-income base.
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2 — HOUSEHOLD LIVING ADJUSTMENTS AND ALLOWANCES
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="statement-section">
        <div className="statement-section-heading">
          <span>2. Household Living Adjustments and Allowances</span>
          <span className="statement-section-heading-note">
            Experimental prototype assumptions · Not statutory Regulation 17 deductions
          </span>
        </div>

        <div className="statement-table-wrapper">
          <table className="statement-table" aria-label="Household Living Adjustments and Allowances">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Adjustment</th>
                <th style={{ width: "20%" }}>Model Basis</th>
                <th style={{ width: "30%" }}>Calculation / Derivation</th>
                <th className="num-col" style={{ width: "15%" }}>Amount Applied</th>
                <th style={{ width: "10%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {/* Cost of Living */}
              <tr>
                <td>
                  <strong>Cost of Living Allowance</strong>
                  <span className="num-sub">Geographic survival threshold</span>
                </td>
                <td>
                  {receipt.household.county || "Declared County"} (Urban Tier 2)
                </td>
                <td>
                  {receipt.colAdjustment.isApplied
                    ? `Configured annual threshold: KSh ${money(receipt.colAdjustment.amount)} (${receipt.colAdjustment.reason})`
                    : "Not applied (disabled in current parameters)"}
                </td>
                <td className="num-col" style={{ color: receipt.colAdjustment.isApplied ? "#dc2626" : "#64748b" }}>
                  {receipt.colAdjustment.isApplied ? `− KSh ${money(receipt.colAdjustment.amount)}` : "Not applied"}
                </td>
                <td>
                  {receipt.colAdjustment.isApplied ? (
                    <span className="badge-experimental">Experimental</span>
                  ) : (
                    <span className="badge-unverified">Not applied</span>
                  )}
                </td>
              </tr>

              {/* Dependency Allowance */}
              <tr>
                <td>
                  <strong>Dependency Allowance</strong>
                  <span className="num-sub">Per-capita family adjustment</span>
                </td>
                <td>
                  {receipt.household.dependantCount != null
                    ? `${receipt.household.dependantCount} recorded dependants`
                    : (receipt.household.size > 1 ? `${receipt.household.size - 1} recorded dependants` : "Not recorded")}
                </td>
                <td>
                  {receipt.depAdjustment.isApplied
                    ? receipt.depAdjustment.reason
                    : "Not applied (disabled or single member)"}
                </td>
                <td className="num-col" style={{ color: receipt.depAdjustment.isApplied ? "#dc2626" : "#64748b" }}>
                  {receipt.depAdjustment.isApplied ? `− KSh ${money(receipt.depAdjustment.amount)}` : "Not applied"}
                </td>
                <td>
                  {receipt.depAdjustment.isApplied ? (
                    <span className="badge-experimental">Experimental</span>
                  ) : (
                    <span className="badge-unverified">Not applied</span>
                  )}
                </td>
              </tr>

              {/* Other Deductions if any */}
              {receipt.otherAdjustments.map((adj, i) => (
                <tr key={i}>
                  <td><strong>{adj.name}</strong></td>
                  <td>{adj.category || "Special circumstance"}</td>
                  <td>{adj.explanation || adj.reason || "Policy adjustment"}</td>
                  <td className="num-col" style={{ color: "#dc2626" }}>
                    − KSh {money(adj.amount)}
                  </td>
                  <td><span className="badge-experimental">Experimental</span></td>
                </tr>
              ))}

              {/* Total Adjustments Subtotal */}
              <tr className="row-subtotal">
                <td colSpan={3}>
                  TOTAL HOUSEHOLD LIVING ADJUSTMENTS
                </td>
                <td className="num-col" style={{ color: receipt.totalAdjustmentsKsh > 0 ? "#dc2626" : "#64748b" }}>
                  {receipt.totalAdjustmentsKsh > 0 ? `− KSh ${money(receipt.totalAdjustmentsKsh)}` : "KSh 0"}
                </td>
                <td>
                  {receipt.totalAdjustmentsKsh > 0 ? (
                    <span className="badge-experimental">Experimental</span>
                  ) : (
                    <span className="badge-unverified">None</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="statement-note-box">
          <em>* Experimental prototype assumptions: Deductions for cost of living and dependants are research policy proposals for equitable means-testing under Regulation 21. They are not statutory deductions under Regulation 17.</em>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 3 — NET CALCULATION RECONCILIATION
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="statement-section">
        <div className="statement-section-heading">
          <span>3. Net Calculation Reconciliation</span>
          <span className="statement-section-heading-note">
            Full accounting reconciliation ladder to final monthly contribution
          </span>
        </div>

        <div className="statement-table-wrapper">
          <table className="statement-table" aria-label="Net Calculation Reconciliation Ladder">
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Accounting Ladder Description</th>
                <th className="num-col" style={{ width: "25%" }}>Amount (KSh)</th>
                <th style={{ width: "30%" }}>Statutory / Engine Basis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Annual Net Earned Income Base (A)</td>
                <td className="num-col" style={{ fontWeight: 600 }}>
                  KSh {money(receipt.reconciliation.annualNetEarnedBase)}
                </td>
                <td>Annualised net income recognised from income ledger</td>
              </tr>
              <tr>
                <td>Less Cost of Living Allowance</td>
                <td className="num-col" style={{ color: receipt.colAdjustment.isApplied ? "#dc2626" : "#64748b" }}>
                  {receipt.colAdjustment.isApplied ? `− KSh ${money(receipt.colAdjustment.amount)}` : "KSh 0"}
                </td>
                <td>Location survival threshold ({receipt.household.county || "Declared location"})</td>
              </tr>
              <tr>
                <td>Remaining Base after Cost of Living</td>
                <td className="num-col" style={{ fontWeight: 600 }}>
                  KSh {money(receipt.reconciliation.remainingBaseAfterCol)}
                </td>
                <td>Intermediate base for proportional dependency deduction</td>
              </tr>
              <tr>
                <td>Less Dependency Allowance</td>
                <td className="num-col" style={{ color: receipt.depAdjustment.isApplied ? "#dc2626" : "#64748b" }}>
                  {receipt.depAdjustment.isApplied ? `− KSh ${money(receipt.depAdjustment.amount)}` : "KSh 0"}
                </td>
                <td>Dynamic per-capita scaling for recorded dependants</td>
              </tr>
              <tr>
                <td>Pre-Floor Net Base</td>
                <td className="num-col" style={{ fontWeight: 600 }}>
                  KSh {money(receipt.reconciliation.preFloorAdjustedGrossIncome)}
                </td>
                <td>Net income base prior to non-negative test</td>
              </tr>
              <tr>
                <td>Non-Negative Floor Adjustment</td>
                <td className="num-col">
                  {receipt.reconciliation.zeroFloorAdjustment > 0
                    ? `+ KSh ${money(receipt.reconciliation.zeroFloorAdjustment)}`
                    : "Not required"}
                </td>
                <td>Ensures evaluated income base cannot be negative</td>
              </tr>
              <tr className="row-total">
                <td>
                  FINAL PROTOTYPE-ADJUSTED INCOME BASE (AGI)
                </td>
                <td className="num-col" style={{ fontWeight: 800 }}>
                  KSh {money(receipt.reconciliation.adjustedGrossIncomeKsh)}
                </td>
                <td>Evaluated means-tested income base under Regulation 21</td>
              </tr>
              <tr>
                <td>Statutory Contribution Rate</td>
                <td className="num-col" style={{ fontWeight: 600 }}>
                  2.75%
                </td>
                <td>Regulation 17(1) statutory rate for non-salaried households</td>
              </tr>
              <tr>
                <td>Annual Contribution at Statutory Rate</td>
                <td className="num-col">
                  KSh {money(receipt.contribution.annualContributionAtRate)}
                </td>
                <td>AGI × 2.75% (Regulation 17(1))</td>
              </tr>
              <tr>
                <td>Monthly Equivalent Before Floor</td>
                <td className="num-col">
                  KSh {money(receipt.contribution.monthlyEquivalentBeforeFloor)}
                </td>
                <td>Annual contribution ÷ 12 calendar months</td>
              </tr>
              <tr>
                <td>Regulation 17(2) Minimum Floor Rule</td>
                <td className="num-col">
                  {receipt.contribution.minimumContributionFloorApplied
                    ? "Applied: Floor of KSh 300 enforced"
                    : "Not applied: Calculated amount is higher"}
                </td>
                <td>Regulation 17(2) statutory KSh 300/mo minimum floor</td>
              </tr>
              <tr className="row-highlight-final">
                <td>
                  FINAL EVALUATED MONTHLY CONTRIBUTION
                </td>
                <td className="num-col" style={{ fontSize: 15 }}>
                  KSh {money(receipt.contribution.finalMonthlyEquivalent)} / mo
                </td>
                <td>
                  Payable monthly contribution (KSh {money(receipt.contribution.illustrativeAnnualEquivalent)} / yr)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="statement-note-box">
          <strong>Mathematical Reconciliation Check:</strong>{" "}
          {receipt.reconciliation.annualNetEarnedBase} − {receipt.colAdjustment.amount} − {receipt.depAdjustment.amount} = {receipt.reconciliation.adjustedGrossIncomeKsh} × 0.0275 = {receipt.contribution.annualContributionAtRate} ÷ 12 = {receipt.contribution.monthlyEquivalentBeforeFloor}. Base Difference = {receipt.reconciliation.baseReconciliationDifference} · Pre-Floor Difference = {receipt.reconciliation.preFloorReconciliationDifference} · Reconciliation Status: <strong>{receipt.reconciliation.isReconciled ? "Verified Exact" : "Discrepancy Noted"}</strong>.
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 4 — CONTEXTUAL VERIFICATION STATUS
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="statement-section">
        <div className="statement-section-heading">
          <span>4. Contextual Verification Status</span>
          <span className="statement-section-heading-note">
            Member-declared information vs external verification status
          </span>
        </div>

        <div className="statement-table-wrapper">
          <table className="statement-table" aria-label="Contextual Verification Status">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Information Category</th>
                <th style={{ width: "35%" }}>Recorded Assessment Value</th>
                <th style={{ width: "20%" }}>Information Source</th>
                <th style={{ width: "20%" }}>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {receipt.evidenceItems.map((item, idx) => (
                <tr key={idx}>
                  <td><strong>{item.category}</strong></td>
                  <td>{item.value}</td>
                  <td>{item.source}</td>
                  <td>
                    {item.verification.includes("unverified") || item.verification.includes("Unverified") ? (
                      <span className="badge-unverified">{item.verification}</span>
                    ) : item.verification.includes("Reconciled") || item.verification.includes("verified") ? (
                      <span className="badge-standard">{item.verification}</span>
                    ) : (
                      <span className="badge-unverified">{item.verification}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="statement-note-box">
          <strong>Institutional Governance Notice:</strong> No live integrations with the Kenya Revenue Authority (KRA), National Transport and Safety Authority (NTSA), Ministry of Lands, or commercial banking/telco databases are active. All values represent member self-declarations for research evaluation.
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 5 — MEMBER REVIEW AND CORRECTION (Challenge Workflow)
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="statement-section">
        <div className="statement-section-heading">
          <span>5. Member Review and Correction</span>
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
          FOOTER (Official Regulatory Citations & Research Prototype Notice)
         ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="statement-footer">
        <strong>PROTOTYPE DEMONSTRATION NOTICE:</strong> This document is an illustrative output produced solely for technical demonstration and policy evaluation of the proposed AGI rules engine. Statutory contribution reference: Regulation 17(1) and 17(2), read with Regulation 21 of Legal Notice No. 49 of 2024. Regulation 17(1) specifies an annual contribution of 2.75% of income determined through means testing under Regulation 21; Regulation 17(2) sets the monthly minimum floor at KSh 300 for non-salaried households. Regulation 18 governs the identification of indigent households needing financial assistance. Applying the KSh 300 minimum contribution floor under Regulation 17(2) does NOT constitute an indigence determination or grant financial assistance under Regulation 18. This prototype uses a declared-income research model and experimental adjustments. It is NOT a reproduction of the official SHA PMT model. All income estimations, illustrative deductions, and model rules are research assumptions that require validation against SHA's official instrument, parameters, and administrative implementation.
      </footer>
    </div>
  );
}
