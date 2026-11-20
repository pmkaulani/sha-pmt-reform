import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  calculateProposedModel,
  calculateFraudRisk,
} from "../src/lib/AlgorithmSimulation.js";

test("SACCO capital receipt matches the amount excluded from the illustrative base", () => {
  const ordinary = {
    ...PRESETS[1].inputs,
    hasSaccoAccount: false,
    saccoShareCapital: 0,
  };
  const member = {
    ...ordinary,
    hasSaccoAccount: true,
    saccoShareCapital: 100000,
  };

  const ordinaryResult = calculateProposedModel(ordinary);
  const memberResult = calculateProposedModel(member);
  const delta = memberResult.estimatedAnnualIncome - ordinaryResult.estimatedAnnualIncome;
  const exemption = memberResult.deductions.find((item) => item.name === "SACCO Capital Exemption");

  assert.equal(delta, 50000, "half of declared share capital should remain in the illustrative base");
  assert.ok(exemption, "a SACCO exemption receipt should be present");
  assert.equal(exemption.amount, 50000, "the receipt should show the half excluded");
});

test("an elderly household with a multi-item vehicle declaration is not age-overridden as asset-free", () => {
  const household = {
    ...PRESETS[4].inputs,
    county: "Nairobi",
    householdSize: 1,
    headAge: 72,
    assets: [],
    vehicles: [{ type: "LUXURY" }],
    landAcreage: 0,
    landParcels: [],
    livestockCount: 0,
    rentalProperties: [],
    avgRetainedBalance: 0,
    grossMpesaMonthly: 0,
    receivesAid: false,
    isRefugee: false,
    hasChronicIllness: false,
    hasRegisteredDisability: false,
    isSeasonalWorker: false,
    diasporaRemittances: 0,
  };

  const result = calculateProposedModel(household);
  assert.equal(result.isIndigent, false);
  assert.equal(result.adjustedGrossIncome > 131000, true);
});

test("zero low-season balance follows the CHP review path without crashing", () => {
  const household = {
    ...PRESETS[1].inputs,
    isSeasonalWorker: true,
    lowSeasonRetainedBalance: 0,
  };

  const result = calculateProposedModel(household);
  assert.equal(result.requiresChpVerification, true);
  assert.equal(typeof result.monthlyContribution, "number");
});

test("fraud output exposes a heuristic score and does not approve a household", () => {
  const result = calculateFraudRisk(PRESETS[0].inputs);

  assert.equal(result.heuristicRiskScore, result.fraudRiskPercentile);
  assert.equal(result.heuristicRiskScore >= 0 && result.heuristicRiskScore <= 100, true);
  assert.equal(result.severityLevel, "LOW");
  assert.match(result.recommendation, /not a fraud clearance/i);
});
