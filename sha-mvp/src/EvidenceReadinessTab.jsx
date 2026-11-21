import React, { useState, useMemo } from "react";
import { DATA_ACCESS_REGISTER, ACCESS_STATUSES, getDataAccessSummary } from "./lib/data-access-register.js";
import { OFFICIAL_SHA_BASELINE_SPECIFICATION, validateShaBaselineCompleteness, SHA_BASELINE_STATUSES } from "./lib/sha-baseline-registry.js";
import { profileDatasetQuality } from "./lib/data-quality-profiler.js";
import { DEMO_KIHBS_MAPPING_DICTIONARY } from "./lib/data-dictionary-mapper.js";
import { evaluateEvidenceReadinessGate, READINESS_GATE_STATUSES } from "./lib/evidence-readiness.js";
import { buildShaRequestPackJson, generateShaRequestPackMarkdown } from "./lib/sha-request-pack.js";
import { REGISTERED_EVALUATION_DATASETS, REGISTERED_EVALUATION_TARGETS } from "./lib/evaluation-contracts.js";
import { REGISTERED_EVALUATION_MODELS } from "./lib/evaluation-model-registry.js";

// Synthetic demonstration sample for the live data quality profiler demo
const DEMO_INSPECTION_RECORDS = [
  { id: "DEMO-001", residence_type: "1", hh_size: 4, totcons_annual: 240000, cook_fuel: "3", roof_mat: "1" },
  { id: "DEMO-002", residence_type: "2", hh_size: 6, totcons_annual: 96000, cook_fuel: "1", roof_mat: "4" },
  { id: "DEMO-003", residence_type: "1", hh_size: 2, totcons_annual: 580000, cook_fuel: "3", roof_mat: "2" },
  { id: "DEMO-004", residence_type: "2", hh_size: 8, totcons_annual: 112000, cook_fuel: "1", roof_mat: "1" },
  { id: "DEMO-002", residence_type: "2", hh_size: 6, totcons_annual: 96000, cook_fuel: "1", roof_mat: "4" }, // Duplicate demonstration
  { id: "DEMO-005", residence_type: "1", hh_size: 3, totcons_annual: null, cook_fuel: "2", roof_mat: "1" }, // Missing consumption
  { id: "DEMO-006", residence_type: "2", hh_size: 42, totcons_annual: 85000, cook_fuel: "1", roof_mat: "1" } // Documented range anomaly (hh_size 42 > 35)
];

export default function EvidenceReadinessTab() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [selectedSubTab, setSelectedSubTab] = useState("overview"); // "overview", "register", "baseline", "quality", "requestPack"

  // Summary statistics
  const registerSummary = useMemo(() => getDataAccessSummary(), []);
  const baselineValidation = useMemo(() => validateShaBaselineCompleteness(OFFICIAL_SHA_BASELINE_SPECIFICATION), []);

  // Run profiler on demo batch
  const qualityProfile = useMemo(() => {
    return profileDatasetQuality(DEMO_INSPECTION_RECORDS, {
      idField: "id",
      requiredFields: ["id", "residence_type", "hh_size", "totcons_annual"]
    });
  }, []);

  // Evaluate readiness gate for the synthetic demo scenario
  const gateResult = useMemo(() => {
    const dataset = REGISTERED_EVALUATION_DATASETS["SYNTHETIC_DEMO_2026"];
    const target = REGISTERED_EVALUATION_TARGETS["INDEPENDENT_ANNUAL_CONSUMPTION"];
    const model = REGISTERED_EVALUATION_MODELS["OFFICIAL_SHA_REG21_BASELINE"];
    return evaluateEvidenceReadinessGate({
      datasetManifest: dataset,
      targetDefinition: target,
      modelRegistryEntry: model,
      variableMappings: DEMO_KIHBS_MAPPING_DICTIONARY,
      dataQualityReport: qualityProfile,
      shaBaselineSpec: OFFICIAL_SHA_BASELINE_SPECIFICATION
    });
  }, [qualityProfile]);

  const filteredRegister = useMemo(() => {
    if (statusFilter === "ALL") return DATA_ACCESS_REGISTER;
    return DATA_ACCESS_REGISTER.filter(r => r.status === statusFilter);
  }, [statusFilter]);

  const copyMarkdownToClipboard = () => {
    const md = generateShaRequestPackMarkdown();
    navigator.clipboard.writeText(md).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    });
  };

  const downloadJsonRequestPack = () => {
    const json = JSON.stringify(buildShaRequestPackJson(), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sha-data-request-pack-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-6">
      {/* 1. Header & Boundary Banner */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <div className="text-amber-700 font-bold text-xl mt-0.5">⚠️</div>
          <div>
            <h2 className="text-lg font-bold text-amber-900">
              Evidence Readiness & Data Governance Gate (Phase 4)
            </h2>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
              This research prototype prepares the technical framework for independent empirical validation.
              <strong> In accordance with the Kenya Data Protection Act 2019 and ODPC guidelines, this frontend prototype does not ingest, upload, or persist real citizen records.</strong> Empirical evaluation remains blocked until official SHA baseline parameters and authorized KNBS survey microdata are received through lawful inter-agency protocols.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Status KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-xs uppercase font-semibold text-gray-500">Readiness Gate Status</div>
          <div className="text-xl font-bold mt-1 text-red-600 flex items-center gap-2">
            <span>⛔</span> {gateResult.readinessStatus}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Empirical validation blocked pending data disclosure
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-xs uppercase font-semibold text-gray-500">Data Access Items</div>
          <div className="text-xl font-bold mt-1 text-gray-800">
            {registerSummary.totalResources} <span className="text-sm font-normal text-gray-500">cataloged</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {registerSummary.receivedCount} received / {registerSummary.blockedCount} unavailable
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-xs uppercase font-semibold text-gray-500">Official SHA Baseline</div>
          <div className="text-xl font-bold mt-1 text-amber-600 flex items-center gap-1.5">
            <span>📋</span> {baselineValidation.status}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Coefficients & intercepts unavailable
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-xs uppercase font-semibold text-gray-500">Variable Dictionary</div>
          <div className="text-xl font-bold mt-1 text-emerald-600 flex items-center gap-1.5">
            <span>✅</span> {DEMO_KIHBS_MAPPING_DICTIONARY.length} concepts
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Standardized to KNBS KIHBS codebook
          </div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 text-sm font-medium">
          {[
            { id: "overview", label: "Gate Checklist & Blockers" },
            { id: "register", label: "Data Access Register" },
            { id: "baseline", label: "SHA Baseline Reconstruction" },
            { id: "quality", label: "Data Quality Profiler" },
            { id: "requestPack", label: "SHA Request Pack" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedSubTab(tab.id)}
              className={`py-3 px-1 border-b-2 transition-colors ${
                selectedSubTab === tab.id
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 4. Tab Content Panels */}

      {/* TAB A: OVERVIEW & GATE CHECKLIST */}
      {selectedSubTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-3">
              Evidence Readiness Gate: 8 Multi-Checkpoint Status
            </h3>
            <div className="divide-y divide-gray-100">
              {gateResult.gateChecks.map((chk, i) => (
                <div key={i} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{chk.checkpoint}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{chk.detail}</div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                      chk.status === "PASS"
                        ? "bg-emerald-100 text-emerald-800"
                        : chk.status === "WARNING"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {chk.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Blockers List */}
          {gateResult.blockers.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5">
              <h4 className="text-sm font-bold text-red-900 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span>🚫</span> Active Readiness Blockers ({gateResult.blockers.length})
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-red-800">
                {gateResult.blockers.map((b, idx) => (
                  <li key={idx}>{b}</li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-red-200 text-xs text-red-700">
                <strong>Next Step:</strong> Issue the formal SHA Data Request Pack and submit the KNBS Microdata application before scheduling Phase 5 comparative runs.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB B: DATA ACCESS REGISTER */}
      {selectedSubTab === "register" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Tracking datasets, documentation, and administrative records required for empirical validation.
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 font-medium">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-800"
              >
                <option value="ALL">All ({DATA_ACCESS_REGISTER.length})</option>
                {Object.values(ACCESS_STATUSES).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 border-b text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="p-3">Resource Identifier</th>
                  <th className="p-3">Name & Institution</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Next Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRegister.map(item => (
                  <tr key={item.resourceId} className="hover:bg-gray-50">
                    <td className="p-3 font-mono font-medium text-gray-700">{item.resourceId}</td>
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">{item.resourceName}</div>
                      <div className="text-gray-500 text-[11px]">{item.responsibleInstitution}</div>
                    </td>
                    <td className="p-3 text-gray-600">{item.resourceType}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === ACCESS_STATUSES.APPROVED_FOR_USE || item.status === ACCESS_STATUSES.RECEIVED
                            ? "bg-emerald-100 text-emerald-800"
                            : item.status === ACCESS_STATUSES.PARTIALLY_RECEIVED
                            ? "bg-amber-100 text-amber-800"
                            : item.status === ACCESS_STATUSES.NOT_AVAILABLE || item.status === ACCESS_STATUSES.DECLINED
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600 max-w-xs">{item.notesAndNextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB C: SHA BASELINE RECONSTRUCTION */}
      {selectedSubTab === "baseline" && (
        <div className="space-y-5">
          <div className="bg-white border rounded-lg p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {OFFICIAL_SHA_BASELINE_SPECIFICATION.officialModelName}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Legal Basis: {OFFICIAL_SHA_BASELINE_SPECIFICATION.legalBasis}
                </p>
              </div>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
                {OFFICIAL_SHA_BASELINE_SPECIFICATION.status}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-gray-50 p-3 rounded border">
                <div className="font-bold text-gray-800">Urban Model Specification</div>
                <div className="text-gray-600 mt-1">43 proxy variables referenced in Fifth Schedule</div>
                <div className="text-red-600 font-semibold mt-2">
                  Status: {OFFICIAL_SHA_BASELINE_SPECIFICATION.urbanModelSpecification.status}
                </div>
                <div className="text-gray-500 mt-1">
                  {OFFICIAL_SHA_BASELINE_SPECIFICATION.urbanModelSpecification.notes}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded border">
                <div className="font-bold text-gray-800">Rural Model Specification</div>
                <div className="text-gray-600 mt-1">43 proxy variables referenced in Fifth Schedule</div>
                <div className="text-red-600 font-semibold mt-2">
                  Status: {OFFICIAL_SHA_BASELINE_SPECIFICATION.ruralModelSpecification.status}
                </div>
                <div className="text-gray-500 mt-1">
                  {OFFICIAL_SHA_BASELINE_SPECIFICATION.ruralModelSpecification.notes}
                </div>
              </div>
            </div>

            <div className="mt-5 bg-amber-50 border border-amber-200 rounded p-4">
              <h4 className="text-xs font-bold text-amber-900 uppercase">
                Missing Technical Components for Baseline Reconstruction ({baselineValidation.missingComponents.length})
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 mt-2">
                {baselineValidation.missingComponents.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-700 mt-3 font-medium">
                Invariant: Research evaluators must never guess, approximate, or fill missing regression weights with zeros.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB D: DATA QUALITY PROFILER */}
      {selectedSubTab === "quality" && (
        <div className="space-y-5">
          <div className="bg-white border rounded-lg p-5 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Deterministic Data Quality Profiler Preview
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Profiling test batch of {qualityProfile.recordsInspected} demonstration records across 7 deterministic checks.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <div className="text-xs font-semibold text-red-700 uppercase">Critical Findings</div>
                <div className="text-xl font-bold text-red-900 mt-1">
                  {qualityProfile.findingsBySeverity.CRITICAL.length}
                </div>
                <div className="text-[11px] text-red-600 mt-0.5">Duplicates, missing keys, invalid numbers</div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded">
                <div className="text-xs font-semibold text-amber-700 uppercase">Range & Missing Warnings</div>
                <div className="text-xl font-bold text-amber-900 mt-1">
                  {qualityProfile.findingsBySeverity.WARNING.length}
                </div>
                <div className="text-[11px] text-amber-600 mt-0.5">High missingness or range anomalies</div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded">
                <div className="text-xs font-semibold text-emerald-700 uppercase">Accounting Invariant</div>
                <div className="text-base font-bold text-emerald-900 mt-1">Zero Silent Deletion</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">All exclusions transparently justified</div>
              </div>
            </div>

            {/* Recommendations table */}
            {qualityProfile.exclusionRecommendations.length > 0 && (
              <div className="mt-4 border rounded overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-700 border-b">
                  Recommended Exclusions with Explicit Justifications
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600">
                    <tr>
                      <th className="p-2">Record Identifier</th>
                      <th className="p-2">Check Type</th>
                      <th className="p-2">Methodological Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {qualityProfile.exclusionRecommendations.map((rec, i) => (
                      <tr key={i}>
                        <td className="p-2 font-mono font-medium text-gray-700">{rec.recordId}</td>
                        <td className="p-2 text-red-700 font-semibold">{rec.checkType}</td>
                        <td className="p-2 text-gray-600">{rec.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB E: SHA REQUEST PACK */}
      {selectedSubTab === "requestPack" && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  SHA Data & Technical Information Request Pack
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  12 structured inquiries requesting official specifications under Kenya Data Protection Act 2019 research provisions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyMarkdownToClipboard}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition"
                >
                  {copiedNotification ? "Copied Markdown!" : "Copy Markdown"}
                </button>
                <button
                  onClick={downloadJsonRequestPack}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Download JSON
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 border-t pt-3">
              {buildShaRequestPackJson().items.map(item => (
                <div key={item.itemNumber} className="py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-700 text-xs">#{item.itemNumber}</span>
                    <h4 className="text-xs font-bold text-gray-900">{item.title}</h4>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 mt-1">{item.description}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 italic">Rationale: {item.rationale}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
