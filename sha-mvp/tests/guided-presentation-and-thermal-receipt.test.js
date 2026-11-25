import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateCurrentModelContribution,
  calculateProposedModel
} from "../src/lib/AlgorithmSimulation.js";

import {
  calculateHouseholdIncome,
  DEFAULT_COMMON_ASSESSMENT_PERIOD
} from "../src/lib/household-income.js";

import {
  calculateProposedModelVersions
} from "../src/lib/model-versioning.js";

import {
  buildReceiptViewModel
} from "../src/presentation/receipt-view-model.js";

import {
  recalculateCorrectedSource
} from "../src/presentation/recalculate-correction.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CALCULATION OUTPUT & CONTRIBUTION BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────

test("Calculation: calculateProposedModel exposes explicit contributionCalculation object", () => {
  const inputs = {
    monthlyNetEarnedIncome: 20000,
    county: "Nairobi",
    householdSize: 4,
    headAge: 38,
    headGender: "F",
    assets: [],
    vehicles: [],
    landParcels: [],
    rentalProperties: [],
    isOffline: false
  };

  const res = calculateProposedModel(inputs);
  assert.ok(res.contributionCalculation, "Must return contributionCalculation object");

  const c = res.contributionCalculation;
  assert.equal(c.rate, 0.0275);

  const expectedAnnualBase = 20000 * 12; // 240,000
  const expectedAGI = expectedAnnualBase; // no policy deductions enabled by default
  const expectedAnnualAtRate = expectedAGI * 0.0275; // 6,600
  const expectedMonthlyBeforeFloor = expectedAnnualAtRate / 12; // 550
  const expectedRounded = Math.round(expectedMonthlyBeforeFloor); // 550

  assert.equal(c.annualContributionAtRate, expectedAnnualAtRate);
  assert.equal(c.monthlyEquivalentBeforeFloor, expectedMonthlyBeforeFloor);
  assert.equal(c.roundedMonthlyEquivalentBeforeFloor, expectedRounded);
  assert.equal(c.minimumMonthlyFloor, 300);
  assert.equal(c.minimumContributionFloorApplied, false);
  assert.equal(c.finalMonthlyEquivalent, 550);
  assert.equal(c.illustrativeAnnualEquivalent, 6600);
});

test("Calculation: Regulation 17(2) floor applies when calculated monthly equivalent is below KSh 300", () => {
  const inputs = {
    monthlyNetEarnedIncome: 5000, // Annual: 60,000 -> 2.75% = 1,650 -> monthly = 137.5
    county: "Makueni",
    householdSize: 2,
    headAge: 45,
    headGender: "M",
    assets: [],
    vehicles: [],
    landParcels: [],
    rentalProperties: [],
    isOffline: false
  };

  const res = calculateProposedModel(inputs);
  const c = res.contributionCalculation;

  assert.equal(c.minimumContributionFloorApplied, true);
  assert.equal(c.monthlyEquivalentBeforeFloor, 137.5);
  assert.equal(c.roundedMonthlyEquivalentBeforeFloor, 138);
  assert.equal(c.minimumMonthlyFloor, 300);
  assert.equal(c.finalMonthlyEquivalent, 300); // KSh 300 floor applied
  assert.equal(c.illustrativeAnnualEquivalent, 3600);
  assert.equal(res.monthlyContribution, 300);
  assert.equal(res.isIndigent, null, "Applying the floor does NOT make an automated indigence determination");
});

test("Calculation: calculateCurrentModelContribution exposes contributionCalculation", () => {
  const cur = calculateCurrentModelContribution(240000);
  assert.ok(cur.contributionCalculation);
  assert.equal(cur.contributionCalculation.rate, 0.0275);
  assert.equal(cur.contributionCalculation.finalMonthlyEquivalent, 550);
  assert.equal(cur.contributionCalculation.minimumContributionFloorApplied, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. RECEIPT VIEW MODEL ADAPTER
// ─────────────────────────────────────────────────────────────────────────────

test("Receipt: buildReceiptViewModel parses earned sources and separates non-earned flows", () => {
  const sources = [
    {
      id: "src-kiosk",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 60000,
      directCostsKsh: 0,
      monthsObserved: 12,
      observationStartDate: "2025-11-01",
      observationEndDate: "2026-10-31",
      expenses: [
        { id: "e1", category: "STOCK_PURCHASES", amountKsh: 30000 },
        { id: "e2", category: "OTHER_OPERATING", amountKsh: 12000 }
      ],
      openingStockKsh: 5000,
      closingStockKsh: 5000
    },
    {
      id: "src-remittance",
      sourceType: "REMITTANCES",
      amountReceivedKsh: 15000,
      monthsObserved: 12,
      observationStartDate: "2025-11-01",
      observationEndDate: "2026-10-31"
    }
  ];

  const ledger = calculateHouseholdIncome(sources, DEFAULT_COMMON_ASSESSMENT_PERIOD);
  assert.equal(ledger.isValid, true);
  // Remittances require policy classification, so earned base is gated for review
  assert.equal(ledger.canPopulatePrototypeEarnedIncomeBase, false);
  assert.equal(ledger.calculationStatus, "PROVISIONAL_PENDING_POLICY");

  const inputs = {
    county: "Kiambu",
    householdSize: 3,
    headAge: 42,
    headGender: "F",
    incomeSources: sources,
    incomeAssessmentSnapshot: ledger,
    monthlyNetEarnedIncome: ledger.reviewOnlyMonthlyEarnedNetKsh, // 1500
    assets: [],
    vehicles: [],
    landParcels: [],
    rentalProperties: []
  };

  const modelVersions = calculateProposedModelVersions(inputs);
  const nxt = {
    ...modelVersions.declaredIncome.result,
    modelVersion: modelVersions.declaredIncome.id,
    estimatedAnnualIncome: modelVersions.declaredIncome.result.estimatedAnnualIncome,
    adjustedGrossIncome: modelVersions.declaredIncome.result.adjustedGrossIncome,
    monthlyContribution: modelVersions.declaredIncome.result.monthlyContribution,
    incomeAssessmentSnapshot: ledger
  };

  const results = {
    d: inputs,
    next: nxt,
    modelVersions
  };

  const receipt = buildReceiptViewModel(results);

  // Checks
  assert.equal(receipt.household.county, "Kiambu");
  assert.equal(receipt.household.size, 3);
  assert.equal(receipt.incomeLines.length, 1, "Only earned income line in incomeLines");
  assert.equal(receipt.otherLines.length, 1, "Remittance flow is in otherLines");
  assert.equal(receipt.incomeLines[0].sourceId, "src-kiosk");
  assert.equal(receipt.incomeLines[0].grossReceivedKsh, 60000);
  assert.equal(receipt.incomeLines[0].costsKsh, 42000);
  assert.equal(receipt.incomeLines[0].costOfGoodsSoldKsh, 30000);
  assert.equal(receipt.incomeLines[0].operatingCostsKsh, 12000);
  assert.equal(receipt.incomeLines[0].monthlyNetKsh, 1500); // (60000 - 42000) / 12 = 18000 / 12 = 1500
  assert.equal(receipt.monthlyNetIncomeKsh, 1500);
  assert.equal(receipt.requiresPolicyDecision, true);

  // Statutory citations
  assert.ok(receipt.statutoryCitation.rate.includes("Regulation 17(1)"));
  assert.ok(receipt.statutoryCitation.floor.includes("Regulation 17(2)"));
  assert.ok(receipt.statutoryCitation.financialAssistance.includes("Regulation 18"));
  assert.ok(receipt.statutoryCitation.meansTesting.includes("Regulation 21"));
});

test("Receipt: fully cleared 12-month earned assessment produces standard receipt", () => {
  const sources = [
    {
      id: "src-kiosk",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 60000,
      directCostsKsh: 0,
      monthsObserved: 12,
      observationStartDate: "2025-11-01",
      observationEndDate: "2026-10-31",
      expenses: [
        { id: "e1", category: "STOCK_PURCHASES", amountKsh: 30000 },
        { id: "e2", category: "OTHER_OPERATING", amountKsh: 12000 }
      ],
      openingStockKsh: 5000,
      closingStockKsh: 5000
    },
    {
      id: "src-casual",
      sourceType: "CASUAL_LABOUR",
      amountReceivedKsh: 30000,
      directCostsKsh: 0,
      monthsObserved: 12,
      observationStartDate: "2025-11-01",
      observationEndDate: "2026-10-31"
    }
  ];

  const ledger = calculateHouseholdIncome(sources, DEFAULT_COMMON_ASSESSMENT_PERIOD);
  assert.equal(ledger.isValid, true);
  assert.equal(ledger.canPopulatePrototypeEarnedIncomeBase, true);
  assert.equal(ledger.calculationStatus, "CALCULATED_STANDARD");

  // Kiosk: (60,000 - 42,000)/12 = 1,500/mo. Casual: 30,000/12 = 2,500/mo. Total = 4,000/mo (48,000/yr).
  assert.equal(ledger.monthlyEarnedNetKsh, 4000);
  assert.equal(ledger.annualisedEarnedNetKsh, 48000);

  const inputs = {
    county: "Meru",
    householdSize: 4,
    headAge: 38,
    headGender: "M",
    incomeSources: sources,
    incomeAssessmentSnapshot: ledger,
    monthlyNetEarnedIncome: 4000,
    assets: [],
    vehicles: [],
    landParcels: [],
    rentalProperties: []
  };

  const modelVersions = calculateProposedModelVersions(inputs);
  const nxt = {
    ...modelVersions.declaredIncome.result,
    modelVersion: modelVersions.declaredIncome.id,
    estimatedAnnualIncome: 48000,
    adjustedGrossIncome: 48000,
    monthlyContribution: 300,
    incomeAssessmentSnapshot: ledger
  };

  const results = { d: inputs, next: nxt, modelVersions };
  const receipt = buildReceiptViewModel(results);

  assert.equal(receipt.status, "CALCULATED_STANDARD");
  assert.equal(receipt.incomeLines.length, 2);
  assert.equal(receipt.monthlyNetIncomeKsh, 4000);
  assert.equal(receipt.annualIncomeBaseKsh, 48000);
  assert.equal(receipt.contribution.minimumContributionFloorApplied, true);
  assert.equal(receipt.contribution.finalMonthlyEquivalent, 300);
});

test("Receipt: throws when no completed assessment is available", () => {
  assert.throws(() => buildReceiptViewModel(null), /No completed assessment result is available/);
  assert.throws(() => buildReceiptViewModel({}), /No completed assessment result is available/);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. CHALLENGE & RECALCULATION WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

test("Challenge: rejects invalid non-numeric or negative correction amounts", () => {
  const originalInputs = {
    incomeSources: [
      { id: "s1", sourceType: "SELF_EMPLOYMENT", amountReceivedKsh: 50000, monthsObserved: 12 }
    ]
  };
  const originalResults = { next: { monthlyContribution: 500 } };

  assert.throws(
    () => recalculateCorrectedSource({
      originalInputs,
      originalResults,
      sourceId: "s1",
      correctedAmountReceivedKsh: -500
    }),
    /Enter a valid non-negative KSh amount/
  );

  assert.throws(
    () => recalculateCorrectedSource({
      originalInputs,
      originalResults,
      sourceId: "s1",
      correctedAmountReceivedKsh: "not-a-number"
    }),
    /Enter a valid non-negative KSh amount/
  );
});

test("Challenge: throws when selected source is not an earned-income bucket", () => {
  const originalInputs = {
    incomeSources: [
      { id: "s-aid", sourceType: "SOCIAL_ASSISTANCE", amountReceivedKsh: 5000, monthsObserved: 12 }
    ]
  };
  const originalResults = { next: { monthlyContribution: 300 } };

  assert.throws(
    () => recalculateCorrectedSource({
      originalInputs,
      originalResults,
      sourceId: "s-aid",
      correctedAmountReceivedKsh: 4000
    }),
    /only supports corrections to earned-income sources/
  );
});

test("Challenge: recalculateCorrectedSource produces independent revised calculation without mutating original inputs", () => {
  const originalSources = [
    {
      id: "src-wanjiku-kiosk",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 60000,
      directCostsKsh: 0,
      monthsObserved: 12,
      observationStartDate: "2025-11-01",
      observationEndDate: "2026-10-31",
      expenses: [
        { id: "e1", category: "STOCK_PURCHASES", amountKsh: 30000 },
        { id: "e2", category: "OTHER_OPERATING", amountKsh: 12000 }
      ],
      openingStockKsh: 5000,
      closingStockKsh: 5000
    }
  ];

  const originalLedger = calculateHouseholdIncome(originalSources, DEFAULT_COMMON_ASSESSMENT_PERIOD);

  const originalInputs = {
    county: "Nairobi",
    householdSize: 3,
    headAge: 40,
    headGender: "F",
    incomeSources: originalSources,
    incomeAssessmentSnapshot: originalLedger,
    monthlyNetEarnedIncome: originalLedger.monthlyEarnedNetKsh, // 1500
    assets: [],
    vehicles: [],
    landParcels: [],
    rentalProperties: []
  };

  const origVersions = calculateProposedModelVersions(originalInputs);
  const originalResults = {
    d: originalInputs,
    next: {
      ...origVersions.declaredIncome.result,
      modelVersion: origVersions.declaredIncome.id,
      estimatedAnnualIncome: origVersions.declaredIncome.result.estimatedAnnualIncome,
      adjustedGrossIncome: origVersions.declaredIncome.result.adjustedGrossIncome,
      monthlyContribution: origVersions.declaredIncome.result.monthlyContribution,
      incomeAssessmentSnapshot: originalLedger
    },
    modelVersions: origVersions
  };

  // Original gross: 60,000. Correct it to 90,000 (higher customer revenue)
  const res = recalculateCorrectedSource({
    originalInputs,
    originalResults,
    sourceId: "src-wanjiku-kiosk",
    correctedAmountReceivedKsh: 90000,
    explanation: "Reconciled additional wholesale orders omitted from first draft"
  });

  // Verify immutability of original inputs
  assert.equal(originalInputs.incomeSources[0].amountReceivedKsh, 60000, "Original input must not be mutated");
  assert.equal(originalResults.next.incomeAssessmentSnapshot.monthlyEarnedNetKsh, 1500, "Original snapshot must not be mutated");

  // Verify corrected values
  assert.equal(res.correctedInputs.incomeSources[0].amountReceivedKsh, 90000);
  // (90,000 - 42,000) = 48,000 / 12 = 4,000/mo net
  assert.equal(res.correctedSnapshot.monthlyEarnedNetKsh, 4000);
  assert.equal(res.correctedSnapshot.annualisedEarnedNetKsh, 48000);

  // Revised contribution: 48,000 * 0.0275 = 1,320 / 12 = 110 -> Regulation 17(2) floor applies (300)
  assert.equal(res.revisedResult.monthlyContribution, 300);
  assert.equal(res.comparison.originalMonthlyContribution, 300);
  assert.equal(res.comparison.revisedMonthlyContribution, 300);
  assert.equal(res.comparison.minimumFloorStillApplied, true);
  assert.ok(res.comparison.explanationText.includes("Regulation 17(2)"));
});

test("Challenge: recalculating high-income correction increases rate-based contribution above KSh 300 floor", () => {
  const originalSources = [
    {
      id: "src-consulting",
      sourceType: "SELF_EMPLOYMENT",
      amountReceivedKsh: 240000, // 20k/mo net -> 240k annual -> contribution = 550
      directCostsKsh: 0,
      monthsObserved: 12,
      observationStartDate: "2025-11-01",
      observationEndDate: "2026-10-31"
    }
  ];

  const originalLedger = calculateHouseholdIncome(originalSources, DEFAULT_COMMON_ASSESSMENT_PERIOD);

  const originalInputs = {
    county: "Nairobi",
    householdSize: 2,
    headAge: 35,
    headGender: "M",
    incomeSources: originalSources,
    incomeAssessmentSnapshot: originalLedger,
    monthlyNetEarnedIncome: 20000,
    assets: [],
    vehicles: [],
    landParcels: [],
    rentalProperties: []
  };

  const origVersions = calculateProposedModelVersions(originalInputs);
  const originalResults = {
    d: originalInputs,
    next: {
      ...origVersions.declaredIncome.result,
      modelVersion: origVersions.declaredIncome.id,
      estimatedAnnualIncome: 240000,
      adjustedGrossIncome: 240000,
      monthlyContribution: 550,
      minimumContributionFloorApplied: false,
      incomeAssessmentSnapshot: originalLedger
    },
    modelVersions: origVersions
  };

  // Correct source to 360,000 (30k/mo net -> 360k annual -> 2.75% = 9,900 / 12 = 825)
  const res = recalculateCorrectedSource({
    originalInputs,
    originalResults,
    sourceId: "src-consulting",
    correctedAmountReceivedKsh: 360000,
    explanation: "Included fourth quarter retainer contract"
  });

  assert.equal(res.comparison.originalMonthlyContribution, 550);
  assert.equal(res.comparison.revisedMonthlyContribution, 825);
  assert.equal(res.comparison.monthlyDifference, 275);
  assert.equal(res.comparison.minimumFloorStillApplied, false);
  assert.ok(res.comparison.explanationText.includes("increasing the calculated monthly contribution by KSh 275"));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. PHASE 11 VERIFICATION: WANJIRU RETAIL MARKET TRADER & STATUTORY INTEGRITY
// ─────────────────────────────────────────────────────────────────────────────

test("Phase 11 (1-10): Wanjiru Retail Market Trader calculation fixture matches engine exactly", () => {
  // Test fixture as specified by user:
  // Gross turnover: 540,000; Operating expenses: 180,000; Net: 360,000 (30,000/mo)
  // County: Nakuru (Urban Tier 2 -> 120,000 living allowance)
  // Household size: 5 (4 dependants -> 4 * 0.08 = 32% of remaining 240,000 = 76,800)
  // Expected AGI: 163,200
  // Rate: 2.75% -> Annual: 4,488 -> Monthly: 374 -> Floor applied: NO (374 >= 300)

  const wanjiruInput = {
    county: "Nakuru",
    householdSize: 5,
    headAge: 38,
    headGender: "F",
    monthlyNetEarnedIncome: 30000,
    assets: ["RADIO", "SMARTPHONE"],
    vehicles: [],
    landParcels: [],
    rentalProperties: []
  };

  const adminParams = {
    enableExperimentalPolicyAdjustments: true
  };

  const res = calculateProposedModel(wanjiruInput, adminParams);

  // 1. Regulation citations on output
  const c = res.contributionCalculation;
  assert.ok(c, "Engine must return contributionCalculation breakdown");
  assert.equal(c.rate, 0.0275, "1. Contribution rate must be 2.75% under Regulation 17(1)");

  // 2. Annual income base
  assert.equal(res.estimatedAnnualIncome, 360000, "2. Annual income base must be 360,000 (30,000 * 12)");

  // 3. Cost-of-living adjustment
  const col = res.deductions.find(d => d.category === "COST_OF_LIVING");
  assert.ok(col, "Must include Cost of Living allowance");
  assert.equal(col.amount, 120000, "3. Cost of Living in Nakuru Tier 2 must be KSh 120,000/year");

  // 4. Dependency allowance formula
  const remainingAfterCol = res.estimatedAnnualIncome - col.amount;
  assert.equal(remainingAfterCol, 240000, "Income after living adjustment must be KSh 240,000");

  const dep = res.deductions.find(d => d.category === "DEPENDENCY");
  assert.ok(dep, "Must include Dependency allowance");
  // 4 dependants * 8% = 32% of 240,000 = 76,800
  assert.equal(dep.amount, 76800, "4. Dependency allowance must be 4 * 8% * 240,000 = KSh 76,800");

  // 5. KSh 163,200 is produced for the specified sample
  assert.equal(res.adjustedGrossIncome, 163200, "5. Adjusted Prototype Income Base must be KSh 163,200");
  assert.equal(360000 - 120000 - 76800, 163200);

  // 6. 2.75% of KSh 163,200 equals KSh 4,488
  assert.equal(c.annualContributionAtRate, 4488, "6. 2.75% of KSh 163,200 must equal KSh 4,488");
  assert.equal(163200 * 0.0275, 4488);

  // 7. Monthly equivalent is KSh 374
  assert.equal(c.monthlyEquivalentBeforeFloor, 374, "7. Monthly equivalent before floor must be KSh 374");
  assert.equal(4488 / 12, 374);

  // 8. KSh 300 minimum is not applied to KSh 374
  assert.equal(c.minimumContributionFloorApplied, false, "8. KSh 300 minimum must NOT be applied to KSh 374");
  assert.equal(c.finalMonthlyEquivalent, 374, "Final monthly payable must be KSh 374");
  assert.equal(res.monthlyContribution, 374);

  // 9. Calculated amount below KSh 300 correctly triggers the minimum
  const lowIncomeInput = {
    county: "Nakuru",
    householdSize: 5,
    monthlyNetEarnedIncome: 10000, // 120k annual - 120k col = 0 AGI -> 0 contribution -> triggers 300 floor
    assets: [],
    vehicles: []
  };
  const lowRes = calculateProposedModel(lowIncomeInput, adminParams);
  assert.equal(lowRes.contributionCalculation.minimumContributionFloorApplied, true, "9. Below KSh 300 must trigger floor");
  assert.equal(lowRes.monthlyContribution, 300, "Floor must produce KSh 300/mo");

  // 10. Non-negative income adjustment is independently handled
  assert.equal(res.calculationBreakdown.reconciliation.zeroFloorAdjustment, 0, "10. Zero-floor adjustment is 0 when income positive");
  assert.equal(res.calculationBreakdown.reconciliation.isReconciled, true, "Arithmetic must be fully reconciled");
});

test("Phase 11 (11-14): Evidence status, immutability, payment separation, and view model", () => {
  // 11. Member-declared evidence is never labelled independently verified
  const sampleResults = {
    d: {
      county: "Nakuru",
      householdSize: 5,
      monthlyNetEarnedIncome: 30000,
      dwellingType: "BUNGALOW",
      assets: ["RADIO"],
      incomeSources: [
        {
          id: "src-1",
          sourceType: "SELF_EMPLOYMENT",
          label: "Retail Market Trader",
          amountReceivedKsh: 540000,
          directCostsKsh: 180000,
          monthsObserved: 12
        }
      ]
    },
    next: {
      modelVersion: "declared-income-agi-v1.1",
      estimatedAnnualIncome: 360000,
      adjustedGrossIncome: 163200,
      monthlyContribution: 374,
      minimumContributionFloorApplied: false,
      incomeAssessmentSnapshot: {
        calculationStatus: "CALCULATED_STANDARD",
        lines: [
          {
            sourceId: "src-1",
            bucket: "EARNED",
            label: "Retail Market Trader",
            totalReceivedKsh: 540000,
            totalReportedCostsKsh: 180000,
            reportedNetKsh: 360000,
            averageMonthlyNetKsh: 30000,
            observationMonths: 12,
            provenance: "MEMBER_DECLARATION"
          }
        ]
      }
    }
  };

  const receipt = buildReceiptViewModel(sampleResults);

  // 11. Evidence status check
  assert.ok(receipt.disclaimer.includes("illustrative calculation produced by a research prototype"));
  assert.ok(!receipt.incomeLines.some(l => l.provenance === "VERIFIED_OFFICIAL_RECORD"));
  assert.ok(receipt.statutoryCitation.rate.includes("Regulation 17(1)"));
  assert.ok(receipt.statutoryCitation.floor.includes("Regulation 17(2)"));
  assert.ok(receipt.statutoryCitation.financialAssistance.includes("Regulation 18"));
  assert.ok(receipt.statutoryCitation.meansTesting.includes("Regulation 21"));

  // 12. Immutability during correction
  const origSnapshot = JSON.stringify(sampleResults.d);
  recalculateCorrectedSource({
    originalInputs: sampleResults.d,
    originalResults: sampleResults,
    sourceId: "src-1",
    correctedAmountReceivedKsh: 600000,
    explanation: "Audited ledger addition"
  });
  assert.equal(JSON.stringify(sampleResults.d), origSnapshot, "12. Original inputs must not be mutated");

  // 13. Mock payment acknowledgement separation
  // Receipt contains no mock payment information
  assert.equal(receipt.paymentReceipt, undefined, "13. Calculation receipt must not contain payment acknowledgement");
  assert.ok(receipt.disclaimer.includes("No payment has been made"));
});
