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
 * Does not arbitrarily truncate periods longer than 12 months.
 */
export function calculateMonthsFromDates(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  if (start > end) return null;

  // Real calendar months difference
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const dayDiff = (end.getDate() - start.getDate()) / 30;
  const totalMonths = Math.max(1, Math.round(yearDiff * 12 + monthDiff + dayDiff));
  return totalMonths;
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
      const s = new Date(source.observationStartDate);
      const e = new Date(source.observationEndDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
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

    // Duplicate relationship validation (`includedInSourceId`)
    if (source.includedInSourceId) {
      const parentId = String(source.includedInSourceId).trim();
      if (parentId === id) {
        errors.push(`${prefix}: Self-reference error: Source cannot refer to itself as parent.`);
      }
    } else if (source.alreadyIncludedElsewhere === true && !source.includedInSourceId) {
      errors.push(`${prefix}: Source is marked as included elsewhere but does not specify a parent source ID.`);
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
      calculationStatus: "VALIDATION_FAILED",
      errors: validation.errors,
      lines: [],
      reviewFlags: [],
      duplicateRelationships: [],
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

    if (rule.costsAllowed) {
      if (Array.isArray(source.expenses) && source.expenses.length > 0) {
        itemisedExpenses = source.expenses.map((e, idx) => ({
          id: e.id || `exp-${source.id || 'src'}-${idx + 1}`,
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
      if (source.isActive !== false) {
        totalDeductedBusinessExpenses += costs;
      }
    }

    const reportedNet = received - costs;
    const monthlyReceived = received / months;
    const monthlyCosts = costs / months;
    const monthlyNet = reportedNet / months;

    // Inactive handling (e.g. zero-earned-income declared while retaining draft records)
    const isInactive = source.isActive === false;

    // Duplicate relationship handling (`includedInSourceId` takes precedence over legacy boolean)
    let isDuplicate = false;
    let parentSourceId = null;

    if (source.includedInSourceId) {
      parentSourceId = String(source.includedInSourceId).trim();
      isDuplicate = true;
      const parentSource = sourceMap.get(parentSourceId);
      const parentLabel = parentSource
        ? (INCOME_SOURCE_RULES[parentSource.sourceType]?.label || parentSource.sourceType)
        : parentSourceId;
      duplicateRelationships.push({
        childSourceId: source.id,
        duplicateSourceId: source.id,
        duplicateSourceLabel: rule.label,
        parentSourceId: parentSourceId,
        parentSourceLabel: parentLabel,
        reason: "Declared as included in parent source"
      });
    } else if (source.alreadyIncludedElsewhere === true) {
      isDuplicate = true;
    }

    let countedInEarnedIncome = false;

    if (isInactive) {
      // Inactive sources are preserved in ledger output but NOT counted
      countedInEarnedIncome = false;
    } else if (rule.bucket === "EARNED" && !isDuplicate) {
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

    // Observation period safeguards (only for active sources)
    const requiresFullYear = source.sourceType === "AGRICULTURE" || source.isSeasonal === true;
    let periodStatus = "FULL_ANNUAL";

    if (!isInactive) {
      if (months > 12) {
        periodStatus = "EXTENDED_PERIOD";
        reviewFlags.push({
          code: "EXTENDED_OBSERVATION_PERIOD",
          sourceId: source.id,
          message: `${rule.label} covers ${months} observed months (longer than standard 12-month window). Monthly average is calculated over ${months} months and annualised.`,
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

      averageMonthlyReceivedKsh: roundKsh(monthlyReceived),
      averageMonthlyCostsKsh: roundKsh(monthlyCosts),
      averageMonthlyNetKsh: roundKsh(monthlyNet),

      countedInEarnedIncome,
      isDuplicate,
      includedInSourceId: parentSourceId,
      alreadyIncludedElsewhere: isDuplicate,

      isActive: !isInactive,
      inactiveReason: isInactive ? (source.inactiveReason || "ZERO_EARNED_INCOME_DECLARED") : null,

      isSeasonal: source.isSeasonal === true,
      provenance: source.provenance || "MEMBER_DECLARED_UNVERIFIED",
    };
  });

  // Safeguard: Reimbursement double-counting check
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

  let calculationStatus = "CALCULATED_STANDARD";
  if (requiresManualReview) {
    calculationStatus = "BLOCKED_MANUAL_REVIEW";
  } else if (requiresPolicyDecision) {
    calculationStatus = "PROVISIONAL_PENDING_POLICY";
  }

  const snapshot = JSON.parse(JSON.stringify(sources));

  return {
    isValid: true,
    calculationVersion: "household-income-ledger-v1.1",
    timestamp: new Date().toISOString(),

    calculationStatus,
    canPopulatePrototypeEarnedIncomeBase,

    commonAssessmentPeriod: commonAssessmentPeriod || {
      windowMonths: 12,
      note: "Standard 12-month rolling assessment window (prototype design parameter; requires formal SHA policy confirmation)",
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
    policyDecisionSummary: requiresPolicyDecision
      ? "Transfers and social assistance require approved SHA policy rules regarding means-testing inclusion or exclusion."
      : null,

    reviewFlags,

    hasProvisionalShortWindowSources: lines.some(l => l.periodStatus === "SHORT_WINDOW_PROVISIONAL"),
    annualisationReliability: lines.some(l => l.periodStatus === "SHORT_WINDOW_PROVISIONAL")
      ? "PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION"
      : (canPopulatePrototypeEarnedIncomeBase ? "STANDARD_ANNUAL_ESTIMATE" : "UNRELIABLE_MANUAL_REVIEW_REQUIRED"),

    allowableCostsPolicyNotice: "Reported operating cost deductions represent research prototype assumptions for informal-sector net earnings. Formal deduction categories, caps, and verification guidelines require statutory approval by SHA and MoH.",
    reimbursementReconciliationNotice: totalReportedReimbursements > 0
      ? "Reimbursements detected. Comprehensive reconciliation requires explicit itemised expense-to-reimbursement mapping to avoid double recovery."
      : "No reimbursements reported.",

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
    calculationVersion: "household-income-ledger-v1.1",
    timestamp: new Date().toISOString(),
    calculationStatus: "CALCULATED_EXPLICIT_ZERO_EARNED",
    canPopulatePrototypeEarnedIncomeBase: true,
    hasDeclaredNoEarnedIncome: true,
    commonAssessmentPeriod: commonAssessmentPeriod || {
      windowMonths: 12,
      note: "Standard 12-month rolling assessment window (formal standard requires SHA policy confirmation)",
    },
    lines: [],
    duplicateRelationships: [],
    reproducibleInputSnapshot: {
      hasDeclaredNoEarnedIncome: true,
      sources: [],
    },
    monthlyEarnedNetKsh: 0,
    annualisedEarnedNetKsh: 0,
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
    hasProvisionalShortWindowSources: false,
    annualisationReliability: "EXPLICIT_ZERO_ANNUAL_ESTIMATE",
    allowableCostsPolicyNotice: "Operating expense rules reflect research assumptions. Official deduction allowances require SHA approval.",
    reimbursementReconciliationNotice: "No reimbursements reported.",
    calculationScope: "PROTOTYPE_EARNED_INCOME_SUBTOTAL_ONLY",
    disclaimer: "Household explicitly declared zero earned income from active livelihoods. Under statutory rules (Regulation 18(2)), the minimum contribution rule of KSh 300/mo applies. This minimum contribution does not constitute a determination of indigence or an approval for financial assistance under Regulation 19."
  };
}

/**
 * Reproduces the exact household income calculation from a saved snapshot.
 *
 * NOTE: Only an explicit snapshot object carrying hasDeclaredNoEarnedIncome: true
 * triggers the explicit zero-income assessment. An empty array ([]) without the sentinel
 * marker represents missing or invalid data and is evaluated via calculateHouseholdIncome(),
 * which returns validation errors.
 */
export function reproduceHouseholdIncome(snapshot, commonAssessmentPeriod = null) {
  if (snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) && snapshot.hasDeclaredNoEarnedIncome === true) {
    return createZeroEarnedIncomeAssessment(commonAssessmentPeriod);
  }
  return calculateHouseholdIncome(snapshot, commonAssessmentPeriod);
}
