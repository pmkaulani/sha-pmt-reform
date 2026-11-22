/**
 * Official SHA Baseline Specification Registry — Research Prototype.
 *
 * Provides a formal repository for recording the verified mathematical, econometric,
 * and regulatory specifications of the Social Health Authority's official
 * Regulation 21 Means Testing Instrument (MTI).
 *
 * Methodological Invariants:
 * 1. ZERO fabrication: Never fill missing coefficients, intercepts, or weights with zeros or guesses.
 * 2. ZERO confusion: The illustrative 2-variable comparator in AlgorithmSimulation.js is NOT the SHA baseline.
 * 3. Status strictly enforced: Remains NOT_CONFIGURED or PARTIALLY_DOCUMENTED until official
 *    government documentation is released, independently reviewed, and verified against reference tests.
 * 4. Transparent gaps: Every missing parameter, transformation, and bracket is explicitly cataloged.
 * 5. STATUTORY ACCURACY (Legal Notice No. 49 of 2024, Parliament of Kenya Repository):
 *    - Regulation 17(1)–(2) establishes salaried household contribution rates (2.75% of gross payroll) and KSh 300/mo minimum (under Reg 17(2)).
 *    - Regulation 18(1)–(2) establishes non-salaried household contribution rates (2.75% annual of income determined via means testing under Regulation 21(6), minimum KSh 300/mo under Reg 18(2)).
 *    - Regulation 18(3) governs annual contribution payment timing (payable 14 days before lapse of coverage).
 *    - Regulation 18(4)–(6) authorizes premium financing arrangements with approved financial institutions.
 *    - Regulation 19 governs identification and financial assistance for households in need (indigent households).
 *    - Regulation 20 governs contributions for persons under lawful custody (state responsibility).
 *    - Regulation 21(1)–(5) governs means-testing data collection, instrument development, and socioeconomic domains.
 *    - Regulation 21(6) prescribes that means testing is conducted using the formula in the Fifth Schedule ('Means Testing', Gazette p. 798).
 *    - Regulation 62 governs regional health facility reimbursement Zones (completely unrelated to Fifth Schedule).
 *    - Legal Notice 55 of 2025 revokes Legal Notice 147 of 2024 (clause 9).
 */

export const SHA_BASELINE_STATUSES = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
  PARTIALLY_DOCUMENTED: "PARTIALLY_DOCUMENTED",
  READY_FOR_INDEPENDENT_REVIEW: "READY_FOR_INDEPENDENT_REVIEW",
  VERIFIED_AGAINST_REFERENCE: "VERIFIED_AGAINST_REFERENCE",
  IMPLEMENTED_AND_TESTED: "IMPLEMENTED_AND_TESTED"
});

/**
 * Catalog of the 43 Proxy Means Test variables identified through external disclosures
 * and investigative reporting (provisional pending official SHA operational codebook release).
 * Note: These variables are NOT statutorily enumerated in Regulation 21 or the Fifth Schedule.
 */
export const SHA_REG21_PROXY_VARIABLES = Object.freeze([
  // Household Demographics (6 variables)
  { id: "hh_size", label: "Household Size", category: "DEMOGRAPHICS", unit: "COUNT", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "dep_ratio", label: "Dependency Ratio", category: "DEMOGRAPHICS", unit: "RATIO", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "female_head", label: "Female Headed Household Indicator", category: "DEMOGRAPHICS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "head_age", label: "Age of Household Head", category: "DEMOGRAPHICS", unit: "YEARS", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "head_educ_level", label: "Education Level of Head", category: "DEMOGRAPHICS", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "child_under5_count", label: "Number of Children Under 5", category: "DEMOGRAPHICS", unit: "COUNT", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },

  // Housing Characteristics & Amenities (12 variables)
  { id: "roof_material", label: "Roof Material", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "wall_material", label: "Wall Material", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "floor_material", label: "Floor Material", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "tenure_status", label: "Housing Tenure (Owner/Tenant)", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "rooms_count", label: "Habitable Rooms Count", category: "HOUSING", unit: "COUNT", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "water_source", label: "Primary Drinking Water Source", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "water_distance", label: "Distance to Water Source", category: "HOUSING", unit: "METERS_OR_MINUTES", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "toilet_type", label: "Toilet Facility Type", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "toilet_shared", label: "Shared Sanitation Indicator", category: "HOUSING", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "cooking_fuel", label: "Primary Cooking Fuel", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "lighting_fuel", label: "Primary Lighting Fuel", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "waste_disposal", label: "Solid Waste Disposal Method", category: "HOUSING", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },

  // Durable Assets & Productive Equipment (14 variables)
  { id: "asset_electricity_grid", label: "Electricity Grid Connection", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_solar_panel", label: "Solar Energy System", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_tv", label: "Television Set Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_radio", label: "Radio Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_refrigerator", label: "Refrigerator Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_motor_vehicle", label: "Car/Truck Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_motorcycle", label: "Motorcycle (Boda Boda) Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_bicycle", label: "Bicycle Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_smart_phone", label: "Smartphone Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_computer_laptop", label: "Computer/Laptop Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_washing_machine", label: "Washing Machine Ownership", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_internet_broadband", label: "Home Broadband Internet", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_generator", label: "Power Generator", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "asset_tractor", label: "Agricultural Tractor", category: "ASSETS", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },

  // Agricultural & Livestock Holdings (6 variables)
  { id: "land_ownership_acres", label: "Agricultural Land Owned (Acres)", category: "AGRICULTURE", unit: "ACRES", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "land_tenure_title", label: "Land Title Deed Possession", category: "AGRICULTURE", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "livestock_cattle_count", label: "Number of Cattle Owned", category: "AGRICULTURE", unit: "COUNT", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "livestock_shoats_count", label: "Number of Sheep/Goats Owned", category: "AGRICULTURE", unit: "COUNT", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "livestock_poultry_count", label: "Number of Poultry Owned", category: "AGRICULTURE", unit: "COUNT", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "irrigation_access", label: "Access to Irrigation Infrastructure", category: "AGRICULTURE", unit: "BINARY", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },

  // Geographic & Regional Stratification (5 variables)
  { id: "county_code", label: "County of Residence (1-47)", category: "GEOGRAPHY", unit: "COUNTY_CODE", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "subcounty_code", label: "Sub-County Administrative Unit", category: "GEOGRAPHY", unit: "ADMIN_CODE", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "urban_rural_designation", label: "Urban or Rural Stratum", category: "GEOGRAPHY", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "agro_ecological_zone", label: "Agro-Ecological Zone / Aridity Index", category: "GEOGRAPHY", unit: "CATEGORICAL", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" },
  { id: "distance_tarmac_road", label: "Distance to Nearest All-Weather Road", category: "GEOGRAPHY", unit: "KILOMETERS", status: "PROVISIONAL_EXTERNAL_DISCLOSURE" }
]);

/**
 * The Master Baseline Specification Record for official SHA Regulation 21 PMT.
 */
export const OFFICIAL_SHA_BASELINE_SPECIFICATION = Object.freeze({
  specId: "SHA-BASELINE-REG21-PROVISIONAL",
  officialModelName: "Official SHA Means-Testing Instrument — Implementation Details Pending Verification",
  legalBasis: "Social Health Insurance Act, 2023 (Section 27); Social Health Insurance Regulations, 2024 (Regulations 18, 19, and 21(6), Fifth Schedule; with salaried under Reg 17(1)–(2) and lawful custody under Reg 20)",
  status: SHA_BASELINE_STATUSES.NOT_CONFIGURED,
  effectivePeriod: {
    startDate: "2024-10-01",
    endDate: null,
    isCurrent: true
  },
  urbanModelSpecification: {
    status: "UNAVAILABLE",
    variableCount: 43,
    coefficients: null,
    intercept: null,
    fixedEffects: null,
    notes: "Urban regression coefficients and constant have not been officially published by SHA."
  },
  ruralModelSpecification: {
    status: "UNAVAILABLE",
    variableCount: 43,
    coefficients: null,
    intercept: null,
    fixedEffects: null,
    notes: "Rural regression coefficients and constant have not been officially published by SHA."
  },
  inputVariableDictionary: SHA_REG21_PROXY_VARIABLES,
  preprocessingRules: {
    status: "UNAVAILABLE",
    categoricalEncodings: null,
    continuousScaling: null,
    outlierTreatments: null,
    notes: "Categorical dummy variable encodings and reference categories have not been disclosed."
  },
  missingValueRules: {
    status: "UNAVAILABLE",
    imputationMethod: null,
    fallbackValues: null,
    notes: "System behavior for missing proxy survey responses is undisclosed."
  },
  derivedVariableDefinitions: {
    status: "UNAVAILABLE",
    dependencyRatioFormula: null,
    notes: "Exact formula for calculating dependency ratio from member roster is undisclosed."
  },
  outputTransformation: {
    status: "UNAVAILABLE",
    targetMetric: "Log per-capita consumption or poverty score",
    scaleTransformation: null,
    notes: "Mathematical transformation from raw regression output to welfare rank is undisclosed."
  },
  contributionMappingRules: {
    status: "PARTIALLY_DOCUMENTED",
    statutoryAnnualRate: 0.0275,
    minimumContributionMonthly: 300,
    maximumContributionMonthly: null, // Removed under SHIF regulations
    scoreBands: null,
    subsidyThresholdPovertyScore: null,
    notes: "Regulation 18(1) establishes the annual contribution for non-salaried households at 2.75% of household income determined via Regulation 21(6) Fifth Schedule, with Regulation 18(2) providing a KSh 300/mo minimum. Regulation 19 governs financial assistance. The complete operational coefficients, encoding rules, and cutoff algorithms deployed by SHA remain undisclosed."
  },
  officialSourceReferences: [
    "Social Health Insurance Act, 2023 (Section 27)",
    "Social Health Insurance Regulations, 2024 (Regulations 18, 19, and 21(6), Fifth Schedule 'Means Testing')",
    "Note: While the Fifth Schedule sets out an urban/rural means-testing equation, complete operational parameters, coefficients, and implementation rules remain undisclosed by SHA.",
    "Investigative disclosures: Africa Uncensored / Lighthouse Reports / The Guardian (May 2026)"
  ],
  independentTechnicalReviewer: null,
  verificationTestCases: [],
  implementationCommit: null
});

/**
 * Checks whether the official SHA baseline specification is fully reconstructed and evaluable.
 *
 * Returns { isComplete, status, missingComponents, explanation }
 */
export function validateShaBaselineCompleteness(spec = OFFICIAL_SHA_BASELINE_SPECIFICATION) {
  const missingComponents = [];

  if (!spec.urbanModelSpecification?.coefficients || Object.keys(spec.urbanModelSpecification.coefficients).length === 0) {
    missingComponents.push("Urban regression coefficients and constant term");
  }

  if (!spec.ruralModelSpecification?.coefficients || Object.keys(spec.ruralModelSpecification.coefficients).length === 0) {
    missingComponents.push("Rural regression coefficients and constant term");
  }

  if (!spec.preprocessingRules?.categoricalEncodings) {
    missingComponents.push("Categorical dummy variable encoding rules and base references");
  }

  if (!spec.missingValueRules?.imputationMethod) {
    missingComponents.push("Missing survey response imputation and default handling rules");
  }

  if (!spec.outputTransformation?.scaleTransformation) {
    missingComponents.push("Score output scaling and welfare percentile conversion functions");
  }

  if (!spec.contributionMappingRules?.scoreBands) {
    missingComponents.push("Score-to-contribution tier bracket cutoff schedule");
  }

  if (!spec.verificationTestCases || spec.verificationTestCases.length === 0) {
    missingComponents.push("Verified test case examples with official inputs and expected outputs");
  }

  const isComplete = missingComponents.length === 0;

  let status = SHA_BASELINE_STATUSES.PARTIALLY_DOCUMENTED;
  if (!spec.urbanModelSpecification && !spec.ruralModelSpecification) {
    status = SHA_BASELINE_STATUSES.NOT_CONFIGURED;
  } else if (isComplete && spec.independentTechnicalReviewer) {
    status = SHA_BASELINE_STATUSES.VERIFIED_AGAINST_REFERENCE;
  }

  const explanation = isComplete
    ? "Official SHA baseline specification is complete, documented, and ready for verification."
    : `The official SHA baseline cannot be reconstructed. ${missingComponents.length} essential technical components have not been officially published or verified: ${missingComponents.join("; ")}. Evaluators must NOT guess or fabricate these parameters.`;

  return {
    isComplete,
    status,
    missingComponents,
    explanation
  };
}
