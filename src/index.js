/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const core = require('@actions/core');
const { version: appVersion } = require('../package.json');
const { runApp, handleRunError } = require('./lib/runtime-runner');

async function run() {
  try {
    await runApp({ core, appVersion });
  } catch (error) {
    handleRunError({ error, core });
  }
}

run();
