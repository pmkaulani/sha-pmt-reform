# SHA MEETING PRESENTATION
## A Simplified Means-Testing Algorithm and Working Prototype

**Application URL:** `http://localhost:5173/app.html`  
**Target Duration:** 15–20 minutes  
**Audience:** SHA Executive Leadership, ICT Engineers, Actuaries, and Legal Counsel  
**Presenter:** Peter M. Kaulani (`pmkaulani@gmail.com`)  
**Document Series:** Meeting Materials (Live Walkthrough Guide)  
**Git Branch:** `meeting-prep/final-reconciliation`

---

## Pre-Flight Setup Checklist
- [ ] Active Git branch: Verify checked out on `meeting-prep/final-reconciliation` (`git checkout meeting-prep/final-reconciliation`). Do NOT merge to `master`; present from this branch and open a draft PR on GitHub.
- [ ] Vite development server running: `npm --prefix sha-mvp run dev` on `http://localhost:5173/app.html`.
- [ ] Browser window sized to standard 1280x800 resolution with clean zoom (100%).
- [ ] Verification test suite pre-checked: `npm --prefix sha-mvp test` (all tests passing).
- [ ] Terminal open in background showing zero unhandled exceptions or console errors.
- [ ] **Data Safety Invariant:** Do NOT enter real citizen or SHA member records. All demonstrations must use built-in synthetic personas or mock inputs.

---

### 1. Opening: What We Are Presenting

"Thank you for giving us this opportunity.

Our work focuses on one important question:

**How can we assess the ability of people in the informal sector to contribute towards health insurance in a way that is fair, understandable and realistic?**

For someone employed on a salary, estimating income is relatively straightforward. But consider a market trader, a small shop owner, a boda boda operator or someone running a small business.

The money they receive is not necessarily the money they earn. They have to pay for stock, transport, rent, business expenses and other necessities.

Our project explores a simplified approach that takes these realities into account.

We have developed a working prototype to demonstrate how such an assessment could work, how the figures are calculated and how a person can understand or challenge the outcome.

Today, we would like to demonstrate that approach and receive SHA's technical feedback."

---

### 2. The Problem We Are Trying to Address

"Let us consider a simple example.

A market trader receives KSh 45,000 from business sales in a month.

At first glance, someone might assume that the person earns KSh 45,000.

But that is not what they actually take home.

They may spend KSh 15,000 on restocking, transport and business operating expenses.

That leaves KSh 30,000.

There is a significant difference between money passing through someone's business and the income they actually earn.

Our proposed approach attempts to recognise that difference before estimating what the household can afford."

---

### 3. How Our Simplified Algorithm Works

The algorithm follows five understandable steps.

**Step 1: Establish household information**  
We collect basic information about the household, including its size, location, income sources and relevant living circumstances.

**Step 2: Establish actual business earnings**  
We record the money coming into the business and subtract reasonable operating expenses.  
This gives us an estimate of net livelihood income rather than treating total business sales as personal income.

**Step 3: Account for household needs**  
We consider the household's basic living costs and the number of people dependent on the income.  
The intention is to avoid treating every shilling earned as money available for health insurance contributions.

**Step 4: Estimate assessable income**  
After the relevant allowances, the algorithm arrives at an estimated amount that can be used in calculating the proposed contribution.

**Step 5: Calculate the proposed contribution**  
The contribution rate is applied to the resulting assessable income, subject to the applicable minimum contribution rules.

The important feature is that the system can show how it arrived at the result. It does not simply produce a figure without explaining it.

---

### 4. Demonstrating the Calculation

"Let me demonstrate this using a sample household already loaded into the application.

We have a market trader in Nakuru with a household of five people.

The figures are illustrative."

| Calculation | Amount |
|---|---:|
| Monthly business turnover | KSh 45,000 |
| Monthly operating expenses | KSh 15,000 |
| Actual monthly net earnings | **KSh 30,000** |
| Annual net earnings | KSh 360,000 |
| Annual living-cost allowance (Tier 2) | KSh 120,000 |
| Balance after living-cost allowance | KSh 240,000 |
| Household dependency allowance (32%) | KSh 76,800 |
| **Estimated assessable annual income** | **KSh 163,200** |

"Using the 2.75% contribution rate configured in this demonstration:

- Annual contribution: KSh 4,488.
- Monthly contribution: approximately **KSh 374**.

What matters here is not just the final amount.

It is that we can trace every step, see where each figure came from and explain why the system arrived at that result.

These are proposed model assumptions for demonstration and discussion, not a claim that SHA has adopted this calculation."

---

### 5. Demonstrating the Working Prototype

"I will now move from the calculation to the actual application.

Rather than showing slides about what the system might do, I want to demonstrate the working process."

**Demonstration 1 – Household assessment**  
*Action:* Open the application and select preset **Wanjiru – Market Trader (Itemised Expenses)** in Stage 0.  
Explain that this is a sample household, not a real member's record.  
Show the household details and explain the information used by the assessment.

**Demonstration 2 – Income and expenses**  
*Action:* Navigate to the household income ledger in Stage 2.  
Point out the KSh 45,000 turnover and KSh 15,000 operating expenses.  
Show how the system arrives at KSh 30,000 in monthly net earnings.  
"This is one of the most important parts of our approach. We distinguish business turnover from actual livelihood earnings."

**Demonstration 3 – Calculation breakdown**  
*Action:* Advance through Stage 3 and Stage 4 (Review), click **"Run Household Assessment"**, landing on the **Proposed Calculation Breakdown (`#shap`)**.  
Show the deductions, allowances, assessable income and proposed contribution (KSh 374/month).  
"Every major step is visible. An officer or an individual can examine how the result was reached."

**Demonstration 4 – Zero-income household**  
*Action:* Return to the income ledger and select the **"Our household currently has no earned income"** option. Run the assessment again.  
"This allows us to demonstrate how the prototype handles a household reporting no earned income and how its configured minimum contribution safeguard operates under Regulation 18(2) (KSh 300 floor).  
It also highlights an important distinction: a minimum contribution and qualification for an indigent subsidy under Regulation 19 are not automatically the same thing."

**Demonstration 5 – Disputes and appeals**  
*Action:* Open the **"Prepare Challenge" Tab (`#challenge`)**.  
Show how someone could identify a reason for disputing an assessment and prepare a challenge draft with metadata-only evidence attachments.  
Then open the **"Officer Review" Tab (`#officer`)**.  
"This is important because an assessment should not be the end of the process. There should be a way to question incorrect information, provide supporting evidence and have a person review the matter."

**Demonstration 6 – USSD access**  
*Action:* Open the **"USSD Simulation" Tab (`#ussd`)**.  
"This demonstrates how the process could be made accessible to people who do not own smartphones or have reliable internet access.  
The objective is to make the assessment process understandable and accessible beyond people who can use a web application."

---

### 6. What Makes This Approach Worth Exploring?

"There are four things we believe are important about this prototype:

1. **Transparency:** People can see how their proposed contributions are calculated.
2. **Practicality:** The approach recognises that business turnover is different from actual income.
3. **Household consideration:** The assessment considers household circumstances rather than looking at income in isolation.
4. **Accountability:** It demonstrates how an assessment could be questioned, reviewed and corrected.

We believe these are important principles when designing a means-testing process for people whose incomes are irregular or difficult to establish through conventional payroll records."

---

### 7. What We Would Like to Learn from SHA

"We recognise that developing a prototype is only one part of the work.

For an approach like this to be useful, its assumptions, calculations and results must be examined against SHA's operational and regulatory requirements.

We would therefore appreciate guidance on a few areas:

1. **The current assessment methodology:** How does the operational means-testing system estimate the income and contribution capacity of informal-sector households?
2. **The data used:** What information and variables are used when assessing these households?
3. **The calculation:** How are business expenses, household size, living costs and other circumstances considered in the existing methodology?
4. **Validation:** What would SHA require to determine whether a simplified alternative produces fair and reliable results?
5. **Collaboration:** Could we have an opportunity to evaluate the prototype against appropriately anonymised historical cases under an approved research arrangement?

Our intention is to understand the existing process and identify where a simpler, more transparent approach could contribute."

---

### 8. Closing Statement

"To conclude, we are not presenting this as a replacement for SHA's existing systems or as a finished government-approved assessment model.

We are presenting a working research prototype that demonstrates a possible way of making informal-sector means testing more understandable, transparent and responsive to actual household circumstances.

We would welcome SHA's technical guidance on the methodology, the assumptions and the validation required to take the research further.

Thank you."

---

## PRESENTER'S REMINDER

Keep the meeting focused on three things:

**1. The problem:** Business turnover does not necessarily represent actual household income.  
**2. The solution:** A simplified calculation that accounts for operating expenses and household circumstances before estimating contribution capacity.  
**3. The working prototype:** Demonstrate the assessment, calculation breakdown, no-income scenario, appeals process and accessible service channels.

Do not volunteer every legal provision, regression equation, technical implementation detail or security test during the opening presentation. Keep those materials available for the relevant SHA specialists if they ask.

**Important distinction:** The numerical allowances, formula and sample contribution in this demonstration are model assumptions. Do not describe them as SHA-approved parameters or as a reproduction of the official statutory means-testing model. Their alignment with the applicable law and SHA's operational methodology is something to discuss and validate with SHA.

---

## Technical & Legal Reserve Notes (For Q&A Only)

If SHA specialists ask specific technical or legal questions during discussion, refer to these definitive facts:

1. **Statutory Reference (LN 49 of 2024):**
   - **Regulation 17(1):** 2.75% payroll deduction for salaried households. (Note: there is no Reg 17(2)).
   - **Regulation 18(1) & (2):** 2.75% for non-salaried households via means testing, with a KSh 300/month (KSh 3,600/year) minimum floor under Reg 18(2).
   - **Regulation 19:** Indigent financial assistance (government liability). Paying the KSh 300 floor is NOT an indigent determination.
   - **Regulation 20:** Persons in lawful custody.
   - **Regulation 21(6):** Fifth Schedule (*Means Testing*, Gazette p. 798) econometric formula: $\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$.
   - **Regulation 62:** "Zones" under Claims Settlement; facility reimbursements, unrelated to means testing.
   - **LN 55 of 2025:** Revoked LN 147/2024; left Fifth Schedule and Regulation 21 untouched.
   - **High Court (*Okoiti v CS Health*, March 19, 2026):** Validated LN 48, 49, 146, 147; directed fair and effective means testing for non-salaried persons.

2. **Data Protection Act, 2019 Safeguards:**
   - **Section 30:** Processing grounds to be designated by SHA's data controller.
   - **Section 31:** Data Protection Impact Assessment (DPIA) required for large-scale algorithmic profiling.
   - **Section 35 & General Reg 22:** Automated profiling safeguards; right to meaningful human review, clear explanations, and right to challenge.
   - **Section 53:** Research exemptions operate under Data Sharing Agreements (Regulation 21), not blanket waivers.

3. **Client-Side Architecture:**
   - Network calls in application code: zero (`fetch = 0`, `XMLHttpRequest = 0`, `WebSocket = 0`).
   - Browser data isolation: zero persistence of citizen assessment records; all session state lives in ephemeral React state.
