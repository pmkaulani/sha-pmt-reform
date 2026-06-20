// Quick logic verification script — runs each preset through both models
import { calculateCurrentModel, calculateProposedModel, calculateFraudRisk, PRESETS } from './src/lib/AlgorithmSimulation.js';

const adminParams = { carValue: 350000, urbanCostOfLiving: 12000, fulizaPenalty: 5000, triangulationOffline: true };

console.log('=== SHA Algorithm Logic Verification (OFFLINE MODE) ===\n');

for (const preset of PRESETS) {
  const d = preset.inputs;
  const proposed = calculateProposedModel(d, adminParams);
  
  console.log(`--- ${preset.name} ---`);
  console.log(`  AGI Annual Income:   KSh ${proposed.estimatedAnnualIncome.toLocaleString()}`);
  console.log(`  AGI Adjusted:        KSh ${Math.round(proposed.adjustedGrossIncome).toLocaleString()}`);
  console.log(`  AGI Monthly:         KSh ${proposed.monthlyContribution}`);
  console.log(`  Digital Ghost:       ${proposed.isDigitalGhost}`);
  console.log(`  CHP Verification:    ${proposed.requiresChpVerification}`);
  
  // Sanity checks
  const issues = [];
  if (proposed.monthlyContribution < 300) issues.push('Monthly below KSh 300 floor!');
  if (proposed.adjustedGrossIncome < 0) issues.push('AGI went negative!');
  
  if (issues.length > 0) {
    console.log(`  ⚠ ISSUES: ${issues.join('; ')}`);
  } else {
    console.log(`  ✓ All checks passed`);
  }
  console.log();
}
