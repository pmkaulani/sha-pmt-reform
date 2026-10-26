// Calibrate Tax Mode cost ratios from a CSV of real survey rows.
//   node calibrate_costs.mjs path/to/survey.csv [minRowsPerType]
// CSV header: businessType,sales,costs   (sales and costs over the same period)
// businessType must be one of: KIOSK, GREENGROCER, FOOD, FARM_PRODUCE, BODA, ARTISAN, SALON
// Prints the median, quartiles and a suggested ratio per type. Only types with enough rows get a suggestion.
import { readFileSync } from 'node:fs';
import { calibrateCostRatios, parseCalibrationCsv } from './src/lib/TaxCalibration.js';

const [, , file, minRowsArg] = process.argv;
if (!file) {
  console.error('Usage: node calibrate_costs.mjs survey.csv [minRowsPerType]');
  process.exit(1);
}
const rows = parseCalibrationCsv(readFileSync(file, 'utf8'));
const out = calibrateCostRatios(rows, { minRows: Number(minRowsArg) || 30 });
const pct = (x) => (x === null ? '  -  ' : `${(x * 100).toFixed(0).padStart(3)}%`);
console.log(`Rows read: ${rows.length}. Unusable rows: ${out.badRows}.${out.unknownTypes.length ? ` Unknown types ignored: ${out.unknownTypes.join(', ')}.` : ''}\n`);
console.log('type           n   placeholder  p25   median  p75   suggestion');
for (const t of out.byType) {
  console.log(`${t.id.padEnd(13)} ${String(t.n).padStart(4)}   ${pct(t.currentPlaceholder)}        ${pct(t.p25)}  ${pct(t.median)}   ${pct(t.p75)}  ${t.enoughData ? pct(t.suggestion) : '(too few rows)'}`);
}
console.log('\nUse the suggestions to update costRatio in src/lib/TaxMode.js, and record the data source in docs/TAX_MODE.md.');
