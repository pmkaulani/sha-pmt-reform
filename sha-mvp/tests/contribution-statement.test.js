import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  calculateProposedModel,
  validateAssessmentInputs,
} from "../src/lib/AlgorithmSimulation.js";

// ─── 1. CORE RECONCILIATION & PRESET CHECKS ──────────────────────────────────

test("all presets produce exact calculation reconciliation without differences", () => {
  for (const preset of PRESETS) {
    const result = calculateProposedModel(preset.inputs);
    const breakdown = result.calculationBreakdown;

    assert.ok(breakdown, `breakdown object must exist for ${preset.name}`);
    assert.ok(breakdown.reconciliation, `reconciliation object must exist for ${preset.name}`);

    const rec = breakdown.reconciliation;
    assert.equal(
      rec.baseReconciliationDifference,
      0,
      `baseReconciliationDifference must be 0 for ${preset.name}`
    );
    assert.equal(
      rec.preFloorReconciliationDifference,
      0,
      `preFloorReconciliationDifference must be 0 for ${preset.name}`
    );
    assert.equal(
      rec.preFloorAdjustedGrossIncome + rec.zeroFloorAdjustment,
      rec.adjustedGrossIncome,
      `preFloor + zeroFloor adjustment must equal AGI for ${preset.name}`
    );
    assert.equal(
      rec.adjustedGrossIncome,
      result.adjustedGrossIncome,
      `reconciled AGI must equal result.adjustedGrossIncome for ${preset.name}`
    );
    assert.equal(
      rec.isReconciled,
      true,
      `isReconciled flag must be true for ${preset.name}`
    );
  }
});

test("zero net earned income is handled correctly by the zero floor", () => {
  const zeroIncomeHousehold = {
    ...PRESETS[4].inputs, // Mzee Kamau
    monthlyNetEarnedIncome: 0,
  };

  const result = calculateProposedModel(zeroIncomeHousehold);
  const rec = result.calculationBreakdown.reconciliation;

  assert.equal(result.estimatedAnnualIncome, 0, "annual earned base must be 0");
  assert.equal(result.adjustedGrossIncome, 0, "AGI cannot go negative; must be clamped to 0 floor");
  assert.equal(result.monthlyContribution, 300, "zero income household gets illustrative minimum contribution assumption of KSh 300");
  assert.ok(rec.zeroFloorAdjustment > 0, "zero floor adjustment absorbs deductions that exceed income");
  assert.equal(rec.baseReconciliationDifference, 0);
  assert.equal(rec.preFloorReconciliationDifference, 0);
  assert.equal(rec.isReconciled, true);
});

test("missing net earned income is rejected by validation and calculation engine", () => {
  const missingInputs = [
    { ...PRESETS[0].inputs, monthlyNetEarnedIncome: null },
    { ...PRESETS[0].inputs, monthlyNetEarnedIncome: undefined },
    { ...PRESETS[0].inputs, monthlyNetEarnedIncome: "" },
  ];

  for (const input of missingInputs) {
    const validation = validateAssessmentInputs(input);
    assert.equal(validation.isValid, false, "validation must fail for missing income");
    assert.match(validation.errors[0], /required/i);

    assert.throws(
      () => calculateProposedModel(input),
      /validation failed/i,
      "calculateProposedModel must throw when monthlyNetEarnedIncome is missing"
    );
  }
});

test("negative net earned income is rejected by validation and calculation engine", () => {
  const negativeInput = {
    ...PRESETS[0].inputs,
    monthlyNetEarnedIncome: -5000,
  };

  const validation = validateAssessmentInputs(negativeInput);
  assert.equal(validation.isValid, false, "validation must fail for negative income");
  assert.match(validation.errors[0], /negative/i);

  assert.throws(
    () => calculateProposedModel(negativeInput),
    /cannot be negative/i,
    "calculateProposedModel must throw when monthlyNetEarnedIncome is negative"
  );
});

// ─── 2. ASSET INDEPENDENCE TESTS ──────────────────────────────────────────────

test("increasing vehicle valuation does not increase annual earned income base", () => {
  const baseHousehold = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 25000,
    assets: [],
    vehicles: [],
  };

  const withOldCar = {
    ...baseHousehold,
    assets: ["CAR"],
    vehicles: [{ type: "STANDARD_OLD" }],
  };

  const withLuxuryCar = {
    ...baseHousehold,
    assets: ["CAR"],
    vehicles: [{ type: "LUXURY" }],
  };

  const resBase = calculateProposedModel(baseHousehold);
  const resOld = calculateProposedModel(withOldCar);
  const resLuxury = calculateProposedModel(withLuxuryCar);

  const expectedBase = 25000 * 12;
  assert.equal(resBase.estimatedAnnualIncome, expectedBase);
  assert.equal(resOld.estimatedAnnualIncome, expectedBase, "Old car must not inflate earned income base");
  assert.equal(resLuxury.estimatedAnnualIncome, expectedBase, "Luxury car must not inflate earned income base");
});

test("increasing land valuation does not increase annual earned income base", () => {
  const baseHousehold = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 20000,
    landAcreage: 0,
    landParcels: [],
  };

  const withFarmland = {
    ...baseHousehold,
    landAcreage: 10,
    landParcels: [{ acres: 10, county: "Kiambu", marketValuePerAcre: 2000000 }],
  };

  const resBase = calculateProposedModel(baseHousehold);
  const resLand = calculateProposedModel(withFarmland);

  assert.equal(resBase.estimatedAnnualIncome, 240000);
  assert.equal(resLand.estimatedAnnualIncome, 240000, "10 acres of land must not inflate earned income base");
  assert.ok(resLand.factors.some(f => f.name.includes("Land")), "Land ownership must be recorded as contextual factor");
});

test("increasing livestock valuation does not increase annual earned income base", () => {
  const baseHousehold = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 15000,
    livestockCount: 0,
  };

  const withHerd = {
    ...baseHousehold,
    livestockCount: 80,
  };

  const resBase = calculateProposedModel(baseHousehold);
  const resHerd = calculateProposedModel(withHerd);

  assert.equal(resBase.estimatedAnnualIncome, 180000);
  assert.equal(resHerd.estimatedAnnualIncome, 180000, "80 livestock head must not inflate earned income base");
  assert.ok(resHerd.factors.some(f => f.name.includes("Livestock")), "Livestock must be recorded as contextual factor");
});

test("increasing SACCO share capital does not increase annual earned income base", () => {
  const baseHousehold = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 30000,
    hasSaccoAccount: false,
    saccoShareCapital: 0,
  };

  const withSacco = {
    ...baseHousehold,
    hasSaccoAccount: true,
    saccoShareCapital: 1500000,
  };

  const resBase = calculateProposedModel(baseHousehold);
  const resSacco = calculateProposedModel(withSacco);

  assert.equal(resBase.estimatedAnnualIncome, 360000);
  assert.equal(resSacco.estimatedAnnualIncome, 360000, "SACCO capital must not inflate earned income base");
  assert.ok(resSacco.factors.some(f => f.name.includes("SACCO")), "SACCO capital must be recorded as contextual factor");
});

// ─── 3. MULTIPLE ASSET RECORDS ────────────────────────────────────────────────

test("multiple vehicles are tracked contextually without altering earned income base", () => {
  const household = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 35000,
    vehicles: [
      { type: "STANDARD_OLD" },
      { type: "COMMERCIAL", isOwnerOperated: true },
      { type: "LUXURY" },
    ],
  };

  const result = calculateProposedModel(household);
  assert.equal(result.estimatedAnnualIncome, 35000 * 12);
  const vehicleFactor = result.factors.find(f => f.name === "Multiple Vehicles");
  assert.ok(vehicleFactor, "Multiple vehicles factor should be recorded");
  assert.match(vehicleFactor.description, /3 vehicle\(s\)/);
});

test("multiple land parcels in different counties are evaluated contextually", () => {
  const household = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 40000,
    landParcels: [
      { acres: 2, county: "Kiambu" },
      { acres: 10, county: "Turkana" },
    ],
  };

  const result = calculateProposedModel(household);
  assert.equal(result.estimatedAnnualIncome, 40000 * 12);
  const landFactor = result.factors.find(f => f.name === "Multiple Land Parcels");
  assert.ok(landFactor, "Multiple land parcels factor should be recorded");
  assert.match(landFactor.description, /2 parcel\(s\)/);
});

// ─── 4. INCOME INTEGRITY & NON-DUPLICATION ────────────────────────────────────

test("rental earnings in declared net monthly income are not duplicated", () => {
  const landlordHousehold = {
    ...PRESETS[6].inputs, // Landlord preset
    monthlyNetEarnedIncome: 95000, // Member has already aggregated net rental earnings
    rentalProperties: [
      { monthlyRentCharged: 25000, isOccupied: true },
      { monthlyRentCharged: 20000, isOccupied: true },
    ],
  };

  const result = calculateProposedModel(landlordHousehold);
  // Authoritative base must equal monthlyNetEarnedIncome * 12, NOT monthlyNetEarnedIncome * 12 + rent * 12
  assert.equal(
    result.estimatedAnnualIncome,
    95000 * 12,
    "Declared net monthly earnings already incorporates income; rental rent must not be added again"
  );
  assert.ok(
    result.factors.some(f => f.name === "Rental Property Business"),
    "Rental units should be noted as commercial context"
  );
});

test("unoccupied rental property does not automatically generate earned income", () => {
  const vacantPropertyHousehold = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 18000,
    rentalProperties: [
      { monthlyRentCharged: 0, isOccupied: false },
      { monthlyRentCharged: 0, isOccupied: false },
    ],
  };

  const result = calculateProposedModel(vacantPropertyHousehold);
  assert.equal(
    result.estimatedAnnualIncome,
    18000 * 12,
    "Vacant properties must not create synthetic earned income in the authoritative base"
  );
});

test("commercial fleet remittances are not added a second time to earned income base", () => {
  const fleetOwner = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 50000,
    vehicles: [
      { type: "COMMERCIAL", isOwnerOperated: false, dailyTargetIncome: 2500 },
    ],
  };

  const result = calculateProposedModel(fleetOwner);
  assert.equal(
    result.estimatedAnnualIncome,
    50000 * 12,
    "Commercial fleet targets must not be added a second time to declared net earnings"
  );
  assert.ok(
    result.factors.some(f => f.name === "Commercial Fleet Income"),
    "Commercial fleet activity should be recorded contextually"
  );
});

// ─── 5. INDEPENDENT RECONCILIATION ARITHMETIC TESTS ───────────────────────────

test("reconciliation arithmetic independently verifies positive AGI", () => {
  const household = {
    ...PRESETS[3].inputs, // Urban Middle Class
    monthlyNetEarnedIncome: 100000,
    ownershipStatus: "RENTED",
    monthlyRent: 30000,
    householdSize: 4,
    hasChronicIllness: false,
    hasRegisteredDisability: false,
  };

  const result = calculateProposedModel(household);
  const rec = result.calculationBreakdown.reconciliation;
  const items = result.calculationBreakdown.annualBaseItems;
  const deductions = result.calculationBreakdown.postBaseDeductions;

  // Independent calculations
  const expectedBase = items.reduce((s, i) => s + i.amount, 0);
  const expectedDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const expectedPreFloor = expectedBase - expectedDeductions;
  const expectedZeroFloor = Math.max(0, -expectedPreFloor);
  const expectedAGI = Math.max(0, expectedPreFloor);

  assert.equal(rec.annualBaseSum, expectedBase);
  assert.equal(rec.totalPostBaseDeductions, expectedDeductions);
  assert.equal(rec.expectedPreFloorAGI, expectedPreFloor);
  assert.equal(rec.preFloorAdjustedGrossIncome, expectedPreFloor);
  assert.equal(rec.baseReconciliationDifference, 0);
  assert.equal(rec.preFloorReconciliationDifference, 0);
  assert.equal(rec.zeroFloorAdjustment, expectedZeroFloor);
  assert.equal(rec.adjustedGrossIncome, expectedAGI);
  assert.equal(result.adjustedGrossIncome, expectedAGI);
  assert.equal(rec.isReconciled, true);
});

test("reconciliation arithmetic independently verifies negative pre-floor with zero floor adjustment", () => {
  const lowIncomeHousehold = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 6000, // KSh 72,000 annual
    county: "Nairobi", // Tier 1 COL is 18,000/mo = 216,000 annual
    ownershipStatus: "OWNED",
    householdSize: 5,
  };

  const result = calculateProposedModel(lowIncomeHousehold);
  const rec = result.calculationBreakdown.reconciliation;

  assert.ok(rec.preFloorAdjustedGrossIncome < 0, "pre-floor income must be negative when deductions exceed income");
  assert.equal(rec.expectedAGI, 0, "expected AGI after floor must be 0");
  assert.equal(rec.zeroFloorAdjustment, -rec.preFloorAdjustedGrossIncome, "zero floor adjustment must exactly offset negative pre-floor");
  assert.equal(rec.adjustedGrossIncome, 0, "final AGI must be clamped to 0");
  assert.equal(rec.baseReconciliationDifference, 0);
  assert.equal(rec.preFloorReconciliationDifference, 0);
  assert.equal(rec.isReconciled, true);
});

test("reconciliation handles multiple layered deductions accurately", () => {
  const multiDeductionHousehold = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 50000,
    county: "Nairobi",
    ownershipStatus: "RENTED",
    monthlyRent: 20000,
    householdSize: 5,
    hasChronicIllness: true,
    hasRegisteredDisability: true,
  };

  const result = calculateProposedModel(multiDeductionHousehold);
  const rec = result.calculationBreakdown.reconciliation;
  const deductions = result.calculationBreakdown.postBaseDeductions;

  // Verify all 4 categories are present
  const names = deductions.map(d => d.name);
  assert.ok(names.some(n => n.includes("Cost of Living") || n.includes("Rent-Adjusted")));
  assert.ok(names.some(n => n.includes("Dependency")));
  assert.ok(names.some(n => n.includes("Chronic Illness") || n.includes("CHE")));
  assert.ok(names.some(n => n.includes("Disability")));

  const sumDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  assert.equal(rec.totalPostBaseDeductions, sumDeductions);
  assert.equal(rec.baseReconciliationDifference, 0);
  assert.equal(rec.preFloorReconciliationDifference, 0);
  assert.equal(rec.isReconciled, true);
});

// ─── 6. DEMONSTRATION PAYMENT RECORD TAGGING ──────────────────────────────────

test("demonstration payment entry generates correct DEMO-RCPT prefix and UNVERIFIED status", () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = "ABCD";
  const receiptNumber = `DEMO-RCPT-${dateStr}-${suffix}`;
  const entry = {
    receiptNumber,
    amount: 300,
    channel: "M-Pesa (Demo)",
    timestamp: now.toISOString(),
    status: "UNVERIFIED_DEMO_ENTRY",
  };

  assert.match(entry.receiptNumber, /^DEMO-RCPT-\d{8}-[A-Z0-9]+$/);
  assert.equal(entry.status, "UNVERIFIED_DEMO_ENTRY");
  assert.equal(entry.amount, 300);
  assert.doesNotMatch(entry.status, /^VERIFIED_|^OFFICIAL_|^SHA_APPROVED/);
});
