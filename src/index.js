/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const core = require('@actions/core');
const { runRegistryGeneration } = require('./lib/registry-generator');
const { getRuntimeConfig } = require('./lib/project-config');
const {
  generateServerManifest,
  validateServerManifest,
} = require('./lib/server-manifest');
const { createLogger } = require('./lib/logger');

async function run() {
  try {
    const runtimeConfig = getRuntimeConfig(core);
    const logger = createLogger(runtimeConfig.logLevel);
    logger.debug('Resolved runtime configuration', {
      actionType: runtimeConfig.actionType,
      source: runtimeConfig.source,
      output: runtimeConfig.output,
      publicDirectoryName: runtimeConfig.publicDirectoryName,
      deploymentEnvironment: runtimeConfig.deploymentEnvironment,
      configFile: runtimeConfig.configFile,
      logLevel: runtimeConfig.logLevel,
    });

    if (
      runtimeConfig.actionType === 'generate_registry' ||
      runtimeConfig.actionType === 'validate_registry'
    ) {
      await runRegistryGeneration({
        actionType: runtimeConfig.actionType,
        logger,
        sourceDir: runtimeConfig.source,
        outputDir: runtimeConfig.output,
        publicDirectoryName: runtimeConfig.publicDirectoryName,
        registryVersion: runtimeConfig.registryVersion,
        deploymentEnvironment: runtimeConfig.deploymentEnvironment,
        configFile: runtimeConfig.configFile,
        externalRepositories: runtimeConfig.externalRepositories,
      });
      return;
    }

    if (runtimeConfig.actionType === 'generate_server_manifest') {
      await generateServerManifest({
        logger,
        sourceDir: runtimeConfig.source,
        serverManifest: runtimeConfig.serverManifest,
      });
      return;
    }

    if (runtimeConfig.actionType === 'validate_server_manifest') {
      await validateServerManifest({
        logger,
        sourceDir: runtimeConfig.source,
        serverManifest: runtimeConfig.serverManifest,
      });
      return;
    }

    throw new Error(`Unsupported action type: ${runtimeConfig.actionType}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (process.env.GITHUB_ACTIONS === 'true') {
      core.setFailed(message);
      return;
    }

    console.error('\n✗ Fatal error:', message);
    process.exit(1);
  }
}

run();
