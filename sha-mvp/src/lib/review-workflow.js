/**
 * Review Workflow Helper Library (Phase 3 & Final Integration)
 *
 * Implements pure state-transition, validation, event-creation, calculation
 * safeguards, synthetic demonstration case management, and unified case summary
 * formatting for the officer review workspace.
 *
 * NOTE: This is a proposed workflow demonstration, not an official SHA staff system.
 * All review statuses, actions, and history entries are strictly local demonstrations.
 */

import { validateAssessmentInputs } from "./AlgorithmSimulation.js";
import { calculateProposedModelVersions } from "./model-versioning.js";

export const DEMO_REVIEW_STATUSES = {
  AWAITING: "DEMO_AWAITING_REVIEW",
  UNDER_REVIEW: "DEMO_UNDER_REVIEW",
  INFO_REQUESTED: "DEMO_INFORMATION_REQUESTED",
  RECOMMENDATION_RECORDED: "DEMO_RECOMMENDATION_RECORDED",
  REFERRED_MANUAL: "DEMO_REFERRED_FOR_MANUAL_REVIEW",
  COMPLETED: "DEMO_REVIEW_COMPLETED"
};

export const DEMO_REVIEW_ACTIONS = {
  BEGIN_REVIEW: "BEGIN_REVIEW",
  REQUEST_INFORMATION: "REQUEST_INFORMATION",
  RECORD_RECOMMENDATION: "RECORD_RECOMMENDATION",
  REFER_MANUAL: "REFER_MANUAL",
  COMPLETE_REVIEW: "COMPLETE_REVIEW"
};

export const RECOMMENDATION_OPTIONS = [
  { key: "DEMO_UPHOLD_ASSESSMENT", label: "Uphold Original Assessment (No change recommended)" },
  { key: "DEMO_RECOMMEND_ADJUSTMENT", label: "Recommend Assessment Adjustment (Based on evidence)" },
  { key: "DEMO_REQUIRE_CHP_FIELD_VERIFICATION", label: "Require Field Verification by Community Health Promoter (CHP)" },
  { key: "DEMO_REQUEST_ADDITIONAL_DOCUMENTS", label: "Request Additional Substantiating Documents" }
];

export const EVIDENCE_ANNOTATION_STATUSES = [
  { key: "DEMO_NOT_EXAMINED", label: "Not Examined" },
  { key: "DEMO_METADATA_NOTED", label: "Metadata Noted (Contents not examined)" },
  { key: "DEMO_ADDITIONAL_EVIDENCE_REQUESTED", label: "Additional Evidence Requested" },
  { key: "DEMO_FILE_NOT_PROVIDED", label: "File Not Provided" }
];

/**
 * Initialize a review record for a given draft reference.
 */
export function createInitialReviewRecord(draftReference) {
  return {
    draftReference: String(draftReference || "LOCAL-DRAFT-UNKNOWN"),
    currentStatus: DEMO_REVIEW_STATUSES.AWAITING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    events: [],
    reviewerLabel: "Demonstration Reviewer",
    evidenceAnnotations: {},
    disclaimer: "LOCAL DEMONSTRATION REVIEW HISTORY — NOT AN OFFICIAL SHA AUDIT RECORD."
  };
}

/**
 * Determine next demonstration status based on review action.
 */
export function getNextDemoReviewStatus(action) {
  switch (action) {
    case DEMO_REVIEW_ACTIONS.BEGIN_REVIEW:
      return DEMO_REVIEW_STATUSES.UNDER_REVIEW;
    case DEMO_REVIEW_ACTIONS.REQUEST_INFORMATION:
      return DEMO_REVIEW_STATUSES.INFO_REQUESTED;
    case DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION:
      return DEMO_REVIEW_STATUSES.RECOMMENDATION_RECORDED;
    case DEMO_REVIEW_ACTIONS.REFER_MANUAL:
      return DEMO_REVIEW_STATUSES.REFERRED_MANUAL;
    case DEMO_REVIEW_ACTIONS.COMPLETE_REVIEW:
      return DEMO_REVIEW_STATUSES.COMPLETED;
    default:
      return DEMO_REVIEW_STATUSES.UNDER_REVIEW;
  }
}

/**
 * Validate officer review action data before committing an event.
 */
export function validateReviewAction(action, data = {}) {
  const errors = {};

  if (!action || !Object.values(DEMO_REVIEW_ACTIONS).includes(action)) {
    return { isValid: false, errors: { action: "Invalid or unsupported review action." } };
  }

  // Finding is required for all substantive review actions
  if (action !== DEMO_REVIEW_ACTIONS.BEGIN_REVIEW) {
    if (!data.finding || typeof data.finding !== "string" || data.finding.trim().length < 10) {
      errors.finding = "A reasoned finding must be entered (minimum 10 characters).";
    }
  }

  if (action === DEMO_REVIEW_ACTIONS.REQUEST_INFORMATION) {
    const hasInfo = Boolean(
      (data.additionalInformationRequested && String(data.additionalInformationRequested).trim()) ||
      (Array.isArray(data.requestedDocuments) && data.requestedDocuments.length > 0)
    );
    if (!hasInfo) {
      errors.additionalInformationRequested = "Specify what additional documentation or clarification is needed.";
    }
  }

  if (action === DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION) {
    if (!data.recommendation || !RECOMMENDATION_OPTIONS.some(o => o.key === data.recommendation)) {
      errors.recommendation = "Select a valid recommendation outcome.";
    }
    if (!data.reason || typeof data.reason !== "string" || data.reason.trim().length < 10) {
      errors.reason = "Please state the reason for this recommendation (min 10 characters).";
    }
  }

  if (action === DEMO_REVIEW_ACTIONS.REFER_MANUAL) {
    if (!data.reason || typeof data.reason !== "string" || data.reason.trim().length < 10) {
      errors.reason = "Specify why manual or field assessment is required (min 10 characters).";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Create an immutable review event record to append to the case history.
 */
export function createReviewEvent({
  draftReference,
  action,
  previousStatus = DEMO_REVIEW_STATUSES.AWAITING,
  data = {},
  actorLabel = "Demonstration Reviewer"
}) {
  const newStatus = getNextDemoReviewStatus(action);
  const now = new Date();
  const suffix = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 6).toUpperCase()
    : Math.random().toString(36).slice(2, 8).toUpperCase();

  const eventId = `LOCAL-REVIEW-EVENT-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${suffix}`;

  const requestedItems = Array.isArray(data.requestedDocuments)
    ? [...data.requestedDocuments]
    : data.additionalInformationRequested
      ? [String(data.additionalInformationRequested).trim()]
      : [];

  return {
    id: eventId,
    draftReference: String(draftReference || "LOCAL-DRAFT-UNKNOWN"),
    timestamp: now.toISOString(),
    actorLabel: String(actorLabel || "Demonstration Reviewer"),
    action,
    previousStatus,
    newStatus,
    finding: String(data.finding || "").trim(),
    reason: String(data.reason || "").trim(),
    recommendation: data.recommendation || null,
    additionalInformationRequested: requestedItems,
    evidenceNotes: String(data.evidenceNotes || "").trim(),
    simulatedImpactSummary: data.simulatedImpactSummary || null,
    disclaimer: "LOCAL DEMONSTRATION REVIEW EVENT — NOT AN OFFICIAL SHA AUDIT RECORD."
  };
}

/**
 * Calculation Impact Safeguard:
 * Evaluates whether any member dispute safely maps to an existing numerical model input.
 * Strictly avoids using parseFloat on arbitrary descriptive text.
 * Calculates both original and corrected scenarios from the saved assessmentInputSnapshot.
 * Never mutates the saved snapshot.
 * Displays member-reported SHA contribution completely separately.
 */
export function getIllustrativeImpactSimulation(draft) {
  if (!draft || !Array.isArray(draft.disputes) || draft.disputes.length === 0) {
    return {
      canSimulate: false,
      reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
      detail: "No structured dispute items are recorded for this challenge."
    };
  }

  // Never borrow the active household's values for a saved challenge.
  // Without the original snapshot, a reproducible comparison is impossible.
  if (!draft.assessmentInputSnapshot || typeof draft.assessmentInputSnapshot !== "object") {
    return {
      canSimulate: false,
      reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
      detail: "This draft has no preserved assessment input snapshot. The currently active household cannot be substituted."
    };
  }

  // The impact demonstration deliberately supports one disputed field at a time.
  // Multiple disputes require separate, independently reviewed scenarios.
  if (draft.disputes.length !== 1) {
    return {
      canSimulate: false,
      reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
      detail: "Automated impact simulation is limited to exactly one supported dispute per draft. Split or review multiple disputed items separately."
    };
  }

  const rawBase = draft.assessmentInputSnapshot;

  // Safe clone to guarantee original snapshot is never mutated
  const originalSnapshot = JSON.parse(JSON.stringify(rawBase));

  // 1. Validate original assessment scenario inputs
  const origValidation = validateAssessmentInputs(originalSnapshot);
  if (!origValidation.isValid) {
    return {
      canSimulate: false,
      reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
      detail: `Original assessment input validation failed: ${origValidation.errors.join("; ")}`
    };
  }
  if (originalSnapshot.householdSize === null || originalSnapshot.householdSize === undefined || Number(originalSnapshot.householdSize) < 1) {
    return {
      canSimulate: false,
      reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
      detail: "Original assessment input validation failed: Valid household size (≥ 1) is required."
    };
  }

  // 2. Find the first dispute that unambiguously maps to a genuine numeric prototype model field
  const mappableDispute = draft.disputes.find(disp => {
    const rawVal = String(disp.correctedValue || "").trim();
    if (disp.fieldKey === "household_size") {
      if (!/^\d+$/.test(rawVal)) return false;
      const num = parseInt(rawVal, 10);
      return Number.isInteger(num) && num >= 1 && num <= 20;
    }
    if (disp.fieldKey === "declared_earnings") {
      if (!/^\d+(\.\d+)?$/.test(rawVal)) return false;
      const num = parseFloat(rawVal);
      return Number.isFinite(num) && num >= 0;
    }
    if (disp.fieldKey === "housing_circumstances") {
      // Rule: Do not use a categorical housing field as a numeric rent amount.
      // Rent deduction requires rental tenure; non-rental housing circumstances require manual review.
      if (originalSnapshot.ownershipStatus !== "RENTED") return false;
      if (!/^\d+(\.\d+)?$/.test(rawVal)) return false;
      const num = parseFloat(rawVal);
      return Number.isFinite(num) && num >= 0;
    }
    return false;
  });

  if (!mappableDispute) {
    return {
      canSimulate: false,
      reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
      detail: "Disputed items involve asset ownership, qualitative claims, categorical housing indicators, or descriptive text that cannot be safely converted to automated rules recalculation."
    };
  }

  try {
    let mappedFieldLabel = "";
    let mappedFieldKey = "";
    let originalInputValue = null;
    let correctedInputValue = null;

    // Independent copy for corrected scenario
    const correctedSnapshot = JSON.parse(JSON.stringify(originalSnapshot));

    if (mappableDispute.fieldKey === "household_size") {
      mappedFieldLabel = "Household Size";
      mappedFieldKey = "householdSize";
      originalInputValue = originalSnapshot.householdSize ?? 1;
      correctedInputValue = parseInt(mappableDispute.correctedValue.trim(), 10);
      correctedSnapshot.householdSize = correctedInputValue;
    } else if (mappableDispute.fieldKey === "declared_earnings") {
      mappedFieldLabel = "Declared Net Monthly Earnings";
      mappedFieldKey = "monthlyNetEarnedIncome";
      originalInputValue = originalSnapshot.monthlyNetEarnedIncome ?? 0;
      correctedInputValue = parseFloat(mappableDispute.correctedValue.trim());
      correctedSnapshot.monthlyNetEarnedIncome = correctedInputValue;
    } else if (mappableDispute.fieldKey === "housing_circumstances") {
      mappedFieldLabel = "Monthly Urban Rent";
      mappedFieldKey = "monthlyRent";
      originalInputValue = originalSnapshot.monthlyRent ?? 0;
      correctedInputValue = parseFloat(mappableDispute.correctedValue.trim());
      correctedSnapshot.monthlyRent = correctedInputValue;
      correctedSnapshot.rentMonthly = correctedInputValue;
    }

    // 3. Validate corrected scenario inputs
    const corrValidation = validateAssessmentInputs(correctedSnapshot);
    if (!corrValidation.isValid) {
      return {
        canSimulate: false,
        reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
        detail: `Corrected scenario validation failed: ${corrValidation.errors.join("; ")}`
      };
    }
    if (correctedSnapshot.householdSize === null || correctedSnapshot.householdSize === undefined || Number(correctedSnapshot.householdSize) < 1) {
      return {
        canSimulate: false,
        reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
        detail: "Corrected scenario validation failed: Valid household size (≥ 1) is required."
      };
    }

    // Re-run the exact model version and administrative parameters recorded
    // with the challenge. A saved draft never silently changes algorithms.
    const savedModelVersionId = draft.modelVersionId ||
      draft.prototypeComparisonSnapshot?.modelVersionId ||
      "declared-income-agi-v1";
    const savedModelParameters = draft.modelParameterSnapshot ||
      draft.prototypeComparisonSnapshot?.modelParameterSnapshot ||
      {};

    const calculateSavedModel = (snapshot) => {
      const versions = calculateProposedModelVersions(snapshot, savedModelParameters);
      if (savedModelVersionId === versions.originalAgi.id) return versions.originalAgi.result;
      if (savedModelVersionId === versions.declaredIncome.id) return versions.declaredIncome.result;
      throw new Error(`Saved model version is not available: ${savedModelVersionId}`);
    };

    const originalModelResult = calculateSavedModel(originalSnapshot);
    const correctedModelResult = calculateSavedModel(correctedSnapshot);

    const prototypeOriginalMonthlyKsh = originalModelResult.monthlyContribution;
    const prototypeCorrectedMonthlyKsh = correctedModelResult.monthlyContribution;
    const prototypeMonthlyDifferenceKsh = prototypeCorrectedMonthlyKsh - prototypeOriginalMonthlyKsh;

    return {
      canSimulate: true,
      disclaimer: "ILLUSTRATIVE PROTOTYPE SCENARIO — NOT AN SHA REASSESSMENT.",
      modelVersionId: savedModelVersionId,
      modelParametersUsed: JSON.parse(JSON.stringify(savedModelParameters)),
      mappedCategory: mappableDispute.fieldKey,
      mappedFieldLabel,
      mappedFieldKey,
      originalInputValue,
      correctedInputValue,
      // Separate member-reported SHA assessment
      memberReportedMonthlyKsh: draft.assessment?.assessedMonthlyContribution ?? null,
      memberRequestedMonthlyKsh: draft.assessment?.memberRequestedMonthlyContribution ?? null,
      // Prototype calculation outputs
      prototypeOriginalMonthlyKsh,
      prototypeCorrectedMonthlyKsh,
      prototypeMonthlyDifferenceKsh,
      originalAGIKsh: originalModelResult.adjustedGrossIncome,
      correctedAGIKsh: correctedModelResult.adjustedGrossIncome,
      originalTier: originalModelResult.tier,
      correctedTier: correctedModelResult.tier,
      originalIsIndigent: originalModelResult.isIndigent,
      correctedIsIndigent: correctedModelResult.isIndigent
    };
  } catch (err) {
    return {
      canSimulate: false,
      reason: "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.",
      detail: `Simulation calculation failed: ${err.message}`
    };
  }
}

/**
 * One-Click Synthetic Meeting Demonstration Challenge
 * Idempotently constructs or retrieves a sample challenge for meeting demonstration.
 */
export function createSyntheticMeetingDemonstration(existingDrafts = []) {
  const existing = existingDrafts.find(d =>
    d.isSyntheticDemoCase || d.draftReference === "LOCAL-DRAFT-20261121-MEETING-SAMPLE"
  );
  if (existing) {
    return { draft: existing, isNew: false };
  }

  const syntheticSnapshot = {
    snapshotType: "PROTOTYPE_INPUT_SNAPSHOT",
    disclaimer: "PROTOTYPE INPUT SNAPSHOT — NOT AN OFFICIAL SHA RECORD",
    capturedAt: "2026-11-21T01:00:00.000Z",
    householdSize: 1,
    monthlyNetEarnedIncome: 18000,
    county: "Nairobi",
    headGender: "FEMALE",
    headAge: 48,
    dwellingType: "STONE",
    wallMaterial: "STONE",
    roofMaterial: "IRON_SHEETS",
    floorMaterial: "CEMENT",
    rooms: 2,
    ownershipStatus: "RENTED",
    monthlyRent: 8000,
    rentMonthly: 8000,
    waterSource: "PIPED_WATER",
    sanitationType: "FLUSH_TOILET",
    cookingEnergy: "GAS_LPG",
    lightingEnergy: "ELECTRICITY",
    assets: ["FEATURE_PHONE"],
    motorcycleIsCommercial: false,
    landAcreage: 0,
    livestockCount: 0,
    receivesAid: false,
    isRefugee: false,
    grossMpesaMonthly: 45000,
    transactionCount: 85,
    avgRetainedBalance: 120000,
    isSeasonalWorker: false,
    lowSeasonRetainedBalance: 0,
    diasporaRemittances: 0,
    fulizaDefaults: 0,
    kraPinType: "NONE",
    isNtsaVerified: false,
    hiddenWealthDiscovered: false,
    hasSaccoAccount: false,
    saccoShareCapital: 0,
    hasChronicIllness: false,
    hasRegisteredDisability: false,
    isGroupTreasurer: true,
    vehicleType: "STANDARD_OLD",
    consentWithheld: false,
    vehicles: [],
    landParcels: [],
    rentalProperties: [],
    activeScenario: "Mama Wanjiku — Chama Treasurer"
  };

  const syntheticDraft = {
    draftReference: "LOCAL-DRAFT-20261121-MEETING-SAMPLE",
    status: "LOCAL_DRAFT",
    createdAt: new Date().toISOString(),
    isOfficialSubmission: false,
    isSyntheticDemoCase: true,
    syntheticNotice: "SYNTHETIC DEMONSTRATION DATA — NOT A REAL MEMBER CASE",
    householdContext: {
      county: "Nairobi",
      householdSize: 1,
      headAge: 48,
      activeScenario: "Mama Wanjiku — Chama Treasurer"
    },
    assessmentInputSnapshot: syntheticSnapshot,
    modelVersionId: "declared-income-agi-v1",
    modelParameterSnapshot: { carValue: 350000, urbanCostOfLiving: 12000, fulizaPenalty: 5000, tier1RentCap: 35000, tier2RentCap: 20000, triangulationOffline: false },
    assessment: {
      officialAssessmentReference: "",
      receivedDate: "2026-11-15",
      assessmentPeriodStart: "2026-01-01",
      assessmentPeriodEnd: "2026-12-31",
      assessedMonthlyContribution: 3162,
      memberRequestedMonthlyContribution: 300
    },
    grounds: ["household_details", "income_or_liquidity"],
    disputes: [
      {
        id: "disp-synth-1",
        fieldKey: "household_size",
        fieldLabel: "Household size & family composition",
        prototypeField: "householdSize",
        valueAsPresented: "1",
        correctedValue: "4",
        numericDifference: 3,
        explanation: "Assessment was calculated on single adult basis instead of 4 members including 3 school-age dependants.",
        reasonMatters: "Higher household size increases living expense deductions and reduces per-capita income to the illustrative minimum floor."
      }
    ],
    evidenceChecklist: ["household_dependant_doc", "birth_cert_school_doc"],
    attachmentMetadata: [
      {
        name: "birth_certificates_sample.pdf",
        size: 184320,
        type: "application/pdf",
        lastModified: 1700000000000,
        uploadStatus: "LOCAL_METADATA_ONLY"
      }
    ],
    requestedResolution: "human_review",
    generalExplanation: "The illustrative case is designed to show how omitted school-age dependants can affect a household assessment. No claim is made that a chama balance was included in the member-reported SHA amount.",
    prototypeComparisonSnapshot: {
      modelVersionId: "declared-income-agi-v1",
      modelParameterSnapshot: { carValue: 350000, urbanCostOfLiving: 12000, fulizaPenalty: 5000, tier1RentCap: 35000, tier2RentCap: 20000, triangulationOffline: false }
    },
    disclaimer: "LOCAL DRAFT DEMONSTRATION ONLY — NOT SUBMITTED TO SHA. No case has been opened."
  };

  return { draft: syntheticDraft, isNew: true };
}

/**
 * Remove synthetic meeting demo draft without touching user drafts.
 */
export function removeSyntheticMeetingDemonstration(drafts = []) {
  return drafts.filter(d => !d.isSyntheticDemoCase && d.draftReference !== "LOCAL-DRAFT-20261121-MEETING-SAMPLE");
}

/**
 * Format unified case summary document bringing together all 12 items.
 */
export function formatUnifiedCaseSummary(draft, reviewRecord, impactSim) {
  if (!draft) return "No challenge draft available.";
  const rec = reviewRecord || createInitialReviewRecord(draft.draftReference);
  const events = rec.events || [];

  const moneyFmt = (val) => {
    const n = Number(val);
    return Number.isFinite(n) ? n.toLocaleString("en-KE") : "N/A";
  };

  const lines = [
    "================================================================================",
    "LOCAL DEMONSTRATION CASE SUMMARY — NOT AN OFFICIAL SHA RECORD",
    "================================================================================",
    `Case Draft Reference:         ${draft.draftReference}`,
    draft.isSyntheticDemoCase ? `Demonstration Mode:           SYNTHETIC DEMONSTRATION DATA — NOT A REAL MEMBER CASE` : `Demonstration Mode:           LOCAL SESSION CASE`,
    `Current Review Status:        ${rec.currentStatus}`,
    `Date Draft Prepared:          ${draft.createdAt}`,
    `Applicant Identity Label:     ${draft.householdContext?.activeScenario || "Custom"} (County: ${draft.householdContext?.county || "N/A"})`,
    `Reviewer Identity Label:      ${rec.reviewerLabel}`,
    "",
    "PERMANENT NOTICE:",
    "This document summarizes an illustrative member challenge and local review events",
    "conducted within a research prototype. It is NOT an official determination, order,",
    "or formal decision issued by the Social Health Authority (SHA) of Kenya.",
    "",
    "--------------------------------------------------------------------------------",
    "1. MEMBER-REPORTED ASSESSMENT INFORMATION (UNVERIFIED BY PROTOTYPE)",
    "--------------------------------------------------------------------------------",
    `Official Assessment Ref:      ${draft.assessment.officialAssessmentReference || "Not provided by member"}`,
    `Assessment Received Date:     ${draft.assessment.receivedDate || "Not provided"}`,
    `Disputed Assessment Period:   ${draft.assessment.assessmentPeriodStart} to ${draft.assessment.assessmentPeriodEnd}`,
    `Member Assessed Amount:       KSh ${moneyFmt(draft.assessment.assessedMonthlyContribution)}/mo (member-supplied)`,
    `Member Requested Amount:      KSh ${moneyFmt(draft.assessment.memberRequestedMonthlyContribution)}/mo (member-proposed)`,
    "",
    "--------------------------------------------------------------------------------",
    "2. DISPUTED ITEMS & MEMBER CORRECTIONS",
    "--------------------------------------------------------------------------------",
    ...draft.disputes.map((d, i) => [
      `ITEM #${i + 1}: ${d.fieldLabel}`,
      `  Original As Presented:      ${d.valueAsPresented}`,
      `  Member Corrected Value:     ${d.correctedValue}`,
      d.numericDifference !== null ? `  Numeric Delta:              ${d.numericDifference > 0 ? "+" : ""}${d.numericDifference}` : null,
      `  Member Explanation:         ${d.explanation}`,
      d.reasonMatters ? `  Why Correction Matters:     ${d.reasonMatters}` : null,
      ""
    ].filter(Boolean).join("\n")),
    "--------------------------------------------------------------------------------",
    "3. PROTOTYPE CALCULATION COMPARISON (SAFEGUARDED SIMULATION)",
    "--------------------------------------------------------------------------------",
    impactSim?.canSimulate ? [
      `Simulation Status:            AUTOMATED CALCULATION ESTIMATE AVAILABLE`,
      `Mapped Model Field:           ${impactSim.mappedFieldLabel} (${impactSim.mappedCategory})`,
      `Original Input In Snapshot:   ${impactSim.originalInputValue}`,
      `Simulated Corrected Input:    ${impactSim.correctedInputValue}`,
      `Prototype Original Monthly:   KSh ${moneyFmt(impactSim.prototypeOriginalMonthlyKsh)}/mo`,
      `Prototype Corrected Monthly:  KSh ${moneyFmt(impactSim.prototypeCorrectedMonthlyKsh)}/mo`,
      `Prototype Monthly Delta:      ${impactSim.prototypeMonthlyDifferenceKsh < 0 ? "-" : "+"}KSh ${moneyFmt(Math.abs(impactSim.prototypeMonthlyDifferenceKsh))}/mo`,
      `Notice:                       ${impactSim.disclaimer}`
    ].join("\n") : [
      `Simulation Status:            MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.`,
      `Details:                      Disputed items involve asset ownership or qualitative descriptions.`,
      `                              No automatic contribution adjustment is estimated without field review.`
    ].join("\n"),
    "",
    "--------------------------------------------------------------------------------",
    "4. EVIDENCE CHECKLIST & LOCAL ATTACHMENT METADATA",
    "--------------------------------------------------------------------------------",
    "Declared Evidence Types:",
    ...draft.evidenceChecklist.map(e => `  - ${e.replace(/_/g, " ")}`),
    "",
    "Staged Demonstration Files (Metadata only · Contents not uploaded or examined):",
    ...draft.attachmentMetadata.map(f => {
      const anno = rec.evidenceAnnotations?.[f.name] || "DEMO_METADATA_NOTED";
      return `  - ${f.name} (${f.size} bytes, ${f.type}) [Status: ${anno}]`;
    }),
    "",
    "--------------------------------------------------------------------------------",
    "5. OFFICER FINDINGS & RECOMMENDATIONS",
    "--------------------------------------------------------------------------------",
    `Latest Status:                ${rec.currentStatus}`,
    ...events.slice(-1).map(ev => [
      `Latest Event Timestamp:       ${ev.timestamp}`,
      `Latest Action:                ${ev.action}`,
      ev.finding ? `Finding:                      ${ev.finding}` : null,
      ev.recommendation ? `Recommendation:               ${ev.recommendation}` : null,
      ev.reason ? `Rationale:                    ${ev.reason}` : null,
      ev.additionalInformationRequested?.length ? `Information Requested:        ${ev.additionalInformationRequested.join("; ")}` : null,
      ev.evidenceNotes ? `Evidence Notes:               ${ev.evidenceNotes}` : null
    ].filter(Boolean).join("\n")),
    "",
    "--------------------------------------------------------------------------------",
    `6. CHRONOLOGICAL REVIEW HISTORY (${events.length} Events)`,
    "--------------------------------------------------------------------------------",
    ...events.map((ev, i) => [
      `EVENT #${i + 1} · ${ev.timestamp} · [${ev.action}]`,
      `  Actor:                      ${ev.actorLabel}`,
      `  Transition:                 ${ev.previousStatus} -> ${ev.newStatus}`,
      ev.finding ? `  Finding:                    ${ev.finding}` : null,
      ev.recommendation ? `  Recommendation:             ${ev.recommendation}` : null,
      ""
    ].filter(Boolean).join("\n")),
    "================================================================================",
    "END OF CASE SUMMARY — LOCAL DEMONSTRATION CASE SUMMARY — NOT AN OFFICIAL SHA RECORD",
    "================================================================================"
  ];

  return lines.filter(l => l !== null).join("\n");
}

/**
 * Format review history for export.
 */
export function formatReviewHistory(reviewRecord, draft) {
  if (!reviewRecord) return "No review record available.";
  const events = reviewRecord.events || [];
  if (!draft) {
    return [
      "================================================================================",
      "SHA MEANS-TESTING ASSESSMENT CHALLENGE — LOCAL OFFICER REVIEW HISTORY",
      "================================================================================",
      `Draft Challenge Reference:  ${reviewRecord.draftReference}`,
      `Current Review Status:      ${reviewRecord.currentStatus}`,
      `Review Initialized:         ${reviewRecord.createdAt}`,
      `Last Updated:               ${reviewRecord.updatedAt}`,
      `Assigned Reviewer Label:    ${reviewRecord.reviewerLabel}`,
      "",
      "--------------------------------------------------------------------------------",
      `CHRONOLOGICAL REVIEW EVENTS (${events.length})`,
      "--------------------------------------------------------------------------------",
      events.length === 0 ? "No review events have been recorded for this challenge yet." : "",
      "================================================================================",
      "END OF REVIEW RECORD — PROTOTYPE DEMONSTRATION ONLY — NOT AN OFFICIAL SHA AUDIT",
      "================================================================================"
    ].filter(Boolean).join("\n");
  }
  return formatUnifiedCaseSummary(draft, reviewRecord, null);
}
