const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { SCHEMAS_DIR } = require('./test-config');

async function seedDefaultServers(workspaceRoot) {
  const serverRoot = path.join(workspaceRoot, 'servers', 'github');
  const versionsDir = path.join(serverRoot, 'versions');

  await fs.ensureDir(versionsDir);

  await fs.writeJson(
    path.join(serverRoot, 'server.json'),
    {
      $schema:
        'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
      name: 'io.github.github/github',
      title: 'GitHub',
      description:
        'Official GitHub MCP server for repositories, pull requests, issues, and related workflows.',
      websiteUrl:
        'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
      repository: {
        url: 'https://github.com/modelcontextprotocol/servers',
        source: 'github',
        subfolder: 'src/github',
      },
      _meta: {
        'io.modelcontextprotocol.registry/publisher-provided': {
          maintainer: 'GitHub',
        },
      },
    },
    { spaces: 2 },
  );

  await fs.writeJson(
    path.join(versionsDir, '1.0.0.json'),
    {
      version: '1.0.0',
      packages: [
        {
          registryType: 'npm',
          identifier: '@modelcontextprotocol/server-github',
          version: '1.0.0',
          transport: {
            type: 'stdio',
          },
        },
      ],
    },
    { spaces: 2 },
  );
}

async function createTempWorkspace() {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'mcp-registry-test-'),
  );

  await fs.copy(SCHEMAS_DIR, path.join(workspaceRoot, 'schemas'));
  await seedDefaultServers(workspaceRoot);

  return workspaceRoot;
}

async function cleanupWorkspace(workspaceRoot) {
  await fs.remove(workspaceRoot);
}

function resolveOutputPath(workspaceRoot) {
  return path.join(workspaceRoot, 'dist', 'public');
}

module.exports = {
  cleanupWorkspace,
  createTempWorkspace,
  resolveOutputPath,
};
