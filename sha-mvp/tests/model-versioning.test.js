import test from "node:test";
import assert from "node:assert/strict";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

function household(overrides = {}) {
  return {
    monthlyNetEarnedIncome: 30000,
    county: "Meru",
    householdSize: 1,
    headAge: 42,
    headGender: "FEMALE",
    ownershipStatus: "OWNED",
    monthlyRent: 0,
    subletIncome: 0,
    assets: ["FEATURE_PHONE"],
    vehicleType: "STANDARD_OLD",
    vehicles: [],
    motorcycles: [],
    motorcycleIsCommercial: false,
    landAcreage: 0,
    landParcels: [],
    livestockCount: 0,
    rentalProperties: [],
    grossMpesaMonthly: 0,
    transactionCount: 0,
    avgRetainedBalance: 10000,
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
    isGroupTreasurer: false,
    receivesAid: false,
    isRefugee: false,
    consentWithheld: false,
    ...overrides
  };
}

test("both proposed AGI versions run independently against the same household snapshot", () => {
  const versions = calculateProposedModelVersions(household());

  assert.equal(versions.originalAgi.id, "asset-liquidity-agi-v2.1");
  assert.equal(versions.declaredIncome.id, "declared-income-agi-v1");
  assert.equal(typeof versions.originalAgi.result.adjustedGrossIncome, "number");
  assert.equal(typeof versions.declaredIncome.result.adjustedGrossIncome, "number");
  assert.equal(typeof versions.originalAgi.result.monthlyContribution, "number");
  assert.equal(typeof versions.declaredIncome.result.monthlyContribution, "number");
  assert.notEqual(versions.originalAgi.result, versions.declaredIncome.result);
});

test("land valuation changes the original AGI base but not the declared-income base", () => {
  const withoutLand = calculateProposedModelVersions(household({ landAcreage: 0 }));
  const withLand = calculateProposedModelVersions(household({ landAcreage: 2 }));

  // Meru is treated as semi-arid in the recovered v2.1 assumptions:
  // 2 acres × KSh 80,000 × 0.5 = KSh 80,000.
  assert.equal(
    withLand.originalAgi.result.estimatedAnnualIncome - withoutLand.originalAgi.result.estimatedAnnualIncome,
    80000
  );
  assert.equal(
    withLand.declaredIncome.result.estimatedAnnualIncome,
    withoutLand.declaredIncome.result.estimatedAnnualIncome
  );
});

test("chama treasurer liquidity treatment remains active only in the recovered model base", () => {
  const ordinary = calculateProposedModelVersions(household({ isGroupTreasurer: false }));
  const treasurer = calculateProposedModelVersions(household({ isGroupTreasurer: true }));

  assert.equal(
    ordinary.originalAgi.result.estimatedAnnualIncome - treasurer.originalAgi.result.estimatedAnnualIncome,
    96000
  );
  assert.equal(
    ordinary.declaredIncome.result.estimatedAnnualIncome,
    treasurer.declaredIncome.result.estimatedAnnualIncome
  );
  assert.ok(
    treasurer.originalAgi.result.factors.some((factor) => factor.name === "Group Treasurer")
  );
  assert.ok(
    treasurer.declaredIncome.result.factors.some((factor) => factor.name.includes("Group Treasurer"))
  );
});

test("seasonal low-season balance changes the original base but remains contextual in the declared-income variant", () => {
  const regular = calculateProposedModelVersions(household({ isSeasonalWorker: false }));
  const seasonal = calculateProposedModelVersions(household({
    isSeasonalWorker: true,
    lowSeasonRetainedBalance: 2000
  }));

  assert.equal(
    regular.originalAgi.result.estimatedAnnualIncome - seasonal.originalAgi.result.estimatedAnnualIncome,
    96000
  );
  assert.equal(
    regular.declaredIncome.result.estimatedAnnualIncome,
    seasonal.declaredIncome.result.estimatedAnnualIncome
  );
});
