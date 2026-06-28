const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const bold = (t) => new TextRun({ text: t, bold: true });
const normal = (t) => new TextRun({ text: t });

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({ text: "SHA PMT v2.1 — Executive Summary", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [normal("One-Page Briefing for Cabinet Secretaries and Parliamentary Health Committee")], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
      new Paragraph({ children: [normal("Author: Peter M. Kaulani | KCA University | June 27, 2026 (Updated)")], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),

      new Paragraph({ text: "Strategic Alignment & The Court Mandate", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [
          bold("This proposal responds to the High Court's March 2026 constitutional compliance directive"),
          normal(" requiring SHA to demonstrate that no patient is denied emergency treatment due to contribution algorithm failures. The AGI model is that remedy. It aligns directly with recent commitments by the CS Health and SHA CEO to reform the Proxy Means Testing (PMT) algorithm to be more equitable, transparent, and accurate.")
        ]
      }),

      new Paragraph({ text: "The Problem", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [
          normal("The current SHA means-testing algorithm (Lasso PMT) has 28+ systemic flaws that overcharge the poorest Kenyans while failing to detect wealth among the affluent. An internal pre-deployment "),
          bold("IDinsight report (obtained via ATIA 2016)"),
          normal(" proved SHA was warned the model was inequitable before launch. The 'Error by Design' investigation (May 2026) confirmed citizens are denied cancer treatment because the algorithm overpredicted income based on roof material. Crucially, the "),
          bold("KSh 11 Billion fraud scandal (Oct 2024 - Apr 2025)"),
          normal(" was hospital-side claims fraud; the PMT algorithm suffers from enrollment evasion, which exacerbates adverse selection and accelerates hospital fraud.")
        ]
      }),

      new Paragraph({ text: "The Solution: Adjustable Gross Income (AGI) Model", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [
          normal("Replaces intrusive proxy variables (wall material, roof type, floor type, electricity access) with digitally verifiable income signals triangulated across KRA, NTSA TIMS, and Safaricom M-Pesa APIs.\n\n"),
          bold("Key innovations:\n"),
          normal("• 3-tier urban Cost of Living index (Tier 1: KSh 18,000, Tier 2: KSh 10,000, Rural: KSh 4,000)\n"),
          normal("• Dynamic rent ceiling deductions (cap: KSh 35,000 Tier 1, KSh 20,000 Tier 2) — actual rent deducted, not assumed\n"),
          normal("• Smooth indigent transition slope replacing the KSh 131,000 cliff\n"),
          normal("• 8 targeted vulnerability exemptions: PWDs (30% AGI), Bodabodas (50% commercial), Seasonal workers, Diaspora, Refugees/IDPs, SACCO savers, Consent-withheld, Chama treasurers\n"),
          normal("• 18-flag advanced fraud engine with IPRS, NTSA, KRA, and Safaricom cross-referencing\n"),
          normal("• Hybrid formal/informal income modelling for mixed households\n"),
          normal("• Full DPA 2019 compliance with granular consent, human-in-the-loop, and tiered data retention\n\n"),
          bold("Implementation Prerequisite: "),
          normal("Mandatory 6-month MoU timeline for live API integration with KRA, NTSA, and Safaricom. Furthermore, a phased County Government Buy-In Protocol (pilot strategy in Nakuru, Turkana, Mombasa) is required to secure regional support before national scale.")
        ]
      }),

      new Paragraph({ text: "Revenue Impact", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [
          normal("• Average contribution: KSh 520/month (down from 575 due to fairness exemptions)\n"),
          normal("• Breakeven compliance: 40% (up from 36%)\n"),
          normal("• Projected revenue at target compliance: KSh 4.84 billion/month\n"),
          normal("• "), bold("Fiscal Tradeoff: "), normal("While vulnerability exemptions increase the cost of the indigent subsidy, the net revenue uplift from increased voluntary compliance (and reduced evasion) far offsets this cost, shifting SHA towards sustainable equilibrium.")
        ]
      }),

      new Paragraph({ text: "Legal Framework", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [
          bold("Dual Legal Mandate:\n"),
          normal("1. High Court unconstitutionality ruling (Justice Bahati Mwamuye, March 19, 2026) — 90-day repair window\n"),
          normal("2. CAJ Order #CAJ/2026/05/0847 — full algorithm disclosure by June 5, 2026\n"),
          normal("3. Awino petition transferred to Constitutional and Human Rights Division at Milimani (June 9, 2026)\n\n"),
          bold("Compliance & Statutory Alignment:\n"),
          normal("To resolve tension with the SHA Act 2023 mandate for 'gross income', the AGI model frames its sophisticated deductions (CoL, rent, exemptions) as "),
          bold("'assessed liability reductions'"),
          normal(" applied post-calculation. This ensures statutory compliance without requiring a legislative amendment.\n"),
          normal("Other compliance: Constitution Art. 27(4), DPA 2019 Sections 32/35/39, AI Bill 2026, High Court (Justice Mwita, June 2025) no double taxation.")
        ]
      }),

      new Paragraph({ text: "Three Asks", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [
          normal("1. SHA to adopt AGI model as the v2.1 means-testing standard\n"),
          normal("2. Data Commissioner to issue compliance certificate\n"),
          normal("3. KIPPRA to conduct independent policy review\n\n"),
          bold("Contact: "), normal("0712260057 | 2507765@students.kcau.ac.ke")
        ]
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('C:\\Users\\STD USER\\Desktop\\work\\SHA\\docs\\EXECUTIVE_SUMMARY_ONE_PAGER.docx', buffer);
  console.log("EXECUTIVE_SUMMARY_ONE_PAGER.docx updated successfully");
});
