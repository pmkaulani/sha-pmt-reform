# SHA PMT Reform — Prototype Proposal for Kenya

**Social Health Authority (SHA) Means-Testing Algorithm Reform**

A prototype policy and software proposal exploring whether a transparent Adjusted Gross Income (AGI) rules engine could improve on proxy-based means testing. The proposal is intended for independent technical, legal and policy evaluation; it is not an approved SHA replacement or a certified compliant system.

---

## The Problem

Under the **Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024, published in Kenya Gazette Supplement No. 60, Legislative Supplement No. 28, on 8 March 2024)**, Regulation 21(6) prescribes that means testing shall be conducted using the formula set out in the Fifth Schedule (Gazette p. 798):
$$\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$$
where $\log(y)^u$ is log per-capita income, $a^u$ is a structural parameter, $b^uX_h^u$ are household-specific indicators, $c^uZ_{hi}^u$ are individual-specific indicators, $\varepsilon_h^u$ are estimation errors, $u$ denotes urban or rural strata, and $X, Z$ are matrices of indicators or correlates of income. Regulation 21(3) separately identifies broad socioeconomic data domains (housing characteristics, access to basic services, household composition and characteristics). The Fifth Schedule itself does not enumerate 43 specific variables or list every individual asset.

In November 2025, in response to an Access to Information request, SHA disclosed that its operational model—developed using the 2021 Kenya Continuous Household Survey (KCHS, ~17,000 households)—uses 43 variables across separate urban and rural submodels predicting log per-capita *consumption*. 

An independent econometric reconstruction of SHA's model by *Lighthouse Reports* (published 4 May 2026), in collaboration with *Africa Uncensored* and *The Guardian*, revealed severe structural inaccuracies:
- **Overpredicts consumption for the poorest:** Among the poorest households, approximately 16% are classified correctly, while about 80% have their consumption overpredicted—subjecting indigent families to premiums they cannot afford.
- **Severe rural-urban disparity:** The model achieves an $R^2$ of **0.66** for the urban submodel, but drops to **0.46** for the rural submodel, meaning more than half the variance in rural household living standards is unaccounted for.
- **Large-scale misclassification:** Among the bottom 40% of households, 39% are erroneously predicted to fall above that welfare band. In the bottom 25%, more than half are misclassified upward.
- **Systematic demographic penalties:** Poor households with basic electricity access and poor female-headed households are significantly more likely to be misclassified as non-poor (modeling in Lighthouse Reports' interactive audit identified exclusion errors reaching 56% for electrified poor households and 65% for female-headed poor households, compared to 34% for male-headed households).
- **Methodological caveats:** As noted by Lighthouse Reports, this analysis reflects an external reconstruction of the disclosed formula and variables; real-world self-reporting and field verification could affect live scores; and the study evaluated the existing regression without benchmarking PMT against alternative targeting architectures.

### Pre-Deployment Warnings & IDinsight Review

The model's inequities were documented before rollout:
- **Internal warnings:** A previously unpublished report by global advisory firm IDinsight, completed shortly before the October 2024 launch, found the model inequitable—particularly for low-income households—and warned that the 2021 KCHS training dataset was outdated.
- **Fundamentally flawed architecture:** Investigative reporting by *Africa Uncensored* revealed that consultants viewed the resulting inequities as structural deficiencies that could not fundamentally be corrected through minor parameter tuning.
- **Alternative design limitations:** Lighthouse Reports also tested IDinsight's proposed two-step logistic design and found it yielded lower overall classification accuracy (47% placed in the correct final band, compared to 54% for the linear OLS model), demonstrating that swapping statistical models without instituting statutory deduction baselines and procedural safeguards remains insufficient.

### Transparency & Algorithmic Opacity

- **Access to Information request (2025):** In August 2025, *Africa Uncensored* formally requested the model's mathematical formula, input variables, and weighting coefficients under the Access to Information Act.
- **Ombudsman direction:** After SHA failed to acknowledge the request, the Commission on Administrative Justice (CAJ / Ombudsman) ordered SHA to respond.
- **Withheld coefficients:** In November 2025, SHA disclosed the 43 variables and model formula, but withheld the regression coefficients, leaving the empirical weights used to assess household wealth concealed from the public.

### Parliamentary & Judicial Interventions

- **Health Committee findings (March 2026):** The National Assembly Health Committee cautioned SHA officials that the fund faces grave sustainability risks, reporting monthly collections of approximately KSh 7.4 billion against recurrent costs of roughly KSh 7.2 billion, leaving virtually no margin for operational shocks. An earlier committee inquiry found that SHA had failed to implement transparent means testing as required by Section 27(2)(c) of the Social Health Insurance Act, and noted that mandatory lump-sum annual premiums excluded low-income households. *(Note: This project argues that informal-sector non-compliance is driven in substantial part by unaffordable algorithmic assessments and procedural opacity).*
- **High Court constitutional ruling (March 19, 2026):** In *Okoiti & 2 others v Cabinet Secretary, Ministry of Health & 20 others [2026] KEHC 3972 (KLR)*, the High Court held that Legal Notices 48, 49, 146, and 147 of 2024 were validly made, confirming that the Senate motion to annul Legal Notices 48 and 49 did not pass the required threshold. The Court directed corrective action that includes implementing fair and effective means-testing mechanisms for non-salaried persons. *(Note: The judgment affirms statutory validity, not SHA's algorithmic accuracy, fairness, or predictive performance; unverified appeal or stay status remains subject to legal confirmation).* On the same date, in a complementary constitutional challenge (Justice Bahati Mwamuye), the court issued a 90-day structural interdict ordering the Ministry of Health to file a comprehensive affidavit detailing corrective rollout measures.
- **Revocation of LN 147/2024:** Legal Notice No. 55 of 2025, clause 9, revokes the Social Health Insurance (Amendment) Regulations, 2024 (LN 147 of 2024). It does *not* revoke the principal Legal Notice No. 49 of 2024.

---

## The Solution — Declared-income AGI v1 & Original AGI v2.1

The prototype explores alternative computational methods for assessing non-salaried households under Regulation 18(1)–(2). Rather than assessing gross presumed expenditure from unadjusted asset proxies, the candidate models evaluate **candidate research-informed adjustments** applied to the assessment base prior to calculating the statutory 2.75% contribution rate.

> [!IMPORTANT]
> **Candidate Research Methodology:** These deduction rules and contextual adjustments are research hypotheses formulated to test equity and affordability impacts. They require empirical validation against KNBS microdata and SHA's official means-testing instrument, and are **not** established statutory entitlements under Regulation 18.

### Engine Architecture & Deduction Rule Assignment

The repository preserves two distinct proposed calculation models representing alternative accounting and econometric hypotheses, not sequential versions of a single formula:

| Deduction / Adjustment Rule | Model Assignment | Mechanism & Methodological Hypothesis |
|---|---|---|
| **Cost of Living / Household Expense Float** | **Declared-Income AGI v1** (`AlgorithmSimulation.js`) | Tiered urban/rural basic subsistence deduction (Nairobi/Mombasa Tier 1: KSh 12,000/mo; Tier 2: KSh 7,000/mo; Rural: KSh 3,500/mo) or capped verified rent. Deducted directly from annual declared earned income. |
| **Dependency Allowance** | **Declared-Income AGI v1** & **Original AGI v2.1** | Dynamic per-capita scaling: 8% reduction per dependent, capped at 35% (40% in ASAL counties) of remaining disposable income. |
| **Chronic Health Expenditure (CHE) / Chronic Illness** | **Declared-Income AGI v1** & **Original AGI v2.1** | Disposable income protection (40% adjustment assumption) for households managing documented chronic illness burdens. |
| **Registered Disability Adjustment** | **Declared-Income AGI v1** (`AlgorithmSimulation.js`) | Disposable income protection (30% adjustment assumption) for households with a registered person with disability. |
| **ASAL Land Valuation Discount** | **Original AGI v2.1** (`AlgorithmSimulation.original-agi-v2.1.js`) | 85% discount for arid counties (multiplier 0.15) and 50% for semi-arid counties applied to land and livestock valuations when constructing the asset wealth base. *(In AGI v1, ASAL land is evaluated as an immovable asset for contextual verification only, not added to earned income).* |
| **Digital Debt Default Exclusion** | **Original AGI v2.1** (`AlgorithmSimulation.original-agi-v2.1.js`) | Active mobile credit defaults (e.g. Fuliza, M-Shwari) deducted from constructed liquid balances to reflect actual financial distress. *(In AGI v1, digital debt is flagged as a contextual distress signal).* |
| **Tools of Trade & Commercial Fleet Depreciation** | **Original AGI v2.1** (`AlgorithmSimulation.original-agi-v2.1.js`) | Productive income-generating assets (e.g., boda bodas, tools) depreciated and discounted rather than penalised as luxury wealth. *(In AGI v1, commercial vehicle fleets generate target earnings for verification).* |
| **Fiduciary & Chama Savings Exemption** | **Original AGI v2.1** (`AlgorithmSimulation.original-agi-v2.1.js`) | Community group, merry-go-round, and chama savings held in trust excluded from individual personal liquidity. *(In AGI v1, chama savings and SACCO share capital are treated as contextual wealth indicators).* |

### Model version lineage and recovery

The repository now preserves two distinct proposed calculation models. They are alternative research designs, not sequential stages of one formula:

| Version | Calculation base | Treatment of assets and liquidity |
|---|---|---|
| **Original asset- and liquidity-aware AGI v2.1** | Recovered from `master` commit `c1a5a09` and preserved in `src/lib/AlgorithmSimulation.original-agi-v2.1.js` | Retained balances, seasonal liquidity, chama/fiduciary treatment, SACCO capital, commercial assets, rental activity, land and livestock can feed the constructed assessment base, subject to the model's adjustments. |
| **Declared-income AGI v1 experiment** | The later meeting-readiness implementation in `src/lib/AlgorithmSimulation.js` | Annualised declared net earned income is the base; assets, retained balances, transaction activity and debt are contextual verification signals. |

`src/lib/model-versioning.js` runs both versions against the same household input snapshot. The **AGI Model Versions** screen presents their separate bases, adjusted gross incomes, contribution outputs, deductions and contextual signals.

The existing financial comparison and member workflow continue to use the declared-income variant as their current primary demonstration output. Adding the recovered model does not silently switch contribution statements, member challenge drafts or officer-review records to a different formula. A later integration should explicitly decide how model versions are referenced in each immutable assessment snapshot.

**Governance boundary:** both engines are research prototypes. Neither is SHA's production Regulation 21(6) / Fifth Schedule means-testing instrument, neither can issue an official assessment, and differences between their outputs are not evidence that either one is empirically correct. The historical engine is preserved for traceability; future changes should create a new version rather than overwrite it.

### Revenue Modeling & Informal Sector Participation

- **Demographic baseline:** Kenya has approximately 16.7 million eligible informal-sector workers (drawn from an estimated 12–14 million total households, with 12.2 million recorded in the 2019 KNBS Census).
- **Current revenue imbalance:** Formal-sector PAYE employees (~3.3 million contributors) contribute roughly KSh 73 billion annually against SHA's KSh 102 billion target, while informal compliance has lagged severely (early administrative data reported fewer than 200,000 paying informal members contributing ~KSh 780 million).
- **Informal compliance and trust:** In May 2026, SHA stated that 92% of assessed informal households are assigned premiums of KSh 850 or less (45% between KSh 300–500 and 47% between KSh 501–850). However, compliance is dictated not merely by nominal premium tiers, but by citizen trust in the fairness of the assessment, clarity of operating expense deductions, and transparent appeal avenues.

---

## Policy Context (2025–2026)

This reform aligns with major policy, judicial, and statistical developments across Kenya's healthcare transition:

- **Premium Financing Context (Regulation 18(4)–(6)):** Under Regulation 18(4)–(6), non-salaried members may access approved premium financing arrangements (such as SHA's administrative Lipa SHA Pole Pole installment mechanism). *Prototype Boundary:* This research prototype evaluates means-testing and cash-flow assessment mechanics; it does NOT implement or operate a live premium financing gateway. Upfront deposit requirements under financing schemes remain an administrative policy consideration for low-income informal households.
- **Ombudsman Payment-Records Order (July 2026):** On an application dated Nov 19, 2025, the Commission on Administrative Justice ordered SHA to release within 21 days disaggregated hospital reimbursement records (NHIF disbursements from 2018–2024 and SHA/SHIF payments from 2025 onward). While that ruling enforces provider payment transparency, this repository delivers **algorithmic transparency** for household means testing.
- **KIHBS 2025/26 Recalibration Opportunity:** The Kenya National Bureau of Statistics (KNBS) commenced a 12-month national fieldwork campaign for the 2025/26 Kenya Integrated Household Budget Survey in July 2025 across 24,480 households and 960 refugee camp households. Once published, this survey will provide an updated empirical dataset to retrain national means-testing models, eliminating dependence on outdated 2021 survey data.

---

## Where SHA Stands Now (October 2026)

- **Defense of Means-Testing Tool:** Following the joint "Error by Design" investigative report (Africa Uncensored, Lighthouse Reports, and The Guardian in May 2026), SHA defended its Means Testing Instrument, stating that it continues to refine assessment models as more administrative and household data becomes available.
- **Appeals & Administrative Recalibration:** SHA announced initiatives to strengthen dispute resolution and appeals, including clearer communication on premium determinations, multi-channel dispute lodgement (digital and assisted CHP channels), shortened review timelines, and administrative adjustments for verified discrepancies.
- **Reported Premium Distribution:** In May 2026, SHA stated that 92% of assessed informal households are assigned premiums of KSh 850 or less (with 45% assessed between KSh 300–500 and 47% between KSh 501–850).
- **Transparency Gap Remains:** As of October 2026, neither the empirical regression coefficients nor a revised algorithm codebase has been published, leaving the computational basis of household means testing opaque to the public.
- **Operational Status:** County remittance compliance remains a significant operational bottleneck, with SHA reporting in September 2026 that only nine counties meet monthly statutory remittance deadlines, while cumulative disbursements to healthcare providers have reached KSh 215 billion since scheme inception.

---

## Repository Structure

```
├── docs/                           # Policy, legal, audit & handover documentation
│   ├── archive/                    # Archived legacy deliverables (.docx, .xlsx, superseded files)
│   ├── institutional-handover/     # Executive proposal and methodology specifications
│   ├── MEETING_QA_AND_STATUTORY_NOTE.md # Definitive statutory crosswalk and legal notes
│   ├── DEMONSTRATION_SCRIPT.md     # Meeting demonstration walkthrough
│   └── ... (full markdown documentation set)
│
├── explainer/                      # Standalone interactive explainer webpage
│   └── index.html                  # Visual walkthrough of PMT flaws and AGI solutions
│
├── sha-mvp/                        # Interactive web MVP (Vite + React / JavaScript)
│   ├── src/
│   │   ├── App.jsx                    # Simulation UI and demonstration tabs
│   │   ├── AppealPreparationTab.jsx   # Local challenge-statement preparation demo
│   │   └── lib/
│   │       ├── AlgorithmSimulation.js # Deterministic AGI rules engine and illustrative PMT-style baseline
│   │       ├── Logger.js              # Browser-session audit buffer
│   │       └── hash.js                # Demo identifier hashing utility
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Legal Design Mapping (Not Legal Certification)

| Legal Instrument | Requirement | v2.1 Status |
|---|---|---|
| Constitution Art. 27(4) | Protection against sex, economic, and regional discrimination | Design objective: demographic and regional impact must be tested on validated outcome data |
| DPA 2019 §32/35/39 | Consent, human oversight, and automated decision explainability | Design mapping only: production consent, access controls, human review and retention are not implemented in this browser prototype |
| AI Bill 2026 | Algorithmic impact assessment, bias testing, and explainability | Design mapping only: no legal certification or independent algorithmic impact assessment has been completed |
| Ombudsman Direction (Nov 2025) | Access to Information compliance (Africa Uncensored FOI) | ⚠️ Partly complied by SHA: Model formula and 43 variables disclosed; regression coefficients withheld |
| High Court (Mwita, June 2025) | Salaried deduction double taxation observation | ℹ️ Judicial observation only; petition struck out as premature; Ministry continues salaried deductions noting tax-deductibility under Tax Laws (Amendment) Act 2024 |
| High Court (Okoiti, March 19, 2026) | [2026] KEHC 3972 (KLR): Declared LN 48, 49, 146, 147 validly made; ordered corrective action for fair means testing | 📋 Confirms regulatory validity while mandating fair and effective means testing for non-salaried persons; does not assess algorithmic accuracy or fairness |
| High Court (Mwamuye, March 19, 2026) | 90-day structural interdict on constitutional violations in rollout | 📋 Complementary: Open-source reference addressing means-testing transparency alongside the Ministry's mandated corrective affidavit process |
| LN 147 of 2024 | Amendments to Regulations 2, 11, 12, 13, 15, 59, 63 | ℹ️ Amended administrative and claims provisions; did not amend Regulations 17–21; subsequently revoked by LN 55 of 2025 (Clause 9) |
| LN 55 of 2025 (Clause 9) | Revocation of LN 147 of 2024 | ⚖️ Revokes the 2024 Amendment Regulations (LN 147/2024); does not revoke principal LN 49 of 2024 |

### Definitive Statutory Crosswalk (Legal Notice No. 49 of 2024, Parliament of Kenya Repository, pp. 746–749 & 798)

| Gazetted Provision | Definitive Scope & Subject Matter | Operational Context & Research Boundary |
|---|---|---|
| **Regulation 17** | Salaried household contribution: fixed at 2.75% of gross salary/wage payable monthly. | Formal payroll deduction; distinct from non-salaried means testing. |
| **Regulation 18(1)–(2)** | Non-salaried household contribution: 18(1) annual contribution of 2.75% of household income determined via means testing under Reg 21; **18(2)** statutory minimum floor of KSh 300 per month (KSh 3,600/year). | Primary target of this research prototype; Reg 18(2) sets the non-salaried minimum. |
| **Regulation 18(3)** | Annual contribution payment timing (payable 14 days before annual coverage lapses). | Statutory deadline for non-salaried premium remittance. |
| **Regulation 18(4)–(6)** | Premium financing arrangements: 18(4) approved commercial bank/SACCO arrangements; 18(5) proceeds remitted directly to Authority; 18(6) Authority informs members about available products. | Third-party financing authorization; prototype does not operate a live financing gateway. |
| **Regulation 19(1)–(4)** | Households in need of financial assistance: 19(1) identification of indigent households via means testing; 19(2)–(3) responsible national/county officials; 19(4) base premium calculated using statistical data and actuarial models guided by benefits schedules. | Subsidized coverage; applying the KSh 300 floor under Reg 18(2) is not an indigent determination. |
| **Regulation 20** | Contributions for persons under lawful custody. | State responsibility for persons in correctional custody. |
| **Regulation 21(1)–(5)** | Means-testing administration & data: 21(1) Authority collects household data; 21(2) instrument developed by CS Health & CS Social Protection; 21(3) socioeconomic domains (housing characteristics, access to basic services, household composition and characteristics); 21(4) data used to estimate household income for Regs 18 & 19; 21(5) periodic reviews. | Administrative and governance framework; Reg 21(3) defines housing, services, and composition domains. |
| **Regulation 21(6)** | Prescribes: *"The Authority shall conduct means testing using the formula set out in the Fifth Schedule to these Regulations."* | Statutory mandate for the Fifth Schedule econometric formula. |
| **Fifth Schedule (p. 798)** | Titled **"MEANS TESTING"** marked `(r. 21(6))`. Econometric regression formula: $\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$, estimating log per-capita income across urban and rural strata ($u$). | Titled "Means Testing"; completely distinct from Zones. Coefficients remain undisclosed in Gazette. |
| **Regulation 62** | Titled **"Zones"**, under Part VIII (Claims Settlement); specifies regional health facility reimbursement groupings. | Health provider reimbursement tariffs; completely unrelated to household means testing or Fifth Schedule. |

> **Statutory Precision Invariants:**  
> 1. Regulation 18(2) applies strictly to the non-salaried minimum (KSh 300/mo); never attribute the non-salaried minimum to Regulation 17.  
> 2. Regulation 17 governs salaried employment (2.75% of gross salary or wage payable monthly).  
> 3. The Fifth Schedule is titled "Means Testing" (r. 21(6), Gazette p. 798), not "Zones"; Regulation 62 is "Zones" under Part VIII.  
> 4. Do not use the pre-gazettement Ministry draft numbering (which had blank LN and numbered provisions 16, 17, 18, 19) in statutory crosswalks. LN 147/2024 amended Regs 2, 11, 12, 13, 15, 59, 63, but did not amend Regs 17–21.

---

## Key Documents

- **Executive Proposal** — Comprehensive proposal for institutional leadership ([docs/institutional-handover/EXECUTIVE_PROPOSAL.md](docs/institutional-handover/EXECUTIVE_PROPOSAL.md))
- **Statutory Crosswalk & Legal Notes** — Authoritative legal references and Fifth Schedule analysis ([docs/MEETING_QA_AND_STATUTORY_NOTE.md](docs/MEETING_QA_AND_STATUTORY_NOTE.md))
- **Demonstration Walkthrough** — Structured meeting demonstration script ([docs/DEMONSTRATION_SCRIPT.md](docs/DEMONSTRATION_SCRIPT.md))
- **Data Governance Checklist** — Enacted law compliance under DPA 2019 ([docs/LEGAL_AND_DATA_GOVERNANCE_CHECKLIST.md](docs/LEGAL_AND_DATA_GOVERNANCE_CHECKLIST.md))
- **Archived Working Documents (superseded)** — Inventory of early legacy `.docx` and `.xlsx` artifacts ([docs/archive/SUPERSEDED_NOTICE.md](docs/archive/SUPERSEDED_NOTICE.md))

---

## Running the MVP

**🌍 [Try the Live Interactive Demo Here](https://sha-pmt-reform.vercel.app/)**

Or run it locally:
```bash
cd sha-mvp
npm install
npm run dev
```

---

## Prototype Status, Scope & Limitations

This repository contains a **demonstration prototype and policy proposal**, not a live SHA service. Interpret the screens and outputs within these boundaries:

- **Illustrative baseline:** the existing-system comparator is a hand-authored PMT-style approximation. It is not a reconstruction of SHA's disclosed 43-variable regression, and it must not be described as SHA's actual scoring formula.
- **Proposed calculation:** the AGI implementation is a deterministic JavaScript rules engine using fixed rules and constants. It is not a trained machine-learning model, a Fairlearn ensemble, or an optimized model.
- **No agency integrations:** KRA, NTSA, IPRS and mobile-network records are not queried. Status indicators are derived from demonstration form inputs, not independently verified agency records.
- **Network and external requests:** The reviewed application source contains no identified application-level API submission path to an SHA backend or other assessment-data service (`fetch`, `XMLHttpRequest`, and `WebSocket` return zero instances in application code). The interface references Google Fonts, which can generate third-party stylesheet and font requests carrying ordinary connection metadata; these requests are distinct from transmitting household assessment data. Source inspection is not packet-capture verification. The prototype has no connection to SHA production infrastructure or live member databases.
- **In-memory draft retention:** Challenge drafts and review queue entries exist only in React component state (`useState`) during the active browser session; no citizen or household assessment records are persisted to browser storage (`localStorage` or `sessionStorage`). Real SHA member records must NOT be entered.
- **Content Security Policy (CSP):** The development server configures `connect-src 'self'`, which restricts outbound connection mechanisms (`fetch`, `XHR`, `WebSocket`), while fonts and stylesheets are governed by separate directives; production static bundles require server/CDN header configuration. No `.env` files or remote API credentials exist in the repository.
- **Synthetic testing:** fairness and error-rate outputs are calculated from generated households. The proposed rules engine is used as a comparison reference in some calculations, not as independently verified ground truth. Small groups may be excluded because they do not meet the minimum sample size.
- **Fraud indicators:** the fraud screen uses hand-authored heuristic rules and manually assigned weights. Its score is not a calibrated probability, percentile, or finding that a person committed fraud.
- **Calculation explanation:** the interface displays factors and deduction lines from the rules engine. This is a transparent calculation breakdown, not a SHAP/Shapley attribution unless a separate validated Shapley implementation is added.
- **Assessment challenge:** the challenge screen prepares a statement locally in memory and allows a user to download it as text. It does not submit an appeal to SHA, upload evidence, create a case, or start an official review period. Members must use SHA's existing official appeal channel for an actual submission.
- **Audit and privacy:** audit entries remain in the current browser session and are cleared on reload unless manually exported. The prototype does not provide durable audit storage, production encryption, backend access controls, or enforced retention/deletion.
- **Test data only:** do not enter real citizen identifiers, account numbers, mobile numbers, health details, or other sensitive personal information.

The repository's legal and policy tables describe **design intentions and questions for review**, not a legal opinion, certification, or confirmation that the prototype satisfies statutory requirements.

## Fraud Detection

Kenya has experienced significant fraud losses through ghost patients, fake facilities, and upcoding in the health insurance system. Parliamentary and media reports have cited figures in the range of **KSh 11 billion** (attributed to a six-month period reported to parliamentary health committees, Oct 2024 – Apr 2025 timeframe; the author has not independently verified the precise figure from primary SHA financial statements). The closure of over 1,000 facilities has been reported in connection with these investigations. The prototype includes an **18-rule consistency-review heuristic** intended to illustrate potential checks such as household-composition inconsistencies, declared asset mismatches, income discrepancies, and geographic conflicts. Without live agency integrations and independently validated outcomes, these are **review prompts — not verified fraud detections or calibrated fraud probabilities**.

---

## Provider Payments

This reform addresses the **contribution** side of the SHA equation (how citizen means are evaluated and premiums calculated). The **reimbursement** side (the timeliness and verification of hospital claim payouts) is outside the scope of an assessment algorithm; however, accurate means-testing and equitable premiums directly improve fund solvency and voluntary compliance, establishing a predictable revenue foundation for provider reimbursements.

---

## International Comparison

SHA's defense has referenced international welfare targeting instruments such as Colombia's Sisbén and Indonesia's DTKS:
- **Colombia's Sisbén IV** employs continuous administrative data integration, three differentiated sub-indices, and annual recalibration.
- **Indonesia's DTKS** pairs national registry data with mandatory village-forum (*Musyawarah Desa*) community verification.

While SHA announced plans in February 2025 to triangulate data across multiple state databases (KRA, NTSA, KNBS, Hustler Fund, KIAMIS), v2.1 focuses on the governance missing from both legacy PMT and raw data aggregation: statutory deductions, transparent explainability receipts, and institutionalized community-level verification (CHP protocol) for marginalized households.

---

## Proposed Triangulation Architecture (Not Yet Connected)

In February 2025, SHA announced that an enhanced means-testing system would incorporate data from state databases (including KRA, NTSA, KNBS, Hustler Fund, Immigration, and KIAMIS) to verify applicant details. 

The proposed architecture illustrates how triangulated data could be governed if authenticated integrations, consent controls and legal authority were established:

1. **MNO-Agnostic Design:** While Safaricom (M-Pesa) holds dominant market share, the triangulation engine uses an MNO-agnostic gateway supporting Safaricom, Airtel, and Telkom equally to prevent carrier-based bias and comply with Communications Authority interoperability standards.
2. **KRA PIN Type Granularity:** Granular tax identifiers (`kraPinType`) differentiate formal payroll employees (`PAYE`) from self-declared informal business owners (`BUSINESS`), applying appropriate confidence weighting to income records.
3. **Disaster Recovery & Fallback Protocol:** During API outages or when assessing cash-based citizens lacking a digital footprint:
   - **Secondary Proxy Layer:** The algorithm shifts weighting to verified physical capital (land, livestock, commercial assets) while preserving baseline demographic allowances.
   - **Proposed offline-assistance pathway:** Households with zero digital and physical footprints and low declared income receive the KSh 300 minimum contribution rate and a recommended referral for **Community Health Promoter (CHP) in-person verification**. The prototype flags such cases for follow-up but does **not** automatically designate any household as indigent, does not create an SHA case, and does not issue a Regulation 19 financial-assistance determination. Any offline safety-net protocol inspired by models such as Indonesia's village verification system would require separate statutory and administrative design.

### System Architecture

```mermaid
flowchart TD
    Citizen([Citizen / eCitizen]) --> USSD{USSD Gateway \n*147#}
    USSD --> App(MVP Interface \nApp.jsx)
    App --> AGI[AGI Ensemble Engine \nAlgorithmSimulation.js]
    
    subgraph Triangulation Layer
        AGI <--> KRA[(KRA API\nIncome/PIN)]
        AGI <--> NTSA[(NTSA API\nVehicles)]
        AGI <--> MNO[(MNO Gateway\nM-Pesa/Airtel)]
    end
    
    AGI --> Consistency{Consistency Verification \nHeuristics}
    Consistency -- Review Flag --> Manual[Caseworker / CHP Review \nDPA §35 & Reg 22]
    Consistency -- Verified --> Tier(Contribution Setting \nReg 18(1) & (2) Floor)
    Tier --> CB[Calculation Breakdown \n*147*4#]
```

---

## Model Evaluation and Governance

Phase 3 introduces an isolated model evaluation and governance framework to establish how alternative means-testing assessment methods should be tested against independent evidence.

### 1. Why a Model Output Cannot Be Its Own Ground Truth
In scientific evaluation, a model cannot be tested against its own predictions. Evaluating an AGI rules engine or a PMT-style regression requires an independent reference outcome—such as consumption expenditure or poverty status measured by an independent statistical authority (e.g. KNBS)—not the candidate model's internal score, proposed tier, or classification flags.

### 2. Why a Difference in Contribution Amounts Does Not Prove Accuracy
If Model A calculates KSh 300/month while Model B calculates KSh 700/month for the same household, that numerical difference demonstrates that the models disagree; it does **not** establish which model is correct. Determining whether either assessment reflects true household capacity requires comparison against independently verified benchmark data.

### 3. Predictive Accuracy and Contribution Affordability Are Separate Questions
- **Predictive Accuracy:** How closely the assessment method measures a household's actual economic welfare or disposable capacity relative to independent ground truth (measured via Mean Absolute Error, Root Mean Squared Error, sensitivity, specificity, and classification error rates).
- **Contribution Affordability:** Whether the resulting statutory premium places an undue financial burden on a household relative to its available resources (measured via contribution-to-disposable-income burden ratios).
An assessment tool could predict consumption with statistical precision yet generate a tariff that is unaffordable for an informal household managing volatile cash flows. These two dimensions must be evaluated through separate metrics.

### 4. Current AGI Models Are Research Hypotheses
The two candidate engines in this repository:
- **Original Asset- and Liquidity-Aware AGI v2.1** (`src/lib/AlgorithmSimulation.original-agi-v2.1.js`)
- **Declared-Income AGI v1 Experiment** (`src/lib/household-income.js` & `src/lib/AlgorithmSimulation.js`)
are structured policy and software prototypes. They represent competing research hypotheses about how to assess informal-sector means fairly. They have not undergone national empirical validation and are not official SHA determinations.

### 5. The Illustrative PMT Comparator Is NOT SHA's Deployed Model
The baseline comparator in `src/lib/AlgorithmSimulation.js` is a simplified, illustrative 2-variable proxy regression constructed for demonstration. It is **not** a reconstruction of SHA's proprietary 43-variable regression model, and it does not contain SHA's actual empirical coefficients, categorical transformations, or calibration offsets. It cannot be used to benchmark or criticize the performance of SHA's live system.

### 6. Authoritative Technical Specification and KNBS Microdata Are Required
Comparative empirical evaluation of means-testing reform is strictly **BLOCKED** until two external dependencies are formally provided:
1. **Authoritative Production Technical Specification:** Authoritative current documentation from SHA covering:
   - Current production model version and specification.
   - Numerical regression coefficients and intercepts ($a^u, b^u, c^u$).
   - Variable definitions and categorical encodings (distinguishing the statutory data domains of Regulation 21(3) from the operational 43 variables).
   - Training data version and preparation (2021 KCHS).
   - Missing-data and imputation rules.
   - Post-estimation calibration.
   - Conversion of model output into contribution amounts or brackets under Regulation 18(1) and Regulation 19.
   - Clarification of the central methodological question: *"How does the operational per-capita consumption prediction relate to the per-capita income estimation specified in the Fifth Schedule ($\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$)?"*
2. **Approved Survey Microdata:** Lawfully accessible, anonymised national household budget microdata (e.g. KNBS KIHBS) with verified sampling weights, cluster identifiers, and strata.

### 7. What Can and Cannot Be Concluded from Synthetic Demonstrations
- **What synthetic demonstrations can establish:** Software correctness, edge-case resilience, user-flow usability, input validation integrity, and calculation reproducibility across simulated scenarios.
- **What synthetic demonstrations CANNOT establish:** National accuracy, poverty targeting efficiency, demographic fairness, fiscal neutrality, or compliance with Article 27 of the Constitution. All synthetic evaluation runs are marked `DEMO_ONLY`.

---

## Author

**Peter M. Kaulani**  
pmkaulani@gmail.com

---

*This project addresses the algorithmic transparency and equity challenges highlighted in ongoing national healthcare debates, complementing the High Court's March 19, 2026 structural interdict (Justice Mwamuye), the Ombudsman's access-to-information rulings, and wider constitutional litigation regarding SHA and DHA statutory functions (such as the Awino petition transferred to Milimani in June 2026).*
