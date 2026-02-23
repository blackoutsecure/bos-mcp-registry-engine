/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const { runRegistryGeneration } = require('./registry-generator');
const { getRuntimeConfig } = require('./project-config');
const {
  generateServerManifest,
  validateServerManifest,
} = require('./server-manifest');
const { createLogger } = require('./logger');
const { uploadArtifacts } = require('./artifact-uploader');
const { commitGeneratedArtifacts } = require('./repo-artifact-committer');

const DEFAULT_DEPENDENCIES = {
  runRegistryGeneration,
  generateServerManifest,
  validateServerManifest,
  createLogger,
  getRuntimeConfig,
  commitGeneratedArtifacts,
  uploadArtifacts,
};

function buildStartupConfig(runtimeConfig) {
  return {
    actionType: runtimeConfig.actionType,
    source: runtimeConfig.source,
    output: runtimeConfig.output,
    publicDirectoryName: runtimeConfig.publicDirectoryName,
    deploymentEnvironment: runtimeConfig.deploymentEnvironment,
    cloudflareLeanOutput: runtimeConfig.cloudflareLeanOutput,
    configFile: runtimeConfig.configFile,
    logLevel: runtimeConfig.logLevel,
    uploadArtifacts: runtimeConfig.uploadArtifacts,
    artifactName: runtimeConfig.artifactName,
    artifactRetentionDays: runtimeConfig.artifactRetentionDays,
    commitGeneratedArtifacts: runtimeConfig.commitGeneratedArtifacts,
  };
}

function logStartup({ logger, appVersion, runtimeConfig }) {
  logger.info(
    `Running bos-mcp-registry-engine v${appVersion} (log level: ${logger.level})`,
  );

  logger.debug('Runtime configuration', {
    ...buildStartupConfig(runtimeConfig),
    artifactCommitterName: runtimeConfig.artifactCommitterName,
    artifactCommitterEmail: runtimeConfig.artifactCommitterEmail,
  });
}

async function runRegistryAction(runtimeConfig, logger, deps = DEFAULT_DEPENDENCIES) {
  const result = await deps.runRegistryGeneration({
    actionType: runtimeConfig.actionType,
    logger,
    sourceDir: runtimeConfig.source,
    outputDir: runtimeConfig.output,
    publicDirectoryName: runtimeConfig.publicDirectoryName,
    registryVersion: runtimeConfig.registryVersion,
    deploymentEnvironment: runtimeConfig.deploymentEnvironment,
    cloudflareLeanOutput: runtimeConfig.cloudflareLeanOutput,
    configFile: runtimeConfig.configFile,
    externalRepositories: runtimeConfig.externalRepositories,
  });

  if (runtimeConfig.actionType !== 'generate_registry') {
    return;
  }

  await deps.commitGeneratedArtifacts({
    logger,
    enabled: runtimeConfig.commitGeneratedArtifacts,
    outputRootDir: result.outputRootDir,
    committerName: runtimeConfig.artifactCommitterName,
    committerEmail: runtimeConfig.artifactCommitterEmail,
  });

  await deps.uploadArtifacts({
    logger,
    enabled: runtimeConfig.uploadArtifacts,
    outputRootDir: result.outputRootDir,
    artifactName: runtimeConfig.artifactName,
    artifactRetentionDays: runtimeConfig.artifactRetentionDays,
  });
}

async function runAction(runtimeConfig, logger, deps = DEFAULT_DEPENDENCIES) {
  if (
    runtimeConfig.actionType === 'generate_registry' ||
    runtimeConfig.actionType === 'validate_registry'
  ) {
    await runRegistryAction(runtimeConfig, logger, deps);
    return;
  }

  if (runtimeConfig.actionType === 'generate_server_manifest') {
    await deps.generateServerManifest({
      logger,
      sourceDir: runtimeConfig.source,
      serverManifest: runtimeConfig.serverManifest,
    });
    return;
  }

  if (runtimeConfig.actionType === 'validate_server_manifest') {
    await deps.validateServerManifest({
      logger,
      sourceDir: runtimeConfig.source,
      serverManifest: runtimeConfig.serverManifest,
    });
    return;
  }

  throw new Error(`Unsupported action type: ${runtimeConfig.actionType}`);
}

async function runApp({
  core,
  appVersion,
  argv = process.argv.slice(2),
  env = process.env,
  dependencies = DEFAULT_DEPENDENCIES,
}) {
  const runtimeConfig = dependencies.getRuntimeConfig(core, argv, env);
  const logger = dependencies.createLogger(runtimeConfig.logLevel);

  logStartup({ logger, appVersion, runtimeConfig });
  await runAction(runtimeConfig, logger, dependencies);
}

function handleRunError({ error, core, env = process.env }) {
  const message = error instanceof Error ? error.message : String(error);
  if (env.GITHUB_ACTIONS === 'true') {
    core.setFailed(message);
    return;
  }

  console.error('\n✗ Fatal error:', message);
  process.exit(1);
}

module.exports = {
  buildStartupConfig,
  logStartup,
  runAction,
  runApp,
  handleRunError,
  DEFAULT_DEPENDENCIES,
};
