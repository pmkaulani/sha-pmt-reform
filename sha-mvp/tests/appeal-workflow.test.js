import test from "node:test";
import assert from "node:assert/strict";

import {
  DISPUTE_CATEGORIES,
  EVIDENCE_CATEGORIES,
  generateLocalDraftReference,
  validateAssessmentDetails,
  validateDisputes,
  validateChallengeData,
  createNormalizedChallengeDraft,
  calculateDisputeNumericDifference
} from "../src/lib/appeal-workflow.js";

// Sample valid payload for testing
function getValidPayload() {
  return {
    assessment: {
      officialAssessmentReference: "SHA-2026-NBI-09412",
      receivedDate: "2026-11-15",
      assessmentPeriodStart: "2026-01-01",
      assessmentPeriodEnd: "2026-12-31",
      assessedMonthlyContribution: 2500,
      memberRequestedMonthlyContribution: 300
    },
    grounds: ["household_details", "income_or_liquidity"],
    disputes: [
      {
        id: "disp-1",
        fieldKey: "household_size",
        valueAsPresented: "1",
        correctedValue: "4",
        explanation: "Assessment recorded household size as 1 instead of 4 members.",
        reasonMatters: "Supporting 3 dependants lowers per-capita disposable income.",
        evidenceTypes: ["household_dependant_doc", "birth_cert_school_doc"]
      }
    ],
    evidenceChecklist: ["household_dependant_doc", "birth_cert_school_doc"],
    attachmentMetadata: [
      {
        name: "national_id_dependants.pdf",
        size: 245000,
        type: "application/pdf",
        lastModified: 1700000000000
      }
    ],
    requestedResolution: "human_review",
    generalExplanation: "The current assessment calculation assumes single earner without dependants."
  };
}

test("1. A valid challenge creates a LOCAL_DRAFT", () => {
  const payload = getValidPayload();
  const validation = validateChallengeData(payload);
  assert.equal(validation.isValid, true, "Valid payload should pass validation");

  const draft = createNormalizedChallengeDraft(payload);
  assert.equal(draft.status, "LOCAL_DRAFT");
  assert.equal(draft.isOfficialSubmission, false);
});

test("2. Draft references do not use official SHA reference prefixes", () => {
  const ref1 = generateLocalDraftReference(new Date("2026-11-20"));
  const ref2 = generateLocalDraftReference();

  assert.match(ref1, /^LOCAL-DRAFT-\d{8}-[A-Z0-9]{6}$/);
  assert.match(ref2, /^LOCAL-DRAFT-\d{8}-[A-Z0-9]{6}$/);
  assert.doesNotMatch(ref1, /^SHA-|^GOV-|^OFFICIAL-/);
  assert.doesNotMatch(ref2, /^SHA-|^GOV-|^OFFICIAL-/);
});

test("3. An empty assessment amount is not treated as zero", () => {
  const payloadEmpty = {
    receivedDate: "2026-11-10",
    assessmentPeriodStart: "2026-01-01",
    assessmentPeriodEnd: "2026-12-31",
    assessedMonthlyContribution: ""
  };
  const valEmpty = validateAssessmentDetails(payloadEmpty);
  assert.equal(valEmpty.isValid, false);
  assert.ok(valEmpty.errors.assessedMonthlyContribution, "Empty string should not pass as valid assessed amount");

  const payloadNull = {
    receivedDate: "2026-11-10",
    assessmentPeriodStart: "2026-01-01",
    assessmentPeriodEnd: "2026-12-31",
    assessedMonthlyContribution: null
  };
  const valNull = validateAssessmentDetails(payloadNull);
  assert.equal(valNull.isValid, false);
  assert.ok(valNull.errors.assessedMonthlyContribution, "Null should not pass as valid assessed amount");
});

test("4. Zero assessed amount is accepted", () => {
  const payloadZero = {
    receivedDate: "2026-11-10",
    assessmentPeriodStart: "2026-01-01",
    assessmentPeriodEnd: "2026-12-31",
    assessedMonthlyContribution: 0
  };
  const valZero = validateAssessmentDetails(payloadZero);
  assert.equal(valZero.isValid, true, "Zero assessed contribution should be accepted for indigent households");
});

test("5. Negative assessment amounts are rejected", () => {
  const payloadNegative = {
    receivedDate: "2026-11-10",
    assessmentPeriodStart: "2026-01-01",
    assessmentPeriodEnd: "2026-12-31",
    assessedMonthlyContribution: -500
  };
  const valNegative = validateAssessmentDetails(payloadNegative);
  assert.equal(valNegative.isValid, false);
  assert.equal(valNegative.errors.assessedMonthlyContribution, "Assessed contribution cannot be negative.");

  const payloadNegativeReq = {
    receivedDate: "2026-11-10",
    assessmentPeriodStart: "2026-01-01",
    assessmentPeriodEnd: "2026-12-31",
    assessedMonthlyContribution: 1000,
    memberRequestedMonthlyContribution: -100
  };
  const valNegReq = validateAssessmentDetails(payloadNegativeReq);
  assert.equal(valNegReq.isValid, false);
  assert.equal(valNegReq.errors.memberRequestedMonthlyContribution, "Requested contribution cannot be negative.");
});

test("6. Invalid dates are rejected", () => {
  const payloadInvalidFormat = {
    receivedDate: "not-a-date",
    assessmentPeriodStart: "2026-01-01",
    assessmentPeriodEnd: "2026-12-31",
    assessedMonthlyContribution: 500
  };
  const valFormat = validateAssessmentDetails(payloadInvalidFormat);
  assert.equal(valFormat.isValid, false);
  assert.ok(valFormat.errors.receivedDate);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 5);
  const futureDateStr = tomorrow.toISOString().slice(0, 10);

  const payloadFuture = {
    receivedDate: futureDateStr,
    assessmentPeriodStart: "2026-01-01",
    assessmentPeriodEnd: "2026-12-31",
    assessedMonthlyContribution: 500
  };
  const valFuture = validateAssessmentDetails(payloadFuture);
  assert.equal(valFuture.isValid, false);
  assert.equal(valFuture.errors.receivedDate, "Received date cannot be in the future.");
});

test("7. Assessment period is validated (start > end is rejected)", () => {
  const payloadInverted = {
    receivedDate: "2026-11-01",
    assessmentPeriodStart: "2026-12-31",
    assessmentPeriodEnd: "2026-01-01",
    assessedMonthlyContribution: 500
  };
  const valInverted = validateAssessmentDetails(payloadInverted);
  assert.equal(valInverted.isValid, false);
  assert.equal(valInverted.errors.assessmentPeriodEnd, "Period start date cannot be after end date.");
});

test("8. Multiple disputes are retained", () => {
  const payload = getValidPayload();
  payload.disputes.push({
    id: "disp-2",
    fieldKey: "asset_ownership",
    valueAsPresented: "1 vehicle valued KSh 600,000",
    correctedValue: "0 vehicles (sold March 2025)",
    explanation: "Vehicle was disposed of and ownership transferred prior to assessment.",
    reasonMatters: "Vehicle capital penalty should not be levied.",
    evidenceTypes: ["asset_ownership_doc"]
  });

  const draft = createNormalizedChallengeDraft(payload);
  assert.equal(draft.disputes.length, 2);
  assert.equal(draft.disputes[0].fieldKey, "household_size");
  assert.equal(draft.disputes[1].fieldKey, "asset_ownership");
});

test("9. Original and corrected values remain distinct", () => {
  const payload = getValidPayload();
  payload.disputes[0].valueAsPresented = "KSh 1,200,000 annual wealth";
  payload.disputes[0].correctedValue = "KSh 240,000 declared earnings";

  const draft = createNormalizedChallengeDraft(payload);
  assert.equal(draft.disputes[0].valueAsPresented, "KSh 1,200,000 annual wealth");
  assert.equal(draft.disputes[0].correctedValue, "KSh 240,000 declared earnings");
  assert.notEqual(draft.disputes[0].valueAsPresented, draft.disputes[0].correctedValue);
});

test("10. Multiple evidence categories are retained", () => {
  const payload = getValidPayload();
  payload.evidenceChecklist = [
    "payslip_employer",
    "bank_mpesa_statement",
    "tenancy_agreement",
    "chief_admin_letter"
  ];
  const draft = createNormalizedChallengeDraft(payload);
  assert.equal(draft.evidenceChecklist.length, 4);
  assert.ok(draft.evidenceChecklist.includes("payslip_employer"));
  assert.ok(draft.evidenceChecklist.includes("chief_admin_letter"));
});

test("11. Attachment metadata is stored without document contents", () => {
  const payload = getValidPayload();
  payload.attachmentMetadata = [
    {
      name: "chief_letter_verified.pdf",
      size: 512000,
      type: "application/pdf",
      lastModified: 1700000000000,
      rawContent: "BINARY_OR_BASE64_BYTES_THAT_MUST_BE_STRIPPED"
    }
  ];

  const draft = createNormalizedChallengeDraft(payload);
  assert.equal(draft.attachmentMetadata.length, 1);
  const att = draft.attachmentMetadata[0];
  assert.equal(att.name, "chief_letter_verified.pdf");
  assert.equal(att.size, 512000);
  assert.equal(att.type, "application/pdf");
  assert.equal(att.uploadStatus, "LOCAL_METADATA_ONLY");
  assert.equal(att.rawContent, undefined, "Raw file content must never be stored in draft");
});

test("12. Draft data contains no official submission status", () => {
  const payload = getValidPayload();
  const draft = createNormalizedChallengeDraft(payload);

  assert.equal(draft.status, "LOCAL_DRAFT");
  assert.equal(draft.isOfficialSubmission, false);
  assert.doesNotMatch(draft.status, /^SUBMITTED|^RECEIVED|^APPROVED|^UNDER_REVIEW/);
});

test("13. Existing non-submission wording remains present", () => {
  const payload = getValidPayload();
  const draft = createNormalizedChallengeDraft(payload);

  assert.ok(draft.disclaimer.includes("NOT SUBMITTED TO SHA"));
  assert.ok(draft.disclaimer.includes("No case has been opened"));
});

test("14. A draft is not silently associated with a different household", () => {
  const payload = getValidPayload();
  const householdA = {
    county: "Nairobi",
    householdSize: 4,
    headAge: 42,
    activeScenario: "Mama Wanjiku"
  };
  const householdB = {
    county: "Turkana",
    householdSize: 7,
    headAge: 58,
    activeScenario: "Informal Settlement"
  };

  const draftA = createNormalizedChallengeDraft(payload, householdA);
  assert.equal(draftA.householdContext.activeScenario, "Mama Wanjiku");
  assert.equal(draftA.householdContext.county, "Nairobi");

  // Create another draft with household B context
  const draftB = createNormalizedChallengeDraft(payload, householdB);
  assert.equal(draftB.householdContext.activeScenario, "Informal Settlement");
  assert.equal(draftB.householdContext.county, "Turkana");

  // Verify draftA did not mutate
  assert.equal(draftA.householdContext.activeScenario, "Mama Wanjiku");
});

test("15. Numeric difference calculation produces independent expected results", () => {
  assert.equal(calculateDisputeNumericDifference("1", "4"), 3);
  assert.equal(calculateDisputeNumericDifference("5000", "2000"), -3000);
  assert.equal(calculateDisputeNumericDifference("300", "300"), 0);
  assert.equal(calculateDisputeNumericDifference("not a number", "100"), null);
  assert.equal(calculateDisputeNumericDifference("100", ""), null);
  assert.equal(calculateDisputeNumericDifference(null, "100"), null);
});
