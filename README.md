# SHA PMT Reform — Prototype Proposal for Kenya

**Social Health Authority (SHA) Means-Testing Algorithm Reform**

A prototype policy and software proposal exploring whether a transparent Adjusted Gross Income (AGI) rules engine could improve on proxy-based means testing. The proposal is intended for independent technical, legal and policy evaluation; it is not an approved SHA replacement or a certified compliant system.

---

## The Problem

Kenya's Social Health Authority deployed a linear-regression Proxy Means Test (PMT) algorithm—developed using the 2021 Kenya Continuous Household Survey (KCHS, ~17,000 households) with 43 variables across separate urban and rural submodels predicting log per-capita consumption. 

An independent econometric reconstruction of SHA's model by *Lighthouse Reports* (May 2026), in collaboration with *Africa Uncensored* and *The Guardian*, revealed severe structural inaccuracies:
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
- **High Court structural interdict (March 19, 2026):** In a constitutional challenge to the rollout, Justice Bahati Mwamuye held that the October 2024 implementation violated constitutional rights to health and dignity. While declining to suspend the health scheme outright, the court issued a 90-day structural interdict ordering the Ministry of Health to file a comprehensive affidavit detailing corrective measures—including emergency-treatment safeguards—and criticised the transparency of the health technology procurement.

---

## The Solution — AGI Model (v2.1)

The AGI model proposes **7 research-informed deduction rules** to the assessed consumption base prior to calculating the statutory 2.75% contribution rate, adjusting the assessment base rather than the rate:

| Deduction | Description |
|---|---|
| ASAL Land Discount | 85% valuation reduction for arid and semi-arid land holdings |
| Dependency Allowance | 8% reduction per dependent, capped at 35–40% |
| CHE Exemption | Catastrophic health expenditure protection for households managing chronic illness |
| Digital Debt Exclusion | Mobile credit defaults (e.g. Fuliza, M-Shwari) deducted from asset calculations |
| Household Expense Float | County-level cost-of-living adjustments |
| Tools of Trade | Productive income-generating assets depreciated rather than penalised as luxury wealth |
| Fiduciary Exemption | Community group and chama savings excluded from personal income |

### Model version lineage and recovery

The repository now preserves two distinct proposed calculation models. They are alternative research designs, not sequential stages of one formula:

| Version | Calculation base | Treatment of assets and liquidity |
|---|---|---|
| **Original asset- and liquidity-aware AGI v2.1** | Recovered from `master` commit `c1a5a09` and preserved in `src/lib/AlgorithmSimulation.original-agi-v2.1.js` | Retained balances, seasonal liquidity, chama/fiduciary treatment, SACCO capital, commercial assets, rental activity, land and livestock can feed the constructed assessment base, subject to the model's adjustments. |
| **Declared-income AGI v1 experiment** | The later meeting-readiness implementation in `src/lib/AlgorithmSimulation.js` | Annualised declared net earned income is the base; assets, retained balances, transaction activity and debt are contextual verification signals. |

`src/lib/model-versioning.js` runs both versions against the same household input snapshot. The **AGI Model Versions** screen presents their separate bases, adjusted gross incomes, contribution outputs, deductions and contextual signals.

The existing financial comparison and member workflow continue to use the declared-income variant as their current primary demonstration output. Adding the recovered model does not silently switch contribution statements, member challenge drafts or officer-review records to a different formula. A later integration should explicitly decide how model versions are referenced in each immutable assessment snapshot.

**Governance boundary:** both engines are research prototypes. Neither is SHA's production Regulation 21 means-testing instrument, neither can issue an official assessment, and differences between their outputs are not evidence that either one is empirically correct. The historical engine is preserved for traceability; future changes should create a new version rather than overwrite it.

### Revenue Modeling & Informal Sector Participation

- **Demographic baseline:** Kenya has approximately 16.7 million eligible informal-sector workers (drawn from an estimated 12–14 million total households, with 12.2 million recorded in the 2019 KNBS Census).
- **Current revenue imbalance:** Formal-sector PAYE employees (~3.3 million contributors) contribute roughly KSh 73 billion annually against SHA's KSh 102 billion target, while informal compliance has lagged severely (early administrative data reported fewer than 200,000 paying informal members contributing ~KSh 780 million).
- **Beyond nominal premium tiers:** In May 2026, SHA stated that 92% of assessed informal households are assigned premiums of KSh 850 or less (45% between KSh 300–500 and 47% between KSh 501–850). However, compliance is dictated not merely by the sticker price, but by citizen trust in the fairness of the assessment and how contributions are structured.
- **AGI revenue projection (Uncalibrated Illustrative Scenario):** If modeled under an illustrative benchmark of 60% informal-worker compliance (drawing on regional community-based health financing hypotheses), an average monthly assessment of **KSh 520** would mathematically yield an indicative **~KSh 58 billion annually**. *Essential Caveat:* This figure is an unverified, illustrative simulation and NOT an actuarial revenue projection or an empirically validated yield. Actual collections depend on empirical income distributions, collection costs, digital payment friction, and formal SHA administrative policy.

---

## Policy Context (2025–2026)

This reform aligns with major policy, judicial, and statistical developments across Kenya's healthcare transition:

- **Lipa SHA Pole Pole (Live since July 2025):** SHA's installment payment mechanism, integrated with the Hustler Fund's insurance premium financing platform, enables informal-sector members to spread annual premiums over up to 24 months. The program requires the first four months' premium upfront, with the remaining 20 months paid in daily, weekly, or monthly installments via M-Pesa Ratiba or USSD. However, individuals with existing SHA arrears or Hustler Fund loans overdue past 45 days are disqualified. At v2.1's projected KSh 520 average monthly assessment, an upfront four-month deposit (~KSh 2,080) remains a potential barrier for ultra-low-income households unless paired with zero-deposit or subsidized entry tiers.
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
├── docs/                           # Policy, legal, audit & financial documentation
│   ├── SHA_Financial_Model.xlsx    # Revenue & compliance projections
│   ├── SHA_Impact_Summary.xlsx     # Impact metrics
│   ├── IMPLEMENTATION_ROADMAP.xlsx # Phased rollout timeline
│   ├── EXECUTIVE_SUMMARY_ONE_PAGER.docx
│   ├── SHA_Algorithm_v2.1_Documentation.docx
│   ├── AI_BILL_2026_COMPLIANCE.docx
│   ├── LEGAL_ETHICAL_ARCHITECTURAL_EVALUATION.docx
│   ├── PRIVACY_POLICY.docx
│   ├── KIPPRA_SUBMISSION_LETTER.docx
│   └── ... (full document set)
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
| High Court (Mwamuye, March 19, 2026) | 90-day structural interdict on constitutional violations in rollout | 📋 Complementary: Open-source reference addressing means-testing transparency alongside the Ministry's mandated corrective affidavit process |

---

## Key Documents

- **Executive Summary** — One-page overview for decision-makers ([docs/EXECUTIVE_SUMMARY_ONE_PAGER.docx](docs/EXECUTIVE_SUMMARY_ONE_PAGER.docx))
- **Algorithm Documentation** — Full technical specification with formulae ([docs/SHA_Algorithm_v2.1_Documentation.docx](docs/SHA_Algorithm_v2.1_Documentation.docx))
- **AI Bill 2026 Compliance** — Regulatory compliance framework ([docs/AI_BILL_2026_COMPLIANCE.docx](docs/AI_BILL_2026_COMPLIANCE.docx))
- **Legal Ethical Architectural Evaluation** — Constitutional and statutory compliance framework ([docs/LEGAL_ETHICAL_ARCHITECTURAL_EVALUATION.docx](docs/LEGAL_ETHICAL_ARCHITECTURAL_EVALUATION.docx))
- **Calculation Receipts** — Proposed citizen-facing explanation framework ([docs/SHAP_DEDUCTION_RECEIPTS.docx](docs/SHAP_DEDUCTION_RECEIPTS.docx))
- **Privacy Policy** — Draft data protection policy for proposed deployment; not a compliance certification ([docs/PRIVACY_POLICY.docx](docs/PRIVACY_POLICY.docx))

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
- **Synthetic testing:** fairness and error-rate outputs are calculated from generated households. The proposed rules engine is used as a comparison reference in some calculations, not as independently verified ground truth. Small groups may be excluded because they do not meet the minimum sample size.
- **Fraud indicators:** the fraud screen uses hand-authored heuristic rules and manually assigned weights. Its score is not a calibrated probability, percentile, or finding that a person committed fraud.
- **Calculation explanation:** the interface displays factors and deduction lines from the rules engine. This is a transparent calculation breakdown, not a SHAP/Shapley attribution unless a separate validated Shapley implementation is added.
- **Assessment challenge:** the challenge screen prepares a statement locally and allows a user to download it as text. It does not submit an appeal to SHA, upload evidence, create a case, or start an official review period. Members must use SHA's existing official appeal channel for an actual submission.
- **Audit and privacy:** audit entries remain in the current browser session and are cleared on reload unless manually exported. The prototype does not provide durable audit storage, production encryption, backend access controls, or enforced retention/deletion.
- **Test data only:** do not enter real citizen identifiers, account numbers, mobile numbers, health details, or other sensitive personal information.

The repository's legal and policy tables describe **design intentions and questions for review**, not a legal opinion, certification, or confirmation that the prototype satisfies statutory requirements.

## Fraud Detection

Kenya lost **KSh 11 billion** to ghost patients, fake facilities, and upcoding in just 6 months (Oct 2024 – Apr 2025), resulting in the closure of over 1,000 facilities. The prototype includes an **18-rule fraud-risk heuristic** intended to illustrate potential checks such as household-composition inconsistencies, declared asset mismatches, income discrepancies and geographic conflicts. Without live agency integrations and independently validated outcomes, these are review prompts—not verified detections or calibrated fraud probabilities.

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
   - **Digital Ghost Protocol:** Indigent citizens with zero digital and physical footprints are assigned a provisional KSh 300 base tier and routed for **mandatory verification by a Community Health Promoter (CHP)** within 90 days, providing an accountable offline safety net inspired by Indonesia's village verification model.

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
    
    AGI --> Fraud{Fraud Engine \n18 Flags}
    Fraud -- Digital Ghost --> CHP[CHP Physical Verification]
    Fraud -- Flagged --> Manual[Manual Review \nCHP/DPA §35]
    Fraud -- Cleared --> Tier(Tier Classification \nKSh 300 - KSh 5,000)
    Tier --> SHAP[SHAP Explainability \n*147*4#]
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

### 6. Official SHA Baseline Parameters and KNBS Microdata Are Required
Comparative empirical evaluation of means-testing reform is strictly **BLOCKED** until two external dependencies are formally provided:
1. **Official SHA Model Disclosure:** Full regression coefficients, dummy encodings, regional intercepts, and statutory lookup tables under Section 27 and Regulations 17 and 21. *(Note: The Fifth Schedule of the Regulations is titled 'Zones' under Regulation 62(3) and does NOT contain the PMT regression formula; official operational parameters remain undisclosed by SHA).*
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
