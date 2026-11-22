# Live Software Demonstration Script: SHA Means-Testing Research Prototype

**Application URL:** `http://localhost:5173/app.html`  
**Target Duration:** 15–20 minutes  
**Audience:** SHA Executive Leadership, ICT Engineers, Actuaries, and Legal Counsel  
**Presenter:** Peter M. Kaulani (`pmkaulani@gmail.com`)  
**Document Series:** Meeting Materials (Live Walkthrough Guide)  

---

## Pre-Flight Setup Checklist
- [ ] Vite development server running: `npm --prefix sha-mvp run dev` on `http://localhost:5173/app.html`.
- [ ] Browser window sized to standard 1280x800 resolution with clean zoom (100%).
- [ ] Verification test suite pre-checked: `npm --prefix sha-mvp test` (238/238 passing).
- [ ] Terminal open in background showing zero unhandled exceptions or console errors.
- [ ] **Data Safety Invariant:** Do NOT enter real citizen or SHA member records. All demonstrations must use built-in synthetic personas or mock inputs.

---

## Step 1: Opening & Governance Boundary (2 Minutes)
* **Screen:** [`http://localhost:5173/app.html`](http://localhost:5173/app.html) (Landing on Assessment Wizard)
* **Presenter Script:**
  > "Distinguished leadership and colleagues, what you see on the screen is a functional research prototype designed to explore how cash-flow income ledgers, liquidity metrics, and structured appeal mechanisms can strengthen informal-sector contributions under the **Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024; Gazette Supplement No. 60, Legislative Supplement No. 28, 8 March 2024)**.  
  > In the gazetted statutory crosswalk, Regulation 17(1)–(2) governs salaried employment (2.75% and KSh 300/mo minimum under Reg 17(2)), Regulation 18(1)–(2) governs non-salaried households (2.75% via means testing and KSh 300/mo minimum under Reg 18(2)), Regulation 18(3) sets annual payment timing, Regulation 18(4)–(6) enables premium financing, Regulation 19 covers financial assistance for indigent households, and Regulation 20 covers persons under lawful custody. Regulation 21(6) designates the Fifth Schedule ('Means Testing', Gazette p. 798) econometric formula: $\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$ (completely distinct from Regulation 62 'Zones'). This conversation is especially timely following the High Court judgment of 19 March 2026 (*Okoiti v CS Health*), which upheld the regulations while directing fair and effective means testing for non-salaried persons.  
  > Before walking through the user journeys, I want to emphasize our core governance boundary: this application is an independent academic research tool. Source inspection confirms no application-level backend submission path to SHA or external assessment services; the UI references Google Fonts for standard typography, but transmits zero member data. Drafts exist only in active React session memory. We are here to propose a controlled, non-interfering partnership to evaluate these methods safely."

---

## Step 2: Journey 1 — Informal Microbusiness & Operating Deductions (4 Minutes)
* **Action:** Click persona preset button **"Mama Wanjiku (Chama Treasurer)"** in Stage 0.
* **Highlight:**
  - 5 household members in Kakamega County.
  - Advance to **Stage 1 (Housing & Assets)**: Notice that housing characteristics are captured as contextual information, not an automatic punitive wealth score.
  - Advance to **Stage 2 (Earned Income Ledger)**:
    - Point out the small business entry: Gross turnover is KSh 216,000 annually.
    - Demonstrate allowable operating costs: Raw materials, stock, transport.
    - Net livelihood earnings calculate to KSh 18,000 monthly.
  - Advance to **Stage 3 (Other Financial Flows)**:
    - Observe the chama savings entry. It is classified under fiduciary flows and isolated from personal livelihood income.
  - Advance to **Stage 4 (Review)**:
    - Click **"Run Household Assessment"**.
* **Screen Transition:** Automatic navigation to **Financial Comparison Tab**.
* **Presenter Script:**
  > "Notice the Financial Comparison screen. On the left is an illustrative comparator benchmark; on the right is the proposed cash-flow rules engine.  
  > Notice the prominent disclosure banner: the comparator is an author-created illustrative tool, not SHA's proprietary regression.  
  > Notice that Mama Wanjiku's contribution is assessed under **Regulation 18(1) & (2)** at 2.75% of declared net household income. The prototype deducts her operating expenses as a **candidate research methodology** — expense categories and allowance rules require validation against SHA's official means-testing instrument and are not an established entitlement under Regulation 18. The declared-income approach also protects her from being penalized for handling group savings."

---

## Step 3: Journey 2 — Explicit Zero-Earned-Income Safeguard (3 Minutes)
* **Action:** Return to Assessment Form. Check the checkbox: **"Our household currently has no earned income"**.
* **Highlight:**
  - The earned income ledger collapses safely.
  - Advance through to **Stage 4** and click **"Run Household Assessment"**.
* **Screen Transition:** Financial Comparison & Contribution Statement.
* **Presenter Script:**
  > "Notice how the prototype handles a destitute or subsistence household. Instead of failing with a division-by-zero or crashing, the system executes `createZeroEarnedIncomeAssessment()`.  
  > It produces an explicit zero base (`CALCULATED_EXPLICIT_ZERO_EARNED`) and applies the statutory minimum contribution of **KSh 300 per month under Regulation 18(2)**.  
  > Crucially, the system displays a clear statutory notice stating that paying the administrative minimum floor does NOT constitute an automatic indigent subsidy under Regulation 19; formal indigent financial assistance remains governed by statutory verification."

---

## Step 4: Journey 3 — Short Observation Windows & Policy Flags (3 Minutes)
* **Action:** In Stage 2, enter a casual labour source with only **4 months** of observation.
* **Highlight:**
  - Navigate to **Contribution Statement Tab**.
  - Show the prominent warning banner: `PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION`.
* **Presenter Script:**
  > "In the informal sector, workers often report only recent weeks or months of earnings. When an observation window is shorter than 12 months, the system explicitly marks the calculation as a provisional extrapolation. It cannot issue an unqualified permanent assessment without review officer confirmation, directly addressing seasonal volatility."

---

## Step 5: Journey 4 — Procedural Fairness & Caseworker Review (4 Minutes)
* **Action:** Navigate to **"Prepare Challenge" Tab (`#challenge`)**.
* **Highlight:**
  - Review the non-binding challenge builder.
  - Show the dispute category selector: "Operating Costs Disputed", "Omitted Dependents", "Fiduciary Group Funds".
  - Demonstrate attaching metadata-only evidence (receipt reference, issue date, issuing vendor) without exposing raw personal files.
  - Show the explicit disclaimer: *"This is a demonstration draft. It does not submit an appeal to SHA."*
* **Action:** Navigate to **"Officer Review" Tab (`#officer`)**.
* **Highlight:**
  - Side-by-side view comparing original member declaration vs. verified audit ledger.
  - Reasoned adjudication notes field and dual sign-off controls.
* **Presenter Script:**
  > "This workflow illustrates how a possible implementation of **Section 35 of the Kenya Data Protection Act, 2019 and Regulation 22 of the General Regulations, 2021** might operate in practice. Those provisions require that automated decision-making affecting social security rights includes meaningful, substantive human review — not a rubber-stamp checkbox. The prototype demonstrates structured ledgers that could allow Community Health Promoters and sub-county officers to resolve genuine disputes efficiently. Actual compliance with Section 35 and Regulation 22 is a matter for SHA's legal team and the ODPC to assess."

---

## Step 6: Journey 5 — Evaluation Lab, Model Lineage & Pilot Governance (4 Minutes)
* **Action:** Navigate to **"AGI Model Versions" Tab (`#models`)**.
  - Show both research models running simultaneously against the same household input snapshot: Model A (Asset/Liquidity AGI v2.1) vs. Model B (Declared-Income AGI v1). Explain that they test different hypotheses about cash flow vs. wealth.
* **Action:** Navigate to **"Evaluation Lab" Tab (`#evalLab`)**.
  - Demonstrate fail-closed guards: Show that selecting real survey manifests with synthetic fixtures triggers `BLOCKED — PROVENANCE MISMATCH`.
  - Show the `NOT_POLICY_APPROVED` badge on exploratory affordability thresholds ($5\%$ and $10\%$).
* **Action:** Navigate to **"Pilot Readiness" Tab (`#pilotReadiness`)**.
  - Show the 5-stage sequential progression (Technical Review $\to$ Offline Replay $\to$ Shadow Mode $\to$ Assisted Human Review $\to$ Independent Gate).
  - Demonstrate the simulated emergency rollback drill controller.
* **Presenter Script:**
  > "Finally, our governance controls. The prototype enforces strict separation of concerns. Today's software contains no identified application-level API submission path to an SHA backend or external assessment service; it is not connected to SHA production infrastructure. Our proposed pilot architecture designs an air-gapped enclave with a unidirectional read-only tap. All physical diode controls, IAM configurations, and rollback protocols represent designs that would require formal engineering, independent security review, and Board authorization prior to any live shadow evaluation."

---

## Step 7: Closing & Call to Action (1 Minute)
* **Presenter Script:**
  > "Thank you. Our specific request to leadership today is straightforward: authorize an exploratory technical dialogue between our technical teams, request an authoritative current technical specification for the production MTI under [`sha-request-pack.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/sha-request-pack.js) to enable reproducible benchmarking, and establish a formal Data Sharing Agreement under DPA Section 30 & 53 to begin Stage 1 offline evaluation. We welcome your questions."
