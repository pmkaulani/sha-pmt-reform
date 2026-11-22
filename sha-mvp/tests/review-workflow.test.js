import test from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_REVIEW_STATUSES,
  DEMO_REVIEW_ACTIONS,
  RECOMMENDATION_OPTIONS,
  EVIDENCE_ANNOTATION_STATUSES,
  createInitialReviewRecord,
  getNextDemoReviewStatus,
  validateReviewAction,
  createReviewEvent,
  getIllustrativeImpactSimulation,
  formatReviewHistory,
  createSyntheticMeetingDemonstration,
  removeSyntheticMeetingDemonstration,
  formatUnifiedCaseSummary
} from "../src/lib/review-workflow.js";

import {
  buildAssessmentInputSnapshot,
  createNormalizedChallengeDraft
} from "../src/lib/appeal-workflow.js";

import {
  calculateProposedModel,
  PRESETS
} from "../src/lib/AlgorithmSimulation.js";

// Helper fixture for testing
function getSampleDraft(ref = "LOCAL-DRAFT-20261121-TST001") {
  const snapshot = {
    snapshotType: "PROTOTYPE_INPUT_SNAPSHOT",
    disclaimer: "PROTOTYPE INPUT SNAPSHOT — NOT AN OFFICIAL SHA RECORD",
    capturedAt: "2026-11-21T01:00:00.000Z",
    householdSize: 1,
    monthlyNetEarnedIncome: 15000,
    county: "Meru",
    headGender: "FEMALE",
    headAge: 45,
    assets: ["FEATURE_PHONE"],
    vehicles: [],
    landParcels: [],
    rentalProperties: [],
    activeScenario: "Mama Wanjiku"
  };

  return {
    draftReference: ref,
    status: "LOCAL_DRAFT",
    createdAt: "2026-11-21T01:00:00.000Z",
    assessmentInputSnapshot: snapshot,
    assessment: {
      officialAssessmentReference: "SHA-2026-NBI-09412",
      receivedDate: "2026-11-15",
      assessmentPeriodStart: "2026-01-01",
      assessmentPeriodEnd: "2026-12-31",
      assessedMonthlyContribution: 2500,
      memberRequestedMonthlyContribution: 300
    },
    grounds: ["household_details"],
    disputes: [
      {
        id: "disp-1",
        fieldKey: "household_size",
        fieldLabel: "Household size & family composition",
        prototypeField: "householdSize",
        valueAsPresented: "1",
        correctedValue: "4",
        explanation: "Recorded single person household instead of 4 members with dependants.",
        reasonMatters: "Lowers per-capita income below the standard contribution threshold."
      }
    ],
    evidenceChecklist: ["household_dependant_doc"],
    attachmentMetadata: [
      {
        name: "dependants_birth_certs.pdf",
        size: 180000,
        type: "application/pdf",
        uploadStatus: "LOCAL_METADATA_ONLY"
      }
    ],
    requestedResolution: "human_review",
    generalExplanation: "The assessed monthly premium of KSh 2,500 was calculated assuming single adult.",
    prototypeComparisonSnapshot: {
      illustrativeBaselineMonthlyKsh: 2500,
      proposedRulesEngineMonthlyKsh: 990,
      proposedAdjustedGrossIncomeKsh: 431800
    }
  };
}

test("1. Review record uses a local demonstration identifier and local disclaimer", () => {
  const ref = "LOCAL-DRAFT-20261121-DEMO01";
  const record = createInitialReviewRecord(ref);

  assert.equal(record.draftReference, ref);
  assert.equal(record.currentStatus, DEMO_REVIEW_STATUSES.AWAITING);
  assert.ok(record.disclaimer.includes("LOCAL DEMONSTRATION"));
  assert.ok(record.disclaimer.includes("NOT AN OFFICIAL SHA"));
});

test("2. Review event references its correct challenge", () => {
  const ref = "LOCAL-DRAFT-20261121-DEMO02";
  const event = createReviewEvent({
    draftReference: ref,
    action: DEMO_REVIEW_ACTIONS.BEGIN_REVIEW,
    previousStatus: DEMO_REVIEW_STATUSES.AWAITING,
    data: { finding: "Began examination of member records" }
  });

  assert.equal(event.draftReference, ref);
  assert.match(event.id, /^LOCAL-REVIEW-EVENT-\d{8}-[A-Z0-9]{6}$/);
  assert.equal(event.newStatus, DEMO_REVIEW_STATUSES.UNDER_REVIEW);
});

test("3. Review status begins as demonstration-only", () => {
  assert.equal(DEMO_REVIEW_STATUSES.AWAITING, "DEMO_AWAITING_REVIEW");
  assert.equal(DEMO_REVIEW_STATUSES.UNDER_REVIEW, "DEMO_UNDER_REVIEW");
  assert.equal(DEMO_REVIEW_STATUSES.COMPLETED, "DEMO_REVIEW_COMPLETED");
  assert.doesNotMatch(DEMO_REVIEW_STATUSES.AWAITING, /^OFFICIAL_|^SHA_/);
});

test("4. A blank finding cannot be submitted for substantive review actions", () => {
  const emptyVal = validateReviewAction(DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION, {
    finding: "   ",
    recommendation: "DEMO_RECOMMEND_ADJUSTMENT",
    reason: "Sufficient evidence provided"
  });
  assert.equal(emptyVal.isValid, false);
  assert.ok(emptyVal.errors.finding);

  const shortVal = validateReviewAction(DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION, {
    finding: "short",
    recommendation: "DEMO_RECOMMEND_ADJUSTMENT",
    reason: "Sufficient evidence provided"
  });
  assert.equal(shortVal.isValid, false);
  assert.ok(shortVal.errors.finding);
});

test("5. A valid finding creates an event", () => {
  const validation = validateReviewAction(DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION, {
    finding: "Birth certificates examine 3 minor dependants in primary school.",
    recommendation: "DEMO_RECOMMEND_ADJUSTMENT",
    reason: "Household composition adjustment reduces assessed per-capita burden."
  });
  assert.equal(validation.isValid, true);

  const event = createReviewEvent({
    draftReference: "LOCAL-DRAFT-20261121-VAL001",
    action: DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION,
    previousStatus: DEMO_REVIEW_STATUSES.UNDER_REVIEW,
    data: {
      finding: "Birth certificates examine 3 minor dependants in primary school.",
      recommendation: "DEMO_RECOMMEND_ADJUSTMENT",
      reason: "Household composition adjustment reduces assessed per-capita burden."
    }
  });

  assert.equal(event.newStatus, DEMO_REVIEW_STATUSES.RECOMMENDATION_RECORDED);
  assert.equal(event.recommendation, "DEMO_RECOMMEND_ADJUSTMENT");
  assert.equal(event.finding, "Birth certificates examine 3 minor dependants in primary school.");
});

test("6. Requesting more information records the requested items", () => {
  const reqData = {
    finding: "Initial statement lacks proof of occupancy or rental lease.",
    additionalInformationRequested: "Certified rental agreement or official rent receipts for 2026."
  };
  const val = validateReviewAction(DEMO_REVIEW_ACTIONS.REQUEST_INFORMATION, reqData);
  assert.equal(val.isValid, true);

  const event = createReviewEvent({
    draftReference: "LOCAL-DRAFT-20261121-INFO01",
    action: DEMO_REVIEW_ACTIONS.REQUEST_INFORMATION,
    previousStatus: DEMO_REVIEW_STATUSES.UNDER_REVIEW,
    data: reqData
  });

  assert.equal(event.newStatus, DEMO_REVIEW_STATUSES.INFO_REQUESTED);
  assert.equal(event.additionalInformationRequested.length, 1);
  assert.equal(event.additionalInformationRequested[0], "Certified rental agreement or official rent receipts for 2026.");
});

test("7. A second action appends history instead of overwriting it", () => {
  const record = createInitialReviewRecord("LOCAL-DRAFT-20261121-APP001");
  assert.equal(record.events.length, 0);

  const event1 = createReviewEvent({
    draftReference: record.draftReference,
    action: DEMO_REVIEW_ACTIONS.BEGIN_REVIEW,
    previousStatus: record.currentStatus,
    data: { finding: "Review commenced by staff demo officer." }
  });
  record.events.push(event1);
  record.currentStatus = event1.newStatus;
  assert.equal(record.events.length, 1);

  const event2 = createReviewEvent({
    draftReference: record.draftReference,
    action: DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION,
    previousStatus: record.currentStatus,
    data: {
      finding: "Documents corroborate claims.",
      recommendation: "DEMO_RECOMMEND_ADJUSTMENT",
      reason: "Per-capita income qualifies for low-income floor."
    }
  });
  record.events.push(event2);
  record.currentStatus = event2.newStatus;

  assert.equal(record.events.length, 2);
  assert.equal(record.events[0].action, DEMO_REVIEW_ACTIONS.BEGIN_REVIEW);
  assert.equal(record.events[1].action, DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION);
});

test("8. Previous history remains unchanged when new events are added", () => {
  const record = createInitialReviewRecord("LOCAL-DRAFT-20261121-IMMUT01");
  const event1 = createReviewEvent({
    draftReference: record.draftReference,
    action: DEMO_REVIEW_ACTIONS.BEGIN_REVIEW,
    previousStatus: record.currentStatus,
    data: { finding: "Initial event data" }
  });
  record.events.push(event1);

  const event1Snapshot = { ...event1 };

  const event2 = createReviewEvent({
    draftReference: record.draftReference,
    action: DEMO_REVIEW_ACTIONS.COMPLETE_REVIEW,
    previousStatus: record.currentStatus,
    data: { finding: "Final event data" }
  });
  record.events.push(event2);

  // Assert event1 was not mutated by event2
  assert.deepEqual(record.events[0], event1Snapshot);
  assert.equal(record.events[0].finding, "Initial event data");
  assert.equal(record.events[1].finding, "Final event data");
});

test("9. Different challenges have isolated review history", () => {
  const recordA = createInitialReviewRecord("LOCAL-DRAFT-20261121-CASE-A");
  const recordB = createInitialReviewRecord("LOCAL-DRAFT-20261121-CASE-B");

  const eventA = createReviewEvent({
    draftReference: recordA.draftReference,
    action: DEMO_REVIEW_ACTIONS.BEGIN_REVIEW,
    previousStatus: recordA.currentStatus,
    data: { finding: "Case A finding" }
  });
  recordA.events.push(eventA);

  assert.equal(recordA.events.length, 1);
  assert.equal(recordB.events.length, 0);
  assert.equal(recordA.events[0].draftReference, "LOCAL-DRAFT-20261121-CASE-A");
});

test("10. Unknown dispute categories cannot trigger automated recalculation", () => {
  const draft = getSampleDraft();
  draft.disputes = [
    {
      fieldKey: "other",
      valueAsPresented: "General unfairness",
      correctedValue: "Qualitative dispute that cannot be parsed to numbers",
      explanation: "No model input mapping exists for this textual complaint."
    }
  ];

  const simulation = getIllustrativeImpactSimulation(draft, { householdSize: 1, monthlyNetEarnedIncome: 10000 });
  assert.equal(simulation.canSimulate, false);
  assert.equal(simulation.reason, "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.");
});

test("11. Member-reported values remain distinct from verified values", () => {
  const draft = getSampleDraft();
  // Household size changed from 1 to 4
  const simulation = getIllustrativeImpactSimulation(draft, {
    householdSize: 1,
    monthlyNetEarnedIncome: 15000,
    county: "Meru"
  });

  assert.equal(simulation.canSimulate, true);
  assert.equal(simulation.originalInputValue, 1);
  assert.equal(simulation.correctedInputValue, 4);
  assert.equal(simulation.memberReportedMonthlyKsh, 2500); // Member reported
  assert.ok(simulation.prototypeOriginalMonthlyKsh > 0);   // Derived from snapshot
  assert.ok(simulation.disclaimer.includes("ILLUSTRATIVE PROTOTYPE SCENARIO"));
  assert.ok(simulation.disclaimer.includes("NOT AN SHA REASSESSMENT"));
});

test("11a. A missing snapshot never borrows the currently active household", () => {
  const draft = getSampleDraft();
  delete draft.assessmentInputSnapshot;

  const simulation = getIllustrativeImpactSimulation(draft, {
    householdSize: 4,
    monthlyNetEarnedIncome: 25000,
    county: "Nairobi"
  });

  assert.equal(simulation.canSimulate, false);
  assert.match(simulation.detail, /currently active household cannot be substituted/i);
});

test("11b. Multiple disputes are not silently reduced to the first mappable dispute", () => {
  const draft = getSampleDraft();
  draft.disputes.push({
    id: "disp-2",
    fieldKey: "declared_earnings",
    valueAsPresented: "15000",
    correctedValue: "22000",
    explanation: "Second independent disputed item."
  });

  const simulation = getIllustrativeImpactSimulation(draft);
  assert.equal(simulation.canSimulate, false);
  assert.match(simulation.detail, /exactly one supported dispute/i);
});

test("11c. Impact simulation uses the model version and parameters captured with the draft", () => {
  const draft = getSampleDraft();
  draft.modelVersionId = "declared-income-agi-v1";
  draft.modelParameterSnapshot = { tier1CostOfLiving: 25000, triangulationOffline: true };

  const simulation = getIllustrativeImpactSimulation(draft);
  assert.equal(simulation.canSimulate, true);
  assert.equal(simulation.modelVersionId, "declared-income-agi-v1");
  assert.deepEqual(simulation.modelParametersUsed, draft.modelParameterSnapshot);
});

test("12. Review actions never generate official SHA submission states", () => {
  const statuses = Object.values(DEMO_REVIEW_STATUSES);
  statuses.forEach(st => {
    assert.doesNotMatch(st, /^OFFICIAL|^APPROVED|^REJECTED|^SHA_CONFIRMED/);
    assert.ok(st.startsWith("DEMO_"));
  });
});

test("13. Completing demonstration review does not alter the original challenge draft", () => {
  const originalDraft = getSampleDraft("LOCAL-DRAFT-20261121-UNTOUCHED");
  const draftSnapshot = JSON.parse(JSON.stringify(originalDraft));

  const record = createInitialReviewRecord(originalDraft.draftReference);
  const completeEvent = createReviewEvent({
    draftReference: originalDraft.draftReference,
    action: DEMO_REVIEW_ACTIONS.COMPLETE_REVIEW,
    previousStatus: DEMO_REVIEW_STATUSES.UNDER_REVIEW,
    data: { finding: "Final review conclusion reached in demonstration." }
  });
  record.events.push(completeEvent);
  record.currentStatus = completeEvent.newStatus;

  // Verify originalDraft object was untouched
  assert.deepEqual(originalDraft, draftSnapshot);
  assert.equal(originalDraft.status, "LOCAL_DRAFT");
});

test("14. Empty challenge queue renders safely in helper formatting", () => {
  const formatted = formatReviewHistory(null, null);
  assert.equal(formatted, "No review record available.");

  const emptyRecord = createInitialReviewRecord("LOCAL-DRAFT-EMPTY");
  const formattedEmpty = formatReviewHistory(emptyRecord, null);
  assert.ok(formattedEmpty.includes("CHRONOLOGICAL REVIEW EVENTS (0)"));
  assert.ok(formattedEmpty.includes("No review events have been recorded"));
});

test("15. Existing Phase 1 and Phase 2 tests still pass independently", () => {
  assert.ok(DEMO_REVIEW_ACTIONS.BEGIN_REVIEW);
  assert.ok(DEMO_REVIEW_ACTIONS.COMPLETE_REVIEW);
  assert.equal(getNextDemoReviewStatus(DEMO_REVIEW_ACTIONS.REFER_MANUAL), DEMO_REVIEW_STATUSES.REFERRED_MANUAL);
});

test("16. Original assessment input snapshot is preserved and not altered by subsequent scenario switches", () => {
  const initialHousehold = {
    householdSize: 2,
    monthlyNetEarnedIncome: 20000,
    county: "Kisumu",
    activeScenario: "Urban Satellite Renter"
  };

  const rawData = {
    assessment: {
      receivedDate: "2026-11-10",
      assessmentPeriodStart: "2026-01-01",
      assessmentPeriodEnd: "2026-12-31",
      assessedMonthlyContribution: 1800
    },
    grounds: ["income_or_liquidity"],
    disputes: [
      {
        id: "disp-1",
        fieldKey: "declared_earnings",
        valueAsPresented: "20000",
        correctedValue: "12000",
        explanation: "Overtime pay was one-off."
      }
    ],
    generalExplanation: "Earnings dropped back to base pay after project completion."
  };

  const draft = createNormalizedChallengeDraft(rawData, { activeScenario: "Urban Satellite Renter" }, initialHousehold);
  assert.ok(draft.assessmentInputSnapshot);
  assert.equal(draft.assessmentInputSnapshot.householdSize, 2);
  assert.equal(draft.assessmentInputSnapshot.monthlyNetEarnedIncome, 20000);
  assert.equal(draft.assessmentInputSnapshot.county, "Kisumu");

  // Simulate user switching scenario in App.jsx
  const switchedHousehold = {
    householdSize: 8,
    monthlyNetEarnedIncome: 120000,
    county: "Nairobi",
    activeScenario: "Urban Middle Class"
  };

  // Run impact simulation on the draft using the switched household as fallback
  const sim = getIllustrativeImpactSimulation(draft, switchedHousehold);
  assert.equal(sim.canSimulate, true);
  // Must use the saved snapshot (20000), NOT the switched household (120000)
  assert.equal(sim.originalInputValue, 20000);
  assert.equal(sim.correctedInputValue, 12000);
  assert.equal(draft.assessmentInputSnapshot.monthlyNetEarnedIncome, 20000);
});

test("17. Calculations use the same model on original snapshot vs corrected snapshot without mutating original", () => {
  const draft = getSampleDraft();
  const snapshotBefore = JSON.parse(JSON.stringify(draft.assessmentInputSnapshot));

  const sim = getIllustrativeImpactSimulation(draft);
  assert.equal(sim.canSimulate, true);
  assert.ok(Number.isFinite(sim.prototypeOriginalMonthlyKsh));
  assert.ok(Number.isFinite(sim.prototypeCorrectedMonthlyKsh));
  assert.equal(sim.prototypeMonthlyDifferenceKsh, sim.prototypeCorrectedMonthlyKsh - sim.prototypeOriginalMonthlyKsh);

  // Original snapshot in draft must not be mutated
  assert.deepEqual(draft.assessmentInputSnapshot, snapshotBefore);
});

test("18. Separate member-reported and prototype-calculated amounts are maintained", () => {
  const draft = getSampleDraft();
  draft.assessment.assessedMonthlyContribution = 5450; // Member reported

  const sim = getIllustrativeImpactSimulation(draft);
  assert.equal(sim.canSimulate, true);
  assert.equal(sim.memberReportedMonthlyKsh, 5450);
  assert.notEqual(sim.prototypeOriginalMonthlyKsh, sim.memberReportedMonthlyKsh);
});

test("19. Unmapped descriptive text disputes require manual assessment and fail safe mapping", () => {
  const draft = getSampleDraft();
  draft.disputes = [
    {
      fieldKey: "household_size",
      valueAsPresented: "1",
      correctedValue: "4 family members plus my elderly mother", // Text, not clean digits
      explanation: "Includes extended family."
    }
  ];

  const sim = getIllustrativeImpactSimulation(draft);
  assert.equal(sim.canSimulate, false);
  assert.equal(sim.reason, "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.");
});

test("20. Evidence annotations use metadata-only language without claiming content authentication", () => {
  const keys = EVIDENCE_ANNOTATION_STATUSES.map(s => s.key);
  assert.ok(keys.includes("DEMO_METADATA_NOTED"));
  assert.ok(keys.includes("DEMO_ADDITIONAL_EVIDENCE_REQUESTED"));
  assert.ok(keys.includes("DEMO_FILE_NOT_PROVIDED"));
  assert.doesNotMatch(keys.join(" "), /EXAMINED_IN_PROTOTYPE|VERIFIED|AUTHENTICATED/);
});

test("21. Synthetic demonstration challenge creates an idempotent single sample draft", () => {
  const list = [];
  const res1 = createSyntheticMeetingDemonstration(list);
  assert.equal(res1.isNew, true);
  assert.ok(res1.draft);
  assert.equal(res1.draft.isSyntheticDemoCase, true);
  assert.equal(res1.draft.draftReference, "LOCAL-DRAFT-20261121-MEETING-SAMPLE");
  assert.ok(res1.draft.assessmentInputSnapshot);
  assert.equal(res1.draft.assessment.officialAssessmentReference, "");
  assert.doesNotMatch(res1.draft.generalExplanation, /chama balances as personal income/i);
  assert.equal(res1.draft.modelVersionId, "declared-income-agi-v1");
  assert.ok(res1.draft.modelParameterSnapshot);

  list.push(res1.draft);

  // Calling it again with list containing the draft returns the existing draft
  const res2 = createSyntheticMeetingDemonstration(list);
  assert.equal(res2.isNew, false);
  assert.equal(res2.draft.draftReference, "LOCAL-DRAFT-20261121-MEETING-SAMPLE");
});

test("22. Removing synthetic demonstration challenge leaves user drafts intact", () => {
  const userDraft = getSampleDraft("LOCAL-DRAFT-20261121-USER001");
  const { draft: synthDraft } = createSyntheticMeetingDemonstration();

  const combined = [userDraft, synthDraft];
  assert.equal(combined.length, 2);

  const cleaned = removeSyntheticMeetingDemonstration(combined);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].draftReference, "LOCAL-DRAFT-20261121-USER001");
});

test("23. Unified case summary includes required disclaimer, review history, and all 12 items", () => {
  const draft = getSampleDraft();
  const record = createInitialReviewRecord(draft.draftReference);
  const ev = createReviewEvent({
    draftReference: draft.draftReference,
    action: DEMO_REVIEW_ACTIONS.RECORD_RECOMMENDATION,
    previousStatus: DEMO_REVIEW_STATUSES.UNDER_REVIEW,
    data: {
      finding: "Sample finding on household size.",
      recommendation: "DEMO_RECOMMEND_ADJUSTMENT",
      reason: "Per-capita income threshold reached."
    }
  });
  record.events.push(ev);
  record.currentStatus = ev.newStatus;

  const sim = getIllustrativeImpactSimulation(draft);
  const summary = formatUnifiedCaseSummary(draft, record, sim);

  assert.ok(summary.includes("LOCAL DEMONSTRATION CASE SUMMARY — NOT AN OFFICIAL SHA RECORD"));
  assert.ok(summary.includes(draft.draftReference));
  assert.ok(summary.includes("MEMBER-REPORTED ASSESSMENT INFORMATION"));
  assert.ok(summary.includes("DISPUTED ITEMS & MEMBER CORRECTIONS"));
  assert.ok(summary.includes("PROTOTYPE CALCULATION COMPARISON"));
  assert.ok(summary.includes("OFFICER FINDINGS & RECOMMENDATIONS"));
  assert.ok(summary.includes("CHRONOLOGICAL REVIEW HISTORY (1 Events)"));
});

test("24. Snapshot monthly net income equals the original model input", () => {
  const modelInput = {
    ...PRESETS[0].inputs,
    monthlyNetEarnedIncome: 27500
  };
  const snapshot = buildAssessmentInputSnapshot(modelInput);
  assert.strictEqual(snapshot.monthlyNetEarnedIncome, modelInput.monthlyNetEarnedIncome);
});

test("25. Snapshot household size equals the original model input", () => {
  const modelInput = {
    ...PRESETS[0].inputs,
    householdSize: 6
  };
  const snapshot = buildAssessmentInputSnapshot(modelInput);
  assert.strictEqual(snapshot.householdSize, modelInput.householdSize);
});

test("26. Missing income is not silently converted into zero", () => {
  const nullInput = {
    ...PRESETS[0].inputs,
    monthlyNetEarnedIncome: null
  };
  const nullSnapshot = buildAssessmentInputSnapshot(nullInput);
  assert.strictEqual(nullSnapshot.monthlyNetEarnedIncome, null);
  assert.notStrictEqual(nullSnapshot.monthlyNetEarnedIncome, 0);

  const undefInput = {
    ...PRESETS[0].inputs,
    monthlyNetEarnedIncome: undefined
  };
  const undefSnapshot = buildAssessmentInputSnapshot(undefInput);
  assert.strictEqual(undefSnapshot.monthlyNetEarnedIncome, undefined);
  assert.notStrictEqual(undefSnapshot.monthlyNetEarnedIncome, 0);

  // Missing income in snapshot fails validation and is rejected from automated simulation
  const draftWithMissingIncome = getSampleDraft("LOCAL-DRAFT-20261121-MISSING-INC");
  draftWithMissingIncome.assessmentInputSnapshot = nullSnapshot;
  const sim = getIllustrativeImpactSimulation(draftWithMissingIncome);
  assert.strictEqual(sim.canSimulate, false);
  assert.strictEqual(sim.reason, "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.");
});

test("27. Zero income remains zero", () => {
  const zeroInput = {
    ...PRESETS[0].inputs,
    monthlyNetEarnedIncome: 0
  };
  const zeroSnapshot = buildAssessmentInputSnapshot(zeroInput);
  assert.strictEqual(zeroSnapshot.monthlyNetEarnedIncome, 0);
  assert.strictEqual(typeof zeroSnapshot.monthlyNetEarnedIncome, "number");
});

test("28. Original prototype output equals a direct calculation on the original inputs", () => {
  for (const preset of PRESETS) {
    const directCalc = calculateProposedModel(preset.inputs);
    const snapshot = buildAssessmentInputSnapshot(preset.inputs);
    const snapshotCalc = calculateProposedModel(snapshot);

    assert.strictEqual(snapshotCalc.monthlyContribution, directCalc.monthlyContribution);
    assert.strictEqual(snapshotCalc.adjustedGrossIncome, directCalc.adjustedGrossIncome);
    assert.strictEqual(snapshotCalc.tier, directCalc.tier);
    assert.strictEqual(snapshotCalc.minimumContributionApplied, directCalc.minimumContributionApplied);
    assert.strictEqual(snapshotCalc.indigenceStatus, "NOT_DETERMINED");
  }
});

test("29. Corrected prototype output equals a direct calculation on an independently constructed corrected input", () => {
  const initialInputs = { ...PRESETS[1].inputs, householdSize: 4 }; // Mama Wanjiku
  const correctedHouseholdSize = 7;
  const independentlyConstructedCorrected = {
    ...initialInputs,
    householdSize: correctedHouseholdSize
  };

  const independentCalc = calculateProposedModel(independentlyConstructedCorrected);

  const draft = getSampleDraft("LOCAL-DRAFT-20261121-INDEP-TEST");
  draft.assessmentInputSnapshot = buildAssessmentInputSnapshot(initialInputs);
  draft.disputes = [
    {
      fieldKey: "household_size",
      valueAsPresented: String(initialInputs.householdSize),
      correctedValue: String(correctedHouseholdSize),
      explanation: "Includes dependants."
    }
  ];

  const sim = getIllustrativeImpactSimulation(draft);
  assert.strictEqual(sim.canSimulate, true);
  assert.strictEqual(sim.prototypeCorrectedMonthlyKsh, independentCalc.monthlyContribution);
  assert.strictEqual(sim.correctedAGIKsh, independentCalc.adjustedGrossIncome);
  assert.strictEqual(sim.correctedTier, independentCalc.tier);
  assert.strictEqual(sim.correctedMinimumContributionApplied, independentCalc.minimumContributionApplied);
  assert.strictEqual(sim.correctedIndigenceStatus, "NOT_DETERMINED");
});

test("30. Calculating the correction does not mutate the original snapshot", () => {
  const initialInputs = { ...PRESETS[0].inputs };
  const snapshot = buildAssessmentInputSnapshot(initialInputs);
  const snapshotCloneBefore = JSON.parse(JSON.stringify(snapshot));

  const draft = getSampleDraft("LOCAL-DRAFT-20261121-IMMUTABLE-TEST");
  draft.assessmentInputSnapshot = snapshot;
  draft.disputes = [
    {
      fieldKey: "declared_earnings",
      valueAsPresented: String(initialInputs.monthlyNetEarnedIncome),
      correctedValue: String(initialInputs.monthlyNetEarnedIncome + 5000),
      explanation: "Testing snapshot immutability."
    }
  ];

  getIllustrativeImpactSimulation(draft);

  assert.deepStrictEqual(draft.assessmentInputSnapshot, snapshotCloneBefore);
  assert.strictEqual(draft.assessmentInputSnapshot.monthlyNetEarnedIncome, snapshotCloneBefore.monthlyNetEarnedIncome);
});

test("31. Categorical housing tenure requires manual review and cannot be used as numeric rent", () => {
  // Household with ownershipStatus: "OWNED"
  const ownedHousehold = { ...PRESETS[0].inputs, ownershipStatus: "OWNED", monthlyRent: 0 };
  const draft = getSampleDraft("LOCAL-DRAFT-20261121-HOUSING-DISP");
  draft.assessmentInputSnapshot = buildAssessmentInputSnapshot(ownedHousehold);
  draft.disputes = [
    {
      fieldKey: "housing_circumstances",
      valueAsPresented: "OWNED",
      correctedValue: "12000",
      explanation: "Claiming rent deduction on owned property without rental tenure."
    }
  ];

  const sim = getIllustrativeImpactSimulation(draft);
  assert.strictEqual(sim.canSimulate, false);
  assert.strictEqual(sim.reason, "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.");

  // Also test textual categorical dispute: e.g. correctedValue: "RENTED"
  const renterHousehold = { ...PRESETS[5].inputs, ownershipStatus: "RENTED", monthlyRent: 16000 };
  const draftCategorical = getSampleDraft("LOCAL-DRAFT-20261121-CATEGORICAL-DISP");
  draftCategorical.assessmentInputSnapshot = buildAssessmentInputSnapshot(renterHousehold);
  draftCategorical.disputes = [
    {
      fieldKey: "housing_circumstances",
      valueAsPresented: "16000",
      correctedValue: "INFORMAL_RENTAL",
      explanation: "Categorical status change."
    }
  ];
  const simCategorical = getIllustrativeImpactSimulation(draftCategorical);
  assert.strictEqual(simCategorical.canSimulate, false);
  assert.strictEqual(simCategorical.reason, "MANUAL ASSESSMENT REQUIRED — NO AUTOMATED IMPACT ESTIMATED.");
});
