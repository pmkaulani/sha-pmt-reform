const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TableLayoutType } = require("docx");
const fs = require("fs");
const path = require("path");

const NAVY = "1B2A4A";
const DARK = "222222";
const ACCENT = "2E5090";
const MUTED = "555555";
const LIGHT_BG = "F0F4FA";
const WHITE = "FFFFFF";
const BORDER_COLOR = "B0C4DE";
const RED_ACCENT = "C0392B";

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

const thinBottomBorder = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

function sectionHeader(text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: NAVY },
            borders: noBorders,
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                indent: { left: 120 },
                children: [
                  new TextRun({ text: text.toUpperCase(), bold: true, size: 19, font: "Calibri", color: WHITE }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function bulletPoint(label, description) {
  return new Paragraph({
    spacing: { before: 30, after: 30 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: "▸ ", font: "Calibri", size: 18, color: ACCENT }),
      new TextRun({ text: label, bold: true, font: "Calibri", size: 18, color: DARK }),
      new TextRun({ text: description, font: "Calibri", size: 18, color: DARK }),
    ],
  });
}

function plainPara(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before || 40, after: opts.after || 40 },
    indent: { left: opts.indent || 120 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text, font: "Calibri", size: 18, color: opts.color || DARK }),
    ],
  });
}

function spacer(h = 60) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [] });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 20 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 600, bottom: 500, left: 720, right: 720 },
          size: { width: 12240, height: 15840 },
        },
      },
      children: [
        // ── TITLE BLOCK ──
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  shading: { fill: NAVY },
                  borders: noBorders,
                  children: [
                    new Paragraph({
                      spacing: { before: 160, after: 0 },
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: "SHA PMT v2.1 — Executive Summary", bold: true, size: 30, font: "Calibri", color: WHITE }),
                      ],
                    }),
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: "One-Page Briefing for Cabinet Secretaries and Parliamentary Health Committee", italics: true, size: 19, font: "Calibri", color: "B0C4DE" }),
                      ],
                    }),
                    new Paragraph({
                      spacing: { before: 0, after: 140 },
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: "Peter M. Kaulani  |  June 28, 2026", size: 17, font: "Calibri", color: "8899BB" }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        spacer(100),

        // ── THE PROBLEM ──
        sectionHeader("The Problem"),
        spacer(20),
        new Paragraph({
          spacing: { before: 30, after: 30 },
          indent: { left: 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({ text: "The current SHA means-testing algorithm (Lasso PMT) has ", font: "Calibri", size: 18, color: DARK }),
            new TextRun({ text: "28+ systemic flaws", bold: true, font: "Calibri", size: 18, color: RED_ACCENT }),
            new TextRun({ text: " that overcharge the poorest Kenyans while failing to detect wealth among the affluent. The ", font: "Calibri", size: 18, color: DARK }),
            new TextRun({ text: "Error by Design", bold: true, italics: true, font: "Calibri", size: 18, color: DARK }),
            new TextRun({ text: " investigation (May 2026) proved that citizens are denied cancer treatment and dialysis because an algorithm overpredicted their income based on roof material. The ", font: "Calibri", size: 18, color: DARK }),
            new TextRun({ text: "KSh 11 Billion fraud scandal", bold: true, font: "Calibri", size: 18, color: RED_ACCENT }),
            new TextRun({ text: " (Oct 2024 – Apr 2025) showed the system is bleeding money through undetected evasion.", font: "Calibri", size: 18, color: DARK }),
          ],
        }),

        spacer(80),

        // ── THE SOLUTION ──
        sectionHeader("The Solution: Adjustable Gross Income (AGI) Model"),
        spacer(20),
        new Paragraph({
          spacing: { before: 30, after: 50 },
          indent: { left: 120 },
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({ text: "Replaces intrusive proxy variables (wall material, roof type, floor type, electricity access) with ", font: "Calibri", size: 18, color: DARK }),
            new TextRun({ text: "digitally verifiable income signals", bold: true, font: "Calibri", size: 18, color: ACCENT }),
            new TextRun({ text: " triangulated across KRA, NTSA TIMS, and Safaricom M-Pesa APIs.", font: "Calibri", size: 18, color: DARK }),
          ],
        }),

        // Key innovations table — two-column layout
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [5000, 5000],
          rows: [
            // Row 1
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: thinBottomBorder,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      indent: { left: 80 },
                      children: [
                        new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                        new TextRun({ text: "3-tier urban CoL index: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                        new TextRun({ text: "Tier 1 KSh 18K, Tier 2 KSh 10K, Rural KSh 4K", font: "Calibri", size: 17, color: MUTED }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: thinBottomBorder,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      indent: { left: 80 },
                      children: [
                        new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                        new TextRun({ text: "Dynamic rent ceilings: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                        new TextRun({ text: "KSh 35K (T1), KSh 20K (T2) — actual rent deducted", font: "Calibri", size: 17, color: MUTED }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            // Row 2
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: thinBottomBorder,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      indent: { left: 80 },
                      children: [
                        new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                        new TextRun({ text: "Smooth indigent transition slope ", bold: true, font: "Calibri", size: 17, color: DARK }),
                        new TextRun({ text: "replacing the KSh 131K cliff", font: "Calibri", size: 17, color: MUTED }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: thinBottomBorder,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      indent: { left: 80 },
                      children: [
                        new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                        new TextRun({ text: "18-flag fraud engine: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                        new TextRun({ text: "IPRS, NTSA, KRA, Safaricom cross-ref", font: "Calibri", size: 17, color: MUTED }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            // Row 3
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: thinBottomBorder,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      indent: { left: 80 },
                      children: [
                        new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                        new TextRun({ text: "8 vulnerability exemptions: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                        new TextRun({ text: "PWDs (30%), Bodabodas (50%), Seasonal, Diaspora, Refugees/IDPs, SACCO savers, Consent-withheld, Chama treasurers", font: "Calibri", size: 17, color: MUTED }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: thinBottomBorder,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      indent: { left: 80 },
                      children: [
                        new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                        new TextRun({ text: "Full DPA 2019 compliance: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                        new TextRun({ text: "Granular consent, human-in-the-loop, tiered data retention", font: "Calibri", size: 17, color: MUTED }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        spacer(80),

        // ── REVENUE IMPACT & LEGAL FRAMEWORK — side by side ──
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [4800, 5200],
          rows: [
            // Header row
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 48, type: WidthType.PERCENTAGE },
                  shading: { fill: NAVY },
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.SINGLE, size: 2, color: WHITE } },
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      indent: { left: 120 },
                      children: [
                        new TextRun({ text: "REVENUE IMPACT", bold: true, size: 19, font: "Calibri", color: WHITE }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 52, type: WidthType.PERCENTAGE },
                  shading: { fill: NAVY },
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.SINGLE, size: 2, color: WHITE }, right: { style: BorderStyle.NONE } },
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      indent: { left: 120 },
                      children: [
                        new TextRun({ text: "LEGAL FRAMEWORK", bold: true, size: 19, font: "Calibri", color: WHITE }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            // Content row
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 48, type: WidthType.PERCENTAGE },
                  shading: { fill: LIGHT_BG },
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR } },
                  children: [
                    new Paragraph({ spacing: { before: 50, after: 20 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                      new TextRun({ text: "Avg. contribution: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: "KSh 520/mo", font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: " (↓ from 575 — fairness exemptions)", font: "Calibri", size: 17, color: MUTED }),
                    ]}),
                    new Paragraph({ spacing: { before: 20, after: 20 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                      new TextRun({ text: "Breakeven compliance: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: "40% (↑ from 36%)", font: "Calibri", size: 17, color: DARK }),
                    ]}),
                    new Paragraph({ spacing: { before: 20, after: 20 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                      new TextRun({ text: "Projected revenue at target: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: "KSh 4.84 B/mo", font: "Calibri", size: 17, color: ACCENT, bold: true }),
                    ]}),
                    new Paragraph({ spacing: { before: 20, after: 50 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "▸ ", font: "Calibri", size: 17, color: ACCENT }),
                      new TextRun({ text: "Net uplift: ", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: "Increased voluntary compliance offsets exemption cost", font: "Calibri", size: 17, color: MUTED }),
                    ]}),
                  ],
                }),
                new TableCell({
                  width: { size: 52, type: WidthType.PERCENTAGE },
                  shading: { fill: LIGHT_BG },
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR }, right: { style: BorderStyle.NONE } },
                  children: [
                    new Paragraph({ spacing: { before: 50, after: 15 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "Dual Legal Mandate:", bold: true, italics: true, font: "Calibri", size: 17, color: NAVY }),
                    ]}),
                    new Paragraph({ spacing: { before: 10, after: 10 }, indent: { left: 200 }, children: [
                      new TextRun({ text: "1. ", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: "High Court unconstitutionality ruling", bold: true, font: "Calibri", size: 17, color: RED_ACCENT }),
                      new TextRun({ text: " (Justice Bahati Mwamuye, Mar 19, 2026) — 90-day repair window", font: "Calibri", size: 17, color: MUTED }),
                    ]}),
                    new Paragraph({ spacing: { before: 10, after: 10 }, indent: { left: 200 }, children: [
                      new TextRun({ text: "2. ", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: "CAJ Order #CAJ/2026/05/0847", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: " — algorithm disclosure order (complied with as of June 28, 2026)", font: "Calibri", size: 17, color: MUTED }),
                    ]}),
                    new Paragraph({ spacing: { before: 10, after: 10 }, indent: { left: 200 }, children: [
                      new TextRun({ text: "3. ", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: "Awino petition", bold: true, font: "Calibri", size: 17, color: DARK }),
                      new TextRun({ text: " before Constitutional & Human Rights Div., Milimani — ongoing", font: "Calibri", size: 17, color: MUTED }),
                    ]}),
                    new Paragraph({ spacing: { before: 15, after: 50 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "Compliance: ", bold: true, font: "Calibri", size: 16, color: DARK }),
                      new TextRun({ text: "Art. 27(4), DPA 2019 §32/35/39, AI Bill 2026, High Court (Justice Mwita, June 2025) no double taxation", font: "Calibri", size: 16, color: MUTED }),
                    ]}),
                  ],
                }),
              ],
            }),
          ],
        }),

        spacer(100),

        // ── THREE ASKS ──
        sectionHeader("Three Asks"),
        spacer(20),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          columnWidths: [600, 9400],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 6, type: WidthType.PERCENTAGE },
                  shading: { fill: ACCENT },
                  borders: noBorders,
                  verticalAlign: "center",
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [
                      new TextRun({ text: "1", bold: true, size: 22, font: "Calibri", color: WHITE }),
                    ]}),
                  ],
                }),
                new TableCell({
                  width: { size: 94, type: WidthType.PERCENTAGE },
                  shading: { fill: LIGHT_BG },
                  borders: noBorders,
                  children: [
                    new Paragraph({ spacing: { before: 50, after: 50 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "SHA to adopt the AGI model as the v2.1 means-testing standard", bold: true, font: "Calibri", size: 18, color: DARK }),
                    ]}),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: noBorders, children: [
                  new Paragraph({ spacing: { before: 10, after: 10 }, children: [] }),
                ]}),
                new TableCell({ width: { size: 94, type: WidthType.PERCENTAGE }, borders: noBorders, children: [
                  new Paragraph({ spacing: { before: 10, after: 10 }, children: [] }),
                ]}),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 6, type: WidthType.PERCENTAGE },
                  shading: { fill: ACCENT },
                  borders: noBorders,
                  verticalAlign: "center",
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [
                      new TextRun({ text: "2", bold: true, size: 22, font: "Calibri", color: WHITE }),
                    ]}),
                  ],
                }),
                new TableCell({
                  width: { size: 94, type: WidthType.PERCENTAGE },
                  shading: { fill: LIGHT_BG },
                  borders: noBorders,
                  children: [
                    new Paragraph({ spacing: { before: 50, after: 50 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "Data Commissioner to issue a compliance certificate", bold: true, font: "Calibri", size: 18, color: DARK }),
                    ]}),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: noBorders, children: [
                  new Paragraph({ spacing: { before: 10, after: 10 }, children: [] }),
                ]}),
                new TableCell({ width: { size: 94, type: WidthType.PERCENTAGE }, borders: noBorders, children: [
                  new Paragraph({ spacing: { before: 10, after: 10 }, children: [] }),
                ]}),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 6, type: WidthType.PERCENTAGE },
                  shading: { fill: ACCENT },
                  borders: noBorders,
                  verticalAlign: "center",
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 50, after: 50 }, children: [
                      new TextRun({ text: "3", bold: true, size: 22, font: "Calibri", color: WHITE }),
                    ]}),
                  ],
                }),
                new TableCell({
                  width: { size: 94, type: WidthType.PERCENTAGE },
                  shading: { fill: LIGHT_BG },
                  borders: noBorders,
                  children: [
                    new Paragraph({ spacing: { before: 50, after: 50 }, indent: { left: 120 }, children: [
                      new TextRun({ text: "KIPPRA to conduct an independent policy review", bold: true, font: "Calibri", size: 18, color: DARK }),
                    ]}),
                  ],
                }),
              ],
            }),
          ],
        }),

        spacer(120),

        // ── FOOTER / CONTACT ──
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  shading: { fill: NAVY },
                  borders: noBorders,
                  children: [
                    new Paragraph({
                      spacing: { before: 60, after: 60 },
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: "Contact:  ", bold: true, size: 17, font: "Calibri", color: "B0C4DE" }),
                        new TextRun({ text: "0712260057  |  2507765@students.kcau.ac.ke", size: 17, font: "Calibri", color: WHITE }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    },
  ],
});

const outPath = path.resolve("C:\\Users\\STD USER\\Desktop\\work\\SHA\\docs\\EXECUTIVE_SUMMARY_ONE_PAGER.docx");
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outPath, buffer);
  console.log("Executive Summary generated: " + outPath);
});
