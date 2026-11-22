# Notice of Superseded Legacy Documentation & Historical Claims

**Document Classification:** Historical Traceability Notice  
**Effective Date:** November 2026  
**Repository:** `pmkaulani/sha-pmt-reform`  

---

## 1. Purpose of This Notice

This notice formally inventories and classifies legacy documents, presentation pitches, and generated Microsoft Word (`.docx`) and Adobe Acrobat (`.pdf`) files created during earlier exploratory stages of the project. 

These documents are preserved in the repository strictly for historical traceability and academic process transparency. **They do NOT represent the current technical implementation, verified statutory baseline, or official proposals to the Social Health Authority (SHA).**

Current, verified documentation is maintained exclusively in:
- [`README.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/README.md)
- [`docs/institutional-handover/`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/institutional-handover/)
- Live application code and test suites in [`sha-mvp/`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/)

---

## 2. Inventory of Superseded Historical Artifacts

| Legacy File | Location | Original Context | Superseded By | Reason for Supersession |
| :--- | :--- | :--- | :--- | :--- |
| `docs/SHAP_DEDUCTION_RECEIPTS.docx` | `docs/` | Initial proposal for member-facing calculation explanations | Modern Assessment Statement (`ContributionStatementTab.jsx`) | Replaced "SHAP receipts" terminology with neutral "Calculation Breakdown" compliant with DPA 2019 Section 35 and Regulation 22. |
| `docs/Pitch_Deck_Outline.docx` | `docs/` | High-level stakeholder advocacy pitch | `docs/institutional-handover/EXECUTIVE_PROPOSAL.md` & `docs/MEETING_PRESENTATION_SLIDES.md` | Stripped speculative financial projections (KSh 11B fraud, 80% overcharge) and adversarial campaign tone; established structured 5-stage non-interfering pilot framework. |
| `docs/SHA_PMT_v2.1_Executive_Briefing.docx` | `docs/` | Early briefing on AGI v2.1 | `docs/institutional-handover/PROBLEM_AND_METHODOLOGY.md` | Clarified that AGI v2.1 and AGI v1 are alternative research hypotheses, neither being an official SHA determination. |
| `docs/SHA_Reform_Master_Brief.docx` | `docs/` | Broad reform overview | Handover Series (docs 1–12) | Modularized into rigorous institutional governance, data protection, and architecture specifications. |
| `docs/AI_BILL_2026_COMPLIANCE.docx` | `docs/` | Prospective AI regulatory review | `docs/LEGAL_AND_DATA_GOVERNANCE_CHECKLIST.md` | Grounded strictly in authentic enacted law: Kenya Data Protection Act, 2019, ODPC 2025 Research Guidance, and SHI Regulations 2024. |
| `docs/DATA_COMMISSIONER_BRIEFING.docx` | `docs/` | Draft submission to ODPC | `docs/DATA_GOVERNANCE.md` & `sha-request-pack.js` | Realigned with authentic DPA sections (Sections 25, 28–32, 35, 53) and Data Protection (General) Regulations 2021 Regulation 22. |
| `docs/PROJECT BRIEF.pdf` & `SHA-PMT-Reform-One-Pager.pdf` | Root / `docs/` | Initial project summary flyers | Complete Handover Package | Replaced high-level summaries with executable code, reproducible fixtures, and verified test suites. |
| `explainer/index.html` | `explainer/` | Hackathon-stage interactive web explainer | `sha-mvp/app.html` & Handover Package | Early concept design; historical banner added linking to active research prototype and verified crosswalk. |
| `docs/archive/SHA_Algorithm_Solutions.docx` | `docs/archive/` | Filing draft prepared for CAJ deadline | `sha-mvp/src/lib/` implementations | Historical audit document; superseded by executable JavaScript assessment engines. |
| `docs/archive/PROJECT_COMPLETION_SUMMARY.docx` | `docs/archive/` | Early milestone status summary (June 2026) | Handover Documentation | Historical milestone snapshot superseded by subsequent development and formal verification phases. |
| Other legacy `.docx` & `.xlsx` in `docs/` | `docs/` | Early working notes (e.g., `ADOPTION_PATHWAY`, `ASSUMPTIONS`, `KNOWN_BLIND_SPOTS`, `SHA_Financial_Model.xlsx`) | Handover Series (docs 1–12) | Retained in place for historical traceability; superseded by current Markdown handover specifications. |

---

## 3. Retracted or Reframed Quantitative Claims

Early drafts contained illustrative, exploratory, or advocacy-oriented numerical figures that must **not** be cited as verified facts or actuarial findings:

1. **"KSh 58 Billion Annual Informal Revenue / KSh 4.84 Billion Monthly":**
   - *Status:* **Reframed strictly as an uncalibrated illustrative simulation.**
   - *Context:* This calculation arose from multiplying an assumed 60% informal-worker compliance rate by an assumed KSh 520 monthly assessment. It was an illustrative thought-experiment, NOT an actuarial revenue forecast. Actual collections depend on empirical income distributions, collection costs, digital payment friction, and formal SHA administrative policy.

2. **"KSh 495 Average Monthly Assessment":**
   - *Status:* **Retracted as an empirical claim.**
   - *Context:* Early simulations tested a prototype target band around KSh 495. In the current application, candidate models produce variable outputs based strictly on household input ledgers and rule parameters; no artificial KSh 495 anchor is enforced.

3. **"18 Fraud Detection Flags / KSh 11 Billion Saved":**
   - *Status:* **Retracted as empirical validation.**
   - *Context:* The prototype includes heuristic consistency checks (e.g. comparing reported turnover with declared expenditure). These checks are exploratory research flags, NOT an accredited anti-fraud engine, and cannot support empirical claims of recovered revenue.

4. **"SHAP Receipts":**
   - *Status:* **Renamed to "Calculation Breakdown".**
   - *Context:* Early drafts borrowed the acronym SHAP (Shapley Additive exPlanations) metaphorically to describe itemized deduction receipts. Because the production prototype uses deterministic accounting rules rather than machine-learning Shapley value game theory, the term has been replaced with accurate plain-language descriptions.

---

## 4. Statutory Crosswalk: Gazetted Regulations (LN 49/2024) vs. Early Drafts

Some historical working documents referenced pre-gazettement public-participation drafts with differing regulation numbering. For the avoidance of doubt, the definitive statutory citations under the gazetted **Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024, published in Kenya Gazette Supplement No. 60, Legislative Supplement No. 28, on 8 March 2024)** are:

* **Regulation 17:** Contributions for persons in salaried employment (statutory payroll deductions).
* **Regulation 18(1):** Non-salaried household contribution rate (2.75% of household income determined via means testing).
* **Regulation 18(2):** Statutory minimum contribution floor of KSh 300 per month (KSh 3,600 annually).
* **Regulation 18(3):** Payment timing and modalities before the annual contribution lapses.
* **Regulation 18(4)–(6):** Statutory provisions authorizing approved commercial bank or SACCO premium financing arrangements.
* **Regulation 19:** Households in need of financial assistance (indigent households).
* **Regulation 21(2):** Means-testing instrument developed by the Cabinet Secretary for Health in collaboration with the Cabinet Secretary responsible for social protection.
* **Regulation 21(3):** Identifies broad socioeconomic data domains collected for means testing: housing characteristics, access to basic services, and household composition and characteristics.
* **Regulation 21(6):** Prescribes that means testing shall be conducted using the formula set out in the Fifth Schedule.
* **Fifth Schedule (Gazette p. 798):** Titled **"Means Testing"** and expressly referenced by Regulation 21(6). It sets out the econometric regression specification:
  $$\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$$
  for urban and rural strata ($u$), where $\log(y)^u$ is log of per-capita income, $a^u$ is a structural parameter, $b^uX_h^u$ are household-specific indicators, $c^uZ_{hi}^u$ are individual-specific indicators, and $\varepsilon_h^u$ are estimation errors.  
  *Fidelity Note:* The Fifth Schedule itself does not enumerate 43 specific variables. While investigative reporting (Lighthouse Reports, May 2026) indicates SHA disclosed in an Access to Information response that its operational model uses 43 variables from the 2021 KCHS predicting log per-capita *consumption*, the exact numerical coefficients, intercepts, and score-to-tariff cutoffs remain undisclosed and have not been independently obtained by this project.
* **Regulation 62:** Titled **"Zones"** (designates regional geographic groupings for health facility reimbursement tariffs).
* **Legal Notice 55 of 2025:** Clause 9 expressly revokes Legal Notice 147 of 2024 (does not revoke principal LN 49 of 2024).
* **Judicial Context (March 2026):** In *Okoiti & 2 others v Cabinet Secretary, Ministry of Health & 20 others [2026] KEHC 3972 (KLR)* (19 March 2026), the High Court declared Legal Notices 48, 49, 146, and 147 of 2024 validly made, while ordering corrective action that includes implementing fair and effective means testing for non-salaried persons. (Does not evaluate algorithmic accuracy or fairness; appeal status subject to confirmation).
* **Kenya Data Protection Act, 2019:** Sections 25 (Principles), 28–30 (Lawful Processing), 31 (DPIA), 35 (Automated Decision-Making), and 53 (Research & Statistics). Section 53 requires a lawful basis under Section 30 and DPIA safeguards under Section 31; it is NOT an automatic disclosure permit.
* **Data Protection (General) Regulations, 2021:** Regulation 22 (Enforces substantive, meaningful human intervention in automated individual decision-making).

---

## 5. Summary Direction for Reviewers and Meeting Attendees

When reviewing this repository or preparing for institutional discussions with SHA leadership:
- **Rely on:** The live application (`npm run dev`), the automated test suites (`npm test`), the Handover Package (`docs/institutional-handover/`), and [`README.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/README.md).
- **Do not rely on:** Standalone legacy Word documents or static slide decks without cross-referencing this notice.
