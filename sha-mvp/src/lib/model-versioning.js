import {
  calculateProposedModel as calculateOriginalAssetLiquidityAgi
} from "./AlgorithmSimulation.original-agi-v2.1.js";
import {
  calculateProposedModel as calculateDeclaredIncomeAgi
} from "./AlgorithmSimulation.js";

// The models are intentionally separate. Do not merge their formulas or share
// intermediate annual-base calculations: they encode different policy hypotheses.
export const MODEL_VERSION_METADATA = Object.freeze({
  originalAgi: Object.freeze({
    id: "asset-liquidity-agi-v2.1",
    version: "2.1",
    label: "Original asset- and liquidity-aware AGI",
    sourceCommit: "c1a5a09cdfff15035c5bf012acc3ff932786e87a",
    baseMeaning: "A constructed assessment base using retained liquidity, eligible declared flows, capital-asset valuations and adjustments.",
    methodology: "Retained balances and seasonal liquidity; chama/fiduciary treatment; remittance and debt adjustments; SACCO capital; commercial vehicles and motorcycles; rental activity; location-adjusted land and livestock; household and vulnerability deductions."
  }),
  declaredIncome: Object.freeze({
    id: "declared-income-agi-v1",
    version: "1.0 experiment",
    label: "Declared-income AGI variant",
    sourceCommit: "bb34fca61573c97085c6e753a1d7a09b069774df",
    baseMeaning: "Annualised declared net earned household income. Assets, retained balances, transaction activity and debt are contextual verification signals rather than direct additions to that base.",
    methodology: "Declared monthly net earnings × 12; illustrative cost-of-living, rent, dependency and vulnerability adjustments; contextual asset and liquidity indicators."
  })
});

/**
 * Runs both proposed research models against the same household snapshot.
 * The returned objects remain separate so the UI, audit trail and research
 * comparisons cannot accidentally treat one model's base as the other's.
 *
 * Neither output is an official SHA assessment or a substitute for SHA's
 * production Regulation 21 means-testing instrument.
 */
export function calculateProposedModelVersions(inputs, adminParams = {}) {
  const originalResult = calculateOriginalAssetLiquidityAgi(inputs, adminParams);
  const declaredIncomeResult = calculateDeclaredIncomeAgi(inputs, adminParams);

  return {
    originalAgi: {
      ...MODEL_VERSION_METADATA.originalAgi,
      result: originalResult
    },
    declaredIncome: {
      ...MODEL_VERSION_METADATA.declaredIncome,
      result: declaredIncomeResult
    },
    comparison: {
      monthlyContributionDifference:
        declaredIncomeResult.monthlyContribution - originalResult.monthlyContribution,
      adjustedGrossIncomeDifference:
        declaredIncomeResult.adjustedGrossIncome - originalResult.adjustedGrossIncome,
      annualBaseDifference:
        declaredIncomeResult.estimatedAnnualIncome - originalResult.estimatedAnnualIncome
    }
  };
}
