/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('fs-extra');
const path = require('path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { createLogger } = require('./logger');

const execFileAsync = promisify(execFile);

async function runGitCommand(args, options = {}) {
  return execFileAsync('git', args, options);
}

async function readGitConfigValue(key, runCommand, cwd) {
  try {
    const { stdout } = await runCommand(['config', '--get', key], { cwd });
    return String(stdout || '').trim();
  } catch {
    return '';
  }
}

async function ensureGitIdentity(runCommand, cwd, options = {}) {
  const {
    committerName = 'github-actions[bot]',
    committerEmail = '41898282+github-actions[bot]@users.noreply.github.com',
  } = options;

  const userName = await readGitConfigValue('user.name', runCommand, cwd);
  const userEmail = await readGitConfigValue('user.email', runCommand, cwd);

  if (!userName) {
    await runCommand(['config', 'user.name', committerName], { cwd });
  }

  if (!userEmail) {
    await runCommand(['config', 'user.email', committerEmail], { cwd });
  }
}

async function commitGeneratedArtifacts(options = {}) {
  const logger = options.logger || createLogger('info');
  const {
    enabled = false,
    outputRootDir,
    commitMessage = 'chore: update generated MCP registry artifacts',
    committerName = 'github-actions[bot]',
    committerEmail = '41898282+github-actions[bot]@users.noreply.github.com',
    githubActions = process.env.GITHUB_ACTIONS === 'true',
    targetBranch,
    runCommand = runGitCommand,
  } = options;

  if (!enabled) {
    logger.info(
      'ℹ️ Artifact commit is disabled (commit_generated_artifacts=false)',
    );
    return { committed: false, reason: 'disabled' };
  }

  if (!githubActions) {
    logger.info('ℹ️ Artifact commit skipped (not running in GitHub Actions)');
    return { committed: false, reason: 'not-github-actions' };
  }

  if (!outputRootDir || !(await fs.pathExists(outputRootDir))) {
    logger.warn(
      `⚠ Artifact commit skipped: output directory not found (${outputRootDir})`,
    );
    return { committed: false, reason: 'missing-output-directory' };
  }

  const outputPath = path.resolve(outputRootDir);
  logger.info(`ℹ️ Artifact commit/push enabled for output path: ${outputPath}`);

  const { stdout: repoRootStdout } = await runCommand(
    ['rev-parse', '--show-toplevel'],
    { cwd: outputPath },
  );
  const repoRoot = String(repoRootStdout || '').trim();
  if (!repoRoot) {
    logger.warn(
      '⚠ Artifact commit skipped: could not resolve git repository root',
    );
    return { committed: false, reason: 'missing-repo-root' };
  }

  const relativeOutputPath = path
    .relative(repoRoot, outputPath)
    .replace(/\\/g, '/');
  if (
    !relativeOutputPath ||
    relativeOutputPath.startsWith('..') ||
    path.isAbsolute(relativeOutputPath)
  ) {
    logger.warn(
      '⚠ Artifact commit skipped: output directory is outside repository root',
    );
    return { committed: false, reason: 'output-outside-repo' };
  }

  await ensureGitIdentity(runCommand, repoRoot, {
    committerName,
    committerEmail,
  });

  logger.info(`ℹ️ Staging generated artifacts from: ${relativeOutputPath}`);
  await runCommand(['add', '--all', '--', relativeOutputPath], {
    cwd: repoRoot,
  });

  const { stdout: stagedStdout } = await runCommand(
    ['diff', '--cached', '--name-only', '--', relativeOutputPath],
    { cwd: repoRoot },
  );
  const stagedFiles = String(stagedStdout || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (stagedFiles.length === 0) {
    logger.info(
      'ℹ️ Artifact commit skipped: no staged output changes detected',
    );
    return { committed: false, reason: 'no-staged-changes' };
  }

  logger.info(`ℹ️ Committing ${stagedFiles.length} staged artifact file(s)`);
  await runCommand(['commit', '-m', commitMessage], { cwd: repoRoot });

  const { stdout: commitShaStdout } = await runCommand(
    ['rev-parse', '--short', 'HEAD'],
    {
      cwd: repoRoot,
    },
  );

  const commitSha = String(commitShaStdout || '').trim() || undefined;

  let resolvedTargetBranch = String(
    targetBranch || process.env.GITHUB_REF_NAME || '',
  ).trim();
  if (!resolvedTargetBranch) {
    try {
      const { stdout: branchStdout } = await runCommand(
        ['symbolic-ref', '--short', 'HEAD'],
        {
          cwd: repoRoot,
        },
      );
      resolvedTargetBranch = String(branchStdout || '').trim();
    } catch {
      resolvedTargetBranch = '';
    }
  }

  if (!resolvedTargetBranch || resolvedTargetBranch === 'HEAD') {
    logger.warn('⚠ Artifact push skipped: could not determine target branch');
    return {
      committed: true,
      pushed: false,
      fileCount: stagedFiles.length,
      commitSha,
      reason: 'missing-target-branch',
    };
  }

  logger.info(`ℹ️ Pushing artifact commit to origin/${resolvedTargetBranch}`);
  await runCommand(['push', 'origin', `HEAD:${resolvedTargetBranch}`], {
    cwd: repoRoot,
  });

  logger.info(
    `✓ Committed and pushed generated artifacts (${stagedFiles.length} files)${
      commitSha ? ` at ${commitSha}` : ''
    }`,
  );

  return {
    committed: true,
    pushed: true,
    fileCount: stagedFiles.length,
    commitSha,
  };
}

module.exports = {
  commitGeneratedArtifacts,
};
