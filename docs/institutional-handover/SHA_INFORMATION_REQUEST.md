# Technical Information & Data Disclosure Schedule
**Document Series:** Institutional Handover Package (11 of 12)  
**Target Audience:** Director General, Chief Information Officer, Lead Actuary, and Legal Directorate, Social Health Authority  

---

### 1. Research Context & Central Methodological Inquiry
Under the **Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024, published in Kenya Gazette Supplement No. 60, Legislative Supplement No. 28, on 8 March 2024)**, Regulation 21(6) designates the Fifth Schedule (Gazette p. 798) as the means-testing formula:
$$\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$$
This formula specifies the estimation of **log per-capita income** ($\log(y)^u$) from household ($X_h^u$) and individual ($Z_{hi}^u$) indicators across urban and rural strata ($u$). Regulation 21(3) separately identifies broad socioeconomic data domains (housing characteristics, access to basic services, household composition and characteristics).

In response to an Access to Information request in November 2025 (as reported by Lighthouse Reports on 4 May 2026), SHA disclosed that its operational model was developed from the 2021 Kenya Continuous Household Survey (KCHS, ~17,000 households) using 43 variables across separate urban and rural submodels, predicting **log per-capita consumption**. Numerical regression coefficients were not included in the supplied materials.

This leads to the primary institutional research question for this collaborative evaluation:
> **"How does the operational model's per-capita consumption prediction relate to the per-capita income estimation specified in the Fifth Schedule?"**

---

### 2. Authoritative Current Technical Information Inquiries
Rather than requesting formula structure as if no information has ever been disclosed, this schedule requests an authoritative, current, and reproducible technical specification to enable independent scientific benchmarking:

1. **Current Production Model Version & Specification:** The software release identifier and exact mathematical specification currently operating in the SHA member registration portal. *(Not disclosed in Gazette; operational version reported via ATI Nov 2025).*
2. **Numerical Regression Coefficients & Intercepts:** Complete empirical regression weights ($b^u, c^u$), regional constants/intercepts ($a^u$), and fixed-effect vectors. *(Absent from Gazette; withheld in Nov 2025 ATI release; not independently obtained by this project).*
3. **Variable Definitions & Categorical Encodings:** Precise survey question wording, categorical dummy reference baselines, and normalization parameters for all operational variables. *(High-level domains in Reg 21(3); 43 variables identified in Nov 2025 ATI release; full coding manuals not obtained).*
4. **Training Data Version & Preparation Protocols:** Details on sampling weights, outlier trimming, and inflation/welfare adjustments applied to the 2021 KCHS dataset. *(Identified as 2021 KCHS in Nov 2025 ATI; preparation protocols not obtained).*
5. **Missing-Data & Imputation Rules:** Fallback logic, default values, or imputation models executed when applicants omit non-mandatory proxy fields. *(Absent from Gazette; not obtained).*
6. **Post-Estimation Calibration:** Any transformation, re-weighting, smoothing, or dampening applied between raw regression predictions and final scores. *(Absent from Gazette; not obtained).*
7. **Conversion into Contribution Amounts or Brackets:** The exact mapping tables and cutoff percentiles translating continuous model predictions into statutory monthly premium shillings under Regulation 18(1) and indigent subsidies under Regulation 19 (with salaried households governed under Regulation 17(1)–(2), annual payment timing under Regulation 18(3), premium financing under Regulation 18(4)–(6), and persons under lawful custody governed under Regulation 20). *(Statutory rates and minimums in Reg 18; operational scoring cutoff thresholds not obtained).*
8. **Model Validation, Change History & Governance Documentation:** Out-of-sample validation studies, fairness audits across vulnerable demographics, revision logs, and approved Data Protection Impact Assessments (DPIA) under DPA 2019 Section 35. *(Not obtained).*
9. **De-Identified Historical Benchmark Sample:** A statistically representative sample of historical assessments for bit-for-bit algorithmic verification under an approved Data Sharing Agreement (DSA) pursuant to DPA 2019 Sections 30 and 53.

*Full request pack exportable in structured JSON and Markdown via [`sha-request-pack.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/sha-request-pack.js).*
