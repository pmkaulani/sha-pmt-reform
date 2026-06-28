const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: "SHA PMT v2.1 Optimization — Algorithm Documentation",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "\nThis document outlines the final mathematical and logical architecture of the newly reformed Social Health Authority (SHA) Means Testing Algorithm (v2.1). The algorithm implements the legally mandated 2.75% contribution rate while neutralizing 28 systemic proxies and biases present in the legacy Lasso model.\n",
            }),
          ],
        }),

        // --- Section 1 ---
        new Paragraph({
          text: "1. Cost of Living and Housing Protections",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Three-Tier Cost of Living Index: ", bold: true }),
            new TextRun({ text: "The algorithm recognizes urban density variations. Tier 1 cities (Nairobi, Mombasa, Kisumu) receive a base KSh 18,000 monthly living allowance. Tier 2 cities (Nakuru, Kiambu, Machakos, etc.) receive KSh 10,000. Rural areas receive KSh 4,000." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Rent Ceiling Caps: ", bold: true }),
            new TextRun({ text: "Rent is explicitly deducted to protect high-burden urban renters. To prevent luxury evasion, deductions are hard-capped at KSh 35,000 for Tier 1 and KSh 20,000 for Tier 2. These caps are fully configurable by administrators." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Housing Proxies Removed: ", bold: true }),
            new TextRun({ text: "Intrusive structural proxies (wall material, roof tiles, floor material) have been entirely removed from the AGI calculation to prevent the Ancestral Home Trap." }),
          ],
        }),

        // --- Section 2 ---
        new Paragraph({
          text: "2. Soft-Landing Vulnerability Slope",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "The legacy margin-of-error buffer created a mathematical cliff where citizens earning KSh 131,001 faced sudden contribution spikes. This has been replaced with a continuous soft-landing formula: ",
            }),
            new TextRun({ text: "Math.max(300, (agi - 131000) * 0.01)", italics: true }),
            new TextRun({ text: ". This ensures a perfectly smooth transition into the 2.75% bracket, destroying evasion incentives." }),
          ],
        }),

        // --- Section 3 ---
        new Paragraph({
          text: "3. Targeted Vulnerability Exemptions",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Persons with Disabilities (PWDs): ", bold: true }),
            new TextRun({ text: "30% flat AGI deduction for NCPWD-registered individuals (Art. 54 constitutional protection)." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Bodaboda and PSV Operators: ", bold: true }),
            new TextRun({ text: "50% tool-of-trade commercial exemption for verified motorcycles used for commercial transport." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Seasonal Workers: ", bold: true }),
            new TextRun({ text: "Algorithm uses the low-season retained balance to prevent harvest or tourism spikes from causing over-assessment." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Diaspora Remittances: ", bold: true }),
            new TextRun({ text: "Excluded entirely from the base income to avoid penalizing inward capital flows." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Refugees and IDPs: ", bold: true }),
            new TextRun({ text: "Automatic indigent routing to the subsidized KSh 300 tier." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "DPA Consent Withheld: ", bold: true }),
            new TextRun({ text: "Citizens who exercise their Data Protection Act right to withhold algorithmic assessment are routed to manual CHP verification without any penalty." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Chama Treasurer Fiduciary Exemption: ", bold: true }),
            new TextRun({ text: "80% discount on retained balance for verified group treasurers to prevent fiduciary funds from being counted as personal wealth." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Informal Sub-Landlord Income: ", bold: true }),
            new TextRun({ text: "Sublet income is added back to AGI to prevent homeowners from hiding rental revenue." }),
          ],
        }),

        // --- Section 4 ---
        new Paragraph({
          text: "4. Digital Ghost and Triangulation Fallbacks",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Citizens operating purely in cash with zero digital footprint, zero physical assets, and no KRA PIN trigger the Digital Ghost protocol for physical CHP verification within 90 days. However, if the citizen has an active SACCO account, the system bypasses this hold, recognizing offline formal financial inclusion." }),
          ],
        }),

        // --- Section 5 ---
        new Paragraph({
          text: "5. The Advanced Fraud Engine (18 Flags)",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "To ensure compliance and maintain the 40% breakeven target, the fraud engine detects 18 distinct evasion patterns:\n" }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 1 - Phantom Dependents: ", bold: true }),
            new TextRun({ text: "Household sizes exceeding 12 members." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 2 - Asset Mismatches: ", bold: true }),
            new TextRun({ text: "Cross-references declared cars against NTSA TIMS registry." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 3 - Income Under-Reporting: ", bold: true }),
            new TextRun({ text: "KRA records show income more than 2x self-reported AGI." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 4 - Fuliza Debt Accumulation: ", bold: true }),
            new TextRun({ text: "More than 8 active defaults indicating systematic borrowing to reduce AGI." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 5 - Suspicious Chama Treasurer: ", bold: true }),
            new TextRun({ text: "Claims fiduciary exemption but retained balance is suspiciously low." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 6 - Age-Household Mismatch: ", bold: true }),
            new TextRun({ text: "Head under 25 claiming household larger than 6. Biological implausibility." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 7 - Asset-Liquidity Paradox: ", bold: true }),
            new TextRun({ text: "Luxury car ownership with near-zero cashflow." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 8 - Business Registration Without Income: ", bold: true }),
            new TextRun({ text: "Has KRA PIN but very low retained balance. Possible shell company." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 9 - Multiple Burden Claim: ", bold: true }),
            new TextRun({ text: "Claims chronic illness AND household larger than 7 outside ASAL regions." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 10 - Geographic Impossibility: ", bold: true }),
            new TextRun({ text: "Active assessments in more than 2 counties simultaneously." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 11 - KRA Formal Income Mismatch: ", bold: true }),
            new TextRun({ text: "Formal employment income detected but near-zero retained balance." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 12 - Asset-Lifestyle Incongruity: ", bold: true }),
            new TextRun({ text: "Claims indigence but has 3 or more high-value digitally verifiable indicators." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 13 - Multi-SIM Concealment: ", bold: true }),
            new TextRun({ text: "Multiple active SIM cards under one National ID with low declared balance. Confidence reduced to 0.60 for legitimate dual-SIM users." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 14 - Unverified Fiduciary Claim: ", bold: true }),
            new TextRun({ text: "Claims Chama treasurer role but Safaricom/SACCO API shows no registered group." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 15 - Recent County Switch: ", bold: true }),
            new TextRun({ text: "IPRS shows county of residence changed within 90 days. Possible CoL tier gaming." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 16 - Undeclared Vehicles: ", bold: true }),
            new TextRun({ text: "NTSA shows more registered vehicles than declared by citizen." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 17 - False Commercial Claim: ", bold: true }),
            new TextRun({ text: "Claims commercial vehicle exemption but NTSA registers the vehicle as PRIVATE category." }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Flag 18 - Multi-Household Income Splitting: ", bold: true }),
            new TextRun({ text: "IPRS records show multiple linked households. Possible income splitting to multiply dependency allowances." }),
          ],
        }),

        // --- Section 6 ---
        new Paragraph({
          text: "6. Revenue Impact",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "The newly applied exemptions lower the average monthly contribution assumption from KSh 575 to KSh 520. The revenue stress test model shows:\n" }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Old Breakeven: ", bold: true }),
            new TextRun({ text: "36% compliance rate.\n" }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "New Breakeven: ", bold: true }),
            new TextRun({ text: "40% compliance rate needed to sustain the indigent subsidy pool.\n" }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "This 4 percentage point increase is well within reach given the fairness-driven compliance uplift projected by ILO studies on equitable social insurance systems." }),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('C:\\Users\\STD USER\\Desktop\\work\\SHA\\docs\\SHA_Algorithm_v2.1_Documentation.docx', buffer);
  console.log("SHA_Algorithm_v2.1_Documentation.docx created successfully");
});
