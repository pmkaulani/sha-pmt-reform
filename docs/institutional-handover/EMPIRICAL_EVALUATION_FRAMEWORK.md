# Empirical Evaluation Framework & Benchmarking Standard
**Document Series:** Institutional Handover Package (5 of 12)  
**Target Audience:** Independent Evaluators, Biostatisticians, and External Auditors  

---

### 1. Two Distinct Evaluation Modes
1. **Mode A: Predictive Measurement Performance:** Evaluates whether a model accurately predicts the specific economic target it was designed to estimate (e.g. consumption expenditure against KNBS KIHBS aggregates). Models measuring divergent constructs are refused (`NOT_EVALUABLE_INCOMPATIBLE`).
2. **Mode B: Contribution Affordability Burden:** Evaluates proposed contribution amounts as a percentage of independently measured household disposable resources, reporting median burdens, $\% > 5\%$, $\% > 10\%$, and catastrophic burden rates ($> 15\%$).

### 2. Metric Rigour: Continuous, Categorical & Exclusion of Raw MAPE
- **Continuous Metrics:** Evaluated using Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and Weighted Absolute Percentage Error (WAPE).
- **Exclusion of Raw MAPE:** Mean Absolute Percentage Error (MAPE) is explicitly excluded as an acceptance standard because dividing by zero or near-zero reference values produces arbitrary explosion in low-income and subsistence informal households.
- **Multidimensional Rejection of Simplistic Thresholds:** Universal pass/fail rules (e.g. rigid $p < 0.01$ significance or arbitrary $0.80\text{--}1.25$ county parity ratios) are rejected. Evaluation must account for practical effect size, confidence intervals, survey sample weights, and livelihood cluster variances.

### 3. Controlled Partitioning & Zero Leakage
Our deterministic partitioning engine ([`evaluation-partitioning.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/evaluation-partitioning.js)) routes all records sharing a household ID to the **same partition** (Development 50%, Calibration 20%, Holdout 30%). Overlap between holdout and training partitions is mathematically zero.

### 4. Small-Cell Suppression & Statistical Power
- Subgroup disaggregations across Kenya's 47 counties automatically suppress cells with fewer than 5 observations ($N < 5$), preventing deanonymization risks and eliminating misleading inferences from unrepresentative samples.
- All benchmark sample sizes must be derived from pre-registered power calculations based on cluster design and target precision, avoiding unverified flat sample targets.
