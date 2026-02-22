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

const SUPPORTED_DEPLOYMENT_ENVIRONMENTS = ['github', 'cloudflare'];

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
      registryDirectoryName: 'registry',
      deploymentEnvironment: 'github',
      configFile: 'src/lib/mcp-registry.config.json',
    },
    env: {
      source: 'SERVERS_DIR',
      output: 'REGISTRY_DIR',
      deploymentEnvironment: 'DEPLOYMENT_ENVIRONMENT',
      validateOnly: 'MCP_REGISTRY_VALIDATE_ONLY',
      configFile: 'MCP_REGISTRY_CONFIG',
    },
    inputs: {
      source: 'source',
      output: 'output',
      deploymentEnvironment: 'deployment_environment',
    },
  },
};

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

function getRuntimeConfig(
  core,
  argv = process.argv.slice(2),
  env = process.env,
) {
  const isGitHubActionRuntime = env.GITHUB_ACTIONS === 'true';
  const cliArgs = parseCliArgs(argv);
  const { defaults, env: envKeys, inputs } = PROJECT_CONFIG.runtime;

  const sourceEnv = env[envKeys.source];
  const outputEnv = env[envKeys.output];
  const deploymentEnvironmentEnv = env[envKeys.deploymentEnvironment];
  const validateOnlyEnv = env[envKeys.validateOnly];
  const configFileEnv = env[envKeys.configFile];

  const source = isGitHubActionRuntime
    ? core.getInput(inputs.source) || sourceEnv || defaults.source
    : cliArgs.source || sourceEnv || defaults.source;

  const output = isGitHubActionRuntime
    ? core.getInput(inputs.output) || outputEnv || defaults.output
    : cliArgs.output || outputEnv || defaults.output;

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

  const validateOnly = isGitHubActionRuntime
    ? parseBoolean(validateOnlyEnv, false)
    : cliArgs.validateOnly;

  const configFile = cliArgs.configFile || configFileEnv || defaults.configFile;

  return {
    source,
    output,
    registryDirectoryName: defaults.registryDirectoryName,
    deploymentEnvironment,
    validateOnly,
    configFile,
  };
}

module.exports = {
  PROJECT_CONFIG,
  SUPPORTED_DEPLOYMENT_ENVIRONMENTS,
  assertValidDeploymentEnvironment,
  getRuntimeConfig,
};
