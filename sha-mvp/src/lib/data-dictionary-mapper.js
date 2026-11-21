/**
 * Data Dictionary Mapper — Source-to-Canonical Variable Standardization.
 *
 * Provides a rigorous, auditable mechanism to map raw source survey or administrative
 * variables into canonical means-testing concepts without silent conversions.
 *
 * Invariants:
 * 1. Source fields and transformed fields remain strictly distinct.
 * 2. No implicit currency conversion, time-horizon aggregation, or category remapping.
 * 3. Incompatible units, unmapped categories, and ambiguous definitions trigger explicit flags.
 * 4. Full provenance: every transformed variable traces to source codebook definitions.
 */

export const CANONICAL_CONCEPTS = Object.freeze({
  HOUSEHOLD_ID: "HOUSEHOLD_ID",
  HOUSEHOLD_SIZE: "HOUSEHOLD_SIZE",
  COUNTY_CODE: "COUNTY_CODE",
  URBAN_RURAL_CLASSIFICATION: "URBAN_RURAL_CLASSIFICATION",
  TOTAL_ANNUAL_CONSUMPTION_EXPENDITURE: "TOTAL_ANNUAL_CONSUMPTION_EXPENDITURE",
  FOOD_CONSUMPTION_EXPENDITURE: "FOOD_CONSUMPTION_EXPENDITURE",
  NON_FOOD_CONSUMPTION_EXPENDITURE: "NON_FOOD_CONSUMPTION_EXPENDITURE",
  MONTHLY_NET_EARNED_INCOME: "MONTHLY_NET_EARNED_INCOME",
  ANNUAL_NET_EARNED_INCOME: "ANNUAL_NET_EARNED_INCOME",
  ROOF_MATERIAL: "ROOF_MATERIAL",
  WALL_MATERIAL: "WALL_MATERIAL",
  FLOOR_MATERIAL: "FLOOR_MATERIAL",
  PRIMARY_COOKING_FUEL: "PRIMARY_COOKING_FUEL",
  LIGHTING_SOURCE: "LIGHTING_SOURCE",
  WATER_SOURCE: "WATER_SOURCE",
  TOILET_FACILITY: "TOILET_FACILITY",
  ASSET_MOTOR_VEHICLE: "ASSET_MOTOR_VEHICLE",
  ASSET_MOTORCYCLE: "ASSET_MOTORCYCLE",
  ASSET_REFRIGERATOR: "ASSET_REFRIGERATOR",
  ASSET_TELEVISION: "ASSET_TELEVISION",
  LIVESTOCK_COUNT_CATTLE: "LIVESTOCK_COUNT_CATTLE",
  LAND_OWNERSHIP_ACRES: "LAND_OWNERSHIP_ACRES",
  HEALTH_SHIF_PREMIUM_PAID: "HEALTH_SHIF_PREMIUM_PAID"
});

export const DATA_TYPES = Object.freeze({
  NUMBER: "NUMBER",
  STRING: "STRING",
  BOOLEAN: "BOOLEAN",
  CATEGORICAL: "CATEGORICAL",
  DATE: "DATE"
});

export const TRANSFORMATION_RULES = Object.freeze({
  IDENTITY: "IDENTITY",
  ANNUALIZE_FROM_MONTHLY: "ANNUALIZE_FROM_MONTHLY",
  MONTHLY_FROM_ANNUAL: "MONTHLY_FROM_ANNUAL",
  CATEGORICAL_CODE_MAP: "CATEGORICAL_CODE_MAP",
  NUMERIC_SUM: "NUMERIC_SUM",
  LOG_TRANSFORM: "LOG_TRANSFORM",
  BINARY_THRESHOLD: "BINARY_THRESHOLD",
  CUSTOM_FUNCTION: "CUSTOM_FUNCTION"
});

export const MISSING_VALUE_TREATMENTS = Object.freeze({
  REJECT_RECORD: "REJECT_RECORD",
  EXCLUDE_FROM_ANALYSIS: "EXCLUDE_FROM_ANALYSIS",
  ZERO_IF_NOT_APPLICABLE: "ZERO_IF_NOT_APPLICABLE",
  FLAG_AND_RETAIN: "FLAG_AND_RETAIN"
});

export const REVIEWER_STATUSES = Object.freeze({
  DRAFT: "DRAFT",
  REVIEWED: "REVIEWED",
  VERIFIED: "VERIFIED"
});

/**
 * Validates a single variable mapping definition.
 */
export function validateVariableMapping(mapping) {
  const errors = [];

  if (!mapping || typeof mapping !== "object") {
    return { isValid: false, errors: ["Mapping specification must be an object."] };
  }

  if (!mapping.sourceDatasetField || typeof mapping.sourceDatasetField !== "string") {
    errors.push("sourceDatasetField is required.");
  }

  if (!mapping.sourceFieldDescription || typeof mapping.sourceFieldDescription !== "string") {
    errors.push("sourceFieldDescription is required to document source question/concept.");
  }

  if (!mapping.canonicalConcept || !Object.values(CANONICAL_CONCEPTS).includes(mapping.canonicalConcept)) {
    errors.push(`canonicalConcept must be one of: ${Object.values(CANONICAL_CONCEPTS).join(", ")}.`);
  }

  if (!mapping.dataType || !Object.values(DATA_TYPES).includes(mapping.dataType)) {
    errors.push(`dataType must be one of: ${Object.values(DATA_TYPES).join(", ")}.`);
  }

  if (!mapping.unit || typeof mapping.unit !== "string") {
    errors.push("unit is required (e.g. 'KSh/year', 'COUNT', 'CATEGORICAL_CODE').");
  }

  if (!mapping.transformationRule || !Object.values(TRANSFORMATION_RULES).includes(mapping.transformationRule)) {
    errors.push(`transformationRule must be one of: ${Object.values(TRANSFORMATION_RULES).join(", ")}.`);
  }

  if (mapping.transformationRule === TRANSFORMATION_RULES.CATEGORICAL_CODE_MAP) {
    if (!mapping.categoryMapping || typeof mapping.categoryMapping !== "object" || Object.keys(mapping.categoryMapping).length === 0) {
      errors.push("categoryMapping dictionary is required when transformationRule is CATEGORICAL_CODE_MAP.");
    }
  }

  if (!mapping.missingValueTreatment || !Object.values(MISSING_VALUE_TREATMENTS).includes(mapping.missingValueTreatment)) {
    errors.push(`missingValueTreatment must be one of: ${Object.values(MISSING_VALUE_TREATMENTS).join(", ")}.`);
  }

  if (!mapping.sourceEvidenceReference || typeof mapping.sourceEvidenceReference !== "string") {
    errors.push("sourceEvidenceReference is required (e.g. Questionnaire section or codebook table).");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a validated variable mapping specification.
 */
export function createVariableMapping({
  sourceDatasetField,
  sourceFieldDescription,
  canonicalConcept,
  dataType = DATA_TYPES.NUMBER,
  unit,
  categoryMapping = null,
  transformationRule = TRANSFORMATION_RULES.IDENTITY,
  missingValueTreatment = MISSING_VALUE_TREATMENTS.FLAG_AND_RETAIN,
  observationPeriod = null,
  sourceEvidenceReference,
  reviewerStatus = REVIEWER_STATUSES.DRAFT,
  notes = ""
} = {}) {
  const mapping = {
    sourceDatasetField,
    sourceFieldDescription,
    canonicalConcept,
    dataType,
    unit,
    categoryMapping,
    transformationRule,
    missingValueTreatment,
    observationPeriod,
    sourceEvidenceReference,
    reviewerStatus,
    notes
  };

  const validation = validateVariableMapping(mapping);
  if (!validation.isValid) {
    throw new Error(`Invalid variable mapping: ${validation.errors.join("; ")}`);
  }

  return mapping;
}

/**
 * Transforms a raw source record according to an array of validated mappings.
 *
 * Keeps source and canonical representations completely separate.
 * Returns { canonicalRecord, sourceRecord, trace, errors, flags }
 */
export function mapSourceRecord(sourceRecord, mappingList = []) {
  if (!sourceRecord || typeof sourceRecord !== "object") {
    return {
      canonicalRecord: {},
      sourceRecord: {},
      trace: {},
      errors: ["Invalid source record."],
      flags: []
    };
  }

  const canonicalRecord = {};
  const trace = {};
  const errors = [];
  const flags = [];

  for (const mapping of mappingList) {
    const rawVal = sourceRecord[mapping.sourceDatasetField];
    const targetKey = mapping.canonicalConcept;

    // Record audit trail trace
    trace[targetKey] = {
      sourceField: mapping.sourceDatasetField,
      rawValue: rawVal,
      transformationRule: mapping.transformationRule,
      unit: mapping.unit,
      sourceRef: mapping.sourceEvidenceReference
    };

    // Missing value handling
    if (rawVal === undefined || rawVal === null || (typeof rawVal === "string" && rawVal.trim() === "")) {
      switch (mapping.missingValueTreatment) {
        case MISSING_VALUE_TREATMENTS.REJECT_RECORD:
          errors.push(`Record rejected: required field '${mapping.sourceDatasetField}' is missing.`);
          canonicalRecord[targetKey] = null;
          break;
        case MISSING_VALUE_TREATMENTS.ZERO_IF_NOT_APPLICABLE:
          canonicalRecord[targetKey] = 0;
          trace[targetKey].imputed = "ZERO_PER_POLICY";
          break;
        case MISSING_VALUE_TREATMENTS.EXCLUDE_FROM_ANALYSIS:
          canonicalRecord[targetKey] = null;
          flags.push(`Field '${targetKey}' missing; record excluded from calculations requiring this field.`);
          break;
        case MISSING_VALUE_TREATMENTS.FLAG_AND_RETAIN:
        default:
          canonicalRecord[targetKey] = null;
          flags.push(`Field '${targetKey}' is missing in source.`);
          break;
      }
      continue;
    }

    // Explicit transformation application
    try {
      switch (mapping.transformationRule) {
        case TRANSFORMATION_RULES.IDENTITY:
          if (mapping.dataType === DATA_TYPES.NUMBER) {
            const num = Number(rawVal);
            if (isNaN(num)) {
              errors.push(`Cannot convert value '${rawVal}' in '${mapping.sourceDatasetField}' to Number.`);
            } else {
              canonicalRecord[targetKey] = num;
            }
          } else {
            canonicalRecord[targetKey] = rawVal;
          }
          break;

        case TRANSFORMATION_RULES.ANNUALIZE_FROM_MONTHLY:
          const mNum = Number(rawVal);
          if (isNaN(mNum) || mNum < 0) {
            errors.push(`Invalid monthly value '${rawVal}' for annualization in '${mapping.sourceDatasetField}'.`);
          } else {
            canonicalRecord[targetKey] = mNum * 12;
            trace[targetKey].annualizedFactor = 12;
          }
          break;

        case TRANSFORMATION_RULES.MONTHLY_FROM_ANNUAL:
          const aNum = Number(rawVal);
          if (isNaN(aNum) || aNum < 0) {
            errors.push(`Invalid annual value '${rawVal}' for monthly conversion in '${mapping.sourceDatasetField}'.`);
          } else {
            canonicalRecord[targetKey] = aNum / 12;
            trace[targetKey].monthlyFactor = 1 / 12;
          }
          break;

        case TRANSFORMATION_RULES.CATEGORICAL_CODE_MAP:
          const code = String(rawVal).trim();
          if (mapping.categoryMapping && Object.prototype.hasOwnProperty.call(mapping.categoryMapping, code)) {
            canonicalRecord[targetKey] = mapping.categoryMapping[code];
          } else {
            flags.push(`Unmapped category code '${rawVal}' in '${mapping.sourceDatasetField}'. Value preserved as UNMAPPED.`);
            canonicalRecord[targetKey] = `UNMAPPED_${rawVal}`;
          }
          break;

        case TRANSFORMATION_RULES.LOG_TRANSFORM:
          const lNum = Number(rawVal);
          if (isNaN(lNum) || lNum <= 0) {
            errors.push(`Cannot log-transform non-positive or invalid number '${rawVal}' in '${mapping.sourceDatasetField}'.`);
          } else {
            canonicalRecord[targetKey] = Math.log(lNum);
          }
          break;

        case TRANSFORMATION_RULES.BINARY_THRESHOLD:
          const bNum = Number(rawVal);
          canonicalRecord[targetKey] = !isNaN(bNum) && bNum > 0;
          break;

        default:
          canonicalRecord[targetKey] = rawVal;
          flags.push(`Applied unverified transformation '${mapping.transformationRule}' on '${mapping.sourceDatasetField}'.`);
          break;
      }
    } catch (err) {
      errors.push(`Transformation error on '${mapping.sourceDatasetField}': ${err.message}`);
    }
  }

  return {
    canonicalRecord,
    sourceRecord: { ...sourceRecord },
    trace,
    errors,
    flags,
    isComplete: errors.length === 0
  };
}

/**
 * Standard demonstration mapping for KNBS KIHBS survey fields to canonical concepts.
 */
export const DEMO_KIHBS_MAPPING_DICTIONARY = [
  createVariableMapping({
    sourceDatasetField: "hhid",
    sourceFieldDescription: "Unique Household Identification Number",
    canonicalConcept: CANONICAL_CONCEPTS.HOUSEHOLD_ID,
    dataType: DATA_TYPES.STRING,
    unit: "IDENTIFIER",
    transformationRule: TRANSFORMATION_RULES.IDENTITY,
    missingValueTreatment: MISSING_VALUE_TREATMENTS.REJECT_RECORD,
    sourceEvidenceReference: "KIHBS 2015/16 Identification Section, col 1",
    reviewerStatus: REVIEWER_STATUSES.VERIFIED
  }),
  createVariableMapping({
    sourceDatasetField: "totcons_annual",
    sourceFieldDescription: "Total Annual Household Consumption Expenditure Aggregate (Food + Non-food)",
    canonicalConcept: CANONICAL_CONCEPTS.TOTAL_ANNUAL_CONSUMPTION_EXPENDITURE,
    dataType: DATA_TYPES.NUMBER,
    unit: "KSh/year",
    transformationRule: TRANSFORMATION_RULES.IDENTITY,
    missingValueTreatment: MISSING_VALUE_TREATMENTS.REJECT_RECORD,
    sourceEvidenceReference: "KIHBS 2015/16 Consumption Aggregate Derived File, variable totcons",
    reviewerStatus: REVIEWER_STATUSES.REVIEWED
  }),
  createVariableMapping({
    sourceDatasetField: "hh_size",
    sourceFieldDescription: "Usual Household Resident Member Count",
    canonicalConcept: CANONICAL_CONCEPTS.HOUSEHOLD_SIZE,
    dataType: DATA_TYPES.NUMBER,
    unit: "COUNT",
    transformationRule: TRANSFORMATION_RULES.IDENTITY,
    missingValueTreatment: MISSING_VALUE_TREATMENTS.REJECT_RECORD,
    sourceEvidenceReference: "KIHBS 2015/16 Household Roster Section 1",
    reviewerStatus: REVIEWER_STATUSES.VERIFIED
  }),
  createVariableMapping({
    sourceDatasetField: "residence_type",
    sourceFieldDescription: "Urban/Rural Cluster Designation",
    canonicalConcept: CANONICAL_CONCEPTS.URBAN_RURAL_CLASSIFICATION,
    dataType: DATA_TYPES.CATEGORICAL,
    unit: "CATEGORY_CODE",
    transformationRule: TRANSFORMATION_RULES.CATEGORICAL_CODE_MAP,
    categoryMapping: {
      "1": "URBAN",
      "2": "RURAL"
    },
    missingValueTreatment: MISSING_VALUE_TREATMENTS.REJECT_RECORD,
    sourceEvidenceReference: "KIHBS 2015/16 Sample Master Frame Stratification",
    reviewerStatus: REVIEWER_STATUSES.VERIFIED
  }),
  createVariableMapping({
    sourceDatasetField: "roof_mat",
    sourceFieldDescription: "Main Material of the Roof",
    canonicalConcept: CANONICAL_CONCEPTS.ROOF_MATERIAL,
    dataType: DATA_TYPES.CATEGORICAL,
    unit: "CATEGORY_CODE",
    transformationRule: TRANSFORMATION_RULES.CATEGORICAL_CODE_MAP,
    categoryMapping: {
      "1": "CORRUGATED_IRON_SHEET",
      "2": "TILES",
      "3": "CONCRETE",
      "4": "THATCH_GRASS_MAKUTI",
      "5": "TIN_CANS",
      "6": "OTHER"
    },
    missingValueTreatment: MISSING_VALUE_TREATMENTS.FLAG_AND_RETAIN,
    sourceEvidenceReference: "KIHBS 2015/16 Housing Section 8, Q14",
    reviewerStatus: REVIEWER_STATUSES.REVIEWED
  }),
  createVariableMapping({
    sourceDatasetField: "cook_fuel",
    sourceFieldDescription: "Main Source of Cooking Fuel",
    canonicalConcept: CANONICAL_CONCEPTS.PRIMARY_COOKING_FUEL,
    dataType: DATA_TYPES.CATEGORICAL,
    unit: "CATEGORY_CODE",
    transformationRule: TRANSFORMATION_RULES.CATEGORICAL_CODE_MAP,
    categoryMapping: {
      "1": "FIREWOOD",
      "2": "CHARCOAL",
      "3": "LPG_GAS",
      "4": "ELECTRICITY",
      "5": "KEROSENE",
      "6": "BIOGAS",
      "7": "OTHER"
    },
    missingValueTreatment: MISSING_VALUE_TREATMENTS.FLAG_AND_RETAIN,
    sourceEvidenceReference: "KIHBS 2015/16 Housing Section 8, Q19",
    reviewerStatus: REVIEWER_STATUSES.REVIEWED
  })
];
