#!/usr/bin/env node

/**
 * Blackout Secure MCP Registry Engine
 * Copyright © 2025-2026 Blackout Secure
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import semver from 'semver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');

const REGISTRY_VERSION = '0.1';
const SOURCE_SERVERS_DIR = resolveWorkspacePath(process.env.SERVERS_DIR, 'servers');
const OUTPUT_ROOT_DIR = resolveWorkspacePath(process.env.REGISTRY_DIR, 'registry');
const REGISTRY_OUTPUT_DIR = path.join(OUTPUT_ROOT_DIR, `v${REGISTRY_VERSION}`);
const ENABLE_CLOUDFLARE_PAGES_MODE = parseEnvBoolean(process.env.CLOUDFLARE_PAGES, false);
const SCHEMAS_DIR = path.join(WORKSPACE_ROOT, 'schemas');
const CONFIG_FILE = path.join(WORKSPACE_ROOT, 'mcp-registry.config.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function resolveWorkspacePath(value, fallback) {
  if (!value || !String(value).trim()) {
    return path.resolve(WORKSPACE_ROOT, fallback);
  }
  return path.resolve(WORKSPACE_ROOT, String(value));
}

function parseEnvBoolean(value, fallback = false) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function formatValidationPath(instancePath) {
  return instancePath && instancePath.length > 0 ? instancePath : '/';
}

function createValidator(schema) {
  const validate = ajv.compile(schema);
  return (data, filename) => {
    const isValid = validate(data);
    if (isValid) {
      return true;
    }

    console.error(`\n✗ Validation failed for ${filename}:`);
    for (const error of validate.errors || []) {
      console.error(`  - ${formatValidationPath(error.instancePath)} ${error.message}`);
    }
    return false;
  };
}

async function loadSchemas() {
  try {
    const [serverSchema, versionSchema] = await Promise.all([
      fs.readJson(path.join(SCHEMAS_DIR, 'server.schema.json')),
      fs.readJson(path.join(SCHEMAS_DIR, 'version.schema.json')),
    ]);

    return {
      validateServer: createValidator(serverSchema),
      validateVersion: createValidator(versionSchema),
    };
  } catch (error) {
    console.error('✗ Failed to load schemas:', error.message);
    process.exit(1);
  }
}

async function loadConfig() {
  if (!(await fs.pathExists(CONFIG_FILE))) {
    return { version: REGISTRY_VERSION, externalRepositories: [] };
  }

  try {
    const config = await fs.readJson(CONFIG_FILE);
    return {
      version: config.version || REGISTRY_VERSION,
      externalRepositories: Array.isArray(config.externalRepositories)
        ? config.externalRepositories
        : [],
    };
  } catch (error) {
    console.error(`✗ Failed to parse ${path.basename(CONFIG_FILE)}:`, error.message);
    process.exit(1);
  }
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

async function resolveServerRoots(config) {
  const roots = [{ path: SOURCE_SERVERS_DIR, source: 'local' }];

  for (const [index, entry] of config.externalRepositories.entries()) {
    const rawPath = normalizeExternalPath(entry);
    if (!rawPath) {
      console.warn(`⚠ Skipping externalRepositories[${index}]: unsupported format`);
      continue;
    }

    const resolvedPath = path.resolve(WORKSPACE_ROOT, rawPath);
    if (!(await fs.pathExists(resolvedPath))) {
      console.warn(`⚠ Skipping external path not found: ${resolvedPath}`);
      continue;
    }

    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      console.warn(`⚠ Skipping external path (not a directory): ${resolvedPath}`);
      continue;
    }

    roots.push({ path: resolvedPath, source: `external:${rawPath}` });
  }

  return roots;
}

function readVersionFileNames(versionFiles) {
  return versionFiles.filter((filename) => filename.endsWith('.json') && filename !== 'latest.json');
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
    console.error(`✗ Failed to parse ${serverName}/server.json (${source}):`, error.message);
    return null;
  }

  if (!validators.validateServer(serverData, `${serverName}/server.json`)) {
    return null;
  }

  const versionsDir = path.join(serverDir, 'versions');
  if (!(await fs.pathExists(versionsDir))) {
    console.warn(`⚠ Skipping ${serverName}: missing versions directory (${source})`);
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
      console.error(`✗ Failed to parse ${serverName}/versions/${versionFile}:`, error.message);
      continue;
    }

    if (!validators.validateVersion(versionData, `${serverName}/versions/${versionFile}`)) {
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

async function readServers(validators, config) {
  const roots = await resolveServerRoots(config);
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

      const server = await readServerFromDirectory(serverDir, root.source, validators);
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
      console.log(`✓ Loaded ${server.name} (${server.versions.length} version(s), ${server.source})`);
    }
  }

  return Array.from(serversByName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildServersIndex(servers) {
  return servers.map((server) => ({
    name: server.serverData.name,
    displayName: server.serverData.displayName,
    description: server.serverData.description,
    author: server.serverData.author,
    homepage: server.serverData.homepage,
    repository: server.serverData.repository,
    license: server.serverData.license,
    categories: server.serverData.categories || [],
    tags: server.serverData.tags || [],
    latestVersion: server.latestVersion.version,
    versions: server.versions.map((item) => item.version),
  }));
}

function buildRootIndexHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blackout Secure MCP Registry</title>
    <meta http-equiv="refresh" content="0; url=./v${REGISTRY_VERSION}/" />
  </head>
  <body>
    <main>
      <h1>Blackout Secure MCP Registry</h1>
      <p>Redirecting to the latest registry index…</p>
      <p>
        If you are not redirected, open
        <a href="./v${REGISTRY_VERSION}/">v${REGISTRY_VERSION}</a> or
        <a href="./v${REGISTRY_VERSION}/servers.json">servers.json</a>.
      </p>
    </main>
  </body>
</html>
`;
}

function buildVersionIndexHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blackout Secure MCP Registry v${REGISTRY_VERSION}</title>
  </head>
  <body>
    <main>
      <h1>Blackout Secure MCP Registry v${REGISTRY_VERSION}</h1>
      <p>Static registry index for MCP server discovery.</p>
      <ul>
        <li><a href="./servers.json">servers.json</a></li>
      </ul>
    </main>
  </body>
</html>
`;
}

function buildCloudflareHeaders() {
  return `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()

/index.html
  Cache-Control: no-store

/v${REGISTRY_VERSION}/index.html
  Cache-Control: no-store

/v${REGISTRY_VERSION}/servers.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: public, max-age=300

/v${REGISTRY_VERSION}/servers/*/versions/latest.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: public, max-age=300

/v${REGISTRY_VERSION}/servers/*/versions/*.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: public, max-age=31536000, immutable
`;
}

function buildCloudflareRedirects() {
  return `/ /v${REGISTRY_VERSION}/ 302
/v${REGISTRY_VERSION} /v${REGISTRY_VERSION}/ 302
/servers.json /v${REGISTRY_VERSION}/servers.json 302
`;
}

async function generateRegistry(servers) {
  await fs.ensureDir(OUTPUT_ROOT_DIR);
  await fs.ensureDir(REGISTRY_OUTPUT_DIR);

  const rootIndexPath = path.join(OUTPUT_ROOT_DIR, 'index.html');
  const versionIndexPath = path.join(REGISTRY_OUTPUT_DIR, 'index.html');
  const cloudflareHeadersPath = path.join(OUTPUT_ROOT_DIR, '_headers');
  const cloudflareRedirectsPath = path.join(OUTPUT_ROOT_DIR, '_redirects');

  await fs.writeFile(rootIndexPath, buildRootIndexHtml(), 'utf8');
  await fs.writeFile(versionIndexPath, buildVersionIndexHtml(), 'utf8');
  if (ENABLE_CLOUDFLARE_PAGES_MODE) {
    await fs.writeFile(cloudflareHeadersPath, buildCloudflareHeaders(), 'utf8');
    await fs.writeFile(cloudflareRedirectsPath, buildCloudflareRedirects(), 'utf8');
  } else {
    await Promise.all([
      fs.remove(cloudflareHeadersPath),
      fs.remove(cloudflareRedirectsPath),
    ]);
  }

  console.log(`✓ Wrote ${rootIndexPath}`);
  console.log(`✓ Wrote ${versionIndexPath}`);
  if (ENABLE_CLOUDFLARE_PAGES_MODE) {
    console.log(`✓ Wrote ${cloudflareHeadersPath}`);
    console.log(`✓ Wrote ${cloudflareRedirectsPath}`);
  }

  const serversIndex = buildServersIndex(servers);
  await fs.writeJson(
    path.join(REGISTRY_OUTPUT_DIR, 'servers.json'),
    {
      version: REGISTRY_VERSION,
      generatedAt: new Date().toISOString(),
      servers: serversIndex,
    },
    { spaces: 2 },
  );

  for (const server of servers) {
    const versionsDir = path.join(REGISTRY_OUTPUT_DIR, 'servers', server.name, 'versions');
    await fs.ensureDir(versionsDir);

    for (const version of server.versions) {
      await fs.writeJson(
        path.join(versionsDir, `${version.version}.json`),
        {
          ...server.serverData,
          ...version.data,
        },
        { spaces: 2 },
      );
    }

    await fs.writeJson(
      path.join(versionsDir, 'latest.json'),
      {
        ...server.serverData,
        ...server.latestVersion.data,
      },
      { spaces: 2 },
    );
  }
}

async function main() {
  console.log('🚀 Blackout Secure MCP Registry Engine\n');

  const validateOnly = process.argv.slice(2).includes('--validate-only');
  const validators = await loadSchemas();
  const config = await loadConfig();

  console.log(`📁 Source servers path: ${SOURCE_SERVERS_DIR}`);
  console.log(`📦 Registry output root: ${OUTPUT_ROOT_DIR}`);
  console.log(`🧾 Registry version path: ${REGISTRY_OUTPUT_DIR}\n`);

  const outputBaseName = path.basename(OUTPUT_ROOT_DIR);
  if (outputBaseName === `v${REGISTRY_VERSION}`) {
    console.warn(
      `⚠ Output path appears to be a version directory (${OUTPUT_ROOT_DIR}). Use the registry root (for example ./registry) so root index and Cloudflare files are included in deployment.\n`,
    );
  }

  if (ENABLE_CLOUDFLARE_PAGES_MODE) {
    console.log('☁️ Cloudflare Pages mode: enabled (_headers and _redirects will be generated)\n');
  }

  const servers = await readServers(validators, config);
  if (servers.length === 0) {
    console.error('\n✗ No valid servers found');
    process.exit(1);
  }

  if (validateOnly) {
    console.log(`\n✓ Validation complete: ${servers.length} server(s) validated successfully`);
    return;
  }

  await generateRegistry(servers);
  console.log(`\n✓ Registry generated successfully at ${REGISTRY_OUTPUT_DIR}`);
  console.log(`✓ Total servers: ${servers.length}`);
}

main().catch((error) => {
  console.error('\n✗ Fatal error:', error);
  process.exit(1);
});
