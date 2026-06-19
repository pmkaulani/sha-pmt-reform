# SHA PMT v2.1 — Fixing Kenya's Health Insurance Algorithm

**Social Health Authority (SHA) Means-Testing Algorithm Reform**

An evidence-based proposal to replace Kenya's biased Lasso PMT algorithm with a transparent, constitutionally compliant Adjusted Gross Income (AGI) model.

---

## The Problem

Kenya's Social Health Authority deployed a Proxy Means Test (PMT) algorithm that:
- **Overpredicts income** for 80% of the poorest households
- Has a **56% exclusion error** for poor households with basic electricity
- Has a **65% exclusion error** for poor female-headed households (vs 34% for male-headed)
- Was flagged as inequitable by IDinsight **before deployment** — and deployed regardless

The High Court declared the SHIF rollout unconstitutional (March 2026), and the CAJ ordered full algorithm disclosure.

## The Solution — AGI Model (v2.1)

The AGI model applies **7 evidence-based deductions** before the legally mandated 2.75% rate, adjusting the tax base rather than the rate:

| Deduction | Description |
|---|---|
| ASAL Land Discount | 85% reduction for arid/semi-arid land valuations |
| Dependency Allowance | 8% per dependent, capped at 35–40% |
| CHE Exemption | Catastrophic health expenditure protection |
| Digital Debt Exclusion | Fuliza/M-Shwari defaults deducted |
| Household Expense Float | Cost-of-living adjustment by county |
| Tools of Trade | Income-generating assets depreciated, not penalized |
| Fiduciary Exemption | Chama/group funds excluded from personal income |

**Revenue projection:** KES 87B → KES 139B through 60% compliance at lower, fairer rates.

## Repository Structure

```
├── docs/                        # Policy, legal & technical documentation
│   ├── EXECUTIVE_SUMMARY_ONE_PAGER.docx
│   ├── Algorithm_Documentation.docx
│   ├── AI_BILL_2026_COMPLIANCE.docx
│   ├── LEGAL_ETHICAL_ARCHITECTURAL_EVALUATION.docx
│   ├── CAJ_21_DAY_DISCLOSURE.docx
│   ├── PRIVACY_POLICY.docx
│   ├── KIPPRA_SUBMISSION_LETTER.docx
│   └── ... (full document set)
│
├── sha-mvp/                     # Interactive web MVP (Vite + TypeScript)
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── SHA_Financial_Model.xlsx     # Revenue & compliance projections
├── SHA_Impact_Summary.xlsx      # Impact metrics
└── IMPLEMENTATION_ROADMAP.xlsx  # Phased rollout timeline
```

## Legal Framework

| Legal Instrument | Requirement | v2.1 Status |
|---|---|---|
| Constitution Art. 27(4) | No sex/geography discrimination | ✅ Compliant |
| DPA 2019 §32/35/39 | Consent, human oversight, retention | ✅ Compliant |
| AI Bill 2026 | Impact assessment, bias testing, explainability | ✅ Compliant |
| CAJ Order | Algorithm disclosure | ✅ Filed |
| High Court (Mwita, 2025) | No double taxation on gross income | ✅ Resolved |
| High Court (Mwamuye, 2026) | Fix means-testing infrastructure | ✅ Addressed |

## Key Documents

- **Executive Summary** — One-page overview for decision-makers
- **Algorithm Documentation** — Full technical specification with formulae
- **AI Bill 2026 Compliance** — Regulatory compliance framework
- **CAJ 21-Day Disclosure** — Algorithm disclosure filed with the Commission on Administrative Justice
- **SHAP Deduction Receipts** — Citizen-facing explainability framework
- **Privacy Policy** — DPA 2019 compliant data protection policy

## Running the MVP

```bash
cd sha-mvp
npm install
npm run dev
```

## Author

**Peter M. Kaulani**
KCA University | 2507765@students.kcau.ac.ke

---

*This project responds to the High Court's March 19, 2026 unconstitutionality ruling, the CAJ Order #CAJ/2026/05/0847, and the pending Awino petition transferred to the Constitutional and Human Rights Division at Milimani.*
