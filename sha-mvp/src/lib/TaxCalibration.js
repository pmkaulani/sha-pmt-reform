// Calibrate Tax Mode's typical-cost ratios from real survey rows.
// Each row: { businessType, sales, costs } over the SAME period (monthly or annual).
// Returns per-type medians so the placeholder ratios in TaxMode.js can be replaced with evidence.
import { TAX_BUSINESS_TYPES } from './TaxMode.js';

const quantile = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

export function calibrateCostRatios(rows, { minRows = 30 } = {}) {
  const known = new Set(TAX_BUSINESS_TYPES.map((t) => t.id));
  const used = {};
  const problems = { badNumbers: 0, unknownType: new Set() };
  for (const row of rows) {
    const sales = Number(row.sales);
    const costs = Number(row.costs);
    const id = String(row.businessType || '').trim().toUpperCase();
    if (!Number.isFinite(sales) || !Number.isFinite(costs) || sales <= 0 || costs < 0) { problems.badNumbers++; continue; }
    if (!known.has(id)) { problems.unknownType.add(id || '(blank)'); continue; }
    (used[id] ||= []).push(costs / sales);
  }
  const byType = TAX_BUSINESS_TYPES.map((t) => {
    const ratios = (used[t.id] || []).sort((a, b) => a - b);
    const enough = ratios.length >= minRows;
    return {
      id: t.id, label: t.label, currentPlaceholder: t.costRatio, n: ratios.length,
      median: quantile(ratios, 0.5), p25: quantile(ratios, 0.25), p75: quantile(ratios, 0.75),
      shareLoss: ratios.length ? ratios.filter((x) => x > 1).length / ratios.length : null,
      enoughData: enough,
      suggestion: enough ? Math.round(Math.min(0.99, quantile(ratios, 0.5)) * 100) / 100 : null,
    };
  });
  return { byType, badRows: problems.badNumbers, unknownTypes: [...problems.unknownType] };
}

// Minimal CSV reader for: businessType,sales,costs (header required, no quoted commas; lines starting with # are ignored).
export function parseCalibrationCsv(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  if (!lines.length) return [];
  const head = lines[0].split(',').map((h) => h.trim());
  const ix = { businessType: head.indexOf('businessType'), sales: head.indexOf('sales'), costs: head.indexOf('costs') };
  if (Object.values(ix).some((v) => v < 0)) throw new Error('CSV header must contain: businessType,sales,costs');
  return lines.slice(1).map((l) => {
    const c = l.split(',').map((x) => x.trim());
    return { businessType: c[ix.businessType], sales: c[ix.sales], costs: c[ix.costs] };
  });
}
