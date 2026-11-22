# Institutional Meeting Q&A & Statutory Technical Note

**Forum:** High-Level Dialogue with Social Health Authority (SHA) Leadership  
**Target Roles:** Chief Executive Officer, Director of Legal Services, Chief Information Officer, Lead Actuary, Data Protection Officer, and Health Financing Policy Leads  
**Author & Presenter:** Peter M. Kaulani (`pmkaulani@gmail.com`)  
**Document Series:** Meeting Materials (Institutional Briefing)  

---

## 1. Statutory & Regulatory Inquiries (For Legal Counsel & CEO)

### Q1.1: What gives you the legal authority to propose an alternative to Regulation 21?
**Authoritative Answer:**  
We do not propose to replace, amend, or bypass Regulation 21 on our own authority. Under **Section 27 of the Social Health Insurance Act, 2023** and **Regulation 18(1) of the Social Health Insurance Regulations, 2024 (LN 49/2024)**, non-salaried households must contribute 2.75% of income determined through a means-testing instrument developed under Regulation 21(2).  
Our proposal is strictly an academic and policy research exercise. We propose a non-interventional, read-only shadow evaluation (Stages 1–3) to compare cash-flow assessment methods against proxy means-testing. No candidate model will ever alter a live member's official billing or legal status without a formal policy decision by the Ministry of Health and SHA Board.

### Q1.2: Which specific regulations govern salaried vs. non-salaried contributions and means testing?
**Authoritative Answer:**  
The gazetted **Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024, published in Kenya Gazette Supplement No. 60, Legislative Supplement No. 28, on 8 March 2024, held in the Parliament of Kenya Institutional Repository, pp. 746–749 & 798)** establish the definitive statutory crosswalk:
- **Regulation 17 (Salaried households):** Fixed at 2.75% of gross salary or wage payable monthly by the ninth day of each month.
- **Regulation 18(1)–(2) (Non-salaried households):** Annual contribution of 2.75% of household income determined through the means-testing instrument prescribed under Regulation 21; **Regulation 18(2)** establishes the statutory minimum contribution floor of KSh 300 per month (KSh 3,600 annually) for non-salaried households.
- **Regulation 18(3):** Governs annual contribution payment timing (payable 14 days before the lapse of annual coverage).
- **Regulation 18(4)–(6):** Governs premium financing arrangements: 18(4) enables approved commercial bank/SACCO premium financing arrangements; 18(5) financing proceeds remitted directly to the Authority; 18(6) Authority informs members about available financing products. (The prototype evaluates means-testing mechanics and does not operate a live financing integration).
- **Regulation 19(1)–(4):** Governs households in need of financial assistance (indigent households): 19(1) identification via means testing; 19(2)–(3) responsible national and county government officials; 19(4) base premium calculated using statistical data and actuarial models guided by benefits schedules. Crucially, administrative assignment of the KSh 300 floor under Regulation 18(2) does NOT automatically confer an indigent subsidy.
- **Regulation 20:** Governs contributions for persons under lawful custody (state responsibility).
- **Regulation 21(1)–(5):** Governs means-testing administration & data: 21(1) Authority collects household data; 21(2) instrument developed by the Cabinet Secretary for Health in collaboration with the Cabinet Secretary for social protection; 21(3) socioeconomic data domains (housing characteristics, access to basic services, household composition and characteristics); 21(4) data used to determine and estimate household income for contributions under Regulations 18 and 19; 21(5) periodic reviews.
- **Regulation 21(6):** Explicitly prescribes: *"The Authority shall conduct means testing using the formula set out in the Fifth Schedule to these Regulations."*
- **Fifth Schedule (Gazette p. 798):** Titled **"MEANS TESTING"** (expressly cross-referenced as `r. 21(6)`); specifies the econometric equation:
  $$\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$$
  where $\log(y)^u$ is log per-capita income, $a^u$ is a structural parameter, $b^uX_h^u$ are household-specific indicators, $c^uZ_{hi}^u$ are individual-specific indicators, $\varepsilon_h^u$ are estimation errors, $u$ denotes urban or rural strata, and $X, Z$ are matrices of indicators/correlates of income. (Note: the Fifth Schedule itself does not enumerate 43 specific variables or list every individual asset).
- **Regulation 62:** Titled **"Zones"**, under Part VIII (Claims Settlement); specifies regional health facility reimbursement groupings (completely unrelated to the Fifth Schedule or Means Testing).
- **Draft vs. Gazetted Numbering Clarification:** The pre-gazettement Ministry draft had a blank LN number and numbered salaried as Reg 16, non-salaried as Reg 17, indigent as Reg 18, and lawful custody as Reg 19. That numbering was superseded upon formal publication in LN 49 of 2024 (Regs 17, 18, 19, 20).
- **Scope of LN 147 of 2024 & LN 55 of 2025:** The 2024 Amendment Regulations (LN 147/2024) amended Regulations 2, 11, 12, 13, 15, 59, and 63; they did not amend Regulations 17–21. LN 147/2024 was subsequently revoked by LN 55 of 2025 (Clause 9). Legal Notice 55 of 2025 amended specific operational and claims settlement provisions but left the Fifth Schedule econometric formula ($\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$) and Regulation 21 intact. In our meeting, we invite SHA Legal Counsel and the Directorate of Registration to confirm whether any subsidiary administrative guidelines have been gazetted under Regulation 21(3) or LN 55 of 2025.

### Q1.3: What is the status of the Fifth Schedule vs. the Operational Model?
**Authoritative Answer:**  
The functional econometric equation of the Fifth Schedule ($\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$) is published in Legal Notice No. 49 of 2024.  
However, the **operational calibration parameters**—the numerical coefficients ($b^u, c^u$), intercepts ($a^u$), dummy coding baselines, missing-value imputation logic, and score-to-tariff bracket cutoff thresholds—are not published in the Gazette.  

According to an investigative methodology published by Lighthouse Reports on 4 May 2026 regarding an SHA response to an Access to Information request in November 2025:
- SHA disclosed that its operational model used the 2021 Kenya Continuous Household Survey (KCHS), had 43 variables, used separate urban and rural submodels, and predicted log per-capita *consumption*.
- Numerical coefficients were not included in the material supplied to investigators.
- The journalists reconstructed a model and acknowledged that their reconstruction may differ from SHA's exact production implementation.

This reveals a pivotal institutional research question for our meeting with SHA:
> **"How does the operational model's per-capita consumption prediction relate to the per-capita income estimation specified in the Fifth Schedule?"**

Rather than asking whether a formula exists, our information request ([`sha-request-pack.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/sha-request-pack.js)) formally requests SHA's current, authoritative, and reproducible technical specification: production model version, numerical coefficients, variable definitions, training data version, imputation rules, calibration, and contribution bracket cutoffs.

### Q1.4: How does recent litigation affect the legal standing of the Means Testing Regulations?
**Authoritative Answer:**  
In *Okoiti & 2 others v Cabinet Secretary, Ministry of Health & 20 others [2026] KEHC 3972 (KLR)* (judgment delivered 19 March 2026):
1. The High Court declared Legal Notices 48, 49, 146, and 147 of 2024 validly made, finding that the Senate motion seeking to annul Legal Notices 48 and 49 did not pass the required threshold.
2. Crucially, the Court directed corrective action that includes implementing fair and effective means-testing mechanisms for non-salaried persons.
3. *Important Boundary:* The judgment confirms statutory validity; it does *not* constitute judicial endorsement of SHA's algorithmic accuracy, fairness, or predictive performance. Furthermore, any unverified appellate or stay status must be confirmed with the Legal Directorate.

### Q1.5: How does your research framework address the Kenya Data Protection Act, 2019?
**Authoritative Answer:**  
1. **Section 30 (Lawful Basis for Processing):** The prototype does not collect, process, or persist live member records. Any future data processing or evaluation involving actual citizen data must be formally authorized under a recognized statutory ground under Section 30(1) (such as Section 30(1)(b)(iv) for public interest / official authority, Section 30(1)(b)(v) for public authority tasks, or Section 30(1)(b)(viii) for research purposes). The applicable legal basis must be formally determined by SHA's data controller and legal counsel, not assumed by the research team.
2. **Section 35 & General Regulations 2021 Regulation 22 (Automated Decision-Making Safeguards):** Persons subjected to automated profiling affecting their rights are entitled to meaningful human intervention, explanation of decisions, and mechanisms to challenge determinations. The prototype demonstrates candidate workflows (non-binding challenge drafts, itemized ledger reviews, and caseworker adjudication notes) to illustrate how substantive human review could operate in practice.
3. **Data Sharing & Risk Governance (Sections 31, 53 & Regulation 21):** Section 53 recognizes research processing exemptions, but does not serve as a blanket authorization for data disclosure. Routine institutional data sharing requires a formal Data Sharing Agreement under Regulation 21. Where processing operations present high risk to citizen rights (such as large-scale algorithmic means testing), a Data Protection Impact Assessment (DPIA) must be conducted pursuant to Section 31.
4. **Member Rights (Sections 32, 34, 36 & Regulation 4):** The framework recognizes data subject rights regarding withdrawal of consent (Section 32 / Regulation 4(1)(h)), restriction of processing (Section 34), and objection to processing (Section 36).
5. **Data Isolation:** The demonstration prototype runs client-side with zero connection to production databases, and enters no live member records into browser storage.

---

## 2. Technical & Architectural Inquiries (For CIO & Enterprise Architects)

### Q2.1: Could this prototype crash our production registration portal or alter billing?
**Authoritative Answer:**  
No, for three distinct architectural reasons:
1. **Current Disconnected Prototype Reality:**  
   - The reviewed application source contains no identified application-level API submission path to an SHA backend or other assessment-data service (`fetch`, `XMLHttpRequest`, and `WebSocket` return zero instances in application code).
   - The interface references Google Fonts, which can generate external stylesheet and font requests carrying ordinary connection metadata; these browser requests are entirely distinct from transmitting household assessment data.
   - Source inspection is not packet-capture verification.
   - The prototype has zero connection to SHA production infrastructure or live member databases.
   - Challenge drafts are maintained in React in-memory state during the active session; no citizen or household assessment records are persisted to browser storage (`localStorage` / `sessionStorage`). Real SHA member data must not be entered during demonstrations.
   - Development server CSP configures `connect-src 'self'` (controlling connection mechanisms like `fetch`/XHR, while fonts/styles are governed by separate directives); production static bundles require server/CDN header configuration.
   - No `.env` files or remote API credentials exist in the repository.
2. **Proposed Read-Only Research Architecture (Stages 2–3):** In our proposed pilot design, data flow is strictly unidirectional via an asynchronous, read-only event diode. Candidate models run in an air-gapped enclave with no write interfaces to member registers or billing ledgers.
3. **Controls Requiring Implementation & SHA Approval:** Before any shadow pilot can connect to SHA streams, all network diodes, Kafka consumer configurations, IAM policies, and cryptographic isolation boundaries must be formally engineered, audited by SHA/DPO security teams, and authorized by the SHA Board.

### Q2.2: How do you verify the integrity of your code?
**Authoritative Answer:**  
- The codebase contains **14 automated test suites comprising 242 unit and integration tests** with a 100% pass rate.
- Automated tests enforce fail-closed security: the empirical runner immediately blocks execution if synthetic fixtures are paired with real survey manifests (`BLOCKED_PROVENANCE_MISMATCH`) or if evaluation protocols are not frozen (`BLOCKED_PROTOCOL_NOT_APPROVED`).
- The production Vite bundle builds with zero errors, and `npm audit` reports zero dependency vulnerabilities.
- Historical AGI engine logic is locked by immutable Git blob hashes (`61537188d9727e9b01ef4a2c0fadc1c633abaa10`).

---

## 3. Actuarial & Statistical Inquiries (For Lead Actuary & KNBS)

### Q3.1: How do you justify the revenue impact of introducing operating expense deductions?
**Authoritative Answer:**  
Earlier speculative claims of "KSh 58 billion annual yield" or "KSh 4.84 billion monthly" were exploratory hackathon thought-experiments and have been formally retracted and superseded (see [`docs/archive/SUPERSEDED_NOTICE.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/archive/SUPERSEDED_NOTICE.md)).  
Actuarially, health insurance compliance in the informal sector is demand-elastic. Under current asset-based scoring, over-estimating cash liquidity assigns tariffs informal workers cannot sustain, resulting in immediate lapse after month 1 or 2. Allowing verified business operating deductions captures true net disposable income. While nominal individual assessments may be lower, long-term compliance, renewal rates, and overall SHIF fund sustainability increase. Stage 2 and Stage 3 shadow testing will measure this exact empirical revenue curve without financial risk.

### Q3.2: Why do you separate predictive accuracy from contribution affordability?
**Authoritative Answer:**  
In health economics, a means test can predict consumption expenditure with high statistical accuracy ($R^2$, low MAE), yet still generate a statutory contribution that exceeds a household's cash liquidity (e.g. demanding $> 10\%$ of disposable income from a subsistence farmer).  
We report accuracy metrics (predictive welfare fidelity relative to KNBS KIHBS benchmark) strictly separate from affordability metrics (catastrophic contribution burden ratios), enabling policy makers to evaluate targeting precision and tariff equity independently.

---

## 4. Operational & Dispute Review Inquiries (For Operations & CHPs)

### Q4.1: How does this make life easier for Community Health Promoters (CHPs)?
**Authoritative Answer:**  
Currently, when a member disputes a Means Testing Instrument score, CHPs have no visibility into how the score was calculated; they are forced to defend an opaque algorithmic number.  
Our prototype provides:
1. **Itemized Calculation Breakdown:** The member sees exactly what earned income and expenses were evaluated.
2. **Standardized Evidence Categories:** The member can attach structured metadata (receipts, stock invoices, tenancy agreements).
3. **Guided Field Verification:** CHPs verify physical operating realities using clear SOPs rather than guessing wealth from building materials.

### Q4.2: What happens if a household has seasonal income or irregular cash flow?
**Authoritative Answer:**  
The income ledger evaluates rolling 12-month periods to capture peak and low seasons. If only a short observation window is available (3–11 months), the system issues a prominent `PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION` notice, ensuring that provisional estimates are flagged for caseworker confirmation and cannot generate an unfair permanent assessment.
