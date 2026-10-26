// ─────────────────────────────────────────────────────────────────────────────
// TAX MODE — fairness check on SYNTHETIC traders (concept)
//
// This shows HOW the check works. It is not evidence. The traders, their sales
// and their "true" costs are generated from the assumptions below, and the
// business cost ratios are placeholders, so the numbers describe the
// assumptions, not Kenyan traders. Replace the synthetic traders with real
// survey data (see calibrate_costs.mjs) before drawing any conclusion.
//
// Question it answers: for a trader whose real costs differ from the typical
// ratio, how much of their TRUE income do the two methods take, and how often
// does the benchmark assessment over- or under-state their income?
// ─────────────────────────────────────────────────────────────────────────────
import { TAX_BUSINESS_TYPES, TAX_DEFAULT_PARAMS, applyBands } from './TaxMode.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const taxOnIncome = (income, p) => {
  const { gross } = applyBands(income, p.bands);
  return gross - Math.min(gross, p.personalRelief);
};

export function runTaxFairnessCheck({ n = 2000, seed = 7, costNoise = 0.10 } = {}, params = {}) {
  const p = { ...TAX_DEFAULT_PARAMS, ...params };
  const r = rng(seed);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const type = TAX_BUSINESS_TYPES[Math.floor(r() * TAX_BUSINESS_TYPES.length)];
    const monthly = Math.round(Math.min(1200000, Math.max(5000, Math.exp(Math.log(60000) + 0.9 * normal(r)))));
    const months = r() < 0.7 ? 12 : 3 + Math.floor(r() * 9);
    const turnover = monthly * months;
    const trueRatio = Math.min(0.98, Math.max(0.2, type.costRatio + costNoise * normal(r)));
    const trueIncome = Math.round(turnover * (1 - trueRatio));
    const benchIncome = Math.round(turnover * (1 - type.costRatio));
    const eligible = turnover > p.turnoverMin && turnover <= p.turnoverMax;
    const tot = eligible ? Math.round(turnover * p.turnoverRate) : null;
    rows.push({
      type: type.id, turnover, trueIncome, benchIncome,
      tot, benchTax: taxOnIncome(benchIncome, p), trueTax: taxOnIncome(trueIncome, p),
      burdenTot: tot !== null && trueIncome > 0 ? tot / trueIncome : null,
      burdenBench: trueIncome > 0 ? taxOnIncome(benchIncome, p) / trueIncome : null,
    });
  }
  const summarise = (list) => {
    const eligible = list.filter((x) => x.tot !== null);
    const share = (arr, f) => (arr.length ? arr.filter(f).length / arr.length : null);
    const withIncome = list.filter((x) => x.trueIncome > 0);
    return {
      n: list.length,
      shareOutsideTot: list.length ? 1 - eligible.length / list.length : null,
      medianBurdenTot: median(eligible.filter((x) => x.burdenTot !== null).map((x) => x.burdenTot)),
      medianBurdenBench: median(withIncome.map((x) => x.burdenBench)),
      shareOver20Tot: share(eligible.filter((x) => x.burdenTot !== null), (x) => x.burdenTot > 0.2),
      shareOver20Bench: share(withIncome, (x) => x.burdenBench > 0.2),
      shareOverAssessed: share(withIncome, (x) => x.benchIncome > x.trueIncome * 1.2),
      shareUnderAssessed: share(withIncome, (x) => x.benchIncome < x.trueIncome * 0.8),
    };
  };
  return {
    n, seed, costNoise,
    overall: summarise(rows),
    byType: TAX_BUSINESS_TYPES.map((t) => ({ id: t.id, label: t.label, ...summarise(rows.filter((x) => x.type === t.id)) })),
  };
}
