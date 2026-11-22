/**
 * SHA Data & Technical Information Request Pack — Research Prototype.
 *
 * Formulates the formal technical disclosure request to the Social Health Authority (SHA)
 * and Ministry of Health (MoH) for an evidence-based, collaborative means-testing review.
 *
 * Statutory and Research Context:
 * Aligned with the Kenya Data Protection Act, 2019 (Sections 30 and 53) research provisions,
 * and the Social Health Insurance Regulations, 2024 (Regulations 18, 19, and 21(6), Fifth Schedule 'Means Testing').
 *
 * Boundary Note:
 * This document states what is technically required to perform an independent empirical evaluation.
 * It DOES NOT represent or claim that SHA has agreed to supply any of these materials.
 */

export const SHA_REQUEST_ITEMS = [
  {
    itemNumber: 1,
    title: "Current Deployed Means Testing Instrument (MTI) Version",
    category: "MODEL_GOVERNANCE",
    description: "The exact software build version, release identifier, and deployment timestamp of the MTI currently operating in the SHA member registration portal.",
    rationale: "Ensures that evaluation tests the actual production system rather than an obsolete or prototype version."
  },
  {
    itemNumber: 2,
    title: "Complete Variable Dictionary & Operational Survey Codebook",
    category: "DATA_DICTIONARY",
    description: "The full operational codebook for the proxy variables deployed under Regulation 21(6) and the Fifth Schedule ('Means Testing'), including exact question wording, category codes, skip logic, and interviewer instructions.",
    rationale: "Eliminates ambiguity in variable definitions, preventing false classification when comparing household inputs."
  },
  {
    itemNumber: 3,
    title: "Urban and Rural Regression Coefficients & Constants (Intercepts)",
    category: "ECONOMETRIC_SPECIFICATION",
    description: "The full set of verified numerical regression weights, regional dummy coefficients, and constant terms for both the urban and rural model specifications.",
    rationale: "Essential to mathematically reproduce the official score calculation from raw household inputs."
  },
  {
    itemNumber: 4,
    title: "Data Preprocessing, Scaling, and Categorical Encoding Rules",
    category: "PREPROCESSING_RULES",
    description: "Documentation of how continuous proxy variables are normalized, how missing values are treated/imputed, and how categorical responses are dummy-coded.",
    rationale: "Prevents discrepancies caused by differing preprocessing or baseline dummy assignments."
  },
  {
    itemNumber: 5,
    title: "Missing-Value Handling & Fallback Defaults",
    category: "DATA_INTEGRITY",
    description: "The system behavior when a member leaves non-mandatory fields blank or when certain proxy indicators cannot be gathered.",
    rationale: "Ensures identical treatment of partial household submissions."
  },
  {
    itemNumber: 6,
    title: "Household Scoring Formula & Welfare Output Transformation",
    category: "SCORE_DERIVATION",
    description: "The mathematical formula mapping raw regression scores into estimated per-capita consumption or welfare percentiles.",
    rationale: "Clarifies whether the score represents direct log expenditure, a normalized index, or an empirical percentile."
  },
  {
    itemNumber: 7,
    title: "Score-to-Contribution Tariff Band Cutoffs & Subsidy Rules",
    category: "TARIFF_MAPPING",
    description: "The numerical score cutoffs determining which households qualify for financial assistance under Regulation 19 versus progressive contribution brackets under Regulation 18(1) and Regulation 21(6).",
    rationale: "Allows evaluation of whether the means-testing instrument produces progressive and affordable premium assignments."
  },
  {
    itemNumber: 8,
    title: "Model Calibration History & Validation Reports",
    category: "METHODOLOGY_AUDIT",
    description: "Copies of historical technical validation studies, out-of-sample error estimates, and goodness-of-fit statistics conducted during model development.",
    rationale: "Establishes the documented statistical benchmark against which proposed improvements can be measured."
  },
  {
    itemNumber: 9,
    title: "Subgroup Performance & Demographic Equity Analyses",
    category: "FAIRNESS_AUDIT",
    description: "Internal evaluations of model error rates across key vulnerable demographics (female-headed households, pastoralist communities, informal-sector workers, elderly persons).",
    rationale: "Identifies systemic exclusion risks or geographic biases requiring targeted structural adjustment."
  },
  {
    itemNumber: 10,
    title: "Anonymised Historical Assessment Benchmarking Sample",
    category: "EMPIRICAL_MICRODATA",
    description: "A representative sample of de-identified historical assessment records (e.g. 1,000–5,000 cases) with inputs and computed scores, subject to statutory research data agreements.",
    rationale: "Allows verification that the reconstructed baseline produces bit-for-bit identical results to SHA's production system."
  },
  {
    itemNumber: 11,
    title: "Dispute, Re-Assessment, and Appeal Statistical Summaries",
    category: "OPERATIONAL_FEEDBACK",
    description: "Aggregated statistical distributions of member disputes, frequent grounds of appeal, and success rates of Community Health Promoter (CHP) field verifications.",
    rationale: "Highlights practical operational friction points where proxy indicators fail to reflect actual household liquidity."
  },
  {
    itemNumber: 12,
    title: "Data Protection Impact Assessment (DPIA) & Privacy Governance Protocols",
    category: "LEGAL_COMPLIANCE",
    description: "The approved DPIA and data handling protocols governing automated decision-making and profiling under Kenya Data Protection Act, 2019 Section 35.",
    rationale: "Ensures proposed research protocols fully comply with statutory member rights and institutional security controls."
  }
];

/**
 * Builds a structured JSON representation of the SHA Data Request Pack.
 */
export function buildShaRequestPackJson() {
  return {
    documentTitle: "SHA Means-Testing Reform: Technical Documentation & Data Disclosure Schedule",
    version: "1.0",
    generatedAt: new Date().toISOString(),
    recipient: "Social Health Authority (SHA) / Ministry of Health, Kenya",
    statutoryBasis: [
      "Kenya Data Protection Act, 2019 (Sections 25, 30(1)(b)(viii), 30(1)(e), 35, 53)",
      "Data Protection (General) Regulations, 2021 (Regulation 22)",
      "Social Health Insurance Regulations, 2024 (Regulations 18, 19, and 21(6), Fifth Schedule 'Means Testing')",
      "ODPC Guidance Notes on Processing for Research Purposes (2025)"
    ],
    researchObjective: "Facilitate an independent, reproducible empirical comparison between the existing proxy means testing instrument (Regulation 21(6) / Fifth Schedule) and candidate cash-flow / liquidity assessment models (Adjusted Gross Income frameworks).",
    disclaimer: "This schedule details technical information necessary to reconstruct an authoritative baseline and conduct independent empirical validation. It does not imply that SHA has agreed to supply any listed items.",
    itemsCount: SHA_REQUEST_ITEMS.length,
    items: SHA_REQUEST_ITEMS
  };
}

/**
 * Generates formatted Markdown suitable for export or formal correspondence.
 */
export function generateShaRequestPackMarkdown() {
  const pack = buildShaRequestPackJson();

  return `# ${pack.documentTitle}
**Document Version:** ${pack.version}  
**Date of Request:** ${pack.generatedAt.split("T")[0]}  
**Recipient Institution:** ${pack.recipient}  

---

### 1. Executive Summary & Statutory Framework
This technical inquiry schedule outlines the specific econometric parameters, operational codebooks, and verification data required to conduct an independent, evidence-based assessment of the Social Health Authority's (SHA) Means Testing Instrument (MTI) established under **Regulation 21(6) and the Fifth Schedule of the Social Health Insurance Regulations, 2024**.

All inquiries are formulated in accordance with:
- **Kenya Data Protection Act, 2019** (Sections 25, 30(1)(b)(viii), 30(1)(e), 35, and 53 regarding research processing, automated decision safeguards, and lawful disclosure);
- **Data Protection (General) Regulations, 2021** (Regulation 22 regarding substantive human intervention in automated decision-making);
- **Office of the Data Protection Commissioner (ODPC) Guidance Notes on Processing for Research Purposes (2025)**;
- **Article 35 of the Constitution of Kenya** (Access to Public Information).

> **Important Boundary:** This document defines the necessary technical inputs for empirical validation. It does not assert that SHA has approved or provided these materials.

---

### 2. Schedule of Technical Information Inquiries

${pack.items.map(item => `#### ${item.itemNumber}. ${item.title}
- **Category:** \`${item.category}\`
- **Technical Description:** ${item.description}
- **Methodological Rationale:** ${item.rationale}
`).join("\n")}

---

### 3. Proposed Research Protections & Data Security Protocol
To ensure compliance with ODPC health data and research guidelines:
1. **Air-Gapped Processing:** No real microdata will be processed in client-side web demonstrations.
2. **Strict Purpose Limitation:** All materials provided will be used exclusively for non-commercial statistical validation.
3. **De-Identification & Privacy:** Microdata must be de-identified by the data controller prior to transfer; no direct identifiers will be retained.
4. **Reproducible Code Auditing:** All validation code will remain open for joint inspection by SHA and Ministry of Health technical teams.
`;
}
