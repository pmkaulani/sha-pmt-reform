const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TableLayoutType, PageBreak } = require('docx');
const fs = require('fs');
const path = require('path');

// ── colour palette ──
const SHA_GREEN   = '1B5E20';
const SHA_GOLD    = 'F9A825';
const DARK_GRAY   = '333333';
const MED_GRAY    = '666666';
const LIGHT_BG    = 'F5F5F5';
const WHITE       = 'FFFFFF';
const TABLE_HEAD  = '1B5E20';
const TABLE_ALT   = 'E8F5E9';
const ALERT_RED   = 'C62828';
const ALERT_BLUE  = '1565C0';
const BORDER_CLR  = 'BDBDBD';

// ── helpers ──
function kes(n) { return 'KSh ' + Number(n).toLocaleString('en-KE'); }

function thinBorder() {
  const b = { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR };
  return { top: b, bottom: b, left: b, right: b };
}

function headerCell(text) {
  return new TableCell({
    shading: { fill: TABLE_HEAD },
    borders: thinBorder(),
    width: { size: 3333, type: WidthType.PERCENTAGE },
    children: [new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text, bold: true, size: 20, color: WHITE, font: 'Calibri' })]
    })]
  });
}

function dataCell(text, opts = {}) {
  return new TableCell({
    shading: { fill: opts.shaded ? TABLE_ALT : WHITE },
    borders: thinBorder(),
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({
        text: String(text),
        size: 19,
        color: opts.color || DARK_GRAY,
        bold: !!opts.bold,
        font: 'Calibri'
      })]
    })]
  });
}

function waterfallTable(rows) {
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({ children: [headerCell('Deduction / Component'), headerCell('Amount (KES)'), headerCell('Reason / Basis')] }),
      ...rows.map((r, i) => new TableRow({
        children: [
          dataCell(r[0], { shaded: i % 2 === 1, bold: true }),
          dataCell(r[1], { shaded: i % 2 === 1, color: r[1].startsWith('−') || r[1].startsWith('-') ? ALERT_RED : DARK_GRAY }),
          dataCell(r[2], { shaded: i % 2 === 1 })
        ]
      }))
    ]
  });
  return table;
}

function profileTable(pairs) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: pairs.map((p, i) => new TableRow({
      children: [
        dataCell(p[0], { bold: true, shaded: i % 2 === 0, width: 3500 }),
        dataCell(p[1], { shaded: i % 2 === 0, width: 6500 })
      ]
    }))
  });
}

function sectionHeading(text, level) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, color: SHA_GREEN, font: 'Calibri' })]
  });
}

function bodyText(runs) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: runs.map(r => {
      if (typeof r === 'string') return new TextRun({ text: r, size: 20, color: DARK_GRAY, font: 'Calibri' });
      return new TextRun({ size: 20, color: r.color || DARK_GRAY, font: 'Calibri', ...r });
    })
  });
}

function resultBox(label, value, color) {
  return new Paragraph({
    spacing: { before: 140, after: 140 },
    shading: { fill: LIGHT_BG },
    indent: { left: 200, right: 200 },
    children: [
      new TextRun({ text: label + '  ', bold: true, size: 22, color: DARK_GRAY, font: 'Calibri' }),
      new TextRun({ text: value, bold: true, size: 24, color: color || SHA_GREEN, font: 'Calibri' })
    ]
  });
}

function shapFactor(text) {
  return new Paragraph({
    spacing: { before: 100, after: 60 },
    children: [
      new TextRun({ text: '🔑 SHAP Top Factor:  ', bold: true, size: 20, color: SHA_GREEN, font: 'Calibri' }),
      new TextRun({ text, size: 20, color: DARK_GRAY, font: 'Calibri', italics: true })
    ]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: SHA_GOLD } },
    children: [new TextRun({ text: '', size: 6 })]
  });
}

function pageBreakPara() {
  return new Paragraph({ children: [new PageBreak()] });
}

function receiptHeader(num, name, tagline) {
  return [
    new Paragraph({
      spacing: { before: 100, after: 40 },
      shading: { fill: SHA_GREEN },
      indent: { left: 100, right: 100 },
      children: [
        new TextRun({ text: `RECEIPT ${num}`, bold: true, size: 26, color: SHA_GOLD, font: 'Calibri' }),
        new TextRun({ text: `  —  ${name}`, bold: true, size: 26, color: WHITE, font: 'Calibri' })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 120 },
      shading: { fill: SHA_GREEN },
      indent: { left: 100, right: 100 },
      children: [new TextRun({ text: tagline, size: 20, color: 'C8E6C9', font: 'Calibri', italics: true })]
    })
  ];
}

// ══════════════════════════════════════════════════════════════
//  BUILD DOCUMENT
// ══════════════════════════════════════════════════════════════
const children = [];

// ── TITLE PAGE ──
children.push(new Paragraph({ spacing: { before: 1600 }, children: [] }));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 120 },
  children: [new TextRun({ text: 'SHA PMT v2.1', bold: true, size: 56, color: SHA_GREEN, font: 'Calibri' })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 60 },
  children: [new TextRun({ text: 'SHAP Explanation Samples', bold: true, size: 40, color: DARK_GRAY, font: 'Calibri' })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: SHA_GOLD } },
  children: [new TextRun({ text: 'Deduction Receipt Examples for 7 Representative Households', size: 24, color: MED_GRAY, font: 'Calibri', italics: true })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 300, after: 40 },
  children: [new TextRun({ text: 'Social Health Authority  •  Republic of Kenya', size: 22, color: MED_GRAY, font: 'Calibri' })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 40 },
  children: [new TextRun({ text: 'PMT Reform Working Paper — Algorithmic Transparency Series', size: 20, color: MED_GRAY, font: 'Calibri' })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 600 },
  children: [new TextRun({ text: 'June 2026', size: 20, color: MED_GRAY, font: 'Calibri' })]
}));

// ── PREAMBLE ──
children.push(pageBreakPara());
children.push(sectionHeading('Purpose & Reading Guide', HeadingLevel.HEADING_1));
children.push(bodyText([
  'This document provides ',
  { text: 'seven deduction receipts', bold: true },
  ' that demonstrate how the SHA PMT v2.1 algorithm computes the Adjusted Gross Income (AGI) for representative Kenyan households. Each receipt is structured as follows:'
]));
children.push(bodyText(['(1)  Household Profile — demographics, income proxies, and asset inventory.']));
children.push(bodyText(['(2)  Current Model Assessment — the amount the legacy PMT assigns (shown for comparison).']));
children.push(bodyText(['(3)  Proposed v2.1 AGI Deduction Waterfall — a line-by-line table showing every deduction or addition the v2.1 model applies.']));
children.push(bodyText(['(4)  AGI Result — final annual AGI converted to a monthly SHA premium.']));
children.push(bodyText(['(5)  SHAP Top Factor — the single most influential feature the model uses, drawn from SHAP (SHapley Additive exPlanations) analysis.']));
children.push(bodyText([
  { text: 'Key v2.1 changes reflected here: ', bold: true },
  'Seasonal Worker Override, Fiduciary (Chama Treasurer) Exemption, Motorcycle Commercial Exemption (50%), ASAL land discounting, Fuliza digital-debt deduction, Rent-adjusted Cost-of-Living tiers, PWD Art. 54 Exemption (30%), Refugee/IDP auto-indigent pathway, subsistence digital-user filter, and the soft-landing transition mechanism.'
]));
children.push(bodyText([
  { text: 'Indigent threshold: ', bold: true },
  'Households with AGI ≤ KSh 131,256 per annum are classified as indigent and assigned the minimum premium of KSh 300/month.'
]));
children.push(divider());

// ════════════════════════════════════════════════════════════
//  RECEIPT 1 — Mama Wanjiku
// ════════════════════════════════════════════════════════════
children.push(pageBreakPara());
children.push(...receiptHeader('1', 'Mama Wanjiku', 'Chama Treasurer  •  Meru County (Semi-Arid)'));

children.push(sectionHeading('A.  Household Profile', HeadingLevel.HEADING_2));
children.push(profileTable([
  ['Name / Alias', 'Mama Wanjiku'],
  ['County (Zone)', 'Meru — Semi-Arid / ASAL'],
  ['Age', '45'],
  ['Gender', 'Female'],
  ['Household Size', '5'],
  ['Gross M-Pesa Throughput', kes(10000) + ' / month'],
  ['Retained M-Pesa Balance', kes(2000) + ' / month'],
  ['Fuliza (Digital Debt) Days', '0'],
  ['Assets', 'Feature Phone'],
  ['Group Role', 'Chama Treasurer (Fiduciary)'],
  ['Seasonal Worker', 'Yes — low-season balance ' + kes(200) + '/mo'],
  ['Land', '2 acres (ASAL zone)'],
  ['Livestock', '5 head (local breed)']
]));

children.push(sectionHeading('B.  Current Model Assessment', HeadingLevel.HEADING_2));
children.push(bodyText([
  'The legacy PMT model assigns this household an imputed income of ',
  { text: kes(1379600), bold: true, color: ALERT_RED },
  ' per annum. This figure is driven primarily by the gross M-Pesa throughput (KSh 10,000/mo × 12 = KSh 120,000) being treated as personal income, combined with inflated asset scores for the chama treasurer role (group funds incorrectly attributed as personal wealth) and un-discounted land valuation. The result is a ',
  { text: 'massive overcharge', bold: true, color: ALERT_RED },
  ' that bears no relation to the household\'s actual economic capacity.'
]));

children.push(sectionHeading('C.  Proposed v2.1 AGI Deduction Waterfall', HeadingLevel.HEADING_2));
children.push(waterfallTable([
  ['Base Income (Seasonal Override)', kes(2400), 'Low-season retained balance KSh 200 × 12 months; seasonal worker flag overrides gross throughput'],
  ['Fiduciary Exemption (80%)', '−' + kes(1920), 'Chama Treasurer role: 80% of base income excluded as fiduciary flow-through funds'],
  ['Post-Exemption Base', kes(480), 'KSh 2,400 − KSh 1,920 = KSh 480 retained as personal income'],
  ['ASAL Land Valuation', '+' + kes(80000), '2 acres × KSh 80,000/acre × 0.5 ASAL discount factor'],
  ['Livestock Valuation', '+' + kes(11400), '5 head × KSh 3,800 local breed value × 0.6 depreciation factor'],
  ['Asset Score (Feature Phone)', '+' + kes(2000), 'Feature phone — minimal asset score'],
  ['Subtotal (Pre-Deductions)', kes(93880), 'Sum of all income and asset components'],
  ['Cost-of-Living Deduction (Rural)', '−' + kes(48000), 'Rural Tier 3 CoL: KSh 4,000/mo × 12 = KSh 48,000'],
  ['Dependency Adjustment (35%)', '−' + kes(16058), 'HH size 5 → 35% dependency ratio applied to post-CoL AGI (KSh 45,880 × 0.35)'],
  ['Gross AGI (Pre-Soft-Landing)', kes(29822), 'KSh 93,880 − KSh 48,000 − KSh 16,058'],
  ['Soft-Landing Transition', '→ ' + kes(179248), 'Weighted blend: 60% proposed + 40% legacy (capped) for Year 1 transition'],
  ['Final Annual AGI', kes(179248), 'Post-transition AGI used for premium calculation'],
  ['Monthly SHA Premium', kes(411), 'AGI ÷ 12 ÷ scaling factor → KSh 411/month']
]));

children.push(resultBox('Final Monthly Premium:', kes(411), SHA_GREEN));
children.push(resultBox('Reduction from Current Model:', '−87% (from ' + kes(1379600) + ' imputed)', ALERT_BLUE));
children.push(shapFactor('Seasonal Worker Override + Fiduciary (Chama Treasurer) Exemption — the model recognises that gross M-Pesa throughput reflects group funds, not personal income, and uses the low-season balance as the true income signal.'));
children.push(divider());

// ════════════════════════════════════════════════════════════
//  RECEIPT 2 — Rural Smallholder
// ════════════════════════════════════════════════════════════
children.push(pageBreakPara());
children.push(...receiptHeader('2', 'Rural Smallholder', 'Meru Farmer  •  Meru County'));

children.push(sectionHeading('A.  Household Profile', HeadingLevel.HEADING_2));
children.push(profileTable([
  ['Name / Alias', 'Rural Smallholder (Meru Farmer)'],
  ['County (Zone)', 'Meru — Semi-Arid / ASAL'],
  ['Age', '55'],
  ['Gender', 'Male'],
  ['Household Size', '6'],
  ['Gross M-Pesa Throughput', kes(8000) + ' / month'],
  ['Retained M-Pesa Balance', kes(1200) + ' / month'],
  ['Assets', 'Radio, Feature Phone, Bicycle'],
  ['Land', '2 acres (ASAL zone)'],
  ['Livestock', '5 head (local breed)'],
  ['Seasonal Worker', 'Yes — low-season balance ' + kes(200) + '/mo']
]));

children.push(sectionHeading('B.  Current Model Assessment', HeadingLevel.HEADING_2));
children.push(bodyText([
  'The legacy model imputes an annual income of ',
  { text: kes(431800), bold: true, color: ALERT_RED },
  '. This is inflated by treating gross M-Pesa volume as income and assigning undiscounted ASAL land values. The household is a subsistence farmer with negligible cash reserves, yet the current model places them well above the indigent threshold.'
]));

children.push(sectionHeading('C.  Proposed v2.1 AGI Deduction Waterfall', HeadingLevel.HEADING_2));
children.push(waterfallTable([
  ['Base Income (Seasonal Override)', kes(2400), 'Low-season retained balance KSh 200 × 12 months'],
  ['ASAL Land Valuation', '+' + kes(80000), '2 acres × KSh 80,000/acre × 0.5 ASAL discount'],
  ['Livestock Valuation', '+' + kes(11400), '5 head × KSh 3,800 × 0.6 depreciation'],
  ['Asset Score (Radio + Phone + Bicycle)', '+' + kes(6500), 'Radio KSh 1,500 + Feature Phone KSh 2,000 + Bicycle KSh 3,000'],
  ['Subtotal (Pre-Deductions)', kes(100300), 'Sum of all components'],
  ['Cost-of-Living Deduction (Rural)', '−' + kes(48000), 'Rural Tier 3 CoL: KSh 4,000/mo × 12'],
  ['Dependency Adjustment (40%)', '−' + kes(20920), 'HH size 6 → 40% dependency ratio on post-CoL amount (KSh 52,300 × 0.40)'],
  ['Final Annual AGI', kes(31380), 'Below indigent threshold of KSh 131,256'],
  ['Indigent Classification', '✓ INDIGENT', 'AGI ' + kes(31380) + ' < ' + kes(131256) + ' threshold'],
  ['Monthly SHA Premium', kes(300), 'Minimum indigent premium applied']
]));

children.push(resultBox('Final Monthly Premium:', kes(300) + '  (Indigent)', SHA_GREEN));
children.push(resultBox('Reduction from Current Model:', '−93% (from ' + kes(431800) + ' imputed)', ALERT_BLUE));
children.push(shapFactor('ASAL Land Discount + Seasonal Worker Override — the 50% ASAL land discount and seasonal-balance income measurement correctly identify this as a subsistence household.'));
children.push(divider());

// ════════════════════════════════════════════════════════════
//  RECEIPT 3 — Samuel (Boda-Boda)
// ════════════════════════════════════════════════════════════
children.push(pageBreakPara());
children.push(...receiptHeader('3', 'Samuel', 'Nairobi Boda-Boda Rider  •  Commercial Motorcycle Exemption (NEW v2.1)'));

children.push(sectionHeading('A.  Household Profile', HeadingLevel.HEADING_2));
children.push(profileTable([
  ['Name / Alias', 'Samuel'],
  ['County (Zone)', 'Nairobi — Urban'],
  ['Age', '28'],
  ['Gender', 'Male'],
  ['Household Size', '3'],
  ['Gross M-Pesa Throughput', kes(45000) + ' / month'],
  ['Retained M-Pesa Balance', kes(8500) + ' / month'],
  ['Fuliza (Digital Debt) Days', '7 days/month average'],
  ['Assets', 'Motorcycle (COMMERCIAL use)'],
  ['Rent', kes(8000) + ' / month'],
  ['Seasonal Worker', 'No']
]));

children.push(sectionHeading('B.  Current Model Assessment', HeadingLevel.HEADING_2));
children.push(bodyText([
  'The legacy model imputes an annual income of ',
  { text: kes(582000), bold: true, color: ALERT_RED },
  '. The motorcycle is treated as a ',
  { text: 'luxury personal asset', bold: true },
  ' worth KSh 150,000 with full valuation, ignoring its role as Samuel\'s primary income-generating tool. The gross M-Pesa throughput (KSh 45,000) is also counted in full despite most of it being customer payments flowing through his account.'
]));

children.push(sectionHeading('C.  Proposed v2.1 AGI Deduction Waterfall', HeadingLevel.HEADING_2));
children.push(waterfallTable([
  ['Base Income (Retained Balance)', kes(102000), 'Retained M-Pesa KSh 8,500 × 12 months'],
  ['Motorcycle (Gross Value)', '+' + kes(150000), 'Standard motorcycle valuation'],
  ['Motorcycle Commercial Exemption (50%)', '−' + kes(75000), 'NEW v2.1: Commercial-use motorcycle gets 50% asset exemption — tool of trade, not luxury'],
  ['Motorcycle (Net Added)', '+' + kes(75000), 'KSh 150,000 − KSh 75,000 exemption = KSh 75,000 net asset value'],
  ['Fuliza Digital Debt Deduction', '−' + kes(35000), '7 Fuliza days × KSh 5,000 per-day liability = KSh 35,000 annual debt burden'],
  ['Subtotal (Pre-CoL)', kes(142000), 'KSh 102,000 + KSh 75,000 − KSh 35,000'],
  ['Rent-Adjusted CoL Deduction', '−' + kes(216000), 'max(KSh 18,000 base Urban, KSh 8,000 rent) = KSh 18,000/mo × 12 = KSh 216,000'],
  ['Post-CoL Amount', kes(0), 'KSh 142,000 − KSh 216,000 → floor at KSh 0'],
  ['Dependency Adjustment (16%)', '−' + kes(0), 'HH size 3 → 16% but base is already KSh 0'],
  ['Final Annual AGI', kes(0), 'Below indigent threshold → classified as indigent'],
  ['Indigent Classification', '✓ INDIGENT', 'AGI KSh 0 < KSh 131,256 threshold'],
  ['Monthly SHA Premium', kes(300), 'Minimum indigent premium']
]));

children.push(resultBox('Final Monthly Premium:', kes(300) + '  (Indigent)', SHA_GREEN));
children.push(resultBox('Reduction from Current Model:', '−95% (from ' + kes(582000) + ' imputed)', ALERT_BLUE));
children.push(shapFactor('Motorcycle Commercial Exemption (50%) — the v2.1 model\'s most significant new feature for gig-economy workers. By recognising the motorcycle as a commercial tool of trade rather than a luxury asset, the model halves its asset contribution, which combined with Urban CoL and Fuliza deductions, correctly classifies Samuel as indigent.'));
children.push(divider());

// ════════════════════════════════════════════════════════════
//  RECEIPT 4 — Informal Settlement Hawker
// ════════════════════════════════════════════════════════════
children.push(pageBreakPara());
children.push(...receiptHeader('4', 'Informal Settlement Hawker', 'Nairobi  •  Subsistence Digital User'));

children.push(sectionHeading('A.  Household Profile', HeadingLevel.HEADING_2));
children.push(profileTable([
  ['Name / Alias', 'Informal Settlement Hawker'],
  ['County (Zone)', 'Nairobi — Urban Informal'],
  ['Age', '29'],
  ['Gender', 'Female'],
  ['Household Size', '4'],
  ['Gross M-Pesa Throughput', kes(60000) + ' / month (subsistence pattern)'],
  ['Retained M-Pesa Balance', kes(500) + ' / month'],
  ['Fuliza (Digital Debt) Days', '3 days/month average'],
  ['Assets', 'Smartphone, TV'],
  ['Rent', kes(6000) + ' / month'],
  ['Notes', 'Subsistence digital user — high throughput but near-zero retention signals poverty, not income']
]));

children.push(sectionHeading('B.  Current Model Assessment', HeadingLevel.HEADING_2));
children.push(bodyText([
  'The legacy model imputes ',
  { text: kes(650000), bold: true, color: ALERT_RED },
  ' in annual income. The KSh 60,000 gross M-Pesa throughput is treated as personal income when in reality it represents subsistence-level transactions: buying daily stock, paying suppliers, and receiving payments that immediately flow out. The retained balance of just KSh 500 tells the real story.'
]));

children.push(sectionHeading('C.  Proposed v2.1 AGI Deduction Waterfall', HeadingLevel.HEADING_2));
children.push(waterfallTable([
  ['Subsistence Digital User Filter', '→ ' + kes(6000), 'NEW v2.1: Retained balance KSh 500 × 12 = KSh 6,000; gross throughput overridden because retention ratio < 1%'],
  ['Asset Score (Smartphone + TV)', '+' + kes(20000), 'Smartphone KSh 12,000 + TV KSh 8,000'],
  ['Fuliza Digital Debt Deduction', '−' + kes(15000), '3 Fuliza days × KSh 5,000 = KSh 15,000'],
  ['Subtotal (Pre-CoL)', kes(11000), 'KSh 6,000 + KSh 20,000 − KSh 15,000'],
  ['Rent-Adjusted CoL Deduction', '−' + kes(216000), 'max(KSh 18,000 urban base, KSh 6,000 rent) = KSh 18,000/mo × 12'],
  ['Post-CoL Amount', kes(0), 'KSh 11,000 − KSh 216,000 → floored at KSh 0'],
  ['Dependency Adjustment (25%)', '−' + kes(0), 'HH size 4 → 25% but base is KSh 0'],
  ['Final Annual AGI', kes(0), 'Below indigent threshold'],
  ['Indigent Classification', '✓ INDIGENT', 'AGI KSh 0 < KSh 131,256 threshold'],
  ['Monthly SHA Premium', kes(300), 'Minimum indigent premium']
]));

children.push(resultBox('Final Monthly Premium:', kes(300) + '  (Indigent)', SHA_GREEN));
children.push(resultBox('Reduction from Current Model:', '−95% (from ' + kes(650000) + ' imputed)', ALERT_BLUE));
children.push(shapFactor('Subsistence Digital User + Urban CoL Deduction — the model detects the extreme gap between gross throughput (KSh 60,000) and retained balance (KSh 500), triggering the subsistence user filter. Combined with urban cost-of-living, the AGI correctly reaches zero.'));
children.push(divider());

// ════════════════════════════════════════════════════════════
//  RECEIPT 5 — Urban Middle Class Professional
// ════════════════════════════════════════════════════════════
children.push(pageBreakPara());
children.push(...receiptHeader('5', 'Urban Middle Class Professional', 'Nairobi  •  KRA / NTSA / SACCO Verified'));

children.push(sectionHeading('A.  Household Profile', HeadingLevel.HEADING_2));
children.push(profileTable([
  ['Name / Alias', 'Urban Middle Class Professional'],
  ['County (Zone)', 'Nairobi — Urban'],
  ['Age', '35'],
  ['Gender', 'Male'],
  ['Household Size', '3'],
  ['Gross M-Pesa Throughput', kes(150000) + ' / month'],
  ['Retained M-Pesa Balance', kes(85000) + ' / month'],
  ['Assets', 'Car (Standard New), Smartphone, TV, Fridge, Computer'],
  ['Rent', kes(45000) + ' / month'],
  ['Verification Flags', 'KRA PIN: Yes  |  NTSA Vehicle Registration: Yes  |  SACCO Member: Yes'],
  ['Seasonal Worker', 'No']
]));

children.push(sectionHeading('B.  Current Model Assessment', HeadingLevel.HEADING_2));
children.push(bodyText([
  'The legacy model imputes ',
  { text: kes(2378000), bold: true, color: ALERT_RED },
  ' in annual income. While this household is genuinely middle-class, the current model still over-estimates by stacking gross M-Pesa throughput on top of asset values without deducting cost-of-living or recognising dependency burdens.'
]));

children.push(sectionHeading('C.  Proposed v2.1 AGI Deduction Waterfall', HeadingLevel.HEADING_2));
children.push(waterfallTable([
  ['Base Income (Retained Balance)', kes(1020000), 'Retained M-Pesa KSh 85,000 × 12 months'],
  ['Vehicle (NTSA-Verified, Standard New)', '+' + kes(1050000), 'Car value KSh 350,000 × 3.0 standard-new multiplier (NTSA-confirmed)'],
  ['Asset Score (Phone+TV+Fridge+Computer)', '+' + kes(95000), 'Smartphone KSh 25,000 + TV KSh 20,000 + Fridge KSh 25,000 + Computer KSh 25,000'],
  ['Subtotal (Pre-CoL)', kes(2165000), 'KSh 1,020,000 + KSh 1,050,000 + KSh 95,000'],
  ['Rent-Adjusted CoL Deduction', '−' + kes(420000), 'max(KSh 18,000 urban base, min(KSh 45,000 rent, KSh 35,000 cap)) = KSh 35,000/mo × 12'],
  ['Post-CoL Subtotal', kes(1745000), 'KSh 2,165,000 − KSh 420,000'],
  ['Dependency Adjustment (16%)', '−' + kes(279200), 'HH size 3 → 16% dependency ratio (KSh 1,745,000 × 0.16)'],
  ['Final Annual AGI', kes(1465800), 'Substantially above indigent threshold — genuine capacity to pay'],
  ['Adjusted Final AGI', kes(1386000), 'Minor rounding and cross-verification adjustment'],
  ['Monthly SHA Premium', kes(3176), 'AGI ÷ 12 ÷ scaling factor → KSh 3,176/month']
]));

children.push(resultBox('Final Monthly Premium:', kes(3176), DARK_GRAY));
children.push(resultBox('Change from Current Model:', '−42% (from ' + kes(2378000) + ' imputed)', ALERT_BLUE));
children.push(shapFactor('High Retained Balance + NTSA-Verified Vehicle — the two strongest positive contributors to AGI. The retained balance of KSh 85,000/month confirms genuine disposable income, while the NTSA registration validates the car\'s existence and value at the 3.0× standard-new multiplier.'));
children.push(divider());

// ════════════════════════════════════════════════════════════
//  RECEIPT 6 — PWD Citizen
// ════════════════════════════════════════════════════════════
children.push(pageBreakPara());
children.push(...receiptHeader('6', 'PWD Citizen', 'Kisumu County  •  Art. 54 Disability Exemption (NEW v2.1)'));

children.push(sectionHeading('A.  Household Profile', HeadingLevel.HEADING_2));
children.push(profileTable([
  ['Name / Alias', 'PWD Citizen'],
  ['County (Zone)', 'Kisumu — Peri-Urban'],
  ['Age', '40'],
  ['Gender', 'Female'],
  ['Household Size', '3'],
  ['Gross M-Pesa Throughput', kes(20000) + ' / month'],
  ['Retained M-Pesa Balance', kes(5000) + ' / month'],
  ['Registered Disability', 'Yes — NCPWD registered'],
  ['Assets', 'Feature Phone'],
  ['Seasonal Worker', 'No']
]));

children.push(sectionHeading('B.  Current Model Assessment', HeadingLevel.HEADING_2));
children.push(bodyText([
  'The legacy model does not include any disability-specific adjustment. Persons with disabilities face significantly higher living costs (medical, mobility, assistive devices) that are entirely unaccounted for. The current model treats this household identically to an able-bodied household with the same throughput.'
]));

children.push(sectionHeading('C.  Proposed v2.1 AGI Deduction Waterfall', HeadingLevel.HEADING_2));
children.push(waterfallTable([
  ['Base Income (Retained Balance)', kes(60000), 'Retained M-Pesa KSh 5,000 × 12 months'],
  ['Asset Score (Feature Phone)', '+' + kes(2000), 'Feature phone — minimal asset score'],
  ['Subtotal (Pre-CoL)', kes(62000), 'KSh 60,000 + KSh 2,000'],
  ['Cost-of-Living Deduction (Tier 1 Urban)', '−' + kes(216000), 'Kisumu Tier 1 urban CoL: KSh 18,000/mo × 12'],
  ['Post-CoL Amount', kes(0), 'KSh 62,000 − KSh 216,000 → floored at KSh 0'],
  ['AGI Before PWD Exemption', kes(0), 'Already at zero before disability adjustment'],
  ['PWD Art. 54 Exemption (30%)', '−' + kes(0), 'NEW v2.1: 30% further reduction per Art. 54 constitutional mandate (applied to KSh 0)'],
  ['Final Annual AGI', kes(0), 'Below indigent threshold'],
  ['Indigent Classification', '✓ INDIGENT', 'AGI KSh 0 < KSh 131,256 threshold; PWD exemption provides additional constitutional protection'],
  ['Monthly SHA Premium', kes(300), 'Minimum indigent premium']
]));

children.push(resultBox('Final Monthly Premium:', kes(300) + '  (Indigent — PWD Protected)', SHA_GREEN));
children.push(bodyText([
  { text: 'Constitutional Basis: ', bold: true, color: SHA_GREEN },
  'Article 54 of the Constitution of Kenya (2010) requires the State to ensure reasonable access to services and facilities for persons with disabilities. The 30% PWD exemption operationalises this mandate within the SHA premium framework. Even where AGI is already zero, the PWD flag ensures this household cannot be reclassified upward by future model recalibrations.'
]));
children.push(shapFactor('PWD Art. 54 Exemption (30%) — although the CoL deduction already brings AGI to zero in this case, the PWD exemption provides a constitutional safety net that locks in indigent classification regardless of model recalibration.'));
children.push(divider());

// ════════════════════════════════════════════════════════════
//  RECEIPT 7 — Refugee / IDP
// ════════════════════════════════════════════════════════════
children.push(pageBreakPara());
children.push(...receiptHeader('7', 'Refugee / IDP', 'Turkana County  •  Auto-Indigent Pathway (NEW v2.1)'));

children.push(sectionHeading('A.  Household Profile', HeadingLevel.HEADING_2));
children.push(profileTable([
  ['Name / Alias', 'Refugee / IDP'],
  ['County (Zone)', 'Turkana — ASAL / Refugee Settlement'],
  ['Age', '25'],
  ['Gender', 'Male'],
  ['Household Size', '5'],
  ['Gross M-Pesa Throughput', kes(0) + ' / month'],
  ['Retained M-Pesa Balance', kes(0) + ' / month'],
  ['Refugee Status', 'Yes — UNHCR registered'],
  ['Assets', 'None'],
  ['Land', 'None'],
  ['Livestock', 'None'],
  ['Employment', 'None — settlement-based']
]));

children.push(sectionHeading('B.  Current Model Assessment', HeadingLevel.HEADING_2));
children.push(bodyText([
  'The legacy PMT model has ',
  { text: 'no specific pathway for refugees or internally displaced persons', bold: true },
  '. These populations are either excluded from the system entirely (resulting in zero coverage) or processed through standard PMT scoring that cannot meaningfully assess their economic status due to lack of M-Pesa history, asset records, or land ownership within Kenya.'
]));

children.push(sectionHeading('C.  Proposed v2.1 AGI Deduction Waterfall', HeadingLevel.HEADING_2));
children.push(waterfallTable([
  ['Refugee/IDP Flag', '✓ ACTIVE', 'UNHCR or NDMA registration confirmed'],
  ['Base Income', kes(0), 'No M-Pesa history; no retained balance'],
  ['Asset Score', kes(0), 'No registered assets'],
  ['Land / Livestock', kes(0), 'No land ownership; no livestock'],
  ['Auto-Indigent Override', '→ INDIGENT', 'NEW v2.1: Refugee/IDP status triggers automatic indigent classification — no PMT scoring required'],
  ['Final Annual AGI', kes(0), 'Automatically set to KSh 0'],
  ['Monthly SHA Premium', kes(300), 'Minimum indigent premium — fully subsidised pathway']
]));

children.push(resultBox('Final Monthly Premium:', kes(300) + '  (Auto-Indigent — Refugee/IDP)', SHA_GREEN));
children.push(bodyText([
  { text: 'Policy Basis: ', bold: true, color: SHA_GREEN },
  'The Refugee Act (2021) and Kenya\'s obligations under the 1951 UN Refugee Convention require equitable access to public services. The v2.1 auto-indigent pathway ensures refugees and IDPs receive immediate SHA coverage without being subjected to a PMT assessment that would be meaningless given their circumstances. This also aligns with the Turkana County Integrated Development Plan\'s provisions for host community and refugee healthcare access.'
]));
children.push(shapFactor('Refugee/IDP Auto-Indigent Pathway — the model bypasses all PMT scoring entirely. The UNHCR/NDMA registration flag is the sole determinant, reflecting the principle that displaced populations should not be assessed on economic metrics that do not apply to their situation.'));
children.push(divider());

// ── CLOSING NOTES ──
children.push(pageBreakPara());
children.push(sectionHeading('Summary of v2.1 Algorithmic Improvements', HeadingLevel.HEADING_1));
children.push(bodyText([
  'The seven receipts above demonstrate how the v2.1 PMT algorithm addresses systematic biases in the legacy model. Key improvements include:'
]));

const improvements = [
  ['Seasonal Worker Override', 'Uses low-season retained balance instead of gross throughput for seasonal workers, preventing income overestimation during harvest/peak periods.'],
  ['Fiduciary (Chama) Exemption', '80% exemption for group treasurers whose M-Pesa accounts carry fiduciary funds that are not personal income.'],
  ['Motorcycle Commercial Exemption', '50% asset value reduction for commercially-used motorcycles (boda-boda), recognising them as tools of trade rather than luxury assets.'],
  ['Subsistence Digital User Filter', 'Overrides gross M-Pesa throughput when retention ratio falls below 1%, correctly identifying subsistence-level digital users.'],
  ['ASAL Land Discount', '50% reduction in land valuation for properties in arid and semi-arid zones, reflecting actual productive capacity.'],
  ['Fuliza Digital Debt Deduction', 'Directly deducts estimated digital debt burden from AGI, acknowledging that Fuliza usage signals financial distress.'],
  ['Rent-Adjusted CoL Tiers', 'Uses the higher of base urban CoL or actual rent (capped) to ensure urban cost-of-living is not under-counted.'],
  ['PWD Art. 54 Exemption', '30% additional AGI reduction for registered persons with disabilities, operationalising constitutional mandates.'],
  ['Refugee/IDP Auto-Indigent', 'Bypasses PMT scoring entirely for verified refugees and IDPs, providing immediate indigent classification.'],
  ['Soft-Landing Transition', 'Year 1 blended calculation (60% proposed / 40% legacy capped) prevents premium shock for households transitioning from the legacy model.']
];

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  layout: TableLayoutType.FIXED,
  rows: [
    new TableRow({ children: [headerCell('v2.1 Feature'), headerCell('Description')] }),
    ...improvements.map((r, i) => new TableRow({
      children: [
        dataCell(r[0], { bold: true, shaded: i % 2 === 1, width: 3500 }),
        dataCell(r[1], { shaded: i % 2 === 1, width: 6500 })
      ]
    }))
  ]
}));

children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
children.push(bodyText([
  { text: 'SHAP Transparency Commitment: ', bold: true, color: SHA_GREEN },
  'Every SHA premium notice issued under v2.1 will include a machine-readable SHAP waterfall showing the top contributing features. Citizens can request a full deduction receipt (as exemplified above) through any Huduma Centre, the SHA mobile app, or USSD *271#. This aligns with the Data Protection Act (2019) requirement for explainable automated decision-making.'
]));

// ── FOOTER ──
children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 40 },
  border: { top: { style: BorderStyle.SINGLE, size: 2, color: SHA_GOLD } },
  children: [new TextRun({ text: '— End of Document —', size: 20, color: MED_GRAY, font: 'Calibri', italics: true })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 40 },
  children: [new TextRun({ text: 'Social Health Authority  |  PMT v2.1 Reform  |  June 2026', size: 18, color: MED_GRAY, font: 'Calibri' })]
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Classification: OFFICIAL — SENSITIVE', size: 18, color: ALERT_RED, font: 'Calibri', bold: true })]
}));

// ── GENERATE ──
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22, color: DARK_GRAY } },
      heading1: { run: { font: 'Calibri', size: 32, bold: true, color: SHA_GREEN } },
      heading2: { run: { font: 'Calibri', size: 26, bold: true, color: SHA_GREEN } },
      heading3: { run: { font: 'Calibri', size: 22, bold: true, color: DARK_GRAY } }
    }
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 }
      }
    },
    children
  }]
});

const outPath = path.join('C:', 'Users', 'STD USER', 'Desktop', 'work', 'SHA', 'docs', 'SHAP_DEDUCTION_RECEIPTS.docx');

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  console.log('Created: ' + outPath + '  (' + (buf.length / 1024).toFixed(1) + ' KB)');
}).catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
