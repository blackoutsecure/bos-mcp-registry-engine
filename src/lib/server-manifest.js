/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const path = require('path');
const fs = require('fs-extra');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const semver = require('semver');
const { formatValidationPath, resolveWorkspacePath } = require('./utils');
const { createLogger } = require('./logger');

function createValidator(ajv, schema, logger) {
  const validate = ajv.compile(schema);
  return (data, filename) => {
    const isValid = validate(data);
    if (isValid) {
      return true;
    }

    logger.error(`\n✗ Validation failed for ${filename}:`);
    for (const error of validate.errors || []) {
      logger.error(
        `  - ${formatValidationPath(error.instancePath)} ${error.message}`,
      );
    }
    return false;
  };
}

async function resolveSchemasDirectory(explicitPath) {
  if (explicitPath) {
    return explicitPath;
  }

  const candidates = [
    process.env.GITHUB_ACTION_PATH
      ? path.join(process.env.GITHUB_ACTION_PATH, 'schemas')
      : null,
    path.resolve(__dirname, '../schemas'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'Failed to locate schemas directory. Provide an explicit schemasDir path or package schemas under src/schemas.',
  );
}

async function loadValidators(schemasDir, logger) {
  const resolvedSchemasDir = await resolveSchemasDirectory(schemasDir);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const [serverSchema, versionSchema] = await Promise.all([
    fs.readJson(path.join(resolvedSchemasDir, 'server.schema.json')),
    fs.readJson(path.join(resolvedSchemasDir, 'version.schema.json')),
  ]);

  return {
    validateServer: createValidator(ajv, serverSchema, logger),
    validateVersion: createValidator(ajv, versionSchema, logger),
  };
}

function buildServerManifest(options) {
  if (!options.serverName) {
    throw new Error('server_name is required for generate_server_manifest');
  }

  if (!options.serverDescription) {
    throw new Error(
      'server_description is required for generate_server_manifest',
    );
  }

  const manifest = {
    name: options.serverName,
    description: options.serverDescription,
  };

  if (options.serverTitle) {
    manifest.title = options.serverTitle;
  }

  if (options.serverWebsiteUrl) {
    manifest.websiteUrl = options.serverWebsiteUrl;
  }

  if (options.repositoryUrl) {
    manifest.repository = {
      url: options.repositoryUrl,
      source: options.repositorySource || 'github',
    };

    if (options.repositorySubfolder) {
      manifest.repository.subfolder = options.repositorySubfolder;
    }
  }

  return manifest;
}

function buildVersionManifest(options) {
  const version = options.serverVersion || '1.0.0';
  if (!semver.valid(version)) {
    throw new Error(`Invalid semantic version for server_version: ${version}`);
  }

  const serverSlug = options.serverSlug || 'server';
  const fallbackIdentifier = `mcp-${serverSlug.replace(/[^a-zA-Z0-9._-]/g, '-')}`;

  const manifest = {
    version,
    packages: [
      {
        registryType: options.packageRegistryType || 'npm',
        identifier: options.packageIdentifier || fallbackIdentifier,
        version,
        transport: {
          type: options.packageTransportType || 'stdio',
        },
      },
    ],
  };

  if (options.releaseDate) {
    manifest.releaseDate = options.releaseDate;
  }

  return manifest;
}

function mergeManifest(existing, generated) {
  if (!existing || typeof existing !== 'object') {
    return generated;
  }

  const merged = {
    ...existing,
    ...generated,
  };

  if (existing.repository || generated.repository) {
    merged.repository = {
      ...(existing.repository || {}),
      ...(generated.repository || {}),
    };
  }

  return merged;
}

async function readJsonIfExists(filePath) {
  if (!(await fs.pathExists(filePath))) {
    return null;
  }

  return fs.readJson(filePath);
}

async function generateServerManifest(options = {}) {
  const logger = options.logger || createLogger('info');
  const workspaceRoot =
    options.workspaceRoot || process.env.GITHUB_WORKSPACE || process.cwd();
  const { sourceDir, schemasDir, serverManifest } = options;
  const slug = serverManifest?.serverSlug;
  if (!slug || !String(slug).trim()) {
    throw new Error('server_slug is required for generate_server_manifest');
  }

  const sourceServersDir = resolveWorkspacePath(
    workspaceRoot,
    sourceDir,
    'servers',
  );

  const serverDir = path.join(sourceServersDir, slug);
  const versionsDir = path.join(serverDir, 'versions');
  await fs.ensureDir(versionsDir);

  const serverJsonPath = path.join(serverDir, 'server.json');
  const generatedServer = buildServerManifest(serverManifest);
  const existingServer = await readJsonIfExists(serverJsonPath);
  const mergedServer = mergeManifest(existingServer, generatedServer);
  await fs.writeJson(serverJsonPath, mergedServer, { spaces: 2 });

  const versionManifest = buildVersionManifest(serverManifest);
  const versionJsonPath = path.join(
    versionsDir,
    `${versionManifest.version}.json`,
  );
  const existingVersion = await readJsonIfExists(versionJsonPath);
  const mergedVersion = mergeManifest(existingVersion, versionManifest);
  await fs.writeJson(versionJsonPath, mergedVersion, { spaces: 2 });

  const validators = await loadValidators(schemasDir, logger);
  const isServerValid = validators.validateServer(
    mergedServer,
    `${slug}/server.json`,
  );
  const isVersionValid = validators.validateVersion(
    mergedVersion,
    `${slug}/versions/${versionManifest.version}.json`,
  );

  if (!isServerValid || !isVersionValid) {
    throw new Error('Generated server manifests are not schema-valid');
  }

  logger.info(`✓ Generated or updated ${slug}/server.json`);
  logger.info(
    `✓ Generated or updated ${slug}/versions/${versionManifest.version}.json`,
  );

  return {
    generated: true,
    serverSlug: slug,
    serverJsonPath,
    versionJsonPath,
    version: versionManifest.version,
  };
}

async function validateServerManifest(options = {}) {
  const logger = options.logger || createLogger('info');
  const workspaceRoot =
    options.workspaceRoot || process.env.GITHUB_WORKSPACE || process.cwd();
  const { sourceDir, schemasDir, serverManifest } = options;
  const slug = serverManifest?.serverSlug;
  if (!slug || !String(slug).trim()) {
    throw new Error('server_slug is required for validate_server_manifest');
  }

  const sourceServersDir = resolveWorkspacePath(
    workspaceRoot,
    sourceDir,
    'servers',
  );

  const serverDir = path.join(sourceServersDir, slug);
  const serverJsonPath = path.join(serverDir, 'server.json');
  const versionsDir = path.join(serverDir, 'versions');

  if (!(await fs.pathExists(serverJsonPath))) {
    throw new Error(`Missing server manifest: ${serverJsonPath}`);
  }

  if (!(await fs.pathExists(versionsDir))) {
    throw new Error(`Missing versions directory: ${versionsDir}`);
  }

  const validators = await loadValidators(schemasDir, logger);
  const serverData = await fs.readJson(serverJsonPath);
  const isServerValid = validators.validateServer(
    serverData,
    `${slug}/server.json`,
  );

  const versionFiles = (await fs.readdir(versionsDir)).filter(
    (filename) => filename.endsWith('.json') && filename !== 'latest.json',
  );

  if (versionFiles.length === 0) {
    throw new Error(`No version manifests found in ${versionsDir}`);
  }

  let validVersionCount = 0;
  for (const versionFile of versionFiles) {
    const versionPath = path.join(versionsDir, versionFile);
    const versionData = await fs.readJson(versionPath);
    const versionValid = validators.validateVersion(
      versionData,
      `${slug}/versions/${versionFile}`,
    );

    if (!semver.valid(versionData.version)) {
      throw new Error(
        `Invalid semantic version in ${slug}/versions/${versionFile}: ${versionData.version}`,
      );
    }

    if (versionValid) {
      validVersionCount += 1;
    }
  }

  if (!isServerValid || validVersionCount === 0) {
    throw new Error(`Validation failed for server slug: ${slug}`);
  }

  logger.info(
    `✓ Validation complete: ${slug} (${validVersionCount} version manifest(s) valid)`,
  );

  return {
    validated: true,
    serverSlug: slug,
    versionCount: validVersionCount,
  };
}

module.exports = {
  generateServerManifest,
  validateServerManifest,
};
