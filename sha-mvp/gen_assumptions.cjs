const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const bold = (t) => new TextRun({ text: t, bold: true });
const normal = (t) => new TextRun({ text: t });
const italic = (t) => new TextRun({ text: t, italics: true });

const entry = (label, value, source) => {
  const children = [bold(label + ": "), normal(value)];
  if (source) children.push(italic(" — Source: " + source));
  return new Paragraph({ children, spacing: { after: 120 } });
};

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({ text: "SHA PMT v2.1 — Assumptions and Parameters Register", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ children: [normal("Complete Reference of All Model Constants, Sources, and Justifications")], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
      new Paragraph({ children: [italic("Updated: June 28, 2026 | Author: Peter M. Kaulani")], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),

      // --- 1. Legal ---
      new Paragraph({ text: "1. Legal Parameters", heading: HeadingLevel.HEADING_2 }),
      entry("Contribution Rate", "2.75% of Adjusted Gross Income (AGI)", "Social Health Insurance Act 2023, Section 27"),
      entry("Indigent Threshold", "KSh 131,000/year AGI", "SHA Gazette Notice"),
      entry("Subsidized Contribution", "KSh 300/month for all citizens classified as indigent"),
      entry("Soft-Landing Formula", "max(300, (agi - 131000) x (0.0275 / 12)) — replaces the hard cliff at 131K. The statutory 2.75% rate intrinsically creates the smooth transition, removing the sudden jump."),
      entry("Constitutional Basis", "Art. 27(4) non-discrimination, Art. 43 right to health, Art. 54 PWD protections, Art. 56 marginalized communities"),

      // --- 2. Cost of Living ---
      new Paragraph({ text: "2. Cost of Living Parameters", heading: HeadingLevel.HEADING_2 }),
      entry("Tier 1 Cities", "Nairobi, Mombasa, Kisumu — KSh 18,000/month base deduction", "KCHS 2022 (KNBS Kenya Continuous Household Survey), CPI-adjusted to 2025/26"),
      entry("Tier 2 Cities", "Nakuru, Uasin Gishu, Kiambu, Kisii, Nyeri, Machakos, Trans Nzoia — KSh 10,000/month base deduction", "KNBS urban poverty line estimates"),
      entry("Rural", "All other counties — KSh 4,000/month base deduction", "KNBS rural poverty line 2024"),
      entry("Annualization", "All monthly CoL values are multiplied by 12 for annual AGI deduction"),

      // --- 3. Rent Ceilings ---
      new Paragraph({ text: "3. Rent Ceiling Parameters (NEW in v2.1)", heading: HeadingLevel.HEADING_2 }),
      entry("Design Principle", "Actual rent paid is deducted (not an assumed flat value). The deduction is capped at a ceiling to prevent luxury evasion. If actual rent is below the base CoL, the base CoL is used instead."),
      entry("Tier 1 Rent Cap", "KSh 35,000/month — admin-configurable", "Hass Consult Rental Index Q1 2025, approximately 90th percentile of Nairobi rents"),
      entry("Tier 2 Rent Cap", "KSh 20,000/month — admin-configurable", "Kenya Property Developers Association satellite town surveys"),
      entry("Rural Rent Cap", "KSh 10,000/month"),
      entry("Formula", "colDeduction = max(baseCoL, min(actualRent, rentCap)) x 12"),

      // --- 4. Asset Valuation ---
      new Paragraph({ text: "4. Asset Valuation Parameters", heading: HeadingLevel.HEADING_2 }),
      entry("Standard Car Base Value", "KSh 350,000 — admin-configurable"),
      entry("Vehicle Multipliers", "Standard Old: 1.0x (KSh 350K), Standard New: 3.0x (KSh 1.05M), Luxury/SUV: 10.0x (KSh 3.5M), Commercial/Matatu: 2.5x (KSh 875K)"),
      entry("Commercial Vehicle Exemption", "50% deduction for commercial (matatu/pick-up) vehicles — tools of trade", "ILO informal sector asset protection guidelines"),
      entry("Old Vehicle Depreciation", "40% depreciation applied to Standard Old vehicles IF no high-wealth triangulation signal (Active KRA PIN, NTSA, or retained balance above KSh 50,000)"),
      entry("Motorcycle Value", "KSh 150,000", "Average price of TVS HLX 150 / Boxer 150 in Kenya, 2024-2025"),
      entry("Motorcycle Commercial (Bodaboda) Exemption", "50% deduction for motorcycles verified as commercial (PSV)", "Approximately 1.5 million registered bodaboda riders (NTSA 2024). Average monthly income KSh 15,000-25,000. Motorcycle is sole income-generating asset for most riders."),
      entry("Non-Motorcycle, Non-Car Assets", "Feature phones, smartphones, TVs, radios, fridges, computers, bicycles — NOT counted in AGI. Only digitally-verifiable high-value assets (cars, motorcycles) are included. This removes the Lasso model's proxy bias of punishing basic item ownership."),
      
      // --- 4b. Triangulation Parameters ---
      new Paragraph({ text: "5. Triangulation & Wealth Signals", heading: HeadingLevel.HEADING_2 }),
      entry("KRA PIN Type Classification", "Classifies PINs as NONE, PAYE (formal payroll), or BUSINESS (self-employment) to apply differentiated confidence weighting in the fraud engine.", "KRA iTax API"),

      // --- 5. ASAL ---
      new Paragraph({ text: "5. ASAL Land and Livestock Parameters", heading: HeadingLevel.HEADING_2 }),
      entry("Land Value Per Acre (Base)", "KSh 80,000", "Ministry of Lands average smallholding valuations"),
      entry("Arid County Land Multiplier", "0.15 (85% discount)", "NDMA Drought VCI Index; arid land is non-arable and cannot generate cash income"),
      entry("Semi-Arid County Land Multiplier", "0.50 (50% discount)"),
      entry("Arid Counties", "Turkana, Marsabit, Wajir, Mandera, Garissa, Isiolo, Samburu, Tana River"),
      entry("Semi-Arid Counties", "Baringo, West Pokot, Laikipia, Narok, Kajiado, Kitui, Makueni, Taita Taveta, Lamu, Kilifi, Kwale, Embu, Tharaka-Nithi, Meru, Elgeyo Marakwet"),
      entry("Livestock Value Per Head (Base)", "KSh 3,800", "KLIP/FAO Tropical Livestock Units (TLU)"),
      entry("Arid Livestock Multiplier", "0.30 (70% discount) — livestock is capital, not liquid cash"),
      entry("Semi-Arid Livestock Multiplier", "0.60 (40% discount)"),

      // --- 6. Dependency ---
      new Paragraph({ text: "6. Dependency Parameters", heading: HeadingLevel.HEADING_2 }),
      entry("Per-Dependent Deduction", "8% of AGI per dependent (household size minus 1)", "KNBS KDHS 2022 household composition data"),
      entry("Cap (Non-ASAL)", "35% of AGI — prevents gaming via phantom dependents"),
      entry("Cap (ASAL Counties)", "40% of AGI — higher cap for pastoralist polygamous families", "Art. 56 constitutional protection for marginalized communities"),

      // --- 7. Vulnerability Exemptions ---
      new Paragraph({ text: "7. Vulnerability Exemption Parameters (NEW in v2.1)", heading: HeadingLevel.HEADING_2 }),
      entry("PWD Exemption", "30% flat AGI deduction for NCPWD-registered individuals", "NCPWD Act 2003; Constitution Art. 54"),
      entry("CHE Exemption", "40% AGI deduction for citizens with chronic illness", "WHO catastrophic health expenditure threshold definition"),
      entry("Fiduciary (Chama Treasurer) Exemption", "80% discount on retained balance — fiduciary funds are not personal wealth"),
      entry("Subsistence Digital User Threshold", "Gross M-Pesa above KSh 25,000/month AND retained balance below KSh 3,000 AND avg transaction size below KSh 450 triggers 60% retained balance discount (assumes 80 transactions/month baseline)", "Safaricom Annual Report FY2024 digital payments section"),
      entry("Seasonal Worker Override", "Uses lowSeasonRetainedBalance instead of 12-month average to prevent harvest/tourism peak extrapolation"),
      entry("Diaspora Remittances", "100% excluded from base income — transfer payments, not domestic earnings"),
      entry("Refugee/IDP Override", "Automatic indigent routing to KSh 300/month subsidized tier"),
      entry("Age Override (Pensioner)", "Age 65+ AND no car AND retained balance below KSh 5,000 triggers automatic indigent classification"),
      entry("Child-Headed Household", "Head age below 21 AND household size above 1 triggers automatic indigent classification"),
      entry("Consent-Withheld Pathway", "Citizens exercising DPA Section 32 right to withhold data consent are routed to CHP manual verification without algorithmic penalty"),

      // --- 8. Digital Ghost ---
      new Paragraph({ text: "8. Digital Ghost Parameters", heading: HeadingLevel.HEADING_2 }),
      entry("Trigger Conditions", "No active KRA PIN (PAYE/BUSINESS) AND no NTSA registration AND no SACCO account AND M-Pesa gross below KSh 1,000/month AND zero declared assets"),
      entry("SACCO Bypass (NEW in v2.1)", "Citizens with an active SACCO account bypass the Digital Ghost hold — recognizes offline formal financial inclusion"),
      entry("Verification Window", "90-day CHP (Community Health Promoter) physical verification"),
      entry("Provisional Status", "Indigent subsidy granted provisionally pending verification"),

      // --- 9. Fraud Engine ---
      new Paragraph({ text: "9. Fraud Engine Parameters", heading: HeadingLevel.HEADING_2 }),
      entry("Total Flags", "18 (expanded from 9 in initial v2.0)"),
      entry("Phantom Dependent Threshold", "Household size above 12 members (confidence: 0.85)"),
      entry("Multi-SIM Confidence", "0.60 base (reduced from 0.85) — upgraded to 0.80 if gross M-Pesa exceeds KSh 50,000. Prevents false positives for legitimate dual-SIM business/personal splits."),
      entry("County Switch Window", "90 days — IPRS residence change within this window triggers Flag 15"),
      entry("Fuliza Abuse Threshold", "8 or more active defaults triggers Flag 4 (confidence: 0.65)"),
      entry("Multi-Vehicle Tolerance", "1 extra vehicle above declared count before Flag 16 triggers"),
      entry("Risk Percentile", "0-100 scale. Above 50 = manual review recommended. Above 70 = escalate to SHA Fraud Officer."),
      entry("DPA Compliance", "No automated rejection. All critical flags route to human-in-the-loop review per DPA Section 35."),

      // --- 10. Revenue ---
      new Paragraph({ text: "10. Revenue Model Parameters", heading: HeadingLevel.HEADING_2 }),
      entry("Total Target Population", "15.5 million informal sector households"),
      entry("Average Monthly Contribution", "KSh 520 (reduced from KSh 575 due to new vulnerability exemptions)"),
      entry("Breakeven Compliance Rate", "40% (increased from 36% in v2.0)"),
      entry("Projected Revenue at Target", "KSh 4.84 billion/month at 60% compliance"),
      entry("Compliance Uplift Factor", "1.15x (15% projected increase in voluntary compliance due to perceived fairness)", "ILO studies on equitable social insurance systems in LMICs"),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('C:\\Users\\STD USER\\Desktop\\work\\SHA\\docs\\ASSUMPTIONS.docx', buffer);
  console.log("ASSUMPTIONS.docx updated successfully");
});
