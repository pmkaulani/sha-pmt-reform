# Tax Mode (concept)

Tax Mode applies the SHA PMT Reform method to **informal-sector tax assessment**. It was added for the KCA TaxNovation Challenge 2026. It is a concept demo, not a KRA product, and not tax advice.

## The idea

Informal traders often have no payslip or books, so tax authorities have to estimate their income. The same engine used for SHA premiums can do this: estimate income, take off the costs a trader cannot avoid, apply the tax rules, and print every step on a receipt the trader can check and challenge.

| Step | SHA premium | Tax Mode |
|---|---|---|
| 1. Estimate | Household income from profile and records | Annual sales from declared sales, cross-checked against mobile-money inflows (with consent) |
| 2. Allowances | Seven household deductions | Running costs (from the trader's own records if they keep them, otherwise the typical ratio for the business type), business-loan repayments (capped), tools and equipment (capped), only the months actually traded |
| 3. Rate | 2.75% (set by law) | Resident individual income tax bands and personal relief |
| 4. Receipt | Plain-language deduction receipt | Plain-language assessment receipt: each band, total owed, an instalment choice, a valid-until date and a challenge route |
| Fallback | Community health promoter verifies within 90 days | Field officer verifies a provisional assessment within 90 days |

## How it compares with turnover tax

Turnover tax (TOT) charges **1.5% of gross sales, with no expenses allowed**, and only for annual turnover **above KSh 1,000,000 and up to KSh 25,000,000** (KRA, *Everything About Turnover Tax*, revised October 2024, which gives 1.5% effective 19 March 2024). The rate was 3% from 1 July 2023 until then, so guides written in 2023 and early 2024 show 3%. Two consequences the demo makes visible:

- A **low-margin** trader, for example a kiosk, pays 1.5% of sales even when costs eat most of the revenue. Tax Mode follows what the business keeps.
- A trader **below KSh 1,000,000** is outside turnover tax entirely, so there is no simple way to assess them today. Tax Mode still produces a receipt, which keeps them on the register even when the result is nil after personal relief.

A **high-margin** trader pays more under Tax Mode than under turnover tax. That is the intended ability-to-pay effect, but it is also a revenue and policy question for KRA, not something this demo settles.

## What comes from published rules and what is a placeholder

**Published rules (confirm against kra.go.ke and the current Finance Act before relying on them):**

- Turnover tax: 1.5% of gross sales from 19 March 2024 (3% before that, from 1 July 2023), no expense deductions, turnover above KSh 1,000,000 up to KSh 25,000,000. Source: KRA, *Everything About Turnover Tax*, revised October 2024. KRA's older publication and several guides still show 3%, and KRA's own web pages have been inconsistent, so check the current figure on kra.go.ke.
- Resident individual bands: 10% on the first KSh 288,000, 25% on the next KSh 100,000, 30% on the next KSh 5,612,000, 32.5% on the next KSh 3,600,000, 35% above that. Personal relief of KSh 28,800 a year (KSh 2,400 a month). These are the Finance Act 2023 rates as published by KRA and tax guides. The Finance Act 2026 (assented 23 June 2026, mostly effective 1 July 2026) summaries we found list no change to turnover tax, the bands or personal relief, but **the Act's own text was not checked**.
- Taxes use annual figures, and personal relief is applied once a year, so a trader who works only some months still gets the full annual relief.

**Illustrative placeholders (not from KRA, the Income Tax Act or any sector survey):**

- Typical running costs by business type (`TAX_BUSINESS_TYPES` in `sha-mvp/src/lib/TaxMode.js`). Real values would come from sector surveys.
- Loan allowance cap (20% of sales), equipment allowance cap (10% of sales), the cross-check tolerance (25%) and the payment-channel review threshold (3 changes).
- The records review margin (15 points above the typical cost ratio), the second-officer threshold (25% change), the audit sampling rate (one in five), the validity period (12 months), the 90-day verification window and the 30-day appeal target. All are in `TAX_DEFAULT_PARAMS`.

## Safeguards built into the demo

- **Consent first.** If a trader does not share mobile-money records, no penalty applies and the inflows are ignored entirely. The assessment is provisional until an officer verifies it.
- **Cross-check, not punishment.** If inflows are well above declared sales, the cross-checked figure is used, and the trader can correct the share of inflows that was not business money.
- **Payment-channel changes** (many till or paybill changes in 12 months) route the case to an officer for review. The algorithm itself applies no penalty.
- **Allowances are capped and applied in order**, so they can never take assessed income below zero, and every line on the receipt adds up.
- **Seasonality.** Only the months actually traded are assessed.

## Features added after the first version

- **"I keep records" option.** A trader who keeps a record of running costs enters them, and the receipt uses those costs instead of the typical ratio for the business type. Costs are capped at turnover. If records show costs more than 15 points above the typical ratio, the case is flagged for an officer to ask to see the records, with no penalty. This takes the cost-ratio guess out of the assessment for traders who can document costs. Tanzania's presumptive tax follows a similar idea: fixed amounts for traders without records, and a route to audited accounts for those with them.
- **Officer override with a logged reason.** An officer can change the assessed monthly sales, but only with a reason code (site visit, documents seen, evidence of unreported sales, seasonal correction, data error), an evidence reference and a logged officer ID. A change above 25% in either direction needs a second officer, and until that approval the system estimate stands. All changes above 25% and about one in five of the others are sampled for audit. A site visit clears the provisional status. The point is to make discretion visible, so that neither inflating nor shaving an estimate can happen without a record.
- **Valid until, and a yearly refresh.** Each receipt shows the date it was assessed, a valid-until date 12 months later (month-end and leap-year dates are clamped, so 29 Feb 2024 becomes 28 Feb 2025), and the date by which an officer must verify it if it is provisional (90 days).
- **Total owed and instalments.** The receipt shows the total owed and lets the trader choose to pay once, quarterly (4) or monthly (12). Whole-shilling instalments always add up exactly to the total, with the first instalments carrying any remainder. A nil result is shown as a nil return. Due dates and payment channels are not modelled.
- **Appeals target.** The receipt states a proposed target of 30 days for deciding a challenge. This is a design proposal, not a KRA service standard.

## Calibrating the cost ratios with real data

The typical-cost ratios are placeholders. To replace them with evidence, collect survey rows (business type, sales, costs over the same period) and run:

```bash
cd sha-mvp
node calibrate_costs.mjs survey.csv [minRowsPerType]
```

CSV header: `businessType,sales,costs`. Lines starting with `#` are ignored. Business types must be `KIOSK`, `GREENGROCER`, `FOOD`, `FARM_PRODUCE`, `BODA`, `ARTISAN` or `SALON`. The script prints the median, quartiles and a suggested ratio for each type, and gives a suggestion only for types with at least 30 usable rows (adjustable). It reports unusable and unknown-type rows. `sample_calibration.csv` is **synthetic demo data** that only shows the format. We have not verified that any national survey (for example the KNBS 2016 MSME survey) publishes cost or margin data at the level needed. Check that before relying on it, and record the data source here when the ratios are updated.

## Fairness check on synthetic traders

`sha-mvp/src/lib/TaxFairness.js` generates a seeded set of made-up traders, each with a "true" cost ratio that differs from the typical ratio by random noise, and compares how much of true income each method takes and how often the typical-cost benchmark over- or under-states income by more than 20%. The Tax Mode screen has a panel that runs it. **It is not evidence**: the results follow from the placeholder ratios and the noise assumed. Its value is the method. With real survey data in place of the synthetic traders, the same check would show which kinds of trader each method over-burdens. With synthetic data it already shows two things that hold by construction: turnover tax weighs heaviest on low-margin businesses, and a typical-cost benchmark misstates income for traders whose costs differ from the norm, which is the reason for the records option.

## Evidence behind these choices

- Ethiopia (Addis Ababa) presumptive tax case study, ICTD Working Paper 94: a case study of how presumptive assessment worked in practice. It informs the focus on visible officer discretion and a fast route to challenge, not any specific figure.
- Tanzania Revenue Authority presumptive tax: fixed amounts for traders without records, 3% for traders with records, and a route to audited accounts. This informs the records option.
- IMF work on turnover-tax design: a model result suggests a rate around 2.5% balances revenue and distortion. This is a model result, not a Kenyan finding.
- Hybrid PMT and community-targeting research (arXiv 2201.01356): informs combining a formula with local verification.
- Finance Act 2026 (EY summary): prepopulated returns that taxpayers confirm or amend, and eTIMS data as an assessment source. The receipt-and-confirm design is compatible with this direction. Its effect on the turnover-tax and band figures above has not been checked.

## What the law says that the demo does not model

- **TOT is filed monthly.** The return and payment are due on the 20th of the month after the sales month, and nil returns are required. Tax Mode assesses a year and offers instalments, which is a simplification.
- **TOT is a final tax and traders can opt out** by written notice, after which ordinary income tax rules apply. Tax Mode is closest to the opt-out route, with a presumptive cost allowance replacing books.
- **Income TOT does not cover:** rental income, professional or management fees, and income already taxed by final withholding.
- **VAT:** a TOT taxpayer with taxable supplies of KSh 5,000,000 or more in 12 months must also register for VAT.
- **Low take-up:** a Business Daily column, citing KRA data, reports average annual TOT registrations of about 797 (2008-09 to 2018-19) against about 4,803 (2019-20 to 2022-23), and says collections are well below what official data suggests is possible. That gap is the problem a simpler, transparent assessment is aimed at, though we have no evidence yet that Tax Mode would close it.
- **Finance Act 2026 (EY and other summaries):** prepopulated returns that taxpayers confirm or amend, eTIMS data usable in assessments, a penalty of the higher of 5% of tax or KSh 10,000 for individuals for e-invoicing and electronic-filing failures within their control (after a KRA request for reasons), an amnesty on penalties and interest for periods to 31 December 2025 if the principal is paid by 31 December 2026, and an individual return deadline moved to the end of the fourth month from 1 January 2027.

## What it does not do

- It is not validated on real data.
- It does not connect to KRA, M-Pesa or any API. Inputs are typed in.
- It does not model VAT, rental income, withholding tax or other levies.
- Adapting the allowances to the Income Tax Act needs tax-law review.
- Sharing one assessment between SHA and tax would need privacy and data-sharing safeguards under the Data Protection Act 2019.

## Try it

```bash
cd sha-mvp
npm install
npm run dev          # open app.html, switch to "Tax Mode" in the header
npm run verify:tax   # checks for the engine, override, dates, instalments, fairness check and calibration (hand-computed cases and random cases)
```
