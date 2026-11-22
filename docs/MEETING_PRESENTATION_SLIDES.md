# Executive Presentation: SHA Means-Testing Reform & Collaborative Evaluation

**Forum:** High-Level Technical & Policy Meeting  
**Audience:** Board of Directors, Chief Executive Officer, and Technical Directorate, Social Health Authority (SHA)  
**Presenter / Author:** Peter M. Kaulani (`pmkaulani@gmail.com`)  
**Document Series:** Meeting Materials (Slide Deck Outline)  
**Classification:** Research Prototype & Institutional Dialogue  

---

## Slide 1: Title & Purpose
### Universal Health Coverage Through Evidence-Based Means Testing
- **Subtitle:** A Collaborative, Non-Disruptive Research & Pilot Framework for Informal-Sector Health Insurance Contributions
- **Objective of Today's Meeting:** Propose a phased, zero-risk technical collaboration to evaluate cash-flow and liquidity assessment methods alongside the statutory proxy means test, addressing informal-sector compliance and transparency.
- **Foundational Boundary:** The candidate tools presented are independent academic research prototypes. They do not constitute official assessments and create zero automatic live billing changes.

---

## Slide 2: The Core Policy Challenge in the Informal Sector
### Aligning Statutory Mandates with Informal Cash-Flow Dynamics
- **Statutory Target:** Under **Regulation 18(1) & (2) of the Social Health Insurance Regulations, 2024 (LN 49/2024; Gazette Supplement No. 60, Leg. Supp. No. 28, 8 March 2024)**, non-salaried households contribute 2.75% of income determined through means testing, subject to a KSh 300/month (KSh 3,600/year) minimum floor. Salaried employment is governed separately under Regulation 17(1)–(2).
- **The Operational Challenge:** Kenya's informal sector represents approximately 16 million eligible contributors managing highly volatile cash flows, irregular seasonality, and severe working capital constraints.
- **The Policy Risk:** If means testing relies heavily on immovable physical assets (e.g. inherited dwellings or land), households with volatile or near-zero liquidity risk unaffordable premium assignments, leading to registration fatigue and non-payment.
- **Judicial Context (March 2026):** In *Okoiti & 2 others v CS Health & 20 others [2026] KEHC 3972 (KLR)* (19 March 2026), the High Court upheld the validity of LN 48, 49, 146, and 147 of 2024, while ordering corrective action that includes implementing fair and effective means testing for non-salaried persons. (The judgment does not evaluate algorithmic predictive performance or fairness, and appellate status remains subject to legal confirmation).

---

## Slide 3: Statutory & Legal Framework (LN 49 of 2024)
### Clear Reconciliation with Enacted Law (Parliament of Kenya Repository, pp. 746–749 & 798)
| Dimension | Gazetted Provision | Operational Function |
| :--- | :--- | :--- |
| **Salaried Contributions** | **Regulation 17** | Salaried household contribution: 2.75% of gross salary/wage payable monthly by the ninth day of each month. |
| **Non-Salaried Contributions** | **Regulation 18(1)–(2)** | Non-salaried household contribution: 2.75% of income via means testing; statutory minimum floor of KSh 300/month under **Reg 18(2)**. |
| **Payment Timing** | **Regulation 18(3)** | Annual contribution payment timing (payable 14 days before lapse of annual coverage). |
| **Premium Financing** | **Regulation 18(4)–(6)** | Statutory provisions enabling approved commercial bank or SACCO premium financing; proceeds remitted to SHA (prototype does not operate a financing gateway). |
| **Financial Assistance** | **Regulation 19(1)–(4)** | Households in need of financial assistance (indigent households); base premium calculated via actuarial models. Reg 18(2) minimum floor is not an indigent subsidy. |
| **Lawful Custody** | **Regulation 20** | Contributions for persons under lawful custody (state responsibility). |
| **Means-Testing Governance** | **Regulation 21(1)–(5)** | Household data collection, joint instrument development by CSs, data domains (housing, services, composition), income estimation, and periodic reviews. |
| **Means-Testing Formula** | **Regulation 21(6)** | Prescribes: *"The Authority shall conduct means testing using the formula set out in the Fifth Schedule to these Regulations."* |
| **Fifth Schedule ('Means Testing')** | **Fifth Schedule (p. 798)** | Econometric specification: $\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$ (per-capita income; marked `r. 21(6)`; completely distinct from Zones). |
| **Claims Zones** | **Regulation 62** | Titled "Zones", under Part VIII Claims Settlement (health facility reimbursement groupings; unrelated to Fifth Schedule). |
| **Regulatory Amendments** | **LN 55/2025 & LN 147/2024** | LN 147/2024 amended Regs 2, 11, 12, 13, 15, 59, 63 (not Regs 17–21); revoked by LN 55/2025 (Clause 9). Principal LN 49 of 2024 remains intact. |
| **Automated Decisions** | **DPA 2019 §35 & Reg 22** | Right to substantive, meaningful human review on automated profiling/decisions. |

---

## Slide 4: Methodological Foundations: Two Different Research Questions
### Decoupling Predictive Accuracy from Contribution Affordability
- **Question 1: Predictive Welfare Measurement (Accuracy):**
  - How closely does an algorithm estimate a household's true economic capacity relative to an independent statistical benchmark (KNBS KIHBS microdata)?
  - Measured via Mean Absolute Error (MAE), Weighted Absolute Percentage Error (WAPE), and quintile classification stability.
- **Question 2: Contribution Affordability & Social Protection:**
  - Does the resulting premium place an unsustainable burden on disposable income ($> 5\%$ or $> 10\%$ catastrophic threshold)?
  - An instrument may predict consumption with statistical precision while imposing a tariff that exhausts household liquidity. Both dimensions must be evaluated independently.
- **Statutory vs. Operational Model Inquiry (May 2026 Context):**
  - While the Fifth Schedule sets out an econometric formula for per-capita **income** ($\log(y)^u$), investigative reporting (Lighthouse Reports, May 2026) indicates SHA's operational 43-variable model (derived from the 2021 Kenya Continuous Household Survey) predicts per-capita **consumption**.
  - A primary research question for SHA: *"How does the operational per-capita consumption prediction relate to the per-capita income estimation specified in the Fifth Schedule?"*

---

## Slide 5: The Two Candidate Research Engines
### Distinct Hypotheses, Not Competing Replacements
1. **Model A: Asset- and Liquidity-Aware AGI v2.1 (`AlgorithmSimulation.original-agi-v2.1.js`):**
   - *Core Construct:* Adjusts self-declared earnings by evaluating retained liquid balances, seasonal mobile-money velocity, capital depreciation, and contextual wealth amortizations.
   - *Status:* Preserved as an immutable historical research baseline (`Git blob 61537188d...`).
2. **Model B: Declared-Income AGI with Structured Ledgers (`household-income.js`):**
   - *Core Construct:* Reconstructs net earned livelihood income by deducting member-reported, itemised operating expenses, subject to verification (stock, transport, commercial costs) from gross receipts across a standard 12-month rolling window.
   - *Status:* Implemented in the interactive application wizard and dispute-review queues.
- **Illustrative Comparator:** The baseline in the software is an author-created illustrative benchmark, not SHA's operational instrument.

---

## Slide 6: Procedural Fairness & Meaningful Human Review
### Proposed Procedural Safeguards Workflow (DPA 2019 & General Regulations 2021)
- **Statutory Mandate (DPA Section 35 & General Regulations 2021 Regulation 22):**
  - Automated profiling or algorithmic scoring must not deny social security rights without substantive, meaningful human intervention.
  - Perfunctory or automated checkbox "approvals" do not satisfy statutory standards.
- **Prototype Implementation:**
  - Non-binding member challenge drafts ([`AppealPreparationTab.jsx`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/AppealPreparationTab.jsx)).
  - Demonstration casework queue with side-by-side reported vs. corrected ledgers and documented officer rationale ([`OfficerReviewTab.jsx`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/OfficerReviewTab.jsx)).
  - Metadata-only evidence tracking preventing citizen document exposure.

---

## Slide 7: Non-Interference Architecture & Pilot Safeguards
### Three-Level Technical Separation: Prototype vs. Proposed Enclave
```
[ Current Prototype: Standalone, Disconnected Client/Node Sandbox (Zero External Backend Connections) ]

[ Proposed Pilot Architecture: Air-Gapped Shadow Research Enclave ]
    [ SHA Production Portal / USSD ]
                    |
                    v  (Proposed Read-Only De-Identified Event Diode)
         [ Kafka / Message Bus ]  <-- Unidirectional read tap
                    |
                    v
     [ Air-Gapped Research Enclave ] (Candidate models execute in isolation)
```
- **1. Current Prototype Reality:** Standalone client-side research tool. No identified application-level API submission path to an SHA backend or other assessment-data service in the inspected source. The web interface references Google Fonts, which can generate external stylesheet and font requests carrying ordinary connection metadata (distinct from submitting household data). Source inspection is not packet-capture verification. The prototype has zero connection to SHA production infrastructure or live member databases. Local challenge drafts are held in React in-memory state during the active session; no citizen or household assessment records are persisted to browser storage. Real SHA member data must not be entered during demonstrations.
- **2. Proposed Shadow Architecture:** A proposed read-only event diode design where candidate engines ingest de-identified streams asynchronously without live billing integration.
- **3. Controls Requiring Implementation & SHA Approval:** Network air-gapping, IAM role isolation, diode engineering, and penetration testing are proposed controls that require formal technical implementation, independent security review, and SHA Board approval prior to pilot activation.

---

## Slide 8: Proposed 5-Stage Controlled Pilot Plan
### Phased, Low-Risk Progressive Evaluation
- **Stage 1 — Technical & Legal Review (Months 1–2):** Joint code inspection, statutory reconciliation, and algorithmic verification in an isolated sandbox.
- **Stage 2 — Offline Historical Replay (Months 3–4):** Benchmarking candidate models against de-identified historical data and KNBS microdata within a secure research enclave.
- **Stage 3 — Non-Interventional Shadow Operation (Months 5–7):** Asynchronous shadow execution alongside live registrations with zero billing effect.
- **Stage 4 — Assisted Human Review in Designated Pilot Sub-Counties (Months 8–10):** Community Health Promoters (CHPs) and review officers test structured expense verification on contested cases under SHA Board authorization.
- **Stage 5 — Independent Evaluation & Board Gate (Months 11–12):** Comprehensive evaluation report submitted to SHA Board and Ministry of Health to decide future adoption or refinement.

---

## Slide 9: What the Prototype Software Delivers Today
### Ready-to-Inspect Enterprise Artifacts
- **15 Integrated Application Tabs:** Full wizard from household profile to income ledgers, comparative charts, model divergence views, and pilot controls.
- **14 Automated Test Suites (242 Passing Tests):** 100% pass rate covering numerical precision, boundary checks, and fail-closed security guards.
- **Data Protection Compliance:** Fail-closed runner blocking empirical runs on synthetic data; zero live citizen data written to browser storage.
- **Complete Institutional Handover Package:** 12 structured governance, data privacy, and architecture documents in `docs/institutional-handover/`.

---

## Slide 10: Retraction of Legacy Speculative Claims
### Scientific Integrity and Academic Rigor
- **Superseded Revenue Scenarios:** Speculative hackathon calculations (such as KSh 58 billion informal yield or KSh 4.84 billion monthly projections) are formally retracted and superseded. True actuarial yields require empirical KNBS income distributions.
- **Superseded Tariff Anchors:** Arbitrary targets (such as KSh 495 flat averages) have been removed. The prototype evaluates actual household ledgers under Regulation 18(1) & (2).
- **Superseded "SHAP Receipts":** Terminology realigned to "Calculation Breakdown", reflecting deterministic accounting deductions rather than machine-learning Shapley attributions.
- **Documented Traceability:** Comprehensive audit trail published in [`docs/archive/SUPERSEDED_NOTICE.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/archive/SUPERSEDED_NOTICE.md).

---

## Slide 11: Focused Technical Request to SHA Leadership
### Three Specific, Actionable Inquiries
1. **Joint Technical Consultation:** Authorize an exploratory technical session between SHA ICT/Actuarial teams and the research group.
2. **Current Production Technical Specification ([`sha-request-pack.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/sha-request-pack.js)):** Request authoritative current documentation on the production model version, numerical regression coefficients and intercepts, variable definitions and categorical encodings, training data version (2021 KCHS), missing-data imputation rules, calibration, and contribution bracket cutoffs (distinguishing what is absent from the Gazette vs. what has not been independently obtained by this project).
3. **Formal Research Data Protocol:** Establish a Data Sharing Agreement (DSA) under DPA 2019 Sections 30 and 53 and ODPC 2025 Research Guidance for a de-identified sample evaluated in an air-gapped environment.

---

## Slide 12: Conclusion & Next Steps
### Building Citizen Trust Through Algorithmic Transparency
- Universal health coverage depends fundamentally on informal-sector participation and trust.
- Providing transparent calculation breakdowns, recognizing actual business operating costs, and establishing structured review avenues directly strengthens SHA's collection efficiency.
- We welcome SHA's leadership and technical guidance to test these hypotheses through a safe, controlled, and non-interfering partnership.
