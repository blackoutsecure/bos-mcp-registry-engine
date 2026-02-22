/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const core = require('@actions/core');
const { runRegistryGeneration } = require('./lib/registry-generator');
const { getRuntimeConfig } = require('./lib/project-config');

async function run() {
  try {
    const runtimeConfig = getRuntimeConfig(core);

    await runRegistryGeneration({
      sourceDir: runtimeConfig.source,
      outputDir: runtimeConfig.output,
      publicDirectoryName: runtimeConfig.publicDirectoryName,
      registryVersion: runtimeConfig.registryVersion,
      deploymentEnvironment: runtimeConfig.deploymentEnvironment,
      validateOnly: runtimeConfig.validateOnly,
      configFile: runtimeConfig.configFile,
      externalRepositories: runtimeConfig.externalRepositories,
    });
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
