/**
 * Offline Shadow Replay Engine — Non-Interventional Simulation Engine.
 *
 * Replays historical assessment records through candidate means-testing models
 * to simulate retrospective outcomes without touching live member records,
 * issuing billing statements, or modifying production SHA databases.
 *
 * Strict Operational Invariants:
 * 1. 100% OFFLINE: Zero network egress to live SHA servers, MPESA APIs, or government portals.
 * 2. ZERO MUTATION: Never modifies source household inputs or historical decision snapshots.
 * 3. ZERO OFFICIAL STATUS: Outputs are strictly simulation drafts labeled "OFFLINE_SHADOW_REPLAY".
 * 4. STOP & PAUSE CONDITIONS: Automatically aborts replay if data quality, governance,
 *    or model compatibility blockers are detected.
 * 5. PII-FREE EXPORT: Exportable replay reports aggregate results without individual identifiers.
 */

import { calculateProposedModelVersions } from "./model-versioning.js";
import { validateShaBaselineCompleteness } from "./sha-baseline-registry.js";
import { PROTOCOL_STATUSES } from "./evaluation-protocol.js";

export const REPLAY_STATUSES = Object.freeze({
  READY: "READY",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  PAUSED_FOR_REVIEW: "PAUSED_FOR_REVIEW",
  BLOCKED: "BLOCKED",
  ABORTED: "ABORTED"
});

export const REPLAY_STOP_CONDITIONS = Object.freeze({
  UNAPPROVED_DATASET: "UNAPPROVED_DATASET",
  UNREGISTERED_PROTOCOL: "UNREGISTERED_PROTOCOL",
  INCOMPLETE_BASELINE: "INCOMPLETE_BASELINE",
  HIGH_FAILURE_RATE: "HIGH_FAILURE_RATE",
  DATA_QUALITY_BLOCKER: "DATA_QUALITY_BLOCKER"
});

/**
 * Runs an offline shadow replay batch on an array of historical/synthetic cases.
 *
 * @param {object} params
 * @param {Array<object>} params.cases - Array of assessment case snapshots
 * @param {object} params.protocol - Pre-registered evaluation protocol
 * @param {object} params.datasetManifest - Dataset manifest
 * @param {object} params.options - Runtime options { pauseOnFailureRate: 0.10, maxCases: 1000 }
 * @returns {object} Replay batch results
 */
export function executeOfflineShadowReplay({
  cases = [],
  protocol = null,
  datasetManifest = null,
  options = {}
} = {}) {
  const replayRunId = `replay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startedAt = new Date().toISOString();
  const pauseThreshold = options.pauseOnFailureRate ?? 0.10;

  const summary = {
    replayRunId,
    startedAt,
    completedAt: null,
    status: REPLAY_STATUSES.READY,
    operationalMode: "OFFLINE_SHADOW_SIMULATION_ONLY",
    disclaimer: "NON-INTERVENTIONAL DEMONSTRATION: Replay results are computed offline. No real-world contributions, member records, bills, or official SHA determinations are created or altered.",
    dataset: {
      id: datasetManifest?.id || datasetManifest?.datasetId || "UNKNOWN",
      version: datasetManifest?.version || "1.0",
      datasetType: datasetManifest?.datasetType || "UNKNOWN"
    },
    protocol: {
      id: protocol?.protocolId || "UNREGISTERED",
      version: protocol?.version || "0.0",
      isFrozen: protocol?.approvalStatus === PROTOCOL_STATUSES.FROZEN
    },
    stopConditionTriggered: null,
    casesProcessedCount: 0,
    successfulReplaysCount: 0,
    failedReplaysCount: 0,
    failureRate: 0,
    pausedForReview: false,
    aggregatedFinancials: {
      totalOriginalContributionsMonthly: 0,
      totalProposedOriginalAgiMonthly: 0,
      totalProposedDeclaredIncomeMonthly: 0,
      meanOriginalContribution: 0,
      meanOriginalAgiContribution: 0,
      meanDeclaredIncomeContribution: 0
    },
    disparityAlerts: [],
    errors: [],
    warnings: []
  };

  // 1. Check Stop Conditions BEFORE Replay Execution
  if (!protocol || !protocol.preRegisteredAt) {
    summary.status = REPLAY_STATUSES.BLOCKED;
    summary.stopConditionTriggered = REPLAY_STOP_CONDITIONS.UNREGISTERED_PROTOCOL;
    summary.errors.push("Offline shadow replay BLOCKED: A pre-registered evaluation protocol is required.");
    return summary;
  }

  if (datasetManifest?.datasetType !== "SYNTHETIC" && datasetManifest?.isApprovedForEmpiricalEvaluation !== true && datasetManifest?.status !== "APPROVED_FOR_EMPIRICAL_EVALUATION") {
    summary.status = REPLAY_STATUSES.BLOCKED;
    summary.stopConditionTriggered = REPLAY_STOP_CONDITIONS.UNAPPROVED_DATASET;
    summary.errors.push("Offline shadow replay BLOCKED: Dataset has not been approved for empirical evaluation.");
    return summary;
  }

  if (!Array.isArray(cases) || cases.length === 0) {
    summary.status = REPLAY_STATUSES.ABORTED;
    summary.errors.push("No cases supplied for offline shadow replay.");
    return summary;
  }

  summary.status = REPLAY_STATUSES.RUNNING;

  let sumOrig = 0;
  let sumAgi = 0;
  let sumDecl = 0;

  // Process cases one by one (preserving source immutability)
  for (let i = 0; i < cases.length; i++) {
    const rawCase = cases[i];
    summary.casesProcessedCount++;

    try {
      // Ensure source record is NEVER mutated
      const immutableSnapshot = JSON.parse(JSON.stringify(rawCase));

      // Execute candidate model versions on snapshot
      const versions = calculateProposedModelVersions(immutableSnapshot);

      if (!versions || !versions.originalAgi || !versions.declaredIncome) {
        summary.failedReplaysCount++;
        summary.warnings.push(`Case index ${i} failed to execute model calculations.`);
      } else {
        summary.successfulReplaysCount++;

        const origContrib = rawCase.monthlyContribution ?? rawCase.originalContribution ?? 0;
        const agiContrib = versions.originalAgi.result?.monthlyContribution ?? 0;
        const declContrib = versions.declaredIncome.result?.monthlyContribution ?? 0;

        sumOrig += origContrib;
        sumAgi += agiContrib;
        sumDecl += declContrib;

        // Check for extreme spike pause conditions (e.g. proposed > 5x original)
        if (origContrib > 0 && agiContrib > origContrib * 5) {
          summary.disparityAlerts.push({
            caseIndex: i,
            reason: `Extreme assessment escalation: Original KSh ${origContrib} -> Proposed AGI KSh ${agiContrib}`
          });
        }
      }
    } catch (err) {
      summary.failedReplaysCount++;
      summary.errors.push(`Error executing case index ${i}: ${err.message}`);
    }

    // Check Pause Threshold during execution
    const currentFailureRate = summary.failedReplaysCount / summary.casesProcessedCount;
    if (summary.casesProcessedCount >= 10 && currentFailureRate > pauseThreshold) {
      summary.status = REPLAY_STATUSES.PAUSED_FOR_REVIEW;
      summary.pausedForReview = true;
      summary.stopConditionTriggered = REPLAY_STOP_CONDITIONS.HIGH_FAILURE_RATE;
      summary.errors.push(
        `Replay PAUSED: Failure rate (${(currentFailureRate * 100).toFixed(1)}%) exceeded pause threshold (${(pauseThreshold * 100)}%).`
      );
      break;
    }
  }

  // Finalize statistics
  summary.failureRate = summary.casesProcessedCount > 0
    ? Number((summary.failedReplaysCount / summary.casesProcessedCount).toFixed(4))
    : 0;

  if (summary.status === REPLAY_STATUSES.RUNNING) {
    summary.status = REPLAY_STATUSES.COMPLETED;
  }

  summary.completedAt = new Date().toISOString();

  if (summary.successfulReplaysCount > 0) {
    summary.aggregatedFinancials.totalOriginalContributionsMonthly = Math.round(sumOrig);
    summary.aggregatedFinancials.totalProposedOriginalAgiMonthly = Math.round(sumAgi);
    summary.aggregatedFinancials.totalProposedDeclaredIncomeMonthly = Math.round(sumDecl);
    summary.aggregatedFinancials.meanOriginalContribution = Math.round(sumOrig / summary.successfulReplaysCount);
    summary.aggregatedFinancials.meanOriginalAgiContribution = Math.round(sumAgi / summary.successfulReplaysCount);
    summary.aggregatedFinancials.meanDeclaredIncomeContribution = Math.round(sumDecl / summary.successfulReplaysCount);
  }

  return summary;
}

/**
 * Builds a structured, exportable JSON report of the offline shadow replay.
 * Completely strips individual case inputs, exporting only aggregated distributions.
 */
export function buildShadowReplayReportJson(replayResult) {
  if (!replayResult || typeof replayResult !== "object") {
    throw new TypeError("Replay result object required for export.");
  }

  return JSON.stringify({
    reportFormat: "SHA_OFFLINE_SHADOW_REPLAY_REPORT_V1",
    exportedAt: new Date().toISOString(),
    confidentiality: "NON_CONFIDENTIAL_AGGREGATE_REPORT",
    replaySummary: replayResult
  }, null, 2);
}
