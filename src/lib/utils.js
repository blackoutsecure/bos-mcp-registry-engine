/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const path = require('path');

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized.length) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function resolveWorkspacePath(workspaceRoot, value, fallback) {
  if (!value || !String(value).trim()) {
    return path.resolve(workspaceRoot, fallback);
  }

  return path.resolve(workspaceRoot, String(value));
}

function formatValidationPath(instancePath) {
  return instancePath && instancePath.length > 0 ? instancePath : '/';
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const result = {
    source: undefined,
    output: undefined,
    deploymentEnvironment: undefined,
    configFile: undefined,
    validateOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextArg = argv[index + 1];

    if (arg === '--validate-only') {
      result.validateOnly = true;
      continue;
    }

    if (arg === '--source' && nextArg) {
      result.source = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--output' && nextArg) {
      result.output = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--deployment-environment' && nextArg) {
      result.deploymentEnvironment = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--config' && nextArg) {
      result.configFile = nextArg;
      index += 1;
      continue;
    }
  }

  return result;
}

module.exports = {
  formatValidationPath,
  parseBoolean,
  parseCliArgs,
  resolveWorkspacePath,
};
