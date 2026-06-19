// P-66 (CAJ BLOCKER): Structured logging for audit compliance
// Uses console-based structured logging for the MVP.
// In production, replace with pino or Sentry integration.

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LOG_LEVELS.INFO;

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
    console.log(JSON.stringify(formatEntry('AUDIT', action, {
      audit: true,
      ...details
    })));
  }
};
