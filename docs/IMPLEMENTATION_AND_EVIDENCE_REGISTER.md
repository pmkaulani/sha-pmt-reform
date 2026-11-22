# Implementation and Evidence Register
**SHA Means-Testing Reform Institutional Proposal**  
**Document Classification:** Technical Audit & Evidence Register  
**Applicability:** Full System Audit Across Phases 1–6.1

---

> ### ⚠️ Mandatory Audit & Classification Standard
> This register documents the precise verification status of every significant functional, algorithmic, architectural, and governance claim made within the SHA Means-Testing Reform project.
> 
> **Classification Tiers:**
> 1. `IMPLEMENTED_AND_TESTED`: Working source code exists in the repository with passing automated unit tests.
> 2. `IMPLEMENTED_BUT_NOT_INTEGRATION_TESTED`: Source code exists locally, but has only been tested against simulated fixtures, not integrated with external enterprise systems.
> 3. `SYNTHETIC_DEMONSTRATION_ONLY`: Feature operates entirely within an in-browser or client-side sandbox using synthetic test records.
> 4. `DESIGNED_NOT_IMPLEMENTED`: Architectural, technical, or procedural specification documented in Markdown/UML, but no running software implementation exists.
> 5. `REQUIRES_SHA_INTEGRATION`: Functionality fundamentally depends on live SHA enterprise APIs, database taps, or network access that do not exist in the prototype.
> 6. `REQUIRES_INDEPENDENT_EVIDENCE`: Methodology or claim requires independent empirical microdata (e.g. KNBS KIHBS survey) or external academic peer review.
> 7. `REQUIRES_LEGAL_APPROVAL`: Proposed policy, threshold, or data processing requires statutory clearance by the Attorney General, SHA Legal Directorate, or ODPC.
> 8. `UNVERIFIED`: Claim lacks documented technical, empirical, or legal justification and cannot be asserted as fact.

---

## Comprehensive Claims Matrix Across 17 Domains

| Domain # | Functional Area | Specific Claim Made | Source Code / Document Reference | Verifiable Evidence | Verification Method | Implementation Status | Remaining Dependencies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Assessment Calculations** | Structured informal income ledger calculates net earnings with seasonal variance and expense deductions. | `sha-mvp/src/lib/household-income.js`<br/>`sha-mvp/src/lib/assessment-flow.js` | 197 automated unit tests pass locally; handles zero-income, multi-source trade, and seasonal adjustments. | Node.js test runner (`node --test tests/*.test.js`) | `IMPLEMENTED_AND_TESTED` | Needs empirical validation against real Kenyan informal household budgets. |
| **2** | **Model Versioning** | Two distinct engines (Original AGI v2.1 and Declared-Income AGI) execute against the same household snapshot with immutable metadata. | `sha-mvp/src/lib/model-versioning.js`<br/>`sha-mvp/src/lib/AlgorithmSimulation.original-agi-v2.1.js` | Both models evaluate in parallel; outputs tagged with distinct IDs and version hashes. Original file SHA-256 verified. | Unit tests in `tests/pilot-readiness.test.js` & `tests/empirical-evaluation.test.js` | `IMPLEMENTED_AND_TESTED` | None locally; versions are immutable. |
| **3** | **Data Governance** | Data dictionary maps survey concepts to standard schema; missingness profiler flags incomplete records. | `sha-mvp/src/lib/data-dictionary-mapper.js`<br/>`sha-mvp/src/lib/data-quality-profiler.js` | Profiler detects missing values, range violations, and categorical mismatches; returns structured validation logs. | Unit tests in `tests/data-readiness.test.js` | `IMPLEMENTED_AND_TESTED` | Operationalization requires ingestion of official KNBS/SHA raw data. |
| **4** | **Evaluation Engine** | Pre-registered evaluation protocol calculates MAE, RMSE, WAPE, and binary metrics with small-cell suppression ($N < 5$). | `sha-mvp/src/lib/evaluation-metrics.js`<br/>`sha-mvp/src/lib/evaluation-protocol.js` | Mathematical metrics engine tested across continuous and binary vectors; raw MAPE excluded due to zero-denominator instability. | Unit tests in `tests/evaluation-framework.test.js` | `IMPLEMENTED_AND_TESTED` | Requires independent empirical dataset (KNBS KIHBS) to execute real benchmark. |
| **5** | **Pilot Stages** | Staged progression model enforces strict sequential validation (Stages 1 through 5) and rejects stage skipping. | `sha-mvp/src/lib/pilot-stages.js` | `validateStageTransition()` blocks non-sequential leaps (e.g. Stage 1 to 3); specifies permitted and prohibited activities. | Unit tests in `tests/pilot-readiness.test.js` | `IMPLEMENTED_AND_TESTED` | Enforced at code level; institutional enforcement requires SHA Board adoption. |
| **6** | **Institutional Approval** | Technical readiness does not imply approval; formal gate transition requires recorded institutional metadata. | `sha-mvp/src/lib/pilot-readiness.js` | Readiness evaluator returns `READY_FOR_INSTITUTIONAL_APPROVAL` until certified approval metadata is recorded. | Unit tests in `tests/pilot-readiness.test.js` | `IMPLEMENTED_AND_TESTED` | Real approvals require actual SHA Board resolutions and ministerial appointments. |
| **7** | **Operational Monitoring** | Real-time observability dashboard tracks failure rates, missing inputs, and subgroup parity shifts. | `sha-mvp/src/lib/pilot-monitoring.js`<br/>`sha-mvp/src/PilotReadinessTab.jsx` | Monitoring functions evaluate metrics against thresholds; UI displays live cards. **Thresholds are unapproved research defaults.** | Node test runner & React UI component inspection | `SYNTHETIC_DEMO_ONLY`<br/>`DESIGNED_NOT_IMPLEMENTED` | Live telemetry requires integration with SHA enterprise logging (Prometheus/Grafana). |
| **8** | **Incident Handling** | Structured incident logger tracks 7 incident categories, severity levels, containment actions, and audit logs. | `sha-mvp/src/lib/pilot-monitoring.js` | `createPilotIncidentRecord()` validates category, severity, and substantive description; creates traceable records. | Unit tests in `tests/pilot-readiness.test.js` | `IMPLEMENTED_AND_TESTED` | Integration with enterprise incident management systems (Jira / PagerDuty). |
| **9** | **Emergency Rollback** | Automated fail-safe 8-step rollback procedure reverts reliance 100% to official SHA process upon trigger. | `sha-mvp/src/lib/pilot-control.js`<br/>`sha-mvp/src/PilotReadinessTab.jsx` | Control state machine models transitions and records rollback runbook steps (`isSimulatedRunbookAction: true`). | Unit tests in `tests/pilot-readiness.test.js` | `SYNTHETIC_DEMO_ONLY`<br/>`DESIGNED_NOT_IMPLEMENTED` | Real rollback requires automated infrastructure runbooks deployed within SHA Cloud. |
| **10** | **Cybersecurity Controls** | Air-gapped execution enclaves, container isolation via seccomp/AppArmor, and unprivileged user namespaces. | `docs/SECURITY_AND_PRIVACY_ARCHITECTURE.md`<br/>`docs/PROPOSED_PILOT_ARCHITECTURE.md` | Documented architecture and deployment specifications. | Manual architectural inspection | `DESIGNED_NOT_IMPLEMENTED` | Deployment on hardened SHA Kubernetes / Government Cloud infrastructure. |
| **11** | **Cryptographic Encryption** | In-transit TLS 1.3 and at-rest AES-256-GCM encryption with FIPS 140-2 Level 3 HSM key management. | `docs/SECURITY_AND_PRIVACY_ARCHITECTURE.md` | Security policy and target standard specification. | Document review | `DESIGNED_NOT_IMPLEMENTED` | Infrastructure provisioning by SHA ICT Security Directorate. |
| **12** | **WORM Audit Vault** | Write-Once-Read-Many tamper-evident audit storage with HMAC-signed logs and atomic time synchronization. | `docs/SECURITY_AND_PRIVACY_ARCHITECTURE.md` | Architectural specification for statutory audit trail under Kenya DPA and PFMA. | Document review | `DESIGNED_NOT_IMPLEMENTED` | Procurement and configuration of compliant object storage (e.g. AWS S3 Object Lock in Compliance Mode). |
| **13** | **Event Stream Integration** | Asynchronous, unidirectional read-only Apache Kafka tap (`sha.registration.assessments.v1`) feeding shadow workers. | `docs/PROPOSED_PILOT_ARCHITECTURE.md`<br/>`docs/institutional-handover/SYSTEM_ARCHITECTURE.md` | Network topology diagram, event schema specification, and integration interface contract. | Architectural review | `DESIGNED_NOT_IMPLEMENTED`<br/>`REQUIRES_SHA_INTEGRATION` | SHA ICT implementation of Kafka producer and network diode. |
| **14** | **Database Isolation** | Pilot workers possess zero network routing and zero SQL write credentials to SHA production databases. | `docs/PROPOSED_PILOT_ARCHITECTURE.md` | Database privilege specifications and network microsegmentation topology. | Architectural review | `DESIGNED_NOT_IMPLEMENTED`<br/>`REQUIRES_SHA_INTEGRATION` | SHA Database Administrator (DBA) permission auditing and network VPC isolation. |
| **15** | **Live SHA Interfaces** | Automated verification queries against KRA PIN, NTSA motor vehicle records, and M-Pesa statements. | `sha-mvp/src/lib/AlgorithmSimulation.js`<br/>`docs/institutional-handover/EXECUTIVE_PROPOSAL.md` | Code contains heuristic simulations; UI includes explicit disclaimer that live APIs are disconnected. | Code inspection & regex search (`tests/pilot-readiness.test.js`) | `SYNTHETIC_DEMO_ONLY`<br/>`REQUIRES_SHA_INTEGRATION` | Inter-agency data exchange agreements between SHA, KRA, and NTSA. |
| **16** | **Human Review Workflow** | Non-binding assisted caseworker adjudication workflow documenting evidence, observations, and dual sign-off. | `sha-mvp/src/lib/pilot-review-workflow.js`<br/>`sha-mvp/src/lib/appeal-workflow.js` | Adjudication engine creates review records with `isBindingOnOfficialRecord: false`; maintains audit history. | Unit tests in `tests/pilot-readiness.test.js` | `IMPLEMENTED_AND_TESTED` | Field rollout with Community Health Promoters and sub-county review officers. |
| **17** | **Production Deployment** | System is ready for live operational deployment to calculate binding contributions for Kenyan citizens. | `docs/DEPLOYMENT_ACCEPTANCE_CRITERIA.md`<br/>`docs/institutional-handover/DEPLOYMENT_ACCEPTANCE.md` | Multi-domain acceptance criteria document 25 distinct gating requirements across 5 domains. | Checklist evaluation | `DESIGNED_NOT_IMPLEMENTED`<br/>`REQUIRES_LEGAL_APPROVAL`<br/>`REQUIRES_INDEPENDENT_EVIDENCE` | Complete execution of Stages 1 through 5, independent statistical audit, and formal legal gazettement. |

---

## Summary of Implementation Audit Findings

1. **What is Genuinely Implemented:**
   - Calculation mathematics for informal livelihood ledgers, seasonal amortizations, and expense deductions.
   - Dual-model execution framework maintaining historical AGI v2.1 alongside declared-income AGI.
   - Stage progression validation and gate readiness evaluation logic.
   - Synthetic incident response and human review adjudication data structures.
   - Statistical evaluation contracts (MAE, RMSE, WAPE, balanced classification metrics).

2. **What is Synthetic Demonstration Only:**
   - Browser dashboard telemetry gauges and incident alerts.
   - Emergency rollback drill state transitions.
   - Demonstration challenge cases and simulated household profiles.

3. **What is Architectural Design (Not Deployed Infrastructure):**
   - Apache Kafka read-only event streaming tap.
   - AES-256-GCM and TLS 1.3 encrypted container clusters.
   - Air-gapped network enclaves and Kubernetes admission controllers.
   - WORM tamper-evident audit storage vaults.

4. **Critical Dependencies for Progression:**
   - **Empirical Validation:** Access to representative KNBS household survey data.
   - **Institutional Transparency:** Disclosure of official Regulation 21 econometric parameters and regression weights from SHA (provisional external disclosures pending official verification).
   - **Statutory Authority:** Legal opinion from SHA Counsel and DPO approving the shadow testing protocol under Kenya DPA 2019.
