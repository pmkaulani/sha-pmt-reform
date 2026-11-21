/**
 * Evaluation Protocol & Pre-Registration Engine — Research Prototype.
 *
 * Implements pre-registered scientific evaluation protocols to prevent post-hoc
 * cherry-picking, p-hacking, or tuning models against evaluation holdouts.
 *
 * Methodological Invariants:
 * 1. Pre-registration: Research questions, reference outcomes, metrics, exclusions,
 *    and partition rules must be frozen BEFORE examining results.
 * 2. Immutable Protocol Versions: Modifying a frozen protocol automatically creates
 *    a new revision with mandatory documentation of reasons.
 * 3. Construct Decoupling: Predictive accuracy (Mode A) and Affordability burden (Mode B)
 *    operate under distinct protocols and cannot be conflated.
 * 4. Governance Gate: Synthetic datasets and unverified models are blocked from empirical claims.
 */

export const PROTOCOL_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  REGISTERED: "REGISTERED",
  FROZEN: "FROZEN",
  SUPERSEDED: "SUPERSEDED",
  REVOKED: "REVOKED"
});

export const EVALUATION_MODES = Object.freeze({
  PREDICTIVE: "PREDICTIVE",
  AFFORDABILITY: "AFFORDABILITY"
});

/**
 * Validates an evaluation protocol configuration against strict pre-registration standards.
 *
 * Aligned with user-specified starter criteria:
 * - Checks dataset approval and synthetic boundary
 * - Checks independent reference outcome verification
 * - Checks protocol registration timestamp and primary metric
 * - Checks candidate model verification and construct mapping
 * - Enforces comparison mode (PREDICTIVE vs AFFORDABILITY)
 */
export function validateEvaluationProtocol({
  dataset,
  referenceOutcome,
  candidateModels = [],
  comparisonMode,
  protocol
} = {}) {
  const blockers = [];
  const warnings = [];

  // 1. Dataset verification
  if (!dataset) {
    blockers.push("No evaluation dataset supplied.");
  } else {
    if (dataset.datasetType === "SYNTHETIC") {
      blockers.push("Synthetic data cannot support empirical validation.");
    }
    // Check both boolean flag from Phase 3 and status string from Phase 4
    const isApproved = dataset.status === "APPROVED_FOR_EMPIRICAL_EVALUATION" ||
      dataset.isApprovedForEmpiricalEvaluation === true;
    if (!isApproved) {
      blockers.push("Dataset is not approved for empirical evaluation.");
    }
  }

  // 2. Reference outcome verification
  if (!referenceOutcome?.independentProvenance) {
    blockers.push("Independent reference outcome is not verified.");
  }
  if (!referenceOutcome?.definition) {
    blockers.push("Reference outcome definition is missing.");
  }

  // 3. Protocol pre-registration metadata
  if (!protocol?.preRegisteredAt) {
    blockers.push("Evaluation protocol has not been registered.");
  }
  if (!protocol?.primaryMetric) {
    blockers.push("Primary evaluation metric is not specified.");
  }

  // 4. Candidate model eligibility
  if (!Array.isArray(candidateModels) || candidateModels.length < 1) {
    blockers.push("At least one eligible candidate model is required.");
  } else {
    for (const model of candidateModels) {
      if (model.status !== "VERIFIED_FOR_EVALUATION" && model.researchStatus !== "VERIFIED_FOR_EVALUATION") {
        blockers.push(`${model.label || model.name || model.id}: model eligibility is not verified.`);
      }
      if (comparisonMode === EVALUATION_MODES.PREDICTIVE) {
        const targetId = model.outputContract?.targetId || model.compatibleTargetId;
        if (!targetId || targetId !== referenceOutcome?.id) {
          blockers.push(`${model.label || model.name || model.id}: output is not mapped to the reference outcome.`);
        }
      }
    }
  }

  // 5. Comparison mode validation
  if (!Object.values(EVALUATION_MODES).includes(comparisonMode)) {
    blockers.push("Unsupported evaluation comparison mode.");
  }

  return {
    status: blockers.length > 0 ? "BLOCKED" : "READY_FOR_EVALUATION_REVIEW",
    blockers,
    warnings,
    evaluationPermitted: false // Final run authorization is distinct from protocol validation
  };
}

/**
 * Creates a formal, pre-registered evaluation protocol record.
 */
export function createEvaluationProtocol({
  protocolId,
  version = "1.0",
  title,
  author,
  researchQuestion,
  comparisonMode = EVALUATION_MODES.PREDICTIVE,
  datasetId,
  referenceOutcomeId,
  candidateModelIds = [],
  officialShaBaselineVersion = null,
  primaryMetric = "MAE",
  secondaryMetrics = ["RMSE", "BIAS_MSE"],
  subgroupDefinitions = ["URBAN_RURAL", "COUNTY", "HOUSEHOLD_SIZE_BANDS"],
  partitionStrategy = "HOUSEHOLD_HASH_SPLIT",
  householdGroupingKey = "household_id",
  missingDataPolicy = "COMPLETE_CASE_WITH_EXCLUSION_REPORTING",
  exclusionCriteria = ["MISSING_TARGET_OUTCOME", "ZERO_WEIGHT_CASES"],
  samplingMethodology = "STRATIFIED_CLUSTER_WEIGHTS",
  uncertaintyMethod = "JACKKNIFE_REPLICATES",
  policyAssumptions = [],
  limitations = [],
  independentReviewer = null,
  approvalStatus = PROTOCOL_STATUSES.DRAFT,
  preRegisteredAt = null
} = {}) {
  const errors = [];

  if (!protocolId) errors.push("protocolId is required.");
  if (!title) errors.push("title is required.");
  if (!researchQuestion) errors.push("researchQuestion is required.");
  if (!datasetId) errors.push("datasetId is required.");
  if (!referenceOutcomeId) errors.push("referenceOutcomeId is required.");
  if (!Array.isArray(candidateModelIds) || candidateModelIds.length === 0) {
    errors.push("At least one candidate model ID is required.");
  }

  if (errors.length > 0) {
    throw new Error(`Cannot create evaluation protocol: ${errors.join("; ")}`);
  }

  return {
    protocolId,
    version,
    title,
    author: author || "SHA Reform Independent Research Team",
    researchQuestion,
    comparisonMode,
    datasetId,
    referenceOutcomeId,
    candidateModelIds,
    officialShaBaselineVersion,
    primaryMetric,
    secondaryMetrics,
    subgroupDefinitions,
    partitionStrategy,
    householdGroupingKey,
    missingDataPolicy,
    exclusionCriteria,
    samplingMethodology,
    uncertaintyMethod,
    policyAssumptions,
    limitations,
    independentReviewer,
    approvalStatus,
    preRegisteredAt: preRegisteredAt || (approvalStatus === PROTOCOL_STATUSES.REGISTERED || approvalStatus === PROTOCOL_STATUSES.FROZEN ? new Date().toISOString() : null),
    history: []
  };
}

/**
 * Freezes a registered protocol, preventing silent parameter or metric shifts.
 */
export function freezeProtocol(protocol, { reviewer, notes = "" } = {}) {
  if (!protocol || typeof protocol !== "object") {
    throw new TypeError("Protocol object is required.");
  }
  if (!reviewer) {
    throw new Error("Independent reviewer identity is required to freeze an evaluation protocol.");
  }

  return {
    ...protocol,
    approvalStatus: PROTOCOL_STATUSES.FROZEN,
    independentReviewer: reviewer,
    frozenAt: new Date().toISOString(),
    history: [
      ...protocol.history,
      {
        action: "FROZEN",
        timestamp: new Date().toISOString(),
        reviewer,
        notes
      }
    ]
  };
}

/**
 * Creates a revised protocol version with explicit justification for changes.
 */
export function reviseProtocol(existingProtocol, updates = {}, { reason, author } = {}) {
  if (!reason || String(reason).trim().length < 10) {
    throw new Error("A detailed methodological reason (min 10 chars) is required to revise a protocol.");
  }

  const [major, minor] = (existingProtocol.version || "1.0").split(".").map(Number);
  const newVersion = `${major}.${(minor || 0) + 1}`;

  return {
    ...existingProtocol,
    ...updates,
    version: newVersion,
    approvalStatus: PROTOCOL_STATUSES.DRAFT,
    preRegisteredAt: null,
    frozenAt: null,
    history: [
      ...existingProtocol.history,
      {
        action: "REVISED",
        fromVersion: existingProtocol.version,
        toVersion: newVersion,
        timestamp: new Date().toISOString(),
        author: author || "Research Lead",
        reason
      }
    ]
  };
}

/**
 * Standard pre-registered benchmark protocols.
 */
export const STANDARD_REGISTERED_PROTOCOLS = Object.freeze({
  "PROTO-KNBS-KIHBS-PREDICTIVE-V1": createEvaluationProtocol({
    protocolId: "PROTO-KNBS-KIHBS-PREDICTIVE-V1",
    version: "1.0",
    title: "Predictive Accuracy of Means-Testing Estimators vs KNBS KIHBS Consumption",
    author: "Independent Health Policy Research Working Group",
    researchQuestion: "Does the proposed means-testing proxy specification predict total annual household consumption expenditure with lower absolute error and variance than the baseline model?",
    comparisonMode: EVALUATION_MODES.PREDICTIVE,
    datasetId: "KNBS_KIHBS_SPEC",
    referenceOutcomeId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    candidateModelIds: ["official-sha-reg21-pmt", "illustrative-pmt-comparator"],
    officialShaBaselineVersion: "SHA-REG21-MTI-2024-OFFICIAL",
    primaryMetric: "MAE",
    secondaryMetrics: ["RMSE", "MEAN_SIGNED_ERROR", "RESIDUAL_IQR"],
    approvalStatus: PROTOCOL_STATUSES.REGISTERED,
    preRegisteredAt: "2026-11-20T00:00:00Z"
  }),
  "PROTO-SHA-AFFORDABILITY-V1": createEvaluationProtocol({
    protocolId: "PROTO-SHA-AFFORDABILITY-V1",
    version: "1.0",
    title: "Household Contribution Burden & Catastrophic Payment Distribution",
    author: "Health Financing & Equity Assessment Team",
    researchQuestion: "What proportion of independently measured disposable household income does each candidate contribution schedule require across resource deciles?",
    comparisonMode: EVALUATION_MODES.AFFORDABILITY,
    datasetId: "KNBS_KIHBS_SPEC",
    referenceOutcomeId: "INDEPENDENT_ANNUAL_CONSUMPTION",
    candidateModelIds: ["asset-liquidity-agi-v2.1", "declared-income-agi-v1", "official-sha-reg21-pmt"],
    primaryMetric: "MEDIAN_BURDEN_PERCENT",
    secondaryMetrics: ["PERCENT_EXCEEDING_5PCT", "PERCENT_EXCEEDING_10PCT", "CATASTROPHIC_BURDEN_15PCT"],
    approvalStatus: PROTOCOL_STATUSES.REGISTERED,
    preRegisteredAt: "2026-11-20T00:00:00Z"
  })
});
