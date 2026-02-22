const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { SCHEMAS_DIR, SERVERS_DIR } = require('./test-config');

async function createTempWorkspace() {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'mcp-registry-test-'),
  );

  await fs.copy(SCHEMAS_DIR, path.join(workspaceRoot, 'schemas'));
  await fs.copy(SERVERS_DIR, path.join(workspaceRoot, 'servers'));

  return workspaceRoot;
}

async function cleanupWorkspace(workspaceRoot) {
  await fs.remove(workspaceRoot);
}

function resolveOutputPath(workspaceRoot) {
  return path.join(workspaceRoot, 'dist', 'registry');
}

module.exports = {
  cleanupWorkspace,
  createTempWorkspace,
  resolveOutputPath,
};
