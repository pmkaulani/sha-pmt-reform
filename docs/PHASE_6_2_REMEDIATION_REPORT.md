# Phase 6.2 — Regulatory Baseline Correction & Evaluation Integrity Repair Report

**Date:** November 22, 2026  
**Repository:** `pmkaulani/sha-pmt-reform`  
**Branch:** `recovery/restore-original-agi-v2.1`  
**Git Head Commit:** `4b52e2c` (with Phase 6.2 remediation working copy)  
**Verification Status:** 225 / 225 Automated Tests Passing | Production Vite Build Clean  
**Original Algorithm Preservation:** Byte-for-byte verified (`Git blob: 61537188d9727e9b01ef4a2c0fadc1c633abaa10`)

---

## 1. Executive Summary

Phase 6.2 was initiated to address critical legal, methodological, and architectural deficiencies identified during the comprehensive repository audit. Rather than adding speculative features or advancing prematurely to pilot deployment, Phase 6.2 focused on **statutory accuracy, fail-closed evaluation rigor, assessment integrity, and defensible institutional claims**.

### Key Outcomes:
1. **Statutory Baseline Alignment (LN 49/2024):** Aligned statutory citations with the gazetted Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024, published in Kenya Gazette Supplement No. 60, Legislative Supplement No. 28, on 8 March 2024). Confirmed that Regulation 18(1) & (2) govern non-salaried contributions (2.75% rate and KSh 300/mo minimum), while Regulation 17(1)–(2) govern salaried employment. Confirmed that Regulation 21(6) explicitly prescribes that means testing be conducted using the formula set out in the Fifth Schedule ('Means Testing', p. 798): $\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$, estimating log per-capita income across urban and rural strata, while Regulation 21(3) sets out broad socioeconomic data domains (housing characteristics, access to basic services, household composition and characteristics). Regulation 62 designates 'Zones' for health facility tariffs. The official baseline was formally reframed as `OFFICIAL SHA MEANS-TESTING INSTRUMENT — IMPLEMENTATION DETAILS PENDING VERIFICATION`.
2. **Data Protection Law Realignment:** Corrected citations across the repository to properly reflect the Kenya Data Protection Act, 2019 (Sections 25, 28, 29, 30(1)(b)(viii), 30(1)(e), 31, 32, 35, 36, 39, and 53) and Regulation 22 of the Data Protection (General) Regulations, 2021 (mandating substantive, meaningful human intervention in automated decision-making).
3. **Fail-Closed Empirical Comparison Runner:** Hardened `runEmpiricalComparison` to refuse execution when survey manifests are paired with synthetic fixtures (`Provenance mismatch`), require frozen pre-registered protocols (`approvalStatus === "FROZEN"`), eliminate generic prediction fallbacks, isolate zero/negative disposable resources into a dedicated unburdened category, and mark affordability thresholds as unapproved illustrative research benchmarks (`NOT_POLICY_APPROVED`).
4. **EvaluationLab Holdout Enforcement:** Updated `EvaluationLabTab.jsx` to evaluate candidate models strictly against the independent holdout partition (`PARTITION_TYPES.HOLDOUT`) rather than the complete sample.
5. **Statistical Uncertainty Integrity:** Enforced that `evaluateSamplingUncertainty()` returns `UNCERTAINTY_NOT_ESTIMATED` with `confidenceIntervalsAvailable: false` because complex survey design weights (clustering and stratification) are not implemented. De-listed AGI models from claiming independent poverty classification eligibility under the KSh 300 administrative floor.
6. **Assessment Calculation Pathway Repairs:** Implemented `createZeroEarnedIncomeAssessment()` to produce an authoritative explicit zero-earned-income state, flagged unearned transfers as requiring policy decisions (`PROVISIONAL_PENDING_POLICY`), isolated short observation windows (3–11 months) as provisional extrapolations, and added explicit disclaimers regarding allowable costs and reimbursement reconciliation.
7. **Pilot Readiness & State Machine Hardening:** Resolved Stage 2 normalisation (`STAGE_2_OFFLINE_HISTORICAL_REPLAY` -> `OFFLINE_REPLAY`), enforced a permitted transition graph (`ALLOWED_PILOT_CONTROL_TRANSITIONS`), defaulted approvals to `NOT_REQUESTED`, and updated checklist labels to `(Synthetic Demo Checked)`.
8. **KNBS Codebook & Profiler Plausibility:** Aligned mapping dictionaries with authentic KNBS KIHBS variables (`hhid`, `resid`, `hhsize`, `totcons_annual`), marked mappings as `DEMO_ONLY`, and preserved extended households using `Number.isFinite()`.

---

## 2. Statutory Realities & Baseline Reframing

### Legal Finding 1: The Fifth Schedule is "Means Testing" (Regulation 21(6)); Regulation 62 is "Zones"
* **Statutory Location:** Fifth Schedule (Gazette p. 798) to the Social Health Insurance Regulations, 2024 (Legal Notice No. 49 of 2024; published in Gazette Supplement No. 60, Leg. Supp. No. 28, 8 March 2024).
* **Governing Regulation:** Regulation 21(6) explicitly prescribes: *"Means testing shall be conducted using the formula set out in the Fifth Schedule."*
* **Actual Statutory Content:** The Fifth Schedule is titled **"Means Testing"** and specifies the econometric equation:
  $$\log(y)^u = a^u + b^uX_h^u + c^uZ_{hi}^u + \varepsilon_h^u$$
  where $\log(y)^u$ is log per-capita income, $a^u$ is a structural parameter, $b^uX_h^u$ are household-specific indicators, $c^uZ_{hi}^u$ are individual-specific indicators, and $\varepsilon_h^u$ are estimation errors across urban and rural strata ($u$). Regulation 21(3) separately identifies broad data domains (housing characteristics, access to basic services, household composition and characteristics). The Fifth Schedule itself does not enumerate 43 specific variables.
* **Claims Management Zones:** Regulation 62 is titled **"Zones"**, establishing geographic zones of counties for health facility reimbursement tariffs.

### Legal Finding 2: Legal Notice 55 of 2025 Revocation & March 2026 High Court Ruling
* **Regulatory History:** Legal Notice No. 55 of 2025 expressly revokes Legal Notice No. 147 of 2024 in Clause 9 (it does *not* revoke principal LN 49 of 2024).
* **Judicial Context (March 2026):** In *Okoiti & 2 others v Cabinet Secretary, Ministry of Health & 20 others [2026] KEHC 3972 (KLR)* (19 March 2026), the High Court declared Legal Notices 48, 49, 146, and 147 of 2024 validly made, while ordering corrective action that includes implementing fair and effective means testing for non-salaried persons. (Does not evaluate algorithmic accuracy or fairness; appeal status subject to confirmation).
* **Remediation Action:** Clarified that while the Fifth Schedule sets out the statutory formula structure under Regulation 21(6), SHA's operational 43-variable calibration, variable codebook, and cutoff parameters remain undisclosed in the Gazette. According to Lighthouse Reports (4 May 2026), SHA disclosed in an ATI response (Nov 2025) that its operational model uses the 2021 KCHS predicting log per-capita *consumption*. The relationship between predicted consumption and the Fifth Schedule's per-capita income specification forms a key research question.

### Legal Finding 3: Statutory Contribution Rate and Minimum Floor
* **Salaried Employment:** Regulation 17(1)–(2) establishes contributions for salaried households at 2.75% of gross salary or wage, with a statutory minimum of KSh 300 per month.
* **Non-Salaried Contribution Rate:** Regulation 18(1) establishes the annual contribution for non-salaried households at 2.75% of household income determined through the means-testing instrument.
* **Non-Salaried Minimum Floor:** Regulation 18(2) establishes the minimum contribution floor of KSh 300 per month (KSh 3,600 annually).
* **Payment Timing & Financing:** Regulation 18(3)–(6) governs payment timing and premium financing.
* **Financial Assistance (Indigents):** Regulation 19 governs households in need of financial assistance. Application of the KSh 300 floor under Reg 18(2) does not constitute an indigent determination.
* **Means-Testing Instrument & Formula:** Regulation 21(1)–(5) governs MTI development and socioeconomic data collection; Regulation 21(6) mandates use of the formula in the Fifth Schedule ('Means Testing').

### Reconstructed Baseline Specification
In [`sha-mvp/src/lib/sha-baseline-registry.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/sha-baseline-registry.js) and [`sha-mvp/src/lib/evaluation-model-registry.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/evaluation-model-registry.js):
* **Model Name:** Reframed from "Official SHA Regulation 21 PMT Formula" to `Official SHA Means-Testing Instrument — Implementation Details Pending Verification`.
* **Baseline Status:** Set to `SHA_BASELINE_STATUSES.NOT_CONFIGURED` (`NOT_CONFIGURED_MISSING_OFFICIAL_PARAMS`).
* **Variable Status:** Marked as `EXTERNAL_DISCLOSURE_UNVERIFIED`.
* **Comparison Rule:** Any attempt to run an empirical comparative evaluation against the official baseline is fail-closed blocked until SHA formally verifies or discloses the deployed model weights and score bands.

---

## 3. Data Protection Act (DPA 2019) Realignment

All documentation and data exchange modules were audited against Kenyan statutory data privacy provisions:

| Statutory Provision | Correct Legal Description | Remediation in Repository |
| :--- | :--- | :--- |
| **DPA Section 25** | Principles of Data Protection (lawfulness, fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation). | Embedded in [`DATA_GOVERNANCE.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/DATA_GOVERNANCE.md) and [`SECURITY_AND_PRIVACY.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/institutional-handover/SECURITY_AND_PRIVACY.md). |
| **DPA Section 28 & 29** | Collection of personal data directly from data subject; duty to inform data subject of rights and processing purpose. | Documented in [`LEGAL_AND_DATA_GOVERNANCE_CHECKLIST.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/LEGAL_AND_DATA_GOVERNANCE_CHECKLIST.md). |
| **DPA Section 30(1)(b)(viii) & 30(1)(e)** | Lawful bases: processing necessary for the performance of a public interest task or in exercise of official authority; performance of a statutory duty. | Embedded in [`sha-request-pack.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/sha-request-pack.js) and [`data-access-register.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/data-access-register.js). |
| **DPA Section 31 & 32** | Processing of special categories of personal data (health, biometric); explicit conditions for lawful processing. | Reflected in Data Protection Impact Assessments (DPIA) guidelines. |
| **DPA Section 35 & General Regs 2021 Reg 22** | Automated individual decision-making safeguards: data subjects have the right not to be subject to solely automated decisions; controllers must ensure **substantive, meaningful human intervention**. | Enforced across review workflows: rubber-stamp checkboxes are rejected; reasoned human officer review is mandatory. |
| **DPA Section 36 & 39** | Data Protection Impact Assessment (DPIA) obligations and cross-border transfer restrictions. | Cited in pilot staging preconditions. |
| **DPA Section 53** | Processing for Research, Statistical, and Historical Purposes: conditions and exemptions. | Formally cited as the statutory ground for independent KNBS/academic validation. |

---

## 4. Fail-Closed Empirical Comparison Runner & Evaluation Integrity

### Fail-Closed Safeguards in `empirical-comparison-runner.js`
1. **Provenance Binding:**
   ```javascript
   if (datasetManifest?.datasetType === "SURVEY" && isSynthetic) {
     report.status = "BLOCKED";
     report.blockers.push("Provenance mismatch: Dataset manifest declares SURVEY microdata, but evaluation records contain synthetic demonstration fixtures. Evaluation refused.");
     return report;
   }
   ```
2. **Pre-Registration Freeze Enforcement:**
   ```javascript
   if (datasetManifest?.datasetType === "SURVEY" || datasetManifest?.isApprovedForEmpiricalEvaluation === true) {
     if (!protocol || protocol.approvalStatus !== "FROZEN") {
       report.status = "BLOCKED";
       report.blockers.push(`Protocol freeze required: Formal empirical evaluation against '${datasetManifest?.id}' requires a pre-registered protocol with approvalStatus 'FROZEN'. Current status: '${protocol?.approvalStatus}'.`);
       return report;
     }
   }
   ```
3. **Generic Fallback Purge:**
   Predictions must be keyed strictly to `modelPredictions[m.id]` or `pred_${m.id}`. Generic fallbacks (`row.predicted`, `row.proposedContribution`) were completely eliminated.
4. **Disposable Resources Category:**
   Zero and negative resource observations are isolated into `zeroOrNegativeResourcesCategory` (`ZERO_OR_NEGATIVE_RESOURCES`) rather than silently dropped or distorted with invalid division.
5. **Affordability Benchmarks:**
   The 5% and 10% burden ratios are explicitly marked as `policyStatus: "NOT_POLICY_APPROVED"`, clarifying they are illustrative research benchmarks, not statutory limits under the Social Health Insurance Act.
6. **Sampling Uncertainty:**
   `evaluateSamplingUncertainty()` deterministically returns `status: "UNCERTAINTY_NOT_ESTIMATED"` and `confidenceIntervalsAvailable: false` because design-aware variance estimation (Taylor linearization or replicate weights) is not implemented in the client prototype.
7. **Model Poverty Target De-Listing:**
   In [`evaluation-model-registry.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/evaluation-model-registry.js), AGI models are flagged as `isEligible: false` and `status: "NOT_EVALUABLE_INCOMPATIBLE"` for `INDEPENDENT_POVERTY_STATUS`, citing the Regulation 18(2) administrative minimum contribution.

### EvaluationLabTab Holdout Partitioning
In [`sha-mvp/src/EvaluationLabTab.jsx`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/EvaluationLabTab.jsx), model evaluation now consumes:
```javascript
const holdoutRecords = partitionSummary?.partitions?.[PARTITION_TYPES.HOLDOUT] || [];
```
This guarantees that candidate models are evaluated strictly against the independent holdout partition rather than the entire sample.

---

## 5. Assessment Calculation Pathway & Observation Period Repairs

1. **Explicit Zero-Earned-Income Assessment State:**
   - Added `createZeroEarnedIncomeAssessment()` to [`sha-mvp/src/lib/household-income.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/household-income.js).
   - In [`sha-mvp/src/App.jsx`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/App.jsx), when `inputs.hasNoEarnedIncome` is toggled true, the system calls `createZeroEarnedIncomeAssessment()` rather than passing an empty array to `calculateHouseholdIncome([])`.
   - The state is marked `isValid: true`, `monthlyEarnedNetKsh: 0`, `annualisedEarnedNetKsh: 0`, `calculationStatus: "CALCULATED_EXPLICIT_ZERO_EARNED"`, with explicit disclaimers citing Regulation 18(2) minimum contribution and Regulation 19 indigent financial assistance rules (with salaried households governed under Regulation 17(1)–(2)).
2. **Unearned Transfers Blockers:**
   - Any declaration of transfers or social assistance triggers `requiresPolicyDecision: true` and qualifies calculation status as `PROVISIONAL_PENDING_POLICY`.
   - In [`sha-mvp/src/lib/assessment-flow.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/assessment-flow.js), `isProvisionalPolicyPending` flags that transfer treatment requires approved SHA policy rules.
3. **Provisional Short-Window Extrapolations:**
   - Active livelihood sources with 3–11 months of observation are labeled with `periodStatus: "SHORT_WINDOW_PROVISIONAL"`.
   - The assessment outputs `hasProvisionalShortWindowSources: true` and `annualisationReliability: "PROVISIONAL_SHORT_WINDOW_EXTRAPOLATION"`.
4. **Policy Notices for Allowable Costs & Reimbursements:**
   - Added `allowableCostsPolicyNotice` disclaiming that operating expense deductions represent research assumptions requiring statutory approval.
   - Added `reimbursementReconciliationNotice` stating that reconciliation requires explicit itemised mapping to avoid double recovery.

---

## 6. Pilot Readiness, Governance & State Machine Repairs

1. **Stage 2 Normalisation Bug Resolution:**
   - In [`sha-mvp/src/lib/pilot-readiness.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/pilot-readiness.js), added `STAGE_NORMALIZATION_MAP` mapping `STAGE_2_OFFLINE_HISTORICAL_REPLAY` and `OFFLINE_HISTORICAL_REPLAY` seamlessly to `OFFLINE_REPLAY`.
   - Recognized all 5 stage IDs in `PILOT_STAGE_IDS`.
2. **Permitted State Transitions Graph:**
   - In [`sha-mvp/src/lib/pilot-control.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/pilot-control.js), added `ALLOWED_PILOT_CONTROL_TRANSITIONS` enforcing strict lifecycle progression:
     ```
     NOT_STARTED -> [ACTIVE, SUSPENDED, TERMINATED]
     ACTIVE      -> [PAUSED, SUSPENDED, TERMINATED]
     PAUSED      -> [ACTIVE, SUSPENDED, TERMINATED]
     SUSPENDED   -> [ACTIVE, TERMINATED]
     TERMINATED  -> []
     ```
   - Arbitrary state skips (e.g. `NOT_STARTED` -> `PAUSED` or `ACTIVE` -> `NOT_STARTED`) throw descriptive exceptions.
3. **Simulated Rollback Operational Reliance:**
   - Replaced inaccurate claims of 100% verified SHA operational reliance with:
     ```javascript
     operationalRelianceStatus: "SIMULATION_ASSUMES_OFFICIAL_PROCESS_UNCHANGED"
     ```
4. **Checklist Display Refinement:**
   - In [`sha-mvp/src/PilotReadinessTab.jsx`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/PilotReadinessTab.jsx), replaced `(Verified Documented)` with `(Synthetic Demo Checked)`.
5. **Institutional Approval Default:**
   - In `recordInstitutionalApproval()`, defaulted approval status to `PILOT_APPROVAL_STATUS.NOT_REQUESTED`.

---

## 7. KNBS Codebook & Profiler Plausibility

1. **Standard KNBS KIHBS Field Alignment:**
   - In [`sha-mvp/src/lib/data-dictionary-mapper.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/data-dictionary-mapper.js), updated `DEMO_KIHBS_MAPPING_DICTIONARY` to use exact KNBS source fields:
     - `hhid` (Unique Household Identifier)
     - `resid` (Urban / Rural Residence Indicator)
     - `hhsize` (De Jure Household Size)
     - `totcons_annual` (Total Annual Consumption Expenditure)
   - Marked all demo mappings with `reviewerStatus: REVIEWER_STATUSES.DEMO_ONLY`.
2. **Extended Household Preservation:**
   - Replaced arbitrary hard exclusion of household sizes >35 with documented plausibility warnings in [`sha-mvp/src/lib/data-quality-profiler.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/data-quality-profiler.js).
   - Documented rationale: Extended households are common in pastoralist communities and must not be silently excluded.
   - Replaced `isNaN` checks with `Number.isFinite()`, reliably flagging `NaN` and `Infinity`.

---

## 8. README & Institutional Handover Reconciliation

1. **Quarantined Revenue Projections:**
   - Quarantined the KSh 58B informal-sector revenue projection as an uncalibrated scenario that cannot be substantiated without verified compliance and registration data.
2. **Deductions Reclassified:**
   - Replaced claims of "7 evidence-based deductions" with "7 research-informed deduction rules".
3. **Statutory Corrections Propagated:**
   - Audited and updated [`README.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/README.md), [`FINAL_INTEGRITY_AUDIT.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/FINAL_INTEGRITY_AUDIT.md), [`DATA_GOVERNANCE.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/DATA_GOVERNANCE.md), [`DEPLOYMENT_ACCEPTANCE_CRITERIA.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/DEPLOYMENT_ACCEPTANCE_CRITERIA.md), [`LEGAL_AND_DATA_GOVERNANCE_CHECKLIST.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/LEGAL_AND_DATA_GOVERNANCE_CHECKLIST.md), and institutional handover documents.
   - Reconciled statutory citations with gazetted LN 49/2024: Regulation 18(1)–(2) for non-salaried households, Regulation 17(1)–(2) for salaried, and Regulation 21(6) / Fifth Schedule ('Means Testing').

---

## 9. Automated Testing & Build Results

### Test Suite Execution
Executed `node --test tests/*.test.js` via `npm --prefix sha-mvp test`:
* **Total Tests:** 225
* **Passed:** 225 (100%)
* **Failed:** 0
* **Cancelled / Skipped:** 0
* **Duration:** 2.80s

```
TAP version 13
# Subtest: Phase 6.2 — Statutory Baseline: Official SHA Means-Testing Instrument reframed & Fifth Schedule clarified
ok 1 - Phase 6.2 — Statutory Baseline: Official SHA Means-Testing Instrument reframed & Fifth Schedule clarified
...
# Subtest: Phase 6.2 — Byte-for-byte SHA-256 and Git blob integrity of AlgorithmSimulation.original-agi-v2.1.js
ok 20 - Phase 6.2 — Byte-for-byte SHA-256 and Git blob integrity of AlgorithmSimulation.original-agi-v2.1.js
# Subtest: Phase 6.2 — Legal & Governance: Data Access Register & Request Pack use accurate DPA 2019 citations
ok 21 - Phase 6.2 — Legal & Governance: Data Access Register & Request Pack use accurate DPA 2019 citations
1..225
# tests 225
# suites 0
# pass 225
# fail 0
```

### Production Build Verification
Executed `npm --prefix sha-mvp run build`:
* **Result:** Built successfully in 4.34s without errors.
* **Outputs:**
  - `dist/index.html` (30.38 kB)
  - `dist/assets/app-CRxYtkLF.css` (4.99 kB)
  - `dist/assets/app-gfKmn1l9.js` (1,031.19 kB)

---

## 10. Algorithm Byte-for-Byte Preservation Check

The baseline algorithm file [`sha-mvp/src/lib/AlgorithmSimulation.original-agi-v2.1.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/AlgorithmSimulation.original-agi-v2.1.js) was verified byte-for-byte:
* **Git Blob SHA-1:** `61537188d9727e9b01ef4a2c0fadc1c633abaa10` (Identical)
* **Canonical Unix LF SHA-256:** `8D6FB8E4FABF10432D7094CC35E9C8BB509AF51F6D8B4C6427CF147057A683EC` (Identical)
* **Windows CRLF SHA-256:** `4A2BE4D705C06A9116C97F97FE14EE9620BC82C2556A3C4D197FBDDAEBCCDE72` (Identical)

---

## 11. Conclusion & Institutional Posture

With Phase 6.2 complete, the SHA PMT Reform repository adheres to the highest standards of legal accuracy, econometric rigor, and software verification:
1. It makes **zero unverified claims** of empirical superiority.
2. It makes **zero false assertions** regarding statutory PMT schedules.
3. It enforces **fail-closed evaluation gates** that prevent premature or invalid comparisons.
4. It provides SHA with an **authoritative, legally sound, and statistically defensible research proposal**.
