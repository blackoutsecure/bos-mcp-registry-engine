const path = require('path');
const { expect } = require('chai');
const fs = require('fs-extra');
const { cleanupWorkspace, createTempWorkspace } = require('./test-helpers');
const {
  generateServerManifest,
  validateServerManifest,
} = require('../src/lib/server-manifest');

describe('server-manifest', () => {
  let workspaceRoot;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceRoot);
  });

  it('generates and validates a server manifest set', async () => {
    const result = await generateServerManifest({
      workspaceRoot,
      sourceDir: './servers',
      schemasDir: path.join(workspaceRoot, 'schemas'),
      serverManifest: {
        serverSlug: 'example',
        serverName: 'io.example/example',
        serverTitle: 'Example',
        serverDescription: 'Example MCP server',
        serverWebsiteUrl: 'https://example.com',
        repositoryUrl: 'https://github.com/example/mcp-server',
        repositorySource: 'github',
        repositorySubfolder: 'packages/server',
        serverVersion: '1.2.3',
        packageRegistryType: 'npm',
        packageIdentifier: '@example/mcp-server',
        packageTransportType: 'stdio',
      },
    });

    expect(result.generated).to.equal(true);
    expect(result.serverSlug).to.equal('example');
    expect(result.version).to.equal('1.2.3');

    const serverJsonPath = path.join(
      workspaceRoot,
      'servers',
      'example',
      'server.json',
    );
    const versionJsonPath = path.join(
      workspaceRoot,
      'servers',
      'example',
      'versions',
      '1.2.3.json',
    );
    const latestJsonPath = path.join(
      workspaceRoot,
      'servers',
      'example',
      'versions',
      'latest.json',
    );

    expect(await fs.pathExists(serverJsonPath)).to.equal(true);
    expect(await fs.pathExists(versionJsonPath)).to.equal(true);
    expect(await fs.pathExists(latestJsonPath)).to.equal(true);

    const latestManifest = await fs.readJson(latestJsonPath);
    expect(latestManifest.version).to.equal('1.2.3');

    const validation = await validateServerManifest({
      workspaceRoot,
      sourceDir: './servers',
      schemasDir: path.join(workspaceRoot, 'schemas'),
      serverManifest: {
        serverSlug: 'example',
      },
    });

    expect(validation.validated).to.equal(true);
    expect(validation.serverSlug).to.equal('example');
    expect(validation.versionCount).to.equal(1);
  });

  it('updates existing server manifest files', async () => {
    await generateServerManifest({
      workspaceRoot,
      sourceDir: './servers',
      schemasDir: path.join(workspaceRoot, 'schemas'),
      serverManifest: {
        serverSlug: 'example-update',
        serverName: 'io.example/example-update',
        serverDescription: 'Initial description',
        serverVersion: '1.0.0',
      },
    });

    await generateServerManifest({
      workspaceRoot,
      sourceDir: './servers',
      schemasDir: path.join(workspaceRoot, 'schemas'),
      serverManifest: {
        serverSlug: 'example-update',
        serverName: 'io.example/example-update',
        serverDescription: 'Updated description',
        serverVersion: '1.0.0',
      },
    });

    const server = await fs.readJson(
      path.join(workspaceRoot, 'servers', 'example-update', 'server.json'),
    );
    expect(server.description).to.equal('Updated description');
  });

  it('updates latest.json when server version is bumped', async () => {
    await generateServerManifest({
      workspaceRoot,
      sourceDir: './servers',
      schemasDir: path.join(workspaceRoot, 'schemas'),
      serverManifest: {
        serverSlug: 'example-latest',
        serverName: 'io.example/example-latest',
        serverDescription: 'Example latest behavior',
        serverVersion: '1.0.0',
      },
    });

    await generateServerManifest({
      workspaceRoot,
      sourceDir: './servers',
      schemasDir: path.join(workspaceRoot, 'schemas'),
      serverManifest: {
        serverSlug: 'example-latest',
        serverName: 'io.example/example-latest',
        serverDescription: 'Example latest behavior',
        serverVersion: '1.1.0',
      },
    });

    const latestManifest = await fs.readJson(
      path.join(
        workspaceRoot,
        'servers',
        'example-latest',
        'versions',
        'latest.json',
      ),
    );

    expect(latestManifest.version).to.equal('1.1.0');
    expect(latestManifest.packages[0].version).to.equal('1.1.0');
  });
});
