import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  calculateProposedModel,
  calculateFraudRisk,
  validateAssessmentInputs,
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
  assert.equal(result.minimumContributionApplied, true, "low earned income triggers minimum contribution floor");
  assert.equal(result.indigenceStatus, "NOT_DETERMINED", "indigence is never determined by prototype");
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

test("declared monthly income rejects blank, non-finite and negative financial values", () => {
  for (const value of ["   ", Infinity, -Infinity, NaN, "NaN", "Infinity", -1, "-250"]) {
    const result = validateAssessmentInputs({ monthlyNetEarnedIncome: value, householdSize: 1, county: "Nairobi" });
    assert.equal(result.isValid, false, `Expected ${String(value)} to be rejected`);
  }

  assert.equal(validateAssessmentInputs({ monthlyNetEarnedIncome: 0, householdSize: 1, county: "Nairobi" }).isValid, true);
  assert.equal(validateAssessmentInputs({ monthlyNetEarnedIncome: "12500", householdSize: 1, county: "Nairobi" }).isValid, true);
});

test("household size and county validation rejects 0, non-integers, and unrecognized counties", () => {
  // Household size validation
  for (const size of [0, -1, 1.5, "NaN", null, undefined, ""]) {
    const res = validateAssessmentInputs({ monthlyNetEarnedIncome: 10000, householdSize: size, county: "Nairobi" });
    assert.equal(res.isValid, false, `Expected householdSize ${String(size)} to be rejected`);
    assert.ok(res.errors.some(e => e.includes("Household size")));
  }

  // County validation
  for (const c of ["Atlantis", "UnknownCounty", "", null, undefined]) {
    const res = validateAssessmentInputs({ monthlyNetEarnedIncome: 10000, householdSize: 2, county: c });
    assert.equal(res.isValid, false, `Expected county ${String(c)} to be rejected`);
    assert.ok(res.errors.some(e => e.includes("County")));
  }

  // Valid combination passes
  const valid = validateAssessmentInputs({ monthlyNetEarnedIncome: 10000, householdSize: 4, county: "Mombasa" });
  assert.equal(valid.isValid, true);
  assert.equal(valid.errors.length, 0);
});

test("high-income households triggering candidate policy overrides are distinguished from statutory floor", () => {
  const baseHighIncome = {
    monthlyNetEarnedIncome: 100000, // KSh 1.2M annual earned income -> 2.75% / 12 = KSh 2,750/mo
    county: "Nairobi",
    householdSize: 4,
    headAge: 40,
    headGender: "FEMALE",
    assets: [],
    vehicles: [],
    receivesAid: false,
    isRefugee: false,
    avgRetainedBalance: 50000
  };

  // 1. Normal high-income household: no override, mathematical calculation applies
  const normalResult = calculateProposedModel(baseHighIncome);
  assert.equal(normalResult.statutoryMinimumFloorApplied, false);
  assert.equal(normalResult.policyOverrideApplied, false);
  assert.equal(normalResult.minimumContributionApplied, false);
  assert.equal(normalResult.monthlyContribution, 1714); // Evaluated after Nairobi cost-of-living and dependency deductions
  assert.ok(normalResult.monthlyContribution > 300);
  assert.equal(normalResult.indigenceStatus, "NOT_DETERMINED");

  // 2. High-income household receiving aid: candidate policy override applies floor, flagged as unapproved assumption
  const aidResult = calculateProposedModel({ ...baseHighIncome, receivesAid: true });
  assert.equal(aidResult.statutoryMinimumFloorApplied, false, "Statutory mathematical floor does not apply to 100k/mo income");
  assert.equal(aidResult.policyOverrideApplied, true, "Candidate policy override must be flagged");
  assert.equal(aidResult.policyOverrideType, "AID_RECIPIENT_OVERRIDE");
  assert.equal(aidResult.minimumContributionApplied, true, "Minimum contribution applied via override");
  assert.equal(aidResult.monthlyContribution, 300);
  assert.equal(aidResult.indigenceStatus, "NOT_DETERMINED", "Does not constitute a statutory indigence determination");

  // 3. High-income refugee household: refugee protection candidate override applies
  const refugeeResult = calculateProposedModel({ ...baseHighIncome, isRefugee: true });
  assert.equal(refugeeResult.policyOverrideApplied, true);
  assert.equal(refugeeResult.policyOverrideType, "REFUGEE_PROTECTION_OVERRIDE");
  assert.equal(refugeeResult.monthlyContribution, 300);
  assert.equal(refugeeResult.indigenceStatus, "NOT_DETERMINED");

  // 4. High-income elderly head with low retained liquidity (<5000): elderly override applies
  const elderlyResult = calculateProposedModel({ ...baseHighIncome, headAge: 68, avgRetainedBalance: 2000 });
  assert.equal(elderlyResult.policyOverrideApplied, true);
  assert.equal(elderlyResult.policyOverrideType, "ELDERLY_LOW_LIQUIDITY_OVERRIDE");
  assert.equal(elderlyResult.monthlyContribution, 300);

  // 5. Child-headed household override
  const childHeadedResult = calculateProposedModel({ ...baseHighIncome, headAge: 19, householdSize: 3 });
  assert.equal(childHeadedResult.policyOverrideApplied, true);
  assert.equal(childHeadedResult.policyOverrideType, "CHILD_HEADED_HOUSEHOLD_OVERRIDE");
  assert.equal(childHeadedResult.monthlyContribution, 300);
});
