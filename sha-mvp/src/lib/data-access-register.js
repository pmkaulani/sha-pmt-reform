/**
 * Data Access Register — Research Prototype.
 *
 * Tracks datasets, technical documentation, and administrative records required
 * to perform an independent empirical validation of SHA means-testing methodologies.
 *
 * Strict Governance Invariant:
 * Requesting or receiving documentation does NOT equate to statutory authorisation
 * to process data for empirical evaluation. Every item is tracked with explicit,
 * auditable access and provenance statuses.
 */

export const ACCESS_STATUSES = Object.freeze({
  NOT_REQUESTED: "NOT_REQUESTED",
  REQUESTED: "REQUESTED",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  RECEIVED: "RECEIVED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED_FOR_USE: "APPROVED_FOR_USE",
  DECLINED: "DECLINED",
  NOT_AVAILABLE: "NOT_AVAILABLE"
});

export const RESOURCE_TYPES = Object.freeze({
  TECHNICAL_DOCUMENTATION: "TECHNICAL_DOCUMENTATION",
  VARIABLE_DICTIONARY: "VARIABLE_DICTIONARY",
  MODEL_SPECIFICATION: "MODEL_SPECIFICATION",
  TARIFF_SCHEDULE: "TARIFF_SCHEDULE",
  ADMINISTRATIVE_RECORDS: "ADMINISTRATIVE_RECORDS",
  SURVEY_MICRODATA: "SURVEY_MICRODATA",
  SURVEY_METADATA: "SURVEY_METADATA",
  DISPUTE_SUMMARY: "DISPUTE_SUMMARY"
});

/**
 * Standard registry of datasets and technical artifacts required for independent evaluation.
 */
export const DATA_ACCESS_REGISTER = [
  {
    resourceId: "SHA-DOC-MTI-TECH-SPEC",
    resourceName: "Official SHA Means-Testing Instrument Technical Documentation",
    responsibleInstitution: "Social Health Authority (SHA) / Ministry of Health",
    resourceType: RESOURCE_TYPES.TECHNICAL_DOCUMENTATION,
    purpose: "Verify the legal basis, econometric architecture, and official implementation guidelines for Regulation 21(6) and Fifth Schedule means testing.",
    requestedFields: "Algorithm specification, methodology paper, model design report, validation history.",
    requestDate: null,
    status: ACCESS_STATUSES.NOT_REQUESTED,
    dataOwnerContact: "Data Protection Officer / Director General, Social Health Authority",
    provenanceReference: "Social Health Insurance Regulations, 2024 (Regulations 18, 19, and 21(6), Fifth Schedule)",
    restrictionsAndLimitations: "Confidential government technical document; requires formal inter-agency disclosure request.",
    notesAndNextAction: "Prepare formal technical inquiry package to SHA under Kenya Data Protection Act 2019 research provisions (Sections 30 and 53)."
  },
  {
    resourceId: "SHA-DICT-REG21-VARS",
    resourceName: "Official SHA Means-Testing Variable Dictionary & Operational Codebook",
    responsibleInstitution: "Social Health Authority (SHA)",
    resourceType: RESOURCE_TYPES.VARIABLE_DICTIONARY,
    purpose: "Map household inputs exactly to SHA's 43 proxy variables without guessing definitions or question wordings.",
    requestedFields: "Question text, coding manuals, response categories, skip patterns, derived variable definitions.",
    requestDate: null,
    status: ACCESS_STATUSES.NOT_REQUESTED,
    dataOwnerContact: "Chief Information Officer, Social Health Authority",
    provenanceReference: "Regulation 21 means-testing framework and provisional external disclosures",
    restrictionsAndLimitations: "Operational survey instruments may be proprietary or restricted.",
    notesAndNextAction: "Include in formal SHA Technical Inquiries Schedule."
  },
  {
    resourceId: "SHA-PARAM-COEFFS-URBAN-RURAL",
    resourceName: "Official SHA Model Regression Coefficients & Intercepts (Urban & Rural)",
    responsibleInstitution: "Social Health Authority (SHA)",
    resourceType: RESOURCE_TYPES.MODEL_SPECIFICATION,
    purpose: "Reconstruct the exact deployed SHA score calculation to establish a reproducible baseline.",
    requestedFields: "Urban regression coefficients, rural regression coefficients, constants/intercepts, regional fixed effects, transformation functions.",
    requestDate: null,
    status: ACCESS_STATUSES.NOT_AVAILABLE,
    dataOwnerContact: "Director of Actuarial and Financial Services, Social Health Authority",
    provenanceReference: "Regulation 21(6) Fifth Schedule scoring equation",
    restrictionsAndLimitations: "Parameters are currently undisclosed in published regulations and gazette notices.",
    notesAndNextAction: "Baseline cannot be calculated until SHA officially releases or verifies parameters."
  },
  {
    resourceId: "SHA-TARIFF-SUBSIDY-TIERS",
    resourceName: "Official SHA Premium Tariff Bands & Subsidy Thresholds",
    responsibleInstitution: "Social Health Authority (SHA) / Ministry of Health",
    resourceType: RESOURCE_TYPES.TARIFF_SCHEDULE,
    purpose: "Map calculated proxy scores to statutory monthly contribution figures and indigent subsidy eligibility.",
    requestedFields: "Score-to-contribution lookup tables, cutoff scores for poverty subsidies, minimum/maximum clamping rules.",
    requestDate: null,
    status: ACCESS_STATUSES.PARTIALLY_RECEIVED,
    dataOwnerContact: "Policy & Planning Directorate, Ministry of Health",
    provenanceReference: "Regulation 18(1) & (2) (specifies 2.75% annual rate and KSh 300/mo minimum for non-salaried households; Regulation 19 governs financial assistance; Fifth Schedule sets out means testing equation)",
    restrictionsAndLimitations: "Published regulations state minimums but omit intermediate bracket mappings.",
    notesAndNextAction: "Request formal score band schedule."
  },
  {
    resourceId: "SHA-SAMPLE-ANON-RECORDS",
    resourceName: "Anonymised Historical SHA Assessment Records (Benchmarking Sample)",
    responsibleInstitution: "Social Health Authority (SHA)",
    resourceType: RESOURCE_TYPES.ADMINISTRATIVE_RECORDS,
    purpose: "Validate reconstructed baseline model against actual system scores on identical inputs.",
    requestedFields: "De-identified proxy inputs, computed proxy scores, assigned tariff tiers, date of assessment, urban/rural stratum.",
    requestDate: null,
    status: ACCESS_STATUSES.NOT_REQUESTED,
    dataOwnerContact: "Data Protection Officer, Social Health Authority",
    provenanceReference: "SHA Administrative Database",
    restrictionsAndLimitations: "Requires full ODPC Section 3 compliance, institutional data transfer agreement, and independent ethics review.",
    notesAndNextAction: "Draft Data Protection Impact Assessment (DPIA) and research data protocol."
  },
  {
    resourceId: "KNBS-KIHBS-MICRODATA",
    resourceName: "KNBS Kenya Integrated Household Budget Survey (KIHBS) Microdata",
    responsibleInstitution: "Kenya National Bureau of Statistics (KNBS)",
    resourceType: RESOURCE_TYPES.SURVEY_MICRODATA,
    purpose: "Provide independent, representative ground-truth consumption expenditure data for empirical model comparison.",
    requestedFields: "Household consumption expenditure aggregates, food/non-food shares, housing attributes, asset ownership, household demographics.",
    requestDate: null,
    status: ACCESS_STATUSES.NOT_REQUESTED,
    dataOwnerContact: "Director General, Kenya National Bureau of Statistics",
    provenanceReference: "KNBS National Household Survey Program (KIHBS 2015/16 or latest accessible round)",
    restrictionsAndLimitations: "Subject to KNBS microdata access policy, research licensing agreement, and strict confidentiality undertakings.",
    notesAndNextAction: "Submit KNBS Microdata Access Application via official KNBS portal."
  },
  {
    resourceId: "KNBS-KIHBS-SURVEY-DESIGN",
    resourceName: "KNBS KIHBS Survey Sampling Design, Strata & Weighting Metadata",
    responsibleInstitution: "Kenya National Bureau of Statistics (KNBS)",
    resourceType: RESOURCE_TYPES.SURVEY_METADATA,
    purpose: "Calculate statistically sound standard errors, confidence intervals, and county-representative metrics.",
    requestedFields: "Cluster identifiers, primary sampling units (PSU), stratum codes, household expansion weights.",
    requestDate: null,
    status: ACCESS_STATUSES.NOT_REQUESTED,
    dataOwnerContact: "Methodology and Statistical Coordination Directorate, KNBS",
    provenanceReference: "KNBS Master Sampling Frame (NASSEP V)",
    restrictionsAndLimitations: "Cluster location coordinates may be scrambled or restricted to prevent re-identification.",
    notesAndNextAction: "Include with KNBS microdata request."
  },
  {
    resourceId: "SHA-DISPUTE-AGGREGATES",
    resourceName: "SHA Member Assessment Dispute, Review & Appeal Statistical Summaries",
    responsibleInstitution: "Social Health Authority (SHA)",
    resourceType: RESOURCE_TYPES.DISPUTE_SUMMARY,
    purpose: "Analyze empirical failure modes, frequent dispute categories, and household misclassification patterns.",
    requestedFields: "Aggregated dispute volumes, dispute categories (income, assets, family size), adjustment rates, review outcomes.",
    requestDate: null,
    status: ACCESS_STATUSES.NOT_REQUESTED,
    dataOwnerContact: "Quality Assurance & Compliance Directorate, SHA",
    provenanceReference: "SHA Dispute Resolution / Appeals Records",
    restrictionsAndLimitations: "Requires aggregation to prevent disclosure of individual household appeals.",
    notesAndNextAction: "Request aggregated summary report from SHA Review Committee."
  }
];

/**
 * Returns all register entries, optionally filtered by status or responsible institution.
 */
export function getRegisteredDataResources({ status = null, institution = null } = {}) {
  return DATA_ACCESS_REGISTER.filter(res => {
    if (status && res.status !== status) return false;
    if (institution && !res.responsibleInstitution.toLowerCase().includes(institution.toLowerCase())) return false;
    return true;
  });
}

/**
 * Returns summary statistics for the Data Access Register.
 */
export function getDataAccessSummary() {
  const summary = {
    totalResources: DATA_ACCESS_REGISTER.length,
    byStatus: {},
    byType: {},
    receivedCount: 0,
    blockedCount: 0
  };

  for (const status of Object.values(ACCESS_STATUSES)) {
    summary.byStatus[status] = 0;
  }
  for (const type of Object.values(RESOURCE_TYPES)) {
    summary.byType[type] = 0;
  }

  for (const item of DATA_ACCESS_REGISTER) {
    summary.byStatus[item.status] = (summary.byStatus[item.status] || 0) + 1;
    summary.byType[item.resourceType] = (summary.byType[item.resourceType] || 0) + 1;

    if (item.status === ACCESS_STATUSES.RECEIVED || item.status === ACCESS_STATUSES.APPROVED_FOR_USE) {
      summary.receivedCount++;
    }
    if (item.status === ACCESS_STATUSES.NOT_AVAILABLE || item.status === ACCESS_STATUSES.DECLINED) {
      summary.blockedCount++;
    }
  }

  return summary;
}
