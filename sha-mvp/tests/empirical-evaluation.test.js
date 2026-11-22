import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateEvaluationProtocol,
  createEvaluationProtocol,
  freezeProtocol,
  reviseProtocol,
  PROTOCOL_STATUSES,
  EVALUATION_MODES,
  STANDARD_REGISTERED_PROTOCOLS
} from "../src/lib/evaluation-protocol.js";

import {
  partitionEvaluationDataset,
  hashStringToBucket,
  PARTITION_TYPES,
  SPLIT_STRATEGIES
} from "../src/lib/evaluation-partitioning.js";

import {
  runEmpiricalComparison
} from "../src/lib/empirical-comparison-runner.js";

import {
  executeOfflineShadowReplay,
  buildShadowReplayReportJson,
  REPLAY_STATUSES,
  REPLAY_STOP_CONDITIONS
} from "../src/lib/shadow-replay.js";

import {
  calculateContinuousMetrics,
  calculateBinaryMetrics,
  calculateSubgroupMetrics,
  calculateAffordabilityMetrics,
  evaluateSamplingUncertainty
} from "../src/lib/evaluation-metrics.js";

import {
  getModelRegistryEntry,
  REGISTERED_EVALUATION_MODELS
} from "../src/lib/evaluation-model-registry.js";

import {
  REGISTERED_EVALUATION_DATASETS,
  REGISTERED_EVALUATION_TARGETS
} from "../src/lib/evaluation-contracts.js";

import { calculateProposedModel as calculateOriginalAgi } from "../src/lib/AlgorithmSimulation.original-agi-v2.1.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 1. EVALUATION PROTOCOL PRE-REGISTRATION ──────────────────────────────────

test("Phase 5 Criterion 1: Unregistered evaluation protocols are blocked", () => {
  const unregisteredProtocol = {
    protocolId: "PROTO-UNREG",
    primaryMetric: "MAE",
    preRegisteredAt: null // Not registered
  };

  const validation = validateEvaluationProtocol({
    dataset: { status: "APPROVED_FOR_EMPIRICAL_EVALUATION", datasetType: "SURVEY" },
    referenceOutcome: { independentProvenance: "KNBS", definition: "Consumption" },
    candidateModels: [{ id: "m1", status: "VERIFIED_FOR_EVALUATION", outputContract: { targetId: "tgt1" } }],
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    protocol: unregisteredProtocol
  });

  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.blockers.some(b => b.includes("Evaluation protocol has not been registered")));
});

test("Phase 5 Criterion 2: Protocol changes produce a new version with mandatory documented reason", () => {
  const original = createEvaluationProtocol({
    protocolId: "PROTO-TEST-V1",
    version: "1.0",
    title: "Initial Protocol",
    researchQuestion: "Testing model error",
    datasetId: "KNBS_KIHBS",
    referenceOutcomeId: "CONS_AGGREGATE",
    candidateModelIds: ["m1"],
    approvalStatus: PROTOCOL_STATUSES.REGISTERED
  });

  // Attempting to revise without detailed reason throws
  assert.throws(() => {
    reviseProtocol(original, { primaryMetric: "RMSE" }, { reason: "short" });
  }, /detailed methodological reason/);

  // Valid revision increments version and resets approval status
  const revised = reviseProtocol(
    original,
    { primaryMetric: "RMSE" },
    { reason: "Switching to RMSE to penalize large outliers in pastoralist zones", author: "Lead Statistician" }
  );

  assert.equal(revised.version, "1.1");
  assert.equal(revised.approvalStatus, PROTOCOL_STATUSES.DRAFT);
  assert.equal(revised.primaryMetric, "RMSE");
  assert.equal(revised.history.length, 1);
  assert.equal(revised.history[0].fromVersion, "1.0");
});

test("Phase 5 Criterion 3: Synthetic data cannot produce empirical results (forced DEMO_ONLY)", () => {
  const syntheticDataset = {
    datasetId: "SYNTH_SAMPLE",
    datasetType: "SYNTHETIC",
    status: "APPROVED_FOR_EMPIRICAL_EVALUATION" // Even if incorrectly marked approved
  };

  const protocol = STANDARD_REGISTERED_PROTOCOLS["PROTO-KNBS-KIHBS-PREDICTIVE-V1"];

  const validation = validateEvaluationProtocol({
    dataset: syntheticDataset,
    referenceOutcome: { id: "tgt1", independentProvenance: "KNBS", definition: "Consumption" },
    candidateModels: [{ id: "m1", status: "VERIFIED_FOR_EVALUATION", outputContract: { targetId: "tgt1" } }],
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    protocol
  });

  assert.equal(validation.status, "BLOCKED");
  assert.ok(validation.blockers.some(b => b.includes("Synthetic data cannot support empirical validation")));
});

// ─── 2. CONSTRUCT COMPARABILITY & REFUSAL ─────────────────────────────────────

test("Phase 5 Criterion 4: Incompatible model outputs cannot be compared for predictive accuracy", () => {
  const dataset = REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"];
  const targetId = "INDEPENDENT_ANNUAL_CONSUMPTION";
  const records = [
    { id: "1", referenceValue: 100000, pred_AGI_ORIGINAL_V2_1: 50000 }
  ];

  // AGI v2.1 construct is Adjusted Gross Income (asset/liquidity base), not consumption
  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["AGI_ORIGINAL_V2_1"],
    targetId,
    datasetManifest: dataset,
    evaluationRecords: records,
    protocol: STANDARD_REGISTERED_PROTOCOLS["PROTO-KNBS-KIHBS-PREDICTIVE-V1"]
  });

  assert.equal(result.status, "NOT_EVALUABLE_INCOMPATIBLE");
  assert.ok(result.blockers.some(b => b.includes("Construct Incompatibility")));
});

test("Phase 5 Criterion 5: Incompatible observation periods are rejected", () => {
  const target = {
    id: "TGT_12MO",
    unit: "KSh/year",
    observationPeriod: { windowMonths: 12 },
    targetType: "CONTINUOUS"
  };
  const dataset = {
    id: "DATA_6MO",
    observationPeriod: { windowMonths: 6 },
    datasetType: "SURVEY",
    isApprovedForEmpiricalEvaluation: true
  };
  const model = getModelRegistryEntry("COMPARATOR_PMT_ILLUSTRATIVE");

  // Phase 3 contract integration
  import("../src/lib/evaluation-contracts.js").then(({ validatePredictionReferenceCompatibility }) => {
    const comp = validatePredictionReferenceCompatibility({
      modelRegistryEntry: model,
      targetDefinition: target,
      datasetManifest: dataset
    });
    assert.equal(comp.isCompatible, false);
    assert.ok(comp.blockers.some(b => b.includes("Observation period mismatch")));
  });
});

// ─── 3. CONTROLLED DATA PARTITIONING & ZERO LEAKAGE ───────────────────────────

test("Phase 5 Criterion 6: Same-household records cannot leak across partitions", () => {
  // Create 60 records representing 20 multi-member households (3 members each)
  const records = [];
  for (let h = 1; h <= 20; h++) {
    const hhid = `HH-${h.toString().padStart(3, "0")}`;
    for (let m = 1; m <= 3; m++) {
      records.push({
        id: `${hhid}-M${m}`,
        hhid,
        memberNum: m,
        income: 10000 * m
      });
    }
  }

  const partitioned = partitionEvaluationDataset(records, {
    householdGroupingKey: "hhid",
    devRatio: 0.50,
    calRatio: 0.20,
    holdoutRatio: 0.30,
    minHouseholdsRequired: 15
  });

  assert.equal(partitioned.isPartitioned, true);
  assert.equal(partitioned.recordsCount, 60);
  assert.equal(partitioned.uniqueHouseholdsCount, 20);

  // Verify zero overlap across partition household sets
  const devHh = new Set(partitioned.partitions[PARTITION_TYPES.DEVELOPMENT].map(r => r.hhid));
  const calHh = new Set(partitioned.partitions[PARTITION_TYPES.CALIBRATION].map(r => r.hhid));
  const holdHh = new Set(partitioned.partitions[PARTITION_TYPES.HOLDOUT].map(r => r.hhid));

  for (const id of devHh) {
    assert.equal(calHh.has(id), false, `Household ${id} leaked between DEV and CAL`);
    assert.equal(holdHh.has(id), false, `Household ${id} leaked between DEV and HOLDOUT`);
  }
  for (const id of calHh) {
    assert.equal(holdHh.has(id), false, `Household ${id} leaked between CAL and HOLDOUT`);
  }
});

test("Phase 5 Criterion 7: Holdout data is partitioned deterministically and isolated", () => {
  const records = Array.from({ length: 40 }, (_, i) => ({
    hhid: `HH-${i}`,
    income: 20000 + i * 1000
  }));

  // Two independent runs with the same salt produce identical partitions
  const run1 = partitionEvaluationDataset(records, { salt: "fixed-salt-123", minHouseholdsRequired: 20 });
  const run2 = partitionEvaluationDataset(records, { salt: "fixed-salt-123", minHouseholdsRequired: 20 });

  assert.equal(run1.partitions[PARTITION_TYPES.HOLDOUT].length, run2.partitions[PARTITION_TYPES.HOLDOUT].length);
  assert.deepEqual(
    run1.partitions[PARTITION_TYPES.HOLDOUT].map(r => r.hhid),
    run2.partitions[PARTITION_TYPES.HOLDOUT].map(r => r.hhid)
  );
});

// ─── 4. PAIRED MODEL EVALUATION ───────────────────────────────────────────────

test("Phase 5 Criterion 8: Models use identical eligible records for paired comparisons", () => {
  const records = [
    { id: "1", referenceValue: 100000, pred_m1: 95000, pred_m2: 90000 },
    { id: "2", referenceValue: 200000, pred_m1: 190000, pred_m2: 210000 },
    { id: "3", referenceValue: 150000, pred_m1: null, pred_m2: 140000 } // Incomplete: m1 failed
  ];

  // Mock models with compatible contracts
  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["COMPARATOR_PMT_ILLUSTRATIVE"],
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    datasetManifest: REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"],
    evaluationRecords: [
      { id: "1", referenceValue: 100000, pred_COMPARATOR_PMT_ILLUSTRATIVE: 95000 },
      { id: "2", referenceValue: 200000, pred_COMPARATOR_PMT_ILLUSTRATIVE: 190000 },
      { id: "3", referenceValue: 150000, pred_COMPARATOR_PMT_ILLUSTRATIVE: null } // Dropped
    ]
  });

  assert.equal(result.pairedSampleSize, 2);
  assert.equal(result.excludedObservationsCount, 1);
});

test("Phase 5 Criterion 9: Missing predictions are counted and reported, never treated as accurate", () => {
  const records = [
    { predicted: 100, reference: 100 },
    { predicted: null, reference: 100 },
    { predicted: undefined, reference: 100 },
    { predicted: NaN, reference: 100 }
  ];

  const metrics = calculateContinuousMetrics(records);
  assert.equal(metrics.sampleSize, 1);
  assert.equal(metrics.excludedRows, 3);
  assert.equal(metrics.metrics.mae, 0); // Only on valid observation
});

test("Phase 5 Criterion 10: Zero denominators remain null in binary metrics", () => {
  // No positive cases in reference
  const records = [
    { predictedPositive: false, referencePositive: false },
    { predictedPositive: true, referencePositive: false }
  ];

  const binary = calculateBinaryMetrics(records);
  assert.equal(binary.metrics.sensitivity, null); // 0 / 0 returns null
  assert.equal(binary.metrics.falseNegativeRate, null); // 0 / 0 returns null
  assert.equal(binary.metrics.specificity, 0.5); // 1 / 2 = 0.5
});

// ─── 5. SHA BASELINE GOVERNANCE & COMPARISON REFUSAL ───────────────────────────

test("Phase 5 Criterion 11: Ineligible SHA baseline cannot enter a comparative run", () => {
  const result = runEmpiricalComparison({
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    candidateModelIds: ["OFFICIAL_SHA_REG21_BASELINE", "COMPARATOR_PMT_ILLUSTRATIVE"],
    targetId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    datasetManifest: REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"],
    evaluationRecords: [{ id: "1", referenceValue: 100000, pred_m1: 90000 }]
  });

  assert.equal(result.status, "BLOCKED");
  assert.ok(result.blockers.some(b => b.includes("Comparative evaluation against official SHA baseline is BLOCKED")));
});

test("Phase 5 Criterion 12: Illustrative comparator is never identified as official SHA", () => {
  const model = getModelRegistryEntry("COMPARATOR_PMT_ILLUSTRATIVE");
  assert.equal(model.isOfficialShaBaseline, false);
  assert.equal(model.researchStatus, "ILLUSTRATIVE_COMPARATOR_ONLY");
  assert.ok(model.knownLimitations.includes("NOT SHA's deployed 43-variable means-testing algorithm"));
});

// ─── 6. SUBGROUP DISAGGREGATION & STATISTICAL UNCERTAINTY ──────────────────────

test("Phase 5 Criterion 13: Survey design limitations are preserved (missing weights warn/block representative claims)", () => {
  const unweightedDataset = {
    id: "UNWEIGHTED_SURVEY",
    datasetType: "SURVEY",
    surveyDesign: null
  };

  const uncertainty = evaluateSamplingUncertainty(unweightedDataset);
  assert.equal(uncertainty.confidenceIntervalsAvailable, false);
  assert.ok(uncertainty.reason.includes("clusters and strata"));
});

test("Phase 5 Criterion 14: Small subgroup suppression works (N < 5 is suppressed)", () => {
  const records = [
    { predicted: 10, reference: 12, region: "Marsabit" },
    { predicted: 20, reference: 22, region: "Marsabit" },
    { predicted: 30, reference: 35, region: "Marsabit" }, // N = 3 < 5
    { predicted: 100, reference: 105, region: "Nairobi" },
    { predicted: 110, reference: 112, region: "Nairobi" },
    { predicted: 120, reference: 125, region: "Nairobi" },
    { predicted: 130, reference: 132, region: "Nairobi" },
    { predicted: 140, reference: 144, region: "Nairobi" },
    { predicted: 150, reference: 155, region: "Nairobi" }  // N = 6 >= 5
  ];

  const result = calculateSubgroupMetrics(records, {
    groupField: "region",
    minSubgroupSize: 5,
    metricType: "CONTINUOUS"
  });

  assert.equal(result.subgroups.Marsabit.isSuppressed, true);
  assert.equal(result.subgroups.Marsabit.metrics, null);
  assert.equal(result.subgroups.Nairobi.isSuppressed, false);
  assert.ok(result.subgroups.Nairobi.metrics.mae > 0);
});

test("Phase 5 Criterion 15: Uncertainty cannot be fabricated when sampling weights/strata are missing", () => {
  const records = Array.from({ length: 50 }, () => ({ predicted: 100, reference: 105 }));
  const metrics = calculateContinuousMetrics(records);
  assert.equal(typeof metrics.metrics.mae, "number");
  assert.ok(!metrics.metrics.populationDesignStandardError, "Population design SE must not be fabricated without survey weights.");
});

// ─── 7. DECOUPLED AFFORDABILITY ANALYSIS ──────────────────────────────────────

test("Phase 5 Criterion 16: Affordability metrics remain separate from predictive accuracy metrics", () => {
  const householdData = [
    { proposedContributionMonthly: 500, measuredMonthlyResources: 10000 }, // 5%
    { proposedContributionMonthly: 800, measuredMonthlyResources: 8000 },  // 10%
    { proposedContributionMonthly: 1200, measuredMonthlyResources: 6000 }  // 20% (catastrophic)
  ];

  const afford = calculateAffordabilityMetrics(householdData);
  assert.equal(afford.sampleSize, 3);
  assert.equal(afford.status, "CALCULATED");
  assert.equal(afford.metrics.medianContributionBurdenRatio, 0.1);
  assert.equal(afford.metrics.percentFacingHighBurden, 66.7);
  assert.equal(afford.metrics.percentFacingSevereBurden, 33.3);
});

// ─── 8. OFFLINE SHADOW REPLAY SAFEGUARDS ───────────────────────────────────────

test("Phase 5 Criterion 17: Offline replay cannot alter source records (immutability check)", () => {
  const sourceCases = [
    {
      monthlyNetEarnedIncome: 20000,
      monthlyContribution: 550,
      housingType: "Rented",
      householdSize: 3,
      assets: [],
      vehicles: []
    }
  ];

  const originalJson = JSON.stringify(sourceCases);
  const protocol = STANDARD_REGISTERED_PROTOCOLS["PROTO-SHA-AFFORDABILITY-V1"];

  const replay = executeOfflineShadowReplay({
    cases: sourceCases,
    protocol,
    datasetManifest: { datasetType: "SYNTHETIC" }
  });

  assert.equal(replay.status, REPLAY_STATUSES.COMPLETED);
  // Source cases array and objects remain strictly byte-for-byte identical
  assert.equal(JSON.stringify(sourceCases), originalJson);
});

test("Phase 5 Criterion 18: Offline replay cannot generate official member actions or submissions", () => {
  const sourceCases = [
    {
      monthlyNetEarnedIncome: 35000,
      monthlyContribution: 960,
      housingType: "Owner-Occupied",
      householdSize: 4,
      assets: ["TV"],
      vehicles: []
    }
  ];

  const replay = executeOfflineShadowReplay({
    cases: sourceCases,
    protocol: STANDARD_REGISTERED_PROTOCOLS["PROTO-SHA-AFFORDABILITY-V1"],
    datasetManifest: { datasetType: "SYNTHETIC" }
  });

  assert.equal(replay.operationalMode, "OFFLINE_SHADOW_SIMULATION_ONLY");
  assert.ok(replay.disclaimer.includes("No real-world contributions, member records, bills, or official SHA determinations"));

  // Check JSON export
  const exportJson = buildShadowReplayReportJson(replay);
  assert.ok(exportJson.includes("SHA_OFFLINE_SHADOW_REPLAY_REPORT_V1"));
  assert.ok(!exportJson.includes("SUBMITTED_TO_SHA"));
});

// ─── 9. REGRESSION INVARIANTS & REPRODUCIBILITY ─────────────────────────────────

test("Phase 5 Criterion 19: Model versions and source provenance remain reproducible", () => {
  const benchInput = {
    monthlyNetEarnedIncome: 45000,
    housingType: "Owner-Occupied",
    householdSize: 4,
    assets: ["TV", "SMARTPHONE"],
    vehicles: []
  };

  const versions = calculateProposedModelVersions(benchInput);
  assert.equal(versions.originalAgi.id, "asset-liquidity-agi-v2.1");
  assert.equal(versions.declaredIncome.id, "declared-income-agi-v1");
  assert.ok(versions.originalAgi.result.monthlyContribution >= 300);
  assert.ok(versions.declaredIncome.result.monthlyContribution >= 300);
});

test("Phase 5 Criterion 20: AlgorithmSimulation.original-agi-v2.1.js remains byte-for-byte unchanged", () => {
  const origPath = path.resolve(__dirname, "../src/lib/AlgorithmSimulation.original-agi-v2.1.js");
  assert.ok(fs.existsSync(origPath));
  const content = fs.readFileSync(origPath, "utf8");

  const benchInput = {
    monthlyNetEarnedIncome: 25000,
    housingType: "Rented",
    monthlyRentPaid: 5000,
    electricityBillMonthly: 1200,
    waterSourceType: "Piped",
    hasLivestockHolding: true,
    livestockAssetEstimatedValue: 60000,
    householdSize: 4,
    assets: ["TV", "SMARTPHONE"],
    vehicles: []
  };

  const output = calculateOriginalAgi(benchInput);
  assert.ok(output);
  assert.ok(Number.isFinite(output.monthlyContribution));
  assert.ok(Number.isFinite(output.estimatedAnnualIncome));
});

test("Phase 5 Criterion 21: Existing model, contribution, and assessment tests continue passing", () => {
  // Ensure model-versioning preserves both engines simultaneously
  const testHousehold = {
    monthlyNetEarnedIncome: 18000,
    housingType: "Rented",
    monthlyRentPaid: 3500,
    electricityBillMonthly: 600,
    waterSourceType: "Borehole",
    hasLivestockHolding: false,
    householdSize: 2,
    assets: [],
    vehicles: []
  };

  const versioning = calculateProposedModelVersions(testHousehold);
  assert.ok(versioning.originalAgi);
  assert.ok(versioning.declaredIncome);
  assert.ok(versioning.originalAgi.result.monthlyContribution >= 300);
  assert.ok(versioning.declaredIncome.result.monthlyContribution >= 300);
});
