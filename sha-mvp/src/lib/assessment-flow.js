/**
 * Assessment flow configuration and conditional visibility logic — research prototype.
 *
 * Defines the 4-stage member assessment flow:
 * 1. Household: Composition, location and circumstances.
 * 2. Income and livelihoods: Earned income from employment, business, farming, rental, etc.
 * 3. Other money: Financial support, remittances, loans, reimbursements and group funds.
 * 4. Review and assessment: Comprehensive verification of member-reported items before calculation.
 *
 * Keeps UI conditional display rules decoupled from App.jsx and maintains
 * compatibility with the underlying household-income.js ledger rules.
 */

import {
  INCOME_SOURCE_RULES,
  OPERATING_EXPENSE_CATEGORIES
} from "./household-income.js";

export const MEMBER_ASSESSMENT_STEPS = Object.freeze([
  {
    id: "household",
    index: 0,
    title: "Your household",
    shortTitle: "1. Household",
    description: "Tell us about the people who live in your household and your location.",
  },
  {
    id: "income",
    index: 1,
    title: "How your household earns",
    shortTitle: "2. Earned Income",
    description: "Record the different ways your household earns active income.",
  },
  {
    id: "other-money",
    index: 2,
    title: "Other money coming in",
    shortTitle: "3. Other Money",
    description: "Record remittances, social assistance, loans and group funds separately.",
  },
  {
    id: "review",
    index: 3,
    title: "Review your information",
    shortTitle: "4. Review",
    description: "Check the reported information and warnings before viewing the assessment.",
  },
]);

export const OPTIONAL_HOUSEHOLD_SECTIONS = Object.freeze([
  {
    id: "housing",
    title: "Housing circumstances",
    description: "Dwelling type, construction materials and rental/sublet status.",
  },
  {
    id: "basic-services",
    title: "Basic services & utilities",
    description: "Water source, sanitation, cooking and lighting energy.",
  },
  {
    id: "assets",
    title: "Household assets & capital",
    description: "Appliances, electronics, vehicles, land parcels and livestock.",
  },
]);

/**
 * Maps household-income.js source types to UI kinds.
 * Derives directly from INCOME_SOURCE_RULES.
 */
export const SOURCE_KIND_BY_TYPE = Object.freeze({
  EMPLOYMENT_WAGES: "employment_wages",
  CASUAL_LABOUR: "casual_work",
  SELF_EMPLOYMENT: "business",
  AGRICULTURE: "agriculture",
  RENTAL_INCOME: "rental",
  OTHER_EARNED: "other_earned",
  REMITTANCES: "remittance",
  SOCIAL_ASSISTANCE: "social_assistance",
  LOAN_PROCEEDS: "loan_proceeds",
  REIMBURSEMENT: "reimbursement",
  GROUP_FUNDS: "group_funds",
});

/**
 * Kinds eligible for reported operating expenses under prototype policy.
 * Only source types with costsAllowed: true in INCOME_SOURCE_RULES are included.
 */
export const EXPENSE_ELIGIBLE_KINDS = Object.freeze(
  Object.entries(INCOME_SOURCE_RULES)
    .filter(([_, rule]) => rule.costsAllowed === true)
    .map(([type]) => SOURCE_KIND_BY_TYPE[type] || type.toLowerCase())
);

/**
 * Kinds where seasonal variability questions apply.
 */
export const SEASONAL_INCOME_KINDS = Object.freeze([
  "agriculture",
  "casual_work",
  "business"
]);

/**
 * Types that belong to the active earned income stage (Stage 1).
 */
export const EARNED_SOURCE_TYPES = Object.freeze(
  Object.keys(INCOME_SOURCE_RULES).filter(
    (type) => INCOME_SOURCE_RULES[type].bucket === "EARNED"
  )
);

/**
 * Types that belong to the other incoming money stage (Stage 2).
 */
export const OTHER_MONEY_SOURCE_TYPES = Object.freeze(
  Object.keys(INCOME_SOURCE_RULES).filter(
    (type) => INCOME_SOURCE_RULES[type].bucket !== "EARNED"
  )
);

/**
 * Resolve UI category and conditional display rules for an income source record.
 */
export function getIncomeSourceUiRules(
  source,
  {
    sourceKindByType = SOURCE_KIND_BY_TYPE,
    expenseEligibleKinds = EXPENSE_ELIGIBLE_KINDS,
    seasonalKinds = SEASONAL_INCOME_KINDS,
  } = {}
) {
  const sourceType =
    source?.sourceType ??
    source?.type ??
    source?.incomeType ??
    source?.category ??
    "";

  const kind =
    source?.uiKind ??
    sourceKindByType[sourceType] ??
    "other";

  const rule = INCOME_SOURCE_RULES[sourceType];
  const costsAllowedByLedger = rule ? rule.costsAllowed === true : false;

  return {
    kind,
    sourceType,
    bucket: rule?.bucket ?? "EARNED",
    label: rule?.label ?? "Income Source",

    // Expense eligibility requires approval in both kind list and underlying ledger
    showOperatingExpenses:
      costsAllowedByLedger && expenseEligibleKinds.includes(kind),

    showSeasonalDetails:
      seasonalKinds.includes(kind),

    showCasualWorkDetails:
      kind === "casual_work",

    showRentalDetails:
      kind === "rental",

    showBusinessDetails:
      kind === "business",

    showAgricultureDetails:
      kind === "agriculture",

    showEmploymentDetails:
      kind === "employment_wages",

    isEarnedIncome:
      rule ? rule.bucket === "EARNED" : true,

    isOtherMoney:
      rule ? rule.bucket !== "EARNED" : false,
  };
}

/**
 * Evaluates visibility states for the assessment container.
 */
export function getAssessmentVisibility({
  incomeSources = [],
  showAdditionalCircumstances = false,
  hasNoEarnedIncome = false,
} = {}) {
  const earnedSources = incomeSources.filter(
    (s) => INCOME_SOURCE_RULES[s.sourceType]?.bucket === "EARNED"
  );
  const otherFlows = incomeSources.filter(
    (s) => INCOME_SOURCE_RULES[s.sourceType]?.bucket !== "EARNED"
  );

  return {
    hasIncomeSources: incomeSources.length > 0,
    hasEarnedSources: earnedSources.length > 0,
    hasOtherFlows: otherFlows.length > 0,
    hasNoEarnedIncome: Boolean(hasNoEarnedIncome),
    showAdditionalCircumstances: Boolean(showAdditionalCircumstances),
    showIncomeEmptyState: earnedSources.length === 0 && !hasNoEarnedIncome,
  };
}

/**
 * Builds a structured, member-reported review summary for Stage 3.
 */
export function buildAssessmentReview({
  inputs = {},
  incomeAssessmentSnapshot = null,
  incomeSources = [],
  otherFinancialFlows = [],
} = {}) {
  const snapshot = incomeAssessmentSnapshot ?? {};
  const allSources = Array.isArray(incomeSources) ? incomeSources : [];

  // If otherFinancialFlows is provided explicitly, use it; otherwise filter allSources
  const earnedSources = allSources.filter(
    (s) => (INCOME_SOURCE_RULES[s.sourceType]?.bucket ?? "EARNED") === "EARNED"
  );
  const derivedOtherFlows = allSources.filter(
    (s) => (INCOME_SOURCE_RULES[s.sourceType]?.bucket ?? "EARNED") !== "EARNED"
  );
  const finalOtherFlows = Array.isArray(otherFinancialFlows) && otherFinancialFlows.length > 0
    ? otherFinancialFlows
    : derivedOtherFlows;

  const calculationStatus = snapshot.calculationStatus ?? (
    snapshot.requiresManualReview
      ? "BLOCKED_MANUAL_REVIEW"
      : (snapshot.requiresPolicyDecision ? "PROVISIONAL_PENDING_POLICY" : "CALCULATED_STANDARD")
  );

  return {
    status: "MEMBER_REPORTED",
    calculationStatus,
    provenance: "Unverified household declaration",
    calculationVersion: snapshot.calculationVersion ?? "household-income-ledger-v1.1",
    assessmentPeriod: snapshot.assessmentPeriod ?? snapshot.commonAssessmentPeriod ?? {
      startDate: null,
      endDate: null,
      windowMonths: null,
      note: "Assessment period determined per declared income source (formal standard rolling window requires SHA policy confirmation)"
    },

    incomeSourceCount: earnedSources.length,
    financialFlowCount: finalOtherFlows.length,
    evidenceCoverage: snapshot.evidenceCoverage ?? null,

    household: {
      county: inputs?.county ?? "Not specified",
      householdSize: inputs?.householdSize ?? 1,
      headAge: inputs?.headAge ?? "—",
      headGender: inputs?.headGender ?? "—",
      circumstances: [
        inputs?.receivesAid ? "Social assistance recipient (Inua Jamii/HSFP)" : null,
        inputs?.hasChronicIllness ? "Chronic illness reported in household" : null,
        inputs?.hasRegisteredDisability ? "Registered disability (NCPWD)" : null,
        inputs?.isRefugee ? "Refugee / displaced person" : null,
      ].filter(Boolean)
    },

    earnedSources: {
      count: earnedSources.length,
      items: earnedSources,
      totalMonthlyNet: snapshot.monthlyEarnedNetKsh ?? (inputs?.monthlyNetEarnedIncome ?? 0),
      annualisedNet: snapshot.annualisedEarnedNetKsh ?? (inputs?.monthlyNetEarnedIncome ? inputs.monthlyNetEarnedIncome * 12 : 0),
    },

    otherFinancialFlows: {
      count: finalOtherFlows.length,
      items: finalOtherFlows,
      policyReviewMonthlyTotal: snapshot.monthlyPolicyReviewResourcesKsh ?? 0,
      nonEarnedFlowsMonthlyTotal: snapshot.monthlyNonEarnedFlowsKsh ?? 0,
      fiduciaryFlowsMonthlyTotal: snapshot.monthlyFiduciaryFlowsKsh ?? 0,
    },

    reviewFlags: [
      ...(snapshot.reviewFlags ?? [])
    ],

    duplicateRelationships: [
      ...(snapshot.duplicateRelationships ?? [])
    ],

    requiresManualReview: Boolean(snapshot.requiresManualReview),
    requiresPolicyDecision: Boolean(snapshot.requiresPolicyDecision),
    policyDecisionSummary: snapshot.policyDecisionSummary ?? (
      snapshot.requiresPolicyDecision
        ? "Transfers and social assistance require approved SHA policy rules regarding means-testing inclusion or exclusion."
        : null
    ),

    disclaimer:
      "This review presents member-reported information for technical demonstration. It is not an official SHA means-testing assessment, eligibility determination, or subsidy approval under the Social Health Insurance Act.",
  };
}
