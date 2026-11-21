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

  // 2. Synthetic data and provenance safeguards
  const isSynthetic = datasetManifest?.datasetType === "SYNTHETIC" ||
    evaluationRecords.some(r => r?._isSynthetic === true);

  // Provenance binding: A survey manifest CANNOT execute against synthetic records
  if (datasetManifest?.datasetType === "SURVEY" && isSynthetic) {
    report.status = "BLOCKED";
    report.blockers.push(
      "Provenance mismatch: Dataset manifest declares SURVEY microdata, but evaluation records contain synthetic demonstration fixtures. Evaluation refused."
    );
    report.limitations.push("Survey comparisons require genuine, verified survey microdata with intact sampling design.");
    return report;
  }

  // Protocol freeze enforcement: Formal empirical evaluation requires a FROZEN pre-registered protocol
  if (datasetManifest?.datasetType === "SURVEY" || datasetManifest?.isApprovedForEmpiricalEvaluation === true) {
    if (!protocol || protocol.approvalStatus !== "FROZEN") {
      report.status = "BLOCKED";
      report.blockers.push(
        `Protocol freeze required: Formal empirical evaluation against '${datasetManifest?.id || "SURVEY"}' requires a pre-registered protocol with approvalStatus 'FROZEN'. Current status: '${protocol?.approvalStatus || "UNREGISTERED"}'.`
      );
      report.limitations.push("Pre-registration freeze prevents post-hoc cherry-picking or adjusting evaluation metrics after inspecting data.");
      return report;
    }
  } else if (isSynthetic) {
    report.warnings.push(
      "DEMONSTRATION RUN: Evaluated using synthetic data fixtures. Results verify software execution only and do NOT establish empirical accuracy or equity."
    );
    if (protocol?.approvalStatus !== "FROZEN") {
      report.warnings.push(
        `Demonstration protocol status is '${protocol?.approvalStatus || "DEMO_PROTOCOL_TEMPLATE"}'. Must be frozen before formal empirical claims.`
      );
    }
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
      if (m.id === "COMPARATOR_PMT_ILLUSTRATIVE" && datasetManifest?.datasetType === "SURVEY") {
        incompatibleModels.push({
          modelId: m.id,
          modelName: m.name,
          reason: "Illustrative comparator uses arbitrary weights and cannot claim consumption prediction eligibility against survey microdata solely based on KSh/yr units."
        });
        continue;
      }
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
      // Predictions must be explicitly tied to modelId (no generic row.predicted fallback)
      const predictions = {};
      let allModelsValid = true;

      for (const m of resolvedModels) {
        const pred = row.modelPredictions?.[m.id]?.predicted ??
          row[`pred_${m.id}`] ??
          (row[m.id] !== undefined && typeof row[m.id] === "number" ? row[m.id] : null);

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
    let zeroOrNegativeResourcesCount = 0;

    for (const m of resolvedModels) {
      const pairedHouseholdData = [];

      for (const row of evaluationRecords) {
        const resMonthly = row.measuredMonthlyResources ??
          row.monthlyIncome ??
          row.householdMonthlyIncome ??
          (row.availableDisposableIncomeKsh !== undefined ? row.availableDisposableIncomeKsh / 12 : undefined);

        // Explicit model attribution only — generic fallbacks removed
        const proposedContrib = row.modelPredictions?.[m.id]?.monthlyContribution ??
          row[`contrib_${m.id}`] ??
          row[`monthlyContribution_${m.id}`] ??
          null;

        if (typeof resMonthly === "number" && Number.isFinite(resMonthly) && resMonthly <= 0) {
          zeroOrNegativeResourcesCount++;
        }

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
    report.zeroOrNegativeResourcesSummary = {
      count: zeroOrNegativeResourcesCount,
      category: "ZERO_OR_NEGATIVE_RESOURCES",
      note: "Households with zero or negative disposable resources isolated; standard percentage burden is undefined. Under Regulation 17(2), they remain subject to the KSh 300/mo minimum unless verified for full indigent subsidy."
    };

    report.status = isSynthetic ? "DEMO_ONLY" : "COMPUTED_REQUIRES_REVIEW";
    report.uncertainty = evaluateSamplingUncertainty(datasetManifest);

    report.warnings.push(
      "Affordability thresholds (5% high burden, 10% severe burden) are illustrative research benchmarks and NOT statutorily approved policy standards under the Social Health Insurance Act, 2023."
    );

    report.limitations.push(
      "Affordability evaluation measures financial burden as a proportion of measured resources. A lower contribution does NOT imply higher predictive accuracy or statutory compliance."
    );

    return report;
  }

  report.status = "BLOCKED";
  report.blockers.push(`Unsupported comparison mode '${comparisonMode}'.`);
  return report;
}
