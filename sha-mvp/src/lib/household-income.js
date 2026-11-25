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
  RAW_MATERIALS: {
    code: "RAW_MATERIALS",
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
  TRANSPORT: {
    code: "TRANSPORT",
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
  EQUIPMENT_REPAIRS: {
    code: "EQUIPMENT_REPAIRS",
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
  LABOUR_PAID: {
    code: "LABOUR_PAID",
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
  FEES_LICENSES: {
    code: "FEES_LICENSES",
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

export function createPreviousCompletedTwelveMonthPeriod(asOfDate = new Date()) {
  const date = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === "year").value, 10);
  const month = parseInt(parts.find(p => p.type === "month").value, 10);

  let endYear = year;
  let endMonth = month - 1;
  if (endMonth === 0) {
    endMonth = 12;
    endYear -= 1;
  }

  let startYear = endYear - 1;
  let startMonth = endMonth + 1;
  if (startMonth > 12) {
    startMonth = 1;
    startYear += 1;
  }

  const lastDayOfEndMonth = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();

  const startStr = `${startYear}-${String(startMonth).padStart(2, "0")}-01`;
  const endStr = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDayOfEndMonth).padStart(2, "0")}`;

  return Object.freeze({
    startDate: startStr,
    endDate: endStr,
    windowMonths: 12,
    label: `Previous 12 completed months (${startStr} to ${endStr})`,
    basis: "COMPLETED_CALENDAR_YEAR_WINDOW",
    timezone: "Africa/Nairobi"
  });
}

export const DEFAULT_COMMON_ASSESSMENT_PERIOD = Object.freeze({
  windowMonths: 12,
  label: "Previous 12 completed months",
  basis: "COMPLETED_CALENDAR_YEAR_WINDOW",
  startDate: "2025-11-01",
  endDate: "2026-10-31"
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

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  // Reject invalid dates such as 2026-02-31.
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

/**
 * Counts inclusive calendar months in a date range.
 * Example: 2026-01-01 through 2026-06-30 = 6 months.
 */
export function calculateMonthsFromDates(startDate, endDate) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end || start > end) {
    return null;
  }

  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth() +
    1
  );
}

/**
 * Validates whether a date range represents a complete calendar month window.
 * Day 1 of start month to last day of end month, matching expectedMonths if provided.
 */
export function isCompleteCalendarMonthWindow(startDate, endDate, expectedMonths = 12) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end || start > end) {
    return false;
  }

  // Must begin on the 1st of the month
  if (start.getUTCDate() !== 1) {
    return false;
  }

  // Must end on the last day of the month (next day is 1st of next month)
  const nextDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() + 1));
  if (nextDay.getUTCDate() !== 1) {
    return false;
  }

  const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1;
  if (expectedMonths !== null && expectedMonths !== undefined) {
    return months === expectedMonths;
  }
  return months >= 1;
}

export function checkIncomePeriodAlignment(sources, commonAssessmentPeriod = null) {
  const activeEarnedSources = sources.filter(source => {
    const rule = INCOME_SOURCE_RULES[source.sourceType];

    return (
      source.isActive !== false &&
      rule?.bucket === "EARNED"
    );
  });

  const datedSources = activeEarnedSources.filter(source =>
    source.observationStartDate && source.observationEndDate
  );

  if (
    datedSources.length > 0 &&
    datedSources.length !== activeEarnedSources.length
  ) {
    return "Some earned-income sources have dates while others do not. Their observation periods cannot be confirmed as aligned.";
  }

  const periodKeys = new Set(
    datedSources.map(source =>
      `${source.observationStartDate}|${source.observationEndDate}`
    )
  );

  if (periodKeys.size > 1) {
    return "Earned-income sources cover different date ranges. Use the same assessment reference period before combining them.";
  }

  if (commonAssessmentPeriod?.enforceReferenceWindow && commonAssessmentPeriod.startDate && commonAssessmentPeriod.endDate) {
    for (const src of datedSources) {
      if (src.observationStartDate !== commonAssessmentPeriod.startDate || src.observationEndDate !== commonAssessmentPeriod.endDate) {
        return `Earned-income sources (${src.observationStartDate} to ${src.observationEndDate}) do not align with the common assessment reference period (${commonAssessmentPeriod.startDate} to ${commonAssessmentPeriod.endDate}).`;
      }
    }
  }

  return null;
}

function calculateBusinessExpenseTotals(source, itemisedExpenses) {
  const stockPurchasesKsh = itemisedExpenses
    .filter(exp => exp.category === "STOCK_PURCHASES")
    .reduce((sum, exp) => sum + exp.amountKsh, 0);

  const otherOperatingCostsKsh = itemisedExpenses
    .filter(exp => exp.category !== "STOCK_PURCHASES")
    .filter(exp => exp.isAllowablePrototype)
    .reduce((sum, exp) => sum + exp.amountKsh, 0);

  const openingStockKsh = readAmount(source.openingStockKsh);
  const closingStockKsh = readAmount(source.closingStockKsh);

  if (stockPurchasesKsh === 0) {
    return {
      isResolved: true,
      stockPurchasesKsh: 0,
      costOfGoodsSoldKsh: 0,
      otherOperatingCostsKsh,
      totalCostsKsh: otherOperatingCostsKsh,
      openingStockKsh,
      closingStockKsh
    };
  }

  // Do not silently deduct every purchase where stock remains unsold.
  if (openingStockKsh === null || closingStockKsh === null) {
    return {
      isResolved: false,
      stockPurchasesKsh,
      costOfGoodsSoldKsh: null,
      otherOperatingCostsKsh,
      totalCostsKsh: otherOperatingCostsKsh,
      openingStockKsh,
      closingStockKsh,
      unresolvedReason: "MISSING_INVENTORY_VALUES"
    };
  }

  const costOfGoodsSoldKsh =
    openingStockKsh + stockPurchasesKsh - closingStockKsh;

  if (costOfGoodsSoldKsh < 0) {
    return {
      isResolved: false,
      stockPurchasesKsh,
      costOfGoodsSoldKsh: null,
      otherOperatingCostsKsh,
      totalCostsKsh: otherOperatingCostsKsh,
      openingStockKsh,
      closingStockKsh,
      unresolvedReason: "CLOSING_STOCK_EXCEEDS_AVAILABLE"
    };
  }

  return {
    isResolved: true,
    stockPurchasesKsh,
    costOfGoodsSoldKsh,
    otherOperatingCostsKsh,
    totalCostsKsh: costOfGoodsSoldKsh + otherOperatingCostsKsh,
    openingStockKsh,
    closingStockKsh
  };
}

/**
 * Resolves active/inactive state of income sources based on zero-earned-income declaration.
 * Pure helper function ensuring calculation, UI, review and audit snapshots share
 * identical resolved state.
 */
export function resolveEffectiveIncomeSources(incomeSources = [], hasNoEarnedIncome = false) {
  if (!Array.isArray(incomeSources)) return [];
  return incomeSources.map((source) => {
    const rule = INCOME_SOURCE_RULES[source.sourceType] || INCOME_SOURCE_RULES.OTHER_EARNED;
    const isEarned = (rule?.bucket ?? "EARNED") === "EARNED";
    if (hasNoEarnedIncome && isEarned) {
      return {
        ...source,
        isActive: false,
        inactiveReason: "ZERO_EARNED_INCOME_DECLARED",
      };
    }
    return {
      ...source,
      isActive: true,
      inactiveReason: null,
    };
  });
}

/**
 * Validates the full array of income sources, including:
 * - Common assessment reference periods
 * - Date ranges and manual duration contradiction checks
 * - Itemised operating expenses and inventory constraints
 * - Duplicate relationships via `includedInSourceId` and `overlapAmountKsh`
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
      const s = parseDateOnly(commonAssessmentPeriod.startDate);
      const e = parseDateOnly(commonAssessmentPeriod.endDate);
      if (!s || !e) {
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
      const s = parseDateOnly(source.observationStartDate);
      const e = parseDateOnly(source.observationEndDate);
      if (!s || !e) {
        errors.push(`${prefix}: Observation start date or end date is invalid.`);
      } else if (s > e) {
        errors.push(`${prefix}: Observation start date must be before end date.`);
      } else {
        const calcMonths = calculateMonthsFromDates(source.observationStartDate, source.observationEndDate);
        months = calcMonths;

        // Check for manual duration contradiction
        if (source.monthsObserved !== undefined && source.monthsObserved !== null) {
          const rawMonths = Number(source.monthsObserved);
          if (source.manuallyEditedDuration || (rawMonths !== calcMonths && rawMonths !== 12)) {
            errors.push(`${prefix}: Manually entered observation duration (${rawMonths} months) contradicts observation dates (${calcMonths} months).`);
          }
        }
      }
    } else if (source.monthsObserved !== undefined && source.monthsObserved !== null) {
      const rawMonths = Number(source.monthsObserved);
      if (Number.isInteger(rawMonths) && rawMonths >= 1) {
        months = rawMonths;
      }
    }

    if (months === null) {
      errors.push(
        `${prefix}: Observation period must be between 1 and 12 months (or longer with documented dates), or valid start/end dates must be provided.`
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

    // Inventory validation
    const hasOpeningStock = source.openingStockKsh !== undefined && source.openingStockKsh !== null && String(source.openingStockKsh).trim() !== "";
    const hasClosingStock = source.closingStockKsh !== undefined && source.closingStockKsh !== null && String(source.closingStockKsh).trim() !== "";

    if (hasOpeningStock && readAmount(source.openingStockKsh) === null) {
      errors.push(`${prefix}: Opening stock must be a valid non-negative KSh amount.`);
    }
    if (hasClosingStock && readAmount(source.closingStockKsh) === null) {
      errors.push(`${prefix}: Closing stock must be a valid non-negative KSh amount.`);
    }

    if (hasOpeningStock && hasClosingStock) {
      const openAmt = readAmount(source.openingStockKsh);
      const closeAmt = readAmount(source.closingStockKsh);
      const stockPurchasesAmt = Array.isArray(source.expenses)
        ? source.expenses.filter(e => e.category === "STOCK_PURCHASES").reduce((s, e) => s + (Number(e.amountKsh) || 0), 0)
        : 0;
      if (openAmt !== null && closeAmt !== null && closeAmt > openAmt + stockPurchasesAmt) {
        errors.push(`${prefix}: Closing stock (KSh ${closeAmt.toLocaleString()}) cannot exceed opening stock plus purchases (KSh ${(openAmt + stockPurchasesAmt).toLocaleString()}).`);
      }
    }

    // Duplicate relationship validation (`includedInSourceId`)
    if (source.includedInSourceId) {
      const parentId = String(source.includedInSourceId).trim();
      if (parentId === id) {
        errors.push(`${prefix}: Self-reference error: Source cannot refer to itself as parent.`);
      }
      if (source.overlapAmountKsh !== undefined && source.overlapAmountKsh !== null && String(source.overlapAmountKsh).trim() !== "") {
        const overlapAmt = readAmount(source.overlapAmountKsh);
        if (overlapAmt === null) {
          errors.push(`${prefix}: Overlap amount must be a valid non-negative KSh amount.`);
        } else if (received !== null && overlapAmt > received) {
          errors.push(`${prefix}: Declared overlap amount (KSh ${overlapAmt.toLocaleString()}) cannot exceed total received amount (KSh ${received.toLocaleString()}).`);
        }
      }
    } else {
      if (source.alreadyIncludedElsewhere === true && !source.includedInSourceId) {
        errors.push(`${prefix}: Source is marked as included elsewhere but does not specify a parent source ID.`);
      }
      if (source.overlapAmountKsh !== undefined && source.overlapAmountKsh !== null && String(source.overlapAmountKsh).trim() !== "") {
        errors.push(`${prefix}: An overlap amount was declared but no parent source ID was specified.`);
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
 * stock accounting (COGS), and reimbursement reconciliation.
 */
export function calculateHouseholdIncome(sources, commonAssessmentPeriod = DEFAULT_COMMON_ASSESSMENT_PERIOD) {
  const validation = validateIncomeSources(sources, commonAssessmentPeriod);

  if (!validation.isValid) {
    return {
      isValid: false,
      canPopulatePrototypeEarnedIncomeBase: false,
      calculationStatus: "VALIDATION_FAILED",
      errors: validation.errors,
      lines: [],
      reviewFlags: [],
      duplicateRelationships: [],
      monthlyEarnedNetKsh: null,
      reviewOnlyMonthlyEarnedNetKsh: null,
      annualisedEarnedNetKsh: null,
      reviewOnlyAnnualisedEarnedNetKsh: null,
      monthlyPolicyReviewResourcesKsh: null,
      monthlyNonEarnedFlowsKsh: null,
      monthlyFiduciaryFlowsKsh: null,
      requiresManualReview: false,
      requiresPolicyDecision: false,
      calculationVersion: "household-income-ledger-v1.2",
    };
  }

  const periodAlignmentError = checkIncomePeriodAlignment(sources, commonAssessmentPeriod);

  if (periodAlignmentError) {
    return {
      isValid: true,
      calculationStatus: "BLOCKED_PERIOD_ALIGNMENT",
      canPopulatePrototypeEarnedIncomeBase: false,
      requiresManualReview: true,
      monthlyEarnedNetKsh: null,
      reviewOnlyMonthlyEarnedNetKsh: null,
      annualisedEarnedNetKsh: null,
      reviewOnlyAnnualisedEarnedNetKsh: null,
      reviewFlags: [{
        code: "ASSESSMENT_PERIOD_MISMATCH",
        message: periodAlignmentError
      }],
      errors: [],
      lines: [],
      duplicateRelationships: [],
      calculationVersion: "household-income-ledger-v1.2"
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

    let months = source.monthsObserved ? Number(source.monthsObserved) : 12;
    if (source.observationStartDate && source.observationEndDate) {
      const calcM = calculateMonthsFromDates(source.observationStartDate, source.observationEndDate);
      if (calcM !== null) {
        months = calcM;
      }
    }

    const received = Number(source.amountReceivedKsh || 0);

    // Calculate total expenses from itemised ledger or legacy field
    let itemisedExpenses = [];
    let costs = 0;
    let costOfGoodsSoldKsh = null;
    let stockPurchasesKsh = 0;
    let otherOperatingCostsKsh = 0;
    let openingStockKsh = readAmount(source.openingStockKsh);
    let closingStockKsh = readAmount(source.closingStockKsh);
    let inventoryReviewRequired = false;

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

        const hasStockPurchases = itemisedExpenses.some(e => e.category === "STOCK_PURCHASES");

        if (hasStockPurchases || openingStockKsh !== null || closingStockKsh !== null) {
          const expenseTotals = calculateBusinessExpenseTotals(source, itemisedExpenses);
          stockPurchasesKsh = expenseTotals.stockPurchasesKsh;
          costOfGoodsSoldKsh = expenseTotals.costOfGoodsSoldKsh;
          otherOperatingCostsKsh = expenseTotals.otherOperatingCostsKsh;
          costs = expenseTotals.totalCostsKsh;

          if (!expenseTotals.isResolved) {
            inventoryReviewRequired = true;
            requiresManualReview = true;
            reviewFlags.push({
              code: "INVENTORY_RECONCILIATION_REQUIRED",
              sourceId: source.id,
              message: expenseTotals.unresolvedReason === "MISSING_INVENTORY_VALUES"
                ? `${rule.label} declared stock purchases of KSh ${stockPurchasesKsh.toLocaleString()} but opening or closing inventory values were not provided. Cost of goods sold cannot be verified; manual inventory review required.`
                : `${rule.label} declared closing stock exceeding opening stock plus stock purchases. Cost of goods sold cannot be negative.`
            });
          }
        } else {
          costs = itemisedExpenses.reduce((sum, e) => sum + (e.isAllowablePrototype ? e.amountKsh : 0), 0);
          otherOperatingCostsKsh = costs;
        }
      } else if (source.directCostsKsh !== undefined && source.directCostsKsh !== null) {
        costs = Number(source.directCostsKsh);
        otherOperatingCostsKsh = costs;
        itemisedExpenses = [{
          id: `exp-legacy-${source.id}`,
          category: "OTHER_OPERATING",
          categoryLabel: OPERATING_EXPENSE_CATEGORIES.OTHER_OPERATING.label,
          amountKsh: costs,
          isAllowablePrototype: true,
          description: "Reported direct operating costs (member-declared and unverified)"
        }];
      }
      if (source.isActive !== false) {
        totalDeductedBusinessExpenses += costs;
      }
    }

    // Inactive handling (e.g. zero-earned-income declared while retaining draft records)
    const isInactive = source.isActive === false;

    // Duplicate relationship handling (`includedInSourceId` takes precedence over legacy boolean)
    let isDuplicate = false;
    let isPartialDuplicate = false;
    let parentSourceId = null;
    let duplicateOverlapAmountKsh = 0;
    let countedReceivedKsh = received;

    if (source.includedInSourceId) {
      parentSourceId = String(source.includedInSourceId).trim();
      const parentSource = sourceMap.get(parentSourceId);
      const parentLabel = parentSource
        ? (INCOME_SOURCE_RULES[parentSource.sourceType]?.label || parentSource.sourceType)
        : parentSourceId;

      const hasDeclaredOverlap =
        source.overlapAmountKsh !== undefined &&
        source.overlapAmountKsh !== null &&
        String(source.overlapAmountKsh).trim() !== "";

      duplicateOverlapAmountKsh = hasDeclaredOverlap
        ? (readAmount(source.overlapAmountKsh) ?? received)
        : received;

      if (duplicateOverlapAmountKsh >= received) {
        isDuplicate = true;
        isPartialDuplicate = false;
        countedReceivedKsh = 0;
        duplicateRelationships.push({
          childSourceId: source.id,
          duplicateSourceId: source.id,
          duplicateSourceLabel: rule.label,
          parentSourceId: parentSourceId,
          parentSourceLabel: parentLabel,
          overlapAmountKsh: received,
          isPartial: false,
          treatment: "Full duplicate: entire source excluded from earned income.",
          reason: "Member-declared overlap — unverified pending supporting evidence (100% duplicate)"
        });
      } else {
        isDuplicate = false;
        isPartialDuplicate = true;
        countedReceivedKsh = Math.max(0, received - duplicateOverlapAmountKsh);
        duplicateRelationships.push({
          childSourceId: source.id,
          duplicateSourceId: source.id,
          duplicateSourceLabel: rule.label,
          parentSourceId: parentSourceId,
          parentSourceLabel: parentLabel,
          overlapAmountKsh: duplicateOverlapAmountKsh,
          isPartial: true,
          treatment: `Deducted Member-declared overlap (unverified pending supporting evidence) of KSh ${duplicateOverlapAmountKsh.toLocaleString()}; remaining KSh ${countedReceivedKsh.toLocaleString()} counted.`,
          reason: "Member-declared overlap — unverified pending supporting evidence"
        });
      }
    } else if (source.alreadyIncludedElsewhere === true) {
      isDuplicate = true;
      duplicateOverlapAmountKsh = received;
      countedReceivedKsh = 0;
    }

    const reportedNet = countedReceivedKsh - costs;
    const monthlyReceived = countedReceivedKsh / months;
    const monthlyCosts = costs / months;
    const monthlyNet = reportedNet / months;

    let countedInEarnedIncome = false;

    if (isInactive) {
      // Inactive sources are preserved in ledger output but NOT counted
      countedInEarnedIncome = false;
    } else if (rule.bucket === "EARNED" && !isDuplicate) {
      monthlyEarnedTotal += monthlyNet;
      countedInEarnedIncome = true;
    }

    const parentName = parentSourceId && sourceMap.has(parentSourceId)
      ? `${INCOME_SOURCE_RULES[sourceMap.get(parentSourceId).sourceType]?.label || parentSourceId} (ID: ${parentSourceId})`
      : "another declared source";

    if (isDuplicate) {
      reviewFlags.push({
        code: "DUPLICATE_SOURCE_NOT_COUNTED",
        sourceId: source.id,
        parentSourceId: parentSourceId,
        message: `${rule.label} (ID: ${source.id}) was identified as already included in ${parentName}. It was not added to the earned income base.`,
      });
    } else if (isPartialDuplicate) {
      reviewFlags.push({
        code: "PARTIAL_DUPLICATE_OVERLAP_DEDUCTED",
        sourceId: source.id,
        parentSourceId: parentSourceId,
        message: `${rule.label} (ID: ${source.id}) declared a partial overlap of KSh ${duplicateOverlapAmountKsh.toLocaleString()} with ${parentName}. Member-declared overlap — unverified pending supporting evidence. Only the unshared amount (KSh ${countedReceivedKsh.toLocaleString()}) was counted in the assessment.`,
      });
    }

    if (!isInactive) {
      if (rule.bucket === "POLICY_REVIEW") {
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
    }

    // Observation period safeguards (only for active sources)
    const requiresFullYear = source.sourceType === "AGRICULTURE" || source.isSeasonal === true;
    let periodStatus = "FULL_ANNUAL";

    if (!isInactive) {
      if (inventoryReviewRequired) {
        periodStatus = "INVENTORY_RECONCILIATION_REQUIRED";
      } else if (months > 12) {
        periodStatus = "BLOCKED_EXTENDED_OBSERVATION_PERIOD";
        reviewFlags.push({
          code: "EXTENDED_OBSERVATION_PERIOD",
          sourceId: source.id,
          message: `${rule.label} covers ${months} observed months (longer than standard 12-month window). Extended observation periods are blocked from automated annualisation; manual review required.`,
        });
      } else if (requiresFullYear && months < 12) {
        requiresManualReview = true;
        periodStatus = "SEASONAL_INCOMPLETE";
        reviewFlags.push({
          code: "SEASONAL_PERIOD_INCOMPLETE",
          sourceId: source.id,
          message: `${rule.label} has only ${months} observed months. Full 12-month coverage is required for seasonal activities to prevent peak harvest extrapolation.`,
        });
      } else if (!requiresFullYear && months < 3) {
        if (rule.bucket === "EARNED") {
          requiresManualReview = true;
          periodStatus = "LIMITED_OBSERVATION_PERIOD";
          reviewFlags.push({
            code: "LIMITED_OBSERVATION_PERIOD",
            sourceId: source.id,
            message: `${rule.label} has fewer than 3 observed months. This observation window cannot establish a reliable pattern and requires manual review.`,
          });
        } else {
          // Non-earned and fiduciary flows (loans, reimbursements, chama funds, transfers)
          // are non-earned flows excluded from earned income. Their observation period does
          // not block calculation of valid earned income.
          periodStatus = "SHORT_FLOW_RECORDED";
        }
      } else if (!requiresFullYear && months < 12) {
        if (rule.bucket === "EARNED") {
          periodStatus = "SHORT_WINDOW_PROVISIONAL";
          reviewFlags.push({
            code: "SHORT_WINDOW_PROVISIONAL",
            sourceId: source.id,
            message: `${rule.label} covers ${months} observed months. Monthly average is provisional and not an established annual pattern.`,
          });
        } else {
          periodStatus = "SHORT_FLOW_RECORDED";
        }
      }

      if (rule.bucket === "EARNED" && reportedNet < 0) {
        requiresManualReview = true;
        reviewFlags.push({
          code: "NEGATIVE_REPORTED_NET",
          sourceId: source.id,
          message: `${rule.label} has reported operating costs exceeding receipts (KSh ${reportedNet.toLocaleString()}). Manual review required.`,
        });
      }
    } else {
      periodStatus = "INACTIVE_RECORD";
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

      openingStockKsh,
      closingStockKsh,
      stockPurchasesKsh: roundKsh(stockPurchasesKsh),
      costOfGoodsSoldKsh: costOfGoodsSoldKsh !== null ? roundKsh(costOfGoodsSoldKsh) : null,
      otherOperatingCostsKsh: roundKsh(otherOperatingCostsKsh),

      overlapAmountKsh: duplicateOverlapAmountKsh > 0 ? roundKsh(duplicateOverlapAmountKsh) : null,
      countedReceivedKsh: roundKsh(countedReceivedKsh),

      averageMonthlyReceivedKsh: roundKsh(monthlyReceived),
      averageMonthlyCostsKsh: roundKsh(monthlyCosts),
      averageMonthlyNetKsh: roundKsh(monthlyNet),

      countedInEarnedIncome,
      isDuplicate,
      isPartialDuplicate,
      includedInSourceId: parentSourceId,
      alreadyIncludedElsewhere: isDuplicate || isPartialDuplicate,

      isActive: !isInactive,
      inactiveReason: isInactive ? (source.inactiveReason || "ZERO_EARNED_INCOME_DECLARED") : null,

      isSeasonal: source.isSeasonal === true,
      provenance: source.provenance || "MEMBER_DECLARED_UNVERIFIED",
    };
  });

  // Safeguard: Source-specific reimbursement double-counting check
  let hasUnresolvedReimbursements = false;
  const reimbursementLines = lines.filter(l => l.sourceType === "REIMBURSEMENT");
  const earnedLinesWithExpenses = lines.filter(l => l.isActive && l.bucket === "EARNED" && l.totalReportedCostsKsh > 0);

  if (reimbursementLines.length > 0 && earnedLinesWithExpenses.length > 0) {
    reimbursementLines.forEach(rLine => {
      const rawSource = sourceMap.get(rLine.sourceId);
      const targetSourceId = rawSource?.targetSourceId || rawSource?.reimbursementTargetSourceId;
      const isPersonal = rawSource?.isPersonalReimbursement === true || rawSource?.reimbursementCategory === "PERSONAL";

      if (isPersonal) {
        return; // Personal reimbursement does not conflict with business expenses
      }

      if (targetSourceId) {
        const targetLine = lines.find(l => l.sourceId === String(targetSourceId).trim());
        if (targetLine && targetLine.totalReportedCostsKsh > 0) {
          hasUnresolvedReimbursements = true;
          rLine.periodStatus = "REIMBURSEMENT_RECONCILIATION_REQUIRED";
          reviewFlags.push({
            code: "REIMBURSEMENT_RECONCILIATION_REQUIRED",
            sourceId: rLine.sourceId,
            targetSourceId: targetSourceId,
            message: `Reimbursement '${rLine.label}' (ID: ${rLine.sourceId}) is linked to business source '${targetLine.label}' (ID: ${targetSourceId}) with deducted operating expenses of KSh ${targetLine.totalReportedCostsKsh.toLocaleString()}. Confirm whether any reimbursed expense was already deducted.`
          });
        }
      } else {
        // Target source is unspecified while business expenses exist
        hasUnresolvedReimbursements = true;
        rLine.periodStatus = "REIMBURSEMENT_RECONCILIATION_REQUIRED";
        reviewFlags.push({
          code: "REIMBURSEMENT_RECONCILIATION_REQUIRED",
          sourceId: rLine.sourceId,
          message: "Reported reimbursements coexist with deducted business operating expenses, but no specific target source was linked. Confirm whether any reimbursed expense has already been deducted before this income assessment can proceed."
        });
      }
    });
  }

  if (hasUnresolvedReimbursements) {
    requiresManualReview = true;
  }

  const hasExtendedPeriod = lines.some(
    line => line.periodStatus === "BLOCKED_EXTENDED_OBSERVATION_PERIOD" || line.periodStatus === "EXTENDED_PERIOD"
  );

  const hasProvisionalShortWindowSources = lines.some(
    line => line.periodStatus === "SHORT_WINDOW_PROVISIONAL"
  );

  const hasInventoryReview = lines.some(
    line => line.periodStatus === "INVENTORY_RECONCILIATION_REQUIRED"
  );

  const canPopulatePrototypeEarnedIncomeBase =
    !requiresManualReview &&
    !hasProvisionalShortWindowSources &&
    !hasInventoryReview &&
    !hasUnresolvedReimbursements &&
    !hasExtendedPeriod &&
    !requiresPolicyDecision;

  const reviewOnlyMonthlyEarnedNetKsh = roundKsh(monthlyEarnedTotal);

  const monthlyEarnedNetKsh = canPopulatePrototypeEarnedIncomeBase
    ? reviewOnlyMonthlyEarnedNetKsh
    : null;

  let calculationStatus = "CALCULATED_STANDARD";

  if (hasExtendedPeriod) {
    calculationStatus = "BLOCKED_EXTENDED_OBSERVATION_PERIOD";
  } else if (requiresManualReview || hasInventoryReview || hasUnresolvedReimbursements) {
    calculationStatus = "BLOCKED_MANUAL_REVIEW";
  } else if (hasProvisionalShortWindowSources) {
    calculationStatus = "BLOCKED_SHORT_WINDOW_REVIEW";
  } else if (requiresPolicyDecision) {
    calculationStatus = "PROVISIONAL_PENDING_POLICY";
  }

  const snapshot = JSON.parse(JSON.stringify(sources));

  return {
    isValid: true,
    calculationVersion: "household-income-ledger-v1.2",
    timestamp: new Date().toISOString(),

    calculationStatus,
    canPopulatePrototypeEarnedIncomeBase,

    commonAssessmentPeriod: commonAssessmentPeriod || DEFAULT_COMMON_ASSESSMENT_PERIOD,

    lines,
    duplicateRelationships,
    reproducibleInputSnapshot: snapshot,

    monthlyEarnedNetKsh,
    reviewOnlyMonthlyEarnedNetKsh,

    annualisedEarnedNetKsh:
      monthlyEarnedNetKsh === null
        ? null
        : roundKsh(monthlyEarnedNetKsh * 12),

    reviewOnlyAnnualisedEarnedNetKsh:
      roundKsh(reviewOnlyMonthlyEarnedNetKsh * 12),

    monthlyPolicyReviewResourcesKsh: roundKsh(monthlyPolicyReviewTotal),
    monthlyNonEarnedFlowsKsh: roundKsh(monthlyNonEarnedTotal),
    monthlyFiduciaryFlowsKsh: roundKsh(monthlyFiduciaryTotal),

    requiresManualReview,
    requiresPolicyDecision,
    policyDecisionSummary: requiresPolicyDecision
      ? "Transfers and social assistance require approved SHA policy rules regarding means-testing inclusion or exclusion."
      : null,

    reviewFlags,

    hasExtendedPeriod,
    hasProvisionalShortWindowSources,
    hasInventoryReview,
    hasUnresolvedReimbursements,

    annualisationReliability: !canPopulatePrototypeEarnedIncomeBase
      ? "NOT_APPROVED_FOR_CLASSIFICATION"
      : "STANDARD_ANNUAL_ESTIMATE",

    allowableCostsPolicyNotice: "Reported operating cost deductions represent research prototype assumptions for informal-sector net earnings. Formal deduction categories, caps, and verification guidelines require statutory approval by SHA and MoH.",
    reimbursementReconciliationNotice: hasUnresolvedReimbursements
      ? "Reimbursements detected alongside deducted operating expenses. Assessment blocked pending reconciliation to prevent double recovery."
      : (totalReportedReimbursements > 0 ? "Reimbursements reported with no deducted operating expenses." : "No reimbursements reported."),

    calculationScope: "PROTOTYPE_EARNED_INCOME_SUBTOTAL_ONLY",

    disclaimer:
      "This calculation estimates a reported net earned-income subtotal under prototype rules. It is not an official SHA means-testing determination or government subsidy approval. Other household resources, allowable deductions and transfer treatment require formal SHA policy and legal evaluation.",
  };
}

/**
 * Creates an authoritative, valid explicit zero-earned-income assessment state.
 * Used when a household explicitly declares having no earned income from active livelihoods.
 */
export function createZeroEarnedIncomeAssessment(commonAssessmentPeriod = null) {
  return {
    isValid: true,
    calculationVersion: "household-income-ledger-v1.2",
    timestamp: new Date().toISOString(),
    calculationStatus: "CALCULATED_EXPLICIT_ZERO_EARNED",
    canPopulatePrototypeEarnedIncomeBase: true,
    hasDeclaredNoEarnedIncome: true,
    commonAssessmentPeriod: commonAssessmentPeriod || DEFAULT_COMMON_ASSESSMENT_PERIOD,
    lines: [],
    duplicateRelationships: [],
    reproducibleInputSnapshot: [],
    monthlyEarnedNetKsh: 0,
    reviewOnlyMonthlyEarnedNetKsh: 0,
    annualisedEarnedNetKsh: 0,
    reviewOnlyAnnualisedEarnedNetKsh: 0,
    monthlyPolicyReviewResourcesKsh: 0,
    monthlyNonEarnedFlowsKsh: 0,
    monthlyFiduciaryFlowsKsh: 0,
    requiresManualReview: false,
    requiresPolicyDecision: false,
    policyDecisionSummary: null,
    reviewFlags: [
      {
        code: "EXPLICIT_ZERO_EARNED_INCOME",
        message: "Household has explicitly declared no earned income from active livelihoods.",
      }
    ],
    hasExtendedPeriod: false,
    hasProvisionalShortWindowSources: false,
    hasInventoryReview: false,
    hasUnresolvedReimbursements: false,
    annualisationReliability: "EXPLICIT_ZERO_ANNUAL_ESTIMATE",
    allowableCostsPolicyNotice: "Operating expense rules reflect research assumptions. Official deduction allowances require SHA approval.",
    reimbursementReconciliationNotice: "No reimbursements reported.",
    calculationScope: "PROTOTYPE_EARNED_INCOME_SUBTOTAL_ONLY",
    disclaimer: "Household explicitly declared zero earned income from active livelihoods. Under statutory rules (Regulation 17(2), formerly cited as Regulation 18(2)), the minimum contribution rule of KSh 300/mo applies. This minimum contribution does not constitute a determination of indigence or an approval for financial assistance under Regulation 18 (formerly cited as Regulation 19)."
  };
}

/**
 * Reproduces the exact household income calculation from a saved snapshot.
 */
export function reproduceHouseholdIncome(snapshot, commonAssessmentPeriod = null) {
  if (snapshot && typeof snapshot === "object" && snapshot.hasDeclaredNoEarnedIncome === true) {
    return createZeroEarnedIncomeAssessment(commonAssessmentPeriod);
  }
  return calculateHouseholdIncome(snapshot, commonAssessmentPeriod);
}
