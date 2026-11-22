# Phase 6.1 — Final Integrity, Legal and Institutional Claims Audit Report
**SHA Means-Testing Reform Prototype**  
**Repository:** `pmkaulani/sha-pmt-reform`  
**Branch:** `recovery/restore-original-agi-v2.1`  
**Audit Date:** 2026-11-21  
**Classification:** Definitive Institutional Quality & Integrity Audit

---

## Executive Overview
Phase 6.1 was commissioned as an exhaustive quality-control and integrity audit across Phases 1 through 6. The mandate of this audit is not feature expansion, but the rigorous correction of unsupported institutional, legal, algorithmic, and architectural claims, ensuring that the repository stands up to scrutiny by the Social Health Authority (SHA) Board, Chief Executive Officer, ICT Directorate, Legal Directorate, Data Protection Officer, and independent biostatisticians.

---

## 1. What is Genuinely Implemented & Tested

The following capabilities exist as functional, locally tested JavaScript software within `sha-mvp/src/lib/`:
1. **Multi-Source Informal Income Ledger (`household-income.js`):**
   - Calculates net earned income across multiple informal livelihood categories (farming, micro-retail, transport, casual labor).
   - Separates non-earned transfers (remittances, soft loans, welfare assistance) from earned income.
   - Computes deductible operating expenses and amortizes seasonal high/low earnings without artificial clamping.
2. **Model Versioning & Multi-Engine Parallel Execution (`model-versioning.js`):**
   - Concurrently executes the historical Asset-and-Liquidity AGI v2.1 engine and the Declared-Income AGI engine against identical household snapshots.
   - Enforces distinct model IDs, version tags, and calculation provenance metadata.
3. **Pre-Registered Empirical Evaluation Engine (`evaluation-metrics.js`, `evaluation-protocol.js`):**
   - Implements Continuous metrics (MAE, RMSE, Mean Signed Error/bias) and Weighted Absolute Percentage Error (WAPE).
   - Computes binary classification metrics (Sensitivity, Specificity, Precision, FPR, FNR, Balanced Accuracy) returning `null` on zero denominators.
   - Enforces small-cell suppression ($N < 5$) to prevent deanonymization on demographic sub-samples.
4. **Deterministic Partitioning Engine (`evaluation-partitioning.js`):**
   - Partitions datasets deterministically by household ID (50% Development, 20% Calibration, 30% Holdout) ensuring zero data leakage.
5. **Sequential Pilot Progression State Machine (`pilot-stages.js`):**
   - Validates transitions across 5 sequential stages (`STAGE_1_TECHNICAL_REVIEW` to `STAGE_5_INDEPENDENT_EVALUATION`).
   - Programmatically blocks stage skipping (e.g. Stage 1 directly to Stage 3 or Stage 5).
6. **Pilot Readiness Gate Engine (`pilot-readiness.js`):**
   - Requires 4 to 8 distinct documentary evidence artifacts per stage.
   - Distinguishes technical readiness (`READY_FOR_INSTITUTIONAL_APPROVAL`) from formal institutional approval (`APPROVED_FOR_STAGE`).
7. **Assisted Human Review Adjudication Workflow (`pilot-review-workflow.js`):**
   - Creates review cases with candidate model references, input snapshots, and evidence catalogs.
   - Records caseworker observations and dual sign-off while setting `isBindingOnOfficialRecord: false`.
8. **Structured Incident Response Engine (`pilot-monitoring.js`):**
   - Validates and logs operational incidents across 7 formal categories with required substantive descriptions and severity tiers.

---

## 2. What is Only Synthetically Demonstrated

The following components operate purely within client-side React demonstration state using synthetic fixtures and mocks:
1. **Pilot Telemetry Dashboard:** Gauges and health indicators in `PilotReadinessTab.jsx` are fed by simulated numbers, not connected to live SHA Prometheus/Grafana feeds.
2. **Emergency Rollback Drill Controller:** The rollback button in `PilotReadinessTab.jsx` executes an in-memory simulation of the 8-step runbook (`isSimulatedRunbookAction: true`); it does not command physical servers or kill remote processes.
3. **Demonstration Challenge & Adjudication Queues:** Caseworker review samples in `ReviewTab.jsx` and `PilotReadinessTab.jsx` display synthetic household vectors for UI demonstration.

---

## 3. What is Only Architectural Design (Not Deployed Infrastructure)

The following capabilities are enterprise technical specifications documented in `docs/PROPOSED_PILOT_ARCHITECTURE.md` and `docs/SECURITY_AND_PRIVACY_ARCHITECTURE.md`, but have **no deployed implementation** in this repository:
1. **Asynchronous Apache Kafka Read-Only Tap:** The unidirectional message diode (`sha.registration.assessments.v1`) feeding de-identified events is an architectural integration contract for SHA enterprise ICT, not a running broker.
2. **Cryptographic WORM Audit Vault:** Write-Once-Read-Many object storage with HMAC logging and atomic time-stamping is a design requirement for production custody.
3. **Air-Gapped Network Enclaves:** VPC routing blocks, disabled DNS resolution, and Kubernetes admission controllers (Cosign/Kyverno) are infrastructure designs for SHA Government Cloud (G-Cloud).
4. **At-Rest AES-256-GCM & In-Transit TLS 1.3:** Security target standards for production database clusters.
5. **Live Third-Party Integrations:** No live API connections to KRA, NTSA, or Safaricom M-Pesa exist.

---

## 4. Legal & Regulatory References Corrected

All legal and data governance documents have been audited and corrected:

### Kenya Data Protection Act, 2019 Corrections:
* **Section 25:** Correctly designated as **Principles of Data Protection** (Lawfulness, fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity/confidentiality).
* **Section 28:** Correctly cited as **Collection of Personal Data** (Direct collection requirement).
* **Section 29:** Corrected from an erroneously claimed "research exemption/legal basis" to its actual statutory subject: **Duty to Notify the Data Subject** prior to collection.
* **Section 30:** Designated as the authoritative statutory section for **Lawful Processing and Legal Bases**. Documented that SHA as a public authority must determine its lawful basis under Section 30(1)(e) (public duty/official authority) or Section 30(1)(c) (legal obligation), rather than assuming member consent.
* **Section 31:** Correctly detailed as the mandate for **Data Protection Impact Assessments (DPIAs)** for high-risk automated profiling, including triggers for prior consultation with the ODPC.
* **Section 35 & Regulation 22:** Clarified that under Section 35 and Regulation 22 of the Data Protection (General) Regulations 2021, automated decision-making requires **substantive, meaningful human intervention**, and that a perfunctory review checkbox does not satisfy statutory requirements.
* **Section 53:** Correctly cited as **Processing for Research, Statistical, and Historical Purposes** alongside the **ODPC 2025 Guidance Notes on Processing for Research Purposes**.

### Social Health Insurance Statutory & Regulatory Alignment:
* **Legal Notice No. 49 of 2024 (Social Health Insurance Regulations, 2024):**
  * **Regulation 17:** Governs contributions for persons in salaried employment.
  * **Regulation 18(1):** Establishes the annual contribution rate of 2.75% of household income determined through the means-testing instrument for households whose income is not derived from salaried employment.
  * **Regulation 18(2):** Establishes the statutory minimum contribution floor of KSh 300 per month (KSh 3,600 annually).
  * **Regulation 18(3):** Governs payment timing before the annual contribution lapses.
  * **Regulation 19:** Governs households in need of financial assistance (indigent households). Administrative application of the KSh 300 floor under Reg 18(2) does NOT constitute a statutory indigent determination.
  * **Regulation 21(2):** Mandates that the means-testing instrument be developed by the Cabinet Secretary for Health in collaboration with the Cabinet Secretary responsible for social protection.
  * **Regulation 21(6):** Explicitly prescribes that means testing is conducted using the formula set out in the Fifth Schedule.
  * **Fifth Schedule ('Means Testing'):** The Fifth Schedule to the gazetted Regulations is titled **"Means Testing"** and contains stated urban and rural regression equations. *(Note: While the functional equation is gazetted, SHA's full operational regression weights, variable codebooks, categorical transformations, and cutoff parameters remain undisclosed).*
  * **Regulation 62 ('Zones'):** Regulation 62 is titled **"Zones"**, designating regional geographic county groupings for health facility tariffs.
* **Revocation of LN 147/2024 by LN 55/2025:** Legal Notice 55 of 2025 expressly revokes Legal Notice 147 of 2024 in Clause 9.
* **Statutory Reconciliation:** The documentation explicitly presents whether the structured income ledger can be introduced administratively under Regulation 21(2) or requires an amendment to the Regulations as an **unresolved legal question requiring formal advice from the Attorney General and SHA Legal Counsel**.

---

## 5. Unsupported Monitoring Thresholds Corrected

The previously reported fixed thresholds have been systematically audited:
1. **Threshold De-Listing:** The following parameters have been stripped of mandatory acceptance status:
   - 1% pipeline error rate
   - 15% shadow discrepancy rate
   - 500 ms p99 latency target
   - 5% subgroup parity change
   - 8% dispute escalation rate
   - 250 ms deployment latency
   - 99.95% uptime target
   - 0.80–1.25 universal disparate impact ratio across 47 counties
   - $p < 0.01$ rigid statistical significance pass/fail rule
2. **Status Classification:** All threshold values in `pilot-monitoring.js` and `PilotReadinessTab.jsx` are now explicitly typed as `NOT_POLICY_APPROVED (Illustrative Design Parameters)` with `isPolicyApproved: false`.
3. **Rejection of Universal County Parity:** Imposing an arbitrary 0.80–1.25 parity ratio uniformly across all 47 counties is rejected as methodologically unsound, because pastoralist (e.g. Turkana), agricultural (e.g. Kericho), and urban (e.g. Nairobi) economies possess fundamentally divergent livelihood dynamics.
4. **Exclusion of Raw MAPE on Low Incomes:** Mean Absolute Percentage Error (MAPE) is explicitly excluded for low-income and subsistence evaluations because division by zero or near-zero reference values produces arbitrary explosion. Weighted Absolute Percentage Error (WAPE), MAE, and logarithmic error metrics are reported instead.

---

## 6. Tokenisation and Security Claims Corrected

1. **Rejection of UUIDv5 as Irreversible Anonymisation:**
   - Corrected all assertions claiming UUIDv5 is "irreversible anonymisation".
   - Documented that UUIDv5 is deterministic RFC 4122 namespace hashing without a secret key, leaving narrow identifier spaces (such as 7 to 8-digit Kenyan National IDs, $\approx 50\text{ million}$ values) completely vulnerable to exhaustive dictionary and rainbow-table brute-forcing.
2. **Rigorous Cryptographic Taxonomy Documented:**
   - Clearly distinguished Hashing, Keyed Pseudonymisation (HMAC with secret pepper), Tokenisation (isolated vault surrogate keys), Genuine Anonymisation ($k$-anonymity, differential privacy), and Symmetric Encryption (AES-256-GCM).
3. **Legal Status of Pseudonymised Data:**
   - Documented that under Section 2 of the Kenya Data Protection Act 2019, **pseudonymised data remains personal data**, subject to all data protection principles.
4. **Mandatory Prototype Security Disclaimer:**
   - Prominently stated in all architecture documents and UI panels that the local prototype is a research tool and is **NOT secure or certified for real citizen data**.

---

## 7. Institutional Approvals Requiring Real Documentation

1. **Purge of Fabricated Names and References:**
   - All actual-sounding sample approvers (e.g. "Dr. A. O. (Acting CEO)", "SHA-BOARD-RES-2026-04") have been removed from codebase defaults and documentation.
2. **Explicit Governance States Enforced:**
   - Role assignments and approval fields operate under explicit states:
     `NOT_ASSIGNED`, `NOT_REQUESTED`, `PENDING`, `SYNTHETIC_DEMO_ONLY`, `APPROVED_WITH_VERIFIED_REFERENCE`.
   - All 11 governance roles in `pilot-governance.js` default to `NOT_ASSIGNED` with `approvalReference: null`, `dateRecorded: null`.
   - In `pilot-readiness.js`, `recordInstitutionalApproval` defaults to requiring certified references; passing `isSyntheticDemo: true` sets gate status to `SYNTHETIC_DEMO_ONLY`, preventing fake approvals from advancing stage gates.

---

## 8. Exact SHA Baseline Limitations

The project’s current reconstruction of the official SHA baseline has specific, documented boundaries:
1. **Unverified OLS Weights:** The regression weights and regional fixed effects in `AlgorithmSimulation.js` are historical approximations; SHA has not publicly released the official production regression table.
2. **Lack of Operational Codebook:** The exact question skips and categorical base encodings used in the live USSD and web portal are pending official disclosure.
3. **No Direct System Comparison:** Until SHA discloses the parameters requested in `docs/institutional-handover/SHA_INFORMATION_REQUEST.md`, candidate models cannot be compared against the actual deployed instrument.

---

## 9. Remaining Phase 2.1 Issues

1. **Assessment Period Modeling:** In `household-income.js` and `assessment-flow.js`, observation periods and annualization multipliers must remain fully configurable based on verifiable livelihood cycles rather than arbitrary defaults.
2. **Dispute Mapping Robustness:** Unmapped descriptive disputes continue to fail safe to human review, which is methodologically correct, but requires field validation of caseworker time constraints.

---

## 10. Exact Original AGI v2.1 Preservation Result

The original asset-and-liquidity AGI v2.1 algorithm was recovered from historical master commit `c1a5a09cdfff15035c5bf012acc3ff932786e87a` and preserved in commit `e4065d25dfdb097a86d39f08e1156c355653af1f`.

**Cryptographic Verification:**
* **File Path:** `sha-mvp/src/lib/AlgorithmSimulation.original-agi-v2.1.js`
* **Git Blob Hash:** `61537188d9727e9b01ef4a2c0fadc1c633abaa10`
* **Canonical Unix LF SHA-256:** `8D6FB8E4FABF10432D7094CC35E9C8BB509AF51F6D8B4C6427CF147057A683EC` (Normalized Git blob reference)
* **Windows CRLF SHA-256:** `4A2BE4D7583E57AB8D013784C30F96A0602BEDCB7A8E7E752D47C969B70D28D7` (Local checkout with CRLF)
* **Status:** **100% Byte-for-Byte Identical and Untouched.**

---

## 11. Test, Build, and Security Audit Results

All automated verification commands were executed in the Windows workspace:

### A. Phase 6 & 6.1 Pilot Readiness Test Suite
* **Command:** `node --test sha-mvp/tests/pilot-readiness.test.js`
* **Result:** **22 / 22 Tests Passed** (0 failures, 0 skipped, duration: 1.48s)
* **Coverage:** Sequential stage transitions, missing evidence blocking, approval metadata validation, synthetic demo flagging, non-binding review workflows, incident logging, simulated rollback, separation of duties, zero live API assertions, 12 handover documents existence, AGI v2.1 SHA-256 verification, WAPE metric calculation, unapproved threshold flags, and default `NOT_ASSIGNED` role states.

### B. Full Repository Test Suite
* **Command:** `npm --prefix sha-mvp test`
* **Result:** **204 / 204 Tests Passed** across all 8 test suites (0 failures, duration: 3.12s)

### C. Production Client Build
* **Command:** `npm --prefix sha-mvp run build`
* **Result:** **Clean Vite v8.3.8 Build** (built in 5.59s, outputs in `dist/`)

### D. Security Audit
* **Command:** `npm --prefix sha-mvp audit`
* **Result:** **0 Vulnerabilities Found** across 107 scanned packages.

---

## 12. Whether the Project is Ready for External Technical Review

### Verdict: **YES — FOR CONTROLLED ACADEMIC & TECHNICAL PEER REVIEW.**
The project is structurally, methodologically, and legally prepared for inspection by external technical peers, SHA enterprise architects, and university biostatisticians under sandbox conditions.

### Caveats:
* It is **NOT** ready for live operational deployment.
* It is **NOT** ready to calculate legally binding member contributions.
* It must be presented strictly as an **institutional research proposal and empirical evaluation framework**.

---

## 13. What SHA Must Provide Next

To transition from research prototype into an empirical validation exercise, the Social Health Authority must provide:
1. **The Deployed MTI Specification:** Official regression weights, regional constants, preprocessing transforms, and tariff cutoff bands deployed under Regulation 21 (which remain undisclosed administrative operational parameters rather than a statutory schedule).
2. **The 43-Variable Operational Codebook:** Question wordings, skip patterns, and preprocessing reference categories.
3. **Statutory Legal Basis Designation:** Formal legal opinion on applicable lawful processing grounds under DPA Section 30.
4. **Data Sharing Agreement (DSA):** Formal inter-agency agreement under DPA Section 53 and ODPC 2025 Research Guidance for an anonymized benchmark sample (sample size determined via formal statistical power calculation).
5. **Designation of Pilot Counterparts:** Formal appointment of the SHA Programme Sponsor, Technical Owner, and Data Protection Officer to supervise the evaluation.
