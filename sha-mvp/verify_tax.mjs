// Checks for Tax Mode. Run with: node verify_tax.mjs
import assert from 'node:assert/strict';
import { calculateTaxAssessment, applyBands, TAX_PRESETS, TAX_BUSINESS_TYPES, TAX_DEFAULT_PARAMS, OVERRIDE_REASONS, instalmentPlan, addMonthsIso, addDaysIso } from './src/lib/TaxMode.js';
import { runTaxFairnessCheck } from './src/lib/TaxFairness.js';
import { calibrateCostRatios, parseCalibrationCsv } from './src/lib/TaxCalibration.js';

const preset = (name) => TAX_PRESETS.find((p) => p.name === name).inputs;
const base = preset('Kiosk owner, full year');
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };

// ── 1. Graduated bands (annual), hand-computed ─────────────────────────────
eq(applyBands(0).gross, 0);
eq(applyBands(100000).gross, 10000);
eq(applyBands(288000).gross, 28800);                    // top of the 10% band
eq(applyBands(388000).gross, 28800 + 25000);            // top of the 25% band
eq(applyBands(6000000).gross, 53800 + 5612000 * 0.30);  // 1,737,400
eq(applyBands(9600000).gross, 1737400 + 3600000 * 0.325); // 2,907,400
eq(applyBands(10000000).gross, 2907400 + 400000 * 0.35);  // 3,047,400
eq(applyBands(-5).gross, 0);
// rounded band lines always add up to the gross figure
for (const inc of [1, 99999, 288001, 388001, 777777, 5999999, 9600001, 12345678]) {
  const { lines, gross } = applyBands(inc);
  eq(lines.reduce((s, l) => s + l.tax, 0), gross, `lines sum for ${inc}`);
  eq(lines.reduce((s, l) => s + l.amount, 0), inc, `amounts sum for ${inc}`);
}

// ── 2. Presets, hand-computed ──────────────────────────────────────────────
// Kiosk: 150,000 x 12 = 1,800,000; costs 85% = 1,530,000; loan 36,000; equipment 12,000.
let r = calculateTaxAssessment(preset('Kiosk owner, full year'));
eq(r.annualTurnover, 1800000);
eq(r.costAllowance, 1530000);
eq(r.loanAllowance, 36000);
eq(r.equipmentAllowance, 12000);
eq(r.assessedIncome, 222000);
eq(r.grossTax, 22200);
eq(r.relief, 22200);          // relief cannot exceed the tax before relief
eq(r.tax, 0);
eq(r.today.eligible, true);
eq(r.today.tax, 27000);       // 1.5% of 1,800,000, no expenses allowed (rate effective 19 March 2024)
eq(r.usedCrossCheck, false);
eq(r.confidenceTier, 'HIGH');
eq(r.provisional, false);

// Salon, same sales: costs 45% = 810,000 -> income 942,000.
r = calculateTaxAssessment(preset('Salon, higher margin'));
eq(r.assessedIncome, 942000);
eq(r.grossTax, 28800 + 25000 + 554000 * 0.30);  // 220,000
eq(r.tax, 220000 - 28800);                       // 191,200
eq(r.today.tax, 27000);

// Seasonal, no records: 40,000 x 6 = 240,000; costs 65% = 156,000 -> 84,000. Below the turnover-tax floor.
r = calculateTaxAssessment(preset('Seasonal produce seller, no records'));
eq(r.annualTurnover, 240000);
eq(r.assessedIncome, 84000);
eq(r.tax, 0);
eq(r.today.eligible, false);
eq(r.today.tax, null);
eq(r.provisional, true);
eq(r.confidenceTier, 'LOW');
ok(r.flags.some((f) => f.code === 'CONSENT_WITHHELD'));

// Till switcher: inflows 140,000 x 0.8 = 112,000 > 60,000 x 1.25 = 75,000, so cross-check used.
r = calculateTaxAssessment(preset('Trader who switched tills'));
eq(r.usedCrossCheck, true);
eq(r.assessedMonthly, 112000);
eq(r.annualTurnover, 1344000);
eq(r.assessedIncome, 1344000 - 940800 - 24000); // 379,200
eq(r.tax, 51600 - 28800);                        // 22,800
eq(r.today.tax, 20160);   // 1.5% of 1,344,000
eq(r.confidenceTier, 'MEDIUM');
ok(r.flags.some((f) => f.code === 'INFLOWS_ABOVE_DECLARED'));
ok(r.flags.some((f) => f.code === 'CHANNEL_CHANGES'));
ok(!r.provisional);

eq(TAX_DEFAULT_PARAMS.turnoverRate, 0.015);   // current KRA rate; it was 3% from July 2023 to March 2024
eq(at0().today.tax, 15000);
function at0() { return calculateTaxAssessment({ ...base, shareMobileData: false, monthlySales: 83334, monthsTrading: 12 }); }   // 1,000,008 x 1.5% = 15,000

// ── 3. Turnover-tax eligibility boundaries (KSh 1,000,000 < turnover <= 25,000,000) ─────
const at = (monthly, months = 12) => calculateTaxAssessment({ ...base, shareMobileData: false, monthlySales: monthly, monthsTrading: months });
eq(at(83333).today.eligible, false);   // 999,996
eq(at(83334).today.eligible, true);    // 1,000,008
eq(at(2083333).today.eligible, true);  // 24,999,996
eq(at(2083334).today.eligible, false); // 25,000,008
eq(calculateTaxAssessment({ ...base, shareMobileData: false, monthlySales: 100000, monthsTrading: 10 }).today.eligible, false); // exactly 1,000,000 is outside

// ── 4. Cross-check boundary and consent ────────────────────────────────────
// crossCheck exactly 1.25 x declared is NOT higher; one shilling more is.
r = calculateTaxAssessment({ ...base, monthlySales: 80000, mobileInflowMonthly: 100000, nonBusinessShare: 0 });
eq(r.usedCrossCheck, false);
r = calculateTaxAssessment({ ...base, monthlySales: 80000, mobileInflowMonthly: 100001, nonBusinessShare: 0 });
eq(r.usedCrossCheck, true);
// Withholding consent ignores the inflows completely and never raises the assessment.
const withInflows = calculateTaxAssessment({ ...base, monthlySales: 30000, mobileInflowMonthly: 500000, nonBusinessShare: 0 });
const noConsent = calculateTaxAssessment({ ...base, monthlySales: 30000, mobileInflowMonthly: 500000, nonBusinessShare: 0, shareMobileData: false });
eq(noConsent.assessedMonthly, 30000);
ok(noConsent.tax <= withInflows.tax);
eq(noConsent.provisional, true);
// Fractional inflows still give whole-shilling figures that add up.
r = calculateTaxAssessment({ ...base, monthlySales: 10000, mobileInflowMonthly: 12345, nonBusinessShare: 0.15 });
eq(r.crossCheckMonthly, 10493);
eq(r.annualTurnover, r.assessedMonthly * r.months);

// ── 5. Allowance caps and edge cases ───────────────────────────────────────
r = calculateTaxAssessment({ ...base, businessLoanMonthly: 1000000, equipmentAnnual: 1e9 });
ok(r.loanAllowance <= r.annualTurnover * 0.2 + 1);
ok(r.assessedIncome >= 0);
// Highest-cost business with every allowance maxed out still adds up and never goes negative.
r = calculateTaxAssessment({ ...base, businessType: 'KIOSK', businessLoanMonthly: 1e7, equipmentAnnual: 1e9 });
eq(r.annualTurnover - r.costAllowance - r.loanAllowance - r.equipmentAllowance, r.assessedIncome);
ok(r.assessedIncome >= 0);
// Bad or missing input does not throw or go negative.
r = calculateTaxAssessment({ businessType: 'NOPE', monthlySales: -5, monthsTrading: 99 });
eq(r.months, 12); eq(r.tax, 0); eq(r.assessedIncome, 0);
r = calculateTaxAssessment({});
eq(r.tax, 0);
ok(r.flags.some((f) => f.code === 'NO_SALES'));
r = calculateTaxAssessment({ ...base, monthlySales: 'abc', monthsTrading: '', mobileInflowMonthly: NaN });
ok(Number.isFinite(r.tax));
eq(calculateTaxAssessment({ ...base, monthsTrading: 0 }).months, 12);
eq(calculateTaxAssessment({ ...base, monthsTrading: 1 }).months, 1);

// ── 6. Property checks over many random inputs ─────────────────────────────
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const types = TAX_BUSINESS_TYPES.map((t) => t.id);
for (let i = 0; i < 20000; i++) {
  const input = {
    businessType: types[Math.floor(rnd() * types.length)],
    monthlySales: Math.round(rnd() * 3000000),
    monthsTrading: 1 + Math.floor(rnd() * 12),
    shareMobileData: rnd() > 0.3,
    mobileInflowMonthly: Math.round(rnd() * 4000000),
    nonBusinessShare: Math.round(rnd() * 90) / 100,
    businessLoanMonthly: Math.round(rnd() * 500000),
    equipmentAnnual: Math.round(rnd() * 3000000),
    channelChanges: Math.floor(rnd() * 8),
  };
  const x = calculateTaxAssessment(input);
  const s = Object.fromEntries(x.steps.map((st) => [st.key, st.amount]));
  assert.ok(Number.isInteger(x.tax) && x.tax >= 0, 'tax is a non-negative whole number');
  assert.ok(Number.isInteger(x.assessedIncome) && x.assessedIncome >= 0, 'income is a non-negative whole number');
  // The receipt adds up, line by line.
  assert.equal(s.sales - s.costs - s.loan - s.equip, s.income, 'income line adds up');
  assert.equal(x.bandLines.reduce((a, b) => a + b.tax, 0), s.gross, 'band lines add up');
  assert.equal(s.gross - s.relief, s.tax, 'tax line adds up');
  assert.ok(s.relief <= 28800 && s.relief <= s.gross, 'relief within limits');
  assert.equal(x.annualTurnover, x.assessedMonthly * x.months, 'turnover = monthly x months');
  // Likely range brackets the estimate.
  assert.ok(x.taxLow <= x.tax && x.tax <= x.taxHigh, 'range brackets the estimate');
  // Turnover tax matches the rule.
  const elig = x.annualTurnover > 1000000 && x.annualTurnover <= 25000000;
  assert.equal(x.today.eligible, elig);
  assert.equal(x.today.tax, elig ? Math.round(x.annualTurnover * 0.015) : null);
  // Tax can never exceed what the same assessed income would pay with no relief.
  assert.ok(x.tax <= x.grossTax);
  // Withholding consent can never increase the assessment.
  const nc = calculateTaxAssessment({ ...input, shareMobileData: false });
  assert.ok(nc.assessedMonthly <= Math.max(x.assessedMonthly, Math.round(input.monthlySales)), 'no consent never raises sales');
  checks += 11;
}

// Monotonic: more declared sales never means less tax (everything else equal, no cross-check).
for (const t of types) {
  let prev = -1;
  for (let sales = 0; sales <= 3000000; sales += 25000) {
    const y = calculateTaxAssessment({ ...base, businessType: t, shareMobileData: false, monthlySales: sales });
    assert.ok(y.tax >= prev, `monotonic for ${t} at ${sales}`);
    prev = y.tax;
    checks++;
  }
}


// ── 7. Records option ──────────────────────────────────────────────────────
// Kiosk with records: 1,800,000 - 1,440,000 (120,000 x 12) - 36,000 - 12,000 = 312,000.
const rec = { ...base, keepsRecords: true, actualCostsMonthly: 120000, asOf: '2026-10-23' };
r = calculateTaxAssessment(rec);
eq(r.usesRecords, true);
eq(r.costAllowance, 1440000);
eq(r.assessedIncome, 312000);
eq(r.grossTax, 28800 + 24000 * 0.25);  // 34,800
eq(r.tax, 6000);
ok(!r.flags.some((f) => f.code === 'COSTS_ABOVE_TYPICAL'));        // 80% is below 85% + 15 points
ok(r.flags.some((f) => f.code === 'COSTS_FROM_RECORDS'));
eq(calculateTaxAssessment(preset('Kiosk owner who keeps records')).tax, 6000);   // preset matches the hand figure
// Records ticked but no amount: falls back to the typical ratio.
r = calculateTaxAssessment({ ...base, keepsRecords: true, actualCostsMonthly: 0 });
eq(r.usesRecords, false); eq(r.costAllowance, 1530000);
// Amount entered but box not ticked: typical ratio still used.
eq(calculateTaxAssessment({ ...base, keepsRecords: false, actualCostsMonthly: 120000 }).usesRecords, false);
// Costs above sales are capped at turnover, income is never negative, and the review flag appears.
r = calculateTaxAssessment({ ...base, keepsRecords: true, actualCostsMonthly: 500000 });
eq(r.costAllowance, r.annualTurnover); eq(r.assessedIncome, 0); eq(r.tax, 0);
ok(!r.flags.some((f) => f.code === 'COSTS_ABOVE_TYPICAL'));      // kiosk: 100% is exactly 85% + 15 points, not above
r = calculateTaxAssessment({ ...base, businessType: 'SALON', keepsRecords: true, actualCostsMonthly: 500000 });
eq(r.costAllowance, r.annualTurnover); eq(r.assessedIncome, 0);
ok(r.flags.some((f) => f.code === 'COSTS_ABOVE_TYPICAL'));
// Review margin: salon typical 45%, records at 60% is exactly 15 points above (no flag), 61% is above (flag).
const salonRec = (monthlyCosts) => calculateTaxAssessment({ ...base, businessType: 'SALON', keepsRecords: true, actualCostsMonthly: monthlyCosts });
ok(!salonRec(90000).flags.some((f) => f.code === 'COSTS_ABOVE_TYPICAL'));
ok(salonRec(91000).flags.some((f) => f.code === 'COSTS_ABOVE_TYPICAL'));

// ── 8. Officer override ────────────────────────────────────────────────────
const ov = (o, extra = {}) => calculateTaxAssessment({ ...base, asOf: '2026-10-23', ...extra, override: { monthlySales: 160000, reasonCode: 'SITE_VISIT', evidenceRef: 'VR-001', ...o } });
const plain = calculateTaxAssessment({ ...base, asOf: '2026-10-23' });
eq(plain.override, null);
eq(plain.systemMonthly, 150000);
// Small change, applied at once.
r = ov({});
eq(r.override.status, 'APPLIED'); eq(r.assessedMonthly, 160000); eq(r.override.systemMonthly, 150000);
eq(r.override.overrideMonthly, 160000); eq(r.override.resultingTax, r.tax);
ok(Math.abs(r.override.changePct - 10000 / 150000) < 1e-12);
ok(r.flags.some((f) => f.code === 'OVERRIDE_APPLIED'));
eq(r.annualTurnover, 160000 * 12);
// Exactly 25% needs no second officer, one shilling more does.
eq(ov({ monthlySales: 187500 }).override.requiresSecondApproval, false);
eq(ov({ monthlySales: 187501 }).override.requiresSecondApproval, true);
eq(ov({ monthlySales: 112500 }).override.requiresSecondApproval, false);   // -25%
eq(ov({ monthlySales: 112499 }).override.requiresSecondApproval, true);
// Big change without a second officer: pending, the system estimate stands, tax unchanged.
r = ov({ monthlySales: 200000 });
eq(r.override.status, 'PENDING_SECOND_APPROVAL'); eq(r.assessedMonthly, 150000); eq(r.tax, plain.tax);
eq(r.annualTurnover, plain.annualTurnover);
ok(r.flags.some((f) => f.code === 'OVERRIDE_PENDING')); eq(r.override.sampledForAudit, true);
// Blank or whitespace second officer does not count.
eq(ov({ monthlySales: 200000, secondApprover: '   ' }).override.status, 'PENDING_SECOND_APPROVAL');
// With a second officer it is applied and always sampled for audit.
r = ov({ monthlySales: 200000, secondApprover: 'OFFICER-2' });
eq(r.override.status, 'APPLIED'); eq(r.assessedMonthly, 200000); eq(r.override.sampledForAudit, true);
eq(r.override.secondApprover, 'OFFICER-2');
// Cutting sales sharply also needs a second officer (guards against shaving, not only inflating).
eq(ov({ monthlySales: 30000 }).override.status, 'PENDING_SECOND_APPROVAL');
eq(ov({ monthlySales: 0, secondApprover: 'OFFICER-2' }).annualTurnover, 0);
// Missing or invalid parts are rejected, the system estimate stands, and nothing is logged.
for (const bad of [{ evidenceRef: '' }, { evidenceRef: 'ab' }, { evidenceRef: '   ' }, { reasonCode: 'BECAUSE' }, { reasonCode: '' }, { monthlySales: -1 }, { monthlySales: 'abc' }, { monthlySales: NaN }]) {
  r = ov(bad);
  eq(r.override, null, `rejected ${JSON.stringify(bad)}`); eq(r.tax, plain.tax);
  ok(r.flags.some((f) => f.code === 'OVERRIDE_REJECTED'));
}
// Every listed reason code is accepted.
for (const reason of OVERRIDE_REASONS) eq(ov({ reasonCode: reason.code }).override.reasonCode, reason.code);
// Site visit clears the provisional status and the verification date; other reasons do not.
const seasonal = preset('Seasonal produce seller, no records');
const sv = (code) => calculateTaxAssessment({ ...seasonal, asOf: '2026-10-23', override: { monthlySales: 42000, reasonCode: code, evidenceRef: 'VR-777' } });
eq(sv('SITE_VISIT').provisional, false); eq(sv('SITE_VISIT').verifyBy, null);
eq(sv('DOCUMENTS_SEEN').provisional, true);
// Audit sampling is deterministic and close to one in five across many small changes.
let sampled = 0;
for (let i = 0; i < 2000; i++) {
  const a = ov({ monthlySales: 150000 + (i % 30), evidenceRef: `DOC-${i}` }).override;
  const b = ov({ monthlySales: 150000 + (i % 30), evidenceRef: `DOC-${i}` }).override;
  eq(a.sampledForAudit, b.sampledForAudit);
  if (a.sampledForAudit) sampled++;
}
ok(sampled / 2000 > 0.15 && sampled / 2000 < 0.25, `audit share ${sampled / 2000}`);
// Override never changes the system estimate or the "tax today" rule inputs.
eq(ov({ monthlySales: 160000 }).systemMonthly, 150000);

// ── 9. Validity dates, verification date, instalments ──────────────────────
eq(addMonthsIso('2026-10-23', 12), '2027-10-23');
eq(addMonthsIso('2026-01-31', 1), '2026-02-28');
eq(addMonthsIso('2024-01-31', 1), '2024-02-29');   // leap year
eq(addMonthsIso('2024-02-29', 12), '2025-02-28');  // leap day plus a year clamps
eq(addMonthsIso('2026-11-30', 3), '2027-02-28');
eq(addMonthsIso('2026-12-15', 1), '2027-01-15');
eq(addMonthsIso('2026-03-31', -1), '2026-02-28');
eq(addDaysIso('2026-10-23', 90), '2027-01-21');
eq(addDaysIso('2024-02-28', 1), '2024-02-29');
eq(addDaysIso('2023-12-31', 1), '2024-01-01');
eq(addDaysIso('2026-10-23', 0), '2026-10-23');
r = calculateTaxAssessment({ ...base, asOf: '2024-02-29' });
eq(r.validUntil, '2025-02-28'); eq(r.asOf, '2024-02-29');
r = calculateTaxAssessment({ ...base, asOf: '2026-10-23' });
eq(r.validUntil, '2027-10-23'); eq(r.verifyBy, null);                 // not provisional
eq(calculateTaxAssessment({ ...seasonal, asOf: '2026-10-23' }).verifyBy, '2027-01-21');   // 90 days
ok(/^\d{4}-\d{2}-\d{2}$/.test(calculateTaxAssessment({ ...base, asOf: 'not a date' }).validUntil));  // bad date falls back safely
ok(/^\d{4}-\d{2}-\d{2}$/.test(calculateTaxAssessment({ ...base, asOf: '2026-02-31' }).validUntil));
eq(r.appealTargetDays, 30);
eq(instalmentPlan(10, 4).join(','), '3,3,2,2');
eq(instalmentPlan(0, 4).join(','), '0,0,0,0');
eq(instalmentPlan(6000, 4).join(','), '1500,1500,1500,1500');
eq(instalmentPlan(100, 12).filter((x) => x === 9).length, 4);
eq(instalmentPlan(100, 12).filter((x) => x === 8).length, 8);
eq(instalmentPlan(5, 0).length, 1);          // a zero count falls back to one payment
eq(instalmentPlan(-50, 4).join(','), '0,0,0,0');
for (let t = 0; t <= 3000; t += 7) for (const n of [1, 4, 12]) {
  const pl = instalmentPlan(t, n);
  eq(pl.reduce((a, b) => a + b, 0), t); eq(pl.length, n);
  ok(Math.max(...pl) - Math.min(...pl) <= 1);
}
r = calculateTaxAssessment({ ...preset('Salon, higher margin'), asOf: '2026-10-23' });
eq(r.totalOwed, 191200);
eq(r.plans.once.join(','), '191200'); eq(r.plans.quarterly.join(','), '47800,47800,47800,47800');
eq(r.plans.monthly.reduce((a, b) => a + b, 0), 191200);
eq(calculateTaxAssessment({ ...base, asOf: '2026-10-23' }).totalOwed, 0);   // nil return

// ── 10. Random property checks with the new inputs ─────────────────────────
for (let i = 0; i < 20000; i++) {
  const input = {
    businessType: types[Math.floor(rnd() * types.length)],
    monthlySales: Math.round(rnd() * 3000000), monthsTrading: 1 + Math.floor(rnd() * 12),
    shareMobileData: rnd() > 0.3, mobileInflowMonthly: Math.round(rnd() * 4000000), nonBusinessShare: Math.round(rnd() * 90) / 100,
    businessLoanMonthly: Math.round(rnd() * 500000), equipmentAnnual: Math.round(rnd() * 3000000), channelChanges: Math.floor(rnd() * 8),
    keepsRecords: rnd() > 0.5, actualCostsMonthly: Math.round(rnd() * 3500000), asOf: '2026-10-23',
    override: rnd() > 0.5 ? { monthlySales: Math.round(rnd() * 4000000), reasonCode: OVERRIDE_REASONS[Math.floor(rnd() * 5)].code, evidenceRef: `E-${i}`, secondApprover: rnd() > 0.5 ? 'OFFICER-2' : '' } : undefined,
  };
  const x = calculateTaxAssessment(input);
  const s = Object.fromEntries(x.steps.map((st) => [st.key, st.amount]));
  assert.equal(s.sales - s.costs - s.loan - s.equip, s.income, 'income line adds up (records/override)');
  assert.ok(x.costAllowance <= x.annualTurnover && x.assessedIncome >= 0 && Number.isInteger(x.tax) && x.tax >= 0);
  assert.equal(s.gross - s.relief, s.tax);
  assert.equal(x.totalOwed, x.tax);
  for (const k of ['once', 'quarterly', 'monthly']) assert.equal(x.plans[k].reduce((a, b) => a + b, 0), x.tax, 'instalments sum to tax');
  assert.ok(x.taxLow <= x.tax && x.tax <= x.taxHigh, 'range brackets the estimate (records/override)');
  assert.equal(x.annualTurnover, x.assessedMonthly * x.months);
  if (x.override) {
    assert.ok(x.override.status === 'APPLIED' || x.assessedMonthly === x.systemMonthly, 'pending override leaves the system estimate');
    if (x.override.status === 'APPLIED') assert.equal(x.assessedMonthly, x.override.overrideMonthly);
    assert.equal(x.override.resultingTax, x.tax);
    if (x.override.requiresSecondApproval) assert.equal(x.override.sampledForAudit, true);
  } else assert.equal(x.assessedMonthly, x.systemMonthly);
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(x.validUntil) && x.validUntil > x.asOf);
  assert.equal(x.verifyBy !== null, x.provisional);
  checks += 12;
}

// ── 11. Fairness check on synthetic traders ────────────────────────────────
const f1 = runTaxFairnessCheck({ n: 1500, seed: 3, costNoise: 0.1 });
const f2 = runTaxFairnessCheck({ n: 1500, seed: 3, costNoise: 0.1 });
assert.deepEqual(f1, f2); checks++;                                     // same seed, same result
ok(JSON.stringify(f1) !== JSON.stringify(runTaxFairnessCheck({ n: 1500, seed: 4, costNoise: 0.1 })));
eq(f1.overall.n, 1500);
eq(f1.byType.reduce((a, t) => a + t.n, 0), 1500);
eq(f1.byType.length, TAX_BUSINESS_TYPES.length);
for (const group of [f1.overall, ...f1.byType]) {
  for (const key of ['shareOutsideTot', 'shareOver20Tot', 'shareOver20Bench', 'shareOverAssessed', 'shareUnderAssessed']) {
    if (group[key] !== null) ok(group[key] >= 0 && group[key] <= 1, `${key} is a share`);
  }
  for (const key of ['medianBurdenTot', 'medianBurdenBench']) if (group[key] !== null) ok(group[key] >= 0 && Number.isFinite(group[key]));
}
// With no cost noise the benchmark equals the truth, so nobody is over- or under-assessed.
const f0 = runTaxFairnessCheck({ n: 1000, seed: 9, costNoise: 0 });
eq(f0.overall.shareOverAssessed, 0); eq(f0.overall.shareUnderAssessed, 0);
// More noise means more mistakes by the benchmark.
const fHi = runTaxFairnessCheck({ n: 1500, seed: 3, costNoise: 0.2 });
ok(fHi.overall.shareOverAssessed + fHi.overall.shareUnderAssessed > f1.overall.shareOverAssessed + f1.overall.shareUnderAssessed);
// Defaults run and an empty call does not throw.
ok(runTaxFairnessCheck().overall.n === 2000);

// ── 12. Calibration ────────────────────────────────────────────────────────
const mk = (type, n, ratio) => Array.from({ length: n }, () => ({ businessType: type, sales: 1000, costs: 1000 * ratio }));
let cal = calibrateCostRatios([...mk('KIOSK', 40, 0.8), ...mk('salon', 29, 0.4), ...mk('BODA', 30, 1.5)]);
const calType = (id) => cal.byType.find((t) => t.id === id);
eq(calType('KIOSK').n, 40); eq(calType('KIOSK').median, 0.8); eq(calType('KIOSK').suggestion, 0.8); eq(calType('KIOSK').enoughData, true);
eq(calType('SALON').n, 29); eq(calType('SALON').suggestion, null); eq(calType('SALON').enoughData, false);   // 29 rows is too few, lower-case type accepted
eq(calType('BODA').suggestion, 0.99); eq(calType('BODA').shareLoss, 1);                                       // capped at 99%
eq(calType('ARTISAN').n, 0); eq(calType('ARTISAN').median, null);
cal = calibrateCostRatios([{ businessType: 'KIOSK', sales: 0, costs: 5 }, { businessType: 'KIOSK', sales: 100, costs: -1 }, { businessType: 'KIOSK', sales: 'x', costs: 1 }, { businessType: 'TAXI', sales: 100, costs: 50 }, { businessType: '', sales: 100, costs: 50 }, { businessType: 'KIOSK', sales: 100, costs: 0 }]);
eq(cal.badRows, 3); ok(cal.unknownTypes.includes('TAXI') && cal.unknownTypes.includes('(blank)')); eq(calType('KIOSK').n, 1);
// Quartiles on a known spread: ratios 0.1..0.9 in steps of 0.1 -> median 0.5, p25 0.3, p75 0.7.
cal = calibrateCostRatios(Array.from({ length: 9 }, (_, i) => ({ businessType: 'FOOD', sales: 10, costs: i + 1 })), { minRows: 5 });
ok(Math.abs(calType('FOOD').median - 0.5) < 1e-12 && Math.abs(calType('FOOD').p25 - 0.3) < 1e-12 && Math.abs(calType('FOOD').p75 - 0.7) < 1e-12);
eq(calType('FOOD').suggestion, 0.5);
// CSV parsing: comments skipped, CRLF handled, column order free, bad header throws.
const parsed = parseCalibrationCsv('# note\r\ncosts,sales,businessType\r\n50,100,KIOSK\r\n\r\n# another\r\n30,100,SALON\r\n');
eq(parsed.length, 2); eq(parsed[0].businessType, 'KIOSK'); eq(parsed[0].costs, '50'); eq(parsed[1].sales, '100');
assert.throws(() => parseCalibrationCsv('type,sales,costs\nKIOSK,1,1')); checks++;
eq(parseCalibrationCsv('').length, 0);
checks++;

console.log(`Tax Mode checks passed (${checks} assertions).`);
