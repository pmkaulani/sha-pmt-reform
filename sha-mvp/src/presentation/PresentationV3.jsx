import React, { useMemo, useState, useEffect, useRef } from "react";
import "./presentation-v3.css";
import {
  calculateHouseholdIncome,
  createZeroEarnedIncomeAssessment,
  INCOME_SOURCE_RULES,
  calculateMonthsFromDates,
  resolveEffectiveIncomeSources,
  DEFAULT_COMMON_ASSESSMENT_PERIOD
} from "../lib/household-income.js";
import {
  EARNED_SOURCE_TYPES,
  OTHER_MONEY_SOURCE_TYPES,
  getIncomeSourceUiRules,
  buildAssessmentReview
} from "../lib/assessment-flow.js";
import { validateAssessmentInputs } from "../lib/AlgorithmSimulation.js";
import { buildReceiptViewModel } from "./receipt-view-model.js";
import { recalculateCorrectedSource } from "./recalculate-correction.js";
import {
  DWELLING_LABELS,
  OWNERSHIP_LABELS,
  WATER_LABELS,
  LIGHTING_LABELS,
  formatEnumLabel,
  formatAssetsSummary,
  formatKsh,
  formatV3TextStatement
} from "./v3-statement-formatter.js";

const SCREENS = [
  { id: "intro", num: "00", label: "Overview", group: "journey" },
  { id: "household", num: "01", label: "Household profile", group: "journey" },
  { id: "income", num: "02", label: "Earned income", group: "journey" },
  { id: "other", num: "03", label: "Other money", group: "journey" },
  { id: "review", num: "04", label: "Review declaration", group: "journey" },
  { id: "logic", num: "05", label: "Calculation path", group: "explain" },
  { id: "methods", num: "06", label: "Method comparison", group: "explain" },
  { id: "receipt", num: "07", label: "Itemised statement", group: "explain" },
  { id: "correction", num: "08", label: "Correction history", group: "explain" }
];

const EXTRA_ASSETS = [
  ["TV", "TV"],
  ["FRIDGE", "Fridge"],
  ["COMPUTER", "Computer"],
  ["FEATURE_PHONE", "Feature phone"],
  ["MOTORCYCLE", "Motorcycle"],
  ["CAR", "Car"],
  ["BICYCLE", "Bicycle"]
];

function moneyNum(val) {
  const n = Number(val);
  return Number.isFinite(n) ? Math.round(n).toLocaleString("en-KE") : "0";
}

function getStockPurchases(src) {
  if (!Array.isArray(src?.expenses)) return 0;
  return src.expenses
    .filter((e) => e.category === "STOCK_PURCHASES")
    .reduce((s, e) => s + (Number(e.amountKsh) || 0), 0);
}

function getOtherOperatingCosts(src) {
  if (Array.isArray(src?.expenses) && src.expenses.length > 0) {
    return src.expenses
      .filter((e) => e.category !== "STOCK_PURCHASES")
      .reduce((s, e) => s + (Number(e.amountKsh) || 0), 0);
  }
  return Number(src?.directCostsKsh) || 0;
}

export default function PresentationV3({
  inputs,
  upd,
  toggleAsset,
  addListItem,
  updListItem,
  removeListItem,
  setInputs,
  activeScenario,
  scenarios,
  loadScenario,
  onSelectCustom,
  adminParams,
  setAdminParams,
  results,
  onRunCalculation,
  classifying,
  formError,
  setFormError,
  setHasAcknowledgedDemo,
  onSwitchToWorkspace,
  counties = []
}) {
  const [screen, setScreen] = useState("intro");
  const [statementTableView, setStatementTableView] = useState(false);
  const [copiedStatement, setCopiedStatement] = useState(false);

  // Correction screen state (Screen 08)
  const [selectedCorrectionSourceId, setSelectedCorrectionSourceId] = useState("");
  const [correctedGrossInput, setCorrectedGrossInput] = useState("");
  const [correctedCostsInput, setCorrectedCostsInput] = useState("");
  const [correctionReason, setCorrectionReason] = useState("A duplicated entry was found in the sales notebook.");
  const [correctionEvidenceRef, setCorrectionEvidenceRef] = useState("Sales ledger / notebook reference");
  const [showCorrectedStatement, setShowCorrectedStatement] = useState(false);
  const correctedStatementRef = useRef(null);

  const navigate = (id) => {
    setScreen(id);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const allSources = Array.isArray(inputs.incomeSources) ? inputs.incomeSources : [];
  const effectiveSources = useMemo(
    () => resolveEffectiveIncomeSources(allSources, inputs.hasNoEarnedIncome === true),
    [allSources, inputs.hasNoEarnedIncome]
  );

  const earnedEntries = useMemo(
    () =>
      allSources
        .map((src, originalIndex) => ({ src, originalIndex }))
        .filter(({ src }) => {
          const rule = INCOME_SOURCE_RULES[src.sourceType] || INCOME_SOURCE_RULES.OTHER_EARNED;
          return rule.bucket === "EARNED";
        }),
    [allSources]
  );

  const otherMoneyEntries = useMemo(
    () =>
      allSources
        .map((src, originalIndex) => ({ src, originalIndex }))
        .filter(({ src }) => {
          const rule = INCOME_SOURCE_RULES[src.sourceType] || INCOME_SOURCE_RULES.OTHER_EARNED;
          return rule.bucket !== "EARNED";
        }),
    [allSources]
  );

  const hasStructuredSources = effectiveSources.length > 0;

  // Live household income ledger calculation (does not trigger full assessment until confirmed)
  const liveIncomeSnapshot = useMemo(() => {
    if (hasStructuredSources) {
      return calculateHouseholdIncome(effectiveSources, DEFAULT_COMMON_ASSESSMENT_PERIOD);
    }
    if (inputs.hasNoEarnedIncome) {
      return createZeroEarnedIncomeAssessment(DEFAULT_COMMON_ASSESSMENT_PERIOD);
    }
    const monthly = Number(inputs.monthlyNetEarnedIncome || 0);
    return {
      isValid: true,
      calculationStatus: "CALCULATED_STANDARD",
      canPopulatePrototypeEarnedIncomeBase: true,
      monthlyEarnedNetKsh: monthly,
      reviewOnlyMonthlyEarnedNetKsh: monthly,
      annualisedEarnedNetKsh: monthly * 12,
      reviewOnlyAnnualisedEarnedNetKsh: monthly * 12,
      lines: [],
      reviewFlags: [
        {
          code: "DIRECT_ENTRY_DEMO_BASELINE",
          message: "Direct monthly net income baseline entered without structured ledger decomposition (DEMO ONLY)."
        }
      ],
      duplicateRelationships: [],
      monthlyPolicyReviewResourcesKsh: 0,
      monthlyNonEarnedFlowsKsh: 0,
      monthlyFiduciaryFlowsKsh: 0,
      requiresManualReview: false,
      requiresPolicyDecision: false,
      assessmentInputMode: "DIRECT_ENTRY_DEMO_ONLY",
      calculationVersion: "direct-entry-baseline-v1.1"
    };
  }, [hasStructuredSources, effectiveSources, inputs.hasNoEarnedIncome, inputs.monthlyNetEarnedIncome]);

  const reviewData = useMemo(
    () =>
      buildAssessmentReview({
        inputs,
        incomeAssessmentSnapshot: liveIncomeSnapshot,
        incomeSources: effectiveSources
      }),
    [inputs, liveIncomeSnapshot, effectiveSources]
  );

  const inputValidation = useMemo(() => {
    const previewInputs = {
      ...inputs,
      monthlyNetEarnedIncome: inputs.hasNoEarnedIncome
        ? 0
        : hasStructuredSources
          ? liveIncomeSnapshot.monthlyEarnedNetKsh ?? liveIncomeSnapshot.reviewOnlyMonthlyEarnedNetKsh ?? 0
          : inputs.monthlyNetEarnedIncome
    };
    return validateAssessmentInputs(previewInputs);
  }, [inputs, hasStructuredSources, liveIncomeSnapshot]);

  // Live preview figures for Screen 00 & Screen 02 even when review flags exist
  const earnedLinesLive = (liveIncomeSnapshot.lines || []).filter((l) => l.bucket === "EARNED" && l.isActive !== false);
  const liveGrossAnnual = earnedLinesLive.length > 0
    ? earnedLinesLive.reduce((s, l) => s + (l.totalReceivedKsh || 0), 0)
    : inputs.hasNoEarnedIncome
      ? 0
      : (Number(inputs.monthlyGrossIncome || inputs.monthlyNetEarnedIncome || 0) * 12);
  const liveCostsAnnual = earnedLinesLive.length > 0
    ? earnedLinesLive.reduce((s, l) => s + (l.totalReportedCostsKsh || 0), 0)
    : 0;
  const liveNetAnnual = earnedLinesLive.length > 0
    ? earnedLinesLive.reduce((s, l) => s + (l.reportedNetKsh || 0), 0)
    : inputs.hasNoEarnedIncome
      ? 0
      : (Number(inputs.monthlyNetEarnedIncome || 0) * 12);

  // Build live receipt view model when confirmed results exist
  const receipt = useMemo(() => {
    if (!results?.next) return null;
    try {
      return buildReceiptViewModel(results);
    } catch {
      return null;
    }
  }, [results]);

  const monospacedStatementText = useMemo(() => {
    if (!results || !receipt) return "";
    return formatV3TextStatement(results, receipt);
  }, [results, receipt]);

  // Initialize correction inputs whenever confirmed results update
  useEffect(() => {
    if (!receipt) {
      setSelectedCorrectionSourceId("");
      setCorrectedGrossInput("");
      setCorrectedCostsInput("");
      setShowCorrectedStatement(false);
      return;
    }
    const primary = receipt.incomeLines?.[0];
    if (primary) {
      setSelectedCorrectionSourceId(String(primary.sourceId));
      const suggestedGross = primary.grossReceivedKsh >= 540000
        ? primary.grossReceivedKsh - 20000
        : primary.grossReceivedKsh;
      setCorrectedGrossInput(String(suggestedGross));
      setCorrectedCostsInput(String(primary.costsKsh ?? 0));
    } else {
      setSelectedCorrectionSourceId("");
      setCorrectedGrossInput("");
      setCorrectedCostsInput("");
    }
    setShowCorrectedStatement(false);
  }, [results, receipt]);

  // Live correction calculation via real recalculateCorrectedSource engine
  const correctionPreview = useMemo(() => {
    if (!results?.next || !receipt || !selectedCorrectionSourceId) {
      return { error: null, output: null };
    }
    const selectedLine = receipt.incomeLines.find((l) => String(l.sourceId) === String(selectedCorrectionSourceId));
    if (!selectedLine) return { error: null, output: null };

    const grossTrimmed = String(correctedGrossInput ?? "").trim();
    const costsTrimmed = String(correctedCostsInput ?? "").trim();
    const origCostsNum = Number(selectedLine.costsKsh ?? 0);
    const costsModified = costsTrimmed !== "" && Number(costsTrimmed) !== origCostsNum;

    if (grossTrimmed === "" && !costsModified) {
      return { error: "Enter a corrected gross receipts or operating costs figure.", output: null };
    }

    try {
      const output = recalculateCorrectedSource({
        originalInputs: results.d,
        originalResults: results,
        sourceId: selectedCorrectionSourceId,
        correctedAmountReceivedKsh: grossTrimmed === "" ? null : Number(grossTrimmed),
        correctedCostsKsh: costsModified ? Number(costsTrimmed) : null,
        explanation: correctionReason || "Corrected household declaration",
        adminParams: results.adminParamsSnapshot || adminParams
      });
      return { error: null, output };
    } catch (err) {
      return { error: err.message, output: null };
    }
  }, [results, receipt, selectedCorrectionSourceId, correctedGrossInput, correctedCostsInput, correctionReason, adminParams]);

  const correctedReceipt = useMemo(() => {
    if (!correctionPreview.output?.revisedResults) return null;
    try {
      return buildReceiptViewModel(correctionPreview.output.revisedResults);
    } catch {
      return null;
    }
  }, [correctionPreview]);

  const correctedStatementText = useMemo(() => {
    if (!correctionPreview.output?.revisedResults || !correctedReceipt) return "";
    return formatV3TextStatement(correctionPreview.output.revisedResults, correctedReceipt);
  }, [correctionPreview, correctedReceipt]);

  // Helper labels
  const headName =
    inputs.householdHead?.trim() ||
    (activeScenario && activeScenario !== "Custom" ? activeScenario.split("—")[0].trim() : "Household");
  const countyDisplay = inputs.county || "Nakuru";
  const genderDisplay =
    inputs.headGender === "FEMALE" || inputs.headGender === "F"
      ? "female"
      : inputs.headGender === "MALE" || inputs.headGender === "M"
        ? "male"
        : "not stated";

  const isCustomWithoutDirect =
    activeScenario === "Custom" &&
    !inputs.hasNoEarnedIncome &&
    earnedEntries.length === 0 &&
    inputs.allowDemoDirectEntry !== true;

  const isProvisionalPolicy = liveIncomeSnapshot.calculationStatus === "PROVISIONAL_PENDING_POLICY";
  const isBlockedReview =
    !liveIncomeSnapshot.isValid ||
    liveIncomeSnapshot.canPopulatePrototypeEarnedIncomeBase === false ||
    liveIncomeSnapshot.calculationStatus?.startsWith("BLOCKED_") ||
    isCustomWithoutDirect ||
    !inputValidation.isValid;

  const currentScreenMeta = SCREENS.find((s) => s.id === screen) || SCREENS[0];
  const currentIdx = SCREENS.findIndex((s) => s.id === screen);

  const handleConfirmAndCalculate = () => {
    setHasAcknowledgedDemo(true);
    onRunCalculation(() => {
      navigate("logic");
    });
  };

  const handleTopPrint = () => {
    if (results?.next) {
      navigate("receipt");
      setTimeout(() => window.print(), 200);
      return;
    }
    if (!isBlockedReview) {
      setHasAcknowledgedDemo(true);
      onRunCalculation(() => {
        navigate("receipt");
        setTimeout(() => window.print(), 220);
      });
    } else {
      navigate("review");
    }
  };

  const handleCopyStatement = async () => {
    const textToCopy = showCorrectedStatement && correctedStatementText ? correctedStatementText : monospacedStatementText;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedStatement(true);
      setTimeout(() => setCopiedStatement(false), 1800);
    } catch {
      setCopiedStatement(false);
    }
  };

  // Ledger helper: update stock purchases or other operating costs cleanly on an expense-eligible source
  const updateLedgerCategoryAmount = (originalIndex, category, newValue) => {
    const src = allSources[originalIndex];
    if (!src) return;
    const numericVal = newValue === "" ? 0 : Math.max(0, Number(newValue) || 0);
    const existing = Array.isArray(src.expenses) ? [...src.expenses] : [];

    let updatedExpenses;
    if (category === "STOCK_PURCHASES") {
      const idx = existing.findIndex((e) => e.category === "STOCK_PURCHASES");
      if (idx >= 0) {
        updatedExpenses = existing.map((e, i) => (i === idx ? { ...e, amountKsh: numericVal } : e));
      } else {
        updatedExpenses = [
          { id: `exp-stock-${Date.now()}`, category: "STOCK_PURCHASES", amountKsh: numericVal, description: "Stock purchases" },
          ...existing
        ];
      }
    } else {
      // Update single consolidated OTHER_OPERATING entry or replace non-stock entries
      const stockOnly = existing.filter((e) => e.category === "STOCK_PURCHASES");
      const nonStock = existing.filter((e) => e.category !== "STOCK_PURCHASES");
      if (nonStock.length <= 1) {
        const prev = nonStock[0];
        updatedExpenses = [
          ...stockOnly,
          {
            id: prev?.id || `exp-ops-${Date.now()}`,
            category: prev?.category || "OTHER_OPERATING",
            amountKsh: numericVal,
            description: prev?.description || "Other operating costs"
          }
        ];
      } else {
        updatedExpenses = [
          ...stockOnly,
          { id: `exp-ops-${Date.now()}`, category: "OTHER_OPERATING", amountKsh: numericVal, description: "Other operating costs" }
        ];
      }
    }

    const totalDirect = updatedExpenses.reduce((sum, e) => sum + (Number(e.amountKsh) || 0), 0);
    updListItem("incomeSources", originalIndex, "expenses", updatedExpenses);
    updListItem("incomeSources", originalIndex, "directCostsKsh", totalDirect);
  };

  const convertDirectPresetToLedger = () => {
    const monthly = Number(inputs.monthlyNetEarnedIncome || 0);
    const newSource = {
      id: `src-converted-${Date.now()}`,
      sourceType: "SELF_EMPLOYMENT",
      label: "Declared household earnings",
      amountReceivedKsh: monthly * 12,
      directCostsKsh: 0,
      monthsObserved: 12,
      observationStartDate: DEFAULT_COMMON_ASSESSMENT_PERIOD.startDate,
      observationEndDate: DEFAULT_COMMON_ASSESSMENT_PERIOD.endDate,
      expenses: [],
      openingStockKsh: 0,
      closingStockKsh: 0
    };
    setInputs((prev) => ({
      ...prev,
      incomeSources: [...(prev.incomeSources || []), newSource]
    }));
    setFormError(null);
  };

  const renderCalculationGate = (screenTitle) => (
    <div className="v3-gate-card">
      <div className="v3-kicker">Calculation confirmation required</div>
      <h3>Confirm the household declaration before inspecting {screenTitle.toLowerCase()}.</h3>
      <p>
        In this presentation flow, nothing is computed until the presenter reviews the entered household details,
        earned income ledger, and separated financial context on Step 04. This ensures every trace, statement, and
        audit snapshot reflects confirmed inputs.
      </p>
      <div className="v3-actions" style={{ marginTop: 10 }}>
        <button type="button" className="v3-btn" onClick={() => navigate("review")}>
          Go to Review declaration (04)
        </button>
        {!isBlockedReview && (
          <button
            type="button"
            className="v3-btn primary"
            disabled={classifying}
            onClick={() => {
              setHasAcknowledgedDemo(true);
              onRunCalculation(() => {});
            }}
          >
            {classifying ? "Calculating..." : "Confirm & run calculation now →"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="v3-root">
      {/* ── Topbar ── */}
      <header className="v3-topbar">
        <div className="v3-brand">
          <div className="v3-brandmark">SHA</div>
          <div>
            <div className="v3-brand-name">Household assessment</div>
            <div className="v3-brand-sub">Research demonstration · Kenya</div>
          </div>
        </div>
        <div className="v3-top-actions">
          <div className="v3-mode-switch" role="group" aria-label="Application view mode">
            <button type="button" className="v3-mode-btn active" aria-current="true">
              Guided Presentation
            </button>
            <button type="button" className="v3-mode-btn" onClick={onSwitchToWorkspace}>
              Full Workspace
            </button>
          </div>
          <span className="v3-prototype-pill">Independent research prototype</span>
          <button type="button" className="v3-top-link" onClick={handleTopPrint}>
            Print statement
          </button>
        </div>
      </header>

      <main className="v3-app-frame">
        {/* ── Sticky Left Rail ── */}
        <aside className="v3-rail">
          <div className="v3-case-meta">
            <div className="v3-kicker">Demonstration case</div>
            <strong>{activeScenario === "Custom" && !inputs.householdHead ? "Custom household" : `${headName}’s household`}</strong>
            <span>{countyDisplay} County · Synthetic profile</span>
            <div className="v3-case-select-wrap">
              <select
                className="v3-case-select"
                aria-label="Select demonstration scenario"
                value={activeScenario}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "Custom") {
                    onSelectCustom();
                  } else {
                    loadScenario(val);
                  }
                }}
              >
                <option value="Custom">Custom Household (Manual entry)</option>
                <optgroup label="Synthetic demonstration cases">
                  {Object.entries(scenarios).map(([name]) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div className="v3-rail-label">Assessment journey</div>
          <nav className="v3-rail-nav" aria-label="Assessment pages">
            {SCREENS.filter((s) => s.group === "journey").map((s, idx) => {
              const isActive = screen === s.id;
              const isDone = idx < currentIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${isActive ? "active" : ""} ${isDone ? "done" : ""}`.trim()}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => navigate(s.id)}
                >
                  <span className="v3-step-no">{s.num}</span>
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="v3-rail-label">Explain the result</div>
          <nav className="v3-rail-nav" aria-label="Explanation pages">
            {SCREENS.filter((s) => s.group === "explain").map((s) => {
              const sIdx = SCREENS.findIndex((item) => item.id === s.id);
              const isActive = screen === s.id;
              const isDone = sIdx < currentIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`${isActive ? "active" : ""} ${isDone ? "done" : ""}`.trim()}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => navigate(s.id)}
                >
                  <span className="v3-step-no">{s.num}</span>
                  {s.label}
                </button>
              );
            })}
          </nav>

          <div className="v3-rail-bottom">
            <strong>
              Presentation case · {results?.auditRecord?.localAssessmentId || "DEMO-WANJIRU-001"}
            </strong>
            All figures shown are synthetic. No live SHA, KRA, NTSA, bank or mobile-network service is connected.
          </div>
        </aside>

        {/* ── Main Content ── */}
        <section className="v3-content">
          <div className="v3-content-head">
            <div className="v3-crumb">
              Research prototype <span style={{ padding: "0 6px", color: "#b5beb6" }}>/</span>{" "}
              <b>{currentScreenMeta.label}</b>
            </div>
            <span className="v3-demo-badge">Synthetic scenario · Not an official SHA assessment</span>
          </div>

          {/* ── 00 / OVERVIEW ── */}
          {screen === "intro" && (
            <div className="v3-screen">
              <div className="v3-hero-layout">
                <div>
                  <div className="v3-kicker">A member-centred assessment journey</div>
                  <h1 className="v3-hero-title">
                    Make every figure explainable — from the first answer to the final amount.
                  </h1>
                  <p className="v3-hero-copy">
                    This demonstration follows one non-salaried household through a simple sequence: record the
                    household, reconcile what it earns, keep other money separate, review the declaration, then examine
                    the calculation. The goal is not to hide complexity. It is to make each step visible and
                    understandable.
                  </p>
                  <div className="v3-hero-actions">
                    <button type="button" className="v3-btn primary" onClick={() => navigate("household")}>
                      Start with the household <span aria-hidden="true">→</span>
                    </button>
                    <button type="button" className="v3-text-link" onClick={() => navigate("methods")}>
                      Understand the two methods
                    </button>
                  </div>
                </div>

                <div className="v3-hero-sheet">
                  <div className="v3-sheet-head">
                    <b>Household case file</b>
                    <span>CASE · {activeScenario === "Custom" ? "CUSTOM" : "DEMO-001"}</span>
                  </div>
                  <div className="v3-persona-name">{headName}</div>
                  <div className="v3-persona-sub">
                    {scenarios[activeScenario]?.badge || "Non-salaried household"} · {countyDisplay} County
                  </div>
                  <div className="v3-persona-stats">
                    <div>
                      <strong>{inputs.householdSize || 1}</strong>
                      <span>Household members</span>
                    </div>
                    <div>
                      <strong>{earnedLinesLive[0]?.observationMonths || 12}</strong>
                      <span>Months observed</span>
                    </div>
                    <div>
                      <strong>{inputs.headAge || "—"}</strong>
                      <span>Years old</span>
                    </div>
                  </div>
                  <div className="v3-sheet-detail">
                    <span>Income source</span>
                    <b>
                      {inputs.hasNoEarnedIncome
                        ? "Zero earned income declared"
                        : earnedLinesLive.length > 0
                          ? earnedLinesLive.map((l) => l.label).join(", ")
                          : "Direct demonstration baseline"}
                    </b>
                  </div>
                  <div className="v3-sheet-detail">
                    <span>Gross receipts</span>
                    <b>{formatKsh(liveGrossAnnual)} / year</b>
                  </div>
                  <div className="v3-sheet-detail">
                    <span>Operating costs</span>
                    <b>{formatKsh(liveCostsAnnual)} / year</b>
                  </div>
                  <div className="v3-sheet-detail">
                    <span>Net earned income</span>
                    <b>{formatKsh(liveNetAnnual)} / year</b>
                  </div>
                  <div className="v3-sheet-foot">
                    Illustrative profile supplied by the prototype’s synthetic test persona. It is not a real member
                    record.
                  </div>
                </div>
              </div>

              <div className="v3-story-steps">
                <div>
                  <b>01 · Record</b>
                  <span>Household and living context</span>
                </div>
                <div>
                  <b>02 · Reconcile</b>
                  <span>Turnover, stock and operating costs</span>
                </div>
                <div>
                  <b>03 · Review</b>
                  <span>Confirm every declared value</span>
                </div>
                <div>
                  <b>04 · Explain</b>
                  <span>Trace the result line by line</span>
                </div>
              </div>
            </div>
          )}

          {/* ── 01 / HOUSEHOLD PROFILE ── */}
          {screen === "household" && (
            <div className="v3-screen">
              <div className="v3-kicker">01 / Household profile</div>
              <h1 className="v3-screen-title">Who are we assessing?</h1>
              <p className="v3-screen-intro">
                Start with the household, not a contribution figure. Capture the people and living circumstances that
                describe the test persona. The details remain editable before the assessment is run.
              </p>

              <div className="v3-form-layout">
                <div className="v3-form-sheet">
                  <div className="v3-form-section">
                    <div className="v3-form-section-title">
                      <strong>Household identity</strong>
                      <span>Basic particulars</span>
                    </div>
                    <div className="v3-form-grid">
                      <div className="v3-field">
                        <label htmlFor="v3-head-name">Household head</label>
                        <input
                          id="v3-head-name"
                          value={inputs.householdHead || (activeScenario !== "Custom" ? headName : "")}
                          placeholder="e.g. Wanjiru"
                          onChange={(e) => upd("householdHead", e.target.value)}
                        />
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-county">County</label>
                        <select
                          id="v3-county"
                          value={inputs.county || "Nakuru"}
                          onChange={(e) => upd("county", e.target.value)}
                        >
                          {counties.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-hh-size">Household size</label>
                        <input
                          id="v3-hh-size"
                          type="number"
                          min={1}
                          max={20}
                          value={inputs.householdSize ?? 1}
                          onChange={(e) => upd("householdSize", Math.max(1, Math.round(Number(e.target.value) || 1)))}
                        />
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-head-age">Age of household head</label>
                        <input
                          id="v3-head-age"
                          type="number"
                          min={15}
                          max={110}
                          value={inputs.headAge ?? 38}
                          onChange={(e) => upd("headAge", Math.max(15, Math.min(110, Math.round(Number(e.target.value) || 15))))}
                        />
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-head-gender">Gender of household head</label>
                        <select
                          id="v3-head-gender"
                          value={inputs.headGender || "FEMALE"}
                          onChange={(e) => upd("headGender", e.target.value)}
                        >
                          <option value="FEMALE">Female</option>
                          <option value="MALE">Male</option>
                        </select>
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-dependants">Dependants</label>
                        <input
                          id="v3-dependants"
                          type="number"
                          min={0}
                          max={20}
                          value={inputs.dependantCount ?? ""}
                          placeholder="Not recorded"
                          onChange={(e) => {
                            const raw = e.target.value;
                            upd("dependantCount", raw === "" ? null : Math.max(0, Math.round(Number(raw) || 0)));
                          }}
                        />
                        <small>Recorded from the synthetic household profile</small>
                      </div>
                    </div>
                  </div>

                  <div className="v3-form-section">
                    <div className="v3-form-section-title">
                      <strong>Housing and basic services</strong>
                      <span>Living conditions</span>
                    </div>
                    <div className="v3-form-grid">
                      <div className="v3-field">
                        <label htmlFor="v3-dwelling">Dwelling type</label>
                        <select
                          id="v3-dwelling"
                          value={inputs.dwellingType || "BUNGALOW"}
                          onChange={(e) => upd("dwellingType", e.target.value)}
                        >
                          <option value="BUNGALOW">Bungalow</option>
                          <option value="APARTMENT">Flat / Apartment</option>
                          <option value="TRADITIONAL">Traditional</option>
                          <option value="SHANTY">Informal / Shanty</option>
                          <option value="ROOM">Single room</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-ownership">Ownership status</label>
                        <select
                          id="v3-ownership"
                          value={inputs.ownershipStatus || "OWNED"}
                          onChange={(e) => upd("ownershipStatus", e.target.value)}
                        >
                          <option value="OWNED">Owner-occupied</option>
                          <option value="RENTED">Rented</option>
                          <option value="FAMILY">Family-owned</option>
                        </select>
                      </div>
                      {inputs.ownershipStatus === "RENTED" && (
                        <div className="v3-field">
                          <label htmlFor="v3-rent">Monthly rent paid (KSh)</label>
                          <input
                            id="v3-rent"
                            type="number"
                            min={0}
                            value={inputs.monthlyRent ?? 0}
                            onChange={(e) => upd("monthlyRent", Math.max(0, Number(e.target.value) || 0))}
                          />
                        </div>
                      )}
                      <div className="v3-field">
                        <label htmlFor="v3-wall">Main wall material</label>
                        <select
                          id="v3-wall"
                          value={inputs.wallMaterial || "STONE"}
                          onChange={(e) => upd("wallMaterial", e.target.value)}
                        >
                          <option value="STONE">Stone</option>
                          <option value="BRICK">Brick</option>
                          <option value="WOOD">Wood</option>
                          <option value="IRON_SHEETS">Iron sheets</option>
                          <option value="MUD">Mud</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-roof">Main roof material</label>
                        <select
                          id="v3-roof"
                          value={inputs.roofMaterial || "IRON_SHEETS"}
                          onChange={(e) => upd("roofMaterial", e.target.value)}
                        >
                          <option value="IRON_SHEETS">Iron sheets</option>
                          <option value="TILES">Tiles</option>
                          <option value="CONCRETE">Concrete</option>
                          <option value="GRASS">Grass / thatch</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-water">Water source</label>
                        <select
                          id="v3-water"
                          value={inputs.waterSource || "PUBLIC_TAP"}
                          onChange={(e) => upd("waterSource", e.target.value)}
                        >
                          <option value="PUBLIC_TAP">Public tap</option>
                          <option value="PIPED_DWELLING">Piped into dwelling</option>
                          <option value="PIPED_YARD">Piped into yard</option>
                          <option value="BOREHOLE">Borehole</option>
                          <option value="WELL">Protected well</option>
                          <option value="RIVER">River / stream</option>
                        </select>
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-lighting">Lighting</label>
                        <select
                          id="v3-lighting"
                          value={inputs.lightingEnergy || "ELECTRICITY"}
                          onChange={(e) => upd("lightingEnergy", e.target.value)}
                        >
                          <option value="ELECTRICITY">Electricity</option>
                          <option value="SOLAR">Solar</option>
                          <option value="KEROSENE">Kerosene</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="v3-form-section">
                    <div className="v3-form-section-title">
                      <strong>Household assets</strong>
                      <span>Reported items</span>
                    </div>
                    <div className="v3-form-grid">
                      <div className="v3-field">
                        <label htmlFor="v3-radio">Radio</label>
                        <select
                          id="v3-radio"
                          value={inputs.assets.includes("RADIO") ? "Yes" : "No"}
                          onChange={(e) => {
                            const want = e.target.value === "Yes";
                            if (want !== inputs.assets.includes("RADIO")) toggleAsset("RADIO");
                          }}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-smartphone">Smartphone</label>
                        <select
                          id="v3-smartphone"
                          value={inputs.assets.includes("SMARTPHONE") ? "Yes" : "No"}
                          onChange={(e) => {
                            const want = e.target.value === "Yes";
                            if (want !== inputs.assets.includes("SMARTPHONE")) toggleAsset("SMARTPHONE");
                          }}
                        >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-land">Land owned (acres)</label>
                        <input
                          id="v3-land"
                          type="number"
                          min={0}
                          step={0.5}
                          value={inputs.landAcreage ?? 0}
                          onChange={(e) => upd("landAcreage", Math.max(0, Number(e.target.value) || 0))}
                        />
                      </div>
                      <div className="v3-field">
                        <label htmlFor="v3-cooking">Cooking fuel</label>
                        <select
                          id="v3-cooking"
                          value={inputs.cookingEnergy || "CHARCOAL"}
                          onChange={(e) => upd("cookingEnergy", e.target.value)}
                        >
                          <option value="CHARCOAL">Charcoal</option>
                          <option value="LPG">LPG / gas</option>
                          <option value="ELECTRICITY">Electricity</option>
                          <option value="FIREWOOD">Firewood</option>
                          <option value="KEROSENE">Kerosene</option>
                        </select>
                      </div>
                    </div>

                    <details className="v3-extra-details">
                      <summary>Additional assets, livestock &amp; vulnerability flags (optional)</summary>
                      <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {EXTRA_ASSETS.map(([key, label]) => {
                            const on = inputs.assets.includes(key);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => toggleAsset(key)}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 2,
                                  border: `1px solid ${on ? "#2c5b4b" : "#d8dfd8"}`,
                                  background: on ? "#e8eee8" : "#fcfcfa",
                                  color: on ? "#244d3e" : "#5e6e66",
                                  fontSize: 10,
                                  fontWeight: on ? 700 : 500
                                }}
                              >
                                {on ? "✓ " : ""}{label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="v3-form-grid">
                          <div className="v3-field">
                            <label htmlFor="v3-livestock">Livestock count</label>
                            <input
                              id="v3-livestock"
                              type="number"
                              min={0}
                              value={inputs.livestockCount ?? 0}
                              onChange={(e) => upd("livestockCount", Math.max(0, Math.round(Number(e.target.value) || 0)))}
                            />
                          </div>
                          <div className="v3-field">
                            <label htmlFor="v3-chronic">Chronic illness / disability reported</label>
                            <select
                              id="v3-chronic"
                              value={
                                inputs.hasChronicIllness && inputs.hasRegisteredDisability
                                  ? "BOTH"
                                  : inputs.hasChronicIllness
                                    ? "CHRONIC"
                                    : inputs.hasRegisteredDisability
                                      ? "DISABILITY"
                                      : "NONE"
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                upd("hasChronicIllness", val === "CHRONIC" || val === "BOTH");
                                upd("hasRegisteredDisability", val === "DISABILITY" || val === "BOTH");
                              }}
                            >
                              <option value="NONE">None reported</option>
                              <option value="CHRONIC">Chronic illness (CHE context)</option>
                              <option value="DISABILITY">Registered disability (NCPWD)</option>
                              <option value="BOTH">Both reported</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="v3-actions">
                    <div className="v3-actions-left">
                      <button type="button" className="v3-btn" onClick={() => navigate("intro")}>
                        ← Overview
                      </button>
                      <span className="v3-tiny-status">Synthetic test profile · editable</span>
                    </div>
                    <button type="button" className="v3-btn primary" onClick={() => navigate("income")}>
                      Continue to earned income →
                    </button>
                  </div>
                </div>

                <aside className="v3-side-note">
                  <div className="v3-note-label">Why this screen comes first</div>
                  <h4>Context before calculation.</h4>
                  <p>
                    Household composition and living conditions are part of the current PMTI context. In this proposed
                    declared-income flow, they are recorded transparently but are not silently converted into income.
                  </p>
                  <div className="v3-mini-rule" />
                  <div className="v3-note-label">In this case</div>
                  <ul>
                    <li>
                      {inputs.householdSize} {inputs.householdSize === 1 ? "person" : "people"} in the household
                    </li>
                    <li>
                      {inputs.dependantCount !== null && inputs.dependantCount !== undefined
                        ? `${inputs.dependantCount} dependants recorded`
                        : "Dependants not separately specified"}
                    </li>
                    <li>{formatEnumLabel(inputs.ownershipStatus, OWNERSHIP_LABELS)} home</li>
                    <li>Assets: {formatAssetsSummary(inputs.assets)}</li>
                  </ul>
                </aside>
              </div>
            </div>
          )}

          {/* ── 02 / EARNED INCOME ── */}
          {screen === "income" && (
            <div className="v3-screen">
              <div className="v3-kicker">02 / Earned income</div>
              <h1 className="v3-screen-title">What does the household actually earn?</h1>
              <p className="v3-screen-intro">
                For a trader, sales are not the same as earnings. The ledger separates business receipts, inventory
                consumed and other operating costs before arriving at net earned income.
              </p>

              <div className="v3-ledger-wrap">
                <div className="v3-ledger-top">
                  <div>
                    <h3>
                      {earnedEntries.length === 1 && earnedEntries[0].src.sourceType === "SELF_EMPLOYMENT"
                        ? `${earnedEntries[0].src.label || "Retail market trading"} · Income ledger`
                        : "Household earned income · Source-by-source ledger"}
                    </h3>
                    <p>
                      Amounts evaluated through the household-income ledger engine (12-month synthetic observation
                      window)
                    </p>
                  </div>
                  <span className="v3-period-chip">01 Nov 2025 — 31 Oct 2026</span>
                </div>

                {/* Zero Earned Income Pathway */}
                <label className="v3-zero-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(inputs.hasNoEarnedIncome)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      upd("hasNoEarnedIncome", checked);
                      if (checked) upd("monthlyNetEarnedIncome", 0);
                    }}
                  />
                  <span>
                    <strong>Our household currently has no earned income.</strong>{" "}
                    Select this if household members do not earn wages, trading profit, farming receipts, or rental
                    income. Any existing draft entries are preserved as inactive.
                  </span>
                </label>

                {inputs.hasNoEarnedIncome ? (
                  <div className="v3-formula-note" style={{ marginTop: 0 }}>
                    <b>Zero earned income</b>
                    <p>
                      The earned-income base is explicitly set to KSh 0 / month. Under Regulation 18(2), non-salaried
                      households default to the KSh 300/month minimum contribution unless approved for financial
                      assistance under Regulation 19.
                    </p>
                  </div>
                ) : earnedEntries.length > 0 ? (
                  <>
                    {earnedEntries.map(({ src, originalIndex }, idx) => {
                      const rule = INCOME_SOURCE_RULES[src.sourceType] || INCOME_SOURCE_RULES.OTHER_EARNED;
                      const uiRules = getIncomeSourceUiRules(src);
                      const months = Number(src.monthsObserved) || 12;
                      const gross = Number(src.amountReceivedKsh || 0);
                      const opening = Number(src.openingStockKsh ?? 0);
                      const purchases = getStockPurchases(src);
                      const closing = Number(src.closingStockKsh ?? 0);
                      const otherOps = getOtherOperatingCosts(src);
                      const matchedLine = (liveIncomeSnapshot.lines || []).find((l) => l.sourceId === src.id);
                      const cogs = matchedLine?.costOfGoodsSoldKsh ?? Math.max(0, opening + purchases - closing);
                      const totalCosts = matchedLine?.totalReportedCostsKsh ?? (uiRules.showOperatingExpenses ? cogs + otherOps : 0);
                      const net = matchedLine?.reportedNetKsh ?? (gross - totalCosts);

                      return (
                        <div key={src.id || originalIndex} style={{ marginBottom: idx < earnedEntries.length - 1 ? 24 : 0 }}>
                          {(earnedEntries.length > 1 || src.sourceType !== "SELF_EMPLOYMENT") && (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                                padding: "8px 0",
                                marginBottom: 8,
                                borderBottom: "1px solid #edf0eb",
                                flexWrap: "wrap"
                              }}
                            >
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <strong style={{ fontSize: 11, color: "#2d4c3e" }}>
                                  Source {idx + 1}: {src.label || rule.label}
                                </strong>
                                <select
                                  aria-label={`Source ${idx + 1} type`}
                                  value={src.sourceType}
                                  onChange={(e) => {
                                    const nextType = e.target.value;
                                    updListItem("incomeSources", originalIndex, "sourceType", nextType);
                                    if (!INCOME_SOURCE_RULES[nextType]?.costsAllowed) {
                                      updListItem("incomeSources", originalIndex, "directCostsKsh", 0);
                                      updListItem("incomeSources", originalIndex, "expenses", []);
                                    }
                                  }}
                                  style={{
                                    height: 26,
                                    border: "1px solid #d8dfd8",
                                    background: "#fcfcfa",
                                    fontSize: 10,
                                    padding: "0 6px"
                                  }}
                                >
                                  {EARNED_SOURCE_TYPES.map((k) => (
                                    <option key={k} value={k}>
                                      {INCOME_SOURCE_RULES[k]?.label || k}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                className="v3-text-link"
                                style={{ color: "#a34b42", padding: 0 }}
                                onClick={() => removeListItem("incomeSources", originalIndex)}
                              >
                                Remove source
                              </button>
                            </div>
                          )}

                          <table className="v3-ledger">
                            <thead>
                              <tr>
                                <th>Ledger entry</th>
                                <th className="numeric">Monthly average</th>
                                <th className="numeric">{months}-month total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  {src.sourceType === "SELF_EMPLOYMENT"
                                    ? "Gross business receipts"
                                    : `Gross receipts (${rule.label})`}
                                </td>
                                <td className="numeric">{formatKsh(gross / months)}</td>
                                <td className="numeric">
                                  <input
                                    id={idx === 0 ? "gross-total" : `gross-total-${idx}`}
                                    type="number"
                                    min={0}
                                    value={src.amountReceivedKsh ?? 0}
                                    aria-label="Gross business receipts for the period"
                                    onChange={(e) =>
                                      updListItem(
                                        "incomeSources",
                                        originalIndex,
                                        "amountReceivedKsh",
                                        e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0)
                                      )
                                    }
                                  />
                                </td>
                              </tr>

                              {uiRules.showOperatingExpenses && (
                                <>
                                  <tr className="indent">
                                    <td>Opening stock · inventory at period start</td>
                                    <td className="numeric">—</td>
                                    <td className="numeric">
                                      <input
                                        id={idx === 0 ? "opening-stock" : `opening-stock-${idx}`}
                                        type="number"
                                        min={0}
                                        value={src.openingStockKsh ?? 0}
                                        aria-label="Opening stock"
                                        onChange={(e) =>
                                          updListItem(
                                            "incomeSources",
                                            originalIndex,
                                            "openingStockKsh",
                                            e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0)
                                          )
                                        }
                                      />
                                    </td>
                                  </tr>
                                  <tr className="indent">
                                    <td>Stock purchases during the period</td>
                                    <td className="numeric">{formatKsh(purchases / months)}</td>
                                    <td className="numeric">
                                      <input
                                        id={idx === 0 ? "purchases" : `purchases-${idx}`}
                                        type="number"
                                        min={0}
                                        value={purchases}
                                        aria-label="Stock purchases"
                                        onChange={(e) =>
                                          updateLedgerCategoryAmount(originalIndex, "STOCK_PURCHASES", e.target.value)
                                        }
                                      />
                                    </td>
                                  </tr>
                                  <tr className="indent">
                                    <td>Less: closing stock · inventory at period end</td>
                                    <td className="numeric">—</td>
                                    <td className="numeric">
                                      <input
                                        id={idx === 0 ? "closing-stock" : `closing-stock-${idx}`}
                                        type="number"
                                        min={0}
                                        value={src.closingStockKsh ?? 0}
                                        aria-label="Closing stock"
                                        onChange={(e) =>
                                          updListItem(
                                            "incomeSources",
                                            originalIndex,
                                            "closingStockKsh",
                                            e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0)
                                          )
                                        }
                                      />
                                    </td>
                                  </tr>
                                  <tr className="total">
                                    <td>Cost of goods sold · opening stock + purchases − closing stock</td>
                                    <td className="numeric">{formatKsh(cogs / months)}</td>
                                    <td className="numeric">{formatKsh(cogs)}</td>
                                  </tr>
                                  <tr>
                                    <td>Other operating costs</td>
                                    <td className="numeric">{formatKsh(otherOps / months)}</td>
                                    <td className="numeric">
                                      <input
                                        id={idx === 0 ? "other-costs" : `other-costs-${idx}`}
                                        type="number"
                                        min={0}
                                        value={otherOps}
                                        aria-label="Other operating costs"
                                        onChange={(e) =>
                                          updateLedgerCategoryAmount(originalIndex, "OTHER_OPERATING", e.target.value)
                                        }
                                      />
                                    </td>
                                  </tr>
                                  <tr className="total">
                                    <td>Total operating costs</td>
                                    <td className="numeric">{formatKsh(totalCosts / months)}</td>
                                    <td className="numeric">{formatKsh(totalCosts)}</td>
                                  </tr>
                                </>
                              )}

                              <tr className="net">
                                <td>
                                  {uiRules.showOperatingExpenses
                                    ? "Net earned business income"
                                    : `Net earned income (${rule.label})`}
                                </td>
                                <td className="numeric">{formatKsh(net / months)}</td>
                                <td className="numeric">{formatKsh(net)}</td>
                              </tr>
                            </tbody>
                          </table>

                          <details className="v3-extra-details" style={{ marginTop: 10 }}>
                            <summary>Observation window, seasonality &amp; overlap settings</summary>
                            <div className="v3-form-grid" style={{ marginTop: 10 }}>
                              <div className="v3-field">
                                <label>Source category</label>
                                <select
                                  value={src.sourceType}
                                  onChange={(e) => {
                                    const nextType = e.target.value;
                                    updListItem("incomeSources", originalIndex, "sourceType", nextType);
                                    if (!INCOME_SOURCE_RULES[nextType]?.costsAllowed) {
                                      updListItem("incomeSources", originalIndex, "directCostsKsh", 0);
                                      updListItem("incomeSources", originalIndex, "expenses", []);
                                    }
                                  }}
                                >
                                  {EARNED_SOURCE_TYPES.map((k) => (
                                    <option key={k} value={k}>
                                      {INCOME_SOURCE_RULES[k]?.label || k}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="v3-field">
                                <label>Observed duration (months)</label>
                                <input
                                  type="number"
                                  min={1}
                                  max={60}
                                  value={src.monthsObserved || 12}
                                  onChange={(e) => {
                                    const m = Math.max(1, Math.round(Number(e.target.value) || 12));
                                    updListItem("incomeSources", originalIndex, "monthsObserved", m);
                                    if (src.observationStartDate && src.observationEndDate) {
                                      const calcM = calculateMonthsFromDates(
                                        src.observationStartDate,
                                        src.observationEndDate
                                      );
                                      updListItem("incomeSources", originalIndex, "manuallyEditedDuration", calcM !== m);
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </details>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div style={{ padding: 16, background: "#f7f8f4", border: "1px dashed #cdd5cd" }}>
                    <div style={{ fontSize: 11, fontWeight: 750, color: "#2d4c3e", marginBottom: 6 }}>
                      {activeScenario === "Custom"
                        ? "No itemised earned income sources recorded yet"
                        : `Preset direct monthly baseline: ${formatKsh(inputs.monthlyNetEarnedIncome || 0)} / month`}
                    </div>
                    <p style={{ fontSize: 10, color: "#6e7b76", margin: "0 0 12px" }}>
                      {activeScenario === "Custom"
                        ? "Add a structured earned-income source to reconcile receipts and costs, or declare zero earned income above."
                        : "This preset stores a direct monthly net figure. You can convert it into an editable accounting ledger or add additional sources."}
                    </p>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {activeScenario !== "Custom" && (
                        <button type="button" className="v3-btn primary" onClick={convertDirectPresetToLedger}>
                          Convert to editable ledger
                        </button>
                      )}
                      <button
                        type="button"
                        className="v3-btn"
                        onClick={() =>
                          addListItem("incomeSources", {
                            id: `src-${Date.now()}`,
                            sourceType: "SELF_EMPLOYMENT",
                            label: "Retail trading",
                            monthsObserved: 12,
                            observationStartDate: DEFAULT_COMMON_ASSESSMENT_PERIOD.startDate,
                            observationEndDate: DEFAULT_COMMON_ASSESSMENT_PERIOD.endDate,
                            amountReceivedKsh: 0,
                            directCostsKsh: 0,
                            openingStockKsh: 0,
                            closingStockKsh: 0,
                            expenses: []
                          })
                        }
                      >
                        + Add earned income source
                      </button>
                    </div>
                  </div>
                )}

                {!inputs.hasNoEarnedIncome && earnedEntries.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="v3-text-link"
                      onClick={() =>
                        addListItem("incomeSources", {
                          id: `src-${Date.now()}`,
                          sourceType: "CASUAL_LABOUR",
                          label: "Additional earned income",
                          monthsObserved: 12,
                          observationStartDate: DEFAULT_COMMON_ASSESSMENT_PERIOD.startDate,
                          observationEndDate: DEFAULT_COMMON_ASSESSMENT_PERIOD.endDate,
                          amountReceivedKsh: 0,
                          directCostsKsh: 0,
                          expenses: []
                        })
                      }
                    >
                      + Add another earned income source
                    </button>
                  </div>
                )}

                {/* Validation / Engine Alerts */}
                {(!liveIncomeSnapshot.isValid || (liveIncomeSnapshot.reviewFlags || []).some((f) => f.code !== "DIRECT_ENTRY_DEMO_BASELINE")) && (
                  <div className="v3-alert-box">
                    {!liveIncomeSnapshot.isValid
                      ? (liveIncomeSnapshot.errors || []).join(" ")
                      : liveIncomeSnapshot.reviewFlags
                          .filter((f) => f.code !== "DIRECT_ENTRY_DEMO_BASELINE")
                          .map((f) => f.message)
                          .join(" ")}
                  </div>
                )}

                <div className="v3-ledger-summary">
                  <div>
                    <span>Gross receipts</span>
                    <strong>{formatKsh(liveGrossAnnual)}</strong>
                    <small>Cash received from trading / earnings</small>
                  </div>
                  <div>
                    <span>Less · total costs</span>
                    <strong>{formatKsh(liveCostsAnnual)}</strong>
                    <small>COGS plus other operating costs</small>
                  </div>
                  <div>
                    <span>Net earned income</span>
                    <strong>{formatKsh(liveNetAnnual)}</strong>
                    <small>Amount remaining after recorded costs</small>
                  </div>
                </div>

                <div className="v3-formula-note">
                  <b>Why stock matters</b>
                  <p>
                    Goods bought for resale should not be mistaken for household earnings. Cost of goods sold is
                    calculated as opening stock + purchases − closing stock. The calculation is only valid when the
                    inventory period is aligned and the expense records are resolved.
                  </p>
                </div>

                <div className="v3-actions">
                  <div className="v3-actions-left">
                    <button type="button" className="v3-btn" onClick={() => navigate("household")}>
                      ← Household
                    </button>
                    <span className="v3-tiny-status">
                      {!liveIncomeSnapshot.isValid || !liveIncomeSnapshot.canPopulatePrototypeEarnedIncomeBase
                        ? "Review required · check the entered ledger values"
                        : "12-month ledger · live rules engine"}
                    </span>
                  </div>
                  <button type="button" className="v3-btn primary" onClick={() => navigate("other")}>
                    Continue to other money →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 03 / OTHER MONEY ── */}
          {screen === "other" && (
            <div className="v3-screen">
              <div className="v3-kicker">03 / Other money and financial context</div>
              <h1 className="v3-screen-title">Not every movement of money is income.</h1>
              <p className="v3-screen-intro">
                Keep earned income separate from remittances, loans, assistance and digital activity. Each item should
                have a visible classification instead of being added to the earnings total without explanation.
              </p>

              <div className="v3-ledger-wrap">
                <div className="v3-ledger-top">
                  <div>
                    <h3>Household financial activity register</h3>
                    <p>What the synthetic persona records — and how the prototype treats it</p>
                  </div>
                  <span className="v3-period-chip">Context and classification</span>
                </div>

                <table className="v3-flow-table">
                  <thead>
                    <tr>
                      <th>Information item</th>
                      <th>Reported value</th>
                      <th>How it is treated in this prototype</th>
                      <th>In earned-income base?</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="v3-flow-type">M-PESA transaction activity</td>
                      <td>
                        <input
                          id="mpesa-volume"
                          type="number"
                          min={0}
                          value={inputs.grossMpesaMonthly ?? 0}
                          aria-label="M-PESA transaction activity per month"
                          onChange={(e) => upd("grossMpesaMonthly", Math.max(0, Number(e.target.value) || 0))}
                        />{" "}
                        / month
                      </td>
                      <td>Digital activity indicator; transaction volume is not earnings by itself</td>
                      <td>
                        <span className="v3-class-pill neutral">No · context only</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="v3-flow-type">Average retained balance</td>
                      <td>
                        <input
                          id="retained-balance"
                          type="number"
                          min={0}
                          value={inputs.avgRetainedBalance ?? 0}
                          aria-label="Average retained balance"
                          onChange={(e) => upd("avgRetainedBalance", Math.max(0, Number(e.target.value) || 0))}
                        />
                      </td>
                      <td>Liquidity context; a balance is not a new income flow</td>
                      <td>
                        <span className="v3-class-pill neutral">No · context only</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="v3-flow-type">Diaspora remittances</td>
                      <td>
                        <input
                          id="remittances"
                          type="number"
                          min={0}
                          value={inputs.diasporaRemittances ?? 0}
                          aria-label="Diaspora remittances"
                          onChange={(e) => upd("diasporaRemittances", Math.max(0, Number(e.target.value) || 0))}
                        />
                      </td>
                      <td>Separate transfer category; not earned business income</td>
                      <td>
                        <span className="v3-class-pill neutral">No · separate category</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="v3-flow-type">Social assistance</td>
                      <td>
                        <select
                          id="receives-aid"
                          aria-label="Receives social assistance"
                          value={inputs.receivesAid ? "Yes" : "No"}
                          onChange={(e) => upd("receivesAid", e.target.value === "Yes")}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td>Household declaration; triggers Regulation 19 review flag when Yes</td>
                      <td>
                        <span className="v3-class-pill neutral">No · separate category</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="v3-flow-type">Fuliza defaults</td>
                      <td>
                        <input
                          id="fuliza-defaults"
                          type="number"
                          min={0}
                          max={50}
                          value={inputs.fulizaDefaults ?? 0}
                          aria-label="Fuliza defaults"
                          onChange={(e) => upd("fulizaDefaults", Math.max(0, Math.round(Number(e.target.value) || 0)))}
                        />
                      </td>
                      <td>Credit / repayment context; not earnings</td>
                      <td>
                        <span className="v3-class-pill neutral">No · context only</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="v3-flow-type">SACCO account</td>
                      <td>
                        <select
                          id="sacco-account"
                          aria-label="Has active SACCO account"
                          value={inputs.hasSaccoAccount ? "Yes" : "No"}
                          onChange={(e) => upd("hasSaccoAccount", e.target.value === "Yes")}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td>Account ownership flag only (illiquid wealth context)</td>
                      <td>
                        <span className="v3-class-pill neutral">No · context only</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Structured Non-Earned Financial Flows (Chama, Loans, Reimbursements, Remittances) */}
                <details className="v3-extra-details" open={otherMoneyEntries.length > 0}>
                  <summary>
                    Structured non-earned flow records ({otherMoneyEntries.length} recorded) — loans, chama funds,
                    reimbursements
                  </summary>
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    {otherMoneyEntries.map(({ src, originalIndex }, idx) => {
                      const rule = INCOME_SOURCE_RULES[src.sourceType] || {};
                      return (
                        <div
                          key={src.id || originalIndex}
                          style={{
                            border: "1px solid #dfe4df",
                            padding: 12,
                            background: "#fafbf8",
                            display: "grid",
                            gap: 10
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ fontSize: 10, color: "#345445" }}>
                              Flow {idx + 1}: {rule.label || src.sourceType} ({rule.bucket})
                            </strong>
                            <button
                              type="button"
                              className="v3-text-link"
                              style={{ color: "#a34b42", padding: 0 }}
                              onClick={() => removeListItem("incomeSources", originalIndex)}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="v3-form-grid">
                            <div className="v3-field">
                              <label>Flow category</label>
                              <select
                                value={src.sourceType}
                                onChange={(e) => updListItem("incomeSources", originalIndex, "sourceType", e.target.value)}
                              >
                                {OTHER_MONEY_SOURCE_TYPES.map((k) => (
                                  <option key={k} value={k}>
                                    {INCOME_SOURCE_RULES[k]?.label || k}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="v3-field">
                              <label>12-month flow amount (KSh)</label>
                              <input
                                type="number"
                                min={0}
                                value={src.amountReceivedKsh ?? 0}
                                onChange={(e) =>
                                  updListItem(
                                    "incomeSources",
                                    originalIndex,
                                    "amountReceivedKsh",
                                    e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0)
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div>
                      <button
                        type="button"
                        className="v3-btn"
                        onClick={() =>
                          addListItem("incomeSources", {
                            id: `flow-${Date.now()}`,
                            sourceType: "GROUP_FUNDS",
                            monthsObserved: 12,
                            amountReceivedKsh: 0,
                            directCostsKsh: 0,
                            expenses: []
                          })
                        }
                      >
                        + Add separate non-earned flow record
                      </button>
                    </div>
                  </div>
                </details>

                <div className="v3-context-band">
                  <div>
                    <b>What enters the proposed AGI base</b>
                    <p>
                      Resolved declared net earned income only: the retail trading receipts after the recorded stock
                      and operating costs have been reconciled.
                    </p>
                  </div>
                  <div>
                    <b>What stays separate</b>
                    <p>
                      Transfers, balances, credit indicators and asset ownership remain separately labelled. Their policy
                      treatment requires explicit rules; they are not silently added to earnings.
                    </p>
                  </div>
                </div>

                <div className="v3-actions">
                  <div className="v3-actions-left">
                    <button type="button" className="v3-btn" onClick={() => navigate("income")}>
                      ← Earned income
                    </button>
                    <span className="v3-tiny-status">
                      {otherMoneyEntries.length > 0
                        ? `${otherMoneyEntries.length} structured flow record(s) separated`
                        : "No additional flow records in this synthetic case"}
                    </span>
                  </div>
                  <button type="button" className="v3-btn primary" onClick={() => navigate("review")}>
                    Review the declaration →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 04 / REVIEW DECLARATION ── */}
          {screen === "review" && (
            <div className="v3-screen">
              <div className="v3-kicker">04 / Declaration review</div>
              <div className="v3-review-intro">
                <div>
                  <h1 className="v3-screen-title">Check every detail before calculating.</h1>
                  <p className="v3-screen-intro" style={{ marginBottom: 0 }}>
                    This is the member’s last chance to review the information. Nothing should be calculated until the
                    presenter confirms that the record is correct.
                  </p>
                </div>
                <span
                  className={`v3-review-check ${
                    isBlockedReview ? (isProvisionalPolicy ? "warn" : "error") : ""
                  }`}
                >
                  {isBlockedReview
                    ? isProvisionalPolicy
                      ? "⚠ Provisional — policy rule pending"
                      : "✕ Review required before calculation"
                    : "✓ Ready for presenter review"}
                </span>
              </div>

              <div className="v3-review-board">
                <div className="v3-review-block">
                  <div className="v3-review-block-head">
                    <strong>01 · Household profile</strong>
                    <button type="button" onClick={() => navigate("household")}>
                      Edit details ↗
                    </button>
                  </div>
                  <div className="v3-review-line">
                    <span>Household head</span>
                    <b>
                      {headName} · {genderDisplay} · {inputs.headAge || "—"}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>County</span>
                    <b>{countyDisplay}</b>
                  </div>
                  <div className="v3-review-line">
                    <span>Household size</span>
                    <b>
                      {inputs.householdSize} members
                      {inputs.dependantCount !== null && inputs.dependantCount !== undefined
                        ? ` · ${inputs.dependantCount} dependants`
                        : ""}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Dwelling</span>
                    <b>
                      {formatEnumLabel(inputs.dwellingType, DWELLING_LABELS)} ·{" "}
                      {formatEnumLabel(inputs.ownershipStatus, OWNERSHIP_LABELS).toLowerCase()}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Services</span>
                    <b>
                      {formatEnumLabel(inputs.waterSource, WATER_LABELS)} ·{" "}
                      {formatEnumLabel(inputs.lightingEnergy, LIGHTING_LABELS).toLowerCase()}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Assets</span>
                    <b>{formatAssetsSummary(inputs.assets)}</b>
                  </div>
                </div>

                <div className="v3-review-block">
                  <div className="v3-review-block-head">
                    <strong>02 · Earned income</strong>
                    <button type="button" onClick={() => navigate("income")}>
                      Edit ledger ↗
                    </button>
                  </div>
                  <div className="v3-review-line">
                    <span>Income source</span>
                    <b>
                      {inputs.hasNoEarnedIncome
                        ? "Zero earned income declared"
                        : earnedLinesLive.length > 0
                          ? earnedLinesLive.map((l) => l.label).join(", ")
                          : "Direct demonstration baseline"}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Gross receipts</span>
                    <b>{formatKsh(liveGrossAnnual)}</b>
                  </div>
                  <div className="v3-review-line">
                    <span>Cost of goods sold</span>
                    <b>
                      {formatKsh(
                        earnedLinesLive.reduce((s, l) => s + (l.costOfGoodsSoldKsh || 0), 0)
                      )}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Other operating costs</span>
                    <b>
                      {formatKsh(
                        earnedLinesLive.reduce((s, l) => s + (l.otherOperatingCostsKsh || 0), 0)
                      )}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Total operating costs</span>
                    <b>{formatKsh(liveCostsAnnual)}</b>
                  </div>
                  <div className="v3-review-line">
                    <span>Net earned income</span>
                    <b>{formatKsh(liveNetAnnual)} / year</b>
                  </div>
                </div>

                <div className="v3-review-block">
                  <div className="v3-review-block-head">
                    <strong>03 · Other money and context</strong>
                    <button type="button" onClick={() => navigate("other")}>
                      Edit classifications ↗
                    </button>
                  </div>
                  <div className="v3-review-line">
                    <span>M-PESA activity</span>
                    <b>{formatKsh(inputs.grossMpesaMonthly || 0)} / month</b>
                  </div>
                  <div className="v3-review-line">
                    <span>Retained balance</span>
                    <b>{formatKsh(inputs.avgRetainedBalance || 0)}</b>
                  </div>
                  <div className="v3-review-line">
                    <span>Remittances</span>
                    <b>{formatKsh(inputs.diasporaRemittances || 0)} reported</b>
                  </div>
                  <div className="v3-review-line">
                    <span>Receives assistance</span>
                    <b>{inputs.receivesAid ? "Yes (flag for Reg. 19 review)" : "No"}</b>
                  </div>
                  <div className="v3-review-line">
                    <span>External verification</span>
                    <b>Not connected</b>
                  </div>
                </div>

                <div className="v3-review-block">
                  <div className="v3-review-block-head">
                    <strong>04 · Observation and policy settings</strong>
                    <span className="v3-tiny-status">Live engine configuration</span>
                  </div>
                  <div className="v3-review-line">
                    <span>Observation window</span>
                    <b>
                      {liveIncomeSnapshot.calculationStatus === "CALCULATED_STANDARD" ||
                      liveIncomeSnapshot.calculationStatus === "CALCULATED_EXPLICIT_ZERO_EARNED"
                        ? "12 months · complete"
                        : liveIncomeSnapshot.calculationStatus}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Income / cost alignment</span>
                    <b>
                      {liveIncomeSnapshot.isValid && liveIncomeSnapshot.canPopulatePrototypeEarnedIncomeBase
                        ? "Resolved in test case"
                        : "Review required"}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Experimental deductions</span>
                    <b>
                      {adminParams.enableExperimentalPolicyAdjustments
                        ? "Enabled (experimental scenario)"
                        : "Disabled for baseline"}
                    </b>
                  </div>
                  <div className="v3-review-line">
                    <span>Calculation model</span>
                    <b>Declared-income AGI v1.1</b>
                  </div>
                  <div className="v3-review-line">
                    <span>Current SHA PMTI output</span>
                    <b>Not generated here</b>
                  </div>
                </div>
              </div>

              {(formError ||
                isBlockedReview ||
                (liveIncomeSnapshot.reviewFlags || []).some((f) => f.code !== "DIRECT_ENTRY_DEMO_BASELINE")) && (
                <div className={`v3-alert-box ${isProvisionalPolicy && !liveIncomeSnapshot.requiresManualReview ? "warn" : ""}`}>
                  <strong>{formError ? "Action blocked: " : "Ledger review notice: "}</strong>
                  {formError ||
                    (!liveIncomeSnapshot.isValid
                      ? (liveIncomeSnapshot.errors || []).join(" ")
                      : (liveIncomeSnapshot.reviewFlags || [])
                          .filter((f) => f.code !== "DIRECT_ENTRY_DEMO_BASELINE")
                          .map((f) => f.message)
                          .join(" ") ||
                        "Complete or convert the earned income entry before running the calculation.")}
                </div>
              )}

              <div className="v3-review-footnote">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <span>
                    Baseline policy configuration: unapproved experimental cost-of-living and dependency deductions are{" "}
                    <strong>{adminParams.enableExperimentalPolicyAdjustments ? "ENABLED (experimental)" : "DISABLED"}</strong>{" "}
                    by default in this live engine.
                  </span>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 700, color: "#345445" }}>
                    <input
                      type="checkbox"
                      checked={Boolean(adminParams.enableExperimentalPolicyAdjustments)}
                      onChange={(e) =>
                        setAdminParams((prev) => ({
                          ...prev,
                          enableExperimentalPolicyAdjustments: e.target.checked
                        }))
                      }
                      style={{ accentColor: "#2c5b4b" }}
                    />
                    Test experimental deductions
                  </label>
                </div>
              </div>

              <div className="v3-review-footer">
                <span>
                  All values shown are synthetic and editable in the prior steps. No live external verification has been
                  performed.
                </span>
                <button
                  type="button"
                  className="v3-btn primary"
                  disabled={classifying || isBlockedReview}
                  onClick={handleConfirmAndCalculate}
                >
                  {classifying ? "Running calculation engine..." : "Confirm details & run demo calculation →"}
                </button>
              </div>
            </div>
          )}

          {/* ── 05 / CALCULATION PATH ── */}
          {screen === "logic" && (
            <div className="v3-screen">
              <div className="v3-kicker">05 / Calculation path</div>
              <h1 className="v3-screen-title">Follow the calculation, one decision at a time.</h1>
              <p className="v3-screen-intro">
                After the declaration is confirmed, the proposed model traces resolved earned income through
                annualisation, policy adjustments, reconciliation and the contribution arithmetic.
              </p>

              {!results?.next || !receipt ? (
                renderCalculationGate("Calculation path")
              ) : (
                <>
                  <div className="v3-calc-path">
                    <div className="v3-calc-step">
                      <div className="v3-num">01</div>
                      <h3>Resolve net earnings</h3>
                      <p>Start with declared receipts. Subtract reconciled stock costs and other operating expenses.</p>
                      <span className="v3-calc-value">
                        {moneyNum(receipt.totals.totalGrossAnnualKsh)} − {moneyNum(receipt.totals.totalExpensesAnnualKsh)}
                      </span>
                    </div>
                    <div className="v3-calc-step">
                      <div className="v3-num">02</div>
                      <h3>Annualise the base</h3>
                      <p>Monthly net earnings are multiplied by the 12 completed observation months.</p>
                      <span className="v3-calc-value">{moneyNum(receipt.monthlyNetIncomeKsh)} × 12</span>
                    </div>
                    <div className="v3-calc-step">
                      <div className="v3-num">03</div>
                      <h3>Apply approved settings</h3>
                      <p>
                        {receipt.model.enableExperimentalPolicyAdjustments
                          ? "Experimental deductions are toggled ON for this research scenario."
                          : "Experimental household deductions are switched off for this baseline demonstration."}
                      </p>
                      <span className="v3-calc-value">− {moneyNum(receipt.totalAdjustmentsKsh)} adjustments</span>
                    </div>
                    <div className="v3-calc-step">
                      <div className="v3-num">04</div>
                      <h3>Calculate contribution</h3>
                      <p>Apply the 2.75% rate, divide the annual amount by 12, then test the KSh 300 minimum.</p>
                      <span className="v3-calc-value">
                        {moneyNum(receipt.contribution.annualContributionAtRate)} ÷ 12
                      </span>
                    </div>
                  </div>

                  <div className="v3-math-ledger">
                    <h3>{headName} · transparent calculation trace</h3>
                    <div className="v3-math-row">
                      <span>Gross business receipts</span>
                      <strong>{formatKsh(receipt.totals.totalGrossAnnualKsh || receipt.annualIncomeBaseKsh)}</strong>
                    </div>
                    <div className="v3-math-row">
                      <span>Less: cost of goods sold</span>
                      <strong>
                        ({formatKsh(receipt.incomeLines.reduce((s, l) => s + (l.costOfGoodsSoldKsh || 0), 0))})
                      </strong>
                    </div>
                    <div className="v3-math-row">
                      <span>Less: other operating costs</span>
                      <strong>
                        ({formatKsh(receipt.incomeLines.reduce((s, l) => s + (l.operatingCostsKsh || 0), 0))})
                      </strong>
                    </div>
                    <div className="v3-math-row">
                      <span>Net earned income for 12 months</span>
                      <strong>{formatKsh(receipt.totals.totalNetAnnualKsh || receipt.annualIncomeBaseKsh)}</strong>
                    </div>
                    <div className="v3-math-row">
                      <span>Annualised net earned-income base</span>
                      <strong>{formatKsh(receipt.reconciliation.annualNetEarnedBase)}</strong>
                    </div>
                    {receipt.adjustments.length > 0 ? (
                      receipt.adjustments.map((adj, i) => (
                        <div key={i} className="v3-math-row">
                          <span>Less: {adj.name} (experimental)</span>
                          <strong>({formatKsh(adj.amount)})</strong>
                        </div>
                      ))
                    ) : (
                      <div className="v3-math-row">
                        <span>Experimental adjustments applied</span>
                        <strong>KSh 0</strong>
                      </div>
                    )}
                    <div className="v3-math-row">
                      <span>Adjusted Gross Income · AGI</span>
                      <strong>{formatKsh(receipt.reconciliation.adjustedGrossIncomeKsh)}</strong>
                    </div>
                    <div className="v3-math-row">
                      <span>Annual contribution · 2.75%</span>
                      <strong>{formatKsh(receipt.contribution.annualContributionAtRate)}</strong>
                    </div>
                    <div className="v3-math-row">
                      <span>Monthly equivalent · annual ÷ 12</span>
                      <strong>{formatKsh(receipt.contribution.roundedMonthlyEquivalentBeforeFloor)}</strong>
                    </div>
                    <div className="v3-math-row">
                      <span>Minimum monthly floor · Regulation 18(2)</span>
                      <strong>
                        KSh 300 · {receipt.contribution.minimumContributionFloorApplied ? "applied" : "not applied"}
                      </strong>
                    </div>
                    <div className="v3-math-row final">
                      <span>Illustrative monthly contribution</span>
                      <strong>{formatKsh(receipt.contribution.finalMonthlyEquivalent)}</strong>
                    </div>
                  </div>

                  <div className="v3-logic-disclaimer">
                    This is the proposed declared-income AGI v1.1 research calculation, not the current SHA PMTI result.
                    It uses the live prototype engine’s baseline configuration; operating-cost treatment and any
                    experimental deductions require policy and legal validation.
                  </div>

                  <div className="v3-actions">
                    <button type="button" className="v3-btn" onClick={() => navigate("review")}>
                      ← Back to declaration
                    </button>
                    <button type="button" className="v3-btn primary" onClick={() => navigate("methods")}>
                      Compare with current SHA method →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── 06 / METHOD COMPARISON ── */}
          {screen === "methods" && (
            <div className="v3-screen">
              <div className="v3-kicker">06 / Method comparison</div>
              <h1 className="v3-screen-title">Two models. Different questions. Different evidence.</h1>
              <p className="v3-screen-intro">
                The current SHA approach and the proposed declared-income model must not be presented as if they were
                the same calculation. This page explains the distinction without inventing an official SHA score.
              </p>

              <div className="v3-method-compare">
                <article className="v3-method-column current">
                  <div className="v3-method-tag">Current operational approach</div>
                  <h3>Proxy Means Testing Instrument</h3>
                  <p>
                    The current non-salaried assessment uses a proxy model to estimate a household’s economic position
                    from household and socio-economic characteristics.
                  </p>
                  <ul className="v3-method-list">
                    <li>
                      <b>Inputs:</b> 43 documented variables, including household, housing, services and asset
                      characteristics.
                    </li>
                    <li>
                      <b>Structure:</b> Separate urban and rural regression submodels.
                    </li>
                    <li>
                      <b>Output:</b> An estimated welfare / means-testing position used in the current process.
                    </li>
                    <li>
                      <b>Transparency:</b> The full production coefficients and a verified member-level score are not
                      generated by this prototype.
                    </li>
                  </ul>
                  <div className="v3-method-result">
                    <b>Status in this demonstration:</b> explained conceptually only. No official SHA PMTI score is
                    calculated for {headName}.
                  </div>
                </article>

                <article className="v3-method-column proposed">
                  <div className="v3-method-tag">Proposed research alternative</div>
                  <h3>Declared-income AGI v1.1</h3>
                  <p>
                    The proposed rules engine begins with resolved declared net earned income and makes the path from
                    source records to contribution visible.
                  </p>
                  <ul className="v3-method-list">
                    <li>
                      <b>Inputs:</b> Declared earned income, observation period and reconciled operating costs.
                    </li>
                    <li>
                      <b>Structure:</b> Explicit arithmetic, reconciliation checks and visible policy settings.
                    </li>
                    <li>
                      <b>Output:</b> A proposed AGI base and illustrative contribution calculation.
                    </li>
                    <li>
                      <b>Transparency:</b> Shows what was counted, what stayed separate and where review is required.
                    </li>
                  </ul>
                  <div className="v3-method-result">
                    {receipt ? (
                      <>
                        <b>Illustrative result for {headName}:</b> {formatKsh(receipt.adjustedGrossIncomeKsh)} AGI ·{" "}
                        {formatKsh(receipt.contribution.finalMonthlyEquivalent)} per month with baseline adjustments{" "}
                        {receipt.model.enableExperimentalPolicyAdjustments ? "enabled" : "disabled"}.
                      </>
                    ) : (
                      <>
                        <b>Preview base for {headName}:</b> {formatKsh(liveNetAnnual)} annual net earned income ·
                        confirm declaration on Step 04 to generate the locked AGI result.
                      </>
                    )}
                  </div>
                </article>
              </div>

              <div className="v3-method-caution">
                <b>Do not present this as a head-to-head official score.</b> The declared-income prototype is not SHA’s
                operational PMTI, and this comparison does not prove that one model is more accurate. A fair evaluation
                would require authorized current-model outputs, representative test data, outcome validation and formal
                legal / policy review.{" "}
                <button
                  type="button"
                  className="v3-text-link"
                  style={{ padding: 0, textDecoration: "underline" }}
                  onClick={onSwitchToWorkspace}
                >
                  Open technical workspace for synthetic comparator &amp; AGI v2.1 research tabs →
                </button>
              </div>

              <div className="v3-actions">
                <button type="button" className="v3-btn" onClick={() => navigate("logic")}>
                  ← Calculation path
                </button>
                <button type="button" className="v3-btn primary" onClick={() => navigate("receipt")}>
                  Open the itemised statement →
                </button>
              </div>
            </div>
          )}

          {/* ── 07 / ITEMISED STATEMENT ── */}
          {screen === "receipt" && (
            <div className="v3-screen" id="v3-receipt">
              {!results?.next || !receipt ? (
                renderCalculationGate("Itemised statement")
              ) : (
                <>
                  <div className="v3-receipt-toolbar">
                    <div>
                      <div className="v3-kicker" style={{ marginBottom: 2 }}>
                        Generated output · {headName} synthetic case
                      </div>
                      <div className="hint">
                        {statementTableView
                          ? "Table layout view: structured document preview bound to the immutable calculation snapshot."
                          : "Primary view: fixed-width, monospaced statement bound to the immutable calculation snapshot."}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="v3-btn-white"
                        onClick={() => setStatementTableView((prev) => !prev)}
                      >
                        {statementTableView ? "Monospaced statement" : "Table layout"}
                      </button>
                      <button type="button" className="v3-btn-white" onClick={() => window.print()}>
                        Print statement
                      </button>
                      <button type="button" className="v3-btn-white primary" onClick={handleCopyStatement}>
                        {copiedStatement ? "Copied" : "Copy statement"}
                      </button>
                    </div>
                  </div>

                  {!statementTableView ? (
                    <div className="v3-receipt-ascii">
                      <pre>{monospacedStatementText}</pre>
                    </div>
                  ) : (
                    <article className="v3-receipt-paper">
                      <div className="v3-receipt-topline">
                        <div>
                          <div className="v3-receipt-brand">Independent SHA Research Evaluation</div>
                          <div style={{ fontSize: 8, color: "#7d899a", marginTop: 3 }}>
                            Household contribution assessment · Synthetic demonstration only
                          </div>
                        </div>
                        <div className="v3-receipt-class">
                          NOT AN OFFICIAL SHA
                          <br />
                          ASSESSMENT OR PAYMENT DEMAND
                        </div>
                      </div>

                      <div className="v3-receipt-title">
                        <h2>SOCIAL HEALTH AUTHORITY — RESEARCH EVALUATION</h2>
                        <div className="swahili">Taarifa ya Michango ya Mwanachama</div>
                        <div className="english">
                          Itemised Member Contribution Statement · Hardened Declared-Income AGI v1.1
                        </div>
                      </div>

                      <div className="v3-receipt-meta-grid">
                        <div className="v3-receipt-meta-item">
                          <label>Session reference</label>
                          <b>{receipt.reference}</b>
                        </div>
                        <div className="v3-receipt-meta-item">
                          <label>Assessment date</label>
                          <b>28 November 2026</b>
                        </div>
                        <div className="v3-receipt-meta-item">
                          <label>County</label>
                          <b>{receipt.household.county || "Not recorded"}</b>
                        </div>
                        <div className="v3-receipt-meta-item">
                          <label>Household size</label>
                          <b>{receipt.household.size ?? "—"} members</b>
                        </div>
                      </div>

                      <div className="v3-receipt-decision">
                        <div>
                          <div className="label">Calculated prototype contribution</div>
                          <div className="amount">
                            {formatKsh(receipt.contribution.finalMonthlyEquivalent)} <small>/ month</small>
                          </div>
                        </div>
                        <div className="basis">
                          Annual contribution: {formatKsh(receipt.contribution.illustrativeAnnualEquivalent)}
                          <br />
                          Contribution rate: 2.75%
                          <br />
                          Minimum floor: KSh 300 ·{" "}
                          {receipt.contribution.minimumContributionFloorApplied ? "Applied" : "Not applied"}
                        </div>
                      </div>

                      <section className="v3-receipt-section-doc">
                        <h3>
                          01 · Member and assessment particulars <span>Source: synthetic household declaration</span>
                        </h3>
                        <table className="v3-receipt-table">
                          <tbody>
                            <tr>
                              <td>Member profile</td>
                              <td>{receipt.household.profileLabel}</td>
                              <td>Household head</td>
                              <td>
                                {[
                                  receipt.household.headGender === "FEMALE" || receipt.household.headGender === "F"
                                    ? "Female"
                                    : receipt.household.headGender === "MALE" || receipt.household.headGender === "M"
                                    ? "Male"
                                    : null,
                                  receipt.household.headAge ? `${receipt.household.headAge} years` : null
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Not stated"}
                              </td>
                            </tr>
                            <tr>
                              <td>County</td>
                              <td>{receipt.household.county || "Not recorded"}</td>
                              <td>Household members</td>
                              <td>{receipt.household.size ?? "—"}</td>
                            </tr>
                            <tr>
                              <td>Assessment reference period</td>
                              <td>
                                {receipt.commonAssessmentPeriod?.startDate} – {receipt.commonAssessmentPeriod?.endDate}
                              </td>
                              <td>Observation duration</td>
                              <td>12 months</td>
                            </tr>
                            <tr>
                              <td>Income ledger status</td>
                              <td>{receipt.status}</td>
                              <td>Model version</td>
                              <td>{receipt.model.version}</td>
                            </tr>
                          </tbody>
                        </table>
                      </section>

                      <section className="v3-receipt-section-doc">
                        <h3>
                          02 · Declared earned income and operating expense calculation <span>All amounts in KSh</span>
                        </h3>
                        <table className="v3-receipt-table">
                          <thead>
                            <tr>
                              <th style={{ width: "49%" }}>Income / expense description</th>
                              <th className="num">Monthly average</th>
                              <th className="num">12-month total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receipt.incomeLines.length > 0 ? (
                              receipt.incomeLines.map((line, i) => (
                                <React.Fragment key={line.sourceId || i}>
                                  <tr>
                                    <td>{line.label} — gross receipts</td>
                                    <td className="num">{moneyNum(line.grossReceivedKsh / (line.observationMonths || 12))}</td>
                                    <td className="num">{moneyNum(line.grossReceivedKsh)}</td>
                                  </tr>
                                  {(line.costOfGoodsSoldKsh > 0 || line.stockPurchasesKsh > 0) && (
                                    <>
                                      <tr>
                                        <td>Opening stock (inventory at start)</td>
                                        <td className="num">—</td>
                                        <td className="num">{moneyNum(line.openingStockKsh || 0)}</td>
                                      </tr>
                                      <tr>
                                        <td>Stock purchases during period</td>
                                        <td className="num">{moneyNum((line.stockPurchasesKsh || 0) / (line.observationMonths || 12))}</td>
                                        <td className="num">{moneyNum(line.stockPurchasesKsh || 0)}</td>
                                      </tr>
                                      <tr>
                                        <td>Less: closing stock (inventory at end)</td>
                                        <td className="num">—</td>
                                        <td className="num">({moneyNum(line.closingStockKsh || 0)})</td>
                                      </tr>
                                      <tr className="total">
                                        <td>Cost of goods sold</td>
                                        <td className="num">{moneyNum(line.costOfGoodsSoldKsh / (line.observationMonths || 12))}</td>
                                        <td className="num">{moneyNum(line.costOfGoodsSoldKsh)}</td>
                                      </tr>
                                    </>
                                  )}
                                  {line.operatingCostsKsh > 0 && (
                                    <tr>
                                      <td>Other operating costs</td>
                                      <td className="num">{moneyNum(line.operatingCostsKsh / (line.observationMonths || 12))}</td>
                                      <td className="num">{moneyNum(line.operatingCostsKsh)}</td>
                                    </tr>
                                  )}
                                  <tr className="total">
                                    <td>Total reported operating costs</td>
                                    <td className="num">{moneyNum(line.costsKsh / (line.observationMonths || 12))}</td>
                                    <td className="num">{moneyNum(line.costsKsh)}</td>
                                  </tr>
                                  <tr className="final">
                                    <td>NET EARNED INCOME ({line.label})</td>
                                    <td className="num">{moneyNum(line.monthlyNetKsh)}</td>
                                    <td className="num">{moneyNum(line.netForObservationPeriodKsh)}</td>
                                  </tr>
                                </React.Fragment>
                              ))
                            ) : (
                              <tr className="final">
                                <td>DECLARED MONTHLY BASELINE</td>
                                <td className="num">{moneyNum(receipt.monthlyNetIncomeKsh)}</td>
                                <td className="num">{moneyNum(receipt.annualIncomeBaseKsh)}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {(() => {
                          const stockLine = receipt.incomeLines.find(
                            (l) => l.costOfGoodsSoldKsh > 0 || l.stockPurchasesKsh > 0
                          );
                          if (!stockLine) return null;
                          return (
                            <div className="v3-receipt-equation">
                              Inventory formula: Cost of Goods Sold = Opening Stock + Purchases − Closing Stock
                              <br />
                              COGS = {formatKsh(stockLine.openingStockKsh || 0)} +{" "}
                              {formatKsh(stockLine.stockPurchasesKsh || 0)} −{" "}
                              {formatKsh(stockLine.closingStockKsh || 0)} ={" "}
                              {formatKsh(stockLine.costOfGoodsSoldKsh || 0)}
                            </div>
                          );
                        })()}
                      </section>

                      <section className="v3-receipt-section-doc">
                        <h3>
                          03 · Other money and contextual financial information{" "}
                          <span>Not automatically counted as earned income</span>
                        </h3>
                        <table className="v3-receipt-table">
                          <thead>
                            <tr>
                              <th>Information item</th>
                              <th>Reported value</th>
                              <th>Calculation treatment</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Family / diaspora remittances</td>
                              <td>{receipt.household.diasporaRemittances > 0 ? `${formatKsh(receipt.household.diasporaRemittances)} / month` : "None declared"}</td>
                              <td>Policy-review category</td>
                            </tr>
                            <tr>
                              <td>Social assistance</td>
                              <td>{receipt.household.receivesAid ? "Yes (reported)" : "None declared"}</td>
                              <td>Policy-review category</td>
                            </tr>
                            <tr>
                              <td>Loan proceeds / group funds / reimbursements</td>
                              <td>
                                {receipt.otherLines.length > 0
                                  ? receipt.otherLines.map((l) => `${l.label}: ${formatKsh(l.grossReceivedKsh)}`).join("; ")
                                  : "None declared"}
                              </td>
                              <td>Separately classified; no earned-income addition</td>
                            </tr>
                            <tr>
                              <td>M-PESA activity</td>
                              <td>{receipt.household.grossMpesaMonthly != null ? `${formatKsh(receipt.household.grossMpesaMonthly)} / month` : "Not recorded"}</td>
                              <td>Contextual transaction activity</td>
                            </tr>
                            <tr>
                              <td>Average retained balance</td>
                              <td>{receipt.household.avgRetainedBalance != null ? formatKsh(receipt.household.avgRetainedBalance) : "Not recorded"}</td>
                              <td>Liquidity context only</td>
                            </tr>
                            <tr>
                              <td>Reported assets</td>
                              <td>{formatAssetsSummary(receipt.household.assets)}</td>
                              <td>Asset context; not added to AGI</td>
                            </tr>
                          </tbody>
                        </table>
                      </section>

                      <section className="v3-receipt-section-doc">
                        <h3>
                          04 · Annualised net earned-income base <span>Primary input to the hardened AGI model</span>
                        </h3>
                        <table className="v3-receipt-table">
                          <tbody>
                            <tr>
                              <td>Monthly resolved net earned income</td>
                              <td className="num">{formatKsh(receipt.monthlyNetIncomeKsh)}</td>
                            </tr>
                            <tr>
                              <td>Number of months in annualisation period</td>
                              <td className="num">12</td>
                            </tr>
                            <tr className="total">
                              <td>Annualised net earned-income base (A)</td>
                              <td className="num">{formatKsh(receipt.reconciliation.annualNetEarnedBase)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </section>

                      <section className="v3-receipt-section-doc">
                        <h3>
                          05 · Household adjustments and policy assumptions{" "}
                          <span>
                            {receipt.model.enableExperimentalPolicyAdjustments
                              ? "Experimental adjustments ENABLED"
                              : "Experimental adjustments disabled for this run"}
                          </span>
                        </h3>
                        <table className="v3-receipt-table">
                          <thead>
                            <tr>
                              <th>Adjustment</th>
                              <th>Research setting</th>
                              <th className="num">Amount applied</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Cost-of-living adjustment</td>
                              <td>{receipt.colAdjustment.reason}</td>
                              <td className="num">{moneyNum(receipt.colAdjustment.amount)}</td>
                            </tr>
                            <tr>
                              <td>Dependency adjustment</td>
                              <td>{receipt.depAdjustment.reason}</td>
                              <td className="num">{moneyNum(receipt.depAdjustment.amount)}</td>
                            </tr>
                            <tr className="total">
                              <td>Total post-base adjustments (B)</td>
                              <td>—</td>
                              <td className="num">{moneyNum(receipt.totalAdjustmentsKsh)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </section>

                      <section className="v3-receipt-section-doc">
                        <h3>
                          06 · Adjusted Gross Income and arithmetic reconciliation <span>Calculation trace</span>
                        </h3>
                        <table className="v3-receipt-table">
                          <tbody>
                            <tr>
                              <td>Annualised net earned-income base (A)</td>
                              <td className="num">{moneyNum(receipt.reconciliation.annualNetEarnedBase)}</td>
                            </tr>
                            <tr>
                              <td>Less: total post-base adjustments (B)</td>
                              <td className="num">({moneyNum(receipt.totalAdjustmentsKsh)})</td>
                            </tr>
                            <tr>
                              <td>Pre-floor adjusted income [A − B]</td>
                              <td className="num">{moneyNum(receipt.reconciliation.preFloorAdjustedGrossIncome)}</td>
                            </tr>
                            <tr>
                              <td>Zero-floor adjustment</td>
                              <td className="num">{moneyNum(receipt.reconciliation.zeroFloorAdjustment)}</td>
                            </tr>
                            <tr className="final">
                              <td>FINAL ADJUSTED GROSS INCOME (AGI)</td>
                              <td className="num">{formatKsh(receipt.reconciliation.adjustedGrossIncomeKsh)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </section>

                      <section className="v3-receipt-section-doc">
                        <h3>
                          07 · Non-salaried contribution calculation <span>Regulation 18(1) and 18(2)</span>
                        </h3>
                        <table className="v3-receipt-table">
                          <tbody>
                            <tr>
                              <td>Adjusted Gross Income</td>
                              <td className="num">{formatKsh(receipt.reconciliation.adjustedGrossIncomeKsh)}</td>
                            </tr>
                            <tr>
                              <td>Annual contribution rate</td>
                              <td className="num">2.75%</td>
                            </tr>
                            <tr>
                              <td>Annual contribution</td>
                              <td className="num">{formatKsh(receipt.contribution.annualContributionAtRate)}</td>
                            </tr>
                            <tr>
                              <td>Monthly equivalent</td>
                              <td className="num">{formatKsh(receipt.contribution.roundedMonthlyEquivalentBeforeFloor)}</td>
                            </tr>
                            <tr>
                              <td>Minimum monthly floor (Regulation 18(2))</td>
                              <td className="num">
                                KSh 300 · {receipt.contribution.minimumContributionFloorApplied ? "APPLIED" : "NOT APPLIED"}
                              </td>
                            </tr>
                            <tr className="final">
                              <td>FINAL ILLUSTRATIVE MONTHLY CONTRIBUTION</td>
                              <td className="num">{formatKsh(receipt.contribution.finalMonthlyEquivalent)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </section>

                      <div className="v3-receipt-bottom-grid">
                        <section className="v3-receipt-section-doc" style={{ borderBottom: 0 }}>
                          <h3>08 · Evidence and review status</h3>
                          <table className="v3-receipt-table">
                            <tbody>
                              <tr>
                                <td>Declared income</td>
                                <td>Member-reported synthetic data</td>
                              </tr>
                              <tr>
                                <td>External verification</td>
                                <td>Not connected</td>
                              </tr>
                              <tr>
                                <td>Indigence decision</td>
                                <td>{receipt.financialAssistanceStatus}</td>
                              </tr>
                            </tbody>
                          </table>
                        </section>
                        <section className="v3-receipt-section-doc" style={{ borderBottom: 0 }}>
                          <h3>09 · Payment status — Not a payment receipt</h3>
                          <table className="v3-receipt-table">
                            <tbody>
                              <tr>
                                <td>Calculated monthly amount</td>
                                <td className="num">{formatKsh(receipt.contribution.finalMonthlyEquivalent)}</td>
                              </tr>
                              <tr>
                                <td>Payment initiated</td>
                                <td>NO</td>
                              </tr>
                              <tr className="total">
                                <td>Amount actually paid</td>
                                <td className="num">KSh 0.00</td>
                              </tr>
                            </tbody>
                          </table>
                        </section>
                      </div>

                      <div className="v3-receipt-disclosure">
                        <strong>PROTOTYPE AND LEGAL DISCLOSURE.</strong> This is an illustrative calculation produced by
                        an independent research prototype using synthetic data. It is not an official SHA assessment,
                        demand note, invoice, statement of account or payment receipt.
                      </div>
                    </article>
                  )}

                  <div className="v3-actions">
                    <button type="button" className="v3-btn" onClick={() => navigate("methods")}>
                      ← Method comparison
                    </button>
                    <button type="button" className="v3-btn primary" onClick={() => navigate("correction")}>
                      Simulate correction &amp; audit trail →
                    </button>
                  </div>

                  <div className="v3-footerline">
                    Every figure above is bound directly to the immutable calculation snapshot generated by the rules
                    engine (`{receipt.reference}`).
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── 08 / CORRECTION HISTORY ── */}
          {screen === "correction" && (
            <div className="v3-screen">
              <div className="v3-kicker">08 / Correction and audit trail</div>
              <h1 className="v3-screen-title">A correction should change the record — not erase its history.</h1>
              <p className="v3-screen-intro">
                If a member identifies an error, preserve the original declaration, record the reason and supporting
                reference, and create a separate corrected assessment with its own calculation trace.
              </p>

              {!results?.next || !receipt ? (
                renderCalculationGate("Correction history")
              ) : receipt.incomeLines.length === 0 ? (
                <div className="v3-gate-card">
                  <div className="v3-kicker">Structured source required</div>
                  <h3>No structured earned-income source is present in this snapshot.</h3>
                  <p>
                    Source-level correction recalculates against an active structured earned-income record while keeping
                    the original snapshot immutable. Add or convert an earned source on Step 02 to test source
                    corrections.
                  </p>
                  <button type="button" className="v3-btn primary" onClick={() => navigate("income")}>
                    Go to Earned income (02) →
                  </button>
                </div>
              ) : (
                <div className="v3-form-layout">
                  <div className="v3-form-sheet">
                    <div className="v3-form-section">
                      <div className="v3-form-section-title">
                        <strong>Correction request</strong>
                        <span>Invokes live rules engine on cloned snapshot</span>
                      </div>

                      {receipt.incomeLines.length > 1 && (
                        <div className="v3-field" style={{ marginBottom: 14 }}>
                          <label htmlFor="v3-corr-source">Earned income source to correct</label>
                          <select
                            id="v3-corr-source"
                            value={selectedCorrectionSourceId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              setSelectedCorrectionSourceId(nextId);
                              const line = receipt.incomeLines.find((l) => String(l.sourceId) === nextId);
                              if (line) {
                                setCorrectedGrossInput(String(line.grossReceivedKsh));
                                setCorrectedCostsInput(String(line.costsKsh));
                              }
                            }}
                          >
                            {receipt.incomeLines.map((l) => (
                              <option key={l.sourceId} value={l.sourceId}>
                                {l.label} (Original gross: {formatKsh(l.grossReceivedKsh)})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {(() => {
                        const origLine =
                          receipt.incomeLines.find((l) => String(l.sourceId) === String(selectedCorrectionSourceId)) ||
                          receipt.incomeLines[0];
                        return (
                          <div className="v3-form-grid">
                            <div className="v3-field">
                              <label>Original gross receipts · {origLine.observationMonths || 12} months</label>
                              <input value={formatKsh(origLine.grossReceivedKsh)} readOnly />
                            </div>
                            <div className="v3-field">
                              <label htmlFor="corrected-gross">
                                Corrected gross receipts · {origLine.observationMonths || 12} months
                              </label>
                              <input
                                id="corrected-gross"
                                type="number"
                                min={0}
                                value={correctedGrossInput}
                                onChange={(e) => setCorrectedGrossInput(e.target.value)}
                              />
                            </div>
                            <div className="v3-field">
                              <label htmlFor="corrected-costs">
                                Corrected operating costs · {origLine.observationMonths || 12} months
                              </label>
                              <input
                                id="corrected-costs"
                                type="number"
                                min={0}
                                value={correctedCostsInput}
                                onChange={(e) => setCorrectedCostsInput(e.target.value)}
                              />
                            </div>
                            <div className="v3-field">
                              <label htmlFor="correction-evidence">Evidence reference</label>
                              <input
                                id="correction-evidence"
                                value={correctionEvidenceRef}
                                onChange={(e) => setCorrectionEvidenceRef(e.target.value)}
                              />
                            </div>
                            <div className="v3-field" style={{ gridColumn: "1 / -1" }}>
                              <label htmlFor="correction-reason">Reason for correction</label>
                              <input
                                id="correction-reason"
                                value={correctionReason}
                                onChange={(e) => setCorrectionReason(e.target.value)}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {correctionPreview.error && (
                      <div className="v3-alert-box" style={{ marginBottom: 14 }}>
                        {correctionPreview.error}
                      </div>
                    )}

                    <div className="v3-correction-grid">
                      <div className="v3-correction-pane old">
                        <h3>Original assessment</h3>
                        <div className="v3-review-line">
                          <span>Gross receipts</span>
                          <b>{formatKsh(receipt.totals.totalGrossAnnualKsh)}</b>
                        </div>
                        <div className="v3-review-line">
                          <span>Operating costs</span>
                          <b>{formatKsh(receipt.totals.totalExpensesAnnualKsh)}</b>
                        </div>
                        <div className="v3-review-line">
                          <span>Net income</span>
                          <b>{formatKsh(receipt.totals.totalNetAnnualKsh)}</b>
                        </div>
                        <div className="v3-review-line">
                          <span>Evaluated AGI</span>
                          <b>{formatKsh(receipt.reconciliation.adjustedGrossIncomeKsh)}</b>
                        </div>
                        <div className="v3-review-line">
                          <span>Monthly equivalent</span>
                          <b>{formatKsh(receipt.contribution.finalMonthlyEquivalent)}</b>
                        </div>
                        <div className="v3-review-line">
                          <span>Minimum floor (Reg. 17(2))</span>
                          <b>
                            {receipt.contribution.minimumContributionFloorApplied
                              ? "KSh 300 · Applied"
                              : "KSh 300 · Not applied"}
                          </b>
                        </div>
                      </div>

                      <div className="v3-correction-pane new">
                        <h3>Corrected calculation</h3>
                        {correctionPreview.output ? (
                          <>
                            <div className="v3-review-line">
                              <span>Gross receipts</span>
                              <b>{formatKsh(correctionPreview.output.comparison.correctedSourceAmount)}</b>
                            </div>
                            <div className="v3-review-line">
                              <span>Operating costs</span>
                              <b>{formatKsh(correctionPreview.output.comparison.correctedSourceCosts)}</b>
                            </div>
                            <div className="v3-review-line">
                              <span>Net income (annualised base)</span>
                              <b>{formatKsh(correctionPreview.output.comparison.revisedAnnualBase)}</b>
                            </div>
                            <div className="v3-review-line">
                              <span>Evaluated AGI</span>
                              <b>{formatKsh(correctionPreview.output.comparison.revisedAGI)}</b>
                            </div>
                            <div className="v3-review-line">
                              <span>Monthly equivalent</span>
                              <b>
                                {formatKsh(correctionPreview.output.comparison.revisedMonthlyContribution)}
                                {correctionPreview.output.comparison.monthlyDifference !== 0 && (
                                  <span style={{ marginLeft: 6, fontWeight: 600, color: "#4f7b5b" }}>
                                    ({correctionPreview.output.comparison.monthlyDifference > 0 ? "+" : "−"}
                                    {formatKsh(correctionPreview.output.comparison.monthlyDifference, { abs: true })})
                                  </span>
                                )}
                              </b>
                            </div>
                            <div className="v3-review-line">
                              <span>Minimum floor (Reg. 17(2))</span>
                              <b>
                                {correctionPreview.output.comparison.minimumFloorStillApplied ? (
                                  <span style={{ color: "#2c5b4b", fontWeight: 700 }}>
                                    Applied (2.75% ={" "}
                                    {formatKsh(
                                      correctionPreview.output.revisedResult.contributionCalculation
                                        ?.roundedMonthlyEquivalentBeforeFloor ??
                                        Math.round(
                                          (correctionPreview.output.revisedResult.adjustedGrossIncome * 0.0275) / 12
                                        )
                                    )}{" "}
                                    → KSh 300)
                                  </span>
                                ) : (
                                  "Not applied"
                                )}
                              </b>
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: 10, color: "#7e8b82", padding: "8px 0" }}>
                            Enter valid non-negative figures above to compute the revised snapshot.
                          </div>
                        )}
                      </div>
                    </div>

                    {correctionPreview.output && (
                      <div className="v3-formula-note" style={{ marginTop: 14 }}>
                        <b>Live engine outcome</b>
                        <p>{correctionPreview.output.comparison.explanationText}</p>
                      </div>
                    )}

                    <p className="v3-correction-explain">
                      This preview invokes `recalculateCorrectedSource` against the actual calculation engine with an
                      independent deep clone of the original inputs. The original immutable snapshot remains intact.
                    </p>

                    <div className="v3-actions">
                      <button type="button" className="v3-btn" onClick={() => navigate("receipt")}>
                        ← Return to statement
                      </button>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {correctedStatementText && (
                          <button
                            type="button"
                            className="v3-btn"
                            onClick={() => {
                              setShowCorrectedStatement((prev) => {
                                const nextVal = !prev;
                                if (nextVal) {
                                  setTimeout(() => {
                                    correctedStatementRef.current?.scrollIntoView({
                                      behavior: "smooth",
                                      block: "start"
                                    });
                                  }, 60);
                                }
                                return nextVal;
                              });
                            }}
                          >
                            {showCorrectedStatement ? "Hide corrected statement" : "Preview corrected statement"}
                          </button>
                        )}
                        <button type="button" className="v3-btn primary" onClick={() => navigate("receipt")}>
                          Open original statement →
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="v3-side-note">
                    <div className="v3-note-label">Audit principles</div>
                    <h4>Keep both versions.</h4>
                    <p>
                      The correction record should show who changed what, when, why and against which evidence. The
                      original should remain retrievable for review.
                    </p>
                    <div className="v3-mini-rule" />
                    <div className="v3-note-label">What changes</div>
                    <ul>
                      <li>Gross receipts &amp; operating costs</li>
                      <li>Net earned income</li>
                      <li>AGI base</li>
                      <li>Contribution arithmetic</li>
                    </ul>
                  </aside>
                </div>
              )}
              {results?.next && receipt && showCorrectedStatement && correctedStatementText && (
                <div ref={correctedStatementRef} style={{ marginTop: 28 }}>
                  <div className="v3-receipt-toolbar">
                    <div>
                      <div className="v3-kicker" style={{ marginBottom: 2 }}>
                        Revised calculation statement preview · Synthetic correction
                      </div>
                      <div className="hint">
                        Generated from the cloned corrected snapshot; original baseline statement remains unchanged.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <button type="button" className="v3-btn-white" onClick={() => setShowCorrectedStatement(false)}>
                        Hide preview
                      </button>
                      <button type="button" className="v3-btn-white primary" onClick={handleCopyStatement}>
                        {copiedStatement ? "Copied" : "Copy corrected statement"}
                      </button>
                    </div>
                  </div>
                  <div className="v3-receipt-ascii">
                    <pre>{correctedStatementText}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="v3-footerline">
            Presentation redesign v3 · Connected live to the SHA research prototype calculation engine
            (`household-income-ledger-v1.2` &amp; `declared-income-agi-v1.1`). All demonstrations operate locally in
            your browser on synthetic data with no external SHA, KRA, NTSA, or MNO connections.
          </div>
        </section>
      </main>
    </div>
  );
}
