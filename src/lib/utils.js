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
    actionType: undefined,
    logLevel: undefined,
    source: undefined,
    output: undefined,
    publicDirectory: undefined,
    deploymentEnvironment: undefined,
    configFile: undefined,
    serverSlug: undefined,
    serverName: undefined,
    serverTitle: undefined,
    serverDescription: undefined,
    serverWebsiteUrl: undefined,
    repositoryUrl: undefined,
    repositorySource: undefined,
    repositorySubfolder: undefined,
    serverVersion: undefined,
    releaseDate: undefined,
    packageRegistryType: undefined,
    packageIdentifier: undefined,
    packageTransportType: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextArg = argv[index + 1];

    if (arg === '--action-type' && nextArg) {
      result.actionType = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--log-level' && nextArg) {
      result.logLevel = nextArg;
      index += 1;
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

    if (arg === '--public-directory' && nextArg) {
      result.publicDirectory = nextArg;
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

    if (arg === '--server-slug' && nextArg) {
      result.serverSlug = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--server-name' && nextArg) {
      result.serverName = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--server-title' && nextArg) {
      result.serverTitle = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--server-description' && nextArg) {
      result.serverDescription = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--server-website-url' && nextArg) {
      result.serverWebsiteUrl = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--repository-url' && nextArg) {
      result.repositoryUrl = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--repository-source' && nextArg) {
      result.repositorySource = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--repository-subfolder' && nextArg) {
      result.repositorySubfolder = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--server-version' && nextArg) {
      result.serverVersion = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--release-date' && nextArg) {
      result.releaseDate = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--package-registry-type' && nextArg) {
      result.packageRegistryType = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--package-identifier' && nextArg) {
      result.packageIdentifier = nextArg;
      index += 1;
      continue;
    }

    if (arg === '--package-transport-type' && nextArg) {
      result.packageTransportType = nextArg;
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
