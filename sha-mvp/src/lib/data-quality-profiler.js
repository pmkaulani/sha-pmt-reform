/**
 * Data Quality Profiler — Deterministic Data Quality Auditing.
 *
 * Implements automated, deterministic data-quality checks for candidate survey
 * and administrative microdata files.
 *
 * Methodological Invariants:
 * 1. ZERO silent record deletion: all inspected records remain accounted for.
 * 2. ZERO automatic imputation: missing values are reported and quantified, never quietly filled.
 * 3. ZERO outlier clipping: anomalous values are flagged for expert review, never clamped.
 * 4. Non-accusatory: statistical anomalies are never labeled "fraudulent" or "dishonest".
 * 5. Documented bounds only: plausibility ranges must tie directly to official survey guidelines.
 */

export const QUALITY_CHECK_SEVERITY = Object.freeze({
  CRITICAL: "CRITICAL",
  WARNING: "WARNING",
  INFO: "INFO"
});

/**
 * Standard survey plausibility rules documented from KNBS and national survey guidelines.
 */
export const DOCUMENTED_PLAUSIBILITY_RULES = Object.freeze({
  HOUSEHOLD_SIZE: { min: 1, max: 35, doc: "KNBS KIHBS 2015/16 Roster Guidelines (max observed standard household)" },
  HH_SIZE: { min: 1, max: 35, doc: "KNBS KIHBS 2015/16 Roster Guidelines (max observed standard household)" },
  MONTHLY_CONSUMPTION: { min: 500, max: 20000000, doc: "KNBS National Poverty Lines / Extreme Consumption Bound" },
  ANNUAL_CONSUMPTION: { min: 6000, max: 240000000, doc: "KNBS National Poverty Lines / Extreme Annual Bound" },
  TOTCONS_ANNUAL: { min: 6000, max: 240000000, doc: "KNBS National Poverty Lines / Extreme Annual Bound" },
  AGE_YEARS: { min: 0, max: 120, doc: "Standard Demographic Bounds" }
});

/**
 * Runs a comprehensive deterministic data-quality profile on an array of records.
 *
 * @param {Array<object>} records - Array of data rows (raw or mapped)
 * @param {object} options
 * @param {string} options.idField - Field name containing unique record ID
 * @param {Array<string>} options.requiredFields - Array of mandatory field names
 * @param {object} options.rangeRules - Custom range rules { field: { min, max, doc } }
 * @param {number} options.missingRateThreshold - Rate at which missingness becomes CRITICAL (default 0.20)
 * @returns {object} Profiler report
 */
export function profileDatasetQuality(records = [], {
  idField = "id",
  requiredFields = [],
  rangeRules = DOCUMENTED_PLAUSIBILITY_RULES,
  missingRateThreshold = 0.20
} = {}) {
  const report = {
    recordsInspected: 0,
    checksPerformed: [
      "DUPLICATE_IDENTIFIERS",
      "MISSING_REQUIRED_FIELDS",
      "NON_FINITE_NUMBERS",
      "NEGATIVE_RESTRICTED_VALUES",
      "INVALID_DATES",
      "DOCUMENTED_RANGE_ANOMALIES",
      "HIGH_MISSINGNESS_RATE"
    ],
    findingsBySeverity: {
      [QUALITY_CHECK_SEVERITY.CRITICAL]: [],
      [QUALITY_CHECK_SEVERITY.WARNING]: [],
      [QUALITY_CHECK_SEVERITY.INFO]: []
    },
    fieldLevelMissingness: {},
    duplicateCounts: 0,
    invalidValueCounts: {
      duplicates: 0,
      missingRequired: 0,
      nonFiniteNumbers: 0,
      negativeValues: 0,
      invalidDates: 0,
      rangeAnomalies: 0
    },
    exclusionRecommendations: []
  };

  if (!Array.isArray(records) || records.length === 0) {
    report.findingsBySeverity[QUALITY_CHECK_SEVERITY.CRITICAL].push({
      code: "EMPTY_DATASET",
      message: "No records provided for quality profiling."
    });
    return report;
  }

  report.recordsInspected = records.length;
  const seenIds = new Set();
  const duplicateIds = new Set();
  const allFields = new Set(requiredFields);

  // Discover all fields in the dataset for missingness tracking
  for (const row of records) {
    if (row && typeof row === "object") {
      Object.keys(row).forEach(k => allFields.add(k));
    }
  }

  // Initialize field-level missingness stats
  for (const field of allFields) {
    report.fieldLevelMissingness[field] = {
      missingCount: 0,
      totalCount: records.length,
      missingRate: 0
    };
  }

  // Row-by-row deterministic inspection
  records.forEach((row, idx) => {
    const rowId = row?.[idField] ?? `row-index-${idx}`;

    // 1. Duplicate ID check
    if (seenIds.has(rowId)) {
      duplicateIds.add(rowId);
      report.invalidValueCounts.duplicates++;
      report.findingsBySeverity[QUALITY_CHECK_SEVERITY.CRITICAL].push({
        code: "DUPLICATE_IDENTIFIER",
        recordId: rowId,
        message: `Duplicate record identifier '${rowId}' detected.`
      });
      report.exclusionRecommendations.push({
        recordId: rowId,
        checkType: "DUPLICATE_IDENTIFIER",
        reason: "Duplicate record ID introduces false weighting and correlation bias."
      });
    } else {
      seenIds.add(rowId);
    }

    // 2. Missing required fields and missingness calculation
    for (const field of allFields) {
      const val = row?.[field];
      const isMissing = val === undefined || val === null || (typeof val === "string" && val.trim() === "");

      if (isMissing) {
        report.fieldLevelMissingness[field].missingCount++;

        if (requiredFields.includes(field)) {
          report.invalidValueCounts.missingRequired++;
          report.findingsBySeverity[QUALITY_CHECK_SEVERITY.CRITICAL].push({
            code: "MISSING_REQUIRED_FIELD",
            recordId: rowId,
            field,
            message: `Mandatory field '${field}' is missing for record '${rowId}'.`
          });
          report.exclusionRecommendations.push({
            recordId: rowId,
            checkType: "MISSING_REQUIRED_FIELD",
            reason: `Mandatory field '${field}' is missing; complete case analysis cannot proceed.`
          });
        }
      }
    }

    // 3. Numeric validity and plausibility bounds
    if (row && typeof row === "object") {
      for (const [key, val] of Object.entries(row)) {
        if (typeof val === "number") {
          // Check for NaN or Infinite values
          if (!Number.isFinite(val)) {
            report.invalidValueCounts.nonFiniteNumbers++;
            report.findingsBySeverity[QUALITY_CHECK_SEVERITY.CRITICAL].push({
              code: "NON_FINITE_NUMBER",
              recordId: rowId,
              field: key,
              message: `Field '${key}' contains non-finite number (${val}) in record '${rowId}'.`
            });
            report.exclusionRecommendations.push({
              recordId: rowId,
              checkType: "NON_FINITE_NUMBER",
              reason: `Non-finite number (${val}) invalidates algebraic evaluation.`
            });
          }

          // Check for negative consumption or household size
          if ((key.toLowerCase().includes("cons") || key.toLowerCase().includes("size") || key.toLowerCase().includes("count")) && val < 0) {
            report.invalidValueCounts.negativeValues++;
            report.findingsBySeverity[QUALITY_CHECK_SEVERITY.CRITICAL].push({
              code: "NEGATIVE_NON_NEGATIVE_FIELD",
              recordId: rowId,
              field: key,
              message: `Field '${key}' has negative value (${val}) where strictly non-negative is required.`
            });
            report.exclusionRecommendations.push({
              recordId: rowId,
              checkType: "NEGATIVE_NON_NEGATIVE_FIELD",
              reason: `Negative value (${val}) violates domain definition for '${key}'.`
            });
          }

          // Check documented plausibility bounds
          const ruleKey = Object.keys(rangeRules).find(r => key.toUpperCase().includes(r));
          if (ruleKey && rangeRules[ruleKey]) {
            const rule = rangeRules[ruleKey];
            if (val < rule.min || val > rule.max) {
              report.invalidValueCounts.rangeAnomalies++;
              report.findingsBySeverity[QUALITY_CHECK_SEVERITY.WARNING].push({
                code: "DOCUMENTED_RANGE_ANOMALY",
                recordId: rowId,
                field: key,
                value: val,
                allowedRange: `[${rule.min}, ${rule.max}]`,
                referenceDoc: rule.doc,
                message: `Value ${val} in '${key}' exceeds documented plausibility range [${rule.min}, ${rule.max}]. Flagged for expert investigation.`
              });
              // Notice: Range anomaly is a WARNING, not an automatic exclusion recommendation.
            }
          }
        }

        // Date sanity check if field indicates date
        if (typeof val === "string" && key.toLowerCase().includes("date")) {
          const parsed = Date.parse(val);
          if (isNaN(parsed)) {
            report.invalidValueCounts.invalidDates++;
            report.findingsBySeverity[QUALITY_CHECK_SEVERITY.WARNING].push({
              code: "INVALID_DATE_FORMAT",
              recordId: rowId,
              field: key,
              value: val,
              message: `Field '${key}' has unparseable date '${val}'.`
            });
          }
        }
      }
    }
  });

  // Calculate missing rates and aggregate missingness warnings
  report.duplicateCounts = duplicateIds.size;
  for (const [field, stats] of Object.entries(report.fieldLevelMissingness)) {
    stats.missingRate = records.length > 0 ? stats.missingCount / records.length : 0;
    if (stats.missingRate >= missingRateThreshold) {
      report.findingsBySeverity[QUALITY_CHECK_SEVERITY.WARNING].push({
        code: "HIGH_MISSINGNESS_RATE",
        field,
        missingRate: (stats.missingRate * 100).toFixed(1) + "%",
        message: `Field '${field}' has ${stats.missingCount} missing values (${(stats.missingRate * 100).toFixed(1)}%), exceeding threshold of ${(missingRateThreshold * 100)}%.`
      });
    }
  }

  // Summary recommendation flag
  report.hasCriticalIssues = report.findingsBySeverity[QUALITY_CHECK_SEVERITY.CRITICAL].length > 0;
  report.isAcceptableForAnalysis = !report.hasCriticalIssues;

  return report;
}
