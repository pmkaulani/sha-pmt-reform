# Institutional Risk Register & Mitigation Strategy
**Document Series:** Institutional Handover Package (9 of 12)  
**Target Audience:** Risk Committees, Audit Leads, and Legal Advisers  

---

| Risk Description | Severity | Likelihood | Required Institutional Control | Residual Risk |
| :--- | :--- | :--- | :--- | :--- |
| **Incorrect Household Assessment:** Candidate model underestimates or overestimates economic capacity. | High | Medium | Human review pathway in Stage D; experimental outputs strictly prohibited from modifying official bills. | Low |
| **Data Privacy Incident / Re-Identification:** De-identified survey attributes linked to actual households. | Critical | Low | PII stripped at egress; air-gapped execution enclave; small-cell suppression ($N < 5$); full DPIA certification. | Very Low |
| **Operational Interference with Core SHA:** Pilot pipeline introduces latency or crashes core registration portal. | Critical | Low | Read-only asynchronous event diode (Kafka); zero database write privileges; zero core system dependencies. | Very Low |
| **Subgroup Disparity / Geographic Bias:** Model exhibits higher error rates in pastoralist or informal settlements. | High | Medium | Continuous automated disparity monitoring; mandatory disaggregation across 47 counties. | Low |
| **Premature Adoption Without Statutory Basis:** Operating unamended alternative formulas in production violates Regulation 21. | Critical | Low | Hardcoded governance state machine; candidate models cannot be selected as official without Gazetted amendment. | Very Low |
| **Uncontrolled Model Versioning:** Drift between tested algorithm and deployed code. | High | Low | Cryptographic container image signing; immutable Git commit pinning; automated digest validation. | Very Low |
