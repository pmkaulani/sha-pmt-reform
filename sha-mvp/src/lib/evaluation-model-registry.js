/**
 * Evaluation Model Registry — Model Governance and Lineage.
 *
 * Records candidate assessment models, baseline specifications, version provenance,
 * output meanings, policy assumptions, and evaluation compatibility.
 *
 * Enforces key methodological rules:
 * - A model output cannot be its own ground truth.
 * - The illustrative PMT comparator is NOT SHA's deployed model.
 * - The official SHA Regulation 21 model is NOT_CONFIGURED until official parameters are disclosed.
 * - A model whose construct does not match the reference target is marked NOT_EVALUABLE.
 */

export const MODEL_EVALUATION_STATUSES = Object.freeze({
  ELIGIBLE_FOR_DEMO: "ELIGIBLE_FOR_DEMO",
  NOT_EVALUABLE_INCOMPATIBLE: "NOT_EVALUABLE_INCOMPATIBLE",
  NOT_CONFIGURED_MISSING_OFFICIAL_PARAMS: "NOT_CONFIGURED_MISSING_OFFICIAL_PARAMS",
  BLOCKED_GOVERNANCE: "BLOCKED_GOVERNANCE"
});

export const REGISTERED_EVALUATION_MODELS = Object.freeze({
  AGI_ORIGINAL_V2_1: {
    id: "AGI_ORIGINAL_V2_1",
    version: "2.1.0",
    name: "Original Asset- and Liquidity-Aware AGI v2.1",
    shortName: "Original AGI v2.1",
    calculationType: "ASSET_AND_LIQUIDITY_RULES",
    sourceFile: "src/lib/AlgorithmSimulation.original-agi-v2.1.js",
    sourceProvenance: "Git commit history recovery/restore-original-agi-v2.1",
    primaryOutputUnit: "KSh/year",
    contributionOutputUnit: "KSh/month",
    outputMeaning: "Adjusted Gross Income (AGI) base combining declared income, contextual assets, and mobile money liquidity adjustments.",
    policyAssumptions: "Capital assets and mobile transaction velocity reflect economic capacity; statutory 2.75% rate with KSh 300 monthly floor.",
    knownLimitations: "Relies on proxy asset valuations and liquidity heuristics; construct differs from survey consumption expenditure.",
    researchStatus: "RESEARCH_PROTOTYPE",
    isOfficialShaBaseline: false,
    evaluationAdapters: {
      INDEPENDENT_ANNUAL_CONSUMPTION: {
        isEligible: false,
        status: MODEL_EVALUATION_STATUSES.NOT_EVALUABLE_INCOMPATIBLE,
        reason: "Construct mismatch: AGI base includes liquidity and asset depreciation adjustments not directly comparable to consumption expenditure without an empirical conversion adapter."
      },
      INDEPENDENT_POVERTY_STATUS: {
        isEligible: false,
        status: MODEL_EVALUATION_STATUSES.NOT_EVALUABLE_INCOMPATIBLE,
        reason: "Construct mismatch: Minimum contribution floor (KSh 300/mo) is an administrative statutory rule under Regulation 17(2) (formerly cited as Regulation 18(2)), not an independent statistical poverty classification threshold."
      }
    }
  },

  AGI_DECLARED_INCOME_V1: {
    id: "AGI_DECLARED_INCOME_V1",
    version: "1.0.0",
    name: "Declared-Income AGI v1 Experiment",
    shortName: "Declared-Income AGI v1",
    calculationType: "STRUCTURED_EARNED_INCOME_SUBTOTAL",
    sourceFile: "src/lib/household-income.js",
    sourceProvenance: "Phase 1 / Phase 2 structured income ledger",
    primaryOutputUnit: "KSh/year",
    contributionOutputUnit: "KSh/month",
    outputMeaning: "Reported net earned-income subtotal from active livelihoods with itemised business cost deduction.",
    policyAssumptions: "Allowable operating costs should be deducted from gross receipts before means-testing; unearned transfers isolated for policy review.",
    knownLimitations: "Self-reported declaration without third-party verification; excludes remittances and assistance from earned base.",
    researchStatus: "RESEARCH_PROTOTYPE",
    isOfficialShaBaseline: false,
    evaluationAdapters: {
      INDEPENDENT_ANNUAL_CONSUMPTION: {
        isEligible: false,
        status: MODEL_EVALUATION_STATUSES.NOT_EVALUABLE_INCOMPATIBLE,
        reason: "Construct mismatch: Declared net earned income does not measure total household consumption (e.g. food, gifts, public transfers)."
      },
      INDEPENDENT_POVERTY_STATUS: {
        isEligible: false,
        status: MODEL_EVALUATION_STATUSES.NOT_EVALUABLE_INCOMPATIBLE,
        reason: "Construct mismatch: Declared net earned income measures active livelihood earnings, not total household welfare or consumption poverty."
      }
    }
  },

  COMPARATOR_PMT_ILLUSTRATIVE: {
    id: "COMPARATOR_PMT_ILLUSTRATIVE",
    version: "1.0.0",
    name: "Author-Created Illustrative PMT Comparator — Not SHA's Instrument",
    shortName: "Author-Created Comparator",
    calculationType: "SIMPLIFIED_REGRESSION_PROXY",
    sourceFile: "src/lib/AlgorithmSimulation.js",
    sourceProvenance: "Author-created synthetic research benchmark",
    primaryOutputUnit: "KSh/year",
    contributionOutputUnit: "KSh/month",
    outputMeaning: "Proxy annual household welfare estimate based on dwelling materials, water/light services, and durable asset ownership.",
    policyAssumptions: "Demonstration proxy scoring with hand-authored demonstration weights.",
    knownLimitations: "Explicit notice: This is NOT SHA's operational means-testing instrument under Regulation 21(6) and the Fifth Schedule, and is NOT SHA's deployed 43-variable means-testing algorithm. It cannot be used to evaluate SHA's real-world accuracy or performance, and must not be described as a valid replacement for the missing SHA baseline.",
    researchStatus: "ILLUSTRATIVE_COMPARATOR_ONLY",
    isOfficialShaBaseline: false,
    evaluationAdapters: {
      INDEPENDENT_ANNUAL_CONSUMPTION: {
        isEligible: true,
        status: MODEL_EVALUATION_STATUSES.ELIGIBLE_FOR_DEMO,
        reason: "Proxy regression produces an annual expenditure estimate, conceptually comparable in unit to annual consumption (demo only)."
      },
      INDEPENDENT_POVERTY_STATUS: {
        isEligible: true,
        status: MODEL_EVALUATION_STATUSES.ELIGIBLE_FOR_DEMO,
        adapterFunction: "adaptPmtToPovertyClassification",
        reason: "Can evaluate whether predicted expenditure falling below the poverty line correctly identifies poor households."
      }
    }
  },

  OFFICIAL_SHA_REG21_BASELINE: {
    id: "OFFICIAL_SHA_REG21_BASELINE",
    version: "UNKNOWN_PENDING_DISCLOSURE",
    name: "Official SHA Means-Testing Instrument — Implementation Details Pending Verification",
    shortName: "Official SHA Deployed Baseline (Pending Verification)",
    calculationType: "DEPLOYED_MEANS_TESTING_REGRESSION",
    sourceFile: "None (Proprietary SHA Government System)",
    sourceProvenance: "Social Health Insurance Act, 2023 (Section 27); Social Health Insurance Regulations, 2024 (Regulations 18 and 21(6), Fifth Schedule)",
    primaryOutputUnit: "KSh/year (Official Evaluated Income)",
    contributionOutputUnit: "KSh/month (Gazetted Contribution)",
    outputMeaning: "Official government means-testing scores and statutory premium determinations.",
    policyAssumptions: "Statutory parameters determined by Ministry of Health and SHA under Section 27, Regulation 18, and Regulation 21(6).",
    knownLimitations: "While Regulation 21(6) states that means testing is conducted using the formula set out in the Fifth Schedule ('Means Testing'), SHA has not officially disclosed the complete production regression model, variable definitions, weights, preprocessing transformations, or calibration tables.",
    researchStatus: "OFFICIAL_GOVERNMENT_SYSTEM",
    isOfficialShaBaseline: true,
    status: MODEL_EVALUATION_STATUSES.NOT_CONFIGURED_MISSING_OFFICIAL_PARAMS,
    statusReason: "Official SHA implementation and parameters required before comparative evaluation can be executed.",
    missingDependencies: [
      "Official 43-variable regression specifications and coefficients (provisional external disclosures)",
      "Preprocessing and dummy-encoding algorithms for categorical responses",
      "Regional intercept adjustments and calibration offsets",
      "Statutory lookup tables mapping evaluated scores to monthly premium obligations"
    ],
    evaluationAdapters: {
      INDEPENDENT_ANNUAL_CONSUMPTION: {
        isEligible: false,
        status: MODEL_EVALUATION_STATUSES.NOT_CONFIGURED_MISSING_OFFICIAL_PARAMS,
        reason: "Cannot evaluate: official model parameters have not been provided by SHA."
      },
      INDEPENDENT_POVERTY_STATUS: {
        isEligible: false,
        status: MODEL_EVALUATION_STATUSES.NOT_CONFIGURED_MISSING_OFFICIAL_PARAMS,
        reason: "Cannot evaluate: official model parameters have not been provided by SHA."
      }
    }
  }
});

/**
 * Retrieves registry entry for a model ID or alias.
 */
export function getModelRegistryEntry(modelId) {
  if (!modelId) return null;
  if (REGISTERED_EVALUATION_MODELS[modelId]) {
    return REGISTERED_EVALUATION_MODELS[modelId];
  }
  // Check alias or lowercase slug
  const normalized = String(modelId).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const entry of Object.values(REGISTERED_EVALUATION_MODELS)) {
    const entryNorm = entry.id.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (entryNorm === normalized) return entry;
    if (normalized.includes("reg21") || normalized.includes("officialsha")) {
      if (entry.isOfficialShaBaseline) return entry;
    }
    if (normalized.includes("origin") || normalized.includes("v21")) {
      if (entry.id === "AGI_ORIGINAL_V2_1") return entry;
    }
    if (normalized.includes("declared")) {
      if (entry.id === "AGI_DECLARED_INCOME_V1") return entry;
    }
    if (normalized.includes("comparator") || normalized.includes("illustrative")) {
      if (entry.id === "COMPARATOR_PMT_ILLUSTRATIVE") return entry;
    }
  }
  return null;
}

/**
 * Checks whether a candidate model can be evaluated against a specific target.
 */
export function checkModelTargetCompatibility(modelId, targetId) {
  const model = getModelRegistryEntry(modelId);
  if (!model) {
    return {
      canEvaluate: false,
      status: "MODEL_NOT_FOUND",
      reason: `Model identifier '${modelId}' is not registered.`
    };
  }

  if (model.isOfficialShaBaseline && model.status !== "CONFIGURED") {
    return {
      canEvaluate: false,
      status: model.status,
      reason: model.statusReason,
      missingDependencies: model.missingDependencies
    };
  }

  const adapter = model.evaluationAdapters?.[targetId];
  if (!adapter) {
    return {
      canEvaluate: false,
      status: MODEL_EVALUATION_STATUSES.NOT_EVALUABLE_INCOMPATIBLE,
      reason: `No evaluation adapter exists between model '${model.name}' and target '${targetId}'.`
    };
  }

  return {
    canEvaluate: adapter.isEligible === true,
    status: adapter.status,
    reason: adapter.reason,
    adapterFunction: adapter.adapterFunction || null
  };
}
