const fs = require('fs');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: "Algorithmic Blind Spots & Gaps (SHA Means Testing)",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "While the implementation of the PMT v2.1 algorithm resolves significant structural biases and proxy inaccuracies present in the baseline Lasso model, several known blind spots remain. These gaps represent edge cases where the algorithm may still misclassify citizens or fail to capture true economic capacity.",
            }),
          ],
        }),
        new Paragraph({
          text: "1. The Agrarian Land Valuation Paradox",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Currently, the algorithm assesses land ownership using a static ASAL_COUNTIES boolean check to apply an 80% discount to pastoralist counties.\n",
            }),
            new TextRun({ text: "• The Gap: ", bold: true }),
            new TextRun({ text: "This binary classification ignores intra-county variations. A citizen owning 2 acres of highly fertile, irrigated land in Kiambu is treated the same as a citizen owning 2 acres of barren, non-arable land in a dry sub-county of Kiambu.\n" }),
            new TextRun({ text: "• The Risk: ", bold: true }),
            new TextRun({ text: "Overcharging subsistence farmers on poor soil, while undercharging commercial farmers with high-yield crops.\n" }),
            new TextRun({ text: "• Future Solution: ", bold: true }),
            new TextRun({ text: "Integrate geospatial data layers mapping soil arability and localized rainfall metrics to land parcels via the Ministry of Lands." }),
          ],
        }),
        new Paragraph({
          text: "2. Unregistered Informal Debt",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "The algorithm heavily penalizes digital debt (Fuliza, M-Shwari defaults) by deducting it from the AGI, acknowledging that borrowing for consumption indicates financial distress.\n",
            }),
            new TextRun({ text: "• The Gap: ", bold: true }),
            new TextRun({ text: "The model cannot see unregistered, informal debt such as borrowing from local shopkeepers, family members, or unlicensed shylocks.\n" }),
            new TextRun({ text: "• The Risk: ", bold: true }),
            new TextRun({ text: "Citizens trapped in informal debt spirals may appear to have higher net liquidity than they actually do, leading to over-assessment of their SHA contributions.\n" }),
            new TextRun({ text: "• Future Solution: ", bold: true }),
            new TextRun({ text: "Use secondary KRA indicators (e.g., zero turnover filings) alongside prolonged periods of low M-Pesa balances to infer high informal debt burdens." }),
          ],
        }),
        new Paragraph({
          text: "3. High-Value Non-Motorized Assets",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Asset verification relies heavily on the NTSA TIMS database for registered motor vehicles.\n",
            }),
            new TextRun({ text: "• The Gap: ", bold: true }),
            new TextRun({ text: "The algorithm currently overlooks high-value assets that do not require NTSA registration. Examples include high-end agricultural machinery (tractors not used on public roads), large fishing vessels in coastal and lake regions, and heavy construction equipment.\n" }),
            new TextRun({ text: "• The Risk: ", bold: true }),
            new TextRun({ text: "Wealthy individuals holding capital in unregistered heavy machinery or maritime assets may successfully spoof indigence.\n" }),
            new TextRun({ text: "• Future Solution: ", bold: true }),
            new TextRun({ text: "Cross-reference agricultural subsidies or maritime licensing databases." }),
          ],
        }),
        new Paragraph({
          text: "4. Nomadic Pastoralist Fluidity",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "The model groups assessments into strict county boundaries to apply Cost of Living (CoL) tiers and land discounts.\n",
            }),
            new TextRun({ text: "• The Gap: ", bold: true }),
            new TextRun({ text: "Nomadic pastoralists frequently cross county and national borders in search of pasture, rendering the concept of a \"primary county of residence\" fluid.\n" }),
            new TextRun({ text: "• The Risk: ", bold: true }),
            new TextRun({ text: "Flag 10 (Geographic Impossibility) triggers a fraud alert if a citizen is assessed in multiple counties. A pastoralist family moving between Samburu and Marsabit might be incorrectly flagged for fraud, delaying their access to healthcare.\n" }),
            new TextRun({ text: "• Future Solution: ", bold: true }),
            new TextRun({ text: "Implement a specific isNomadic demographic flag that bypasses the multi-county fraud check for verified pastoralist communities." }),
          ],
        }),
        new Paragraph({
          text: "5. Medical Expense Attrition (CHE)",
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "The algorithm currently uses a boolean hasChronicIllness toggle.\n",
            }),
            new TextRun({ text: "• The Gap: ", bold: true }),
            new TextRun({ text: "This binary approach fails to capture the catastrophic variance in healthcare costs. A citizen managing controlled hypertension with generic drugs is treated identically to a citizen undergoing aggressive, out-of-pocket cancer treatment.\n" }),
            new TextRun({ text: "• The Risk: ", bold: true }),
            new TextRun({ text: "Citizens facing catastrophic out-of-pocket medical expenses that drain their liquidity before it registers as \"retained balance\" will be assigned an unaffordable monthly SHA premium.\n" }),
            new TextRun({ text: "• Future Solution: ", bold: true }),
            new TextRun({ text: "Connect directly to the Ministry of Health's electronic health records (EHR) to dynamically calculate an annualized catastrophic health expenditure (CHE) deduction." }),
          ],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync('C:\\Users\\STD USER\\Desktop\\work\\SHA\\KNOWN_BLIND_SPOTS.docx', buffer);
  console.log("Document created successfully");
});
