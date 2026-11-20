import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  calculateProposedModel,
  calculateFraudRisk,
} from "../src/lib/AlgorithmSimulation.js";

test("SACCO capital declaration is treated as contextual wealth and does not inflate earned income base", () => {
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
  const saccoFactor = memberResult.factors.find((f) => f.name.includes("SACCO"));

  assert.equal(delta, 0, "SACCO capital must not be added to annual earned income base");
  assert.equal(memberResult.estimatedAnnualIncome, ordinaryResult.estimatedAnnualIncome);
  assert.ok(saccoFactor, "a SACCO contextual factor should be recorded");
});

test("an elderly household with a vehicle declaration routes to manual review without inflating earned income", () => {
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
  assert.equal(result.requiresChpVerification, true, "vehicle ownership for elderly household requires CHP verification");
  assert.equal(result.estimatedAnnualIncome, 0, "luxury vehicle must not be added into earned income base");
  assert.equal(result.adjustedGrossIncome, 0, "AGI remains at zero floor after deductions");
  assert.equal(result.isIndigent, true, "low earned income qualifies for subsidized band pending verification");
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

test("subletting income already represented in declared net earnings is not counted twice", () => {
  // Scenario A: Household declaring KSh 25,000 monthly net earnings, which includes KSh 5,000 from informal subletting
  const scenarioWithSublet = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 25000,
    subletIncome: 5000,
  };

  // Scenario B: Household declaring identical total monthly net earnings of KSh 25,000 without subletting
  const scenarioWithoutSublet = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 25000,
    subletIncome: 0,
  };

  const resultWithSublet = calculateProposedModel(scenarioWithSublet);
  const resultWithoutSublet = calculateProposedModel(scenarioWithoutSublet);

  // 1. Annual base total must be identical: 25,000 * 12 = 300,000 in both cases
  assert.equal(
    resultWithSublet.estimatedAnnualIncome,
    resultWithoutSublet.estimatedAnnualIncome,
    "Annual earned income base must not increase when sublet income is already represented in declared net earnings"
  );
  assert.equal(resultWithSublet.estimatedAnnualIncome, 300000);
  assert.equal(resultWithoutSublet.estimatedAnnualIncome, 300000);

  // 2. Calculation breakdown annual base must match
  assert.equal(
    resultWithSublet.calculationBreakdown.annualBaseTotal,
    resultWithoutSublet.calculationBreakdown.annualBaseTotal
  );

  // 3. Subletting household retains contextual indicator for verification
  const subletFactor = resultWithSublet.factors.find(f => f.name.includes("Sublet"));
  assert.ok(subletFactor, "Sublet income contextual factor must be recorded");
  assert.match(subletFactor.description, /not added a second time/i);

  // 4. Non-subletting household does not have the sublet factor
  const nonSubletFactor = resultWithoutSublet.factors.find(f => f.name.includes("Sublet"));
  assert.equal(nonSubletFactor, undefined);
});
