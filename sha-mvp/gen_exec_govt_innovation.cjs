const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, LevelFormat,
  VerticalAlign
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Design tokens ───────────────────────────────────────────────────────────
const NAVY   = "1B5E83";
const WHITE  = "FFFFFF";
const GRAY1  = "F0F4F8";  // lightest stripe
const GRAY2  = "E2EBF3";  // header stripe
const RED    = "B71C1C";
const GREEN  = "0F6E56";
const AMBER  = "854F0B";
const BLACK  = "1A1A1A";

const solid = (fill) => ({ fill, type: ShadingType.CLEAR });
const nb    = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: nb, bottom: nb, left: nb, right: nb };
const tb    = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
const thinBorders = { top: tb, bottom: tb, left: tb, right: tb };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cell = (children, opts = {}) => new TableCell({
  borders: opts.borders ?? thinBorders,
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  shading: opts.fill ? solid(opts.fill) : undefined,
  verticalAlign: opts.vAlign ?? VerticalAlign.TOP,
  columnSpan: opts.span,
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  children
});

const p = (runs, opts = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [runs],
  alignment: opts.align ?? AlignmentType.LEFT,
  spacing: { before: opts.before ?? 40, after: opts.after ?? 40 },
});

const t = (text, opts = {}) => new TextRun({
  text,
  font: "Arial",
  size: opts.size ?? 20,
  bold: opts.bold ?? false,
  color: opts.color ?? BLACK,
  italics: opts.italic ?? false,
});

const headerCell = (text, span) => cell(
  [p(t(text, { bold: true, size: 21, color: WHITE }), { align: AlignmentType.CENTER })],
  { fill: NAVY, span, borders: thinBorders }
);

const sectionLabel = (text) => cell(
  [p(t(text, { bold: true, size: 20, color: WHITE }), { align: AlignmentType.LEFT })],
  { fill: NAVY, span: 4, borders: thinBorders }
);

// ─── Document ────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: { config: [] },
  styles: { default: { document: { run: { font: "Arial", size: 20 } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 720, right: 720, bottom: 720, left: 720 }
      }
    },
    children: [

      // ── TITLE BLOCK ──────────────────────────────────────────────────────
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [10466],
        rows: [new TableRow({ children: [
          cell([
            p(t("SHA PMT v2.1 — Executive Summary", { bold: true, size: 26, color: WHITE }),
              { align: AlignmentType.CENTER, before: 60, after: 20 }),
            p(t("One-Page Briefing for ICT Authority · NACOSTI · Ministry of ICT and Digital Economy", { size: 18, color: "CCE4F5" }),
              { align: AlignmentType.CENTER, before: 0, after: 20 }),
            p([
              t("Peter M. Kaulani  │  Applied Computing, KCA University  │  ", { size: 18, color: "CCE4F5" }),
              t("July 2026", { size: 18, color: WHITE, bold: true }),
            ], { align: AlignmentType.CENTER, before: 0, after: 60 }),
          ], { fill: NAVY, span: 1, borders: noBorders })
        ]})]
      }),

      new Paragraph({ children: [], spacing: { before: 80, after: 0 } }),

      // ── THE PROBLEM ──────────────────────────────────────────────────────
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [10466],
        rows: [
          new TableRow({ children: [sectionLabel("THE PROBLEM")] }),
          new TableRow({ children: [cell([
            p([
              t("The SHA Means Testing Instrument (MTI) — a government ICT system — has ", { size: 20 }),
              t("28+ documented algorithmic flaws", { bold: true, size: 20 }),
              t(" that overcharge Kenya's poorest households while failing to detect wealth among the affluent. The ", { size: 20 }),
              t("\u201CError by Design\u201D", { bold: true, italic: true, size: 20 }),
              t(" investigation (May 2026) proved citizens are denied cancer treatment and dialysis because an algorithm overpredicted their income from roof material. SHA blocked KSh 11.6B in ", { size: 20 }),
              t("suspected", { italic: true, size: 20 }),
              t(" fraudulent claims \u2014 but the means-testing side that sets what citizens ", { size: 20 }),
              t("pay", { italic: true, size: 20 }),
              t(" remains unprotected, biased, and constitutionally challenged.", { size: 20 }),
            ], { before: 60, after: 60 }),
          ], { fill: GRAY1 })] }),
        ]
      }),

      new Paragraph({ children: [], spacing: { before: 80, after: 0 } }),

      // ── THE SOLUTION ─────────────────────────────────────────────────────
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [10466],
        rows: [
          new TableRow({ children: [sectionLabel("THE SOLUTION: ADJUSTABLE GROSS INCOME (AGI) MODEL v2.1")] }),
          new TableRow({ children: [cell([
            p([
              t("Replaces intrusive proxy variables (wall material, roof type, floor type) with ", { size: 20 }),
              t("digitally verifiable income signals", { bold: true, size: 20 }),
              t(" triangulated across KRA, NTSA TIMS, and Safaricom M-Pesa APIs. A live prototype is publicly deployed today.", { size: 20 }),
            ], { before: 40, after: 20 }),
            p([
              t("Demo: ", { bold: true, size: 20 }),
              t("https://sha-pmt-reform.vercel.app  ", { size: 20, color: NAVY }),
              t("  |  Code: ", { bold: true, size: 20 }),
              t("https://github.com/pmkaulani/sha-pmt-reform", { size: 20, color: NAVY }),
            ], { before: 0, after: 40 }),
          ], { fill: GRAY1 })] }),
        ]
      }),

      new Paragraph({ children: [], spacing: { before: 60, after: 0 } }),

      // ── FEATURES 2-col ───────────────────────────────────────────────────
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [5233, 5233],
        rows: [
          new TableRow({ children: [
            cell([p(t("\u25B8  3-tier urban CoL index: Tier 1 KSh 18K \u00B7 Tier 2 KSh 10K \u00B7 Rural KSh 4K", { size: 19 }), { before: 40, after: 20 })], { fill: GRAY1 }),
            cell([p(t("\u25B8  18-flag fraud engine: IPRS, NTSA, KRA, Safaricom cross-ref", { size: 19 }), { before: 40, after: 20 })], { fill: GRAY1 }),
          ]}),
          new TableRow({ children: [
            cell([p(t("\u25B8  Dynamic rent ceilings: KSh 35K (T1), KSh 20K (T2) \u2014 actual rent deducted", { size: 19 }), { before: 10, after: 20 })], { fill: WHITE }),
            cell([p(t("\u25B8  8 vulnerability exemptions: PWDs, Bodabodas, Seasonal, SACCO savers +4", { size: 19 }), { before: 10, after: 20 })], { fill: WHITE }),
          ]}),
          new TableRow({ children: [
            cell([p(t("\u25B8  Smooth indigent transition slope replacing the KSh 131K premium cliff", { size: 19 }), { before: 10, after: 20 })], { fill: GRAY1 }),
            cell([p(t("\u25B8  *147# USSD fallback \u2014 works offline, any phone, any network", { size: 19 }), { before: 10, after: 20 })], { fill: GRAY1 }),
          ]}),
          new TableRow({ children: [
            cell([p(t("\u25B8  SHAP deduction receipt for every household \u2014 plain-language premium explanation", { size: 19 }), { before: 10, after: 20 })], { fill: WHITE }),
            cell([p(t("\u25B8  Full DPA 2019 compliance: granular consent, human-in-the-loop, tiered retention", { size: 19 }), { before: 10, after: 20 })], { fill: WHITE }),
          ]}),
        ]
      }),

      new Paragraph({ children: [], spacing: { before: 80, after: 0 } }),

      // ── REVENUE + LEGAL side by side ──────────────────────────────────────
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [5000, 5466],
        rows: [
          new TableRow({ children: [
            cell([p(t("REVENUE IMPACT", { bold: true, size: 20, color: WHITE }))], { fill: NAVY }),
            cell([p(t("LEGAL MANDATE", { bold: true, size: 20, color: WHITE }))], { fill: NAVY }),
          ]}),
          new TableRow({ children: [
            cell([
              p([t("\u25B8  Avg. contribution: ", { bold: true, size: 19 }), t("KSh 520/mo (fairness exemptions applied)", { size: 19 })], { before: 40, after: 20 }),
              p([t("\u25B8  Breakeven compliance: ", { bold: true, size: 19 }), t("40% (\u2191 from 36%)", { size: 19 })], { before: 0, after: 20 }),
              p([t("\u25B8  Projected revenue at target: ", { bold: true, size: 19 }), t("KSh 4.84B/mo", { bold: true, size: 19, color: GREEN })], { before: 0, after: 20 }),
              p([t("\u25B8  Net uplift: ", { bold: true, size: 19 }), t("Increased voluntary compliance offsets exemption cost", { size: 19 })], { before: 0, after: 40 }),
            ], { fill: GRAY1 }),
            cell([
              p([t("1.  ", { bold: true, size: 19, color: RED }), t("High Court unconstitutionality ruling", { bold: true, size: 19 }), t(" (Justice Mwamuye, Mar 19, 2026) \u2014 90-day repair window", { size: 19 })], { before: 40, after: 20 }),
              p([t("2.  ", { bold: true, size: 19, color: RED }), t("CAJ Order #CAJ/2026/05/0847", { bold: true, size: 19 }), t(" \u2014 citizen disclosure submission filed June 5, 2026, demonstrating full transparency is achievable", { size: 19 })], { before: 0, after: 20 }),
              p([t("3.  ", { bold: true, size: 19, color: RED }), t("Awino petition", { bold: true, size: 19 }), t(" before Constitutional & Human Rights Div., Milimani \u2014 ongoing cluster of constitutional challenges", { size: 19 })], { before: 0, after: 20 }),
              p([t("Compliance: ", { bold: true, size: 19 }), t("Art. 27(4) \u00B7 DPA 2019 \u00A732/35/39 \u00B7 AI Bill 2026 \u00B7 Justice Mwita June 2025 no-double-taxation ruling", { size: 18, italic: true })], { before: 0, after: 40 }),
            ], { fill: GRAY1 }),
          ]}),
        ]
      }),

      new Paragraph({ children: [], spacing: { before: 80, after: 0 } }),

      // ── WHY THIS IS A GOVERNMENT ICT MATTER ─────────────────────────────
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [10466],
        rows: [
          new TableRow({ children: [sectionLabel("WHY THIS IS A GOVERNMENT ICT AND INNOVATION MATTER")] }),
          new TableRow({ children: [cell([
            p([
              t("The SHA MTI is a ", { size: 20 }),
              t("government ICT system", { bold: true, size: 20 }),
              t(" subject to ICT Authority standards oversight. It operates in the highest-risk AI category: a mandatory government system that determines citizen welfare payments with no appeal mechanism and no explainability. Kenya\u2019s AI Bill 2026, currently before the Senate, will impose algorithmic transparency and fairness-audit requirements on exactly this class of system. ", { size: 20 }),
              t("The AGI Model has been built to meet those requirements from inception", { bold: true, size: 20 }),
              t(" \u2014 positioning Kenya to lead responsible public-sector AI in Africa before the law even requires it.", { size: 20 }),
            ], { before: 60, after: 60 }),
          ], { fill: GRAY1 })] }),
        ]
      }),

      new Paragraph({ children: [], spacing: { before: 80, after: 0 } }),

      // ── THREE ASKS ───────────────────────────────────────────────────────
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [10466],
        rows: [
          new TableRow({ children: [sectionLabel("THREE ASKS")] }),
          new TableRow({ children: [cell([
            p([t("1", { bold: true, size: 22, color: NAVY }), t("   ICT Authority formally receives and evaluates this as a viable ICT innovation for government adoption under the Department of Innovation\u2019s mandate", { size: 20 })], { before: 50, after: 20 }),
            p([t("2", { bold: true, size: 22, color: NAVY }), t("   NACOSTI formally recognises the AGI Model v2.1 as a national strategic innovation and issues a government advisory recommending algorithmic transparency in public-sector AI systems", { size: 20 })], { before: 0, after: 20 }),
            p([t("3", { bold: true, size: 22, color: NAVY }), t("   Ministry of ICT refers this submission to the Ministry of Health and SHA for a 90-day parallel-run evaluation \u2014 zero commitment to replace the current system until the data justifies it", { size: 20 })], { before: 0, after: 50 }),
          ], { fill: GRAY2 })] }),
        ]
      }),

      new Paragraph({ children: [], spacing: { before: 80, after: 0 } }),

      // ── CONTACT FOOTER ───────────────────────────────────────────────────
      new Table({
        width: { size: 10466, type: WidthType.DXA },
        columnWidths: [10466],
        rows: [new TableRow({ children: [
          cell([
            p([
              t("Contact:  ", { bold: true, size: 19, color: WHITE }),
              t("0712260057  \u2502  info@kenia.go.ke  \u2502  sha-pmt-reform.vercel.app  \u2502  github.com/pmkaulani/sha-pmt-reform", { size: 19, color: "CCE4F5" }),
            ], { align: AlignmentType.CENTER, before: 60, after: 60 }),
          ], { fill: NAVY, borders: noBorders }),
        ]})]
      }),

    ]
  }]
});

const outPath = path.join(__dirname, '..', 'docs', 'EXECUTIVE_SUMMARY_GOVT_INNOVATION.docx');
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('Done → ' + outPath);
});
