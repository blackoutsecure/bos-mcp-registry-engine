const path = require('path');
const fs = require('fs-extra');
const { expect } = require('chai');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const {
  createTempWorkspace,
  cleanupWorkspace,
  resolveOutputPath,
} = require('./test-helpers');
const { PROJECT_ROOT } = require('./test-config');

const execFileAsync = promisify(execFile);

describe('index generate run', () => {
  let workspaceRoot;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceRoot);
  });

  it('creates dist/public output when generate action runs', async () => {
    const indexFilePath = path.join(PROJECT_ROOT, 'src', 'index.js');

    const { stdout } = await execFileAsync(
      'node',
      [
        indexFilePath,
        '--action-type',
        'generate_registry',
        '--source',
        './servers',
        '--output',
        './dist',
        '--public-directory',
        'public',
      ],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          GITHUB_ACTIONS: 'false',
          GITHUB_WORKSPACE: workspaceRoot,
        },
      },
    );

    const { version } = require('../package.json');
    expect(stdout).to.include(
      `Running bos-mcp-registry-engine v${version} (log level: info)`,
    );
    expect(stdout).to.include(
      'Runtime config: action_type=generate_registry, source=./servers, output_directory=./dist, output=public, deployment_environment=github',
    );

    const outputRoot = resolveOutputPath(workspaceRoot);
    expect(await fs.pathExists(outputRoot)).to.equal(true);
    expect(await fs.pathExists(path.join(outputRoot, 'index.html'))).to.equal(
      true,
    );
    expect(
      await fs.pathExists(path.join(outputRoot, 'v0.1', 'servers.json')),
    ).to.equal(true);
  });
});
