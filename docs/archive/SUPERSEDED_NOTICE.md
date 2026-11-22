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

| Legacy File | Original Date | Original Context | Superseded By | Reason for Supersession |
| :--- | :--- | :--- | :--- | :--- |
| `docs/SHAP_DEDUCTION_RECEIPTS.docx` | Oct 2026 | Initial proposal for member-facing calculation explanations | Modern Assessment Statement (`ContributionStatementTab.jsx`) | Replaced "SHAP receipts" terminology with neutral "Calculation Breakdown" compliant with DPA 2019 Section 35 and Regulation 22. |
| `docs/Pitch_Deck_Outline.docx` | Oct 2026 | High-level stakeholder advocacy pitch | `docs/institutional-handover/EXECUTIVE_PROPOSAL.md` | Stripped speculative financial projections and adversarial campaign tone; established structured 5-stage non-interfering pilot framework. |
| `docs/SHA_PMT_v2.1_Executive_Briefing.docx` | Oct 2026 | Early briefing on AGI v2.1 | `docs/institutional-handover/PROBLEM_AND_METHODOLOGY.md` | Clarified that AGI v2.1 and AGI v1 are alternative research hypotheses, neither being an official SHA determination. |
| `docs/SHA_Reform_Master_Brief.docx` | Oct 2026 | Broad reform overview | Handover Series (docs 1–12) | Modularized into rigorous institutional governance, data protection, and architecture specifications. |
| `docs/AI_BILL_2026_COMPLIANCE.docx` | Oct 2026 | Prospective AI regulatory review | `docs/LEGAL_AND_DATA_GOVERNANCE_CHECKLIST.md` | Grounded strictly in authentic enacted law: Kenya Data Protection Act, 2019, ODPC 2025 Research Guidance, and SHI Regulations 2024. |
| `docs/DATA_COMMISSIONER_BRIEFING.docx` | Oct 2026 | Draft submission to ODPC | `docs/DATA_GOVERNANCE.md` & `sha-request-pack.js` | Realigned with authentic DPA sections (Sections 25, 28–32, 35, 53) and Data Protection (General) Regulations 2021 Regulation 22. |
| `docs/PROJECT BRIEF.pdf` | Oct 2026 | Initial project summary flyer | Complete Handover Package | Replaced high-level summaries with executable code, reproducible fixtures, and verified test suites. |
| `docs/archive/SHA_Algorithm_Solutions.docx` | June 2026 | Filing draft prepared for CAJ deadline | `sha-mvp/src/lib/` implementations | Historical audit document; superseded by executable JavaScript assessment engines. |

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

Some historical working documents referenced pre-gazettement public-participation drafts with differing regulation numbering. For the avoidance of doubt, the definitive statutory citations under the gazetted **Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024)** are:

* **Regulation 17:** Contributions for persons in salaried employment (statutory payroll deductions).
* **Regulation 18(1):** Non-salaried household contribution rate (2.75% of household income determined via means testing).
* **Regulation 18(2):** Statutory minimum contribution floor of KSh 300 per month (KSh 3,600 annually).
* **Regulation 18(3):** Payment timing and modalities before the annual contribution lapses.
* **Regulation 19:** Households in need of financial assistance (indigent households).
* **Regulation 21(2):** Means-testing instrument developed by the Cabinet Secretary for Health in collaboration with the Cabinet Secretary responsible for social protection.
* **Regulation 21(6):** Prescribes that means testing shall be conducted using the formula set out in the Fifth Schedule.
* **Fifth Schedule:** Titled **"Means Testing"** (contains stated urban and rural regression equations; operational weights, codes, and implementation parameters remain undisclosed by SHA).
* **Regulation 62:** Titled **"Zones"** (designates regional geographic groupings for health facility reimbursement tariffs).
* **Legal Notice 55 of 2025:** Clause 9 expressly revokes Legal Notice 147 of 2024.
* **Kenya Data Protection Act, 2019:** Sections 25 (Principles), 28–30 (Lawful Processing), 31 (DPIA), 35 (Automated Decision-Making), and 53 (Research & Statistics). Section 53 requires a lawful basis under Section 30 and DPIA safeguards under Section 31; it is NOT an automatic disclosure permit.
* **Data Protection (General) Regulations, 2021:** Regulation 22 (Enforces substantive, meaningful human intervention in automated individual decision-making).

---

## 5. Summary Direction for Reviewers and Meeting Attendees

When reviewing this repository or preparing for institutional discussions with SHA leadership:
- **Rely on:** The live application (`npm run dev`), the automated test suites (`npm test`), the Handover Package (`docs/institutional-handover/`), and [`README.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/README.md).
- **Do not rely on:** Standalone legacy Word documents or static slide decks without cross-referencing this notice.
