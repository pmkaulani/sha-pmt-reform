import { PRESETS, calculateProposedModel } from "../src/lib/AlgorithmSimulation.js";

console.log("================================================================================");
console.log("  SHA Prototype Persona Statutory Minimum Contribution Floor Analysis");
console.log("  Reference: Regulation 18(2) of LN 49/2024 (KSh 300/month minimum floor)");
console.log("================================================================================\n");

let atFloorCount = 0;
let aboveFloorCount = 0;

PRESETS.forEach((preset, index) => {
  const result = calculateProposedModel(preset.inputs);
  const monthly = result.monthlyContribution;
  const isFloor = result.minimumContributionApplied ?? (monthly === 300);
  const agi = Math.round(result.adjustedGrossIncome);
  const calculatedContribution = Math.round((result.adjustedGrossIncome * 0.0275) / 12);

  if (isFloor) {
    atFloorCount++;
  } else {
    aboveFloorCount++;
  }

  console.log(`[${index + 1}] ${preset.name}`);
  console.log(`    County: ${preset.inputs.county} | Household Size: ${preset.inputs.householdSize} | Declared Net Earned: KSh ${preset.inputs.monthlyNetEarnedIncome.toLocaleString()}/mo`);
  console.log(`    Evaluated AGI: KSh ${agi.toLocaleString()} | Calculated 2.75%: KSh ${calculatedContribution.toLocaleString()}/mo`);
  console.log(`    Final Contribution: KSh ${monthly.toLocaleString()}/mo -> ${isFloor ? "STATUTORY FLOOR APPLIED (KSh 300)" : "ABOVE FLOOR (2.75% rate)"}`);
  console.log("");
});

console.log("--------------------------------------------------------------------------------");
console.log(`Summary: ${atFloorCount} of ${PRESETS.length} personas sit at the KSh 300 statutory floor.`);
console.log(`         ${aboveFloorCount} of ${PRESETS.length} personas exceed the floor.`);
console.log("================================================================================");
