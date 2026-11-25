import React from "react";
import { CheckCircle2, AlertTriangle, Info, ShieldCheck, FileText, Calendar, Building, User } from "lucide-react";

export default function DemoCalculationReceipt({ results, S }) {
  if (!results) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: S.muted }}>
        No calculation results available. Please review household details and click "Confirm details and calculate".
      </div>
    );
  }

  const d = results.d || {};
  const incomeSnapshot = d.incomeAssessmentSnapshot || results.next?.incomeAssessmentSnapshot || {};
  const next = results.next || {};
  const modelVersions = results.modelVersions || {};
  const lines = incomeSnapshot.lines || [];
  const earnedLines = lines.filter(l => l.bucket === "EARNED");
  const otherLines = lines.filter(l => l.bucket !== "EARNED");
  const reviewFlags = incomeSnapshot.reviewFlags || [];

  const status = incomeSnapshot.calculationStatus || "CALCULATED_STANDARD";
  const canCalculate = incomeSnapshot.canPopulatePrototypeEarnedIncomeBase !== false && status === "CALCULATED_STANDARD";

  const statusBadgeConfig = {
    CALCULATED_STANDARD: { bg: S.sageD, border: S.sageBd, text: S.sage, label: "Calculated (Standard 12-Month Window)" },
    CALCULATED_EXPLICIT_ZERO_EARNED: { bg: S.sageD, border: S.sageBd, text: S.sage, label: "Calculated (Explicit Zero Earned Income)" },
    BLOCKED_MANUAL_REVIEW: { bg: S.terraD, border: S.terraBd, text: S.terra, label: "Blocked — Manual Review Required" },
    BLOCKED_SHORT_WINDOW_REVIEW: { bg: S.amberD, border: S.amberBd, text: S.amber, label: "Blocked — Short Observation Window" },
    BLOCKED_EXTENDED_OBSERVATION_PERIOD: { bg: S.terraD, border: S.terraBd, text: S.terra, label: "Blocked — Extended Observation Window (>12 Months)" },
    PROVISIONAL_PENDING_POLICY: { bg: S.amberD, border: S.amberBd, text: S.amber, label: "Provisional — Pending Policy Decision" },
  }[status] || { bg: S.surfaceUp, border: S.border, text: S.muted, label: status };

  const refPeriod = incomeSnapshot.commonAssessmentPeriod || {
    startDate: "2025-11-01",
    endDate: "2026-10-31",
    label: "Previous 12 completed months (2025-11-01 to 2026-10-31)"
  };

  const monthlyNet = incomeSnapshot.monthlyEarnedNetKsh;
  const annualNet = incomeSnapshot.annualisedEarnedNetKsh;
  const reviewOnlyMonthly = incomeSnapshot.reviewOnlyMonthlyEarnedNetKsh;
  const reviewOnlyAnnual = incomeSnapshot.reviewOnlyAnnualisedEarnedNetKsh;

  const monthlyContribution = next.monthly ?? 300;
  const annualContribution = monthlyContribution * 12;
  const floorApplied = next.minimumContributionFloorApplied ?? (monthlyContribution === 300 && (monthlyNet || 0) * 0.0275 < 300);

  // Generate plain-language summary paragraph
  const summaryParagraph = (() => {
    const county = d.county || "declared county";
    const size = d.householdSize || 1;
    if (d.hasNoEarnedIncome || status === "CALCULATED_EXPLICIT_ZERO_EARNED") {
      return `Household in ${county} (family size ${size}) has explicitly declared having no earned income from active livelihoods over the reference period. Under statutory rules (Regulation 18(2)), the standard minimum contribution floor of KSh 300 per month applies (KSh 3,600 annually). This minimum contribution does not constitute a determination of indigence or grant financial assistance under Regulation 19.`;
    }
    if (!canCalculate) {
      return `Household in ${county} (family size ${size}) reported declared earnings with a review-only monthly net of KSh ${(reviewOnlyMonthly || 0).toLocaleString()} (annualised: KSh ${(reviewOnlyAnnual || 0).toLocaleString()}). However, this assessment is currently BLOCKED (${statusBadgeConfig.label}) and cannot enter the formal contribution model until the documented review items below are resolved by an assessment officer.`;
    }
    return `Based on 12 completed months of declared income across ${earnedLines.length} active livelihood source(s), the household in ${county} (family size ${size}) is assessed at a net monthly earned income of KSh ${(monthlyNet || 0).toLocaleString()} (annualised to KSh ${(annualNet || 0).toLocaleString()}). Applying the statutory 2.75% contribution rate ${floorApplied ? "results in a preliminary amount below KSh 300, so the statutory minimum contribution floor of KSh 300/month applies (KSh 3,600/year)" : `yields an assessed monthly contribution of KSh ${monthlyContribution.toLocaleString()}/month (KSh ${annualContribution.toLocaleString()}/year)`}. The minimum contribution floor operates purely as a payment baseline and does not make an indigence determination.`;
  })();

  return (
    <div style={{ display: "grid", gap: 24, fontFamily: "'Inter', sans-serif" }}>
      {/* Top Banner */}
      <div style={{ background: S.surface, border: `2px solid ${statusBadgeConfig.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={22} color={S.blue} />
              <div style={{ fontSize: 20, fontWeight: 800, color: S.text }}>
                Demonstration Calculation Receipt
              </div>
            </div>
            <div style={{ fontSize: 13, color: S.muted, marginTop: 4 }}>
              Itemised calculation statement based on frozen demonstration assessment inputs.
            </div>
          </div>
          <div style={{ display: "inline-block", padding: "6px 14px", borderRadius: 20, background: statusBadgeConfig.bg, border: `1px solid ${statusBadgeConfig.border}`, color: statusBadgeConfig.text, fontSize: 12, fontWeight: 700 }}>
            {statusBadgeConfig.label}
          </div>
        </div>
      </div>

      {/* SECTION A: Assessment Details */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.blue, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Section A: Assessment & Household Details
        </div>
        <div className="grid-3" style={{ gap: 12, fontSize: 13 }}>
          <div>
            <span style={{ color: S.muted }}>Household Profile:</span>{" "}
            <strong>{d.activeScenario || "Custom Household Entry"}</strong>
          </div>
          <div>
            <span style={{ color: S.muted }}>County of Residence:</span>{" "}
            <strong>{d.county || "Not specified"}</strong>
          </div>
          <div>
            <span style={{ color: S.muted }}>Household Composition:</span>{" "}
            <strong>{d.householdSize || 1} members (Head: {d.headAge || "—"} yrs, {d.headGender || "—"})</strong>
          </div>
          <div>
            <span style={{ color: S.muted }}>Assessment Model:</span>{" "}
            <strong>{modelVersions.declaredIncome?.id || "declared-income-agi-v1.1"}</strong>
          </div>
          <div>
            <span style={{ color: S.muted }}>Model Commit Hash:</span>{" "}
            <code style={{ fontSize: 11, background: S.faint, padding: "2px 6px", borderRadius: 4 }}>
              {(modelVersions.declaredIncome?.sourceCommit || "b8095765247dce9751fc4f32bf35f0611f86ce52").slice(0, 10)}
            </code>
          </div>
          <div>
            <span style={{ color: S.muted }}>Reference Period:</span>{" "}
            <strong>{refPeriod.startDate} to {refPeriod.endDate} (12 completed months)</strong>
          </div>
        </div>
      </div>

      {/* SECTION B: Itemised Earned-Income Breakdown */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: S.blue, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Section B: Itemised Earned-Income Breakdown
          </div>
          <span style={{ fontSize: 11, color: S.muted }}>
            {d.hasNoEarnedIncome ? "Zero Earned Income Declared" : `${earnedLines.length} Declared Source(s)`}
          </span>
        </div>

        {d.hasNoEarnedIncome ? (
          <div style={{ padding: 14, background: S.sageD, border: `1px solid ${S.sageBd}`, borderRadius: 6, fontSize: 13, color: S.sage }}>
            ✓ Household has explicitly declared <strong>zero earned income</strong> from active livelihoods. No operating costs or earnings are deducted or added.
          </div>
        ) : earnedLines.length === 0 ? (
          <div style={{ padding: 14, background: S.surfaceUp, borderRadius: 6, fontSize: 13, color: S.muted }}>
            No earned income sources recorded in this assessment.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {earnedLines.map((line, idx) => (
              <div key={idx} style={{ padding: 14, background: S.surfaceUp, borderRadius: 8, border: `1px solid ${S.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: S.text }}>
                      {line.label} <span style={{ fontSize: 11, color: S.muted, fontWeight: 500 }}>(ID: {line.sourceId})</span>
                    </div>
                    <div style={{ fontSize: 12, color: S.muted, marginTop: 2 }}>
                      Observation: {line.observationStartDate || "Start"} to {line.observationEndDate || "End"} · {line.observationMonths} completed months
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: line.isDuplicate ? S.muted : S.text }}>
                      {line.isDuplicate ? "Excluded (Duplicate)" : `KSh ${line.averageMonthlyNetKsh.toLocaleString()}/mo`}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: line.periodStatus === "FULL_ANNUAL" ? S.sage : S.amber }}>
                      Status: {line.periodStatus}
                    </div>
                  </div>
                </div>

                {/* Arithmetic details */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${S.border}`, fontSize: 12 }}>
                  <div>
                    <span style={{ color: S.muted }}>Reported Gross:</span><br />
                    <strong>KSh {line.totalReceivedKsh.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span style={{ color: S.muted }}>Deductible Expenses:</span><br />
                    <strong>KSh {line.totalReportedCostsKsh.toLocaleString()}</strong>
                  </div>
                  {line.costOfGoodsSoldKsh !== null && (
                    <div>
                      <span style={{ color: S.muted }}>Stock / COGS:</span><br />
                      <strong>KSh {line.costOfGoodsSoldKsh.toLocaleString()}</strong>
                    </div>
                  )}
                  {line.overlapAmountKsh !== null && line.overlapAmountKsh > 0 && (
                    <div>
                      <span style={{ color: S.muted }}>Overlap Deducted:</span><br />
                      <strong style={{ color: S.amber }}>KSh {line.overlapAmountKsh.toLocaleString()}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: S.muted }}>Net Period Earnings:</span><br />
                    <strong style={{ color: S.blue }}>KSh {line.reportedNetKsh.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION C: Annual Reconciliation */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.blue, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Section C: Annual Reconciliation & Statutory Basis
        </div>
        <div className="grid-2" style={{ gap: 16 }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ padding: 12, background: S.surfaceUp, borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: S.text }}>Net Monthly Earned Income:</span>
              <strong style={{ fontSize: 14, color: canCalculate ? S.text : S.terra }}>
                {canCalculate ? `KSh ${(monthlyNet || 0).toLocaleString()}` : "Blocked from classification"}
              </strong>
            </div>
            <div style={{ padding: 12, background: S.surfaceUp, borderRadius: 6, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: S.text }}>Annualised Net Earned Income (AGI Base):</span>
              <strong style={{ fontSize: 14, color: canCalculate ? S.blue : S.terra }}>
                {canCalculate ? `KSh ${(annualNet || 0).toLocaleString()}` : "Not approved for classification"}
              </strong>
            </div>
            {otherLines.length > 0 && (
              <div style={{ padding: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, fontSize: 12, color: "#92400E" }}>
                <strong>Excluded Financial Flows:</strong> {otherLines.length} flow(s) totaling KSh {(incomeSnapshot.monthlyPolicyReviewResourcesKsh || 0 + incomeSnapshot.monthlyNonEarnedFlowsKsh || 0 + incomeSnapshot.monthlyFiduciaryFlowsKsh || 0).toLocaleString()}/month were recorded. In accordance with prototype rules, transfers, loans, reimbursements and chama group funds are <strong>strictly excluded</strong> from the earned-income base.
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.6, background: S.faint, padding: 14, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, color: S.text, marginBottom: 4 }}>Statutory Annualisation Safeguards</div>
            Regulation 21 and income assessment standards require that irregular earnings be observed over a full, completed 12-month calendar window. Observation periods shorter than 12 months are marked provisional, while observation periods exceeding 12 months are blocked from automatic multiplication to prevent peak-month extrapolation.
          </div>
        </div>
      </div>

      {/* SECTION D: Contribution Calculation */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.blue, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Section D: Contribution Calculation & Floor Rules
        </div>
        <div className="grid-3" style={{ gap: 14 }}>
          <div style={{ padding: 14, background: S.surfaceUp, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, textTransform: "uppercase", fontWeight: 700 }}>Statutory Rate</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: S.text, marginTop: 4 }}>2.75%</div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>of annualised AGI / 12</div>
          </div>
          <div style={{ padding: 14, background: S.surfaceUp, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: S.muted, textTransform: "uppercase", fontWeight: 700 }}>Preliminary Amount</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: S.text, marginTop: 4 }}>
              KSh {Math.round(((annualNet || 0) * 0.0275) / 12).toLocaleString()}/mo
            </div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>Before statutory floor check</div>
          </div>
          <div style={{ padding: 14, background: floorApplied ? S.amberD : S.sageD, border: `1px solid ${floorApplied ? S.amberBd : S.sageBd}`, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: floorApplied ? S.amber : S.sage, textTransform: "uppercase", fontWeight: 700 }}>
              Final Monthly Payable
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: floorApplied ? S.amber : S.sage, marginTop: 4 }}>
              KSh {monthlyContribution.toLocaleString()}/mo
            </div>
            <div style={{ fontSize: 11, color: S.text, marginTop: 2 }}>
              KSh {annualContribution.toLocaleString()} per year
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 12, background: S.blueD, border: `1px solid ${S.blueBd}`, borderRadius: 6, fontSize: 12, color: S.text, lineHeight: 1.5 }}>
          <strong style={{ color: S.blue }}>Statutory Minimum Rule (Regulation 18(2)):</strong> {floorApplied
            ? "The calculated 2.75% amount is below KSh 300/month. The statutory minimum contribution floor applies as a payable floor. This floor does not constitute an indigence determination or financial assistance approval under Regulation 19."
            : "The calculated 2.75% amount meets or exceeds KSh 300/month. Standard rate-based assessment applies."}
        </div>
      </div>

      {/* SECTION E: Review and Evidence Status */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.blue, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          Section E: Review and Evidence Status
        </div>
        {reviewFlags.length === 0 ? (
          <div style={{ padding: 12, background: S.sageD, border: `1px solid ${S.sageBd}`, borderRadius: 6, color: S.sage, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
            <CheckCircle2 size={16} />
            <span>No review flags detected. Assessment satisfies all prototype data integrity requirements.</span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {reviewFlags.map((flag, idx) => (
              <div key={idx} style={{ padding: 10, background: S.surfaceUp, borderLeft: `4px solid ${flag.code.includes("BLOCKED") || flag.code.includes("REQUIRED") ? S.terra : S.amber}`, borderRadius: 4, fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AlertTriangle size={15} color={flag.code.includes("BLOCKED") || flag.code.includes("REQUIRED") ? S.terra : S.amber} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong style={{ color: S.text }}>[{flag.code}]</strong>{" "}
                  <span style={{ color: S.muted }}>{flag.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION F: Plain-Language Summary Statement */}
      <div style={{ background: S.surfaceUp, border: `1px solid ${S.borderUp}`, borderRadius: 10, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.text, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          Section F: Plain-Language Summary Statement
        </div>
        <div style={{ fontSize: 13, color: S.text, lineHeight: 1.6 }}>
          {summaryParagraph}
        </div>
      </div>
    </div>
  );
}
