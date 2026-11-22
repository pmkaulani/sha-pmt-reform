# Proposed Institutional Pilot Architecture
**Social Health Authority (SHA) Means-Testing Reform**  
**Document Classification:** Technical Architecture Specification  
**Scope:** Staged Pilot Architecture (Stages 1–5) & Enterprise Integration Boundaries

---

> ### ⚠️ Architectural Scope & Trust Boundary Notice
> This document specifies the proposed technical architecture for a future **SHA-controlled, air-gapped pilot environment**. The current repository is a client-side research and evaluation prototype. **No application-level API submission path to an SHA backend or other assessment-data service was identified in inspected source; the interface references Google Fonts for standard typography (generating ordinary connection metadata, distinct from submitting household data); code inspection is not packet-capture verification; the prototype has zero connection to live SHA infrastructure or member databases.** The interfaces documented below represent technical integration contracts for SHA's enterprise engineering teams.

---

## 1. System Context & Environment Separation

To ensure absolute operational safety, the architecture strictly decouples three distinct environments:

```mermaid
flowchart TD
    subgraph Env1["Environment 1: Demonstration Prototype (Current)"]
        A["Vite/React Client Demo"] --- B["Synthetic Fixtures & Sandbox State"]
    end

    subgraph Env2["Environment 2: Secure Research Enclave (Phase 4–5)"]
        C["Air-Gapped Offline Server"] --- D["Licensed KNBS Microdata & Baseline Records"]
        C --- E["Paired Evaluation Engine & Holdout Partitioning"]
    end

    subgraph Env3["Environment 3: SHA Operational Pilot Infrastructure (Future Stage 3–4)"]
        F["SHA Core Member Portal"] -->|Asynchronous Event Stream (Read-Only)| G["Data Validation Gateway"]
        G --> H["Isolated Model Execution Worker"]
        H --> I["Evaluation & Shadow Ledger DB"]
        I --> J["CHP / Officer Review Portal"]
        F -.->|Zero Write Access| I
    end
```

---

## 2. Core Architectural Components

The proposed operational pilot consists of 12 modular components designed under zero-trust principles:

### Component 1: Existing SHA Member & Assessment Core
- **Purpose:** Primary statutory production system governing citizen registration, assessment, billing, and NHIF/SHIF legacy migration under Regulation 21.
- **Responsibilities:** Ingests citizen declarations, executes official Regulation 21 scoring, and issues statutory monthly premium bills.
- **Data Inputs:** Citizen portal entries, USSD submissions, Huduma Centre assisted forms.
- **Data Outputs:** Official member status, statutory assessment tier, billing ledger.
- **Trust Boundary:** Internal Government Zone (Restricted).
- **Access Controls:** SHA core enterprise RBAC, multi-factor authentication.
- **Failure Behavior:** Operates completely independently; candidate pilot failure has zero effect.
- **Ownership:** SHA Directorate of ICT.

### Component 2: Approved Data Exchange Interface (Proposed Broker Specification)
- **Status:** `DESIGNED_NOT_IMPLEMENTED` (Requires SHA ICT enterprise implementation; no live broker exists in this repository).
- **Purpose:** Secure, unidirectional message broker feeding de-identified registration events to the pilot shadow pipeline.
- **Responsibilities:** Publishes asynchronous event payloads (Apache Kafka / RabbitMQ) containing proxy variables without direct citizen identifiers (PII stripped at egress).
- **Data Inputs:** Registration assessment events from Core.
- **Data Outputs:** De-identified event streams (`AssessmentEvent_v1`). Note: Pseudonymized records remain personal data under Kenya DPA 2019.
- **Trust Boundary:** Egress perimeter of SHA Core.
- **Access Controls:** Mutual TLS (mTLS), IP allow-listing, signed JWT tokens.
- **Failure Behavior:** Queue buffer backpressure; drops to dead-letter queue if downstream pilot pauses. Zero core transaction delay.
- **Ownership:** SHA Core Integration Team.

### Component 3: Data Validation & Ingestion Gateway
- **Purpose:** Enforces input schema contracts, data dictionary mappings, and deterministic quality checks.
- **Responsibilities:** Validates variable units, detects missing mandatory fields, and filters out duplicate transaction IDs.
- **Data Inputs:** Ingested event payloads.
- **Data Outputs:** Validated canonical case objects (`CanonicalCaseRecord`).
- **Trust Boundary:** Pilot DMZ Ingress.
- **Access Controls:** Internal service accounts, HMAC payload signing.
- **Failure Behavior:** Emits `DATA_QUALITY_INCIDENT` alert and routes defective payload to quarantine storage without processing.
- **Ownership:** Pilot Operations & Data Engineering Team.

### Component 4: Model Execution Environment (Isolated Worker)
- **Purpose:** Executes candidate means-testing algorithms (Original AGI v2.1, Declared-Income AGI) in containerized isolation.
- **Responsibilities:** Calculates candidate assessment bases and monthly contribution amounts without external network egress.
- **Data Inputs:** Validated canonical case objects.
- **Data Outputs:** Candidate assessment results (`CandidateCalculationResult`).
- **Trust Boundary:** Air-Gapped Microsegment.
- **Access Controls:** Read-only container filesystems, unprivileged Linux namespaces (`seccomp`, `AppArmor`).
- **Failure Behavior:** Worker thread timeout (1000ms); logs failure and triggers pause condition if failure rate exceeds 2%.
- **Ownership:** Pilot Infrastructure Team.

### Component 5: Model Registry & Immutability Manager
- **Purpose:** Maintains verified mathematical specifications, compiled container image digests, and parameter hashes.
- **Responsibilities:** Enforces that only frozen, pre-registered model builds can be instantiated in the execution environment.
- **Data Inputs:** Version-tagged model release manifests.
- **Data Outputs:** Cryptographic verification tokens.
- **Trust Boundary:** Secure Governance Enclave.
- **Access Controls:** Multi-role cryptographic signing (Programme Sponsor + Technical Owner).
- **Failure Behavior:** Execution worker refuses to launch if image digest or parameter hash differs from the registry manifest.
- **Ownership:** Technical System Owner & Independent Evaluation Team.

### Component 6: Evaluation & Comparison Service
- **Purpose:** Computes paired differences, distribution shifts, and affordability burden metrics across shadow runs.
- **Responsibilities:** Compares candidate scores with official scores on identical timestamps and records.
- **Data Inputs:** Paired candidate outputs and official assessment records.
- **Data Outputs:** Distributional variance reports, county disparity summaries.
- **Trust Boundary:** Internal Analytics Zone.
- **Access Controls:** Role-based access for authorized biostatisticians and evaluation leads.
- **Failure Behavior:** Halts comparative analysis if baseline parameters are missing or constructs diverge.
- **Ownership:** Independent Evaluation Team.

### Component 7: Assisted Human Review Interface
- **Purpose:** Secure web application for sub-county review officers and Community Health Promoters (Stage D).
- **Responsibilities:** Displays itemized income/expense ledgers and candidate insights alongside official records during member inquiries.
- **Data Inputs:** Review case records, uploaded evidence metadata.
- **Data Outputs:** Reviewer factual observations, correction recommendations.
- **Trust Boundary:** SHA Intranet / Secure VPN.
- **Access Controls:** Role-based sub-county officer credentials, biometric / FIDO2 MFA, session timeouts.
- **Failure Behavior:** Read-only fallback; failure does not disrupt existing official manual appeal pathways.
- **Ownership:** SHA Operations & Review Directorate.

### Component 8: Audit & Event-Recording Service
- **Purpose:** Cryptographically auditable, tamper-evident event log.
- **Responsibilities:** Records every model execution, user login, adjudication action, and configuration change.
- **Data Inputs:** Internal audit telemetry events.
- **Data Outputs:** WORM (Write Once, Read Many) audit log entries.
- **Trust Boundary:** High-Security Audit Vault.
- **Access Controls:** Append-only permissions; zero modification or deletion rights.
- **Failure Behavior:** System enters fail-secure pause if audit pipeline fails.
- **Ownership:** Independent Audit Function & Data Protection Officer.

### Component 9: Operational Reporting & Monitoring Pipeline
- **Purpose:** Real-time observability dashboard tracking model health, latency, failure rates, and distribution anomalies.
- **Responsibilities:** Evaluates telemetry against documented thresholds and fires PagerDuty / SMS alerts.
- **Data Inputs:** Aggregated execution statistics.
- **Data Outputs:** Operational health dashboards, alert notifications.
- **Trust Boundary:** Internal Management Zone.
- **Access Controls:** Pilot operations coordinators, infrastructure engineers.
- **Failure Behavior:** Alerts operations team on monitoring heartbeat loss.
- **Ownership:** Pilot Operations Coordinator.

### Component 10: Security & Identity Management (IAM)
- **Purpose:** Centralized authentication, authorization, and cryptographic key management.
- **Responsibilities:** Manages user identities, enforces separation of duties, and rotates TLS certificates and KMS keys.
- **Data Inputs:** Authentication requests, directory credentials.
- **Data Outputs:** Scoped, short-lived OAuth 2.0 / OIDC access tokens.
- **Trust Boundary:** Enterprise Security Core.
- **Access Controls:** Hardware Security Module (HSM), automated key rotation policies.
- **Failure Behavior:** Denies access on authentication service failure.
- **Ownership:** SHA Cybersecurity Directorate.

### Component 11: Incident Response & Emergency Rollback Controller
- **Purpose:** Authoritative state-machine controller capable of immediately pausing or terminating pilot pipelines.
- **Responsibilities:** Executes the 8-step standardized rollback procedure upon detection of critical security or data anomalies.
- **Data Inputs:** Manual emergency triggers, automated critical alerts.
- **Data Outputs:** Kill-switch execution commands, governance broadcast alerts.
- **Trust Boundary:** Air-Gapped High-Privilege Control Zone.
- **Access Controls:** Multi-party authorization (requires 2 of 3 key roles: Sponsor, Tech Owner, DPO).
- **Failure Behavior:** Fails safe into disconnected SUSPENDED state.
- **Ownership:** SHA Programme Sponsor & Cybersecurity Lead.

### Component 12: Backup, Archival & Disaster Recovery
- **Purpose:** Ensures business continuity and compliance with statutory data retention limits.
- **Responsibilities:** Encrypts and archives pilot audit records and evaluation outputs; securely erases temporary scratch caches.
- **Data Inputs:** Snapshot dumps from pilot databases.
- **Data Outputs:** Encrypted off-site archives (AES-256).
- **Trust Boundary:** Secure Disaster Recovery Site (Geographically isolated within Kenya).
- **Access Controls:** Dual-custody physical and cryptographic access.
- **Failure Behavior:** Redundant storage failover.
- **Ownership:** Enterprise Infrastructure & Disaster Recovery Directorate.

---

## 3. Non-Interference Design Specifications & Implementation Prerequisites

> ### ⚠️ Status & Implementation Prerequisite
> - **Current Prototype:** Standalone, disconnected research software. It currently has zero network links to live SHA databases or cloud VPCs.
> - **Target Pilot Design:** Outlined below as an architectural blueprint for Stages 2–3.
> - **Mandatory Prerequisites:** These non-interference controls require formal cloud infrastructure implementation, configuration of read-only IAM policies, independent penetration testing, and formal SHA Board approval prior to pilot operation.

1. **Zero Core Write Access:** The proposed pilot pipeline requires network routing and database permissions that strictly forbid write access to primary SHA billing or member tables.
2. **Asynchronous Decoupling:** In the event of total failure or shutdown of the pilot container cluster, asynchronous decoupling ensures zero latency or disruption for citizens registering on official SHA portals.
3. **Fail-Safe Operational Reversion:** If any pilot component is suspended, all operational reliance immediately reverts 100% to the official Regulation 21(6) instrument.
