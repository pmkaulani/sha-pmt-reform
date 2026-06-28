// Quick logic verification script — runs each preset through both models
//
// PRODUCTION MONITORING PROTOCOL (v2.1 Requirement)
// -------------------------------------------------
// In a live production environment, the function `testCurrentModelDisparityByCounty()` 
// (or its backend equivalent) MUST be executed weekly, strictly using `headGender` 
// as the grouping key. This ensures ongoing compliance with Article 27 of the 
// Constitution by proactively monitoring for disparate impact or unintended bias 
// in AGI assessments across female-headed vs. male-headed households.

import { calculateCurrentModel, calculateProposedModel, calculateFraudRisk, PRESETS } from './src/lib/AlgorithmSimulation.js';

const adminParams = { carValue: 350000, urbanCostOfLiving: 12000, fulizaPenalty: 5000 };

console.log('=== SHA Algorithm Logic Verification ===\n');

for (const preset of PRESETS) {
  const d = preset.inputs;
  const lasso = calculateCurrentModel(d);
  const proposed = calculateProposedModel(d, adminParams);
  const fraud = calculateFraudRisk(d, {
    ntsaCarExists: d.assets.includes('CAR') || d.isNtsaVerified,
    kraIncomeLevel: undefined,
  });

  const lassoMonthly = lasso < 131000 ? 300 : Math.max(300, Math.round((lasso * 0.0275) / 12));
  
  console.log(`--- ${preset.name} ---`);
  console.log(`  Lasso Annual Income: KSh ${lasso.toLocaleString()}`);
  console.log(`  Lasso Monthly:       KSh ${lassoMonthly}`);
  console.log(`  AGI Annual Income:   KSh ${proposed.estimatedAnnualIncome.toLocaleString()}`);
  console.log(`  AGI Adjusted:        KSh ${Math.round(proposed.adjustedGrossIncome).toLocaleString()}`);
  console.log(`  AGI Monthly:         KSh ${proposed.monthlyContribution}`);
  console.log(`  AGI Tier:            ${proposed.tier}`);
  console.log(`  AGI Indigent:        ${proposed.isIndigent}`);
  console.log(`  Fraud Flags:         ${fraud.flagCount} (${fraud.severityLevel})`);
  if (fraud.flagCount > 0) {
    fraud.fraudFlags.forEach(f => console.log(`    -> ${f.name}: ${f.severity}`));
  }
  
  // Sanity checks
  const issues = [];
  if (proposed.monthlyContribution < 300) issues.push('Monthly below KSh 300 floor!');
  if (proposed.monthlyContribution > lassoMonthly && proposed.isIndigent) issues.push('Indigent but charged above 300 — impossible state!');
  if (proposed.isIndigent && proposed.monthlyContribution !== 300) issues.push('Indigent but not at 300!');
  if (lasso < 0) issues.push('Lasso produced negative income!');
  if (proposed.adjustedGrossIncome < 0) issues.push('AGI went negative!');
  
  if (issues.length > 0) {
    console.log(`  ⚠ ISSUES: ${issues.join('; ')}`);
  } else {
    console.log(`  ✓ All checks passed`);
  }
  console.log();
}
