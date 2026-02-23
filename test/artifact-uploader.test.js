const path = require('path');
const fs = require('fs-extra');
const { expect } = require('chai');
const { createTempWorkspace, cleanupWorkspace } = require('./test-helpers');
const { uploadArtifacts } = require('../src/lib/artifact-uploader');

describe('artifact-uploader', () => {
  let workspaceRoot;

  beforeEach(async () => {
    workspaceRoot = await createTempWorkspace();
  });

  afterEach(async () => {
    await cleanupWorkspace(workspaceRoot);
  });

  it('skips upload when disabled', async () => {
    const result = await uploadArtifacts({
      enabled: false,
      outputRootDir: path.join(workspaceRoot, 'dist', 'public'),
      githubActions: true,
    });

    expect(result.uploaded).to.equal(false);
    expect(result.reason).to.equal('disabled');
  });

  it('skips upload outside GitHub Actions', async () => {
    const result = await uploadArtifacts({
      enabled: true,
      outputRootDir: path.join(workspaceRoot, 'dist', 'public'),
      githubActions: false,
    });

    expect(result.uploaded).to.equal(false);
    expect(result.reason).to.equal('not-github-actions');
  });

  it('uploads generated files with provided artifact settings', async () => {
    const outputRootDir = path.join(workspaceRoot, 'dist', 'public');
    await fs.ensureDir(path.join(outputRootDir, 'v0.1'));
    await fs.writeFile(path.join(outputRootDir, 'index.html'), '<html/>', 'utf8');
    await fs.writeFile(path.join(outputRootDir, 'v0.1', 'servers.json'), '{}', 'utf8');

    let captured = null;
    const mockArtifactClient = {
      async uploadArtifact(name, files, rootDirectory, options) {
        captured = { name, files, rootDirectory, options };
        return { id: 123, size: 456, digest: 'sha256:abc123' };
      },
    };

    const result = await uploadArtifacts({
      enabled: true,
      outputRootDir,
      artifactName: 'registry-files',
      artifactRetentionDays: 7,
      githubActions: true,
      artifactClient: mockArtifactClient,
    });

    expect(result.uploaded).to.equal(true);
    expect(result.fileCount).to.equal(2);
    expect(captured).to.not.equal(null);
    expect(captured.name).to.equal('registry-files');
    expect(captured.rootDirectory).to.equal(outputRootDir);
    expect(captured.options).to.deep.equal({
      compressionLevel: 6,
      retentionDays: 7,
    });
    expect(captured.files).to.have.length(2);
  });
});
