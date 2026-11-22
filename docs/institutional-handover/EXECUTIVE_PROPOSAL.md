# Executive Proposal: Collaborative Means-Testing Pilot & Evaluation
**Prepared for:** The Board of Directors & Chief Executive Officer, Social Health Authority (SHA)  
**Ministry of Health, Republic of Kenya**  
**Document Series:** Institutional Handover Package (1 of 12)  
**Classification:** Strategic Policy & Technical Briefing  

---

### Executive Summary & The Core Challenge
The transition from the National Hospital Insurance Fund (NHIF) to the Social Health Authority (SHA) under the **Social Health Insurance Act, 2023** represents Kenya's most ambitious universal health coverage reform. A foundational requirement under **Regulation 18(1)–(2) of the Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024, published in Kenya Gazette Supplement No. 60, Legislative Supplement No. 28, on 8 March 2024)** is that non-salaried households in the informal sector contribute **2.75% of household income determined through the means-testing instrument**, with a statutory minimum contribution of KSh 300 per month (KSh 3,600 annually) under Regulation 18(2), while salaried households contribute 2.75% of gross salary or wage under Regulation 17. Regulation 18(3) governs annual payment timing, Regulation 18(4)–(6) enables premium financing, Regulation 19 provides financial assistance for indigent households, and Regulation 20 provides state-sponsored coverage for persons under lawful custody.

To operationalize this, **Regulation 21(6) of the Social Health Insurance Regulations, 2024 (LN 49/2024)** prescribes that means testing be conducted using the formula set out in the Fifth Schedule (Gazette p. 798):
$$\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$$
where $\log(y)^u$ is log per-capita income, $a^u$ is a structural parameter, $b^uX_h^u$ are household-specific indicators, $c^uZ_{hi}^u$ are individual-specific indicators, and $\varepsilon_h^u$ are estimation errors across urban and rural strata ($u$). Regulation 21(3) separately identifies broad socioeconomic data domains (housing characteristics, access to basic services, household composition and characteristics); the Fifth Schedule itself ('Means Testing') does not enumerate 43 specific variables (and is completely distinct from Regulation 62 'Zones'). On 19 March 2026, the High Court in *Okoiti & 2 others v Cabinet Secretary, Ministry of Health & 20 others [2026] KEHC 3972 (KLR)* upheld the validity of the regulations while directing corrective action to ensure fair and effective means testing for non-salaried persons. (LN 55 of 2025, clause 9, revokes the 2024 Amendment Regulations, LN 147/2024, without affecting principal LN 49/2024). 

While statistically standard in social assistance targeting, **asset-based proxy regressions face inherent friction when applied to health insurance contribution setting in Kenya's informal economy**:
1. **Asset Wealth vs. Liquid Cash Flow:** A rural or informal household may possess an inherited corrugated-iron dwelling or a small parcel of land, yet experience volatile, near-zero seasonal cash flow. Estimating annual income primarily from physical assets risks assigning unaffordable monthly premiums, driving informal workers away from registration.
2. **Gross Turnover vs. Net Disposable Earnings:** Informal micro-enterprises (e.g. mama mboga, boda boda operators, kiosk owners) handle gross cash turnover that obscures high cost-of-goods and operating expenses.
3. **Lack of Transparent Human Review:** An opaque algorithmic score without itemized cost deductions diminishes public trust and creates substantial dispute friction for Community Health Promoters (CHPs).

---

### What We Propose: A Staged, Non-Disruptive Collaborative Pathway
We do **not** recommend that SHA immediately scrap or replace Regulation 21. Demanding an unvalidated formula replacement would introduce systemic actuarial and operational risk to the Social Health Insurance Fund (SHIF).

Instead, we propose a **controlled, 5-stage collaborative pilot pathway**:
1. **Stage 1 (Technical Review):** SHA and Ministry of Health technical teams inspect candidate assessment formulas, legal parameters, and code provenance in a sandbox.
2. **Stage 2 (Offline Historical Replay):** In an air-gapped secure research enclave, candidate models are benchmarked against de-identified historical records and representative KNBS survey data.
3. **Stage 3 (Non-Interventional Shadow Operation):** Candidate engines run asynchronously alongside live registrations. **Crucially: Candidate outputs are completely invisible to billing, issue zero member notices, and cause zero live financial impact.**
4. **Stage 4 (Assisted Human Review):** Under formal institutional authorization, designated sub-county review officers and CHPs test structured income/expense verification ledgers on contested cases. Official decisions remain governed exclusively by authorized SHA procedures.
5. **Stage 5 (Independent Evaluation Gate):** An independent panel evaluates accuracy, error rates, and affordability before SHA leadership decides whether to adopt, modify, or terminate the reform.

---

### What We Request from SHA Leadership
The actual request to the SHA Board and Executive is focused, constructive, and low-risk:
1. **Permission for Technical Dialogue:** Authorize a technical review between SHA's ICT/Actuarial teams and the reform research working group.
2. **Current Production Technical Specification:** Request authoritative current documentation from SHA covering the production model version, numerical regression coefficients and intercepts ($a^u, b^u, c^u$), variable definitions, training data version (2021 KCHS), missing-data imputation rules, calibration, and contribution bracket cutoffs under Regulation 18(1) and Regulation 19. A core research question for SHA is: *"How does the operational per-capita consumption prediction relate to the per-capita income estimation specified in the Fifth Schedule?"* (Distinguishing what is absent from the Gazette vs. what has not been independently obtained by this project).
3. **Lawful Data Sharing Protocol:** Establish a Data Sharing Agreement (DSA) under Kenya DPA Section 30 (Lawful Processing) and Section 53 (Research Provisions) in accordance with the ODPC 2025 Research Guidance Notes for a de-identified historical benchmark sample. Sample size and sampling frames must be determined via rigorous statistical power calculations rather than arbitrary estimates.
4. **Designation of Institutional Counterparts:** Appoint a Policy Owner, Technical System Owner, and DPO representative to oversee pilot governance.
5. **Consideration of a Supervised Shadow Pilot:** Authorize Stage 3 shadow testing to observe empirical distribution stability without touching live member contributions.

---

### Estimated Resource & Staffing Categories
Rather than manufacturing speculative cost projections, we outline the concrete institutional resource categories required:
- **Compute Infrastructure:** 4–8 virtual container instances within SHA's existing Government Cloud (G-Cloud) environment.
- **Data Engineering:** 1 data pipeline engineer (part-time) to configure the read-only Kafka event diode.
- **Reviewer Training:** 2-day orientation workshop for participating sub-county review officers in 3 representative pilot counties (e.g. 1 urban, 1 rural agricultural, 1 pastoralist).
- **Independent Evaluation:** Commissioned through accredited Kenyan public universities or research institutes under existing health policy research grants.
