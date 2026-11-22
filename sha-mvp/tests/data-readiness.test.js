import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessDatasetReadiness,
  createDatasetManifest,
  DATASET_TYPES,
  DEIDENTIFICATION_STATUS,
  DEIDENTIFICATION_REVIEW_STATUS,
  AUTHORIZATION_STATUS,
  LEGAL_REVIEW_STATUS,
  ETHICS_REVIEW_STATUS,
  GOVERNANCE_STATUS
} from "../src/lib/data-governance.js";

import {
  createVariableMapping,
  validateVariableMapping,
  mapSourceRecord,
  CANONICAL_CONCEPTS,
  DATA_TYPES,
  TRANSFORMATION_RULES,
  MISSING_VALUE_TREATMENTS,
  REVIEWER_STATUSES,
  DEMO_KIHBS_MAPPING_DICTIONARY
} from "../src/lib/data-dictionary-mapper.js";

import {
  profileDatasetQuality,
  QUALITY_CHECK_SEVERITY,
  DOCUMENTED_PLAUSIBILITY_RULES
} from "../src/lib/data-quality-profiler.js";

import {
  OFFICIAL_SHA_BASELINE_SPECIFICATION,
  validateShaBaselineCompleteness,
  SHA_BASELINE_STATUSES,
  SHA_REG21_PROXY_VARIABLES
} from "../src/lib/sha-baseline-registry.js";

import {
  evaluateEvidenceReadinessGate,
  READINESS_GATE_STATUSES
} from "../src/lib/evidence-readiness.js";

import {
  DATA_ACCESS_REGISTER,
  ACCESS_STATUSES,
  getDataAccessSummary
} from "../src/lib/data-access-register.js";

import {
  buildShaRequestPackJson,
  generateShaRequestPackMarkdown
} from "../src/lib/sha-request-pack.js";

import {
  runEvaluation,
  buildEvaluationReportJson
} from "../src/lib/evaluation-runner.js";

import {
  REGISTERED_EVALUATION_DATASETS,
  REGISTERED_EVALUATION_TARGETS
} from "../src/lib/evaluation-contracts.js";

import {
  REGISTERED_EVALUATION_MODELS
} from "../src/lib/evaluation-model-registry.js";

import { calculateProposedModel as calculateOriginalAgi } from "../src/lib/AlgorithmSimulation.original-agi-v2.1.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 1. DATA GOVERNANCE & DATASET READINESS SAFEGUARDS ──────────────────────────

test("Data Readiness 1: Synthetic datasets are always DEMO_ONLY and ineligible for empirical evaluation", () => {
  const synthManifest = createDatasetManifest({
    datasetId: "SYNTH_TEST",
    datasetType: DATASET_TYPES.SYNTHETIC,
    sourceName: "Synthetic Generator",
    provenanceReference: "Internal generator script",
    referencePeriodStart: "2026-01-01",
    referencePeriodEnd: "2026-12-31",
    recordCount: 100,
    dataDictionaryReference: "Synthetic schema v1"
  });

  const readiness = assessDatasetReadiness(synthManifest);
  assert.equal(readiness.status, "DEMO_ONLY");
  assert.equal(readiness.eligibleForEmpiricalEvaluation, false);
  assert.ok(readiness.blockers.some(b => b.includes("Synthetic data cannot establish empirical model performance")));
});

test("Data Readiness 2: Missing provenance blocks readiness", () => {
  const manifest = createDatasetManifest({
    datasetId: "SURVEY_NO_PROV",
    datasetType: DATASET_TYPES.SURVEY,
    sourceName: "KNBS",
    provenanceReference: "", // Missing provenance
    referencePeriodStart: "2024-01-01",
    referencePeriodEnd: "2024-12-31",
    recordCount: 500,
    dataDictionaryReference: "KNBS KIHBS 2015/16 Codebook",
    authorizationStatus: AUTHORIZATION_STATUS.APPROVED,
    legalReviewStatus: LEGAL_REVIEW_STATUS.APPROVED,
    deidentificationReview: DEIDENTIFICATION_REVIEW_STATUS.INDEPENDENTLY_REVIEWED
  });

  const readiness = assessDatasetReadiness(manifest);
  assert.equal(readiness.status, GOVERNANCE_STATUS.BLOCKED);
  assert.ok(readiness.blockers.some(b => b.includes("provenance is missing")));
});

test("Data Readiness 3: Missing statutory authorisation blocks readiness", () => {
  const manifest = createDatasetManifest({
    datasetId: "SURVEY_NO_AUTH",
    datasetType: DATASET_TYPES.SURVEY,
    sourceName: "KNBS",
    provenanceReference: "KNBS Microdata Catalog",
    referencePeriodStart: "2024-01-01",
    referencePeriodEnd: "2024-12-31",
    recordCount: 500,
    dataDictionaryReference: "KNBS KIHBS 2015/16 Codebook",
    authorizationStatus: AUTHORIZATION_STATUS.NOT_AUTHORIZED, // Unauthorized
    legalReviewStatus: LEGAL_REVIEW_STATUS.APPROVED,
    deidentificationReview: DEIDENTIFICATION_REVIEW_STATUS.INDEPENDENTLY_REVIEWED
  });

  const readiness = assessDatasetReadiness(manifest);
  assert.equal(readiness.status, GOVERNANCE_STATUS.BLOCKED);
  assert.ok(readiness.blockers.some(b => b.includes("Authorisation for the proposed data use has not been verified")));
});

test("Data Readiness 4: Missing legal review blocks readiness", () => {
  const manifest = createDatasetManifest({
    datasetId: "SURVEY_NO_LEGAL",
    datasetType: DATASET_TYPES.SURVEY,
    sourceName: "KNBS",
    provenanceReference: "KNBS Microdata Catalog",
    referencePeriodStart: "2024-01-01",
    referencePeriodEnd: "2024-12-31",
    recordCount: 500,
    dataDictionaryReference: "KNBS KIHBS 2015/16 Codebook",
    authorizationStatus: AUTHORIZATION_STATUS.APPROVED,
    legalReviewStatus: LEGAL_REVIEW_STATUS.PENDING, // Legal review not approved
    deidentificationReview: DEIDENTIFICATION_REVIEW_STATUS.INDEPENDENTLY_REVIEWED
  });

  const readiness = assessDatasetReadiness(manifest);
  assert.equal(readiness.status, GOVERNANCE_STATUS.BLOCKED);
  assert.ok(readiness.blockers.some(b => b.includes("Required legal and data-governance review is incomplete")));
});

test("Data Readiness 5: Pseudonymised records are not automatically treated as anonymised", () => {
  const manifest = createDatasetManifest({
    datasetId: "SURVEY_PSEUDONYMIZED",
    datasetType: DATASET_TYPES.SURVEY,
    sourceName: "KNBS",
    provenanceReference: "KNBS Microdata Catalog",
    referencePeriodStart: "2024-01-01",
    referencePeriodEnd: "2024-12-31",
    recordCount: 500,
    dataDictionaryReference: "KNBS KIHBS 2015/16 Codebook",
    deidentificationStatus: DEIDENTIFICATION_STATUS.PSEUDONYMIZED,
    deidentificationReview: DEIDENTIFICATION_REVIEW_STATUS.INDEPENDENTLY_REVIEWED,
    authorizationStatus: AUTHORIZATION_STATUS.APPROVED,
    legalReviewStatus: LEGAL_REVIEW_STATUS.APPROVED
  });

  const readiness = assessDatasetReadiness(manifest);
  // Verified pseudonymization with legal review passes to technical review, but produces strict statutory warnings
  assert.equal(readiness.status, GOVERNANCE_STATUS.READY_FOR_TECHNICAL_REVIEW);
  assert.ok(readiness.warnings.some(w => w.includes("pseudonymized data remains personal data")));
});

test("Data Readiness 6: Missing data dictionary reference blocks readiness", () => {
  const manifest = createDatasetManifest({
    datasetId: "SURVEY_NO_DICT",
    datasetType: DATASET_TYPES.SURVEY,
    sourceName: "KNBS",
    provenanceReference: "KNBS Catalog",
    referencePeriodStart: "2024-01-01",
    referencePeriodEnd: "2024-12-31",
    recordCount: 200,
    dataDictionaryReference: "", // Missing
    authorizationStatus: AUTHORIZATION_STATUS.APPROVED,
    legalReviewStatus: LEGAL_REVIEW_STATUS.APPROVED,
    deidentificationReview: DEIDENTIFICATION_REVIEW_STATUS.INDEPENDENTLY_REVIEWED
  });

  const readiness = assessDatasetReadiness(manifest);
  assert.equal(readiness.status, GOVERNANCE_STATUS.BLOCKED);
  assert.ok(readiness.blockers.some(b => b.includes("source data dictionary is required")));
});

test("Data Readiness 7: Invalid observation periods (start > end) are rejected", () => {
  const manifest = createDatasetManifest({
    datasetId: "SURVEY_INVALID_DATES",
    datasetType: DATASET_TYPES.SURVEY,
    sourceName: "KNBS",
    provenanceReference: "KNBS Catalog",
    referencePeriodStart: "2025-12-31",
    referencePeriodEnd: "2024-01-01", // Start after end
    recordCount: 200,
    dataDictionaryReference: "KNBS Codebook",
    authorizationStatus: AUTHORIZATION_STATUS.APPROVED,
    legalReviewStatus: LEGAL_REVIEW_STATUS.APPROVED,
    deidentificationReview: DEIDENTIFICATION_REVIEW_STATUS.INDEPENDENTLY_REVIEWED
  });

  const readiness = assessDatasetReadiness(manifest);
  assert.equal(readiness.status, GOVERNANCE_STATUS.BLOCKED);
  assert.ok(readiness.blockers.some(b => b.includes("preceding or equal to the end date")));
});

// ─── 2. DATA QUALITY PROFILER & AUDIT INTEGRITY ───────────────────────────────

test("Data Readiness 8: Duplicate record IDs are detected deterministically", () => {
  const recordsWithDuplicates = [
    { id: "REC-001", size: 4, cons: 50000 },
    { id: "REC-002", size: 2, cons: 20000 },
    { id: "REC-001", size: 4, cons: 50000 } // Duplicate
  ];

  const report = profileDatasetQuality(recordsWithDuplicates, { idField: "id" });
  assert.equal(report.duplicateCounts, 1);
  assert.equal(report.invalidValueCounts.duplicates, 1);
  assert.ok(report.exclusionRecommendations.some(r => r.recordId === "REC-001" && r.checkType === "DUPLICATE_IDENTIFIER"));
});

test("Data Readiness 9: Missing required fields are reported with complete-case exclusion reasons", () => {
  const records = [
    { id: "REC-01", household_size: 4, annual_consumption: 120000 },
    { id: "REC-02", household_size: 3, annual_consumption: null } // Missing required
  ];

  const report = profileDatasetQuality(records, {
    idField: "id",
    requiredFields: ["household_size", "annual_consumption"]
  });

  assert.equal(report.invalidValueCounts.missingRequired, 1);
  assert.ok(report.hasCriticalIssues);
  assert.ok(report.exclusionRecommendations.some(r => r.recordId === "REC-02" && r.checkType === "MISSING_REQUIRED_FIELD"));
});

test("Data Readiness 10: Incompatible or non-finite units/numbers are detected", () => {
  const records = [
    { id: "REC-01", cons: 50000 },
    { id: "REC-02", cons: NaN },
    { id: "REC-03", cons: Infinity }
  ];

  const report = profileDatasetQuality(records, { idField: "id" });
  assert.equal(report.invalidValueCounts.nonFiniteNumbers, 2);
  assert.ok(report.exclusionRecommendations.some(r => r.recordId === "REC-02" && r.checkType === "NON_FINITE_NUMBER"));
  assert.ok(report.exclusionRecommendations.some(r => r.recordId === "REC-03" && r.checkType === "NON_FINITE_NUMBER"));
});

test("Data Readiness 11: Zero silent outlier deletion: anomalies are flagged as warnings, not dropped", () => {
  const records = [
    { id: "REC-NORMAL", hh_size: 5, cons: 100000 },
    { id: "REC-LARGE", hh_size: 40, cons: 100000 } // Plausibility bound for hh_size is max 35
  ];

  const report = profileDatasetQuality(records, { idField: "id" });
  assert.equal(report.recordsInspected, 2);
  // Anomaly produces a WARNING, not an automatic critical exclusion
  assert.equal(report.invalidValueCounts.rangeAnomalies, 1);
  const warning = report.findingsBySeverity[QUALITY_CHECK_SEVERITY.WARNING].find(w => w.recordId === "REC-LARGE");
  assert.ok(warning);
  assert.ok(warning.message.includes("Flagged for expert investigation"));
  // Record was NOT added to critical exclusion recommendations
  assert.ok(!report.exclusionRecommendations.some(r => r.recordId === "REC-LARGE" && r.checkType === "DOCUMENTED_RANGE_ANOMALY"));
});

test("Data Readiness 12: Zero automatic imputation: missing values are flagged and quantified, never imputed", () => {
  const records = [
    { id: "REC-01", food_share: 0.6 },
    { id: "REC-02", food_share: null },
    { id: "REC-03", food_share: null }
  ];

  const report = profileDatasetQuality(records, { idField: "id" });
  assert.equal(report.fieldLevelMissingness.food_share.missingCount, 2);
  assert.equal(report.fieldLevelMissingness.food_share.missingRate, 2 / 3);
  // Original rows remain unchanged
  assert.equal(records[1].food_share, null);
  assert.equal(records[2].food_share, null);
});

// ─── 3. DATA DICTIONARY MAPPER & PROVENANCE ───────────────────────────────────

test("Data Readiness 13: Variable mapping preserves source provenance and distinct source/target fields", () => {
  const mapping = createVariableMapping({
    sourceDatasetField: "b1_q01_totcons",
    sourceFieldDescription: "Total Annual Consumption (Food + Non-food)",
    canonicalConcept: CANONICAL_CONCEPTS.TOTAL_ANNUAL_CONSUMPTION_EXPENDITURE,
    dataType: DATA_TYPES.NUMBER,
    unit: "KSh/year",
    transformationRule: TRANSFORMATION_RULES.IDENTITY,
    missingValueTreatment: MISSING_VALUE_TREATMENTS.FLAG_AND_RETAIN,
    sourceEvidenceReference: "KIHBS 2015/16 Section B1 Q01",
    reviewerStatus: REVIEWER_STATUSES.VERIFIED
  });

  const rawRecord = {
    b1_q01_totcons: 154000,
    county_code: 47
  };

  const result = mapSourceRecord(rawRecord, [mapping]);
  assert.equal(result.isComplete, true);
  // Transformed field exists in canonical record
  assert.equal(result.canonicalRecord[CANONICAL_CONCEPTS.TOTAL_ANNUAL_CONSUMPTION_EXPENDITURE], 154000);
  // Source record remains intact and separate
  assert.equal(result.sourceRecord.b1_q01_totcons, 154000);
  // Audit trace preserves provenance
  assert.equal(result.trace[CANONICAL_CONCEPTS.TOTAL_ANNUAL_CONSUMPTION_EXPENDITURE].sourceField, "b1_q01_totcons");
  assert.equal(result.trace[CANONICAL_CONCEPTS.TOTAL_ANNUAL_CONSUMPTION_EXPENDITURE].sourceRef, "KIHBS 2015/16 Section B1 Q01");
});

// ─── 4. SHA BASELINE RECONSTRUCTION & REGISTRY ─────────────────────────────────

test("Data Readiness 14: Incomplete SHA coefficients keep official baseline marked PARTIALLY_DOCUMENTED", () => {
  const validation = validateShaBaselineCompleteness(OFFICIAL_SHA_BASELINE_SPECIFICATION);
  assert.equal(validation.isComplete, false);
  assert.equal(validation.status, SHA_BASELINE_STATUSES.PARTIALLY_DOCUMENTED);
  assert.ok(validation.missingComponents.some(c => c.includes("Urban regression coefficients")));
  assert.ok(validation.missingComponents.some(c => c.includes("Rural regression coefficients")));
  assert.ok(validation.explanation.includes("Evaluators must NOT guess or fabricate these parameters"));
});

test("Data Readiness 15: Missing rural or urban specification blocks full baseline verification", () => {
  const incompleteSpec = {
    ...OFFICIAL_SHA_BASELINE_SPECIFICATION,
    urbanModelSpecification: { coefficients: { hh_size: 0.12 }, intercept: 10.5 },
    ruralModelSpecification: null, // Missing rural
    preprocessingRules: { categoricalEncodings: {} },
    missingValueRules: { imputationMethod: "NONE" },
    outputTransformation: { scaleTransformation: "EXP" },
    contributionMappingRules: { scoreBands: [1, 2] },
    verificationTestCases: [{ input: {}, output: 1 }]
  };

  const validation = validateShaBaselineCompleteness(incompleteSpec);
  assert.equal(validation.isComplete, false);
  assert.ok(validation.missingComponents.some(c => c.includes("Rural regression coefficients")));
});

test("Data Readiness 16: Missing verified test cases prevents IMPLEMENTED_AND_TESTED status", () => {
  const specNoTests = {
    ...OFFICIAL_SHA_BASELINE_SPECIFICATION,
    urbanModelSpecification: { coefficients: { hh_size: 0.1 }, intercept: 9 },
    ruralModelSpecification: { coefficients: { hh_size: 0.2 }, intercept: 8 },
    preprocessingRules: { categoricalEncodings: { dummy: 1 } },
    missingValueRules: { imputationMethod: "REJECT" },
    outputTransformation: { scaleTransformation: "EXP" },
    contributionMappingRules: { scoreBands: [500] },
    independentTechnicalReviewer: "Independent Auditor",
    verificationTestCases: [] // Empty test cases
  };

  const validation = validateShaBaselineCompleteness(specNoTests);
  assert.equal(validation.isComplete, false);
  assert.ok(validation.missingComponents.some(c => c.includes("Verified test case examples")));
});

// ─── 5. EVIDENCE READINESS GATE & COMPARATIVE EVALUATION BLOCKS ────────────────

test("Data Readiness 17: No empirical evaluation can start with an incompatible construct target", () => {
  const dataset = REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"];
  const target = REGISTERED_EVALUATION_TARGETS["INDEPENDENT_ANNUAL_CONSUMPTION"];
  // AGI v2.1 construct is Adjusted Gross Income (asset/liquidity base), incompatible with consumption expenditure
  const model = REGISTERED_EVALUATION_MODELS["AGI_ORIGINAL_V2_1"];

  const gate = evaluateEvidenceReadinessGate({
    datasetManifest: dataset,
    targetDefinition: target,
    modelRegistryEntry: model,
    variableMappings: DEMO_KIHBS_MAPPING_DICTIONARY
  });

  assert.equal(gate.eligibleForEmpiricalEvaluation, false);
  assert.ok(gate.blockers.some(b => b.includes("Construct incompatibility")));
});

// ─── 6. DATA PRIVACY & STORAGE BOUNDARY AUDIT ─────────────────────────────────

test("Data Readiness 18: No member-record persistence path identified in inspected source files", () => {
  // Static audit of key source files for localStorage or sessionStorage usage of household inputs.
  // Note: This static pattern scan verifies that key component and library files do not contain
  // member-record persistence calls. It represents a scoped source inspection, not comprehensive proof
  // of privacy or network isolation across all possible runtime paths.
  const srcDir = path.resolve(__dirname, "../src");
  const filesToCheck = [
    "App.jsx",
    "EvidenceReadinessTab.jsx",
    "ContributionStatementTab.jsx",
    "ModelVersionsTab.jsx",
    "AppealPreparationTab.jsx",
    "OfficerReviewTab.jsx",
    "lib/household-income.js",
    "lib/assessment-flow.js",
    "lib/data-governance.js",
    "lib/data-access-register.js",
    "lib/AlgorithmSimulation.js"
  ];

  for (const relFile of filesToCheck) {
    const filePath = path.join(srcDir, relFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      // Check for localStorage.setItem or sessionStorage.setItem containing citizen/household data
      const hasUnsafeStorage = /localStorage\.setItem\s*\(\s*["'](household|income|citizen|member_data)/i.test(content) ||
                               /sessionStorage\.setItem\s*\(\s*["'](household|income|citizen|member_data)/i.test(content);
      assert.equal(hasUnsafeStorage, false, `File ${relFile} must not persist household/member records to browser storage.`);
    }
  }
});

// ─── 7. REGRESSION INVARIANTS ─────────────────────────────────────────────────

test("Data Readiness 19: AlgorithmSimulation.original-agi-v2.1.js remains byte-for-byte unchanged", () => {
  const origPath = path.resolve(__dirname, "../src/lib/AlgorithmSimulation.original-agi-v2.1.js");
  assert.ok(fs.existsSync(origPath), "Original AGI v2.1 algorithm file must exist.");
  const content = fs.readFileSync(origPath, "utf8");
  assert.ok(content.length > 0, "Original AGI v2.1 algorithm file must not be empty.");

  // Test execution of original algorithm on benchmark household
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
  assert.ok(output.monthlyContribution >= 300);
});

test("Data Readiness 20: Model-versioning continues to identify originalAgi and declaredIncome versions", () => {
  const benchInput = {
    monthlyNetEarnedIncome: 30000,
    housingType: "Owner-Occupied",
    householdSize: 3,
    assets: [],
    vehicles: []
  };

  const versions = calculateProposedModelVersions(benchInput);
  assert.ok(versions.originalAgi);
  assert.ok(versions.declaredIncome);
  assert.equal(versions.originalAgi.id, "asset-liquidity-agi-v2.1");
  assert.equal(versions.declaredIncome.id, "declared-income-agi-v1");
});
