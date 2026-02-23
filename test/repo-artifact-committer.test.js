const path = require('path');
const fs = require('fs-extra');
const { expect } = require('chai');
const {
  createTempWorkspace,
  cleanupWorkspace,
  resolveOutputPath,
} = require('./test-helpers');
const {
  commitGeneratedArtifacts,
} = require('../src/lib/repo-artifact-committer');

describe('repo-artifact-committer', () => {
  let workspaceRoot;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceRoot);
  });

  it('skips commit when disabled', async () => {
    const result = await commitGeneratedArtifacts({
      enabled: false,
      outputRootDir: resolveOutputPath(workspaceRoot),
      githubActions: true,
    });

    expect(result.committed).to.equal(false);
    expect(result.reason).to.equal('disabled');
  });

  it('skips commit outside GitHub Actions runtime', async () => {
    const result = await commitGeneratedArtifacts({
      enabled: true,
      outputRootDir: resolveOutputPath(workspaceRoot),
      githubActions: false,
    });

    expect(result.committed).to.equal(false);
    expect(result.reason).to.equal('not-github-actions');
  });

  it('commits generated artifact changes when files are staged', async () => {
    const outputRootDir = resolveOutputPath(workspaceRoot);
    await fs.ensureDir(path.join(outputRootDir, 'v0.1'));
    await fs.writeFile(
      path.join(outputRootDir, 'index.html'),
      '<html/>',
      'utf8',
    );
    await fs.writeFile(
      path.join(outputRootDir, 'v0.1', 'servers.json'),
      '{}',
      'utf8',
    );

    const calls = [];
    const runCommand = async (args) => {
      calls.push(args);

      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
        return { stdout: workspaceRoot };
      }

      if (args[0] === 'config' && args[1] === '--get') {
        return { stdout: '' };
      }

      if (args[0] === 'diff') {
        return {
          stdout: [
            'dist/public/index.html',
            'dist/public/v0.1/servers.json',
          ].join('\n'),
        };
      }

      if (args[0] === 'rev-parse' && args[1] === '--short') {
        return { stdout: 'abc1234' };
      }

      return { stdout: '' };
    };

    const result = await commitGeneratedArtifacts({
      enabled: true,
      githubActions: true,
      outputRootDir,
      targetBranch: 'main',
      runCommand,
    });

    expect(result.committed).to.equal(true);
    expect(result.pushed).to.equal(true);
    expect(result.fileCount).to.equal(2);
    expect(result.commitSha).to.equal('abc1234');

    const commandList = calls.map((args) => args.join(' '));
    expect(commandList).to.include('add --all -- dist/public');
    expect(commandList).to.include(
      'commit -m chore: update generated MCP registry artifacts',
    );
    expect(commandList).to.include('push origin HEAD:main');
  });

  it('skips commit when no staged changes are detected', async () => {
    const outputRootDir = resolveOutputPath(workspaceRoot);
    await fs.ensureDir(outputRootDir);

    const runCommand = async (args) => {
      if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
        return { stdout: workspaceRoot };
      }

      if (args[0] === 'config' && args[1] === '--get') {
        return { stdout: 'set' };
      }

      if (args[0] === 'diff') {
        return { stdout: '' };
      }

      return { stdout: '' };
    };

    const result = await commitGeneratedArtifacts({
      enabled: true,
      githubActions: true,
      outputRootDir,
      runCommand,
    });

    expect(result.committed).to.equal(false);
    expect(result.reason).to.equal('no-staged-changes');
  });
});
