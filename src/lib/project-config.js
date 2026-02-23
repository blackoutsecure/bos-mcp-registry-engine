/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 *
 * PROJECT CONFIGURATION
 *
 * Maintainer-owned metadata (organization, copyright holder, legal attribution)
 * should not be modified by contributors. Runtime defaults and env/input mapping
 * are centralized here for consistency.
 */

const { parseBoolean, parseCliArgs } = require('./utils');
const { assertValidLogLevel, normalizeLogLevel } = require('./logger');

const SUPPORTED_DEPLOYMENT_ENVIRONMENTS = ['github', 'cloudflare', 'none'];
const SUPPORTED_ACTION_TYPES = [
  'generate_registry',
  'validate_registry',
  'generate_server_manifest',
  'validate_server_manifest',
];
const DEFAULT_ACTION_TYPE = 'generate_registry';

const PROJECT_CONFIG = {
  metadata: {
    name: 'Blackout Secure MCP Registry Engine',
    copyrightHolder: 'Blackout Secure',
    copyrightYearStart: '2025',
    copyrightYearEnd: '2026',
    spdxIdentifier: 'Apache-2.0',
  },
  runtime: {
    defaults: {
      source: 'servers',
      output: 'dist',
      publicDirectoryName: 'public',
      logLevel: 'info',
      registryVersion: '0.1',
      externalRepositories: [],
      deploymentEnvironment: 'github',
      uploadArtifacts: false,
      artifactName: 'mcp-registry-files',
      artifactRetentionDays: undefined,
    },
    env: {
      actionType: 'MCP_REGISTRY_ACTION_TYPE',
      logLevel: 'MCP_REGISTRY_LOG_LEVEL',
      source: 'SERVERS_DIR',
      output: 'REGISTRY_DIR',
      publicDirectory: 'MCP_REGISTRY_PUBLIC_DIR',
      deploymentEnvironment: 'DEPLOYMENT_ENVIRONMENT',
      configFile: 'MCP_REGISTRY_CONFIG',
      externalRepositories: 'MCP_REGISTRY_EXTERNAL_REPOSITORIES',
      uploadArtifacts: 'MCP_REGISTRY_UPLOAD_ARTIFACTS',
      artifactName: 'MCP_REGISTRY_ARTIFACT_NAME',
      artifactRetentionDays: 'MCP_REGISTRY_ARTIFACT_RETENTION_DAYS',
      serverSlug: 'MCP_SERVER_SLUG',
      serverName: 'MCP_SERVER_NAME',
      serverTitle: 'MCP_SERVER_TITLE',
      serverDescription: 'MCP_SERVER_DESCRIPTION',
      serverWebsiteUrl: 'MCP_SERVER_WEBSITE_URL',
      repositoryUrl: 'MCP_SERVER_REPOSITORY_URL',
      repositorySource: 'MCP_SERVER_REPOSITORY_SOURCE',
      repositorySubfolder: 'MCP_SERVER_REPOSITORY_SUBFOLDER',
      serverVersion: 'MCP_SERVER_VERSION',
      releaseDate: 'MCP_SERVER_RELEASE_DATE',
      packageRegistryType: 'MCP_SERVER_PACKAGE_REGISTRY_TYPE',
      packageIdentifier: 'MCP_SERVER_PACKAGE_IDENTIFIER',
      packageTransportType: 'MCP_SERVER_PACKAGE_TRANSPORT_TYPE',
    },
    inputs: {
      actionType: 'action_type',
      logLevel: 'log_level',
      source: 'source',
      output: 'output',
      outputDirectory: 'output_directory',
      deploymentEnvironment: 'deployment_environment',
      configFile: 'config',
      uploadArtifacts: 'upload_artifacts',
      artifactName: 'artifact_name',
      artifactRetentionDays: 'artifact_retention_days',
      serverSlug: 'server_slug',
      serverName: 'server_name',
      serverTitle: 'server_title',
      serverDescription: 'server_description',
      serverWebsiteUrl: 'server_website_url',
      repositoryUrl: 'repository_url',
      repositorySource: 'repository_source',
      repositorySubfolder: 'repository_subfolder',
      serverVersion: 'server_version',
      releaseDate: 'release_date',
      packageRegistryType: 'package_registry_type',
      packageIdentifier: 'package_identifier',
      packageTransportType: 'package_transport_type',
    },
  },
};

function parseExternalRepositories(value) {
  if (!value || !String(value).trim()) {
    return undefined;
  }

  let parsed;
  try {
    parsed = JSON.parse(String(value));
  } catch {
    throw new Error(
      'Invalid external repositories value. Provide a JSON array for external_repositories.',
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      'Invalid external repositories value. external_repositories must be a JSON array.',
    );
  }

  return parsed;
}

function normalizeDeploymentEnvironment(value, fallback) {
  if (!value || !String(value).trim()) {
    return fallback;
  }

  return String(value).trim().toLowerCase();
}

function assertValidDeploymentEnvironment(environment) {
  if (!SUPPORTED_DEPLOYMENT_ENVIRONMENTS.includes(environment)) {
    throw new Error(
      `Invalid deployment environment selected: ${environment}. Supported environments: ${SUPPORTED_DEPLOYMENT_ENVIRONMENTS.join(', ')}`,
    );
  }
}

function normalizeActionType(value, fallback = 'generate_registry') {
  if (!value || !String(value).trim()) {
    return fallback;
  }

  return String(value).trim().toLowerCase();
}

function normalizeActionPublicDirectory(value, defaults) {
  if (!value || !String(value).trim()) {
    return defaults.publicDirectoryName;
  }

  const normalizedValue = String(value)
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  if (!normalizedValue) {
    return defaults.publicDirectoryName;
  }

  const outputPrefix = `${String(defaults.output).replace(/\\/g, '/')}/`;
  if (normalizedValue === defaults.output) {
    return defaults.publicDirectoryName;
  }

  if (normalizedValue.startsWith(outputPrefix)) {
    return normalizedValue.slice(outputPrefix.length) || defaults.publicDirectoryName;
  }

  return normalizedValue;
}

function normalizeOutputBaseDirectory(value, defaults) {
  if (!value || !String(value).trim()) {
    return defaults.output;
  }

  const normalizedValue = String(value)
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');

  return normalizedValue || defaults.output;
}

function assertValidActionType(actionType) {
  if (!SUPPORTED_ACTION_TYPES.includes(actionType)) {
    throw new Error(
      `Invalid action type selected: ${actionType}. Supported action types: ${SUPPORTED_ACTION_TYPES.join(', ')}`,
    );
  }
}

function normalizeArtifactRetentionDays(value) {
  if (!value || !String(value).trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(String(value).trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid artifact retention days: ${value}. Provide a positive integer.`,
    );
  }

  return parsed;
}

function getRuntimeConfig(
  core,
  argv = process.argv.slice(2),
  env = process.env,
) {
  const isGitHubActionRuntime = env.GITHUB_ACTIONS === 'true';
  const cliArgs = parseCliArgs(argv);
  const { defaults, env: envKeys, inputs } = PROJECT_CONFIG.runtime;

  const actionTypeEnv = env[envKeys.actionType];
  const logLevelEnv = env[envKeys.logLevel];
  const sourceEnv = env[envKeys.source];
  const outputEnv = env[envKeys.output];
  const publicDirectoryEnv = env[envKeys.publicDirectory];
  const deploymentEnvironmentEnv = env[envKeys.deploymentEnvironment];
  const configFileEnv = env[envKeys.configFile];
  const externalRepositoriesEnv = env[envKeys.externalRepositories];

  const actionType = isGitHubActionRuntime
    ? normalizeActionType(
        core.getInput(inputs.actionType) || actionTypeEnv,
        DEFAULT_ACTION_TYPE,
      )
    : normalizeActionType(
        cliArgs.actionType || actionTypeEnv,
        DEFAULT_ACTION_TYPE,
      );

  assertValidActionType(actionType);

  const logLevel = isGitHubActionRuntime
    ? normalizeLogLevel(
        core.getInput(inputs.logLevel) || logLevelEnv,
        defaults.logLevel,
      )
    : normalizeLogLevel(cliArgs.logLevel || logLevelEnv, defaults.logLevel);

  assertValidLogLevel(logLevel);

  const source = isGitHubActionRuntime
    ? core.getInput(inputs.source) || sourceEnv || defaults.source
    : cliArgs.source || sourceEnv || defaults.source;

  const output = isGitHubActionRuntime
    ? normalizeOutputBaseDirectory(
        core.getInput(inputs.outputDirectory) ||
          outputEnv ||
          env.DEPLOY_DIR ||
          defaults.output,
        defaults,
      )
    : cliArgs.output || outputEnv || defaults.output;

  const publicDirectoryName = isGitHubActionRuntime
    ? normalizeActionPublicDirectory(
        core.getInput(inputs.output) ||
          publicDirectoryEnv ||
          defaults.publicDirectoryName,
        defaults,
      )
    : cliArgs.publicDirectory ||
      publicDirectoryEnv ||
      defaults.publicDirectoryName;

  const deploymentEnvironment = isGitHubActionRuntime
    ? normalizeDeploymentEnvironment(
        core.getInput(inputs.deploymentEnvironment) || deploymentEnvironmentEnv,
        defaults.deploymentEnvironment,
      )
    : normalizeDeploymentEnvironment(
        cliArgs.deploymentEnvironment || deploymentEnvironmentEnv,
        defaults.deploymentEnvironment,
      );

  assertValidDeploymentEnvironment(deploymentEnvironment);

  const configFile = isGitHubActionRuntime
    ? core.getInput(inputs.configFile) || configFileEnv
    : cliArgs.configFile || configFileEnv;

  const externalRepositoriesRaw = externalRepositoriesEnv;

  const externalRepositories = parseExternalRepositories(
    externalRepositoriesRaw,
  );

  const uploadArtifacts = isGitHubActionRuntime
    ? parseBoolean(
        core.getInput(inputs.uploadArtifacts) || env[envKeys.uploadArtifacts],
        defaults.uploadArtifacts,
      )
    : parseBoolean(env[envKeys.uploadArtifacts], defaults.uploadArtifacts);

  const artifactNameRaw = isGitHubActionRuntime
    ? core.getInput(inputs.artifactName) || env[envKeys.artifactName]
    : env[envKeys.artifactName];

  const artifactName =
    artifactNameRaw && String(artifactNameRaw).trim()
      ? String(artifactNameRaw).trim()
      : defaults.artifactName;

  const artifactRetentionDays = normalizeArtifactRetentionDays(
    isGitHubActionRuntime
      ? core.getInput(inputs.artifactRetentionDays) ||
          env[envKeys.artifactRetentionDays]
      : env[envKeys.artifactRetentionDays],
  );

  const readOptional = (inputName, envName, cliValue) => {
    if (isGitHubActionRuntime) {
      const value = core.getInput(inputName) || env[envName];
      return value && String(value).trim() ? String(value).trim() : undefined;
    }

    const value = cliValue || env[envName];
    return value && String(value).trim() ? String(value).trim() : undefined;
  };

  const serverManifest = {
    serverSlug: readOptional(
      inputs.serverSlug,
      envKeys.serverSlug,
      cliArgs.serverSlug,
    ),
    serverName: readOptional(
      inputs.serverName,
      envKeys.serverName,
      cliArgs.serverName,
    ),
    serverTitle: readOptional(
      inputs.serverTitle,
      envKeys.serverTitle,
      cliArgs.serverTitle,
    ),
    serverDescription: readOptional(
      inputs.serverDescription,
      envKeys.serverDescription,
      cliArgs.serverDescription,
    ),
    serverWebsiteUrl: readOptional(
      inputs.serverWebsiteUrl,
      envKeys.serverWebsiteUrl,
      cliArgs.serverWebsiteUrl,
    ),
    repositoryUrl: readOptional(
      inputs.repositoryUrl,
      envKeys.repositoryUrl,
      cliArgs.repositoryUrl,
    ),
    repositorySource:
      readOptional(
        inputs.repositorySource,
        envKeys.repositorySource,
        cliArgs.repositorySource,
      ) || 'github',
    repositorySubfolder: readOptional(
      inputs.repositorySubfolder,
      envKeys.repositorySubfolder,
      cliArgs.repositorySubfolder,
    ),
    serverVersion:
      readOptional(
        inputs.serverVersion,
        envKeys.serverVersion,
        cliArgs.serverVersion,
      ) || '1.0.0',
    releaseDate: readOptional(
      inputs.releaseDate,
      envKeys.releaseDate,
      cliArgs.releaseDate,
    ),
    packageRegistryType:
      readOptional(
        inputs.packageRegistryType,
        envKeys.packageRegistryType,
        cliArgs.packageRegistryType,
      ) || 'npm',
    packageIdentifier: readOptional(
      inputs.packageIdentifier,
      envKeys.packageIdentifier,
      cliArgs.packageIdentifier,
    ),
    packageTransportType:
      readOptional(
        inputs.packageTransportType,
        envKeys.packageTransportType,
        cliArgs.packageTransportType,
      ) || 'stdio',
  };

  return {
    actionType,
    logLevel,
    source,
    output,
    publicDirectoryName,
    registryVersion: defaults.registryVersion,
    deploymentEnvironment,
    configFile,
    externalRepositories,
    uploadArtifacts,
    artifactName,
    artifactRetentionDays,
    serverManifest,
  };
}

module.exports = {
  PROJECT_CONFIG,
  SUPPORTED_ACTION_TYPES,
  SUPPORTED_DEPLOYMENT_ENVIRONMENTS,
  assertValidActionType,
  assertValidDeploymentEnvironment,
  getRuntimeConfig,
};
