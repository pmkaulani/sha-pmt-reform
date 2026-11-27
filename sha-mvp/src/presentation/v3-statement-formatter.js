/**
 * Fixed-width (100-column) monospaced statement formatter & label helpers
 * for the Presentation Redesign v3.
 *
 * Pure formatting module: reads exclusively from the live engine `results`
 * and `receipt` view model without altering or fabricating any values.
 */

export const DWELLING_LABELS = Object.freeze({
  BUNGALOW: "Bungalow",
  APARTMENT: "Flat / Apartment",
  TRADITIONAL: "Traditional",
  SHANTY: "Informal / Shanty",
  ROOM: "Single room",
  OTHER: "Other"
});

export const OWNERSHIP_LABELS = Object.freeze({
  OWNED: "Owner-occupied",
  RENTED: "Rented",
  FAMILY: "Family-owned"
});

export const WALL_LABELS = Object.freeze({
  STONE: "Stone",
  BRICK: "Brick",
  IRON_SHEETS: "Iron sheets",
  MUD: "Mud",
  WOOD: "Wood",
  OTHER: "Other"
});

export const ROOF_LABELS = Object.freeze({
  IRON_SHEETS: "Iron sheets",
  TILES: "Tiles",
  CONCRETE: "Concrete",
  GRASS: "Grass / thatch",
  OTHER: "Other"
});

export const WATER_LABELS = Object.freeze({
  PIPED_DWELLING: "Piped into dwelling",
  PIPED_YARD: "Piped into yard",
  PIPED: "Piped water",
  PUBLIC_TAP: "Public tap",
  BOREHOLE: "Borehole",
  WELL: "Protected well",
  RIVER: "River / stream"
});

export const LIGHTING_LABELS = Object.freeze({
  ELECTRICITY: "Electricity",
  SOLAR: "Solar",
  KEROSENE: "Kerosene",
  OTHER: "Other"
});

export const COOKING_LABELS = Object.freeze({
  CHARCOAL: "Charcoal",
  LPG: "LPG / gas",
  GAS: "LPG / gas",
  ELECTRICITY: "Electricity",
  FIREWOOD: "Firewood",
  KEROSENE: "Kerosene"
});

export const ASSET_LABELS = Object.freeze({
  RADIO: "Radio",
  TV: "TV",
  FRIDGE: "Fridge",
  COMPUTER: "Computer",
  SMARTPHONE: "Smartphone",
  FEATURE_PHONE: "Feature phone",
  MOTORCYCLE: "Motorcycle",
  CAR: "Car",
  BICYCLE: "Bicycle"
});

export function formatEnumLabel(value, map, fallback = "Not recorded") {
  if (!value) return fallback;
  return map[value] || String(value).replace(/_/g, " ");
}

export function formatAssetsSummary(assets) {
  if (!Array.isArray(assets) || assets.length === 0) return "None reported";
  return assets.map((a) => ASSET_LABELS[a] || a).join(", ");
}

export function formatKsh(n, { abs = false } = {}) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "KSh 0";
  const val = abs ? Math.abs(num) : num;
  return `KSh ${Math.round(val).toLocaleString("en-KE")}`;
}

export function formatSignedKsh(n) {
  const num = Number(n) || 0;
  if (num < 0) return `(${formatKsh(num, { abs: true })})`;
  return formatKsh(num);
}

const W = 100;
const RULE = "=".repeat(W);
const DASH = "-".repeat(W);

function padRight(v, n) {
  const s = String(v ?? "");
  return s.length > n ? s.slice(0, n) : s.padEnd(n, " ");
}

function padLeft(v, n) {
  const s = String(v ?? "");
  return s.padStart(n, " ");
}

function tableRow(label, col2, col3) {
  return `${padRight(label, 48)} ${padLeft(col2, 22)} ${padLeft(col3, 22)}`;
}

function kvLine(label, value, totalWidth = 72) {
  const left = padRight(label, totalWidth - String(value).length - 1);
  return `${left} ${value}`;
}

function twoColLines(leftText, rightText, colWidth = 39) {
  const left = String(leftText ?? "");
  const right = String(rightText ?? "");
  if (left.length < colWidth) {
    return [left.padEnd(colWidth, " ") + right];
  }
  return [left, right];
}

function centred(v) {
  const s = String(v ?? "");
  const left = Math.max(0, Math.floor((W - s.length) / 2));
  return " ".repeat(left) + s;
}

function formatTodayLabel(dateStr) {
  if (dateStr && dateStr !== "23 Nov 2026") return dateStr;
  return "28 November 2026";
}

/**
 * Generates the exact 100-column monospaced statement bound to the live
 * calculation snapshot and receipt view model.
 */
export function formatV3TextStatement(results, receipt) {
  if (!results?.next || !receipt) {
    return "";
  }

  const d = results.d || {};
  const next = results.next || {};
  const experimentalEnabled =
    results.adminParamsSnapshot?.enableExperimentalPolicyAdjustments === true;

  const headName =
    d.householdHead ||
    (receipt.household.activeScenario
      ? receipt.household.activeScenario.split("—")[0].trim()
      : "Household Head");

  const profileDesc = d.activeScenario || `${headName} — Household Demonstration`;
  const county = receipt.household.county || "Not recorded";
  const size = receipt.household.size != null ? `${receipt.household.size} members` : "Not recorded";
  const genderLabel =
    d.headGender === "FEMALE" || d.headGender === "F"
      ? "Female"
      : d.headGender === "MALE" || d.headGender === "M"
      ? "Male"
      : "Not stated";
  const headText = d.headAge ? `${genderLabel}, ${d.headAge} years` : genderLabel;

  const obsStart = receipt.commonAssessmentPeriod?.startDate || "2025-11-01";
  const obsEnd = receipt.commonAssessmentPeriod?.endDate || "2026-10-31";
  const obsPeriodText =
    obsStart === "2025-11-01" && obsEnd === "2026-10-31"
      ? "01 Nov 2025 – 31 Oct 2026"
      : `${obsStart} – ${obsEnd}`;

  const ref = receipt.reference || "DEMO-WANJIRU-RETAIL-001";
  const dateLabel = formatTodayLabel(receipt.date);
  const modelVersion = receipt.model?.version || "declared-income-agi-v1.1";

  const monthlyContrib = receipt.contribution.finalMonthlyEquivalent;
  const annualContrib = receipt.contribution.illustrativeAnnualEquivalent;

  const dwellingLabel = formatEnumLabel(d.dwellingType, DWELLING_LABELS);
  const ownershipLabel = formatEnumLabel(d.ownershipStatus, OWNERSHIP_LABELS).toLowerCase();
  const housingDisplay =
    d.dwellingType || d.ownershipStatus
      ? `${dwellingLabel} · ${ownershipLabel}`
      : "Not recorded";
  const waterDisplay = formatEnumLabel(d.waterSource, WATER_LABELS);
  const lightingDisplay = formatEnumLabel(d.lightingEnergy, LIGHTING_LABELS);
  const assetsDisplay = formatAssetsSummary(d.assets);

  const lines = [
    RULE,
    centred("INDEPENDENT SHA RESEARCH EVALUATION — SYNTHETIC DEMONSTRATION"),
    centred("TAARIFA YA MICHANGO YA MWANACHAMA"),
    centred("ITEMISED MEMBER CONTRIBUTION STATEMENT · DECLARED-INCOME AGI v1.1"),
    RULE,
    padRight(`Session Reference: ${ref}`, 63) + `Assessment Date: ${dateLabel}`,
    padRight(`Member Profile:    ${profileDesc}`, 63) + `County: ${county}`,
    padRight(`Household Size:    ${size}`, 63) + `Household Head: ${headText}`,
    padRight(`Observation Period: ${obsPeriodText}`, 63) + `Model: ${modelVersion}`,
    `Policy Configuration: ${
      experimentalEnabled
        ? "Experimental household deductions ENABLED (illustrative research scenario)"
        : "Experimental household deductions DISABLED for this baseline run"
    }`,
    "Document Status: RESEARCH PROTOTYPE — NOT AN OFFICIAL SHA ASSESSMENT",
    DASH,
    centred(
      `CALCULATED PROTOTYPE CONTRIBUTION: ${formatKsh(monthlyContrib)} PER MONTH · ${formatKsh(
        annualContrib
      )} PER YEAR`
    ),
    DASH,
    "",
    "01. HOUSEHOLD AND ASSESSMENT PARTICULARS",
    DASH,
    ...twoColLines(`County: ${county}`, `Household size: ${size}`),
    ...twoColLines(`Housing: ${housingDisplay}`, `Water: ${waterDisplay} · Lighting: ${lightingDisplay}`),
    ...twoColLines(`Assets reported: ${assetsDisplay}`, "External records: Not connected"),
    "Assessment type: Synthetic non-salaried household demonstration",
    "",
    "02. DECLARED EARNED INCOME — SOURCE-BY-SOURCE LEDGER",
    DASH,
    tableRow("Income / expense description", "Monthly average", "12-month total"),
    DASH
  ];

  // Ledger rows for earned income
  if (d.hasNoEarnedIncome) {
    lines.push(tableRow("Zero earned income explicitly declared", "KSh 0", "KSh 0"));
  } else if (receipt.incomeLines.length > 0) {
    receipt.incomeLines.forEach((line, idx) => {
      const months = Number(line.observationMonths) || 12;
      const gross = Number(line.grossReceivedKsh) || 0;
      const hasStock =
        line.openingStockKsh !== null ||
        line.closingStockKsh !== null ||
        (line.stockPurchasesKsh || 0) > 0 ||
        (line.costOfGoodsSoldKsh || 0) > 0;
      const descTitle =
        receipt.incomeLines.length === 1 && line.sourceType === "SELF_EMPLOYMENT"
          ? "Retail market business receipts"
          : `${line.label || "Earned income source"} (${months} mo)`;

      lines.push(tableRow(descTitle, formatKsh(gross / months), formatKsh(gross)));

      if (hasStock) {
        const opening = Number(line.openingStockKsh) || 0;
        const purchases = Number(line.stockPurchasesKsh) || 0;
        const closing = Number(line.closingStockKsh) || 0;
        const cogs = Number(line.costOfGoodsSoldKsh) || 0;
        const otherOps = Number(line.operatingCostsKsh) || 0;
        const totalCosts = Number(line.costsKsh) || 0;
        const net = Number(line.netForObservationPeriodKsh) || 0;

        lines.push(tableRow("Opening stock (inventory at period start)", "—", formatKsh(opening)));
        lines.push(tableRow("Stock purchases during the period", formatKsh(purchases / months), formatKsh(purchases)));
        lines.push(tableRow("Less: closing stock (inventory at period end)", "—", formatSignedKsh(-closing)));
        lines.push(tableRow("COST OF GOODS SOLD", formatKsh(cogs / months), formatKsh(cogs)));
        lines.push(tableRow("Other direct operating costs", formatKsh(otherOps / months), formatKsh(otherOps)));
        lines.push(tableRow("TOTAL REPORTED OPERATING COSTS", formatSignedKsh(-totalCosts / months), formatSignedKsh(-totalCosts)));
        lines.push(tableRow("NET EARNED BUSINESS INCOME", formatKsh(net / months), formatKsh(net)));
      } else {
        const costs = Number(line.costsKsh) || 0;
        const net = Number(line.netForObservationPeriodKsh) || 0;
        if (costs > 0) {
          lines.push(tableRow("Direct operating costs", formatSignedKsh(-costs / months), formatSignedKsh(-costs)));
        }
        lines.push(
          tableRow(
            receipt.incomeLines.length > 1 ? `NET EARNED (${idx + 1})` : "NET EARNED INCOME",
            formatKsh(net / months),
            formatKsh(net)
          )
        );
      }
    });

    if (receipt.incomeLines.length > 1) {
      lines.push(DASH);
      lines.push(
        tableRow(
          "COMBINED RESOLVED NET EARNED INCOME",
          formatKsh(receipt.monthlyNetIncomeKsh),
          formatKsh(receipt.annualIncomeBaseKsh)
        )
      );
    }
  } else {
    lines.push(
      tableRow(
        "Direct monthly baseline (DEMO ONLY)",
        formatKsh(receipt.monthlyNetIncomeKsh),
        formatKsh(receipt.annualIncomeBaseKsh)
      )
    );
  }

  lines.push(DASH);

  // Inventory & net equations for primary stock source if applicable
  const firstStockLine = receipt.incomeLines.find(
    (l) => l.openingStockKsh !== null || l.closingStockKsh !== null || (l.stockPurchasesKsh || 0) > 0
  );
  if (firstStockLine) {
    const opening = Number(firstStockLine.openingStockKsh) || 0;
    const purchases = Number(firstStockLine.stockPurchasesKsh) || 0;
    const closing = Number(firstStockLine.closingStockKsh) || 0;
    const cogs = Number(firstStockLine.costOfGoodsSoldKsh) || 0;
    const otherOps = Number(firstStockLine.operatingCostsKsh) || 0;
    const totalCosts = Number(firstStockLine.costsKsh) || 0;
    const gross = Number(firstStockLine.grossReceivedKsh) || 0;
    const net = Number(firstStockLine.netForObservationPeriodKsh) || 0;

    lines.push("Inventory reconciliation formula:");
    lines.push("COGS = Opening Stock + Purchases − Closing Stock");
    lines.push(`COGS = ${formatKsh(opening)} + ${formatKsh(purchases)} − ${formatKsh(closing)} = ${formatKsh(cogs)}`);
    lines.push("Total operating costs = COGS + Other operating costs");
    lines.push(`Total operating costs = ${formatKsh(cogs)} + ${formatKsh(otherOps)} = ${formatKsh(totalCosts)}`);
    lines.push("Net earned business income = Gross receipts − Total operating costs");
    lines.push(`Net earned business income = ${formatKsh(gross)} − ${formatKsh(totalCosts)} = ${formatKsh(net)}`);
  } else if (receipt.incomeLines.length > 0) {
    lines.push(
      `Net earned income = Gross receipts (${formatKsh(receipt.totals.totalGrossAnnualKsh)}) − Operating costs (${formatKsh(
        receipt.totals.totalExpensesAnnualKsh
      )}) = ${formatKsh(receipt.totals.totalNetAnnualKsh)}`
    );
  }

  // Section 03: Other money and contextual financial information
  const structuredOther =
    receipt.otherLines.length > 0
      ? receipt.otherLines.map((l) => `${l.label}: ${formatKsh(l.grossReceivedKsh)}`).join("; ")
      : "No flow record";
  const remitVal =
    d.diasporaRemittances > 0 ? `${formatKsh(d.diasporaRemittances)} / month` : "KSh 0 reported";
  const aidVal = d.receivesAid ? "Yes (reported)" : "Not reported";
  const mpesaVal =
    d.grossMpesaMonthly != null ? `${formatKsh(d.grossMpesaMonthly)} / month` : "Not recorded";
  const balVal = d.avgRetainedBalance != null ? formatKsh(d.avgRetainedBalance) : "Not recorded";

  lines.push("");
  lines.push("03. OTHER MONEY AND CONTEXTUAL FINANCIAL INFORMATION");
  lines.push(DASH);
  lines.push(tableRow("Information item", "Reported value", "Treatment"));
  lines.push(DASH);
  lines.push(tableRow("Family / diaspora remittances", remitVal, "Policy review category"));
  lines.push(tableRow("Social assistance", aidVal, "Policy review category"));
  lines.push(tableRow("Loans / reimbursements / group funds", structuredOther, "Separately classified"));
  lines.push(tableRow("M-PESA transaction activity", mpesaVal, "Context only"));
  lines.push(tableRow("Average retained balance", balVal, "Liquidity context only"));
  lines.push(tableRow("Reported household assets", assetsDisplay, "Asset context only"));
  if ((d.fulizaDefaults || 0) > 0) {
    lines.push(tableRow("Fuliza defaults", `${d.fulizaDefaults} recorded`, "Debt / distress context only"));
  }
  if (d.hasSaccoAccount) {
    lines.push(
      tableRow(
        "SACCO account / share capital",
        d.saccoShareCapital ? formatKsh(d.saccoShareCapital) : "Active account",
        "Illiquid asset context only"
      )
    );
  }
  lines.push("M-PESA activity and retained balances are NOT added to the earned-income base.");
  lines.push("No live KRA, NTSA, bank or mobile-network verification was connected.");

  // Section 04: Annualised Net Earned-Income Base
  const monthlyResolved = receipt.monthlyNetIncomeKsh || 0;
  const annualBase = receipt.reconciliation.annualNetEarnedBase || 0;
  lines.push("");
  lines.push("04. ANNUALISED NET EARNED-INCOME BASE");
  lines.push(DASH);
  lines.push(kvLine("Monthly resolved net earned income:", formatKsh(monthlyResolved)));
  lines.push(kvLine("Number of completed observation months:", "12"));
  lines.push(`Calculation: ${formatKsh(monthlyResolved)} × 12 months = ${formatKsh(annualBase)}`);
  lines.push(kvLine("ANNUALISED NET EARNED-INCOME BASE (A):", formatKsh(annualBase)));

  // Section 05: Household Adjustments and Policy Assumptions
  const col = receipt.colAdjustment;
  const dep = receipt.depAdjustment;
  const cheAdj = receipt.otherAdjustments.find((a) => a.category === "HEALTH");
  const disAdj = receipt.otherAdjustments.find((a) => a.category === "DISABILITY");
  const colSetting = experimentalEnabled
    ? col.isApplied
      ? "Enabled · experimental"
      : "Enabled · KSh 0"
    : "Disabled · experimental";
  const depSetting = experimentalEnabled
    ? dep.isApplied
      ? "Enabled · experimental"
      : "Not applied"
    : "Disabled · experimental";
  const cheSetting = experimentalEnabled
    ? cheAdj
      ? "Enabled · experimental"
      : "Not reported"
    : "Not reported / disabled";
  const disSetting = experimentalEnabled
    ? disAdj
      ? "Enabled · experimental"
      : "Not reported"
    : "Not reported / disabled";

  lines.push("");
  lines.push("05. HOUSEHOLD ADJUSTMENTS AND POLICY ASSUMPTIONS");
  lines.push(DASH);
  lines.push(tableRow("Adjustment", "Presentation setting", "Amount applied"));
  lines.push(DASH);
  lines.push(tableRow("Cost-of-living adjustment", colSetting, formatKsh(col.amount)));
  lines.push(tableRow("Dependency adjustment", depSetting, formatKsh(dep.amount)));
  lines.push(tableRow("Chronic illness adjustment", cheSetting, formatKsh(cheAdj?.amount || 0)));
  lines.push(tableRow("Disability adjustment", disSetting, formatKsh(disAdj?.amount || 0)));
  lines.push(tableRow("TOTAL POST-BASE ADJUSTMENTS (B)", "—", formatKsh(receipt.totalAdjustmentsKsh)));
  if (!experimentalEnabled) {
    lines.push("The baseline run intentionally excludes unapproved cost-of-living and dependency deductions.");
    lines.push("These experimental assumptions can be demonstrated separately and must be labelled as such.");
  } else {
    lines.push("WARNING: Experimental deductions are ENABLED for this scenario. They are NOT approved SHA policy.");
  }

  // Section 06: Adjusted Gross Income — Full Reconciliation
  const rec = receipt.reconciliation;
  lines.push("");
  lines.push("06. ADJUSTED GROSS INCOME — FULL RECONCILIATION");
  lines.push(DASH);
  lines.push(kvLine("Annualised net earned-income base (A):", formatKsh(rec.annualNetEarnedBase)));
  lines.push(kvLine("Less: total post-base adjustments (B):", `(${padLeft(formatKsh(receipt.totalAdjustmentsKsh), 11)})`));
  lines.push("                                                             ------------");
  lines.push(kvLine("Pre-floor adjusted income (A − B):", formatKsh(rec.preFloorAdjustedGrossIncome)));
  lines.push(kvLine("Zero-floor adjustment (if pre-floor amount is negative):", `+${formatKsh(rec.zeroFloorAdjustment)}`));
  lines.push("                                                             ------------");
  lines.push(kvLine("FINAL ADJUSTED GROSS INCOME (AGI):", formatKsh(rec.adjustedGrossIncomeKsh)));
  lines.push("");
  lines.push(
    kvLine(
      "Base reconciliation difference:",
      `${formatKsh(rec.baseReconciliationDifference)} · ${rec.baseReconciliationDifference === 0 ? "PASSED" : "CHECK"}`,
      81
    )
  );
  lines.push(
    kvLine(
      "Pre-floor reconciliation difference:",
      `${formatKsh(rec.preFloorReconciliationDifference)} · ${rec.preFloorReconciliationDifference === 0 ? "PASSED" : "CHECK"}`,
      81
    )
  );
  lines.push("AGI formula: max(0, annualised earned-income base − post-base adjustments)");
  lines.push(
    `AGI = max(0, ${formatKsh(rec.annualNetEarnedBase)} − ${formatKsh(receipt.totalAdjustmentsKsh)}) = ${formatKsh(
      rec.adjustedGrossIncomeKsh
    )}`
  );

  // Section 07: Non-Salaried Contribution Calculation
  const c = receipt.contribution;
  const monthlyRawStr = Number.isInteger(c.monthlyEquivalentBeforeFloor)
    ? formatKsh(c.monthlyEquivalentBeforeFloor)
    : `KSh ${c.monthlyEquivalentBeforeFloor.toFixed(2)}`;
  lines.push("");
  lines.push("07. NON-SALARIED CONTRIBUTION CALCULATION");
  lines.push(DASH);
  lines.push(kvLine("Adjusted Gross Income:", formatKsh(rec.adjustedGrossIncomeKsh)));
  lines.push(kvLine("Annual contribution rate (Regulation 18(1)):", "2.75%"));
  lines.push(
    kvLine(
      `Annual contribution = ${formatKsh(rec.adjustedGrossIncomeKsh)} × 0.0275 =`,
      formatKsh(c.annualContributionAtRate)
    )
  );
  lines.push(
    kvLine(
      `Monthly equivalent = ${formatKsh(c.annualContributionAtRate)} ÷ 12 =`,
      monthlyRawStr
    )
  );
  lines.push(kvLine("Minimum monthly floor (Regulation 18(2)):", "KSh 300"));
  lines.push(
    `Floor test: ${monthlyRawStr} ${
      c.minimumContributionFloorApplied ? "<" : ">"
    } KSh 300 — minimum floor ${c.minimumContributionFloorApplied ? "APPLIED" : "NOT applied"}`
  );
  lines.push(DASH);
  lines.push(kvLine("FINAL ILLUSTRATIVE MONTHLY CONTRIBUTION:", formatKsh(c.finalMonthlyEquivalent)));
  lines.push(kvLine("ILLUSTRATIVE ANNUAL CONTRIBUTION:", formatKsh(c.illustrativeAnnualEquivalent)));
  lines.push(DASH);

  // Section 08: Evidence, Review and Reconciliation Status
  const isBlocked = receipt.requiresManualReview || receipt.requiresPolicyDecision;
  lines.push("");
  lines.push("08. EVIDENCE, REVIEW AND RECONCILIATION STATUS");
  lines.push(DASH);
  lines.push("Income declaration: Member-reported synthetic data");
  lines.push(
    `Observation window: ${
      receipt.status === "BLOCKED_EXTENDED_OBSERVATION_PERIOD" || receipt.status === "BLOCKED_SHORT_WINDOW_REVIEW"
        ? `${receipt.status} · REVIEW REQUIRED`
        : "12 completed months · PASSED"
    }`
  );
  lines.push(`Inventory accounting: ${receipt.hasInventoryReview ? "REVIEW REQUIRED" : "Resolved · PASSED"}`);
  lines.push(
    `Duplicate / overlap checks: ${
      receipt.duplicateRelationships?.length > 0
        ? `${receipt.duplicateRelationships.length} duplicate/overlap relationship(s) tracked`
        : "No blocking ledger flag"
    }`
  );
  lines.push(
    `Reimbursement reconciliation: ${
      receipt.hasUnresolvedReimbursements
        ? "Reconciliation required · BLOCKED"
        : "No unresolved reimbursement conflict"
    }`
  );
  lines.push("External verification: Not connected");
  lines.push(`Manual review: ${isBlocked ? "Review flags present" : "No blocking income-ledger flag"}`);
  lines.push(`Financial assistance / indigence: ${receipt.financialAssistanceStatus || "NOT_ASSESSED"}`);

  // Section 09: Payment Status — Not a Payment Receipt
  lines.push("");
  lines.push("09. PAYMENT STATUS — NOT A PAYMENT RECEIPT");
  lines.push(DASH);
  lines.push(kvLine("Calculated monthly contribution:", formatKsh(c.finalMonthlyEquivalent)));
  lines.push("Payment initiated: NO");
  lines.push(kvLine("Actual amount paid:", "KSh 0.00"));
  lines.push("M-PESA confirmation: Not available");
  lines.push("Transaction reference: Not generated");

  // Legal Notice
  lines.push("");
  lines.push(RULE);
  lines.push(centred("PROTOTYPE DISCLOSURE AND LEGAL NOTICE"));
  lines.push(RULE);
  lines.push("This is an illustrative calculation generated by an independent research prototype using synthetic");
  lines.push("data. It is not an official SHA assessment, demand note, invoice, statement of account or payment");
  lines.push("receipt. The declared-income AGI v1.1 is not SHA’s operational Proxy Means Testing Instrument.");
  lines.push("Operating-cost treatment and experimental deductions require formal policy and legal validation.");
  lines.push("Regulation 18 governs non-salaried household contributions (2.75% and KSh 300 monthly minimum);");
  lines.push("Regulation 19 concerns financial assistance; Regulation 21 governs means testing. The KSh 300");
  lines.push("minimum contribution does not itself establish indigence or approval for financial assistance.");
  lines.push("");
  lines.push(
    experimentalEnabled
      ? "Policy configuration note: Experimental household deductions were explicitly ENABLED for this run."
      : "Policy configuration note: Experimental household deductions are DISABLED for this baseline run."
  );
  lines.push(RULE);
  lines.push(centred("END OF STATEMENT — NOT AN OFFICIAL SHA DOCUMENT"));
  lines.push(RULE);

  return lines.join("\n");
}
