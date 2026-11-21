/**
 * Evaluation Runner — Model Evaluation Pipeline & Reproducibility.
 *
 * Orchestrates evaluation runs between registered models, independent targets,
 * and dataset manifests.
 *
 * Enforces strict governance statuses:
 * - BLOCKED: When mandatory external dependencies (e.g. official SHA parameters) are missing.
 * - NOT_EVALUABLE: When model construct and target definition cannot be compared.
 * - DEMO_ONLY: When evaluation runs on synthetic data (NEVER produces an empirical validation claim).
 * - COMPUTED_REQUIRES_REVIEW: When independent empirical data produces evaluable metrics.
 */

import {
  validateDatasetManifest,
  validateTargetDefinition,
  validatePredictionReferenceCompatibility,
  REGISTERED_EVALUATION_DATASETS,
  REGISTERED_EVALUATION_TARGETS,
  EVALUATION_TARGET_TYPES,
  EVALUATION_DATASET_TYPES
} from "./evaluation-contracts.js";

import {
  getModelRegistryEntry,
  checkModelTargetCompatibility,
  MODEL_EVALUATION_STATUSES
} from "./evaluation-model-registry.js";

import {
  calculateContinuousMetrics,
  calculateBinaryMetrics,
  calculateSubgroupMetrics,
  evaluateSamplingUncertainty,
  calculateAffordabilityMetrics
} from "./evaluation-metrics.js";

import { evaluateEvidenceReadinessGate } from "./evidence-readiness.js";

/**
 * Executes an evaluation run.
 */
export function runEvaluation({
  modelId,
  targetId,
  datasetId,
  customRecords = null,
  subgroupField = null,
  minSubgroupSize = 5
} = {}) {
  const runId = `eval-run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  // 1. Resolve and validate Model
  const model = getModelRegistryEntry(modelId);
  if (!model) {
    return {
      runId,
      timestamp,
      status: "BLOCKED",
      reason: `Model '${modelId}' is not registered.`,
      metrics: null
    };
  }

  // 2. Resolve and validate Target
  const target = REGISTERED_EVALUATION_TARGETS[targetId];
  const targetValidation = validateTargetDefinition(target);
  if (!targetValidation.isValid) {
    return {
      runId,
      timestamp,
      status: "BLOCKED",
      reason: `Target '${targetId}' definition is invalid: ${targetValidation.errors.join("; ")}`,
      metrics: null
    };
  }

  // 3. Resolve and validate Dataset Manifest
  const dataset = REGISTERED_EVALUATION_DATASETS[datasetId];
  const datasetValidation = validateDatasetManifest(dataset);
  if (!datasetValidation.isValid) {
    return {
      runId,
      timestamp,
      status: "BLOCKED",
      reason: `Dataset '${datasetId}' manifest is invalid: ${datasetValidation.errors.join("; ")}`,
      metrics: null
    };
  }

  // 4. Check Official SHA Baseline dependency
  if (model.isOfficialShaBaseline && model.status !== "CONFIGURED") {
    return {
      runId,
      timestamp,
      status: "BLOCKED",
      modelId: model.id,
      modelVersion: model.version,
      targetId: target.id,
      datasetId: dataset.id,
      reason: "Comparative evaluation is BLOCKED: Official SHA Regulation 21 implementation and parameter weights are required.",
      missingDependencies: model.missingDependencies,
      limitations: [
        "SHA has not disclosed the production 43-variable regression model or scoring tables.",
        "No independent evaluation or claim of improvement over SHA's deployed system can be made without official parameters."
      ],
      metrics: null
    };
  }

  // 5. Check Construct Compatibility
  const compatibility = checkModelTargetCompatibility(modelId, targetId);
  if (!compatibility.canEvaluate) {
    return {
      runId,
      timestamp,
      status: "NOT_EVALUABLE",
      modelId: model.id,
      modelVersion: model.version,
      targetId: target.id,
      datasetId: dataset.id,
      reason: compatibility.reason || "Model output construct is not comparable to the selected reference target.",
      limitations: [
        `Candidate model output '${model.outputMeaning}' cannot be mapped to '${target.name}' without introducing unsupported assumptions.`
      ],
      metrics: null
    };
  }

  // 6. Dataset Availability & Records
  const records = Array.isArray(customRecords) ? customRecords : [];
  if (records.length === 0) {
    return {
      runId,
      timestamp,
      status: "NOT_EVALUABLE",
      modelId: model.id,
      modelVersion: model.version,
      targetId: target.id,
      datasetId: dataset.id,
      reason: `Dataset '${dataset.name}' contains no records for execution.`,
      metrics: null
    };
  }

  // 7. Check for self-evaluation (prevent model generating its own reference outcome)
  const isSelfEvaluated = records.some(r => r?._generatedByModel === model.id);
  if (isSelfEvaluated) {
    return {
      runId,
      timestamp,
      status: "BLOCKED",
      reason: "Methodological violation: Candidate model cannot generate the reference outcome against which it is evaluated.",
      metrics: null
    };
  }

  // 8. Execute Metrics
  let metricResults = null;
  if (target.targetType === EVALUATION_TARGET_TYPES.CONTINUOUS) {
    metricResults = calculateContinuousMetrics(records);
  } else if (target.targetType === EVALUATION_TARGET_TYPES.BINARY) {
    metricResults = calculateBinaryMetrics(records);
  }

  // 9. Execute Subgroups if requested
  let subgroupResults = null;
  if (subgroupField) {
    subgroupResults = calculateSubgroupMetrics(records, {
      groupField: subgroupField,
      minSubgroupSize,
      metricType: target.targetType
    });
  }

  // 10. Evaluate Uncertainty & Sampling Design
  const uncertainty = evaluateSamplingUncertainty(dataset);

  // 10b. Evidence Readiness Gate Assessment
  const readinessGate = evaluateEvidenceReadinessGate({
    datasetManifest: dataset,
    targetDefinition: target,
    modelRegistryEntry: model
  });

  // 11. Determine Final Status
  // CRITICAL: Synthetic data must ALWAYS produce DEMO_ONLY
  let finalStatus = "COMPUTED_REQUIRES_REVIEW";
  if (dataset.datasetType === EVALUATION_DATASET_TYPES.SYNTHETIC) {
    finalStatus = "DEMO_ONLY";
  }

  const limitations = [
    dataset.datasetType === EVALUATION_DATASET_TYPES.SYNTHETIC
      ? "DEMONSTRATION ONLY: Evaluated on synthetic data. This is a software pipeline verification and does NOT constitute empirical evidence of accuracy, equity, or policy superiority."
      : "Empirical results require peer-reviewed statistical validation and formal SHA sign-off.",
    uncertainty.confidenceIntervalsAvailable
      ? "Confidence intervals estimated using verified survey cluster/strata weights."
      : "Confidence intervals are unavailable because complex survey design strata and cluster identifiers are not present.",
    `Reference target '${target.name}' evaluates ${target.whatItCanEstablish}. ${target.whatItCannotEstablish}`
  ];

  return {
    runId,
    timestamp,
    status: finalStatus,
    model: {
      id: model.id,
      name: model.name,
      version: model.version,
      calculationType: model.calculationType,
      sourceFile: model.sourceFile,
      researchStatus: model.researchStatus
    },
    target: {
      id: target.id,
      name: target.name,
      unit: target.unit,
      targetType: target.targetType
    },
    dataset: {
      id: dataset.id,
      name: dataset.name,
      datasetType: dataset.datasetType,
      observationPeriod: dataset.observationPeriod,
      isApprovedForEmpiricalEvaluation: dataset.isApprovedForEmpiricalEvaluation
    },
    evaluationMethodology: {
      metricType: target.targetType,
      adapterFunctionUsed: compatibility.adapterFunction || "Direct Comparison",
      uncertaintyStatus: uncertainty.confidenceIntervalsAvailable ? "COMPLEX_DESIGN" : "UNAVAILABLE",
      subgroupFieldDisaggregated: subgroupField || null
    },
    results: metricResults,
    subgroups: subgroupResults,
    uncertainty,
    readinessGate: {
      status: readinessGate.readinessStatus,
      eligibleForEmpiricalEvaluation: readinessGate.eligibleForEmpiricalEvaluation,
      gateChecks: readinessGate.gateChecks,
      blockers: readinessGate.blockers,
      warnings: readinessGate.warnings
    },
    limitations
  };
}

/**
 * Builds a structured, exportable evaluation report JSON.
 * Excludes personally identifiable information.
 */
export function buildEvaluationReportJson(evaluationResult) {
  if (!evaluationResult || typeof evaluationResult !== "object") {
    throw new TypeError("Evaluation result object required to export report.");
  }

  return JSON.stringify({
    reportFormat: "SHA_MEANS_TESTING_EVALUATION_REPORT_V1",
    exportedAt: new Date().toISOString(),
    evaluationRun: evaluationResult
  }, null, 2);
}
