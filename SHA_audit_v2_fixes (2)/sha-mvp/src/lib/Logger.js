// P-66 (CAJ BLOCKER): Structured logging for audit compliance
// Uses console-based structured logging for the MVP.
// In production, replace with pino or Sentry integration.
//
// FIX (audit v2) — read this before citing this file in a DPA/CAJ briefing:
// Every createAuditRecord() call computes a DPA §39 retention schedule
// (2-year raw-input purge, 7-year final-outcome retention) and hands it to
// logger.audit() below. Until this fix, that record was written ONLY to
// console.log — no backend, no database, nothing durable. The moment the
// browser tab closed, the "7-year retention" record was gone. That's fine
// for an MVP demo; it is not fine to imply to a Data Commissioner reviewer
// that retention is actually happening. This file now (a) says so clearly,
// and (b) keeps an in-session buffer with a manual JSON export, which is a
// real stopgap an officer can use today — but it is NOT a substitute for a
// real backend + database, and nothing here should be cited as satisfying
// §39 on its own. Say that explicitly wherever this gets referenced.

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS.INFO;

// Session-only buffer. Cleared on page reload. Not a database.
const auditBuffer = [];
const AUDIT_BUFFER_LIMIT = 5000; // guard against unbounded memory growth in a long session

function formatEntry(level, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    service: 'sha-pmt-v2.1',
    message,
    ...context
  };
}

export const logger = {
  info(message, context) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(JSON.stringify(formatEntry('INFO', message, context)));
    }
  },
  warn(message, context) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(JSON.stringify(formatEntry('WARN', message, context)));
    }
  },
  error(message, context) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(JSON.stringify(formatEntry('ERROR', message, context)));
    }
  },
  audit(action, details) {
    // Audit logs are always emitted regardless of log level
    const entry = formatEntry('AUDIT', action, { audit: true, ...details });
    console.log(JSON.stringify(entry));
    auditBuffer.push(entry);
    if (auditBuffer.length > AUDIT_BUFFER_LIMIT) auditBuffer.shift();
  },
  // Manual stopgap only — see the file-level note above. A real deployment
  // needs a backend receiving these over an authenticated API, not a person
  // remembering to click a download button.
  getSessionAuditBuffer() {
    return [...auditBuffer];
  },
  downloadSessionAuditLog() {
    if (typeof document === 'undefined') return; // no-op outside the browser
    const blob = new Blob([JSON.stringify(auditBuffer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sha-pmt-session-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
