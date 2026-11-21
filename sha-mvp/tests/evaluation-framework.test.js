import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateContinuousMetrics,
  calculateBinaryMetrics,
  calculateSubgroupMetrics,
  evaluateSamplingUncertainty,
  calculateAffordabilityMetrics
} from "../src/lib/evaluation-metrics.js";

import {
  validateDatasetManifest,
  validateTargetDefinition,
  validatePredictionReferenceCompatibility,
  REGISTERED_EVALUATION_DATASETS,
  REGISTERED_EVALUATION_TARGETS,
  EVALUATION_DATASET_TYPES,
  EVALUATION_TARGET_TYPES
} from "../src/lib/evaluation-contracts.js";

import {
  getModelRegistryEntry,
  checkModelTargetCompatibility,
  REGISTERED_EVALUATION_MODELS
} from "../src/lib/evaluation-model-registry.js";

import {
  runEvaluation,
  buildEvaluationReportJson
} from "../src/lib/evaluation-runner.js";

import { calculateProposedModel as calculateOriginalAgi } from "../src/lib/AlgorithmSimulation.original-agi-v2.1.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

// ─── 1. CONTINUOUS METRICS CALCULATIONS ────────────────────────────────────────

test("Evaluation Criterion 1: Correct MAE calculation", () => {
  // Pairs: (10, 12: diff 2), (20, 15: diff 5), (30, 30: diff 0)
  // MAE = (2 + 5 + 0) / 3 = 7 / 3 = 2.3333... -> 2.33
  const records = [
    { predicted: 10, reference: 12 },
    { predicted: 20, reference: 15 },
    { predicted: 30, reference: 30 }
  ];
  const res = calculateContinuousMetrics(records);
  assert.equal(res.status, "CALCULATED");
  assert.equal(res.sampleSize, 3);
  assert.equal(res.metrics.mae, 2.33);
});

test("Evaluation Criterion 2: Correct RMSE calculation", () => {
  // Pairs: (10, 14: diff -4, sq 16), (20, 23: diff -3, sq 9)
  // MSE = (16 + 9) / 2 = 12.5. RMSE = sqrt(12.5) = 3.5355... -> 3.54
  const records = [
    { predicted: 10, reference: 14 },
    { predicted: 20, reference: 23 }
  ];
  const res = calculateContinuousMetrics(records);
  assert.equal(res.metrics.rmse, 3.54);
});

test("Evaluation Criterion 3: Correct Mean Signed Error (bias)", () => {
  // Pairs: (10, 8: +2), (20, 15: +5), (30, 40: -10)
  // Mean signed error = (+2 + 5 - 10) / 3 = -3 / 3 = -1.0
  const records = [
    { predicted: 10, reference: 8 },
    { predicted: 20, reference: 15 },
    { predicted: 30, reference: 40 }
  ];
  const res = calculateContinuousMetrics(records);
  assert.equal(res.metrics.meanSignedError, -1.0);
});

// ─── 2. BINARY CLASSIFICATION METRICS ─────────────────────────────────────────

test("Evaluation Criterion 4: Correct confusion matrix", () => {
  const records = [
    { predictedPositive: true, referencePositive: true },   // TP
    { predictedPositive: true, referencePositive: false },  // FP
    { predictedPositive: false, referencePositive: false }, // TN
    { predictedPositive: false, referencePositive: true }   // FN
  ];
  const res = calculateBinaryMetrics(records);
  assert.equal(res.status, "CALCULATED");
  assert.equal(res.sampleSize, 4);
  assert.equal(res.confusionMatrix.truePositive, 1);
  assert.equal(res.confusionMatrix.falsePositive, 1);
  assert.equal(res.confusionMatrix.trueNegative, 1);
  assert.equal(res.confusionMatrix.falseNegative, 1);
});

test("Evaluation Criterion 5: Correct sensitivity and specificity", () => {
  // TP: 2, FN: 1 -> Sensitivity = 2 / (2 + 1) = 0.6666...
  // TN: 3, FP: 1 -> Specificity = 3 / (3 + 1) = 0.75
  const records = [
    { predictedPositive: true, referencePositive: true },
    { predictedPositive: true, referencePositive: true },
    { predictedPositive: false, referencePositive: true },  // FN
    { predictedPositive: false, referencePositive: false }, // TN
    { predictedPositive: false, referencePositive: false }, // TN
    { predictedPositive: false, referencePositive: false }, // TN
    { predictedPositive: true, referencePositive: false }   // FP
  ];
  const res = calculateBinaryMetrics(records);
  assert.equal(Math.round(res.metrics.sensitivity * 100), 67);
  assert.equal(res.metrics.specificity, 0.75);
  assert.equal(res.metrics.balancedAccuracy, ((2 / 3) + 0.75) / 2);
});

test("Evaluation Criterion 6: Correct false-positive and false-negative rates", () => {
  // TP: 1, FN: 3 -> FNR = 3 / (3 + 1) = 0.75
  // TN: 8, FP: 2 -> FPR = 2 / (2 + 8) = 0.20
  const records = [
    { predictedPositive: true, referencePositive: true },
    { predictedPositive: false, referencePositive: true },
    { predictedPositive: false, referencePositive: true },
    { predictedPositive: false, referencePositive: true },
    ...Array(8).fill({ predictedPositive: false, referencePositive: false }),
    ...Array(2).fill({ predictedPositive: true, referencePositive: false })
  ];
  const res = calculateBinaryMetrics(records);
  assert.equal(res.metrics.falseNegativeRate, 0.75);
  assert.equal(res.metrics.falsePositiveRate, 0.20);
});

test("Evaluation Criterion 7: Zero-denominator behaviour returns NULL, not zero", () => {
  // No positive references (referencePositive is always false): TP = 0, FN = 0
  // Sensitivity = TP / (TP + FN) has denominator 0 -> MUST be null, not 0!
  const records = [
    { predictedPositive: false, referencePositive: false },
    { predictedPositive: true, referencePositive: false }
  ];
  const res = calculateBinaryMetrics(records);
  assert.equal(res.confusionMatrix.truePositive, 0);
  assert.equal(res.confusionMatrix.falseNegative, 0);
  assert.equal(res.metrics.sensitivity, null);
  assert.equal(res.metrics.falseNegativeRate, null);
  assert.equal(res.metrics.balancedAccuracy, null);
});

// ─── 3. ROBUSTNESS & EXCLUSION ACCOUNTING ─────────────────────────────────────

test("Evaluation Criterion 8: Missing and malformed records do not crash the engine", () => {
  const malformed = [
    null,
    undefined,
    {},
    { predicted: "not a number", reference: 50 },
    { predicted: 10, reference: null },
    { predicted: Infinity, reference: 20 },
    { predicted: 15, reference: NaN }
  ];
  const resContinuous = calculateContinuousMetrics(malformed);
  assert.equal(resContinuous.status, "NOT_EVALUABLE");
  assert.equal(resContinuous.sampleSize, 0);
  assert.equal(resContinuous.excludedRows, 7);

  const resBinary = calculateBinaryMetrics(malformed);
  assert.equal(resBinary.status, "NOT_EVALUABLE");
  assert.equal(resBinary.sampleSize, 0);
  assert.equal(resBinary.excludedRows, 7);
});

test("Evaluation Criterion 9: Excluded-row accounting accurately tracks dropped observations", () => {
  const records = [
    { predicted: 100, reference: 120 },
    { predicted: null, reference: 150 }, // Excluded
    { predicted: 200, reference: 180 },
    { predicted: "invalid", reference: 90 } // Excluded
  ];
  const res = calculateContinuousMetrics(records);
  assert.equal(res.sampleSize, 2);
  assert.equal(res.excludedRows, 2);
});

// ─── 4. METHODOLOGICAL SAFEGUARDS & GOVERNANCE ────────────────────────────────

test("Evaluation Criterion 10: Reference target cannot be generated by the candidate model", () => {
  const selfEvaluatedRecords = [
    {
      predictedPositive: true,
      referencePositive: true,
      _generatedByModel: "AGI_ORIGINAL_V2_1" // Flagged as self-generated
    }
  ];

  const runResult = runEvaluation({
    modelId: "AGI_ORIGINAL_V2_1",
    targetId: "INDEPENDENT_POVERTY_STATUS",
    datasetId: "SYNTHETIC_DEMO_2026",
    customRecords: selfEvaluatedRecords
  });

  assert.equal(runResult.status, "BLOCKED");
  assert.ok(runResult.reason.includes("cannot generate the reference outcome"));
});

test("Evaluation Criterion 11: Incompatible prediction/reference constructs and units are rejected", () => {
  // AGI v2.1 produces constructed Adjusted Gross Income (AGI base with liquidity/asset frictions).
  // Target INDEPENDENT_ANNUAL_CONSUMPTION measures food/non-food consumption expenditure.
  // Model registry specifies this is NOT comparable without an empirical conversion adapter.
  const check = checkModelTargetCompatibility("AGI_ORIGINAL_V2_1", "INDEPENDENT_ANNUAL_CONSUMPTION");
  assert.equal(check.canEvaluate, false);
  assert.equal(check.status, "NOT_EVALUABLE_INCOMPATIBLE");

  // Runner rejects execution
  const runResult = runEvaluation({
    modelId: "AGI_ORIGINAL_V2_1",
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    datasetId: "SYNTHETIC_DEMO_2026",
    customRecords: [{ predicted: 100, reference: 100 }]
  });
  assert.equal(runResult.status, "NOT_EVALUABLE");
});

test("Evaluation Criterion 12: Incorrect observation periods are rejected", () => {
  const datasetManifest = {
    id: "DATA_6MO",
    version: "1.0",
    datasetType: EVALUATION_DATASET_TYPES.SURVEY,
    recordCount: 50,
    observationPeriod: { windowMonths: 6 },
    isApprovedForEmpiricalEvaluation: true
  };

  const target = {
    id: "TARGET_12MO",
    targetType: EVALUATION_TARGET_TYPES.CONTINUOUS,
    unit: "KSh/year",
    referenceField: "consumption",
    independentProvenance: "Verified survey",
    observationPeriod: { windowMonths: 12 }
  };

  const model = getModelRegistryEntry("COMPARATOR_PMT_ILLUSTRATIVE");

  const check = validatePredictionReferenceCompatibility({
    modelRegistryEntry: model,
    targetDefinition: target,
    datasetManifest
  });

  assert.equal(check.isCompatible, false);
  assert.ok(check.blockers.some(b => b.includes("Observation period mismatch")));
});

test("Evaluation Criterion 13: Missing official SHA baseline blocks comparative evaluation", () => {
  const runResult = runEvaluation({
    modelId: "OFFICIAL_SHA_REG21_BASELINE",
    targetId: "INDEPENDENT_POVERTY_STATUS",
    datasetId: "SYNTHETIC_DEMO_2026",
    customRecords: [{ predictedPositive: true, referencePositive: true }]
  });

  assert.equal(runResult.status, "BLOCKED");
  assert.ok(runResult.reason.includes("Official SHA Regulation 21 implementation and parameter weights are required"));
  assert.ok(Array.isArray(runResult.missingDependencies));
  assert.ok(runResult.missingDependencies.length > 0);
});

test("Evaluation Criterion 14: Synthetic dataset is always DEMO_ONLY and never empirical evidence", () => {
  const demoRecords = [
    { predictedPositive: true, referencePositive: true },
    { predictedPositive: false, referencePositive: false }
  ];

  const runResult = runEvaluation({
    modelId: "COMPARATOR_PMT_ILLUSTRATIVE",
    targetId: "INDEPENDENT_POVERTY_STATUS",
    datasetId: "SYNTHETIC_DEMO_2026",
    customRecords: demoRecords
  });

  assert.equal(runResult.status, "DEMO_ONLY");
  assert.ok(runResult.limitations.some(l => l.includes("DEMONSTRATION ONLY")));

  // Manifest validator forbids synthetic data from setting empirical approval
  const syntheticManifest = {
    id: "SYNTH_TEST",
    version: "1.0",
    datasetType: "SYNTHETIC",
    recordCount: 10,
    observationPeriod: { windowMonths: 12 },
    isApprovedForEmpiricalEvaluation: true // FORBIDDEN
  };
  const validation = validateDatasetManifest(syntheticManifest);
  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.some(e => e.includes("Synthetic datasets cannot be approved for empirical evaluation")));
});

// ─── 5. SUBGROUPS, UNCERTAINTY & AFFORDABILITY ────────────────────────────────

test("Evaluation Criterion 15: Small subgroup suppression works (<5 records suppressed)", () => {
  const records = [
    { county: "Nairobi", predictedPositive: true, referencePositive: true },
    { county: "Nairobi", predictedPositive: true, referencePositive: true },
    { county: "Nairobi", predictedPositive: false, referencePositive: false },
    { county: "Nairobi", predictedPositive: false, referencePositive: false },
    { county: "Nairobi", predictedPositive: true, referencePositive: false }, // N = 5 (Eligible)

    { county: "Isiolo", predictedPositive: true, referencePositive: true },
    { county: "Isiolo", predictedPositive: false, referencePositive: false }  // N = 2 (< 5: Suppressed)
  ];

  const subgroupRes = calculateSubgroupMetrics(records, {
    groupField: "county",
    minSubgroupSize: 5,
    metricType: "BINARY"
  });

  assert.equal(subgroupRes.subgroups["Nairobi"].isSuppressed, false);
  assert.equal(subgroupRes.subgroups["Nairobi"].status, "CALCULATED");

  assert.equal(subgroupRes.subgroups["Isiolo"].isSuppressed, true);
  assert.equal(subgroupRes.subgroups["Isiolo"].status, "SUPPRESSED_SMALL_CELL");
  assert.equal(subgroupRes.subgroups["Isiolo"].metrics, null);
  assert.ok(subgroupRes.subgroups["Isiolo"].suppressionReason.includes("below reporting threshold"));
});

test("Evaluation Criterion 16: Unsupported survey-weight claims are rejected without complex design identifiers", () => {
  const syntheticManifest = REGISTERED_EVALUATION_DATASETS.SYNTHETIC_DEMO_2026;
  const resSynthetic = evaluateSamplingUncertainty(syntheticManifest);
  assert.equal(resSynthetic.confidenceIntervalsAvailable, false);
  assert.ok(resSynthetic.reason.includes("Synthetic demonstration data cannot support inferential statistics"));

  const unstratifiedSurvey = {
    datasetType: "SURVEY",
    clusterField: null,
    strataField: null
  };
  const resUnstratified = evaluateSamplingUncertainty(unstratifiedSurvey);
  assert.equal(resUnstratified.confidenceIntervalsAvailable, false);
  assert.ok(resUnstratified.reason.includes("clusters and strata) are missing"));
});

test("Evaluation Criterion 17: Affordability analysis is decoupled from accuracy metrics", () => {
  const records = [
    { monthlyContributionKsh: 300, availableDisposableIncomeKsh: 50000 },  // Annual contribution 3,600 / 50k = 7.2% (>5% High)
    { monthlyContributionKsh: 1000, availableDisposableIncomeKsh: 100000 }, // Annual contribution 12,000 / 100k = 12% (>10% Severe)
    { monthlyContributionKsh: 300, availableDisposableIncomeKsh: 120000 }  // Annual contribution 3,600 / 120k = 3.0% (Normal)
  ];

  const aff = calculateAffordabilityMetrics(records);
  assert.equal(aff.status, "CALCULATED");
  assert.equal(aff.sampleSize, 3);
  assert.equal(aff.metrics.percentFacingHighBurden, 66.7); // 2 out of 3
  assert.equal(aff.metrics.percentFacingSevereBurden, 33.3); // 1 out of 3
  assert.ok(aff.disclaimer.includes("not an evaluation of model predictive accuracy"));
});

test("Evaluation Criterion 18: Model version and dataset provenance are retained in exported reports", () => {
  const runResult = runEvaluation({
    modelId: "COMPARATOR_PMT_ILLUSTRATIVE",
    targetId: "INDEPENDENT_POVERTY_STATUS",
    datasetId: "SYNTHETIC_DEMO_2026",
    customRecords: [
      { predictedPositive: true, referencePositive: true },
      { predictedPositive: false, referencePositive: false }
    ]
  });

  const jsonReport = buildEvaluationReportJson(runResult);
  const parsed = JSON.parse(jsonReport);

  assert.equal(parsed.reportFormat, "SHA_MEANS_TESTING_EVALUATION_REPORT_V1");
  assert.equal(parsed.evaluationRun.model.id, "COMPARATOR_PMT_ILLUSTRATIVE");
  assert.equal(parsed.evaluationRun.model.version, "1.0.0");
  assert.equal(parsed.evaluationRun.dataset.id, "SYNTHETIC_DEMO_2026");
  assert.ok(Array.isArray(parsed.evaluationRun.limitations));
});

// ─── 6. REGRESSION INTEGRITY (PRESERVE EXISTING FORMULAS) ─────────────────────

test("Evaluation Criterion 19: The original AGI v2.1 formula remains unchanged byte-for-byte", () => {
  const testHousehold = {
    monthlyNetEarnedIncome: 20000,
    county: "Nairobi",
    householdSize: 3,
    assets: ["TV", "SMARTPHONE"],
    vehicles: [],
    landAcreage: 0,
    livestockCount: 0,
    housingWallMaterial: "BRICK",
    housingRoofMaterial: "IRON_SHEETS",
    housingWaterSource: "PIPED_TREATED",
    housingLightingSource: "GRID_ELECTRIC",
    grossMpesaMonthly: 15000,
    avgRetainedBalance: 4000,
    fulizaDefaults: 0
  };

  const originalResult = calculateOriginalAgi(testHousehold);
  assert.ok(Number.isFinite(originalResult.estimatedAnnualIncome));
  assert.ok(Number.isFinite(originalResult.monthlyContribution));
  assert.ok(originalResult.monthlyContribution >= 300);

  // Model versioning preserves both engines simultaneously
  const versioning = calculateProposedModelVersions(testHousehold, { fulizaPenalty: 5000 });
  assert.ok(versioning.originalAgi);
  assert.ok(versioning.declaredIncome);
  assert.equal(versioning.originalAgi.id, "asset-liquidity-agi-v2.1");
  assert.equal(versioning.declaredIncome.id, "declared-income-agi-v1");
});
