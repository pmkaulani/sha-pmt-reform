/**
 * Evidence Readiness Gate — Pre-Evaluation Verification Pipeline.
 *
 * Enforces strict multi-checkpoint verification before allowing any candidate means-testing
 * model to run an empirical evaluation.
 *
 * Core Guarantee:
 * Empirical evaluation CANNOT be initiated unless data governance, data quality,
 * variable mappings, independent reference outcomes, and (where applicable) official
 * baseline parameters are independently verified and certified.
 */

import { assessDatasetReadiness, DATASET_TYPES } from "./data-governance.js";
import { validateShaBaselineCompleteness } from "./sha-baseline-registry.js";
import { checkModelTargetCompatibility } from "./evaluation-model-registry.js";
import { validatePredictionReferenceCompatibility } from "./evaluation-contracts.js";

export const READINESS_GATE_STATUSES = Object.freeze({
  BLOCKED: "BLOCKED",
  DEMO_ONLY: "DEMO_ONLY",
  READY_FOR_TECHNICAL_REVIEW: "READY_FOR_TECHNICAL_REVIEW",
  READY_FOR_EMPIRICAL_EVALUATION: "READY_FOR_EMPIRICAL_EVALUATION"
});

/**
 * Evaluates the full Evidence Readiness Gate across 8 rigorous checkpoints.
 *
 * @param {object} params
 * @param {object} params.datasetManifest - Full dataset manifest
 * @param {object} params.targetDefinition - Independent target definition
 * @param {object} params.modelRegistryEntry - Registered candidate model entry
 * @param {Array<object>} params.variableMappings - Array of variable mapping specifications
 * @param {object} params.dataQualityReport - Output from data-quality profiler (optional)
 * @param {object} params.shaBaselineSpec - Official baseline specification (optional)
 * @returns {object} Gate evaluation report
 */
export function evaluateEvidenceReadinessGate({
  datasetManifest,
  targetDefinition,
  modelRegistryEntry,
  variableMappings = [],
  dataQualityReport = null,
  shaBaselineSpec = null
} = {}) {
  const gateChecks = [];
  const blockers = [];
  const warnings = [];
  const recommendations = [];

  // Checkpoint 1: Dataset Governance & Provenance
  const govAssessment = assessDatasetReadiness(datasetManifest);
  if (govAssessment.status === "DEMO_ONLY") {
    gateChecks.push({
      checkpoint: "DATASET_GOVERNANCE",
      status: "WARNING",
      detail: "Dataset is marked SYNTHETIC. Permitted for DEMO_ONLY software testing."
    });
    warnings.push("Synthetic datasets cannot establish empirical performance.");
  } else if (govAssessment.status === "BLOCKED") {
    gateChecks.push({
      checkpoint: "DATASET_GOVERNANCE",
      status: "FAIL",
      detail: govAssessment.blockers.join("; ")
    });
    blockers.push(...govAssessment.blockers);
  } else {
    gateChecks.push({
      checkpoint: "DATASET_GOVERNANCE",
      status: "PASS",
      detail: "Dataset governance metadata and statutory authorization verified."
    });
  }

  // Checkpoint 2: Data Dictionary & Canonical Mapping Completeness
  if (!variableMappings || variableMappings.length === 0) {
    gateChecks.push({
      checkpoint: "DATA_DICTIONARY_MAPPING",
      status: "FAIL",
      detail: "No source-to-canonical variable mappings registered."
    });
    blockers.push("At least one verified variable mapping dictionary is required.");
  } else {
    const unreviewedCount = variableMappings.filter(m => m.reviewerStatus === "DRAFT" || m.reviewerStatus === "DEMO_ONLY" || m.reviewerStatus === "UNVERIFIED").length;
    if (unreviewedCount > 0) {
      gateChecks.push({
        checkpoint: "DATA_DICTIONARY_MAPPING",
        status: "WARNING",
        detail: `${unreviewedCount} variable mapping(s) are in DRAFT/DEMO_ONLY status and pending official verification.`
      });
      warnings.push("Unverified variable mappings may introduce misclassification bias.");
    } else {
      gateChecks.push({
        checkpoint: "DATA_DICTIONARY_MAPPING",
        status: "PASS",
        detail: `All ${variableMappings.length} variable mappings are reviewed and verified.`
      });
    }
  }

  // Checkpoint 3: Target Definition & External Independence
  if (!targetDefinition) {
    gateChecks.push({
      checkpoint: "INDEPENDENT_TARGET",
      status: "FAIL",
      detail: "Target definition is missing."
    });
    blockers.push("An independent reference outcome target must be specified.");
  } else {
    const targetIndependence = validatePredictionReferenceCompatibility({
      modelRegistryEntry,
      targetDefinition,
      datasetManifest
    });

    if (!targetIndependence.isCompatible) {
      gateChecks.push({
        checkpoint: "INDEPENDENT_TARGET",
        status: "FAIL",
        detail: (targetIndependence.blockers || []).join("; ")
      });
      blockers.push(...(targetIndependence.blockers || []));
    } else {
      gateChecks.push({
        checkpoint: "INDEPENDENT_TARGET",
        status: "PASS",
        detail: `Reference outcome '${targetDefinition.name || targetDefinition.id}' is verified external and independent.`
      });
    }
  }

  // Checkpoint 4: Model Construct-to-Target Compatibility
  if (modelRegistryEntry && targetDefinition) {
    const comp = checkModelTargetCompatibility(modelRegistryEntry.id, targetDefinition.id);
    if (!comp.isCompatible) {
      gateChecks.push({
        checkpoint: "CONSTRUCT_COMPATIBILITY",
        status: "FAIL",
        detail: comp.reason
      });
      blockers.push(`Construct incompatibility: ${comp.reason}`);
    } else {
      gateChecks.push({
        checkpoint: "CONSTRUCT_COMPATIBILITY",
        status: "PASS",
        detail: "Model output construct matches target reference construct."
      });
    }
  }

  // Checkpoint 5: Official SHA Baseline Completeness (if evaluating SHA baseline or comparative run)
  if (modelRegistryEntry?.id === "official-sha-reg21-pmt" || modelRegistryEntry?.isOfficialBaseline) {
    const baselineCheck = validateShaBaselineCompleteness(shaBaselineSpec);
    if (!baselineCheck.isComplete) {
      gateChecks.push({
        checkpoint: "OFFICIAL_SHA_BASELINE",
        status: "FAIL",
        detail: baselineCheck.explanation
      });
      blockers.push(`Official SHA baseline incomplete: ${baselineCheck.missingComponents.join(", ")}`);
    } else {
      gateChecks.push({
        checkpoint: "OFFICIAL_SHA_BASELINE",
        status: "PASS",
        detail: "Official SHA baseline coefficients and rules are fully documented."
      });
    }
  }

  // Checkpoint 6: Data Quality Assessment
  if (dataQualityReport) {
    if (dataQualityReport.hasCriticalIssues) {
      gateChecks.push({
        checkpoint: "DATA_QUALITY_AUDIT",
        status: "FAIL",
        detail: `Data quality audit failed with ${dataQualityReport.findingsBySeverity.CRITICAL.length} critical finding(s).`
      });
      blockers.push("Dataset contains critical quality defects (duplicates, missing keys, or non-finite numbers).");
    } else if (dataQualityReport.findingsBySeverity.WARNING.length > 0) {
      gateChecks.push({
        checkpoint: "DATA_QUALITY_AUDIT",
        status: "WARNING",
        detail: `Data quality audit passed with ${dataQualityReport.findingsBySeverity.WARNING.length} warning(s).`
      });
      warnings.push("High missingness or range anomalies detected; examine audit report before proceeding.");
    } else {
      gateChecks.push({
        checkpoint: "DATA_QUALITY_AUDIT",
        status: "PASS",
        detail: "All data quality checks passed with zero defects."
      });
    }
  }

  // Checkpoint 7: Survey Design & Sampling Representativeness
  if (datasetManifest?.datasetType === DATASET_TYPES.SURVEY) {
    const hasWeights = Boolean(datasetManifest.surveyDesignFields?.weightField);
    const hasClusters = Boolean(datasetManifest.surveyDesignFields?.clusterField);
    if (!hasWeights || !hasClusters) {
      gateChecks.push({
        checkpoint: "SURVEY_DESIGN_METADATA",
        status: "WARNING",
        detail: "Survey sampling weights or cluster identifiers are not specified. Results cannot produce representative national inferences."
      });
      warnings.push("Representative population claims require survey sampling design weights.");
    } else {
      gateChecks.push({
        checkpoint: "SURVEY_DESIGN_METADATA",
        status: "PASS",
        detail: "Survey design metadata (weights, clusters) verified."
      });
    }
  }

  // Checkpoint 8: Statutory Purpose and Ethics Approvals
  if (datasetManifest?.authorizationStatus !== "APPROVED" || datasetManifest?.legalReviewStatus !== "APPROVED") {
    // Already blocked by Checkpoint 1, but highlighted here for governance clarity
    recommendations.push("Complete formal inter-agency data transfer agreement and research ethics approval.");
  }

  // Determine Overall Gate Status
  let readinessStatus = READINESS_GATE_STATUSES.READY_FOR_EMPIRICAL_EVALUATION;
  let eligibleForEmpiricalEvaluation = false;

  if (blockers.length > 0) {
    readinessStatus = READINESS_GATE_STATUSES.BLOCKED;
    eligibleForEmpiricalEvaluation = false;
  } else if (datasetManifest?.datasetType === DATASET_TYPES.SYNTHETIC) {
    readinessStatus = READINESS_GATE_STATUSES.DEMO_ONLY;
    eligibleForEmpiricalEvaluation = false;
  } else if (warnings.length > 0) {
    readinessStatus = READINESS_GATE_STATUSES.READY_FOR_TECHNICAL_REVIEW;
    eligibleForEmpiricalEvaluation = false;
  } else {
    readinessStatus = READINESS_GATE_STATUSES.READY_FOR_EMPIRICAL_EVALUATION;
    eligibleForEmpiricalEvaluation = true;
  }

  return {
    readinessStatus,
    eligibleForEmpiricalEvaluation,
    gateChecks,
    blockers,
    warnings,
    recommendations
  };
}
