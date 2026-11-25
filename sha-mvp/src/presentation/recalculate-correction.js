/**
 * Recalculate Source Correction Helper
 *
 * Implements a real calculation recalculation when a user questions an earned-income
 * source line. Operates on a deep clone of the original assessment input, preserving
 * immutability of the original inputs, snapshots, and calculation results.
 *
 * Reuses the existing core functions:
 * - resolveEffectiveIncomeSources
 * - calculateHouseholdIncome
 * - calculateProposedModelVersions
 */

import {
  INCOME_SOURCE_RULES,
  resolveEffectiveIncomeSources,
  calculateHouseholdIncome,
  DEFAULT_COMMON_ASSESSMENT_PERIOD
} from "../lib/household-income.js";

import {
  calculateProposedModelVersions
} from "../lib/model-versioning.js";

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

export function recalculateCorrectedSource({
  originalInputs,
  originalResults,
  sourceId,
  correctedAmountReceivedKsh,
  correctedCostsKsh = null,
  explanation = "",
  adminParams = {}
}) {
  if (!originalInputs || !originalResults) {
    throw new Error("Original assessment data is missing.");
  }

  const hasGross = correctedAmountReceivedKsh !== undefined && correctedAmountReceivedKsh !== null && correctedAmountReceivedKsh !== "";
  const hasCosts = correctedCostsKsh !== undefined && correctedCostsKsh !== null && correctedCostsKsh !== "";

  if (!hasGross && !hasCosts) {
    throw new Error("Enter a valid non-negative KSh amount.");
  }

  const correctedAmount = hasGross ? Number(correctedAmountReceivedKsh) : null;
  if (hasGross && (!Number.isFinite(correctedAmount) || correctedAmount < 0)) {
    throw new Error("Enter a valid non-negative KSh amount.");
  }

  const correctedCosts = hasCosts ? Number(correctedCostsKsh) : null;
  if (hasCosts && (!Number.isFinite(correctedCosts) || correctedCosts < 0)) {
    throw new Error("Enter a valid non-negative KSh amount.");
  }

  // Work strictly on an independent deep copy. Never mutate original assessment.
  const correctedInputs = cloneData(originalInputs);

  const sources = Array.isArray(correctedInputs.incomeSources)
    ? correctedInputs.incomeSources
    : [];

  const sourceIndex = sources.findIndex(
    source => String(source.id) === String(sourceId)
  );

  if (sourceIndex === -1) {
    throw new Error("The selected income source could not be found.");
  }

  const selectedSource = sources[sourceIndex];
  const rule = INCOME_SOURCE_RULES[selectedSource.sourceType];

  if (rule?.bucket !== "EARNED") {
    throw new Error(
      "This demonstration only supports corrections to earned-income sources. Non-earned flows require specific policy classification."
    );
  }

  const originalSourceAmount = Number(selectedSource.amountReceivedKsh || 0);
  const originalSourceCosts = Number(selectedSource.directCostsKsh || 0) +
    (Array.isArray(selectedSource.expenses) ? selectedSource.expenses.reduce((s, e) => s + (Number(e.amountKsh) || 0), 0) : 0);

  // The corrected value is the total received or costs over this source's observation period
  const updatedSource = {
    ...selectedSource,
    correctionExplanation: explanation || null,
    isCorrectedInDemo: true
  };

  if (hasGross) {
    updatedSource.amountReceivedKsh = correctedAmount;
  }
  if (hasCosts) {
    updatedSource.directCostsKsh = correctedCosts;
    updatedSource.expenses = [
      { id: "exp-corrected", category: "OTHER_OPERATING", amountKsh: correctedCosts }
    ];
  }

  sources[sourceIndex] = updatedSource;

  correctedInputs.incomeSources = sources;

  // Preserve the original assessment's reference period
  const assessmentPeriod =
    originalInputs.incomeAssessmentSnapshot?.commonAssessmentPeriod ||
    DEFAULT_COMMON_ASSESSMENT_PERIOD;

  const effectiveSources = resolveEffectiveIncomeSources(
    sources,
    correctedInputs.hasNoEarnedIncome === true
  );

  // Rebuild the actual ledger using core engine logic
  const correctedSnapshot = calculateHouseholdIncome(
    effectiveSources,
    assessmentPeriod
  );

  if (!correctedSnapshot.isValid) {
    throw new Error(
      correctedSnapshot.errors?.join("; ") ||
      "The corrected income ledger is invalid."
    );
  }

  if (!correctedSnapshot.canPopulatePrototypeEarnedIncomeBase) {
    const flag = correctedSnapshot.reviewFlags?.[0];
    throw new Error(
      flag?.message ||
      "The corrected information requires further review and cannot proceed to an automated calculation."
    );
  }

  correctedInputs.monthlyNetEarnedIncome =
    correctedSnapshot.monthlyEarnedNetKsh;

  correctedInputs.incomeAssessmentSnapshot =
    correctedSnapshot;

  correctedInputs.assessmentInputMode =
    "STRUCTURED_LEDGER";

  // Run the same model versions using the saved admin research parameters
  const correctedVersions = calculateProposedModelVersions(
    correctedInputs,
    adminParams
  );

  const revisedResult =
    correctedVersions.declaredIncome.result;

  const originalMonthly =
    originalResults.next?.monthlyContribution ??
    originalResults.next?.monthly ??
    300;

  const revisedMonthly =
    revisedResult.monthlyContribution ?? 300;

  const originalAGI =
    originalResults.next?.adjustedGrossIncome ?? 0;

  const revisedAGI =
    revisedResult.adjustedGrossIncome ?? 0;

  const originalNetMonthly =
    originalResults.next?.incomeAssessmentSnapshot?.monthlyEarnedNetKsh ??
    originalInputs.monthlyNetEarnedIncome ??
    0;

  const revisedNetMonthly =
    correctedSnapshot.monthlyEarnedNetKsh ?? 0;

  const monthlyDifference =
    revisedMonthly - originalMonthly;

  const floorStillApplied =
    revisedResult.minimumContributionFloorApplied === true;

  // Plain-language explanation of why the result changed or stayed the same
  let explanationText = "";
  if (monthlyDifference === 0) {
    if (floorStillApplied) {
      explanationText =
        "Even after correcting the source amount, the calculated 2.75% contribution remains below the statutory minimum floor of KSh 300/month (Regulation 17(2)). The payable amount therefore remains KSh 300/month.";
    } else {
      explanationText =
        "The corrected amount produced identical net monthly earnings after accounting for expenses and observation periods.";
    }
  } else if (monthlyDifference < 0) {
    explanationText = `Reducing the reported source amount lowered the household's annual Adjusted Gross Income from KSh ${originalAGI.toLocaleString()} to KSh ${revisedAGI.toLocaleString()}, reducing the calculated monthly contribution by KSh ${Math.abs(monthlyDifference).toLocaleString()} (from KSh ${originalMonthly.toLocaleString()} to KSh ${revisedMonthly.toLocaleString()}).`;
  } else {
    explanationText = `Increasing the reported source amount increased the household's annual Adjusted Gross Income from KSh ${originalAGI.toLocaleString()} to KSh ${revisedAGI.toLocaleString()}, increasing the calculated monthly contribution by KSh ${monthlyDifference.toLocaleString()} (from KSh ${originalMonthly.toLocaleString()} to KSh ${revisedMonthly.toLocaleString()}).`;
  }

  // Construct a full results object for the revised state
  const revisedResults = {
    ...cloneData(originalResults),
    d: correctedInputs,
    next: {
      ...revisedResult,
      modelVersion: correctedVersions.declaredIncome.id,
      annualIncome: revisedResult.estimatedAnnualIncome,
      monthly: revisedResult.monthlyContribution,
      incomeAssessmentSnapshot: correctedSnapshot
    },
    modelVersions: correctedVersions
  };

  return {
    sourceId,
    explanation,
    correctedInputs,
    correctedSnapshot,
    correctedVersions,
    revisedResult,
    revisedResults,
    comparison: {
      originalSourceAmount,
      correctedSourceAmount: hasGross ? correctedAmount : originalSourceAmount,
      sourceDifference: (hasGross ? correctedAmount : originalSourceAmount) - originalSourceAmount,

      originalSourceCosts,
      correctedSourceCosts: hasCosts ? correctedCosts : originalSourceCosts,
      costsDifference: (hasCosts ? correctedCosts : originalSourceCosts) - originalSourceCosts,

      originalNetMonthly,
      revisedNetMonthly,
      netMonthlyDifference: revisedNetMonthly - originalNetMonthly,

      originalAnnualBase: originalResults.next?.estimatedAnnualIncome ?? 0,
      revisedAnnualBase: revisedResult.estimatedAnnualIncome ?? 0,

      originalAGI,
      revisedAGI,
      agiDifference: revisedAGI - originalAGI,

      originalMonthlyContribution: originalMonthly,
      revisedMonthlyContribution: revisedMonthly,
      monthlyDifference,

      minimumFloorStillApplied: floorStillApplied,
      originalFloorApplied: originalResults.next?.minimumContributionFloorApplied === true,

      explanationText
    }
  };
}
