/**
 * Data Governance & Dataset Readiness Engine — Research Prototype.
 *
 * Implements strict statutory and institutional data-governance safeguards
 * aligned with the Kenya Data Protection Act, 2019 (DPA) and the Office of the
 * Data Protection Commissioner (ODPC) Guidance Notes on Processing for Research Purposes (2025).
 *
 * Non-negotiable principles:
 * 1. Receiving or accessing a dataset is NOT authorization for empirical evaluation.
 * 2. Merely uploading a file or passing client-side validation creates zero legal entitlement.
 * 3. Synthetic data is strictly DEMO_ONLY and cannot establish empirical model performance.
 * 4. Pseudonymized data remains personal data; removing names/national IDs does NOT make data anonymous.
 * 5. Statutory authorization, data-subject consent, legal review, and research ethics approvals
 *    are distinct and non-interchangeable.
 * 6. This software DOES NOT provide a legal determination.
 */

export const DATASET_TYPES = Object.freeze({
  SYNTHETIC: "SYNTHETIC",
  SURVEY: "SURVEY",
  ADMINISTRATIVE: "ADMINISTRATIVE",
  OTHER: "OTHER"
});

export const DATASET_STATUS = Object.freeze({
  REQUESTED: "REQUESTED",
  RECEIVED: "RECEIVED",
  SCHEMA_REVIEWED: "SCHEMA_REVIEWED",
  QUALITY_REVIEWED: "QUALITY_REVIEWED",
  APPROVED_FOR_ANALYSIS: "APPROVED_FOR_ANALYSIS"
});

export const GOVERNANCE_STATUS = Object.freeze({
  SYNTHETIC: "SYNTHETIC",
  PENDING_GOVERNANCE_REVIEW: "PENDING_GOVERNANCE_REVIEW",
  BLOCKED: "BLOCKED",
  READY_FOR_TECHNICAL_REVIEW: "READY_FOR_TECHNICAL_REVIEW",
  APPROVED_FOR_EMPIRICAL_EVALUATION: "APPROVED_FOR_EMPIRICAL_EVALUATION"
});

export const DEIDENTIFICATION_STATUS = Object.freeze({
  NOT_DEIDENTIFIED: "NOT_DEIDENTIFIED",
  PSEUDONYMIZED: "PSEUDONYMIZED",
  FULLY_ANONYMIZED: "FULLY_ANONYMIZED"
});

export const DEIDENTIFICATION_REVIEW_STATUS = Object.freeze({
  NONE: "NONE",
  INTERNAL_REVIEW: "INTERNAL_REVIEW",
  INDEPENDENTLY_REVIEWED: "INDEPENDENTLY_REVIEWED"
});

export const AUTHORIZATION_STATUS = Object.freeze({
  NOT_AUTHORIZED: "NOT_AUTHORIZED",
  PENDING: "PENDING",
  APPROVED: "APPROVED"
});

export const LEGAL_REVIEW_STATUS = Object.freeze({
  NOT_REVIEWED: "NOT_REVIEWED",
  PENDING: "PENDING",
  APPROVED: "APPROVED"
});

export const ETHICS_REVIEW_STATUS = Object.freeze({
  NOT_REVIEWED: "NOT_REVIEWED",
  PENDING: "PENDING",
  APPROVED: "APPROVED"
});

/**
 * Assesses dataset readiness according to strict statutory and methodology criteria.
 *
 * Notice: Even if authorization, legal review, and de-identification reviews pass,
 * the status is READY_FOR_TECHNICAL_REVIEW, NOT automatically approved for empirical evaluation.
 * Empirical evaluation requires technical suitability, outcome compatibility, and specific
 * research study approval.
 */
export function assessDatasetReadiness(manifest = {}) {
  const blockers = [];
  const warnings = [];

  if (!manifest || typeof manifest !== "object") {
    return {
      status: GOVERNANCE_STATUS.BLOCKED,
      eligibleForEmpiricalEvaluation: false,
      blockers: ["Dataset manifest is missing or invalid."]
    };
  }

  // 1. Synthetic data safeguard
  if (manifest.datasetType === DATASET_TYPES.SYNTHETIC) {
    return {
      status: "DEMO_ONLY",
      eligibleForEmpiricalEvaluation: false,
      blockers: [
        "Synthetic data cannot establish empirical model performance."
      ],
      warnings: [
        "Synthetic fixtures are intended exclusively for software pipeline testing."
      ]
    };
  }

  // 2. Mandatory identification and metadata fields
  const requiredFields = [
    ["datasetId", "Dataset identifier is missing."],
    ["version", "Dataset version is missing."],
    ["sourceName", "Dataset source is missing."],
    ["provenanceReference", "Dataset provenance is missing."],
    ["referencePeriodStart", "Reference period start is missing."],
    ["referencePeriodEnd", "Reference period end is missing."],
    ["recordCount", "Record count is missing."]
  ];

  for (const [field, message] of requiredFields) {
    const val = manifest[field] ?? manifest[field === "sourceName" ? "sourceInstitution" : field];
    if (val === undefined || val === null || String(val).trim() === "") {
      blockers.push(message);
    }
  }

  // Record count validation
  if (!Number.isInteger(manifest.recordCount) || manifest.recordCount < 1) {
    blockers.push("Record count must be a positive integer.");
  }

  // Reference period sanity check
  if (manifest.referencePeriodStart && manifest.referencePeriodEnd) {
    const start = new Date(manifest.referencePeriodStart).getTime();
    const end = new Date(manifest.referencePeriodEnd).getTime();
    if (isNaN(start) || isNaN(end) || start > end) {
      blockers.push("Reference period start date must be a valid date preceding or equal to the end date.");
    }
  }

  // 3. Statutory Authorisation
  if (manifest.authorizationStatus !== AUTHORIZATION_STATUS.APPROVED) {
    blockers.push("Authorisation for the proposed data use has not been verified.");
  }

  // 4. Legal & Regulatory Review
  if (manifest.legalReviewStatus !== LEGAL_REVIEW_STATUS.APPROVED) {
    blockers.push("Required legal and data-governance review is incomplete.");
  }

  // 5. De-identification & Privacy Review
  if (manifest.deidentificationReview !== DEIDENTIFICATION_REVIEW_STATUS.INDEPENDENTLY_REVIEWED) {
    blockers.push("De-identification has not been independently reviewed.");
  }

  // Pseudonymisation warning safeguard
  if (manifest.deidentificationStatus === DEIDENTIFICATION_STATUS.PSEUDONYMIZED) {
    warnings.push(
      "Under Kenya DPA 2019 and ODPC 2025 guidelines, pseudonymized data remains personal data. Removing direct identifiers does not establish full anonymization."
    );
  }

  // 6. Source Data Dictionary Reference
  if (!manifest.dataDictionaryReference || String(manifest.dataDictionaryReference).trim() === "") {
    blockers.push("A source data dictionary is required.");
  }

  // 7. Purpose Limitation
  if (!manifest.intendedProcessingPurpose || String(manifest.intendedProcessingPurpose).trim() === "") {
    blockers.push("Specific research and evaluation purpose limitation must be documented.");
  }

  // 8. Ethics review requirement (when flagged as required by statutory protocol)
  if (manifest.requiresEthicsReview && manifest.ethicsReviewStatus !== ETHICS_REVIEW_STATUS.APPROVED) {
    blockers.push("Institutional research ethics review (IERC/NACOSTI) has not been verified.");
  }

  if (blockers.length > 0) {
    return {
      status: GOVERNANCE_STATUS.BLOCKED,
      eligibleForEmpiricalEvaluation: false,
      blockers,
      warnings
    };
  }

  // If all governance and preliminary metadata requirements pass:
  return {
    status: GOVERNANCE_STATUS.READY_FOR_TECHNICAL_REVIEW,
    eligibleForEmpiricalEvaluation: false,
    blockers: [
      "Technical validation, outcome compatibility and evaluation approval are still required."
    ],
    warnings: [
      ...warnings,
      "This readiness check verifies documented governance metadata; it does NOT constitute a legal determination or empirical validation."
    ]
  };
}

/**
 * Creates a validated dataset manifest specification.
 */
export function createDatasetManifest({
  datasetId,
  version = "1.0",
  sourceName,
  sourceInstitution,
  sourceDescription = "",
  datasetType = DATASET_TYPES.SURVEY,
  datasetOwner = "Undisclosed",
  provenanceReference,
  extractionDate = null,
  referencePeriodStart,
  referencePeriodEnd,
  recordCount,
  dataDictionaryReference,
  deidentificationStatus = DEIDENTIFICATION_STATUS.NOT_DEIDENTIFIED,
  deidentificationReview = DEIDENTIFICATION_REVIEW_STATUS.NONE,
  authorizationStatus = AUTHORIZATION_STATUS.NOT_AUTHORIZED,
  legalReviewStatus = LEGAL_REVIEW_STATUS.NOT_REVIEWED,
  ethicsReviewStatus = ETHICS_REVIEW_STATUS.NOT_REVIEWED,
  intendedProcessingPurpose = "Independent methodology validation",
  samplingDesign = "UNKNOWN",
  surveyDesignFields = { weightField: null, strataField: null, clusterField: null },
  knownLimitations = [],
  permittedOutputs = ["AGGREGATED_STATISTICS_ONLY"]
} = {}) {
  return {
    datasetId,
    version,
    sourceName: sourceName || sourceInstitution,
    sourceInstitution: sourceInstitution || sourceName,
    sourceDescription,
    datasetType,
    datasetOwner,
    provenanceReference,
    extractionDate,
    referencePeriodStart,
    referencePeriodEnd,
    recordCount,
    dataDictionaryReference,
    deidentificationStatus,
    deidentificationReview,
    authorizationStatus,
    legalReviewStatus,
    ethicsReviewStatus,
    intendedProcessingPurpose,
    samplingDesign,
    surveyDesignFields,
    knownLimitations: Array.isArray(knownLimitations) ? knownLimitations : [knownLimitations],
    permittedOutputs: Array.isArray(permittedOutputs) ? permittedOutputs : [permittedOutputs]
  };
}
