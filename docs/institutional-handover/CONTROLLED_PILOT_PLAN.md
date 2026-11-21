# Controlled Staged Pilot Plan & Implementation Pathway
**Document Series:** Institutional Handover Package (8 of 12)  
**Target Audience:** Pilot Operations Coordinators, Project Managers, and SHA Leadership  

---

### 1. Proposed Staged Pilot Pathway (Illustrative Schedule)
The proposed pilot is structured across 5 strictly governed sequential stages. *Note: Timelines are illustrative planning estimates subject to institutional approvals, ethical clearance, and formal procurement:*
1. **Stage 1 — Technical Review:** Formula inspection, sandbox verification, and legal scope definition (Illustrative: Month 1).
2. **Stage 2 — Offline Historical Replay:** Air-gapped execution against de-identified historical records (Illustrative: Months 2–3).
3. **Stage 3 — Non-Interventional Shadow Operation:** Real-time parallel ingestion with zero member billing impact (Illustrative: Months 4–5).
4. **Stage 4 — Assisted Human Review:** Designated review officers test informal expense ledgers in representative sample counties (Illustrative: Months 6–7).
5. **Stage 5 — Independent Evaluation & Board Decision Gate:** Comprehensive audit, actuarial modeling, and final decision (Illustrative: Month 8).

### 2. Statistical Sampling & Power Calculations
- Pilot sample sizes cannot be chosen arbitrarily (e.g. an unmodeled flat number like 5,000 households).
- Stage 2 and Stage 4 sample frames must be formally calculated using statistical power equations based on minimum detectable effect sizes ($\text{MDE}$), anticipated intraclass correlation ($\text{ICC}$) across county clusters, and non-response attrition buffers.

### 3. Readiness Gates
Stage transitions are governed by [`pilot-readiness.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/pilot-readiness.js). Reaching technical readiness does not permit stage progression; an explicit institutional approval record signed by the appropriate statutory role is required. All monitoring thresholds are marked `NOT_POLICY_APPROVED` until formally adopted by SHA.
