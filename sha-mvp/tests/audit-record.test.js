import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  calculateCurrentModel,
  calculateCurrentModelContribution,
  calculateFraudRisk,
  createAuditRecord
} from "../src/lib/AlgorithmSimulation.js";
import { calculateProposedModelVersions } from "../src/lib/model-versioning.js";

test("assessment record is clearly local, not a fabricated SHA submission", () => {
  const inputs = {
    ...PRESETS[1].inputs,
    monthlyNetEarnedIncome: 18000,
    msisdn: "254700000001"
  };
  const adminParams = {
    tier1CostOfLiving: 18000,
    fulizaPenalty: 5000,
    tier1RentCap: 35000,
    triangulationOffline: false
  };
  const modelVersions = calculateProposedModelVersions(inputs, adminParams);
  const current = calculateCurrentModelContribution(calculateCurrentModel(inputs));
  const fraud = calculateFraudRisk(inputs);

  const record = createAuditRecord(
    inputs,
    current,
    modelVersions.declaredIncome.result,
    fraud,
    "TEST",
    modelVersions,
    adminParams
  );

  assert.match(record.localAssessmentId, /^LOCAL-ASSESSMENT-\d{8}-[A-Z0-9]+$/);
  assert.equal(record.assessmentId, undefined);
  assert.equal(record.status, "LOCAL_DEMONSTRATION");
  assert.equal(record.isOfficialSubmission, false);
  assert.equal(record.algorithmVersion, "declared-income-agi-v1.1");

  assert.equal(record.assessmentInputSnapshot.monthlyNetEarnedIncome, 18000);
  assert.equal(record.assessmentInputSnapshot.msisdn, undefined);
  assert.deepEqual(record.modelParametersSnapshot, adminParams);

  assert.equal(record.outputs.proposedModelVersions.originalAgi.id, "asset-liquidity-agi-v2.1");
  assert.equal(record.outputs.proposedModelVersions.declaredIncome.id, "declared-income-agi-v1.1");
  assert.equal(
    record.outputs.proposedModelVersions.originalAgi.monthlyContribution,
    modelVersions.originalAgi.result.monthlyContribution
  );
});
