const path = require('path');
const { expect } = require('chai');
const fs = require('fs-extra');
const { runRegistryGeneration } = require('../src/lib/registry-generator');
const {
  cleanupWorkspace,
  createTempWorkspace,
  resolveOutputPath,
} = require('./test-helpers');

describe('registry-generator', () => {
  let workspaceRoot;
  const encodedServerName = encodeURIComponent('io.github.github/github');

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceRoot);
  });

  it('validates server manifests in validate-only mode', async () => {
    const result = await runRegistryGeneration({
      workspaceRoot,
      actionType: 'validate_registry',
      sourceDir: './servers',
      outputDir: './dist',
      deploymentEnvironment: 'github',
      schemasDir: path.join(workspaceRoot, 'schemas'),
    });

    expect(result.validated).to.equal(true);
    expect(result.serverCount).to.equal(1);
  });

  it('generates required static registry files', async () => {
    await runRegistryGeneration({
      workspaceRoot,
      sourceDir: './servers',
      outputDir: './dist',
      deploymentEnvironment: 'github',
      schemasDir: path.join(workspaceRoot, 'schemas'),
    });

    const outputRoot = resolveOutputPath(workspaceRoot);
    const versionRoot = path.join(outputRoot, 'v0.1');
    const v0AliasRoot = path.join(outputRoot, 'v0');

    expect(await fs.pathExists(path.join(outputRoot, 'index.html'))).to.equal(
      true,
    );
    expect(await fs.pathExists(path.join(versionRoot, 'index.html'))).to.equal(
      true,
    );
    expect(
      await fs.pathExists(path.join(versionRoot, 'servers.json')),
    ).to.equal(true);
    expect(
      await fs.pathExists(path.join(versionRoot, 'servers', 'index.json')),
    ).to.equal(true);
    expect(
      await fs.pathExists(path.join(v0AliasRoot, 'servers', 'index.json')),
    ).to.equal(true);
    expect(
      await fs.pathExists(path.join(v0AliasRoot, 'servers.json')),
    ).to.equal(true);
    expect(
      await fs.pathExists(
        path.join(
          versionRoot,
          'servers',
          encodedServerName,
          'versions',
          '1.0.0.json',
        ),
      ),
    ).to.equal(true);
    expect(
      await fs.pathExists(
        path.join(
          versionRoot,
          'servers',
          encodedServerName,
          'versions',
          '1.0.0',
        ),
      ),
    ).to.equal(true);
    expect(
      await fs.pathExists(
        path.join(
          versionRoot,
          'servers',
          encodedServerName,
          'versions',
          'latest.json',
        ),
      ),
    ).to.equal(true);
    expect(
      await fs.pathExists(
        path.join(
          versionRoot,
          'servers',
          encodedServerName,
          'versions',
          'latest',
        ),
      ),
    ).to.equal(true);
    expect(
      await fs.pathExists(
        path.join(versionRoot, 'servers', encodedServerName, 'versions.json'),
      ),
    ).to.equal(true);
    expect(
      await fs.pathExists(
        path.join(
          versionRoot,
          'servers',
          encodedServerName,
          'versions',
          'index.json',
        ),
      ),
    ).to.equal(true);

    const serversList = await fs.readJson(
      path.join(versionRoot, 'servers', 'index.json'),
    );
    expect(serversList.servers).to.be.an('array');
    expect(serversList.servers[0]).to.have.property('server');
    expect(serversList.servers[0]).to.have.property('_meta');
  });

  it('generates cloudflare files when enabled', async () => {
    await runRegistryGeneration({
      workspaceRoot,
      sourceDir: './servers',
      outputDir: './dist',
      deploymentEnvironment: 'cloudflare',
      schemasDir: path.join(workspaceRoot, 'schemas'),
    });

    const outputRoot = resolveOutputPath(workspaceRoot);

    expect(await fs.pathExists(path.join(outputRoot, '_headers'))).to.equal(
      true,
    );
    expect(await fs.pathExists(path.join(outputRoot, '_redirects'))).to.equal(
      true,
    );
  });

  it('removes cloudflare files when disabled', async () => {
    const outputRoot = resolveOutputPath(workspaceRoot);
    await fs.ensureDir(outputRoot);
    await fs.writeFile(path.join(outputRoot, '_headers'), 'legacy', 'utf8');
    await fs.writeFile(path.join(outputRoot, '_redirects'), 'legacy', 'utf8');

    await runRegistryGeneration({
      workspaceRoot,
      sourceDir: './servers',
      outputDir: './dist',
      deploymentEnvironment: 'github',
      schemasDir: path.join(workspaceRoot, 'schemas'),
    });

    expect(await fs.pathExists(path.join(outputRoot, '_headers'))).to.equal(
      false,
    );
    expect(await fs.pathExists(path.join(outputRoot, '_redirects'))).to.equal(
      false,
    );
    expect(await fs.pathExists(path.join(outputRoot, '.nojekyll'))).to.equal(
      true,
    );
  });

  it('generates host-agnostic output for none profile', async () => {
    const outputRoot = resolveOutputPath(workspaceRoot);
    await fs.ensureDir(outputRoot);
    await fs.writeFile(path.join(outputRoot, '_headers'), 'legacy', 'utf8');
    await fs.writeFile(path.join(outputRoot, '_redirects'), 'legacy', 'utf8');
    await fs.writeFile(path.join(outputRoot, '.nojekyll'), 'legacy', 'utf8');

    await runRegistryGeneration({
      workspaceRoot,
      sourceDir: './servers',
      outputDir: './dist',
      deploymentEnvironment: 'none',
      schemasDir: path.join(workspaceRoot, 'schemas'),
    });

    expect(await fs.pathExists(path.join(outputRoot, '_headers'))).to.equal(
      false,
    );
    expect(await fs.pathExists(path.join(outputRoot, '_redirects'))).to.equal(
      false,
    );
    expect(await fs.pathExists(path.join(outputRoot, '.nojekyll'))).to.equal(
      false,
    );
    expect(await fs.pathExists(path.join(outputRoot, 'index.html'))).to.equal(
      true,
    );
  });

  it('supports custom config path from MCP_REGISTRY_CONFIG', async () => {
    const extraServersDir = path.join(workspaceRoot, 'extra-servers');
    await fs.copy(path.join(workspaceRoot, 'servers'), extraServersDir);

    const customConfigPath = path.join(
      workspaceRoot,
      'config',
      'custom-config.json',
    );
    await fs.ensureDir(path.dirname(customConfigPath));
    await fs.writeJson(
      customConfigPath,
      {
        version: '0.1',
        externalRepositories: ['./extra-servers'],
      },
      { spaces: 2 },
    );

    const previousConfigPath = process.env.MCP_REGISTRY_CONFIG;
    process.env.MCP_REGISTRY_CONFIG = './config/custom-config.json';

    try {
      const result = await runRegistryGeneration({
        workspaceRoot,
        actionType: 'validate_registry',
        sourceDir: './servers',
        outputDir: './dist',
        deploymentEnvironment: 'github',
        schemasDir: path.join(workspaceRoot, 'schemas'),
      });

      expect(result.validated).to.equal(true);
      expect(result.serverCount).to.equal(1);
    } finally {
      if (previousConfigPath === undefined) {
        delete process.env.MCP_REGISTRY_CONFIG;
      } else {
        process.env.MCP_REGISTRY_CONFIG = previousConfigPath;
      }
    }
  });

  it('generates an empty registry when source has no valid servers', async () => {
    const emptyServersDir = path.join(workspaceRoot, 'empty-servers');
    await fs.ensureDir(emptyServersDir);

    await runRegistryGeneration({
      workspaceRoot,
      actionType: 'generate_registry',
      sourceDir: './empty-servers',
      outputDir: './dist',
      deploymentEnvironment: 'github',
      schemasDir: path.join(workspaceRoot, 'schemas'),
    });

    const outputRoot = resolveOutputPath(workspaceRoot);
    const serversJsonPath = path.join(outputRoot, 'v0.1', 'servers.json');
    expect(await fs.pathExists(serversJsonPath)).to.equal(true);

    const serversJson = await fs.readJson(serversJsonPath);
    expect(serversJson.servers).to.be.an('array').with.length(0);
  });

  it('creates missing source directory and generates empty registry', async () => {
    const missingServersDir = path.join(workspaceRoot, 'missing-servers');

    await runRegistryGeneration({
      workspaceRoot,
      actionType: 'generate_registry',
      sourceDir: './missing-servers',
      outputDir: './dist',
      deploymentEnvironment: 'github',
      schemasDir: path.join(workspaceRoot, 'schemas'),
    });

    expect(await fs.pathExists(missingServersDir)).to.equal(true);

    const outputRoot = resolveOutputPath(workspaceRoot);
    const serversJsonPath = path.join(outputRoot, 'v0.1', 'servers.json');
    expect(await fs.pathExists(serversJsonPath)).to.equal(true);

    const serversJson = await fs.readJson(serversJsonPath);
    expect(serversJson.servers).to.be.an('array').with.length(0);
  });

  it('fails validation when source has no valid servers', async () => {
    const emptyServersDir = path.join(workspaceRoot, 'empty-servers');
    await fs.ensureDir(emptyServersDir);

    let thrownError;
    try {
      await runRegistryGeneration({
        workspaceRoot,
        actionType: 'validate_registry',
        sourceDir: './empty-servers',
        outputDir: './dist',
        deploymentEnvironment: 'github',
        schemasDir: path.join(workspaceRoot, 'schemas'),
      });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).to.be.instanceOf(Error);
    expect(thrownError.message).to.equal('No valid servers found');
  });
});
