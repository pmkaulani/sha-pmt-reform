// ─────────────────────────────────────────────────────────────────────────────
// TAX MODE (CONCEPT) — informal-sector income assessment
//
// Same idea as the SHA engine: estimate income, take off the costs a person
// cannot avoid, apply the tax rules, and explain every step on a receipt.
//
// WHAT COMES FROM LAW AND WHAT IS A PLACEHOLDER
//
//   From Kenyan tax rules (confirm against kra.go.ke before relying on them;
//   the rules can change with each Finance Act):
//     * Turnover tax: 1.5% of gross sales (effective 19 March 2024), no expenses
//       allowed, applies to annual turnover above KSh 1,000,000 and up to
//       KSh 25,000,000. Source: KRA, "Everything About Turnover Tax", revised
//       October 2024. It was 3% from 1 July 2023 to March 2024 (KRA's earlier
//       "Unpacking Turnover Tax" publication), so older guides show 3%.
//     * Resident individual income tax bands (10% / 25% / 30% / 32.5% / 35%)
//       and personal relief of KSh 28,800 a year (KSh 2,400 a month).
//       Source: Finance Act 2023 rates as published by KRA and tax guides.
//       Not re-checked against the Finance Act 2026 text.
//
//   Illustrative PLACEHOLDERS chosen for the demo (not from KRA, the Income Tax
//   Act or any sector survey):
//     * cost ratios by business type, the loan and equipment caps, the
//       cross-check tolerance and the payment-channel review threshold.
//
// Not validated on real data. Not endorsed by KRA. Not tax advice.
// ─────────────────────────────────────────────────────────────────────────────

export const TAX_BUSINESS_TYPES = [
  { id: 'KIOSK', label: 'Kiosk / small shop', costRatio: 0.85 },
  { id: 'GREENGROCER', label: 'Fruit and vegetable seller (mama mboga)', costRatio: 0.80 },
  { id: 'FOOD', label: 'Food vendor / small eatery', costRatio: 0.70 },
  { id: 'FARM_PRODUCE', label: 'Farm produce seller', costRatio: 0.65 },
  { id: 'BODA', label: 'Boda boda rider', costRatio: 0.55 },
  { id: 'ARTISAN', label: 'Tailor / artisan / fundi', costRatio: 0.50 },
  { id: 'SALON', label: 'Salon / barber', costRatio: 0.45 },
];

// Resident individual rates, annual bands (width = amount taxed at that rate).
export const TAX_BANDS = [
  { rate: 0.10, width: 288000 },
  { rate: 0.25, width: 100000 },
  { rate: 0.30, width: 5612000 },
  { rate: 0.325, width: 3600000 },
  { rate: 0.35, width: Infinity },
];

export const TAX_DEFAULT_PARAMS = {
  // Law (confirm current):
  turnoverRate: 0.015,
  turnoverMin: 1000000,
  turnoverMax: 25000000,
  bands: TAX_BANDS,
  personalRelief: 28800,
  // Placeholders:
  crossCheckTolerance: 0.25, // inflows may exceed declared sales by this much before the higher figure is used
  loanCapShare: 0.20,        // business-loan allowance capped at this share of annual sales
  equipmentCapShare: 0.10,   // tools-of-trade allowance capped at this share of annual sales
  channelChangeReview: 3,    // till/paybill changes in 12 months that trigger an officer review (no penalty)
  recordsReviewMargin: 0.15, // costs from records this far above the typical ratio prompt an officer to ask for the records
  overrideSecondApprovalShare: 0.25, // officer changes to sales above this share need a second officer
  auditSampleEvery: 5,       // one in N other overrides is sampled for audit
  validityMonths: 12,        // an assessment is valid for this long, then refreshed from actual records
  verifyDays: 90,            // provisional assessments are verified within this many days
  appealTargetDays: 30,      // proposed target for deciding a challenge
};

export const OVERRIDE_REASONS = [
  { code: 'SITE_VISIT', label: 'Site visit' },
  { code: 'DOCUMENTS_SEEN', label: 'Documents seen' },
  { code: 'UNREPORTED_SALES_EVIDENCE', label: 'Evidence of unreported sales' },
  { code: 'SEASONAL_CORRECTION', label: 'Seasonal correction' },
  { code: 'DATA_ERROR', label: 'Data error' },
];

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ── dates (UTC, ISO yyyy-mm-dd) ──────────────────────────────────────────────
const isoToday = () => new Date().toISOString().slice(0, 10);
function parseIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  const base = m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null;
  if (!base || new Date(Date.UTC(base.y, base.mo, base.d)).getUTCMonth() !== base.mo) {
    const t = new Date();
    return { y: t.getUTCFullYear(), mo: t.getUTCMonth(), d: t.getUTCDate() };
  }
  return base;
}
const fmtIso = (y, mo, d) => new Date(Date.UTC(y, mo, d)).toISOString().slice(0, 10);
export function addMonthsIso(iso, n) {
  const { y, mo, d } = parseIso(iso);
  const dim = new Date(Date.UTC(y, mo + n + 1, 0)).getUTCDate(); // days in target month
  return fmtIso(y, mo + n, Math.min(d, dim));
}
export function addDaysIso(iso, n) {
  const { y, mo, d } = parseIso(iso);
  return fmtIso(y, mo, d + n);
}

// Split a yearly amount into equal whole-shilling instalments that add up exactly.
export function instalmentPlan(total, count) {
  const t = Math.max(0, Math.round(total));
  const n = Math.max(1, Math.round(count));
  const base = Math.floor(t / n);
  const extra = t - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

function stableHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

export const TAX_PRESETS = [
  {
    name: 'Kiosk owner, full year',
    description: 'Steady sales, shares mobile-money records, one till. Low margin.',
    inputs: { businessType: 'KIOSK', monthlySales: 150000, monthsTrading: 12, shareMobileData: true, mobileInflowMonthly: 155000, nonBusinessShare: 0.1, businessLoanMonthly: 3000, equipmentAnnual: 12000, channelChanges: 0 },
  },
  {
    name: 'Salon, higher margin',
    description: 'Same sales as the kiosk, but far lower costs.',
    inputs: { businessType: 'SALON', monthlySales: 150000, monthsTrading: 12, shareMobileData: true, mobileInflowMonthly: 155000, nonBusinessShare: 0.1, businessLoanMonthly: 3000, equipmentAnnual: 12000, channelChanges: 0 },
  },
  {
    name: 'Kiosk owner who keeps records',
    description: 'Same sales as the kiosk, but costs come from the trader’s own records instead of the typical ratio.',
    inputs: { businessType: 'KIOSK', monthlySales: 150000, monthsTrading: 12, shareMobileData: true, mobileInflowMonthly: 155000, nonBusinessShare: 0.1, businessLoanMonthly: 3000, equipmentAnnual: 12000, channelChanges: 0, keepsRecords: true, actualCostsMonthly: 120000 },
  },
  {
    name: 'Seasonal produce seller, no records',
    description: 'Trades six months a year, cash only, shares no mobile-money records.',
    inputs: { businessType: 'FARM_PRODUCE', monthlySales: 40000, monthsTrading: 6, shareMobileData: false, mobileInflowMonthly: 0, nonBusinessShare: 0.2, businessLoanMonthly: 0, equipmentAnnual: 0, channelChanges: 0 },
  },
  {
    name: 'Trader who switched tills',
    description: 'Declared sales are well below mobile-money inflows, and the payment channel changed four times.',
    inputs: { businessType: 'FOOD', monthlySales: 60000, monthsTrading: 12, shareMobileData: true, mobileInflowMonthly: 140000, nonBusinessShare: 0.2, businessLoanMonthly: 2000, equipmentAnnual: 0, channelChanges: 4 },
  },
];

export const TAX_DEFAULT_INPUTS = { ...TAX_PRESETS[0].inputs };

// Graduated tax on an annual assessed income. Each band's tax is rounded to
// whole shillings and the rounded amounts are summed, so the receipt adds up.
export function applyBands(income, bands = TAX_BANDS) {
  let remaining = Math.max(0, Math.round(income));
  const lines = [];
  let gross = 0;
  for (const b of bands) {
    if (remaining <= 0) break;
    const amount = Math.min(remaining, b.width);
    const tax = Math.round(amount * b.rate);
    lines.push({ rate: b.rate, amount, tax });
    gross += tax;
    remaining -= amount;
  }
  return { lines, gross };
}

function assess(monthlySales, months, type, input, p, recordsAnnualCosts = null) {
  const annualTurnover = monthlySales * months;
  // Costs: the trader's own records when provided, otherwise the typical ratio for the business type.
  const costAllowance = recordsAnnualCosts !== null
    ? Math.min(annualTurnover, Math.round(recordsAnnualCosts))
    : Math.round(annualTurnover * type.costRatio);
  // Allowances are applied in order and can never take assessed income below zero,
  // so the receipt always adds up.
  const loanRaw = Math.round(num(input.businessLoanMonthly) * months);
  const loanCap = Math.round(annualTurnover * p.loanCapShare);
  const loanAllowance = Math.max(0, Math.min(loanRaw, loanCap, annualTurnover - costAllowance));
  const equipRaw = Math.round(num(input.equipmentAnnual));
  const equipCap = Math.round(annualTurnover * p.equipmentCapShare);
  const equipmentAllowance = Math.max(0, Math.min(equipRaw, equipCap, annualTurnover - costAllowance - loanAllowance));
  const assessedIncome = annualTurnover - costAllowance - loanAllowance - equipmentAllowance;
  const { lines, gross } = applyBands(assessedIncome, p.bands);
  const relief = Math.min(gross, p.personalRelief);
  const tax = gross - relief;
  return { annualTurnover, costAllowance, loanRaw, loanCap, loanAllowance, equipRaw, equipCap, equipmentAllowance, assessedIncome, bandLines: lines, grossTax: gross, relief, tax };
}

export function calculateTaxAssessment(input, paramsIn = {}) {
  const p = { ...TAX_DEFAULT_PARAMS, ...paramsIn };
  const type = TAX_BUSINESS_TYPES.find((t) => t.id === input.businessType) || TAX_BUSINESS_TYPES[0];
  const months = Math.round(clamp(num(input.monthsTrading) || 12, 1, 12));
  const declared = Math.round(num(input.monthlySales));
  const asOf = input.asOf ? fmtIso(parseIso(input.asOf).y, parseIso(input.asOf).mo, parseIso(input.asOf).d) : isoToday();
  const flags = [];

  // 1. Estimate monthly sales ---------------------------------------------------
  const inflow = input.shareMobileData ? Math.round(num(input.mobileInflowMonthly)) : 0;
  const nonBusinessShare = clamp(Number(input.nonBusinessShare) || 0, 0, 0.9);
  const crossCheck = inflow > 0 ? Math.round(inflow * (1 - nonBusinessShare)) : 0;
  const haveCrossCheck = crossCheck > 0;
  const crossCheckHigher = haveCrossCheck && crossCheck > declared * (1 + p.crossCheckTolerance);
  const systemMonthly = crossCheckHigher ? crossCheck : declared;
  let assessedMonthly = systemMonthly;

  if (declared === 0 && !haveCrossCheck) {
    flags.push({ code: 'NO_SALES', level: 'info', text: 'No sales declared and no records to cross-check, so there is nothing to assess yet.' });
  }
  if (crossCheckHigher) {
    flags.push({ code: 'INFLOWS_ABOVE_DECLARED', level: 'review',
      text: 'Mobile-money inflows suggest higher sales than declared, so the cross-checked figure was used. If part of that money was not business income, raise the non-business share and the assessment corrects itself.' });
  }
  const channelChanges = Math.round(num(input.channelChanges));
  if (channelChanges >= p.channelChangeReview) {
    flags.push({ code: 'CHANNEL_CHANGES', level: 'review',
      text: `Payment channel (till or paybill) changed ${channelChanges} times in 12 months. Routed to an officer for review. The algorithm applies no penalty.` });
  }
  let provisional = !haveCrossCheck && declared > 0;
  if (!input.shareMobileData) {
    flags.push({ code: 'CONSENT_WITHHELD', level: 'info',
      text: 'Mobile-money records not shared. That is the trader’s right under the Data Protection Act, and no penalty is applied. The assessment is provisional until a field officer verifies it.' });
  } else if (inflow === 0 && declared > 0) {
    flags.push({ code: 'NO_RECORDS', level: 'info',
      text: 'No mobile-money records available. The assessment is provisional until a field officer verifies it.' });
  }

  // 1b. Officer override: needs a reason code and an evidence reference, is always logged,
  //     and a change above the threshold needs a second officer before it takes effect.
  let override = null;
  if (input.override && typeof input.override === 'object') {
    const o = input.override;
    const reason = OVERRIDE_REASONS.find((r) => r.code === o.reasonCode);
    const evidenceRef = String(o.evidenceRef || '').trim();
    const value = Number(o.monthlySales);
    const missing = [];
    if (!Number.isFinite(value) || value < 0) missing.push('a sales figure');
    if (!reason) missing.push('a reason code');
    if (evidenceRef.length < 3) missing.push('an evidence reference');
    if (missing.length) {
      flags.push({ code: 'OVERRIDE_REJECTED', level: 'review', text: `Officer override not applied: it needs ${missing.join(', ')}.` });
    } else {
      const overrideMonthly = Math.round(value);
      const changePct = systemMonthly > 0 ? (overrideMonthly - systemMonthly) / systemMonthly : (overrideMonthly > 0 ? 1 : 0);
      const requiresSecondApproval = Math.abs(changePct) > p.overrideSecondApprovalShare;
      const secondApprover = String(o.secondApprover || '').trim();
      const approved = !requiresSecondApproval || secondApprover.length > 0;
      const sampledForAudit = requiresSecondApproval || stableHash(`${evidenceRef}:${overrideMonthly}`) % p.auditSampleEvery === 0;
      override = {
        officerId: String(o.officerId || 'OFFICER-DEMO'), at: o.at || asOf, reasonCode: reason.code, reasonLabel: reason.label, evidenceRef,
        systemMonthly, overrideMonthly, changePct, requiresSecondApproval, secondApprover: secondApprover || null,
        status: approved ? 'APPLIED' : 'PENDING_SECOND_APPROVAL', sampledForAudit,
      };
      if (approved) {
        assessedMonthly = overrideMonthly;
        if (reason.code === 'SITE_VISIT') provisional = false;
        flags.push({ code: 'OVERRIDE_APPLIED', level: 'review',
          text: `Officer override applied (${reason.label}, evidence ${evidenceRef}). Logged for audit${sampledForAudit ? ' and selected for audit review' : ''}.` });
      } else {
        flags.push({ code: 'OVERRIDE_PENDING', level: 'review',
          text: `Officer change of ${(changePct * 100).toFixed(0)}% to sales is above ${(p.overrideSecondApprovalShare * 100).toFixed(0)}%, so it needs a second officer’s approval before it takes effect. The system estimate stands until then.` });
      }
    }
  }

  // 2. Costs: the trader's own records when provided, otherwise the typical ratio.
  const annualCostsFromRecords = input.keepsRecords && num(input.actualCostsMonthly) > 0 ? Math.round(num(input.actualCostsMonthly)) * months : null;
  const usesRecords = annualCostsFromRecords !== null;

  // 3-4. Allowances, assessed income, tax ---------------------------------------
  const main = assess(assessedMonthly, months, type, input, p, annualCostsFromRecords);

  if (usesRecords) {
    const actualRatio = main.annualTurnover > 0 ? main.costAllowance / main.annualTurnover : 0;
    flags.push({ code: 'COSTS_FROM_RECORDS', level: 'info', text: 'Running costs were taken from the trader’s own records instead of the typical ratio for the business type.' });
    if (Math.round(actualRatio * 10000) > Math.round((type.costRatio + p.recordsReviewMargin) * 10000)) { // compared in basis points to avoid float edge cases
      flags.push({ code: 'COSTS_ABOVE_TYPICAL', level: 'review',
        text: `Costs in the records are ${Math.round(actualRatio * 100)}% of sales against ${Math.round(type.costRatio * 100)}% typical for this business. An officer will ask to see the records. No penalty is applied.` });
    }
  }

  // 5. Likely range: rerun the whole assessment with sales moved by the confidence band.
  const confidenceTier = haveCrossCheck && !crossCheckHigher && channelChanges < p.channelChangeReview ? 'HIGH' : haveCrossCheck ? 'MEDIUM' : 'LOW';
  const band = { HIGH: 0.10, MEDIUM: 0.20, LOW: 0.35 }[confidenceTier];
  const low = assess(Math.round(assessedMonthly * (1 - band)), months, type, input, p, annualCostsFromRecords);
  const high = assess(Math.round(assessedMonthly * (1 + band)), months, type, input, p, annualCostsFromRecords);
  if (override) override.resultingTax = main.tax;

  // Turnover tax today: only for annual turnover in the eligible range, no expenses allowed.
  const eligible = main.annualTurnover > p.turnoverMin && main.annualTurnover <= p.turnoverMax;
  const todayTax = eligible ? Math.round(main.annualTurnover * p.turnoverRate) : null;
  let todayNote;
  if (eligible) todayNote = `${Math.round(p.turnoverRate * 1000) / 10}% of gross sales. No expenses allowed.`;
  else if (main.annualTurnover <= p.turnoverMin) todayNote = `Not applicable: annual sales are at or below KSh ${p.turnoverMin.toLocaleString()}, so the trader is outside turnover tax.`;
  else todayNote = `Not applicable: annual sales are above KSh ${p.turnoverMax.toLocaleString()}.`;

  const costLabel = usesRecords
    ? `Your running costs, from your records (${Math.round((main.annualTurnover > 0 ? main.costAllowance / main.annualTurnover : 0) * 100)}% of sales)`
    : `Typical running costs for this kind of business (${Math.round(type.costRatio * 100)}% of sales)`;
  const steps = [
    { key: 'sales', label: `Sales assessed: KSh ${assessedMonthly.toLocaleString()} a month × ${months} month${months === 1 ? '' : 's'} trading`, amount: main.annualTurnover },
    { key: 'costs', label: costLabel, amount: main.costAllowance, minus: true },
    { key: 'loan', label: main.loanAllowance < main.loanRaw ? 'Business loan repayments (capped)' : 'Business loan repayments', amount: main.loanAllowance, minus: true },
    { key: 'equip', label: main.equipmentAllowance < main.equipRaw ? 'Tools and equipment (capped)' : 'Tools and equipment', amount: main.equipmentAllowance, minus: true },
    { key: 'income', label: 'Assessed income', amount: main.assessedIncome, strong: true },
    ...main.bandLines.map((b, i) => ({ key: `band${i}`, label: `${(b.rate * 100).toFixed(1).replace(/\.0$/, '')}% of KSh ${b.amount.toLocaleString()}`, amount: b.tax, sub: true })),
    { key: 'gross', label: 'Tax before relief', amount: main.grossTax },
    { key: 'relief', label: 'Personal relief', amount: main.relief, minus: true },
    { key: 'tax', label: 'Tax payable for the year', amount: main.tax, strong: true, total: true },
  ];

  return {
    type, months, declaredMonthly: declared, crossCheckMonthly: crossCheck, usedCrossCheck: crossCheckHigher,
    systemMonthly, assessedMonthly, annualTurnover: main.annualTurnover, usesRecords,
    costAllowance: main.costAllowance, loanAllowance: main.loanAllowance, equipmentAllowance: main.equipmentAllowance,
    assessedIncome: main.assessedIncome, bandLines: main.bandLines, grossTax: main.grossTax, relief: main.relief,
    tax: main.tax, taxLow: low.tax, taxHigh: high.tax, totalOwed: main.tax,
    plans: { once: instalmentPlan(main.tax, 1), quarterly: instalmentPlan(main.tax, 4), monthly: instalmentPlan(main.tax, 12) },
    effectiveRate: main.annualTurnover > 0 ? main.tax / main.annualTurnover : 0,
    today: { eligible, tax: todayTax, note: todayNote, effectiveRate: eligible && main.annualTurnover > 0 ? todayTax / main.annualTurnover : 0 },
    confidenceTier, provisional, flags, steps, override,
    asOf, validUntil: addMonthsIso(asOf, p.validityMonths), verifyBy: provisional ? addDaysIso(asOf, p.verifyDays) : null,
    appealTargetDays: p.appealTargetDays, params: p,
  };
}
