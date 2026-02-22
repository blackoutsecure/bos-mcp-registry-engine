/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

const fs = require('fs-extra');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const semver = require('semver');
const {
  PROJECT_CONFIG,
  assertValidDeploymentEnvironment,
} = require('./project-config');
const { formatValidationPath, resolveWorkspacePath } = require('./utils');
const { writeDeploymentProfileFiles } = require('./deployment-profiles');

const REGISTRY_VERSION = PROJECT_CONFIG.runtime.defaults.registryVersion;

function createValidator(ajv, schema) {
  const validate = ajv.compile(schema);
  return (data, filename) => {
    const isValid = validate(data);
    if (isValid) {
      return true;
    }

    console.error(`\n✗ Validation failed for ${filename}:`);
    for (const error of validate.errors || []) {
      console.error(
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

async function loadSchemas(ajv, schemasDir) {
  const [serverSchema, versionSchema] = await Promise.all([
    fs.readJson(path.join(schemasDir, 'server.schema.json')),
    fs.readJson(path.join(schemasDir, 'version.schema.json')),
  ]);

  return {
    validateServer: createValidator(ajv, serverSchema),
    validateVersion: createValidator(ajv, versionSchema),
  };
}

async function loadConfig(
  configFile,
  registryVersion,
  defaultExternalRepositories,
  explicitExternalRepositories,
) {
  const fallbackConfig = {
    version: registryVersion,
    externalRepositories: Array.isArray(explicitExternalRepositories)
      ? explicitExternalRepositories
      : [...defaultExternalRepositories],
  };

  if (!configFile) {
    return fallbackConfig;
  }

  if (!(await fs.pathExists(configFile))) {
    return fallbackConfig;
  }

  const config = await fs.readJson(configFile);

  if (Array.isArray(explicitExternalRepositories)) {
    return {
      version: config.version || registryVersion,
      externalRepositories: explicitExternalRepositories,
    };
  }

  return {
    version: config.version || registryVersion,
    externalRepositories: Array.isArray(config.externalRepositories)
      ? config.externalRepositories
      : [...defaultExternalRepositories],
  };
}

async function resolveConfigFilePath(workspaceRoot, explicitPath) {
  if (explicitPath && String(explicitPath).trim()) {
    return resolveWorkspacePath(workspaceRoot, explicitPath, '');
  }

  return null;
}

function normalizeExternalPath(entry) {
  if (typeof entry === 'string') {
    return entry;
  }

  if (entry && typeof entry === 'object') {
    if (typeof entry.path === 'string') {
      return entry.path;
    }
    if (typeof entry.serversPath === 'string') {
      return entry.serversPath;
    }
  }

  return null;
}

async function resolveServerRoots(workspaceRoot, sourceServersDir, config) {
  const roots = [{ path: sourceServersDir, source: 'local' }];

  for (const [index, entry] of config.externalRepositories.entries()) {
    const rawPath = normalizeExternalPath(entry);
    if (!rawPath) {
      console.warn(
        `⚠ Skipping externalRepositories[${index}]: unsupported format`,
      );
      continue;
    }

    const resolvedPath = path.resolve(workspaceRoot, rawPath);
    if (!(await fs.pathExists(resolvedPath))) {
      console.warn(`⚠ Skipping external path not found: ${resolvedPath}`);
      continue;
    }

    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      console.warn(
        `⚠ Skipping external path (not a directory): ${resolvedPath}`,
      );
      continue;
    }

    roots.push({ path: resolvedPath, source: `external:${rawPath}` });
  }

  return roots;
}

function readVersionFileNames(versionFiles) {
  return versionFiles.filter(
    (filename) => filename.endsWith('.json') && filename !== 'latest.json',
  );
}

async function readServerFromDirectory(serverDir, source, validators) {
  const serverName = path.basename(serverDir);
  const serverJsonPath = path.join(serverDir, 'server.json');

  if (!(await fs.pathExists(serverJsonPath))) {
    return null;
  }

  let serverData;
  try {
    serverData = await fs.readJson(serverJsonPath);
  } catch (error) {
    console.error(
      `✗ Failed to parse ${serverName}/server.json (${source}):`,
      error.message,
    );
    return null;
  }

  if (!validators.validateServer(serverData, `${serverName}/server.json`)) {
    return null;
  }

  const versionsDir = path.join(serverDir, 'versions');
  if (!(await fs.pathExists(versionsDir))) {
    console.warn(
      `⚠ Skipping ${serverName}: missing versions directory (${source})`,
    );
    return null;
  }

  const versions = [];
  const versionFiles = readVersionFileNames(await fs.readdir(versionsDir));

  for (const versionFile of versionFiles) {
    const versionPath = path.join(versionsDir, versionFile);

    let versionData;
    try {
      versionData = await fs.readJson(versionPath);
    } catch (error) {
      console.error(
        `✗ Failed to parse ${serverName}/versions/${versionFile}:`,
        error.message,
      );
      continue;
    }

    if (
      !validators.validateVersion(
        versionData,
        `${serverName}/versions/${versionFile}`,
      )
    ) {
      continue;
    }

    if (!semver.valid(versionData.version)) {
      console.error(
        `✗ Invalid semantic version in ${serverName}/versions/${versionFile}: ${versionData.version}`,
      );
      continue;
    }

    versions.push({
      version: versionData.version,
      data: versionData,
    });
  }

  if (versions.length === 0) {
    console.warn(`⚠ Skipping ${serverName}: no valid versions (${source})`);
    return null;
  }

  versions.sort((a, b) => semver.rcompare(a.version, b.version));

  return {
    name: serverData.name,
    source,
    serverData,
    versions,
    latestVersion: versions[0],
  };
}

async function readServers(
  workspaceRoot,
  sourceServersDir,
  validators,
  config,
) {
  const roots = await resolveServerRoots(
    workspaceRoot,
    sourceServersDir,
    config,
  );
  const serversByName = new Map();

  for (const root of roots) {
    if (!(await fs.pathExists(root.path))) {
      console.warn(`⚠ Skipping source path not found: ${root.path}`);
      continue;
    }

    const entries = await fs.readdir(root.path);
    for (const entry of entries) {
      const serverDir = path.join(root.path, entry);
      const stats = await fs.stat(serverDir);
      if (!stats.isDirectory()) {
        continue;
      }

      const server = await readServerFromDirectory(
        serverDir,
        root.source,
        validators,
      );
      if (!server) {
        continue;
      }

      const existing = serversByName.get(server.name);
      if (existing) {
        console.warn(
          `⚠ Duplicate server "${server.name}" from ${server.source} ignored; using ${existing.source}`,
        );
        continue;
      }

      serversByName.set(server.name, server);
      console.log(
        `✓ Loaded ${server.name} (${server.versions.length} version(s), ${server.source})`,
      );
    }
  }

  return Array.from(serversByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function buildServersIndex(servers) {
  return servers.map((server) => {
    const latestDetail = buildServerDetail(
      server.serverData,
      server.latestVersion.data,
    );
    return {
      name: latestDetail.name,
      title: latestDetail.title,
      description: latestDetail.description,
      version: latestDetail.version,
      websiteUrl: latestDetail.websiteUrl,
      repository: latestDetail.repository,
      packages: latestDetail.packages || [],
      remotes: latestDetail.remotes || [],
      latestVersion: server.latestVersion.version,
      versions: server.versions.map((item) => item.version),
    };
  });
}

function buildRootIndexHtml(registryVersion) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blackout Secure MCP Registry</title>
    <meta http-equiv="refresh" content="0; url=./v${registryVersion}/" />
  </head>
  <body>
    <main>
      <h1>Blackout Secure MCP Registry</h1>
      <p>Redirecting to the latest registry index…</p>
      <p>
        If you are not redirected, open
        <a href="./v${registryVersion}/">v${registryVersion}</a> or
        <a href="./v${registryVersion}/servers.json">servers.json</a>.
      </p>
    </main>
  </body>
</html>
`;
}

function buildVersionIndexHtml(registryVersion) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blackout Secure MCP Registry v${registryVersion}</title>
  </head>
  <body>
    <main>
      <h1>Blackout Secure MCP Registry v${registryVersion}</h1>
      <p>Static registry index for MCP server discovery.</p>
      <ul>
        <li><a href="./servers/index.json">servers (API-compatible)</a></li>
        <li><a href="./servers.json">servers.json</a></li>
        <li><a href="./health.json">health.json</a></li>
        <li><a href="./ping.json">ping.json</a></li>
        <li><a href="./version.json">version.json</a></li>
      </ul>
    </main>
  </body>
</html>
`;
}

function toIsoDateOrFallback(dateValue, fallback) {
  if (!dateValue) {
    return fallback;
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toISOString();
}

function getPublishedAtIso(versions, fallback) {
  const releaseDates = versions
    .map((item) => toIsoDateOrFallback(item.data.releaseDate, null))
    .filter(Boolean)
    .sort();

  return releaseDates[0] || fallback;
}

function getUpdatedAtIso(versions, fallback) {
  const releaseDates = versions
    .map((item) => toIsoDateOrFallback(item.data.releaseDate, null))
    .filter(Boolean)
    .sort();

  return releaseDates[releaseDates.length - 1] || fallback;
}

function buildServerDetail(serverData, versionData) {
  return {
    ...serverData,
    ...versionData,
  };
}

function buildServerResponse({
  serverData,
  versionData,
  isLatest,
  publishedAt,
  updatedAt,
}) {
  return {
    server: buildServerDetail(serverData, versionData),
    _meta: {
      'io.modelcontextprotocol.registry/official': {
        status: 'active',
        publishedAt,
        updatedAt,
        isLatest,
      },
    },
  };
}

function buildServerList(servers) {
  return {
    servers,
    metadata: {
      count: servers.length,
      nextCursor: null,
    },
  };
}

function encodeServerNameForPath(serverName) {
  return encodeURIComponent(serverName);
}

async function writeJsonFile(filePath, data) {
  await fs.writeJson(filePath, data, { spaces: 2 });
}

async function writeApiCompatJson(basePath, data) {
  await Promise.all([
    writeJsonFile(`${basePath}.json`, data),
    writeJsonFile(basePath, data),
  ]);
}

async function generateRegistry({
  outputRootDir,
  registryOutputDir,
  registryVersion,
  deploymentEnvironment,
  servers,
}) {
  await fs.ensureDir(outputRootDir);
  await fs.ensureDir(registryOutputDir);

  const generatedAt = new Date().toISOString();

  const rootIndexPath = path.join(outputRootDir, 'index.html');
  const versionIndexPath = path.join(registryOutputDir, 'index.html');

  await fs.writeFile(
    rootIndexPath,
    buildRootIndexHtml(registryVersion),
    'utf8',
  );
  await fs.writeFile(
    versionIndexPath,
    buildVersionIndexHtml(registryVersion),
    'utf8',
  );
  const { cloudflareHeadersPath, cloudflareRedirectsPath, noJekyllPath } =
    await writeDeploymentProfileFiles({
      fs,
      outputRootDir,
      registryVersion,
      deploymentEnvironment,
    });

  console.log(`✓ Wrote ${rootIndexPath}`);
  console.log(`✓ Wrote ${versionIndexPath}`);
  if (deploymentEnvironment === 'cloudflare') {
    console.log(`✓ Wrote ${cloudflareHeadersPath}`);
    console.log(`✓ Wrote ${cloudflareRedirectsPath}`);
  }
  if (deploymentEnvironment === 'github') {
    console.log(`✓ Wrote ${noJekyllPath}`);
  }
  if (deploymentEnvironment === 'none') {
    console.log(
      '✓ Skipped hosting profile files (_headers, _redirects, .nojekyll) for local/generic static hosting',
    );
  }

  const latestServerResponses = servers.map((server) => {
    const publishedAt = getPublishedAtIso(server.versions, generatedAt);
    const updatedAt = getUpdatedAtIso(server.versions, generatedAt);
    return buildServerResponse({
      serverData: server.serverData,
      versionData: server.latestVersion.data,
      isLatest: true,
      publishedAt,
      updatedAt,
    });
  });

  const apiServersResponse = buildServerList(latestServerResponses);
  const serversIndex = buildServersIndex(servers);
  await writeJsonFile(path.join(registryOutputDir, 'servers.json'), {
    version: registryVersion,
    generatedAt,
    servers: serversIndex,
  });

  await writeApiCompatJson(path.join(registryOutputDir, 'health'), {
    status: 'ok',
  });
  await writeApiCompatJson(path.join(registryOutputDir, 'ping'), {
    status: 'ok',
  });
  await writeApiCompatJson(path.join(registryOutputDir, 'version'), {
    version: registryVersion,
    generatedAt,
  });

  await fs.ensureDir(path.join(registryOutputDir, 'servers'));
  await writeJsonFile(
    path.join(registryOutputDir, 'servers', 'index.json'),
    apiServersResponse,
  );

  for (const server of servers) {
    const serverPathName = encodeServerNameForPath(server.name);
    const serverDir = path.join(registryOutputDir, 'servers', serverPathName);
    const publishedAt = getPublishedAtIso(server.versions, generatedAt);
    const updatedAt = getUpdatedAtIso(server.versions, generatedAt);
    const versionsServerResponses = server.versions.map((version) =>
      buildServerResponse({
        serverData: server.serverData,
        versionData: version.data,
        isLatest: version.version === server.latestVersion.version,
        publishedAt,
        updatedAt,
      }),
    );
    const versionsIndexData = buildServerList(versionsServerResponses);
    const versionsDir = path.join(serverDir, 'versions');
    await fs.ensureDir(versionsDir);
    await Promise.all([
      writeJsonFile(path.join(serverDir, 'versions.json'), versionsIndexData),
      writeJsonFile(path.join(versionsDir, 'index.json'), versionsIndexData),
    ]);

    for (const version of server.versions) {
      const versionPayload = buildServerResponse({
        serverData: server.serverData,
        versionData: version.data,
        isLatest: version.version === server.latestVersion.version,
        publishedAt,
        updatedAt,
      });
      await writeApiCompatJson(
        path.join(versionsDir, version.version),
        versionPayload,
      );
    }

    const latestPayload = buildServerResponse({
      serverData: server.serverData,
      versionData: server.latestVersion.data,
      isLatest: true,
      publishedAt,
      updatedAt,
    });
    await writeApiCompatJson(path.join(versionsDir, 'latest'), latestPayload);
  }
}

async function createVersionAlias(outputRootDir, registryVersion) {
  const sourceVersionDir = path.join(outputRootDir, `v${registryVersion}`);
  const legacyVersionDir = path.join(outputRootDir, 'v0');

  await fs.remove(legacyVersionDir);
  await fs.copy(sourceVersionDir, legacyVersionDir);
}

async function runRegistryGeneration(options = {}) {
  const { defaults, env: envKeys } = PROJECT_CONFIG.runtime;
  const workspaceRoot =
    options.workspaceRoot || process.env.GITHUB_WORKSPACE || process.cwd();
  const registryVersion = options.registryVersion || defaults.registryVersion;
  const sourceServersDir = resolveWorkspacePath(
    workspaceRoot,
    options.sourceDir || process.env[envKeys.source],
    defaults.source,
  );
  const outputBaseDir = resolveWorkspacePath(
    workspaceRoot,
    options.outputDir || process.env[envKeys.output],
    defaults.output,
  );
  const publicDirectoryName =
    options.publicDirectoryName ||
    process.env[envKeys.publicDirectory] ||
    defaults.publicDirectoryName;
  const outputRootDir = path.join(outputBaseDir, publicDirectoryName);
  const registryOutputDir = path.join(outputRootDir, `v${registryVersion}`);
  const deploymentEnvironment =
    options.deploymentEnvironment ||
    process.env[envKeys.deploymentEnvironment] ||
    defaults.deploymentEnvironment;

  assertValidDeploymentEnvironment(deploymentEnvironment);

  const configFile = await resolveConfigFilePath(
    workspaceRoot,
    options.configFile || process.env[envKeys.configFile],
  );
  const schemasDir = await resolveSchemasDirectory(options.schemasDir);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  console.log('🚀 Blackout Secure MCP Registry Engine\n');
  console.log(`📁 Source servers path: ${sourceServersDir}`);
  console.log(`📦 Output base path: ${outputBaseDir}`);
  console.log(`📦 Registry output root: ${outputRootDir}`);
  console.log(`🧾 Registry version path: ${registryOutputDir}\n`);

  const outputBaseName = path.basename(outputRootDir);
  if (outputBaseName === `v${registryVersion}`) {
    console.warn(
      `⚠ Output path appears to be a version directory (${outputRootDir}). Use an output base path (for example ./dist) so profile files and root index are generated correctly.\n`,
    );
  }

  if (deploymentEnvironment === 'cloudflare') {
    console.log(
      '☁️ Deployment environment: cloudflare (_headers and _redirects will be generated)\n',
    );
  }

  if (deploymentEnvironment === 'github') {
    console.log(
      '🐙 Deployment environment: github (.nojekyll will be generated for GitHub Pages)\n',
    );
  }

  if (deploymentEnvironment === 'none') {
    console.log(
      '🧪 Deployment environment: none (host-agnostic static output; no platform profile files generated)\n',
    );
  }

  const validators = await loadSchemas(ajv, schemasDir);
  const config = await loadConfig(
    configFile,
    registryVersion,
    defaults.externalRepositories,
    options.externalRepositories,
  );
  const servers = await readServers(
    workspaceRoot,
    sourceServersDir,
    validators,
    config,
  );

  if (servers.length === 0) {
    throw new Error('No valid servers found');
  }

  if (options.validateOnly) {
    console.log(
      `\n✓ Validation complete: ${servers.length} server(s) validated successfully`,
    );
    return { validated: true, serverCount: servers.length, registryOutputDir };
  }

  await generateRegistry({
    outputRootDir,
    registryOutputDir,
    registryVersion,
    deploymentEnvironment,
    servers,
  });
  await createVersionAlias(outputRootDir, registryVersion);

  console.log(`\n✓ Registry generated successfully at ${registryOutputDir}`);
  console.log(
    `✓ Created API compatibility alias at ${path.join(outputRootDir, 'v0')}`,
  );
  console.log(`✓ Total servers: ${servers.length}`);

  return { validated: true, serverCount: servers.length, registryOutputDir };
}

module.exports = {
  REGISTRY_VERSION,
  runRegistryGeneration,
};
