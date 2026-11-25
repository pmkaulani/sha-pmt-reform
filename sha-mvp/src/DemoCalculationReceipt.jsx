import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileText,
  Info,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Check,
  Building,
  User,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import { buildReceiptViewModel } from "./presentation/receipt-view-model.js";
import { recalculateCorrectedSource } from "./presentation/recalculate-correction.js";
import { calculateProposedModel } from "./lib/AlgorithmSimulation.js";

function money(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString("en-KE") : "0";
}

export default function DemoCalculationReceipt({ results, adminParams = {}, S = {} }) {
  if (!results) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: S.muted || "#94A3B8" }}>
        No calculation results available. Please review household details and click "Confirm details and calculate".
      </div>
    );
  }

  const theme = {
    surface: S.surface || "#111C33",
    surfaceUp: S.surfaceUp || "#162340",
    border: S.border || "#1E2F52",
    borderUp: S.borderUp || "#283C66",
    text: S.text || "#F1F5F9",
    muted: S.muted || "#94A3B8",
    faint: S.faint || "#475569",
    blue: S.blue || "#38BDF8",
    blueD: S.blueD || "rgba(56, 189, 248, 0.12)",
    blueBd: S.blueBd || "rgba(56, 189, 248, 0.25)",
    sage: S.sage || "#34D399",
    sageD: S.sageD || "rgba(52, 211, 153, 0.12)",
    sageBd: S.sageBd || "rgba(52, 211, 153, 0.25)",
    amber: S.amber || "#FBBF24",
    amberD: S.amberD || "rgba(251, 191, 36, 0.12)",
    amberBd: S.amberBd || "rgba(251, 191, 36, 0.25)",
    terra: S.terra || "#F87171",
    terraD: S.terraD || "rgba(248, 113, 113, 0.12)",
    terraBd: S.terraBd || "rgba(248, 113, 113, 0.25)",
  };

  const d = results.d || {};
  const next = results.next || {};
  const incomeSnapshot = d.incomeAssessmentSnapshot || next.incomeAssessmentSnapshot || {};
  const breakdown = next.calculationBreakdown || {};
  const rec = breakdown.reconciliation || {};
  const contribution = next.contributionCalculation || {};
  const lines = Array.isArray(incomeSnapshot.lines) ? incomeSnapshot.lines : [];
  const earnedLines = lines.filter(l => l.bucket === "EARNED");
  const otherLines = lines.filter(l => l.bucket !== "EARNED");
  const reviewFlags = incomeSnapshot.reviewFlags || [];

  const status = incomeSnapshot.calculationStatus || "CALCULATED_STANDARD";
  const canCalculate = incomeSnapshot.canPopulatePrototypeEarnedIncomeBase !== false && status === "CALCULATED_STANDARD";

  // Dynamic challenge state
  const [activeChallengeId, setActiveChallengeId] = useState(null);
  const [challengeInputs, setChallengeInputs] = useState({});
  const [recalcResult, setRecalcResult] = useState(null);
  const [recalcError, setRecalcError] = useState(null);

  // Status configuration
  const statusBadgeConfig = {
    CALCULATED_STANDARD: { bg: theme.sageD, border: theme.sageBd, text: theme.sage, label: "Calculated (Standard 12-Month Window)" },
    CALCULATED_EXPLICIT_ZERO_EARNED: { bg: theme.sageD, border: theme.sageBd, text: theme.sage, label: "Calculated (Explicit Zero Earned Income)" },
    BLOCKED_MANUAL_REVIEW: { bg: theme.terraD, border: theme.terraBd, text: theme.terra, label: "Blocked — Manual Review Required" },
    BLOCKED_SHORT_WINDOW_REVIEW: { bg: theme.amberD, border: theme.amberBd, text: theme.amber, label: "Blocked — Short Observation Window" },
    BLOCKED_EXTENDED_OBSERVATION_PERIOD: { bg: theme.terraD, border: theme.terraBd, text: theme.terra, label: "Blocked — Extended Observation Window (>12 Months)" },
    PROVISIONAL_PENDING_POLICY: { bg: theme.amberD, border: theme.amberBd, text: theme.amber, label: "Provisional — Pending Policy Decision" },
  }[status] || { bg: theme.surfaceUp, border: theme.border, text: theme.muted, label: status };

  const refPeriod = incomeSnapshot.commonAssessmentPeriod || {
    startDate: "2025-11-01",
    endDate: "2026-10-31",
    label: "Previous 12 completed months (2025-11-01 to 2026-10-31)"
  };

  const sessionReference = results.auditRecord?.localAssessmentId || d.localAssessmentId || "LOCAL-DEMONSTRATION-SESSION";

  // Numbers derivation
  const annualBaseTotal = breakdown.annualBaseTotal ?? next.estimatedAnnualIncome ?? ((d.monthlyNetEarnedIncome || 0) * 12);
  const postBaseDeductions = Array.isArray(breakdown.postBaseDeductions) ? breakdown.postBaseDeductions : (next.deductions || []);

  const colItem = postBaseDeductions.find(ded => ded.category === "COST_OF_LIVING" || ded.name?.toLowerCase().includes("cost of living"));
  const depItem = postBaseDeductions.find(ded => ded.category === "DEPENDENCY" || ded.name?.toLowerCase().includes("dependency"));

  // If experimental adjustments are enabled or present
  const colDeduction = colItem?.amount || 0;
  const depDeduction = depItem?.amount || 0;
  const remainingBaseAfterCol = Math.max(0, annualBaseTotal - colDeduction);
  const adjustedGrossIncome = breakdown.adjustedGrossIncome ?? next.adjustedGrossIncome ?? Math.max(0, remainingBaseAfterCol - depDeduction);

  const annualContributionAtRate = contribution.annualContributionAtRate ?? Math.round(adjustedGrossIncome * 0.0275);
  const monthlyBeforeFloor = contribution.monthlyEquivalentBeforeFloor ?? Math.round(adjustedGrossIncome * 0.0275 / 12);
  const monthlyContribution = next.monthlyContribution ?? next.monthly ?? (contribution.finalMonthlyEquivalent || 300);
  const floorApplied = next.minimumContributionFloorApplied ?? contribution.minimumContributionFloorApplied ?? (monthlyContribution === 300 && monthlyBeforeFloor < 300);
  const zeroFloorAdjustment = rec.zeroFloorAdjustment ?? 0;

  const isReconciled = rec.isReconciled !== false &&
    (rec.baseReconciliationDifference === 0 || rec.baseReconciliationDifference === undefined) &&
    (rec.preFloorReconciliationDifference === 0 || rec.preFloorReconciliationDifference === undefined);

  // Household Composition
  const householdSize = d.householdSize || 1;
  const dependantCount = Math.max(0, householdSize - 1);
  const depRate = Math.min(dependantCount * 0.08, d.county && ["Turkana", "Mandera", "Wajir", "Garissa", "Marsabit", "Isiolo", "Samburu"].includes(d.county) ? 0.40 : 0.35);

  // Livelihood pattern description
  const livelihoodPattern = d.hasNoEarnedIncome
    ? "Explicit zero earned income declaration"
    : d.isSeasonalWorker
    ? "Seasonal agricultural / casual cycle"
    : earnedLines.length > 0
    ? `Commercial / self-employment (${earnedLines[0].label || "Trade"})`
    : "Declared net monthly earnings";

  // Handle challenge toggle
  const handleToggleChallenge = (challengeId) => {
    if (activeChallengeId === challengeId) {
      setActiveChallengeId(null);
      setRecalcResult(null);
      setRecalcError(null);
    } else {
      setActiveChallengeId(challengeId);
      setRecalcResult(null);
      setRecalcError(null);

      // Prepopulate default challenge inputs
      if (challengeId === "turnover") {
        const src = earnedLines[0] || (d.incomeSources && d.incomeSources[0]) || {};
        const srcGross = src.totalReceivedKsh ?? src.grossReceivedKsh ?? src.amountReceivedKsh ?? (d.monthlyGrossIncome ? d.monthlyGrossIncome * 12 : 540000);
        setChallengeInputs({
          sourceId: src.sourceId || src.id || "src-wanjiru-retail",
          proposedAmount: srcGross,
          reason: "Turnover records audited by market stall committee"
        });
      } else if (challengeId === "expenses") {
        const src = earnedLines[0] || (d.incomeSources && d.incomeSources[0]) || {};
        const srcCosts = src.totalReportedCostsKsh ?? src.costsKsh ?? src.directCostsKsh ?? 180000;
        setChallengeInputs({
          sourceId: src.sourceId || src.id || "src-wanjiru-retail",
          proposedCosts: srcCosts,
          reason: "Receipts for market stall rental, municipal license and wholesale transport verified"
        });
      } else if (challengeId === "dependants") {
        setChallengeInputs({
          proposedHouseholdSize: Math.max(1, householdSize - 1),
          reason: "One dependant moved to tertiary education and declared independently"
        });
      }
    }
  };

  // Run recalculation for challenge
  const handleExecuteRecalculation = () => {
    setRecalcError(null);
    try {
      if (activeChallengeId === "turnover") {
        const sourceId = challengeInputs.sourceId;
        const proposedAmount = parseFloat(challengeInputs.proposedAmount);
        if (isNaN(proposedAmount) || proposedAmount < 0) {
          throw new Error("Please enter a valid non-negative gross turnover amount in KSh.");
        }

        const res = recalculateCorrectedSource({
          originalInputs: d,
          originalResults: results,
          sourceId,
          correctedAmountReceivedKsh: proposedAmount,
          explanation: challengeInputs.reason,
          adminParams
        });
        setRecalcResult({ type: "income", data: res });
      } else if (activeChallengeId === "expenses") {
        const sourceId = challengeInputs.sourceId;
        const proposedCosts = parseFloat(challengeInputs.proposedCosts);
        if (isNaN(proposedCosts) || proposedCosts < 0) {
          throw new Error("Please enter a valid non-negative operating expenses amount in KSh.");
        }

        const res = recalculateCorrectedSource({
          originalInputs: d,
          originalResults: results,
          sourceId,
          correctedCostsKsh: proposedCosts,
          explanation: challengeInputs.reason,
          adminParams
        });
        setRecalcResult({ type: "income", data: res });
      } else if (activeChallengeId === "dependants") {
        const proposedSize = parseInt(challengeInputs.proposedHouseholdSize, 10);
        if (isNaN(proposedSize) || proposedSize < 1) {
          throw new Error("Please enter a valid positive household size.");
        }

        const clonedInputs = JSON.parse(JSON.stringify(d));
        clonedInputs.householdSize = proposedSize;
        const revisedModel = calculateProposedModel(clonedInputs, {
          enableExperimentalPolicyAdjustments: true,
          ...adminParams
        });

        const origMonthly = monthlyContribution;
        const revMonthly = revisedModel.monthlyContribution;
        const diff = revMonthly - origMonthly;

        let explanationText = "";
        if (diff === 0) {
          explanationText = `Household size changed to ${proposedSize}, but the calculated monthly contribution remains at KSh 300/mo due to the statutory minimum floor under Regulation 17(2).`;
        } else if (diff < 0) {
          explanationText = `Decreasing household dependants adjusted the dependency allowance, changing the monthly contribution by KSh ${Math.abs(diff).toLocaleString()} (from KSh ${origMonthly.toLocaleString()} to KSh ${revMonthly.toLocaleString()}).`;
        } else {
          explanationText = `Changing household size to ${proposedSize} resulted in an assessed monthly contribution of KSh ${revMonthly.toLocaleString()} (difference: +KSh ${diff.toLocaleString()}).`;
        }

        setRecalcResult({
          type: "dependants",
          data: {
            proposedHouseholdSize: proposedSize,
            originalHouseholdSize: householdSize,
            originalMonthly,
            revisedMonthly: revMonthly,
            diff,
            explanationText,
            revisedAGI: revisedModel.adjustedGrossIncome,
            originalAGI: adjustedGrossIncome
          }
        });
      }
    } catch (err) {
      setRecalcError(err.message);
    }
  };

  return (
    <div style={{ display: "grid", gap: 20, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: theme.text, maxWidth: 1040, width: "100%", boxSizing: "border-box", margin: "0 auto", overflowX: "hidden" }}>
      {/* ─────────────────────────────────────────────────────────────────────────────
          TOP BANNER: PROTOTYPE DEMONSTRATION NOTICE
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ background: theme.surface, border: `2px solid ${statusBadgeConfig.border}`, borderRadius: 10, padding: 18, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, width: "100%", boxSizing: "border-box" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={20} color={theme.blue} />
              <div style={{ fontSize: 18, fontWeight: 800, color: theme.text, letterSpacing: "-0.2px" }}>
                SHA PMT Reform Evaluation Prototype
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.blue, marginTop: 3 }}>
              Taarifa ya Michango ya Mwanachama — Illustrative Member Contribution Statement
            </div>
            <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
              Itemised calculation statement based on frozen demonstration inputs and declared-income model.
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "0 1 auto" }}>
            <div style={{ display: "inline-block", padding: "5px 12px", borderRadius: 20, background: statusBadgeConfig.bg, border: `1px solid ${statusBadgeConfig.border}`, color: statusBadgeConfig.text, fontSize: 11, fontWeight: 700 }}>
              {statusBadgeConfig.label}
            </div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>
              Session Ref: <strong style={{ color: theme.text }}>{sessionReference}</strong>
            </div>
            <div style={{ fontSize: 11, color: theme.muted }}>
              Date: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div style={{ marginTop: 14, padding: "10px 14px", background: theme.surfaceUp, borderLeft: `3px solid ${theme.blue}`, borderRadius: 6, fontSize: 11, lineHeight: 1.5, color: theme.muted, boxSizing: "border-box" }}>
          <strong style={{ color: theme.blue }}>Statutory Contribution Reference:</strong> Regulation 17(1) and 17(2), read with Regulation 21 of Legal Notice No. 49 of 2024.
          <br />
          <span style={{ color: theme.text }}>
            This prototype uses a <strong>declared-income research model</strong> with experimental living adjustments. It is <strong>NOT</strong> an official SHA determination, payment demand, invoice, or reproduction of the official 43-variable means-testing instrument.
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          PROMINENT TOP CARD: EVALUATED MONTHLY CONTRIBUTION
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, width: "100%", boxSizing: "border-box" }}>
          <div style={{ flex: "1 1 240px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Evaluated Monthly Contribution (Prototype)
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: floorApplied ? theme.amber : theme.blue, marginTop: 4, letterSpacing: "-0.5px" }}>
              KSh {money(monthlyContribution)}<span style={{ fontSize: 16, fontWeight: 600, color: theme.muted }}>/mo</span>
            </div>
            <div style={{ fontSize: 12, color: theme.text, marginTop: 4 }}>
              Illustrative annual equivalent: <strong>KSh {money(monthlyContribution * 12)}</strong> per year
            </div>
          </div>

          <div style={{ flex: "1 1 300px", maxWidth: 460, fontSize: 12, color: theme.muted, background: theme.surfaceUp, padding: 14, borderRadius: 8, border: `1px solid ${theme.borderUp}`, lineHeight: 1.5, boxSizing: "border-box" }}>
            <div style={{ fontWeight: 700, color: floorApplied ? theme.amber : theme.sage, marginBottom: 4 }}>
              {floorApplied ? "Regulation 17(2) Statutory Floor Applied" : "Standard 2.75% Rate Assessment (Regulation 17(1))"}
            </div>
            {floorApplied
              ? "The calculated 2.75% amount is below KSh 300/month. The statutory minimum contribution floor applies as a payable floor under Regulation 17(2). This floor does not constitute an indigence determination or financial assistance approval under Regulation 18."
              : "The calculated 2.75% amount meets or exceeds KSh 300/month. Standard rate-based assessment applies based on evaluated net earnings."}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 1: DECLARED HOUSEHOLD NET EARNED INCOME
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.border}`, paddingBottom: 10, marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.blue, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            1. DECLARED HOUSEHOLD NET EARNED INCOME
          </div>
          <span style={{ fontSize: 11, color: theme.muted }}>
            Observation Window: 12 Completed Months ({refPeriod.startDate} to {refPeriod.endDate})
          </span>
        </div>

        {/* Source by Source Accounting Table */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%", maxWidth: "100%", boxSizing: "border-box", marginBottom: 10 }}>
          <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: theme.surfaceUp, borderBottom: `2px solid ${theme.border}` }}>
                <th style={{ textAlign: "left", padding: "10px 14px", color: theme.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                  Income Source
                </th>
                <th style={{ textAlign: "right", padding: "10px 14px", color: theme.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                  Gross Turnover
                </th>
                <th style={{ textAlign: "right", padding: "10px 14px", color: theme.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                  Operating Expenses
                </th>
                <th style={{ textAlign: "right", padding: "10px 14px", color: theme.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>
                  Net Earnings (Annualised)
                </th>
              </tr>
            </thead>
            <tbody>
              {d.hasNoEarnedIncome ? (
                <tr>
                  <td colSpan={4} style={{ padding: 14, textAlign: "center", color: theme.sage, background: theme.sageD, borderBottom: `1px solid ${theme.border}` }}>
                    ✓ Household has explicitly declared <strong>zero earned income</strong> from active livelihoods. No operating costs or earnings are deducted or added.
                  </td>
                </tr>
              ) : earnedLines.length > 0 ? (
                earnedLines.map((line, idx) => {
                  const gross = line.totalReceivedKsh ?? line.grossReceivedKsh ?? (line.amountReceivedKsh || 0);
                  const costs = line.totalReportedCostsKsh ?? line.costsKsh ?? (line.directCostsKsh || 0);
                  const net = line.reportedNetKsh ?? line.netForObservationPeriodKsh ?? (gross - costs);
                  const obsMonths = line.observationMonths || 12;
                  const monthlyNet = line.averageMonthlyNetKsh ?? line.monthlyNetKsh ?? Math.round(net / obsMonths);
                  const monthlyGross = Math.round(gross / obsMonths);
                  const monthlyCosts = Math.round(costs / obsMonths);

                  return (
                    <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, color: theme.text }}>
                          {line.label || "Retail Market Trader"}
                        </div>
                        <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
                          ID: <code style={{ color: theme.blue }}>{line.sourceId}</code> · Observation: {obsMonths} months full annual
                        </div>
                        {(line.costOfGoodsSoldKsh > 0 || line.stockPurchasesKsh > 0) && (
                          <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
                            Stock purchases / COGS: KSh {money(line.costOfGoodsSoldKsh || line.stockPurchasesKsh)} · Other ops: KSh {money(line.otherOperatingCostsKsh || (costs - (line.costOfGoodsSoldKsh || 0)))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, color: theme.text, fontFamily: "monospace" }}>
                          KSh {money(gross)}
                        </div>
                        <div style={{ fontSize: 11, color: theme.muted }}>
                          KSh {money(monthlyGross)}/mo
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, color: costs > 0 ? theme.terra : theme.muted, fontFamily: "monospace" }}>
                          {costs > 0 ? `- KSh ${money(costs)}` : "—"}
                        </div>
                        {costs > 0 && (
                          <div style={{ fontSize: 11, color: theme.muted }}>
                            KSh {money(monthlyCosts)}/mo
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 800, color: theme.blue, fontFamily: "monospace", fontSize: 14 }}>
                          KSh {money(net)}
                        </div>
                        <div style={{ fontSize: 11, color: theme.muted }}>
                          KSh {money(monthlyNet)}/mo net
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                /* Fallback if direct preset base without structured lines */
                <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 700, color: theme.text }}>
                      {d.activeScenario || "Retail Market Trader"}
                    </div>
                    <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
                      12 completed observation months · Declared net earnings baseline
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700, color: theme.text, fontFamily: "monospace" }}>
                      KSh {money(d.monthlyGrossIncome ? d.monthlyGrossIncome * 12 : 540000)}
                    </div>
                    <div style={{ fontSize: 11, color: theme.muted }}>
                      KSh {money(d.monthlyGrossIncome || 45000)}/mo
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700, color: theme.terra, fontFamily: "monospace" }}>
                      - KSh {money(d.monthlyGrossIncome ? (d.monthlyGrossIncome * 12 - annualBaseTotal) : 180000)}
                    </div>
                    <div style={{ fontSize: 11, color: theme.muted }}>
                      KSh {money(d.monthlyGrossIncome ? (d.monthlyGrossIncome - (d.monthlyNetEarnedIncome || 30000)) : 15000)}/mo
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 800, color: theme.blue, fontFamily: "monospace", fontSize: 14 }}>
                      KSh {money(annualBaseTotal)}
                    </div>
                    <div style={{ fontSize: 11, color: theme.muted }}>
                      KSh {money(annualBaseTotal / 12)}/mo net
                    </div>
                  </td>
                </tr>
              )}

              {/* Subtotal Row */}
              <tr style={{ background: theme.surfaceUp, fontWeight: 800 }}>
                <td style={{ padding: "12px 14px", color: theme.text }}>
                  Total Annual Net Earned Base (A)
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: theme.text, fontFamily: "monospace" }}>
                  KSh {money(earnedLines.length > 0 ? earnedLines.reduce((s, l) => s + (l.totalReceivedKsh ?? l.grossReceivedKsh ?? l.amountReceivedKsh ?? 0), 0) : (d.monthlyGrossIncome ? d.monthlyGrossIncome * 12 : 540000))}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: theme.terra, fontFamily: "monospace" }}>
                  - KSh {money(earnedLines.length > 0 ? earnedLines.reduce((s, l) => s + (l.totalReportedCostsKsh ?? l.costsKsh ?? l.directCostsKsh ?? 0), 0) : (d.monthlyGrossIncome ? (d.monthlyGrossIncome * 12 - annualBaseTotal) : 180000))}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: theme.blue, fontFamily: "monospace", fontSize: 15 }}>
                  KSh {money(annualBaseTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Explanatory notes */}
        <div style={{ marginTop: 12, padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, fontSize: 12, lineHeight: 1.5, color: theme.muted, boxSizing: "border-box" }}>
          <p style={{ margin: 0, marginBottom: 6 }}>
            <strong style={{ color: theme.text }}>Note on Net Earnings:</strong> Gross turnover represents money collected by the business. Operating expenses represent the business costs recorded for this assessment. The amount counted as earned income is the net amount recognised by the prototype income ledger.
          </p>
          <p style={{ margin: 0, fontSize: 11, fontStyle: "italic", color: theme.muted }}>
            * Calculation integrity principle: Capital assets (vehicles, land, livestock), transaction velocity, and debt are treated as contextual verification signals and are NOT added to the earned income base.
          </p>
        </div>

        {/* Excluded Non-Earned Financial Flows */}
        {otherLines.length > 0 && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: theme.amberD, border: `1px solid ${theme.amberBd}`, borderRadius: 6, fontSize: 12, color: theme.amber, boxSizing: "border-box" }}>
            <strong>Excluded Financial Flows ({otherLines.length} recorded):</strong> In accordance with prototype data rules, transfers, loans, reimbursements and chama group funds are <strong>strictly excluded</strong> from the earned-income base.
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2: HOUSEHOLD LIVING ADJUSTMENTS AND ALLOWANCES
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.border}`, paddingBottom: 10, marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.blue, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            2. HOUSEHOLD LIVING ADJUSTMENTS AND ALLOWANCES
          </div>
          <span style={{ fontSize: 11, color: theme.amber, fontWeight: 700 }}>
            EXPERIMENTAL PROTOTYPE ASSUMPTIONS
          </span>
        </div>

        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          <table style={{ width: "100%", minWidth: 540, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: theme.surfaceUp, borderBottom: `2px solid ${theme.border}` }}>
                <th style={{ textAlign: "left", padding: "10px 14px", color: theme.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "26%" }}>
                  Adjustment Description
                </th>
                <th style={{ textAlign: "left", padding: "10px 14px", color: theme.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "26%", minWidth: 175 }}>
                  Status / Category
                </th>
                <th style={{ textAlign: "left", padding: "10px 14px", color: theme.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "32%" }}>
                  Calculation Basis / Derivation
                </th>
                <th style={{ textAlign: "right", padding: "10px 14px", color: theme.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", width: "16%", minWidth: 110 }}>
                  Adjustment Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Cost of Living Allowance */}
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, color: theme.text }}>
                    Cost of Living Allowance
                  </div>
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
                    Experimental prototype assumption — not a statutory deduction under Regulation 17
                  </div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: theme.amberD, border: `1px solid ${theme.amberBd}`, color: theme.amber, fontWeight: 700, display: "inline-block", whiteSpace: "nowrap" }}>
                    EXPERIMENTAL PROTOTYPE ASSUMPTION
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: theme.muted, fontSize: 12 }}>
                  Location: <strong>{d.county || "Nakuru"} Urban Tier 2</strong> · Annual survival threshold: KSh {money(colDeduction || 120000)} (KSh 10,000/mo)
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: theme.terra, fontFamily: "monospace", fontWeight: 700 }}>
                  - KSh {money(colDeduction || 120000)}
                </td>
              </tr>

              {/* Dependency Allowance */}
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, color: theme.text }}>
                    Dependency Allowance
                  </div>
                  <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
                    Experimental dependency adjustment — not a statutory deduction under Regulation 17
                  </div>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: theme.amberD, border: `1px solid ${theme.amberBd}`, color: theme.amber, fontWeight: 700, display: "inline-block", whiteSpace: "nowrap" }}>
                    EXPERIMENTAL PROTOTYPE ASSUMPTION
                  </span>
                </td>
                <td style={{ padding: "12px 14px", color: theme.muted, fontSize: 12 }}>
                  {dependantCount} dependants ({householdSize} members) × 8% = <strong>{Math.round(depRate * 100)}%</strong> of remaining base (KSh {money(remainingBaseAfterCol || 240000)})
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: theme.terra, fontFamily: "monospace", fontWeight: 700 }}>
                  - KSh {money(depDeduction || 76800)}
                </td>
              </tr>

              {/* Subtotal Row */}
              <tr style={{ background: theme.surfaceUp, fontWeight: 800 }}>
                <td colSpan={3} style={{ padding: "12px 14px", color: theme.text }}>
                  Total Living Adjustments (B)
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: theme.terra, fontFamily: "monospace", fontSize: 15 }}>
                  - KSh {money((colDeduction || 120000) + (depDeduction || 76800))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 3: NET CALCULATION RECONCILIATION
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${theme.border}`, paddingBottom: 10, marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.blue, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            3. NET CALCULATION RECONCILIATION
          </div>
          <span style={{ fontSize: 11, color: theme.muted }}>
            Full Accounting Ladder & Contribution Derivation
          </span>
        </div>

        {/* Step-by-Step Accounting Ladder */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.text }}>Annual Net Earned Base (A):</span>
            <strong style={{ color: theme.text, fontFamily: "monospace" }}>KSh {money(annualBaseTotal)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.muted }}>Less Cost of Living Allowance:</span>
            <strong style={{ color: theme.terra, fontFamily: "monospace" }}>- KSh {money(colDeduction || 120000)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.muted }}>Remaining Base:</span>
            <strong style={{ color: theme.text, fontFamily: "monospace" }}>KSh {money(remainingBaseAfterCol || 240000)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.muted }}>Less Dependency Allowance:</span>
            <strong style={{ color: theme.terra, fontFamily: "monospace" }}>- KSh {money(depDeduction || 76800)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: theme.blueD, border: `1px solid ${theme.blueBd}`, borderRadius: 6, flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800, color: theme.blue, textTransform: "uppercase", fontSize: 12 }}>
                FINAL PROTOTYPE-ADJUSTED INCOME BASE (AGI)
              </div>
              <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>
                This figure is produced by the declared-income research model. It is not a published SHA production PMT output.
              </div>
            </div>
            <strong style={{ fontSize: 18, fontWeight: 900, color: theme.blue, fontFamily: "monospace" }}>
              KSh {money(adjustedGrossIncome || 163200)}
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.text }}>Annual Contribution Rate (Regulation 17(1)):</span>
            <strong style={{ color: theme.text, fontFamily: "monospace" }}>2.75%</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.text }}>Annual Contribution at Rate:</span>
            <strong style={{ color: theme.text, fontFamily: "monospace" }}>KSh {money(annualContributionAtRate || 4488)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.text }}>Monthly Equivalent (Annual / 12):</span>
            <strong style={{ color: theme.text, fontFamily: "monospace" }}>KSh {money(monthlyBeforeFloor || 374)}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.muted }}>Non-negative income adjustment:</span>
            <strong style={{ color: zeroFloorAdjustment > 0 ? theme.sage : theme.muted, fontFamily: "monospace" }}>
              {zeroFloorAdjustment > 0 ? `+ KSh ${money(zeroFloorAdjustment)} (Applied)` : "Not required."}
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: theme.surfaceUp, borderRadius: 6, flexWrap: "wrap", gap: 6 }}>
            <span style={{ color: theme.muted }}>KSh 300 Minimum Contribution (Regulation 17(2)):</span>
            <strong style={{ color: floorApplied ? theme.amber : theme.sage }}>
              {floorApplied ? "Applied — statutory floor under Regulation 17(2)" : "Not applied — calculated amount is higher."}
            </strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: floorApplied ? theme.amberD : theme.sageD, border: `1px solid ${floorApplied ? theme.amberBd : theme.sageBd}`, borderRadius: 6, flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 800, color: floorApplied ? theme.amber : theme.sage }}>
              Final Monthly Equivalent:
            </span>
            <strong style={{ fontSize: 18, fontWeight: 900, color: floorApplied ? theme.amber : theme.sage, fontFamily: "monospace" }}>
              KSh {money(monthlyContribution || 374)}/mo
            </strong>
          </div>
        </div>

        {/* Arithmetic check & reconciliation indicator */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, fontSize: 12 }}>
          {isReconciled ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: theme.sage, fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              Mathematical Reconciliation Verified: Base Diff = 0 · Pre-Floor Diff = 0 (Independent Arithmetic Checked)
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: theme.terra, fontWeight: 600 }}>
              <AlertTriangle size={16} />
              Reconciliation Discrepancy: Base Diff = {rec.baseReconciliationDifference || 0} · Pre-Floor Diff = {rec.preFloorReconciliationDifference || 0}
            </div>
          )}
          <div style={{ color: theme.muted, fontFamily: "monospace" }}>
            Check: {annualBaseTotal} - {colDeduction || 120000} - {depDeduction || 76800} = {adjustedGrossIncome || 163200} × 0.0275 = {annualContributionAtRate || 4488} / 12 = {monthlyBeforeFloor || 374}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 4: CONTEXTUAL VERIFICATION STATUS
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, width: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: theme.blue, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14, borderBottom: `1px solid ${theme.border}`, paddingBottom: 10 }}>
          4. CONTEXTUAL VERIFICATION STATUS
        </div>

        <div style={{ display: "grid", gap: 8, fontSize: 12, background: theme.surfaceUp, padding: 14, borderRadius: 8, border: `1px solid ${theme.borderUp}`, lineHeight: 1.6, boxSizing: "border-box" }}>
          <div>
            <strong style={{ color: theme.text }}>Verification Routing:</strong>{" "}
            <span style={{ color: theme.muted }}>
              {next.requiresChpVerification ? "Flagged for manual Community Health Promoter (CHP) field review." : "No prototype rule triggered manual review."}
            </span>
          </div>
          <div>
            <strong style={{ color: theme.text }}>Evidence Status:</strong>{" "}
            <span style={{ color: theme.muted }}>
              Member-declared information; supporting evidence not independently verified.
            </span>
          </div>
          <div>
            <strong style={{ color: theme.text }}>External Data:</strong>{" "}
            <span style={{ color: theme.muted }}>
              No live KRA, NTSA, Lands Registry, bank or mobile-money records connected.
            </span>
          </div>
          <div>
            <strong style={{ color: theme.text }}>Livelihood Pattern:</strong>{" "}
            <span style={{ color: theme.muted }}>
              {livelihoodPattern} (Origin: Member declaration)
            </span>
          </div>
        </div>

        {/* Contextual Characteristics Table */}
        <div style={{ marginTop: 14, overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, textTransform: "uppercase", marginBottom: 6 }}>
            Contextual Housing & Household Characteristics
          </div>
          <table style={{ width: "100%", minWidth: 460, borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: theme.surfaceUp, borderBottom: `1px solid ${theme.border}` }}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: theme.muted, fontWeight: 600 }}>Characteristic / Item</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: theme.muted, fontWeight: 600 }}>Recorded Information</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: theme.muted, fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: "8px 12px", color: theme.text }}>Dwelling Type & Walls</td>
                <td style={{ padding: "8px 12px", color: theme.muted }}>{d.dwellingType || "Bungalow"} · Wall: {d.wallMaterial || "Stone"}</td>
                <td style={{ padding: "8px 12px", color: theme.amber }}>Member-declared (unverified)</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: "8px 12px", color: theme.text }}>Water & Energy Access</td>
                <td style={{ padding: "8px 12px", color: theme.muted }}>Water: {d.waterSource || "Public tap"} · Energy: {d.lightingEnergy || "Electricity"}</td>
                <td style={{ padding: "8px 12px", color: theme.amber }}>Member-declared (unverified)</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: "8px 12px", color: theme.text }}>Reported Assets</td>
                <td style={{ padding: "8px 12px", color: theme.muted }}>{d.assets && d.assets.length > 0 ? d.assets.join(", ") : "Not recorded"}</td>
                <td style={{ padding: "8px 12px", color: theme.muted }}>{d.assets && d.assets.length > 0 ? "Member-declared (unverified)" : "Not recorded"}</td>
              </tr>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: "8px 12px", color: theme.text }}>Vehicles & Land</td>
                <td style={{ padding: "8px 12px", color: theme.muted }}>
                  {d.vehicles && d.vehicles.length > 0 ? `${d.vehicles.length} vehicle(s)` : "Not recorded"} · Land: {d.landAcreage ? `${d.landAcreage} acres` : "Not recorded"}
                </td>
                <td style={{ padding: "8px 12px", color: theme.muted }}>
                  {d.vehicles?.length > 0 || d.landAcreage ? "Member-declared (unverified)" : "Not recorded"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 5: MEMBER REVIEW AND CORRECTION
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, width: "100%", boxSizing: "border-box" }}>
        <div style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: theme.blue, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            5. MEMBER REVIEW AND CORRECTION
          </div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
            A household should never see a contribution number without being able to understand where it came from and what information they can question. Select an item below to review or simulate a factual correction.
          </div>
        </div>

        {/* 8 Compact Review Items Table */}
        <div style={{ display: "grid", gap: 8 }}>
          {[
            { id: "turnover", num: "1", title: "Business turnover", desc: "Question the money collected by the enterprise", current: `KSh ${money(earnedLines[0]?.totalReceivedKsh || 540000)}/yr` },
            { id: "expenses", num: "2", title: "Operating expenses", desc: "Question recorded stock or business costs", current: `KSh ${money(earnedLines[0]?.totalReportedCostsKsh || 180000)}/yr` },
            { id: "dependants", num: "3", title: "Number of dependants", desc: "Correct household size or family members", current: `${dependantCount} dependants (${householdSize} members)` },
            { id: "col", num: "4", title: "Cost of Living Allowance", desc: "Question the model's geographic living cost assumption", current: `KSh ${money(colDeduction || 120000)}/yr (${d.county || "Nakuru"})` },
            { id: "dep_allowance", num: "5", title: "Dependency Allowance", desc: "Question the dynamic scaling factor (8% per dependant)", current: `${Math.round(depRate * 100)}% (KSh ${money(depDeduction || 76800)}/yr)` },
            { id: "characteristics", num: "6", title: "Household characteristics", desc: "Correct recorded dwelling, wall or energy data", current: `${d.dwellingType || "Bungalow"} · ${d.wallMaterial || "Stone"}` },
            { id: "external", num: "7", title: "External evidence", desc: "Dispute a possible or incorrect registry match", current: "No live registries connected" },
            { id: "arithmetic", num: "8", title: "Contribution arithmetic", desc: "Review the mathematical steps and statutory floor check", current: `Diff = 0 (KSh ${money(monthlyContribution || 374)}/mo)` }
          ].map(item => {
            const isOpen = activeChallengeId === item.id;
            return (
              <div key={item.id} style={{ border: `1px solid ${isOpen ? theme.blueBd : theme.border}`, borderRadius: 6, background: isOpen ? theme.surfaceUp : theme.surface, overflow: "hidden", width: "100%", boxSizing: "border-box" }}>
                <div
                  onClick={() => handleToggleChallenge(item.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer", userSelect: "none", flexWrap: "wrap", gap: 8 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 260px" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, width: 20, height: 20, borderRadius: 10, background: isOpen ? theme.blue : theme.faint, color: isOpen ? theme.surface : theme.text, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {item.num}
                    </span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: isOpen ? theme.blue : theme.text }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: 12, color: theme.muted, marginLeft: 8 }}>
                        — {item.desc}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: theme.muted, fontFamily: "monospace" }}>
                      {item.current}
                    </span>
                    <button
                      type="button"
                      style={{ padding: "4px 10px", fontSize: 11, fontWeight: 700, background: isOpen ? theme.blue : theme.surfaceUp, color: isOpen ? theme.surface : theme.blue, border: `1px solid ${isOpen ? theme.blue : theme.blueBd}`, borderRadius: 4, cursor: "pointer" }}
                    >
                      {isOpen ? "Close" : "Question / Correct"}
                    </button>
                  </div>
                </div>

                {/* Inline Challenge Interface */}
                {isOpen && (
                  <div style={{ padding: "14px 16px", borderTop: `1px dashed ${theme.border}`, background: theme.surfaceUp, width: "100%", boxSizing: "border-box" }}>
                    <div style={{ marginBottom: 12, fontSize: 11, color: theme.amber, fontWeight: 600 }}>
                      LOCAL PROTOTYPE SIMULATION ONLY — NOT AN OFFICIAL SHA APPEAL SUBMISSION
                    </div>

                    {/* Turnover challenge */}
                    {item.id === "turnover" && (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 4, textTransform: "uppercase" }}>
                              Original Gross Turnover (KSh/year)
                            </label>
                            <input
                              type="text"
                              disabled
                              value={`KSh ${money(earnedLines[0]?.totalReceivedKsh || 540000)}`}
                              style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 4, color: theme.muted, fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 4, textTransform: "uppercase" }}>
                              Proposed Corrected Turnover (KSh/year)
                            </label>
                            <input
                              type="number"
                              value={challengeInputs.proposedAmount || ""}
                              onChange={e => setChallengeInputs({ ...challengeInputs, proposedAmount: e.target.value })}
                              style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.blueBd}`, borderRadius: 4, color: theme.text, fontSize: 13, fontWeight: 700, boxSizing: "border-box" }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 4, textTransform: "uppercase" }}>
                            Reason for Correction / Supporting Ledger Note
                          </label>
                          <input
                            type="text"
                            value={challengeInputs.reason || ""}
                            onChange={e => setChallengeInputs({ ...challengeInputs, reason: e.target.value })}
                            placeholder="e.g. Audited records indicate off-peak season turnover was overstated"
                            style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 4, color: theme.text, fontSize: 12, boxSizing: "border-box" }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={handleExecuteRecalculation}
                            style={{ padding: "8px 16px", background: theme.blue, color: theme.surface, border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                          >
                            Simulate Recalculation
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Operating expenses challenge */}
                    {item.id === "expenses" && (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 4, textTransform: "uppercase" }}>
                              Original Recorded Expenses (KSh/year)
                            </label>
                            <input
                              type="text"
                              disabled
                              value={`KSh ${money(earnedLines[0]?.totalReportedCostsKsh || 180000)}`}
                              style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 4, color: theme.muted, fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 4, textTransform: "uppercase" }}>
                              Proposed Corrected Expenses (KSh/year)
                            </label>
                            <input
                              type="number"
                              value={challengeInputs.proposedCosts || ""}
                              onChange={e => setChallengeInputs({ ...challengeInputs, proposedCosts: e.target.value })}
                              style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.blueBd}`, borderRadius: 4, color: theme.text, fontSize: 13, fontWeight: 700, boxSizing: "border-box" }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 4, textTransform: "uppercase" }}>
                            Reason for Correction / Supporting Ledger Note
                          </label>
                          <input
                            type="text"
                            value={challengeInputs.reason || ""}
                            onChange={e => setChallengeInputs({ ...challengeInputs, reason: e.target.value })}
                            placeholder="e.g. Added verified wholesale transport and stall electricity costs"
                            style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 4, color: theme.text, fontSize: 12, boxSizing: "border-box" }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={handleExecuteRecalculation}
                            style={{ padding: "8px 16px", background: theme.blue, color: theme.surface, border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                          >
                            Simulate Recalculation
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Dependants challenge */}
                    {item.id === "dependants" && (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 4, textTransform: "uppercase" }}>
                              Current Household Members
                            </label>
                            <input
                              type="text"
                              disabled
                              value={`${householdSize} members (${dependantCount} dependants)`}
                              style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 4, color: theme.muted, fontSize: 13, boxSizing: "border-box" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 4, textTransform: "uppercase" }}>
                              Proposed Household Size
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={challengeInputs.proposedHouseholdSize || ""}
                              onChange={e => setChallengeInputs({ ...challengeInputs, proposedHouseholdSize: e.target.value })}
                              style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.blueBd}`, borderRadius: 4, color: theme.text, fontSize: 13, fontWeight: 700, boxSizing: "border-box" }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.text, marginBottom: 4, textTransform: "uppercase" }}>
                            Reason for Household Composition Correction
                          </label>
                          <input
                            type="text"
                            value={challengeInputs.reason || ""}
                            onChange={e => setChallengeInputs({ ...challengeInputs, reason: e.target.value })}
                            placeholder="e.g. Child attained age 18 and registers independently"
                            style={{ width: "100%", padding: "8px 10px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 4, color: theme.text, fontSize: 12, boxSizing: "border-box" }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                          <button
                            type="button"
                            onClick={handleExecuteRecalculation}
                            style={{ padding: "8px 16px", background: theme.blue, color: theme.surface, border: "none", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                          >
                            Simulate Recalculation
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Policy Allowance challenges (COL / Dep) */}
                    {(item.id === "col" || item.id === "dep_allowance") && (
                      <div style={{ fontSize: 12, lineHeight: 1.5, color: theme.muted, background: theme.surface, padding: 12, borderRadius: 6, border: `1px solid ${theme.border}`, boxSizing: "border-box" }}>
                        <div style={{ fontWeight: 700, color: theme.amber, marginBottom: 4 }}>
                          Model-Policy Challenge (Non-Factual)
                        </div>
                        <p style={{ margin: 0, marginBottom: 6 }}>
                          Cost of living thresholds and dependency scaling factors are <strong>research policy assumptions</strong> configured in this prototype, rather than statutory deductions under Regulation 17.
                        </p>
                        <p style={{ margin: 0, color: theme.text }}>
                          Questioning this assumption does not alter member factual declarations; it records an administrative policy dispute regarding the appropriateness of Nakuru Tier 2 rates or per-capita scaling.
                        </p>
                      </div>
                    )}

                    {/* Characteristics / External / Arithmetic challenges */}
                    {item.id === "characteristics" && (
                      <div style={{ fontSize: 12, color: theme.muted, background: theme.surface, padding: 12, borderRadius: 6, border: `1px solid ${theme.border}`, boxSizing: "border-box" }}>
                        <div style={{ fontWeight: 700, color: theme.text, marginBottom: 4 }}>Contextual Characteristics Dispute</div>
                        Under the declared-income research model, physical assets (radios, televisions, vehicles, housing material) are treated strictly as contextual verification signals and are <strong>not converted into earned income</strong>. Correcting these fields updates metadata without affecting the earned-income calculation base.
                      </div>
                    )}

                    {item.id === "external" && (
                      <div style={{ fontSize: 12, color: theme.muted, background: theme.surface, padding: 12, borderRadius: 6, border: `1px solid ${theme.border}`, boxSizing: "border-box" }}>
                        <div style={{ fontWeight: 700, color: theme.text, marginBottom: 4 }}>External Evidence Verification</div>
                        This demonstration prototype has no live connections to KRA, NTSA, Lands Registry, or bank/mobile-money APIs. All recorded data represents unverified member self-declarations.
                      </div>
                    )}

                    {item.id === "arithmetic" && (
                      <div style={{ fontSize: 12, color: theme.muted, background: theme.surface, padding: 12, borderRadius: 6, border: `1px solid ${theme.border}`, boxSizing: "border-box" }}>
                        <div style={{ fontWeight: 700, color: theme.sage, marginBottom: 4 }}>Arithmetic Step Verification</div>
                        <div style={{ fontFamily: "monospace", color: theme.text }}>
                          Net Income: KSh {money(annualBaseTotal)}<br />
                          - Cost of Living: KSh {money(colDeduction || 120000)} = KSh {money(remainingBaseAfterCol || 240000)}<br />
                          - Dependency ({Math.round(depRate * 100)}%): KSh {money(depDeduction || 76800)} = KSh {money(adjustedGrossIncome || 163200)}<br />
                          × 2.75% = KSh {money(annualContributionAtRate || 4488)} / 12 = KSh {money(monthlyBeforeFloor || 374)}/mo.<br />
                          Floor check: {monthlyBeforeFloor || 374} {floorApplied ? "< 300 → applied KSh 300" : "≥ 300 → standard rate"}.
                        </div>
                      </div>
                    )}

                    {/* Error display */}
                    {recalcError && (
                      <div style={{ marginTop: 10, padding: 10, background: theme.terraD, border: `1px solid ${theme.terraBd}`, borderRadius: 4, color: theme.terra, fontSize: 12 }}>
                        ⚠ {recalcError}
                      </div>
                    )}

                    {/* Recalculation Results Comparison */}
                    {recalcResult && (
                      <div style={{ marginTop: 14, padding: 14, background: theme.surface, border: `1px solid ${theme.blueBd}`, borderRadius: 6, boxSizing: "border-box" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: theme.blue, textTransform: "uppercase", marginBottom: 8 }}>
                          Recalculation Simulation Output (Comparison)
                        </div>

                        {recalcResult.type === "income" && (
                          <div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
                              <div style={{ background: theme.surfaceUp, padding: 10, borderRadius: 4 }}>
                                <div style={{ fontSize: 11, color: theme.muted }}>Original Monthly Contribution</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>
                                  KSh {money(recalcResult.data.comparison.originalMonthlyContribution)}/mo
                                </div>
                              </div>
                              <div style={{ background: theme.surfaceUp, padding: 10, borderRadius: 4 }}>
                                <div style={{ fontSize: 11, color: theme.muted }}>Revised Monthly Contribution</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: theme.sage }}>
                                  KSh {money(recalcResult.data.comparison.revisedMonthlyContribution)}/mo
                                </div>
                              </div>
                              <div style={{ background: theme.surfaceUp, padding: 10, borderRadius: 4 }}>
                                <div style={{ fontSize: 11, color: theme.muted }}>Net Monthly Variance</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: recalcResult.data.comparison.monthlyDifference < 0 ? theme.sage : theme.amber }}>
                                  {recalcResult.data.comparison.monthlyDifference === 0
                                    ? "KSh 0 (No change)"
                                    : `${recalcResult.data.comparison.monthlyDifference > 0 ? "+" : ""}KSh ${money(recalcResult.data.comparison.monthlyDifference)}/mo`}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.5 }}>
                              {recalcResult.data.comparison.explanationText}
                            </div>
                          </div>
                        )}

                        {recalcResult.type === "dependants" && (
                          <div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 10 }}>
                              <div style={{ background: theme.surfaceUp, padding: 10, borderRadius: 4 }}>
                                <div style={{ fontSize: 11, color: theme.muted }}>Original Monthly Contribution</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>
                                  KSh {money(recalcResult.data.originalMonthly)}/mo
                                </div>
                              </div>
                              <div style={{ background: theme.surfaceUp, padding: 10, borderRadius: 4 }}>
                                <div style={{ fontSize: 11, color: theme.muted }}>Revised Monthly Contribution</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: theme.sage }}>
                                  KSh {money(recalcResult.data.revisedMonthly)}/mo
                                </div>
                              </div>
                              <div style={{ background: theme.surfaceUp, padding: 10, borderRadius: 4 }}>
                                <div style={{ fontSize: 11, color: theme.muted }}>Monthly Variance</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: recalcResult.data.diff <= 0 ? theme.sage : theme.amber }}>
                                  {recalcResult.data.diff === 0
                                    ? "KSh 0 (Floor applied)"
                                    : `${recalcResult.data.diff > 0 ? "+" : ""}KSh ${money(recalcResult.data.diff)}/mo`}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.5 }}>
                              {recalcResult.data.explanationText}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => { setRecalcResult(null); setActiveChallengeId(null); }}
                            style={{ padding: "6px 12px", background: theme.surfaceUp, color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                          >
                            Reset Challenge
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          PROTOTYPE LEGAL NOTICE (FOOTER)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px dashed ${theme.border}`, paddingTop: 14, fontSize: 11, color: theme.muted, lineHeight: 1.6, width: "100%", boxSizing: "border-box" }}>
        <strong>PROTOTYPE DEMONSTRATION NOTICE:</strong> This document is an illustrative output produced solely for technical demonstration and policy evaluation of the proposed AGI rules engine. Statutory contribution reference: Regulation 17(1) and 17(2), read with Regulation 21 of Legal Notice No. 49 of 2024. Regulation 17(1) specifies an annual contribution of 2.75% of income determined through means testing under Regulation 21; Regulation 17(2) sets the monthly minimum floor at KSh 300 for non-salaried households. Regulation 18 governs the identification of indigent households needing financial assistance. Applying the KSh 300 minimum contribution floor under Regulation 17(2) does NOT constitute an indigence determination or grant financial assistance under Regulation 18. This prototype uses a declared-income research model and experimental adjustments. It is NOT a reproduction of the official SHA PMT model. All income estimations, illustrative deductions, and model rules are research assumptions that require validation against SHA's official instrument, parameters, and administrative implementation.
      </div>
    </div>
  );
}
