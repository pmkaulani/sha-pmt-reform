/**
 * Evaluation Metrics Engine — Research Prototype.
 *
 * Implements rigorous statistical evaluation for means-testing methods:
 * 1. Continuous Outcome Metrics: MAE, RMSE, Mean Signed Error (bias).
 * 2. Binary Classification Metrics: Sensitivity, specificity, precision, FPR, FNR, balanced accuracy.
 *    (All zero denominators return NULL, never zero).
 * 3. Subgroup Performance: Disaggregation with configurable small-cell suppression.
 * 4. Survey Weighting & Uncertainty: Transparent sampling design handling; rejects invented CIs.
 * 5. Isolated Affordability Analysis: Strictly decoupled from predictive accuracy.
 */

const ratio = (numerator, denominator) =>
  denominator > 0 ? numerator / denominator : null;

/**
 * Calculates continuous error metrics (MAE, RMSE, Mean Signed Error/bias).
 * Only valid when prediction and reference share compatible scales and units.
 */
export function calculateContinuousMetrics(records = []) {
  if (!Array.isArray(records)) {
    throw new TypeError("Evaluation records must be an array.");
  }

  let excludedRows = 0;
  const validPairs = [];

  for (const record of records) {
    const p = record?.predicted;
    const r = record?.reference;
    const w = record?.weight !== undefined && record?.weight !== null ? Number(record.weight) : 1;

    if (typeof p !== "number" || typeof r !== "number" || !Number.isFinite(p) || !Number.isFinite(r) || !Number.isFinite(w) || w <= 0) {
      excludedRows += 1;
      continue;
    }

    validPairs.push({ predicted: p, reference: r, weight: w });
  }

  const n = validPairs.length;

  if (n === 0) {
    return {
      status: "NOT_EVALUABLE",
      sampleSize: 0,
      excludedRows,
      metrics: null,
      reason: "No valid numeric prediction/reference pairs were supplied."
    };
  }

  let totalWeight = 0;
  let sumAbsError = 0;
  let sumSquaredError = 0;
  let sumSignedError = 0;

  for (const pair of validPairs) {
    const err = pair.predicted - pair.reference;
    const absErr = Math.abs(err);
    const sqErr = err * err;

    totalWeight += pair.weight;
    sumAbsError += pair.weight * absErr;
    sumSquaredError += pair.weight * sqErr;
    sumSignedError += pair.weight * err;
  }

  let totalWeightedReference = 0;
  for (const pair of validPairs) {
    totalWeightedReference += pair.weight * pair.reference;
  }

  const mae = totalWeight > 0 ? sumAbsError / totalWeight : null;
  const mse = totalWeight > 0 ? sumSquaredError / totalWeight : null;
  const rmse = mse !== null ? Math.sqrt(mse) : null;
  const meanSignedError = totalWeight > 0 ? sumSignedError / totalWeight : null;
  // WAPE = sum(|predicted - reference|) / sum(reference)
  // Per-observation MAPE is intentionally excluded because division by zero or near-zero occurs in subsistence records.
  const wape = totalWeightedReference > 0 ? sumAbsError / totalWeightedReference : null;

  return {
    status: "CALCULATED",
    sampleSize: n,
    totalWeight: Math.round(totalWeight * 100) / 100,
    excludedRows,
    metrics: {
      mae: mae !== null ? Math.round(mae * 100) / 100 : null,
      rmse: rmse !== null ? Math.round(rmse * 100) / 100 : null,
      meanSignedError: meanSignedError !== null ? Math.round(meanSignedError * 100) / 100 : null,
      wape: wape !== null ? Math.round(wape * 1000) / 1000 : null,
      mapeNotice: "Raw per-row MAPE is excluded due to instability and division by zero when household reference income/consumption is zero or near zero. WAPE is reported instead.",
      isWeighted: validPairs.some(p => p.weight !== 1)
    }
  };
}

/**
 * Calculates binary classification metrics from independently defined reference outcomes
 * and candidate model predictions.
 *
 * Positive class must be defined in the evaluation target contract.
 * Zero-denominator metrics return NULL, never 0.
 */
export function calculateBinaryMetrics(records = []) {
  if (!Array.isArray(records)) {
    throw new TypeError("Evaluation records must be an array.");
  }

  const matrix = {
    truePositive: 0,
    falsePositive: 0,
    trueNegative: 0,
    falseNegative: 0
  };

  let excludedRows = 0;
  let validCount = 0;

  for (const record of records) {
    if (
      typeof record?.predictedPositive !== "boolean" ||
      typeof record?.referencePositive !== "boolean"
    ) {
      excludedRows += 1;
      continue;
    }

    const predicted = record.predictedPositive;
    const actual = record.referencePositive;
    validCount += 1;

    if (predicted && actual) matrix.truePositive += 1;
    else if (predicted && !actual) matrix.falsePositive += 1;
    else if (!predicted && !actual) matrix.trueNegative += 1;
    else matrix.falseNegative += 1;
  }

  const {
    truePositive: tp,
    falsePositive: fp,
    trueNegative: tn,
    falseNegative: fn
  } = matrix;

  const n = tp + fp + tn + fn;

  if (n === 0) {
    return {
      status: "NOT_EVALUABLE",
      sampleSize: 0,
      excludedRows,
      confusionMatrix: matrix,
      metrics: null,
      reason: "No valid prediction/reference pairs were supplied."
    };
  }

  const sensitivity = ratio(tp, tp + fn);
  const specificity = ratio(tn, tn + fp);
  const precision = ratio(tp, tp + fp);
  const falseNegativeRate = ratio(fn, fn + tp);
  const falsePositiveRate = ratio(fp, fp + tn);

  return {
    status: "CALCULATED",
    sampleSize: n,
    excludedRows,
    confusionMatrix: matrix,
    metrics: {
      accuracy: ratio(tp + tn, n),
      precision,
      sensitivity,
      specificity,
      falseNegativeRate,
      falsePositiveRate,
      balancedAccuracy:
        sensitivity === null || specificity === null
          ? null
          : (sensitivity + specificity) / 2
    }
  };
}

/**
 * Calculates subgroup performance with privacy-preserving small-cell suppression.
 */
export function calculateSubgroupMetrics(records = [], { groupField, minSubgroupSize = 5, metricType = "BINARY" } = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError("Evaluation records must be an array.");
  }

  if (!groupField || typeof groupField !== "string") {
    throw new TypeError("groupField must be a valid string.");
  }

  const groups = new Map();

  for (const record of records) {
    const rawVal = record?.[groupField];
    const groupKey = rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ""
      ? String(rawVal).trim()
      : "UNKNOWN / UNSPECIFIED";

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(record);
  }

  const subgroupResults = {};

  for (const [groupKey, groupRecords] of groups.entries()) {
    const n = groupRecords.length;

    if (n < minSubgroupSize) {
      subgroupResults[groupKey] = {
        subgroup: groupKey,
        sampleSize: n,
        isSuppressed: true,
        status: "SUPPRESSED_SMALL_CELL",
        suppressionReason: `Subgroup sample size (${n}) is below reporting threshold (${minSubgroupSize}) to prevent disclosure risk and statistical distortion.`,
        metrics: null
      };
      continue;
    }

    const res = metricType === "CONTINUOUS"
      ? calculateContinuousMetrics(groupRecords)
      : calculateBinaryMetrics(groupRecords);

    subgroupResults[groupKey] = {
      subgroup: groupKey,
      sampleSize: n,
      isSuppressed: false,
      status: res.status,
      metrics: res.metrics,
      confusionMatrix: res.confusionMatrix || null
    };
  }

  return {
    groupField,
    subgroupCount: groups.size,
    subgroups: subgroupResults
  };
}

/**
 * Validates sampling design and uncertainty reporting.
 * Rejects unverified survey weights, fabricated confidence intervals, and uncalibrated models.
 * Note: Returns UNCERTAINTY_NOT_ESTIMATED because design-aware variance estimation
 * (Taylor linearization or replication weights) is not implemented in this prototype.
 */
export function evaluateSamplingUncertainty(datasetManifest) {
  if (!datasetManifest || typeof datasetManifest !== "object") {
    return {
      hasValidDesign: false,
      confidenceIntervalsAvailable: false,
      status: "UNCERTAINTY_NOT_ESTIMATED",
      reason: "No dataset manifest provided."
    };
  }

  if (datasetManifest.datasetType === "SYNTHETIC") {
    return {
      hasValidDesign: false,
      confidenceIntervalsAvailable: false,
      status: "UNCERTAINTY_NOT_ESTIMATED",
      reason: "Synthetic demonstration data cannot support inferential statistics or confidence intervals."
    };
  }

  if (!datasetManifest.clusterField || !datasetManifest.strataField) {
    return {
      hasValidDesign: false,
      confidenceIntervalsAvailable: false,
      status: "UNCERTAINTY_NOT_ESTIMATED",
      reason: "Complex survey design identifiers (clusters and strata) are missing. Confidence intervals are unavailable."
    };
  }

  return {
    hasValidDesign: true,
    confidenceIntervalsAvailable: false,
    status: "UNCERTAINTY_NOT_ESTIMATED",
    reason: "Complex survey design identifiers are recorded, but design-aware variance estimation (Taylor linearization or replication weights) is not implemented in this prototype. Confidence intervals are unavailable.",
    designDescription: datasetManifest.samplingDesignDescription || "Verified survey design."
  };
}

/**
 * Isolated Affordability Analysis Contract.
 * Evaluates contribution burden relative to disposable resources.
 * Strictly decoupled from predictive accuracy metrics.
 *
 * Methodological Invariants:
 * 1. Households with zero or negative resources are isolated in a dedicated category, NOT silently dropped.
 * 2. 5% and 10% thresholds are labeled as unapproved illustrative research benchmarks.
 */
export function calculateAffordabilityMetrics(records = []) {
  if (!Array.isArray(records)) {
    throw new TypeError("Records must be an array.");
  }

  let excludedCount = 0;
  let zeroOrNegativeCount = 0;
  let missingDataCount = 0;
  const validBurdenRatios = [];
  let severeBurdenCount = 0; // > 10%
  let highBurdenCount = 0;   // > 5%

  for (const record of records) {
    const monthlyContribution = Number(
      record?.monthlyContributionKsh ??
      record?.proposedContributionMonthly ??
      record?.monthlyContribution
    );
    const annualDisposable = Number(
      record?.availableDisposableIncomeKsh ??
      (record?.measuredMonthlyResources !== undefined ? Number(record.measuredMonthlyResources) * 12 : undefined) ??
      record?.annualDisposableIncome
    );

    if (!Number.isFinite(monthlyContribution) || monthlyContribution < 0) {
      excludedCount += 1;
      missingDataCount += 1;
      continue;
    }

    if (!Number.isFinite(annualDisposable)) {
      excludedCount += 1;
      missingDataCount += 1;
      continue;
    }

    if (annualDisposable <= 0) {
      excludedCount += 1;
      zeroOrNegativeCount += 1;
      continue;
    }

    const annualContribution = monthlyContribution * 12;
    const burdenRatio = annualContribution / annualDisposable;

    validBurdenRatios.push(burdenRatio);
    if (burdenRatio > 0.10) severeBurdenCount += 1;
    if (burdenRatio > 0.05) highBurdenCount += 1;
  }

  const n = validBurdenRatios.length;

  if (n === 0) {
    return {
      status: "NOT_EVALUABLE",
      sampleSize: 0,
      excludedCount,
      zeroOrNegativeCount,
      missingDataCount,
      metrics: null,
      reason: "No records with positive disposable income and non-negative contributions were supplied.",
      zeroOrNegativeResourcesCategory: {
        count: zeroOrNegativeCount,
        category: "ZERO_OR_NEGATIVE_RESOURCES",
        note: "Households with zero or negative disposable resources cannot have a percentage burden computed."
      }
    };
  }

  validBurdenRatios.sort((a, b) => a - b);
  const medianRatio = validBurdenRatios[Math.floor(n / 2)];
  const meanRatio = validBurdenRatios.reduce((s, r) => s + r, 0) / n;

  return {
    status: "CALCULATED",
    sampleSize: n,
    excludedCount,
    zeroOrNegativeCount,
    missingDataCount,
    disclaimer: "Affordability metrics evaluate financial strain relative to disposable resources. They are not an evaluation of model predictive accuracy or statutory legality.",
    zeroOrNegativeResourcesCategory: {
      count: zeroOrNegativeCount,
      category: "ZERO_OR_NEGATIVE_RESOURCES",
      description: "Households with zero or negative disposable income cannot have a finite contribution burden percentage calculated. Under Regulation 17(2), these households remain subject to the KSh 300/mo minimum unless verified for full indigent subsidy under Regulation 17(3)."
    },
    metrics: {
      medianContributionBurdenRatio: Math.round(medianRatio * 1000) / 1000,
      meanContributionBurdenRatio: Math.round(meanRatio * 1000) / 1000,
      percentFacingHighBurden: Math.round((highBurdenCount / n) * 1000) / 10,
      percentFacingSevereBurden: Math.round((severeBurdenCount / n) * 1000) / 10,
      highBurdenThreshold: "Illustrative research benchmark: contributions exceed 5% of reported annual disposable resources (NOT an official SHA policy standard)",
      severeBurdenThreshold: "Illustrative research benchmark: contributions exceed 10% of reported annual disposable resources (NOT an official SHA policy standard)",
      policyStatus: "NOT_POLICY_APPROVED",
      policyDisclaimer: "The 5% and 10% burden thresholds are illustrative research benchmarks drawn from international health financing literature, NOT official SHA statutory limits under the Social Health Insurance Act, 2023."
    }
  };
}
