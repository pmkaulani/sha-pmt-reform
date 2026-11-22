# Problem Analysis & Assessment Methodology Comparison
**Document Series:** Institutional Handover Package (2 of 12)  
**Target Audience:** Actuaries, Health Economists, and Policy Analysts  

---

### 1. The Methodological Problem in Informal Sector Means-Testing
Proxy Means Testing (PMT) was originally developed for poverty targeting in non-contributory social safety nets (e.g. cash transfers). In that context, false positives (giving a subsidy to someone slightly above the poverty line) are tolerable, while false negatives (excluding the extreme poor) are the primary risk.

When PMT is repurposed to determine **compulsory monthly financial contributions** for health insurance:
- An overestimated score converts an informal household into an upper tariff bracket.
- The resulting premium bill exceeds actual liquid capacity.
- The household simply does not pay, leading to adverse selection, low informal sector compliance, and reduced SHIF revenues.

---

### 2. Candidate Methodological Frameworks Examined

#### Model 1: Statutory Regulation 21(6) / Fifth Schedule PMT & Reported Operational Model
- **Statutory Formula (Fifth Schedule, Gazette p. 798):** $\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$, estimating log per-capita income across urban and rural strata ($u$).
- **Reported Operational Model (Lighthouse Reports, May 2026):** OLS regression derived from the 2021 Kenya Continuous Household Survey using 43 proxy variables predicting log per-capita *consumption*.
- **Core Construct:** Long-term permanent consumption proxy (operational) vs. per-capita income estimation (statutory).
- **Primary Research Question:** How does the operational per-capita consumption prediction relate to the per-capita income estimation specified in the Fifth Schedule?
- **Strength:** Resistant to income under-reporting; observable physical proxies.
- **Limitation:** Insensitive to sudden economic shocks, droughts, or volatile monthly cash flow; physical assets cannot be spent to pay monthly hospital premiums. Numerical coefficients remain undisclosed in the Gazette.

#### Model 2: Original Asset- and Liquidity-Aware AGI v2.1
- **Econometric Form:** Multi-layer rules engine incorporating declared income, contextual asset amortizations, and mobile money liquidity velocity.
- **Inputs:** Net earnings, housing tenure, electricity/water bills, mobile money float, livestock valuations.
- **Core Construct:** Adjusted Gross Income (AGI) base adjusted for capital depreciation and cash liquidity frictions.
- **Strength:** Explicitly penalizes illiquid assets and rewards verified household dependency ratios.
- **Limitation:** Relies on heuristic valuation tables; construct cannot be directly compared to consumption without empirical calibration.

#### Model 3: Declared-Income AGI with Structured Ledgers
- **Econometric Form:** Structured multi-source earnings ledger with allowable operating expense deduction.
- **Inputs:** Itemized gross business receipts, documented operating costs (transport, raw materials, stock), seasonal peak/low indicators.
- **Core Construct:** Net cash-flow economic capacity from active livelihoods.
- **Strength:** Captures true disposable margins for informal traders; separates loans and remittances from earned income.
- **Limitation:** Higher reporting burden; requires Community Health Promoter (CHP) field verification to audit declarations.
