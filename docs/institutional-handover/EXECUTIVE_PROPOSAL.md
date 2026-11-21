# Executive Proposal: Collaborative Means-Testing Pilot & Evaluation
**Prepared for:** The Board of Directors & Chief Executive Officer, Social Health Authority (SHA)  
**Ministry of Health, Republic of Kenya**  
**Document Series:** Institutional Handover Package (1 of 12)  
**Classification:** Strategic Policy & Technical Briefing  

---

### Executive Summary & The Core Challenge
The transition from the National Hospital Insurance Fund (NHIF) to the Social Health Authority (SHA) under the **Social Health Insurance Act, 2023** represents Kenya's most ambitious universal health coverage reform. A foundational requirement of the Act is that non-salaried households in the informal sector contribute **2.75% of their assessed economic capacity**, with a statutory minimum contribution of KSh 300 per month.

To operationalize this, **Regulation 21 of the Social Health Insurance (General) Regulations, 2024** deploys a Proxy Means Testing (PMT) instrument based on household characteristics, housing materials, and durable asset ownership. 

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
2. **Parameter Disclosure for Baseline Reconstruction:** Release the official Regulation 21 regression weights, regional constants, and Fifth Schedule tariff cutoff bands so the baseline can be independently tested.
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
