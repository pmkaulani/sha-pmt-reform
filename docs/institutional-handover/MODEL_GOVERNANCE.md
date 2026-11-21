# Model Governance, Versioning & Reproducibility Standard
**Document Series:** Institutional Handover Package (4 of 12)  
**Target Audience:** Actuaries, Compliance Officers, and Lead Data Scientists  

---

### 1. Model Registry & Version Lineage
Every candidate model in this project is cataloged in [`evaluation-model-registry.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/evaluation-model-registry.js) with immutable provenance metadata:
- **`official-sha-reg21-pmt`**: Cataloged with status `NOT_CONFIGURED`. Retains placeholder until official parameters, intercepts, and encodings are formally provided.
- **`asset-liquidity-agi-v2.1`**: Preserved byte-for-byte in [`AlgorithmSimulation.original-agi-v2.1.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/AlgorithmSimulation.original-agi-v2.1.js).
- **`declared-income-agi-v1`**: Preserved in [`household-income.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/household-income.js).
- **`illustrative-pmt-comparator`**: Documented strictly as an illustrative benchmark; never presented as SHA's official regression.

### 2. Separation of Duties in Model Deployment
Under our governance charter ([`pilot-governance.js`](file:///c:/Users/STD%20USER/Desktop/work/SHA/sha-mvp/src/lib/pilot-governance.js)):
- Model developers cannot deploy code to shadow execution environments.
- Operational reviewers cannot modify regression weights.
- Changes to model specifications require co-signatures from the **SHA Technical System Owner** and **SHA Policy Owner**.
