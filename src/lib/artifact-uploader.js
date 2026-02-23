/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('fs-extra');
const path = require('path');
const { createLogger } = require('./logger');

async function collectFiles(rootDir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

function resolveArtifactClient() {
  const artifact = require('@actions/artifact');

  if (artifact?.DefaultArtifactClient) {
    return new artifact.DefaultArtifactClient();
  }

  if (artifact?.default && typeof artifact.default.uploadArtifact === 'function') {
    return artifact.default;
  }

  if (typeof artifact?.uploadArtifact === 'function') {
    return artifact;
  }

  return null;
}

async function uploadArtifacts(options = {}) {
  const logger = options.logger || createLogger('info');
  const {
    enabled = false,
    outputRootDir,
    artifactName = 'mcp-registry-files',
    artifactRetentionDays,
    githubActions = process.env.GITHUB_ACTIONS === 'true',
    artifactClient,
  } = options;

  if (!enabled) {
    logger.info('ℹ️ Artifact upload is disabled (upload_artifacts=false)');
    return { uploaded: false, reason: 'disabled' };
  }

  if (!githubActions) {
    logger.info('ℹ️ Artifact upload skipped (not running in GitHub Actions)');
    return { uploaded: false, reason: 'not-github-actions' };
  }

  if (!outputRootDir || !(await fs.pathExists(outputRootDir))) {
    logger.warn(`⚠ Artifact upload skipped: output directory not found (${outputRootDir})`);
    return { uploaded: false, reason: 'missing-output-directory' };
  }

  const files = await collectFiles(outputRootDir);
  if (files.length === 0) {
    logger.info(`ℹ️ Artifact upload skipped: no files found in ${outputRootDir}`);
    return { uploaded: false, reason: 'no-files' };
  }

  const client = artifactClient || resolveArtifactClient();
  if (!client || typeof client.uploadArtifact !== 'function') {
    logger.warn('⚠ Artifact upload skipped: @actions/artifact client unavailable');
    return { uploaded: false, reason: 'artifact-client-unavailable' };
  }

  const uploadOptions = { compressionLevel: 6 };
  if (artifactRetentionDays) {
    uploadOptions.retentionDays = artifactRetentionDays;
  }

  const response = await client.uploadArtifact(
    artifactName,
    files,
    outputRootDir,
    uploadOptions,
  );

  logger.info(`✓ Uploaded artifact "${artifactName}" (${files.length} files)`);
  if (response?.id !== undefined) {
    logger.info(`✓ Artifact ID: ${response.id}`);
  }
  if (response?.size !== undefined) {
    logger.info(`✓ Artifact size (bytes): ${response.size}`);
  }
  if (response?.digest) {
    logger.info(`✓ Artifact digest: ${response.digest}`);
  }

  return {
    uploaded: true,
    artifactName,
    fileCount: files.length,
    artifactId: response?.id,
    artifactSize: response?.size,
    artifactDigest: response?.digest,
  };
}

module.exports = {
  uploadArtifacts,
};
