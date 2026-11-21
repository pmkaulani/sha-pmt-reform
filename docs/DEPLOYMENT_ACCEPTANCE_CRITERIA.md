# Deployment Acceptance Framework & Quality Gates
**SHA Means-Testing Reform Institutional Proposal**  
**Document Classification:** Operational Release Acceptance Standard  
**Applicability:** Gate Verification for Staged Pilot Progression & Future Operational Adoption

---

> ### ⚠️ Mandatory Gate Standard
> **Passing automated software tests does NOT constitute deployment readiness.** Deployment acceptance requires verifiable, documented evidence signed off by authorized institutional roles across five distinct domains. An item cannot be checked off without an auditable reference document.

---

## Domain A: Methodological Rigour & Empirical Evidence

- [ ] **A.1 — Independent Empirical Validation Completed:** Candidate models evaluated against verified, representative household consumption microdata (e.g. KNBS KIHBS) under a frozen, pre-registered protocol.
  - *Required Evidence:* Peer-reviewed Independent Evaluation Report; holdout partition performance log.
- [ ] **A.2 — Absence of Unsupported Claims:** All research claims verified by statistical confidence intervals; zero assertions of "superiority" based on synthetic data or single-metric comparisons.
  - *Required Evidence:* Statistical Audit Certificate signed by Independent Evaluation Lead.
- [ ] **A.3 — Subgroup Equity & Disparity Review:** Performance audited across rural/urban divides, 47 counties, and vulnerable demographics; small-cell suppression ($N < 5$) enforced.
  - *Required Evidence:* Subgroup Equity Audit Memorandum; small-cell suppression verification log.
- [ ] **A.4 — Affordability Decoupled from Accuracy:** Contribution burden analyzed separately against measured disposable resources; catastrophic burden rates ($> 15\%$) documented.
  - *Required Evidence:* Affordability Impact Schedule; poverty-line subsidy analysis.
- [ ] **A.5 — Model Inherent Limitations Documented:** Known failure modes, proxy asset distortions, and informal-sector income volatility risks published in full.
  - *Required Evidence:* Public Model Limitations & Risk Addendum.

---

## Domain B: Legal, Regulatory & Data Protection Clearance

- [ ] **B.1 — Statutory Lawful Basis Certified:** Lawful processing basis verified under Kenya Data Protection Act 2019 (Sections 25, 28, 30, and 53).
  - *Required Evidence:* Legal Counsel Statutory Compliance Opinion.
- [ ] **B.2 — Data Protection Impact Assessment (DPIA) Approved:** Comprehensive DPIA completed under DPA Section 31 and reviewed by SHA DPO.
  - *Required Evidence:* Certified DPIA Document; ODPC acknowledgment receipt.
- [ ] **B.3 — Regulation 21 / Fifth Schedule Reconciliation:** Statutory pathway established (e.g. Gazetted regulatory amendment or administrative pilot rule).
  - *Required Evidence:* Ministry of Health Legal Directorate Memorandum; Draft Kenya Gazette Supplement.
- [ ] **B.4 — Meaningful Human Review Safeguards Enforced:** Verification workflows comply with Regulation 22 of the Data Protection (General) Regulations 2021, ensuring substantive human adjudication on automated outputs.
  - *Required Evidence:* Caseworker Adjudication Protocol & Training Manual.
- [ ] **B.5 — Data Minimization & Retention Enforced:** Direct citizen identifiers stripped prior to pilot processing; automated purging verified.
  - *Required Evidence:* Data Engineering Minimization Audit; Cryptographic Erasure Certificate.

---

## Methodological Note on Acceptance Thresholds & Fairness Standards

> ### ⚠️ Rejection of Arbitrary Acceptance Thresholds
> Previous informal proposals suggested arbitrary thresholds such as a $1\%$ pipeline error rate, $15\%$ shadow discrepancy rate, $250\text{ ms}$ latency target, $99.95\%$ uptime, a universal $0.80\text{--}1.25$ disparate-impact ratio across all 47 counties, and a rigid $p < 0.01$ statistical significance rule.
> 
> **These thresholds are NOT approved statutory or institutional policy standards.** They are classified as `NOT_POLICY_APPROVED (Illustrative Design Parameters)`.
> 
> Deployment acceptance requires adherence to the following scientific principles:
> 1. **No Universal Parity Fallacy:** Mandating identical error rates or a uniform $0.80\text{--}1.25$ ratio across all 47 counties is methodologically unsound. Kenyan counties exhibit fundamentally divergent economic realities (e.g. Turkana pastoralism vs. Nairobi urban wage labor vs. Kericho cash-crop agriculture). Fair means-testing requires county-calibrated, livelihood-specific evaluation rather than a blunt national ratio.
> 2. **Exclusion of Raw MAPE on Low Incomes:** Mean Absolute Percentage Error (MAPE) is mathematically invalid when actual household income or consumption is zero or near-zero, resulting in division-by-zero or arbitrary explosion. Weighted Absolute Percentage Error (WAPE), Mean Absolute Error (MAE), and logarithmic error metrics must be used instead.
> 3. **Pre-Registered Multidimensional Evaluation:** Simplistic single-metric pass/fail thresholds are rejected. Acceptance must follow a pre-registered statistical protocol evaluating practical effect sizes, confidence intervals, survey sample weights, and paired distributional comparisons across multiple welfare dimensions.

---

## Domain C: Cybersecurity & Technical Architecture

- [ ] **C.1 — Independent Penetration Testing Passed:** Full-scope network, API, and container penetration test conducted by an accredited third party; zero critical or high vulnerabilities.
  - *Required Evidence:* CREST-accredited Penetration Test Report; Remediation Sign-Off.
- [ ] **C.2 — Air-Gapped Network Isolation Verified:** Execution container cluster verified to possess zero outbound internet routing or DNS resolution.
  - *Required Evidence:* Firewall Rule Configuration Dump; Network Isolation Audit Certificate.
- [ ] **C.3 — Zero Core Database Write-Access:** Automated permission audit proving pilot service accounts have strictly read-only access to SHA core event streams.
  - *Required Evidence:* Database Privilege Audit Log signed by Lead Database Administrator.
- [ ] **C.4 — Immutable Container Signing:** Container image digests signed via Cosign; kubernetes admission controllers configured to reject unsigned builds.
  - *Required Evidence:* Cosign Verification Public Key; Admission Controller Policy Config.
- [ ] **C.5 — Incident Response & Recovery Tested:** Simulated disaster recovery and fail-secure container termination executed successfully.
  - *Required Evidence:* Disaster Recovery Simulation Report (RTO < 30 min, RPO < 5 min).

---

## Domain D: Operational Readiness & Human Oversight

- [ ] **D.1 — Responsible Institutional Owners Assigned:** All 11 governance roles formally appointed with documented letters of assignment.
  - *Required Evidence:* SHA Executive Pilot Governance Charter; Role Assignment Register.
- [ ] **D.2 — Sub-County Officer & CHP Training Completed:** Participating review officers certified on informal-sector expense ledger auditing and discrepancy recording.
  - *Required Evidence:* Staff Training Attendance Register; Reviewer Certification Certificates.
- [ ] **D.3 — Standard Operating Procedures (SOP) Published:** Field manuals published for Community Health Promoters detailing verification boundaries.
  - *Required Evidence:* Approved CHP Means-Testing Verification Manual v1.0.
- [ ] **D.4 — Real-Time Monitoring & Disparity Alerts Configured:** Observability pipelines active with automated PagerDuty/SMS triggers for failure rate spikes.
  - *Required Evidence:* Prometheus/Grafana Alerting Configuration Dump.
- [ ] **D.5 — Emergency Rollback Protocol Tested:** Live dry-run of the 8-step rollback procedure executed without service interruption.
  - *Required Evidence:* Rollback Dry-Run Drill Sign-Off Report.

---

## Domain E: Institutional Governance & Board Authorization

- [ ] **E.1 — SHA Executive Programme Sponsor Approval:** Formal executive sign-off authorizing pilot progression.
  - *Required Evidence:* Executive Pilot Authorization Resolution.
- [ ] **E.2 — SHA ICT Technical Owner Approval:** Formal sign-off on enterprise integration and container security.
  - *Required Evidence:* Directorate of ICT Architecture Sign-Off Certificate.
- [ ] **E.3 — SHA Policy & Planning Owner Approval:** Formal sign-off on tariff brackets, subsidy cutoffs, and health financing alignment.
  - *Required Evidence:* Policy & Planning Directorate Memorandum.
- [ ] **E.4 — Independent Oversight Board Established:** Multidisciplinary oversight panel appointed including civil society and academic observers.
  - *Required Evidence:* Oversight Panel Terms of Reference & Appointment Gazette.
