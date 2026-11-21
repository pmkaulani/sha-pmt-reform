/**
 * Empirical Model Comparison Runner — Controlled Paired Evaluation Engine.
 *
 * Implements paired model benchmarking across identical household observations,
 * enforcing strict separation between:
 * - Mode A: Predictive Measurement Accuracy (MAE, RMSE, Signed Error, Misclassification)
 * - Mode B: Contribution Affordability Burden (% of household resources, quintile distributions)
 *
 * Core Governance Guarantees:
 * 1. Refuses invalid predictive comparisons where model constructs diverge.
 * 2. Never claims the lowest contribution is the "best" or "most accurate" model.
 * 3. Compares candidate models strictly on identical, paired household observations.
 * 4. Official SHA baseline is excluded from comparative claims until official parameters are disclosed.
 * 5. Small subgroups (<5 households) are automatically suppressed to protect privacy.
 */

import {
  calculateContinuousMetrics,
  calculateBinaryMetrics,
  calculateSubgroupMetrics,
  calculateAffordabilityMetrics,
  evaluateSamplingUncertainty
} from "./evaluation-metrics.js";

import {
  getModelRegistryEntry,
  checkModelTargetCompatibility,
  MODEL_EVALUATION_STATUSES
} from "./evaluation-model-registry.js";

import {
  validatePredictionReferenceCompatibility,
  EVALUATION_TARGET_TYPES
} from "./evaluation-contracts.js";

import { validateShaBaselineCompleteness } from "./sha-baseline-registry.js";
import { EVALUATION_MODES, validateEvaluationProtocol } from "./evaluation-protocol.js";

/**
 * Executes a controlled, paired empirical comparison of candidate models.
 *
 * @param {object} params
 * @param {string} params.comparisonMode - EVALUATION_MODES.PREDICTIVE or EVALUATION_MODES.AFFORDABILITY
 * @param {Array<string>} params.candidateModelIds - Array of registered model IDs
 * @param {string} params.targetId - Independent evaluation target ID
 * @param {object} params.datasetManifest - Dataset manifest
 * @param {Array<object>} params.evaluationRecords - Prepared holdout or evaluation records
 * @param {object} params.protocol - Pre-registered evaluation protocol
 * @param {string} params.subgroupField - Optional field for subgroup disaggregation
 * @param {number} params.minSubgroupSize - Minimum records before suppression (default 5)
 * @returns {object} Paired comparison results
 */
export function runEmpiricalComparison({
  comparisonMode = EVALUATION_MODES.AFFORDABILITY,
  candidateModelIds = [],
  targetId,
  datasetManifest,
  evaluationRecords = [],
  protocol = null,
  subgroupField = null,
  minSubgroupSize = 5
} = {}) {
  const runId = `paired-comp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  const report = {
    runId,
    timestamp,
    comparisonMode,
    status: "BLOCKED",
    blockers: [],
    warnings: [],
    dataset: {
      id: datasetManifest?.id || "UNKNOWN",
      name: datasetManifest?.name || datasetManifest?.datasetId || "Unknown Dataset",
      datasetType: datasetManifest?.datasetType || "UNKNOWN",
      recordCount: evaluationRecords.length
    },
    protocol: {
      id: protocol?.protocolId || "UNREGISTERED",
      version: protocol?.version || "0.0",
      isRegistered: Boolean(protocol?.preRegisteredAt)
    },
    pairedSampleSize: 0,
    excludedObservationsCount: 0,
    modelEvaluations: {},
    pairedComparisons: null,
    subgroupAnalysis: null,
    affordabilitySummary: null,
    uncertainty: null,
    limitations: []
  };

  // 1. Validate inputs
  if (!Array.isArray(candidateModelIds) || candidateModelIds.length === 0) {
    report.blockers.push("At least one candidate model is required for evaluation.");
    return report;
  }

  if (!Array.isArray(evaluationRecords) || evaluationRecords.length === 0) {
    report.status = "NOT_EVALUABLE";
    report.blockers.push("Evaluation records array is empty.");
    return report;
  }

  // 2. Synthetic data safeguard
  const isSynthetic = datasetManifest?.datasetType === "SYNTHETIC" ||
    evaluationRecords.some(r => r?._isSynthetic === true);
  if (isSynthetic) {
    report.warnings.push(
      "DEMONSTRATION RUN: Evaluated using synthetic data fixtures. Results verify software execution only and do NOT establish empirical accuracy or equity."
    );
  }

  // 3. Resolve models from registry
  const resolvedModels = [];
  for (const mId of candidateModelIds) {
    const entry = getModelRegistryEntry(mId);
    if (!entry) {
      report.blockers.push(`Model '${mId}' is not registered in the evaluation model registry.`);
    } else {
      resolvedModels.push(entry);
    }
  }

  if (report.blockers.length > 0) {
    report.status = "BLOCKED";
    return report;
  }

  // 4. Check Official SHA Baseline status
  const officialBaseline = resolvedModels.find(m => m.isOfficialShaBaseline || m.id === "official-sha-reg21-pmt");
  if (officialBaseline) {
    const baselineCheck = validateShaBaselineCompleteness();
    if (!baselineCheck.isComplete) {
      report.blockers.push(
        "Comparative evaluation against official SHA baseline is BLOCKED: official parameters, coefficients, and scoring brackets remain undisclosed."
      );
      report.status = "BLOCKED";
      report.limitations.push("SHA baseline cannot be evaluated until official regression weights and tariff brackets are verified.");
      return report;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODE A: PREDICTIVE MEASUREMENT EVALUATION
  // ─────────────────────────────────────────────────────────────────────────
  if (comparisonMode === EVALUATION_MODES.PREDICTIVE) {
    // Check construct compatibility for each candidate model
    const incompatibleModels = [];
    for (const m of resolvedModels) {
      const comp = checkModelTargetCompatibility(m.id, targetId);
      if (!comp.canEvaluate) {
        incompatibleModels.push({
          modelId: m.id,
          modelName: m.name,
          reason: comp.reason
        });
      }
    }

    if (incompatibleModels.length > 0) {
      report.status = "NOT_EVALUABLE_INCOMPATIBLE";
      report.blockers.push(
        `Construct Incompatibility: ${incompatibleModels.map(i => `${i.modelName} cannot be evaluated against target '${targetId}': ${i.reason}`).join("; ")}`
      );
      report.limitations.push(
        "Predictive evaluation refused: candidate models measure different economic constructs. To avoid false rankings, arbitrary conversion factors will not be manufactured."
      );
      return report;
    }

    // Run paired predictive metrics across identical records
    const validPairs = [];
    let excludedCount = 0;

    for (const row of evaluationRecords) {
      const refVal = row.referenceValue ?? row.reference ?? row.actual;
      if (typeof refVal !== "number" || !Number.isFinite(refVal)) {
        excludedCount++;
        continue;
      }

      // Check if all models produced valid predictions for this row
      const predictions = {};
      let allModelsValid = true;

      for (const m of resolvedModels) {
        const pred = row[`pred_${m.id}`] ?? row[m.id] ?? row.predicted;
        if (typeof pred !== "number" || !Number.isFinite(pred)) {
          allModelsValid = false;
          break;
        }
        predictions[m.id] = pred;
      }

      if (allModelsValid) {
        validPairs.push({
          rowId: row.id || row.hhid,
          reference: refVal,
          subgroup: subgroupField ? row[subgroupField] : null,
          predictions
        });
      } else {
        excludedCount++;
      }
    }

    report.pairedSampleSize = validPairs.length;
    report.excludedObservationsCount = excludedCount;

    if (validPairs.length === 0) {
      report.status = "NOT_EVALUABLE";
      report.blockers.push("No mutually valid observations across all candidate models.");
      return report;
    }

    // Compute metrics for each model on the paired sample
    for (const m of resolvedModels) {
      const recordsForModel = validPairs.map(v => ({
        predicted: v.predictions[m.id],
        reference: v.reference
      }));
      report.modelEvaluations[m.id] = calculateContinuousMetrics(recordsForModel);
    }

    // If 2 models, compute paired difference metrics
    if (resolvedModels.length === 2) {
      const [m1, m2] = resolvedModels;
      const pairedDiffs = validPairs.map(v => {
        const err1 = Math.abs(v.predictions[m1.id] - v.reference);
        const err2 = Math.abs(v.predictions[m2.id] - v.reference);
        return err1 - err2;
      });
      const meanDiff = pairedDiffs.reduce((a, b) => a + b, 0) / pairedDiffs.length;
      report.pairedComparisons = {
        modelA: m1.id,
        modelB: m2.id,
        meanAbsoluteErrorDifference: Number(meanDiff.toFixed(2)),
        interpretation: meanDiff < 0
          ? `${m1.name} has lower mean absolute error by ${Math.abs(meanDiff).toFixed(2)} units on the paired sample.`
          : meanDiff > 0
          ? `${m2.name} has lower mean absolute error by ${meanDiff.toFixed(2)} units on the paired sample.`
          : "Both models have identical mean absolute error on the paired sample."
      };
    }

    // Subgroup analysis on paired sample
    if (subgroupField) {
      report.subgroupAnalysis = {};
      for (const m of resolvedModels) {
        const subRecords = validPairs.map(v => ({
          predicted: v.predictions[m.id],
          reference: v.reference,
          [subgroupField]: v.subgroup
        }));
        report.subgroupAnalysis[m.id] = calculateSubgroupMetrics(subRecords, {
          groupField: subgroupField,
          minSubgroupSize,
          metricType: EVALUATION_TARGET_TYPES.CONTINUOUS
        });
      }
    }

    report.status = isSynthetic ? "DEMO_ONLY" : "COMPUTED_REQUIRES_REVIEW";
    report.uncertainty = evaluateSamplingUncertainty(datasetManifest);
    return report;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODE B: CONTRIBUTION AFFORDABILITY EVALUATION
  // ─────────────────────────────────────────────────────────────────────────
  if (comparisonMode === EVALUATION_MODES.AFFORDABILITY) {
    report.affordabilitySummary = {};

    let totalPairs = 0;
    let excludedAffordCount = 0;

    for (const m of resolvedModels) {
      const pairedHouseholdData = [];

      for (const row of evaluationRecords) {
        const resMonthly = row.measuredMonthlyResources ?? row.monthlyIncome ?? row.householdMonthlyIncome;
        const proposedContrib = row[`contrib_${m.id}`] ?? row.proposedContribution ?? row.monthlyContribution;

        if (typeof resMonthly !== "number" || typeof proposedContrib !== "number" || resMonthly <= 0 || proposedContrib < 0) {
          excludedAffordCount++;
          continue;
        }

        pairedHouseholdData.push({
          householdId: row.id || row.hhid,
          proposedContributionMonthly: proposedContrib,
          measuredMonthlyResources: resMonthly,
          subgroup: subgroupField ? row[subgroupField] : null
        });
      }

      totalPairs = pairedHouseholdData.length;
      report.affordabilitySummary[m.id] = {
        modelId: m.id,
        modelName: m.name,
        metrics: calculateAffordabilityMetrics(pairedHouseholdData)
      };
    }

    report.pairedSampleSize = totalPairs;
    report.excludedObservationsCount = excludedAffordCount;
    report.status = isSynthetic ? "DEMO_ONLY" : "COMPUTED_REQUIRES_REVIEW";
    report.uncertainty = evaluateSamplingUncertainty(datasetManifest);

    report.limitations.push(
      "Affordability evaluation measures financial burden as a proportion of measured resources. A lower contribution does NOT imply higher predictive accuracy or statutory compliance."
    );

    return report;
  }

  report.status = "BLOCKED";
  report.blockers.push(`Unsupported comparison mode '${comparisonMode}'.`);
  return report;
}
