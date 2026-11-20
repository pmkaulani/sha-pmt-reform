/**
 * Appeal Workflow Helper Library (Phase 2 & Phase 3 Data Contract)
 *
 * Provides pure validation, normalization, reference generation, and difference
 * calculation functions for member assessment challenges.
 *
 * NOTE: This library operates entirely in local prototype memory. It does not
 * submit appeals to SHA, connect to government databases, or establish official
 * legal determination rules.
 */

export const DISPUTE_CATEGORIES = [
  { key: "household_size", label: "Household size & family composition", prototypeField: "householdSize" },
  { key: "declared_earnings", label: "Declared household net earnings", prototypeField: "monthlyNetEarnedIncome" },
  { key: "employment_livelihood", label: "Employment & livelihood (e.g. seasonal, informal)", prototypeField: "isSeasonalWorker" },
  { key: "housing_circumstances", label: "Housing circumstances & urban rent", prototypeField: "monthlyRent" },
  { key: "asset_ownership", label: "Asset ownership (vehicles, land, livestock, SACCO capital)", prototypeField: "assets" },
  { key: "dependants", label: "Household dependants (education, chronic illness, disability)", prototypeField: "hasChronicIllness" },
  { key: "liquidity_transactions", label: "Liquidity & mobile money activity (e.g. chama group funds)", prototypeField: "isGroupTreasurer" },
  { key: "other", label: "Other assessment information", prototypeField: null }
];

export const EVIDENCE_CATEGORIES = [
  { key: "payslip_employer", label: "Payslip or employer letter" },
  { key: "bank_mpesa_statement", label: "Bank or M-PESA statement" },
  { key: "business_records", label: "Business, farming or livelihood records" },
  { key: "tenancy_agreement", label: "Rental or tenancy agreement / rent receipts" },
  { key: "household_dependant_doc", label: "Household or dependant identity records" },
  { key: "birth_cert_school_doc", label: "Birth certificates or school enrolment documentation" },
  { key: "disability_medical_doc", label: "Disability card or medical practitioner documentation" },
  { key: "asset_ownership_doc", label: "Land title, vehicle logbook or sale/disposal agreements" },
  { key: "chief_admin_letter", label: "Chief's or local administration verification letter" },
  { key: "other_doc", label: "Other supporting documentation" }
];

export const REQUESTED_RESOLUTIONS = [
  { key: "human_review", label: "A human review of the assessment" },
  { key: "correct_records", label: "Correction of household or source records" },
  { key: "explanation", label: "A clear explanation of the calculation" },
  { key: "reassessment", label: "A reassessment after corrections" }
];

/**
 * Generate a local-only draft reference.
 * Form: LOCAL-DRAFT-YYYYMMDD-XXXXXX
 * Guarantees never to use SHA- or official government prefixes.
 */
export function generateLocalDraftReference(date = new Date()) {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const suffix = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 6).toUpperCase()
    : Math.random().toString(36).slice(2, 8).toUpperCase();

  return `LOCAL-DRAFT-${dateStr}-${suffix}`;
}

/**
 * Safely calculate numeric difference between original and corrected values.
 * Returns null if either value is not a finite number.
 */
export function calculateDisputeNumericDifference(originalVal, correctedVal) {
  if (originalVal === null || originalVal === undefined || originalVal === "" ||
      correctedVal === null || correctedVal === undefined || correctedVal === "") {
    return null;
  }
  const origNum = Number(originalVal);
  const corrNum = Number(correctedVal);
  if (!Number.isFinite(origNum) || !Number.isFinite(corrNum)) {
    return null;
  }
  return corrNum - origNum;
}

/**
 * Validate assessment information supplied by member.
 */
export function validateAssessmentDetails(assessment = {}) {
  const errors = {};

  if (!assessment.receivedDate || typeof assessment.receivedDate !== "string" || !assessment.receivedDate.trim()) {
    errors.receivedDate = "Date assessment was received is required.";
  } else {
    const receivedTime = new Date(assessment.receivedDate).getTime();
    if (isNaN(receivedTime)) {
      errors.receivedDate = "Invalid received date format.";
    } else {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (receivedTime > today.getTime()) {
        errors.receivedDate = "Received date cannot be in the future.";
      }
    }
  }

  const hasStart = Boolean(assessment.assessmentPeriodStart && assessment.assessmentPeriodStart.trim());
  const hasEnd = Boolean(assessment.assessmentPeriodEnd && assessment.assessmentPeriodEnd.trim());

  if (!hasStart) {
    errors.assessmentPeriodStart = "Assessment period start date is required.";
  } else if (isNaN(new Date(assessment.assessmentPeriodStart).getTime())) {
    errors.assessmentPeriodStart = "Invalid period start date.";
  }

  if (!hasEnd) {
    errors.assessmentPeriodEnd = "Assessment period end date is required.";
  } else if (isNaN(new Date(assessment.assessmentPeriodEnd).getTime())) {
    errors.assessmentPeriodEnd = "Invalid period end date.";
  }

  if (hasStart && hasEnd && !errors.assessmentPeriodStart && !errors.assessmentPeriodEnd) {
    const startTime = new Date(assessment.assessmentPeriodStart).getTime();
    const endTime = new Date(assessment.assessmentPeriodEnd).getTime();
    if (startTime > endTime) {
      errors.assessmentPeriodEnd = "Period start date cannot be after end date.";
    }
  }

  if (assessment.assessedMonthlyContribution === null ||
      assessment.assessedMonthlyContribution === undefined ||
      String(assessment.assessedMonthlyContribution).trim() === "") {
    errors.assessedMonthlyContribution = "Assessed monthly contribution amount is required.";
  } else {
    const amount = Number(assessment.assessedMonthlyContribution);
    if (!Number.isFinite(amount)) {
      errors.assessedMonthlyContribution = "Assessed contribution must be a valid number.";
    } else if (amount < 0) {
      errors.assessedMonthlyContribution = "Assessed contribution cannot be negative.";
    }
  }

  if (assessment.memberRequestedMonthlyContribution !== null &&
      assessment.memberRequestedMonthlyContribution !== undefined &&
      String(assessment.memberRequestedMonthlyContribution).trim() !== "") {
    const reqAmount = Number(assessment.memberRequestedMonthlyContribution);
    if (!Number.isFinite(reqAmount)) {
      errors.memberRequestedMonthlyContribution = "Requested contribution must be a valid number.";
    } else if (reqAmount < 0) {
      errors.memberRequestedMonthlyContribution = "Requested contribution cannot be negative.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate structured dispute items.
 */
export function validateDisputes(disputes = []) {
  const errors = [];
  if (!Array.isArray(disputes) || disputes.length === 0) {
    return {
      isValid: false,
      errors: ["At least one disputed assessment item must be added."]
    };
  }

  disputes.forEach((item, idx) => {
    const itemErrors = {};
    if (!item.fieldKey || !item.fieldKey.trim()) {
      itemErrors.fieldKey = "Disputed category is required.";
    }
    if (item.valueAsPresented === null || item.valueAsPresented === undefined || !String(item.valueAsPresented).trim()) {
      itemErrors.valueAsPresented = "Original value as presented is required.";
    }
    if (item.correctedValue === null || item.correctedValue === undefined || !String(item.correctedValue).trim()) {
      itemErrors.correctedValue = "Corrected value is required.";
    }
    if (!item.explanation || item.explanation.trim().length < 10) {
      itemErrors.explanation = "Explanation must be at least 10 characters.";
    }
    if (Object.keys(itemErrors).length > 0) {
      errors.push({ index: idx, errors: itemErrors });
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate an entire challenge data payload.
 */
export function validateChallengeData(data = {}) {
  const errors = {};

  const assessVal = validateAssessmentDetails(data.assessment || {});
  if (!assessVal.isValid) {
    errors.assessment = assessVal.errors;
  }

  const disputeVal = validateDisputes(data.disputes || []);
  if (!disputeVal.isValid) {
    errors.disputes = disputeVal.errors;
  }

  if (!Array.isArray(data.grounds) || data.grounds.length === 0) {
    errors.grounds = "Select at least one ground for challenging the assessment.";
  }

  if (!data.generalExplanation || data.generalExplanation.trim().length < 20) {
    errors.generalExplanation = "General explanation must be at least 20 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Safely build an independent JSON-safe assessment input snapshot for reproducible modeling.
 * Preserves the genuine calculation inputs, preserving real values, genuine zeros, and missing values
 * without silently converting missing or invalid inputs into zero or default numbers.
 */
export function buildAssessmentInputSnapshot(rawInput = {}) {
  if (!rawInput || typeof rawInput !== "object") {
    return {
      snapshotType: "PROTOTYPE_INPUT_SNAPSHOT",
      disclaimer: "PROTOTYPE INPUT SNAPSHOT — NOT AN OFFICIAL SHA RECORD",
      capturedAt: new Date().toISOString()
    };
  }

  // Deep clone raw inputs to guarantee an independent copy
  const cloned = JSON.parse(JSON.stringify(rawInput));

  const snapshot = {
    snapshotType: "PROTOTYPE_INPUT_SNAPSHOT",
    disclaimer: "PROTOTYPE INPUT SNAPSHOT — NOT AN OFFICIAL SHA RECORD",
    capturedAt: new Date().toISOString(),
    ...cloned
  };

  // Ensure collection arrays are valid arrays if omitted in partial/mock objects
  if (!Array.isArray(snapshot.assets)) snapshot.assets = [];
  if (!Array.isArray(snapshot.vehicles)) snapshot.vehicles = [];
  if (!Array.isArray(snapshot.landParcels)) snapshot.landParcels = [];
  if (!Array.isArray(snapshot.rentalProperties)) snapshot.rentalProperties = [];

  // Preserve explicit undefined properties if rawInput had them (JSON.stringify omits undefined keys)
  if (!("monthlyNetEarnedIncome" in snapshot) && ("monthlyNetEarnedIncome" in rawInput)) {
    snapshot.monthlyNetEarnedIncome = rawInput.monthlyNetEarnedIncome;
  }
  if (!("householdSize" in snapshot) && ("householdSize" in rawInput)) {
    snapshot.householdSize = rawInput.householdSize;
  }

  // Ensure genuine monthlyRent property is present if legacy rentMonthly alias was provided
  if (snapshot.monthlyRent === undefined && snapshot.rentMonthly !== undefined) {
    snapshot.monthlyRent = snapshot.rentMonthly;
  }

  return snapshot;
}

/**
 * Normalize and construct a clean challenge draft record.
 * Guarantees attachment contents are never stored (metadata only).
 */
export function createNormalizedChallengeDraft(data = {}, householdContext = null, rawInputSnapshot = null) {
  const draftReference = data.draftReference && String(data.draftReference).startsWith("LOCAL-DRAFT-")
    ? data.draftReference
    : generateLocalDraftReference();

  const assessment = data.assessment || {};
  const assessedNum = assessment.assessedMonthlyContribution !== null &&
    assessment.assessedMonthlyContribution !== undefined &&
    String(assessment.assessedMonthlyContribution).trim() !== ""
      ? Number(assessment.assessedMonthlyContribution)
      : null;

  const requestedNum = assessment.memberRequestedMonthlyContribution !== null &&
    assessment.memberRequestedMonthlyContribution !== undefined &&
    String(assessment.memberRequestedMonthlyContribution).trim() !== ""
      ? Number(assessment.memberRequestedMonthlyContribution)
      : null;

  const disputes = (Array.isArray(data.disputes) ? data.disputes : []).map((disp, idx) => {
    const category = DISPUTE_CATEGORIES.find(c => c.key === disp.fieldKey);
    const fieldLabel = disp.fieldLabel || (category ? category.label : "Other assessment information");
    const valPres = String(disp.valueAsPresented ?? "").trim();
    const corrVal = String(disp.correctedValue ?? "").trim();
    return {
      id: disp.id || `disp-${Date.now()}-${idx + 1}`,
      fieldKey: disp.fieldKey || "other",
      fieldLabel,
      prototypeField: category?.prototypeField || null,
      valueAsPresented: valPres,
      correctedValue: corrVal,
      explanation: (disp.explanation || "").trim(),
      reasonMatters: (disp.reasonMatters || "").trim(),
      numericDifference: calculateDisputeNumericDifference(valPres, corrVal),
      evidenceTypes: Array.isArray(disp.evidenceTypes) ? [...disp.evidenceTypes] : []
    };
  });

  const attachmentMetadata = (Array.isArray(data.attachmentMetadata) ? data.attachmentMetadata : []).map(att => ({
    name: String(att.name || "unnamed-file"),
    size: Number(att.size) || 0,
    type: String(att.type || "application/octet-stream"),
    lastModified: Number(att.lastModified) || Date.now(),
    uploadStatus: "LOCAL_METADATA_ONLY"
  }));

  const assessmentInputSnapshot = data.assessmentInputSnapshot
    ? JSON.parse(JSON.stringify(data.assessmentInputSnapshot))
    : (rawInputSnapshot ? buildAssessmentInputSnapshot(rawInputSnapshot) : null);

  return {
    draftReference,
    status: "LOCAL_DRAFT",
    createdAt: data.createdAt || new Date().toISOString(),
    isOfficialSubmission: false,
    isSyntheticDemoCase: Boolean(data.isSyntheticDemoCase),
    householdContext: householdContext ? {
      county: householdContext.county || null,
      householdSize: householdContext.householdSize ?? null,
      headAge: householdContext.headAge ?? null,
      activeScenario: householdContext.activeScenario || "Custom"
    } : null,
    assessmentInputSnapshot,
    assessment: {
      officialAssessmentReference: String(assessment.officialAssessmentReference || "").trim(),
      receivedDate: String(assessment.receivedDate || "").trim(),
      assessmentPeriodStart: String(assessment.assessmentPeriodStart || "").trim(),
      assessmentPeriodEnd: String(assessment.assessmentPeriodEnd || "").trim(),
      assessedMonthlyContribution: assessedNum,
      memberRequestedMonthlyContribution: requestedNum
    },
    grounds: Array.isArray(data.grounds) ? [...data.grounds] : [],
    disputes,
    evidenceChecklist: Array.isArray(data.evidenceChecklist) ? [...data.evidenceChecklist] : [],
    attachmentMetadata,
    requestedResolution: data.requestedResolution || "human_review",
    generalExplanation: (data.generalExplanation || "").trim(),
    prototypeComparisonSnapshot: data.prototypeComparisonSnapshot || null,
    disclaimer: "LOCAL DRAFT DEMONSTRATION ONLY — NOT SUBMITTED TO SHA. No case has been opened."
  };
}
