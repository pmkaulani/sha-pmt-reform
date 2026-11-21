# Statutory Compliance & Legal Governance Checklist
**SHA Means-Testing Reform Institutional Proposal**  
**Document Classification:** Legal Risk Analysis & Regulatory Readiness Checklist  
**Primary Statutes:** Kenya Data Protection Act, 2019; Data Protection (General) Regulations, 2021; Social Health Insurance Act, 2023; Social Health Insurance (General) Regulations, 2024 (and Legal Notice 55 of 2025); ODPC Guidance Notes on Processing for Research Purposes (2025)

---

> ### ⚠️ Mandatory Statutory & Non-Legal Advice Disclaimer
> **This document does NOT constitute formal legal advice, an authoritative statutory interpretation, or a binding regulatory clearance.** It provides an analytical technical-legal review to assist the Social Health Authority (SHA), the Ministry of Health, data protection officers, and legal advisers in evaluating the legal boundaries of means-testing reform. Any live pilot, data sharing, or regulatory amendment must be formally reviewed, certified, and approved by qualified Kenyan legal counsel, the SHA Legal Directorate, and the Office of the Data Protection Commissioner (ODPC).

---

## 1. Compliance Matrix: Kenya Data Protection Act, 2019 & General Regulations 2021

| Provision | Statutory Mandate | Project Analysis & Operational Control | Current Status & Dependency |
| :--- | :--- | :--- | :--- |
| **Section 25** | **Principles of Data Protection:** Processing must be lawful, fair, transparent; purpose-limited; data-minimized; accurate; storage-limited; and integrity/confidentiality protected. | Prototype architecture strips direct citizen identifiers (names, NIN, phone) prior to evaluation. Processing purpose restricted strictly to health financing equity research. | **DESIGN ALIGNED**<br/>Requires operational audit of production pipelines. |
| **Section 28** | **Collection of Personal Data:** Personal data must be collected directly from the data subject unless specific exceptions apply (e.g. data in public records, law enforcement, or statutory authorization). | Primary assessment flow collects data directly from the member. Any cross-referencing with administrative data (e.g. KRA, NTSA) requires explicit statutory authorization or lawful basis. | **DESIGN ALIGNED**<br/>No third-party agency APIs are queried in the prototype. |
| **Section 29** | **Duty to Notify Data Subject:** Controller must inform data subject of rights, purpose of collection, recipients, and safeguards *prior* to collection. | Member assessment UI includes transparent notifications of how information is used. **Correction:** Section 29 is a notification obligation, NOT a legal basis for processing or research exemption. | **DESIGN ALIGNED**<br/>Requires SHA member-facing notice sign-off. |
| **Section 30** | **Lawful Processing & Legal Bases:** Processing requires a statutory ground under Sec 30(1), such as consent (30(1)(a)), legal obligation (30(1)(b)), public interest / official authority (30(1)(e)). | As a public authority carrying out a statutory duty under the SHI Act 2023, SHA's lawful basis must be formally determined by SHA counsel and the DPO. Consent is not automatically the sole or primary basis for public authority processing. | **REQUIRES SHA LEGAL OPINION**<br/>Legal basis must be formally designated by SHA. |
| **Section 31** | **Data Protection Impact Assessment (DPIA):** Mandatory where processing by its nature, scope, context and purposes is likely to result in high risk to the rights of data subjects (e.g. algorithmic scoring). | Algorithmic means-testing creates significant financial and access-to-healthcare effects, triggering mandatory DPIA under Sec 31. Prior consultation with ODPC is required if high risks cannot be mitigated. | **DPIA DRAFT PREPARED**<br/>Requires SHA DPO review and formal ODPC filing. |
| **Section 35 & Reg 22** | **Automated Individual Decision-Making & Profiling:** Data subjects have the right not to be subject to a decision based solely on automated processing producing legal/significant effects. | Candidate pilot implements assisted human review (Stage 4). **Crucially:** Regulation 22 of the Data Protection (General) Regulations 2021 requires **meaningful, substantive human intervention**, not a perfunctory checkbox. Non-binding review ledgers ensure final assessments are human-adjudicated. | **DESIGN ALIGNED**<br/>Requires field caseworker training and procedural SOPs. |
| **Section 36** | **Right to Object to Processing:** Data subjects may object to processing unless the controller demonstrates compelling legitimate grounds. | Mechanisms for dispute and challenge are integrated into the review flow (Phase 2.1 and Phase 6 workflows). | **DESIGN ALIGNED**<br/>Requires SHA operational appeal integration. |
| **Section 53** | **Processing for Research, Statistical, and Historical Purposes:** Provides statutory exemptions for research where data is not used for taking decisions about data subjects and results are aggregated. | Offline benchmark replays (Stage 2) and academic evaluations operate under Section 53 and the **ODPC 2025 Guidance Notes on Processing for Research Purposes**, prohibiting commercial reuse and publishing only aggregates. | **RESEARCH COMPLIANT**<br/>Requires formal Data Sharing Agreement (DSA). |

---

## 2. Regulatory Boundary: Social Health Insurance Act, 2023 & Regulations 2024

### Statutory Provisions of the Social Health Insurance Act, 2023:
* **Section 27(2):** Provides that contributions by non-salaried households shall be determined based on means testing conducted in the manner prescribed by regulations.
* **Section 27(4):** Mandates that the national government shall assist households that cannot afford the statutory contribution, anchoring the indigent subsidy.

### The Statutory Framework: Section 27 and Regulations 17 and 21:
Under the **Social Health Insurance Act, 2023** and the **Social Health Insurance (General) Regulations, 2024**:
* **Regulation 17(1):** Establishes that non-salaried households shall pay an annual contribution of 2.75% of household income determined by means testing conducted under Regulation 21.
* **Regulation 17(2):** Sets the statutory minimum contribution at KSh 300 per month (KSh 3,600 annually).
* **Regulation 21(1)–(5):** Governs the means-testing instrument:
  - *Regulation 21(1):* Mandates means-testing for every person without formal salaried income.
  - *Regulation 21(2):* Provides that the means-testing instrument shall be developed and calibrated by the Authority in consultation with relevant stakeholders.
  - *Regulation 21(3):* Directs that the instrument capture socio-economic data (housing characteristics, assets, energy source, livelihood).
  - *Regulation 21(4):* Requires the collected information to be utilized to estimate household economic capacity and income.
  - *Regulation 21(5):* Governs periodic review and updates to the instrument.
  *(Note: Regulation 21 contains only subsections (1) through (5); there is no statutory subsection (6)).*

### Statutory Clarification Regarding the Fifth Schedule & Legal Notices:
* **The Fifth Schedule is "Zones":** The Fifth Schedule to the Social Health Insurance (General) Regulations, 2024 is titled **"Zones"** under Regulation 62(3) (specifies regional geographic zones for health facilities). **It does NOT contain the means-testing formula or regression coefficients.**
* **Origin of the 43-Variable Model:** The 43-variable proxy means test (PMT) model is an administrative econometric instrument developed for SHA and disclosed through investigative reporting (Africa Uncensored / Lighthouse Reports, May 2026), rather than a published statutory schedule.
* **Revocation of LN 147/2024 by LN 55/2025:** Legal Notice No. 55 of 2025 revoked Legal Notice No. 147 of 2024. Neither statutory instrument contains an explicit regression table or variable weighting schedule for means testing.
* **Statutory Status:** The deployed SHA Means-Testing Instrument remains pending official verification and disclosure by SHA.

### Unresolved Legal & Regulatory Questions:
1. **Administrative Implementation vs. Statutory Amendment:** Whether a structured income ledger can be introduced administratively as an operational method of estimating income under Regulation 21(2) & (4), or whether formal regulatory amendment is required, is an **unresolved legal question** that requires formal advice from the Attorney General, Ministry of Health Legal Directorate, and SHA Legal Counsel.
2. **Status of Shadow Testing (Stage 3):** Running an alternative model asynchronously in shadow mode (read-only) does not alter citizen contributions or legal rights, and therefore does not violate Section 27 or Regulation 21, provided candidate outputs have zero live billing effect.
3. **Assisted Human Review Pilot (Stage 4):** Testing assisted human review with Community Health Promoters (CHPs) within a designated sub-county sample requires a formal Board resolution and administrative circular governing dispute resolution and verification guidelines.

---

## 3. Statutory Action Checklist for SHA Leadership & Legal Counsel

- [ ] **Designate Statutory Lawful Basis:** SHA Legal Counsel to formally document the applicable legal basis under DPA Section 30 (e.g. Section 30(1)(e) statutory public duty and Section 30(1)(b)(viii) public interest).
- [ ] **Complete & File DPIA under Section 31:** Finalize the Data Protection Impact Assessment for means-testing algorithms and submit to the ODPC for statutory review.
- [ ] **Review Human-in-the-Loop Safeguards under Regulation 22:** Verify that CHP and sub-county caseworker review workflows provide substantive human intervention satisfying Regulation 22 of the Data Protection (General) Regulations 2021 (no rubber-stamp reviews).
- [ ] **Execute Multi-Agency Data Sharing Agreement (DSA):** Draft and execute a formal DSA with KNBS and academic evaluation partners under DPA Section 53 and ODPC 2025 Research Guidance.
- [ ] **Statutory Pathway Determination:** Obtain a formal legal opinion on whether implementing the proposed income ledger requires a Gazetted regulatory amendment or can be implemented through administrative operational guidelines under Regulation 21(2) & (4).
