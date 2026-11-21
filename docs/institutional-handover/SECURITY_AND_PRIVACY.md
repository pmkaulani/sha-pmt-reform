# Security Architecture & Cryptographic Safeguards
**Document Series:** Institutional Handover Package (7 of 12)  
**Target Audience:** Chief Information Security Officers (CISOs) and Cybersecurity Auditors  

---

### 1. Cryptographic Standards (Proposed Architecture)
- **In Transit:** TLS 1.3 with mandatory mTLS between microservices.
- **At Rest:** AES-256-GCM encryption for all database volumes, backups, and message buffers.
- **Key Management:** FIPS 140-2 Level 3 HSM with automated annual key rotation.
- **Tokenisation vs. Anonymisation:** Rejects deterministic hashing (such as UUIDv5) as irreversible anonymisation due to vulnerability to dictionary enumeration. Future pipelines specify keyed HMAC or isolated vault tokenisation; pseudonymised microdata remains personal data under Kenya DPA 2019.

### 2. Network Isolation & Air-Gapping (Proposed Architecture)
- Execution worker containers operate on an air-gapped virtual network with zero internet routing and disabled DNS.
- Unidirectional event streaming ensures the pilot pipeline cannot execute write operations against core SHA databases.
- Full security specification documented in [`docs/SECURITY_AND_PRIVACY_ARCHITECTURE.md`](file:///c:/Users/STD%20USER/Desktop/work/SHA/docs/SECURITY_AND_PRIVACY_ARCHITECTURE.md).

> ### ⚠️ Prototype Security Boundary Notice
> The controls listed above represent enterprise target specifications for SHA institutional custody. **They are NOT deployed in the local web application.** The prototype runs on synthetic fixtures and is **not certified or secure for real citizen data**. Real citizen data must never be uploaded or processed in this client tool.
