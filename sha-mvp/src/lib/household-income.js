/**
 * Household income assessment — research prototype (v1.1 hardened).
 *
 * Purpose:
 * - Separate earned income from other household financial flows.
 * - Itemise reported business operating expenses with category controls.
 * - Track explicit observation windows and common assessment reference periods.
 * - Prevent duplicate income counting with verified relationship references.
 * - Reconcile reimbursements against reported operating expenses.
 * - Preserve seasonal income observation safeguards.
 * - Flag cases requiring review instead of inventing an income estimate.
 *
 * This is an income-ledger calculator, NOT an approved SHA means-testing
 * instrument. Transfer treatment and allowable cost rules require SHA policy
 * and legal approval before operational use.
 */

export const INCOME_SOURCE_RULES = Object.freeze({
  EMPLOYMENT_WAGES: {
    label: "Employment / regular wages",
    bucket: "EARNED",
    costsAllowed: false,
    description: "Salaried or contracted regular wages with or without pay slip."
  },

  CASUAL_LABOUR: {
    label: "Casual / daily labour",
    bucket: "EARNED",
    costsAllowed: false,
    description: "Day-wage, piece-rate, or seasonal manual work."
  },

  SELF_EMPLOYMENT: {
    label: "Self-employment / small business",
    bucket: "EARNED",
    costsAllowed: true,
    description: "Micro-enterprise, retail shop, kiosk, market trade, artisan."
  },

  AGRICULTURE: {
    label: "Agriculture / livestock activity",
    bucket: "EARNED",
    costsAllowed: true,
    description: "Crop farming, dairy, pastoral livestock, horticulture."
  },

  RENTAL_INCOME: {
    label: "Rental income",
    bucket: "EARNED",
    costsAllowed: true,
    description: "Income derived from leased rooms, land, or properties."
  },

  OTHER_EARNED: {
    label: "Other earned income",
    bucket: "EARNED",
    costsAllowed: true,
    description: "Other reported active economic earnings."
  },

  REMITTANCES: {
    label: "Family / diaspora remittances",
    bucket: "POLICY_REVIEW",
    costsAllowed: false,
    description: "Transfers from relatives or diaspora support."
  },

  SOCIAL_ASSISTANCE: {
    label: "Social assistance / support",
    bucket: "POLICY_REVIEW",
    costsAllowed: false,
    description: "Inua Jamii, cash transfers, NGO or church assistance."
  },

  LOAN_PROCEEDS: {
    label: "Loan proceeds",
    bucket: "NON_EARNED_FLOW",
    costsAllowed: false,
    description: "Borrowed capital from SACCO, bank, M-Shwari, or Fuliza."
  },

  REIMBURSEMENT: {
    label: "Refunds / reimbursements",
    bucket: "NON_EARNED_FLOW",
    costsAllowed: false,
    description: "Repayment of out-of-pocket costs incurred on behalf of others."
  },

  GROUP_FUNDS: {
    label: "Chama / group funds held for others",
    bucket: "FIDUCIARY_FLOW",
    costsAllowed: false,
    description: "Merry-go-round, table banking, or welfare fund custodial balances."
  },
});

export const OPERATING_EXPENSE_CATEGORIES = Object.freeze({
  STOCK_PURCHASES: {
    code: "STOCK_PURCHASES",
    label: "Stock purchases / goods for resale",
    isAllowablePrototype: true,
    description: "Wholesale goods, inventory, commercial stock for trading."
  },
  RAW_MATERIALS_INPUTS: {
    code: "RAW_MATERIALS_INPUTS",
    label: "Raw materials and agricultural inputs",
    isAllowablePrototype: true,
    description: "Seeds, fertilizer, animal feed, fabrication materials."
  },
  FUEL_TRANSPORT: {
    code: "FUEL_TRANSPORT",
    label: "Fuel and business transport",
    isAllowablePrototype: true,
    description: "Fuel for commercial vehicle/generator, freight, cargo transit."
  },
  REPAIRS_MAINTENANCE: {
    code: "REPAIRS_MAINTENANCE",
    label: "Repairs and equipment maintenance",
    isAllowablePrototype: true,
    description: "Tools, machinery servicing, vehicle servicing for work."
  },
  LABOUR_PAYMENTS: {
    code: "LABOUR_PAYMENTS",
    label: "Wages paid to casual / hired labour",
    isAllowablePrototype: true,
    description: "Wages paid to non-household workers directly engaged in business."
  },
  RENT_UTILITIES: {
    code: "RENT_UTILITIES",
    label: "Business premises rent and utilities",
    isAllowablePrototype: true,
    description: "Market stall fees, shop rent, business electricity/water."
  },
  FEES_LICENCES: {
    code: "FEES_LICENCES",
    label: "County fees and statutory licences",
    isAllowablePrototype: true,
    description: "Single business permits, cess, market levies."
  },
  OTHER_OPERATING: {
    code: "OTHER_OPERATING",
    label: "Other reported direct operating costs",
    isAllowablePrototype: true,
    description: "Miscellaneous business operating costs subject to review."
  }
});

const roundKsh = (value) => Math.round(value);

function readAmount(value) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return number;
}

/**
 * Calculates observation months from explicit start and end dates.
 * Returns null if dates are invalid or inverted.
 */
export function calculateMonthsFromDates(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (start > end) return null;

  // Approximate calendar months difference
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayDiff = (end.getDate() - start.getDate()) / 30;
  const totalMonths = Math.max(1, Math.min(12, Math.round(yearDiff * 12 + monthDiff + dayDiff)));
  return totalMonths;
}

/**
 * Validates the full array of income sources, including:
 * - Common assessment reference periods
 * - Date ranges
 * - Itemised operating expenses
 * - Duplicate relationships via `includedInSourceId`
 * - Non-circular references
 */
export function validateIncomeSources(sources, commonAssessmentPeriod = null) {
  const errors = [];

  if (!Array.isArray(sources) || sources.length === 0) {
    return {
      isValid: false,
      errors: ["At least one income or financial-flow source is required."],
    };
  }

  if (commonAssessmentPeriod) {
    if (commonAssessmentPeriod.startDate && commonAssessmentPeriod.endDate) {
      const s = new Date(commonAssessmentPeriod.startDate);
      const e = new Date(commonAssessmentPeriod.endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        errors.push("Assessment reference period dates are invalid.");
      } else if (s > e) {
        errors.push("Assessment reference period start date cannot be after end date.");
      }
    }
  }

  const seenIds = new Set();
  const sourceMap = new Map();

  sources.forEach((source, index) => {
    const prefix = `Source ${index + 1}`;

    if (!source || typeof source !== "object") {
      errors.push(`${prefix}: Invalid source record.`);
      return;
    }

    const id = String(source.id ?? "").trim();

    if (!id) {
      errors.push(`${prefix}: A source identifier is required.`);
    } else if (seenIds.has(id)) {
      errors.push(`${prefix}: Duplicate source identifier '${id}'.`);
    } else {
      seenIds.add(id);
      sourceMap.set(id, source);
    }

    const rule = INCOME_SOURCE_RULES[source.sourceType];

    if (!rule) {
      errors.push(`${prefix}: Select a valid income source type.`);
      return;
    }

    // Observation period calculation: dates take precedence when present
    let months = null;
    if (source.observationStartDate && source.observationEndDate) {
      months = calculateMonthsFromDates(source.observationStartDate, source.observationEndDate);
      if (months === null) {
        errors.push(`${prefix}: Observation start date must be before end date.`);
      }
    } else if (source.monthsObserved !== undefined && source.monthsObserved !== null) {
      const rawMonths = Number(source.monthsObserved);
      if (Number.isInteger(rawMonths) && rawMonths >= 1 && rawMonths <= 12) {
        months = rawMonths;
      }
    }

    if (months === null) {
      errors.push(
        `${prefix}: Observation period must be between 1 and 12 months, or valid start/end dates must be provided.`
      );
    }

    const received = readAmount(source.amountReceivedKsh);

    if (received === null) {
      errors.push(
        `${prefix}: Amount received must be a valid non-negative KSh amount.`
      );
    }

    // Itemised expenses validation
    if (Array.isArray(source.expenses) && source.expenses.length > 0) {
      if (!rule.costsAllowed) {
        errors.push(`${prefix}: Operating costs are not permitted for ${rule.label}.`);
      } else {
        source.expenses.forEach((exp, expIdx) => {
          const expPrefix = `${prefix} Expense ${expIdx + 1}`;
          if (!exp || typeof exp !== "object") {
            errors.push(`${expPrefix}: Invalid expense record.`);
            return;
          }
          if (!OPERATING_EXPENSE_CATEGORIES[exp.category]) {
            errors.push(`${expPrefix}: Invalid expense category '${exp.category}'.`);
          }
          const amt = readAmount(exp.amountKsh);
          if (amt === null) {
            errors.push(`${expPrefix}: Expense amount must be a valid non-negative KSh amount.`);
          }
        });
      }
    } else {
      // Legacy single direct-cost field backward compatibility
      const directCosts = source.directCostsKsh === undefined || source.directCostsKsh === null
        ? 0
        : readAmount(source.directCostsKsh);

      if (directCosts === null) {
        errors.push(`${prefix}: Reported costs must be a valid non-negative KSh amount.`);
      } else if (!rule.costsAllowed && directCosts > 0) {
        errors.push(`${prefix}: This source type does not accept operating costs in this prototype.`);
      }
    }

    // Duplicate relationship validation (`includedInSourceId`)
    if (source.includedInSourceId) {
      const parentId = String(source.includedInSourceId).trim();
      if (parentId === id) {
        errors.push(`${prefix}: Self-reference error: Source cannot refer to itself as parent.`);
      }
    }
  });

  // Second pass: validate parent exists and detect circular references
  for (const [id, source] of sourceMap.entries()) {
    if (source.includedInSourceId) {
      const parentId = String(source.includedInSourceId).trim();
      if (!sourceMap.has(parentId)) {
        errors.push(`Source '${id}' references parent source '${parentId}' which does not exist in this assessment.`);
      } else {
        // Detect circular references
        const visited = new Set([id]);
        let curr = parentId;
        while (curr && sourceMap.has(curr)) {
          if (visited.has(curr)) {
            errors.push(`Circular duplicate relationship detected: Source '${id}' refers back to itself via '${curr}'.`);
            break;
          }
          visited.add(curr);
          curr = sourceMap.get(curr).includedInSourceId ? String(sourceMap.get(curr).includedInSourceId).trim() : null;
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates household income across all reported sources.
 * Enforces period alignment, duplicate deduction safeguards, expense itemisation,
 * and reimbursement reconciliation.
 */
export function calculateHouseholdIncome(sources, commonAssessmentPeriod = null) {
  const validation = validateIncomeSources(sources, commonAssessmentPeriod);

  if (!validation.isValid) {
    return {
      isValid: false,
      canPopulatePrototypeEarnedIncomeBase: false,
      errors: validation.errors,
      lines: [],
      monthlyEarnedNetKsh: null,
      annualisedEarnedNetKsh: null,
      monthlyPolicyReviewResourcesKsh: null,
      monthlyNonEarnedFlowsKsh: null,
      monthlyFiduciaryFlowsKsh: null,
      requiresManualReview: false,
      requiresPolicyDecision: false,
      calculationVersion: "household-income-ledger-v1.1",
    };
  }

  let monthlyEarnedTotal = 0;
  let monthlyPolicyReviewTotal = 0;
  let monthlyNonEarnedTotal = 0;
  let monthlyFiduciaryTotal = 0;

  let requiresManualReview = false;
  let requiresPolicyDecision = false;

  const reviewFlags = [];
  const duplicateRelationships = [];

  // Index sources for parent lookup
  const sourceMap = new Map();
  sources.forEach(s => sourceMap.set(String(s.id).trim(), s));

  // Collect reported business expenses to reconcile against any claimed reimbursements
  let totalDeductedBusinessExpenses = 0;
  let totalReportedReimbursements = 0;

  const lines = sources.map((source) => {
    const rule = INCOME_SOURCE_RULES[source.sourceType];

    let months = 12;
    if (source.observationStartDate && source.observationEndDate) {
      months = calculateMonthsFromDates(source.observationStartDate, source.observationEndDate) || 12;
    } else if (source.monthsObserved) {
      months = Number(source.monthsObserved);
    }

    const received = Number(source.amountReceivedKsh || 0);

    // Calculate total expenses from itemised ledger or legacy field
    let itemisedExpenses = [];
    let costs = 0;

    if (rule.costsAllowed) {
      if (Array.isArray(source.expenses) && source.expenses.length > 0) {
        itemisedExpenses = source.expenses.map(e => ({
          id: e.id || `exp-${Math.random().toString(36).slice(2, 6)}`,
          category: e.category,
          categoryLabel: OPERATING_EXPENSE_CATEGORIES[e.category]?.label || e.category,
          amountKsh: Number(e.amountKsh || 0),
          isAllowablePrototype: OPERATING_EXPENSE_CATEGORIES[e.category]?.isAllowablePrototype !== false,
          description: e.description || ""
        }));
        costs = itemisedExpenses.reduce((sum, e) => sum + (e.isAllowablePrototype ? e.amountKsh : 0), 0);
      } else if (source.directCostsKsh !== undefined && source.directCostsKsh !== null) {
        costs = Number(source.directCostsKsh);
        itemisedExpenses = [{
          id: `exp-legacy-${source.id}`,
          category: "OTHER_OPERATING",
          categoryLabel: OPERATING_EXPENSE_CATEGORIES.OTHER_OPERATING.label,
          amountKsh: costs,
          isAllowablePrototype: true,
          description: "Reported direct operating costs"
        }];
      }
      totalDeductedBusinessExpenses += costs;
    }

    const reportedNet = received - costs;
    const monthlyReceived = received / months;
    const monthlyCosts = costs / months;
    const monthlyNet = reportedNet / months;

    // Duplicate relationship handling (`includedInSourceId` takes precedence over legacy boolean)
    let isDuplicate = false;
    let parentSourceId = null;

    if (source.includedInSourceId) {
      parentSourceId = String(source.includedInSourceId).trim();
      isDuplicate = true;
      duplicateRelationships.push({
        childSourceId: source.id,
        parentSourceId: parentSourceId
      });
    } else if (source.alreadyIncludedElsewhere === true) {
      isDuplicate = true;
    }

    let countedInEarnedIncome = false;

    if (rule.bucket === "EARNED" && !isDuplicate) {
      monthlyEarnedTotal += monthlyNet;
      countedInEarnedIncome = true;
    } else if (isDuplicate) {
      const parentName = parentSourceId && sourceMap.has(parentSourceId)
        ? `${INCOME_SOURCE_RULES[sourceMap.get(parentSourceId).sourceType]?.label || parentSourceId} (ID: ${parentSourceId})`
        : "another declared source";

      reviewFlags.push({
        code: "DUPLICATE_SOURCE_NOT_COUNTED",
        sourceId: source.id,
        parentSourceId: parentSourceId,
        message: `${rule.label} (ID: ${source.id}) was identified as already included in ${parentName}. It was not added to the earned income base.`,
      });
    } else if (rule.bucket === "POLICY_REVIEW") {
      monthlyPolicyReviewTotal += monthlyReceived;
      requiresPolicyDecision = true;

      reviewFlags.push({
        code: "TRANSFER_TREATMENT_REQUIRES_POLICY",
        sourceId: source.id,
        message: `${rule.label} is displayed separately. Its treatment in the final means-testing income definition requires an approved SHA policy rule.`,
      });
    } else if (rule.bucket === "NON_EARNED_FLOW") {
      monthlyNonEarnedTotal += monthlyReceived;
      if (source.sourceType === "REIMBURSEMENT") {
        totalReportedReimbursements += received;
      }
    } else if (rule.bucket === "FIDUCIARY_FLOW") {
      monthlyFiduciaryTotal += monthlyReceived;
    }

    // Observation period safeguards
    const requiresFullYear = source.sourceType === "AGRICULTURE" || source.isSeasonal === true;
    let periodStatus = "FULL_ANNUAL";

    if (requiresFullYear && months < 12) {
      requiresManualReview = true;
      periodStatus = "SEASONAL_INCOMPLETE";
      reviewFlags.push({
        code: "SEASONAL_PERIOD_INCOMPLETE",
        sourceId: source.id,
        message: `${rule.label} has only ${months} observed months. Full 12-month coverage is required for seasonal activities to prevent peak harvest extrapolation.`,
      });
    } else if (!requiresFullYear && months < 3) {
      requiresManualReview = true;
      periodStatus = "LIMITED_OBSERVATION_PERIOD";
      reviewFlags.push({
        code: "LIMITED_OBSERVATION_PERIOD",
        sourceId: source.id,
        message: `${rule.label} has fewer than 3 observed months. This observation window cannot establish a reliable pattern and requires manual review.`,
      });
    } else if (!requiresFullYear && months < 12) {
      periodStatus = "SHORT_WINDOW_PROVISIONAL";
      reviewFlags.push({
        code: "SHORT_WINDOW_PROVISIONAL",
        sourceId: source.id,
        message: `${rule.label} covers ${months} observed months. Monthly average is provisional and not an established annual pattern.`,
      });
    }

    if (rule.bucket === "EARNED" && reportedNet < 0) {
      requiresManualReview = true;
      reviewFlags.push({
        code: "NEGATIVE_REPORTED_NET",
        sourceId: source.id,
        message: `${rule.label} has reported operating costs exceeding receipts (KSh ${reportedNet.toLocaleString()}). Manual review required.`,
      });
    }

    return {
      sourceId: source.id,
      sourceType: source.sourceType,
      label: rule.label,
      bucket: rule.bucket,
      observationMonths: months,
      observationStartDate: source.observationStartDate || null,
      observationEndDate: source.observationEndDate || null,
      periodStatus,

      totalReceivedKsh: roundKsh(received),
      totalReportedCostsKsh: roundKsh(costs),
      reportedNetKsh: roundKsh(reportedNet),
      itemisedExpenses,

      averageMonthlyReceivedKsh: roundKsh(monthlyReceived),
      averageMonthlyCostsKsh: roundKsh(monthlyCosts),
      averageMonthlyNetKsh: roundKsh(monthlyNet),

      countedInEarnedIncome,
      isDuplicate,
      includedInSourceId: parentSourceId,
      alreadyIncludedElsewhere: isDuplicate,

      isSeasonal: source.isSeasonal === true,
      provenance: source.provenance || "MEMBER_DECLARED_UNVERIFIED",
    };
  });

  // Safeguard: Reimbursement double-counting check
  // If reimbursements are recorded and expenses are deducted from business, flag for reconciliation
  if (totalReportedReimbursements > 0 && totalDeductedBusinessExpenses > 0) {
    reviewFlags.push({
      code: "REIMBURSEMENT_EXPENSE_OFFSET",
      message: `Reimbursements of KSh ${totalReportedReimbursements.toLocaleString()} were received while business expenses of KSh ${totalDeductedBusinessExpenses.toLocaleString()} were deducted. Ensure reimbursed expenses are not deducted from business income.`,
    });
  }

  const canPopulatePrototypeEarnedIncomeBase = !requiresManualReview;

  const monthlyEarnedNetKsh = canPopulatePrototypeEarnedIncomeBase
    ? roundKsh(monthlyEarnedTotal)
    : null;

  const snapshot = JSON.parse(JSON.stringify(sources));

  return {
    isValid: true,
    calculationVersion: "household-income-ledger-v1.1",
    timestamp: new Date().toISOString(),

    canPopulatePrototypeEarnedIncomeBase,

    commonAssessmentPeriod: commonAssessmentPeriod || {
      windowMonths: 12,
      note: "Standard 12-month rolling assessment window",
    },

    lines,
    duplicateRelationships,
    reproducibleInputSnapshot: snapshot,

    monthlyEarnedNetKsh,

    annualisedEarnedNetKsh:
      monthlyEarnedNetKsh === null
        ? null
        : roundKsh(monthlyEarnedNetKsh * 12),

    monthlyPolicyReviewResourcesKsh: roundKsh(monthlyPolicyReviewTotal),
    monthlyNonEarnedFlowsKsh: roundKsh(monthlyNonEarnedTotal),
    monthlyFiduciaryFlowsKsh: roundKsh(monthlyFiduciaryTotal),

    requiresManualReview,
    requiresPolicyDecision,

    reviewFlags,

    calculationScope: "PROTOTYPE_EARNED_INCOME_SUBTOTAL_ONLY",

    disclaimer:
      "This calculation estimates a reported net earned-income subtotal. It is not a complete or approved SHA household means-testing determination. Other household resources, allowable deductions and transfer treatment require formal SHA policy and legal evaluation.",
  };
}

/**
 * Reproduces the exact household income calculation from a saved snapshot.
 */
export function reproduceHouseholdIncome(snapshot, commonAssessmentPeriod = null) {
  return calculateHouseholdIncome(snapshot, commonAssessmentPeriod);
}
