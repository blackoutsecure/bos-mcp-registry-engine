/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const SUPPORTED_LOG_LEVELS = ['debug', 'info', 'warn', 'error'];

const LOG_LEVEL_PRIORITY = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
});

function normalizeLogLevel(value, fallback = 'info') {
  if (!value || !String(value).trim()) {
    return fallback;
  }

  return String(value).trim().toLowerCase();
}

function assertValidLogLevel(level) {
  if (!SUPPORTED_LOG_LEVELS.includes(level)) {
    throw new Error(
      `Invalid log level selected: ${level}. Supported log levels: ${SUPPORTED_LOG_LEVELS.join(', ')}`,
    );
  }
}

function createLogger(level = 'info') {
  const normalizedLevel = normalizeLogLevel(level, 'info');
  assertValidLogLevel(normalizedLevel);

  const minimum = LOG_LEVEL_PRIORITY[normalizedLevel];
  const canLog = (messageLevel) => LOG_LEVEL_PRIORITY[messageLevel] >= minimum;

  return {
    level: normalizedLevel,
    debug: (...args) => {
      if (canLog('debug')) {
        console.log('[DEBUG]', ...args);
      }
    },
    info: (...args) => {
      if (canLog('info')) {
        console.log(...args);
      }
    },
    warn: (...args) => {
      if (canLog('warn')) {
        console.warn(...args);
      }
    },
    error: (...args) => {
      if (canLog('error')) {
        console.error(...args);
      }
    },
  };
}

module.exports = {
  SUPPORTED_LOG_LEVELS,
  normalizeLogLevel,
  assertValidLogLevel,
  createLogger,
};
