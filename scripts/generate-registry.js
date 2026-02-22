#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import semver from 'semver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const SERVERS_DIR = path.join(WORKSPACE_ROOT, 'servers');
const REGISTRY_DIR = path.join(WORKSPACE_ROOT, 'registry', 'v0.1');
const SCHEMAS_DIR = path.join(WORKSPACE_ROOT, 'schemas');
const CONFIG_FILE = path.join(WORKSPACE_ROOT, 'mcp-registry.config.json');

// Initialize JSON Schema validator
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let serverSchema;
let versionSchema;

/**
 * Load JSON schemas for validation
 */
async function loadSchemas() {
  try {
    serverSchema = await fs.readJson(path.join(SCHEMAS_DIR, 'server.schema.json'));
    versionSchema = await fs.readJson(path.join(SCHEMAS_DIR, 'version.schema.json'));
    console.log('✓ Schemas loaded successfully');
  } catch (error) {
    console.error('✗ Failed to load schemas:', error.message);
    process.exit(1);
  }
}

/**
 * Validate JSON against a schema
 */
function validateJson(data, schema, filename) {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  
  if (!valid) {
    console.error(`\n✗ Validation failed for ${filename}:`);
    validate.errors.forEach(error => {
      console.error(`  - ${error.instancePath} ${error.message}`);
    });
    return false;
  }
  
  return true;
}

/**
 * Read all server definitions from the servers directory
 */
async function readServers() {
  const servers = [];
  
  if (!await fs.pathExists(SERVERS_DIR)) {
    console.error(`✗ Servers directory not found: ${SERVERS_DIR}`);
    return servers;
  }
  
  const serverNames = await fs.readdir(SERVERS_DIR);
  
  for (const serverName of serverNames) {
    const serverDir = path.join(SERVERS_DIR, serverName);
    const stats = await fs.stat(serverDir);
    
    if (!stats.isDirectory()) continue;
    
    try {
      // Read server.json
      const serverJsonPath = path.join(serverDir, 'server.json');
      if (!await fs.pathExists(serverJsonPath)) {
        console.warn(`⚠ Skipping ${serverName}: missing server.json`);
        continue;
      }
      
      const serverData = await fs.readJson(serverJsonPath);
      
      // Validate server metadata
      if (!validateJson(serverData, serverSchema, `${serverName}/server.json`)) {
        console.error(`✗ Skipping ${serverName} due to validation errors`);
        continue;
      }
      
      // Read versions
      const versionsDir = path.join(serverDir, 'versions');
      const versions = [];
      
      if (await fs.pathExists(versionsDir)) {
        const versionFiles = await fs.readdir(versionsDir);
        
        for (const versionFile of versionFiles) {
          if (!versionFile.endsWith('.json')) continue;
          
          const versionPath = path.join(versionsDir, versionFile);
          const versionData = await fs.readJson(versionPath);
          
          // Validate version metadata
          if (!validateJson(versionData, versionSchema, `${serverName}/versions/${versionFile}`)) {
            console.error(`✗ Skipping version ${versionFile} due to validation errors`);
            continue;
          }
          
          versions.push({
            version: versionData.version,
            data: versionData
          });
        }
      }
      
      if (versions.length === 0) {
        console.warn(`⚠ Server ${serverName} has no valid versions`);
        continue;
      }
      
      // Sort versions
      versions.sort((a, b) => semver.rcompare(a.version, b.version));
      
      servers.push({
        name: serverData.name,
        serverData,
        versions,
        latestVersion: versions[0]
      });
      
      console.log(`✓ Loaded ${serverName} with ${versions.length} version(s)`);
      
    } catch (error) {
      console.error(`✗ Error processing ${serverName}:`, error.message);
    }
  }
  
  return servers;
}

/**
 * Generate the registry output
 */
async function generateRegistry(servers) {
  console.log('\n📝 Generating registry...');
  
  // Ensure output directory exists
  await fs.ensureDir(REGISTRY_DIR);
  
  // Generate servers.json (index)
  const serversIndex = servers.map(server => ({
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
    versions: server.versions.map(v => v.version)
  }));
  
  const indexPath = path.join(REGISTRY_DIR, 'servers.json');
  await fs.writeJson(indexPath, {
    version: '0.1',
    generatedAt: new Date().toISOString(),
    servers: serversIndex
  }, { spaces: 2 });
  console.log(`✓ Generated ${indexPath}`);
  
  // Generate individual server version files
  for (const server of servers) {
    const serverDir = path.join(REGISTRY_DIR, 'servers', server.name, 'versions');
    await fs.ensureDir(serverDir);
    
    // Write each version
    for (const version of server.versions) {
      const versionFile = path.join(serverDir, `${version.version}.json`);
      await fs.writeJson(versionFile, {
        ...server.serverData,
        ...version.data
      }, { spaces: 2 });
    }
    
    // Write latest.json
    const latestFile = path.join(serverDir, 'latest.json');
    await fs.writeJson(latestFile, {
      ...server.serverData,
      ...server.latestVersion.data
    }, { spaces: 2 });
    
    console.log(`✓ Generated ${server.versions.length} version(s) for ${server.name}`);
  }
  
  console.log(`\n✓ Registry generated successfully at ${REGISTRY_DIR}`);
  console.log(`  Total servers: ${servers.length}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 MCP Registry Engine\n');
  
  const args = process.argv.slice(2);
  const validateOnly = args.includes('--validate-only');
  
  // Load schemas
  await loadSchemas();
  
  // Read and validate servers
  console.log('\n📚 Reading server definitions...');
  const servers = await readServers();
  
  if (servers.length === 0) {
    console.error('\n✗ No valid servers found');
    process.exit(1);
  }
  
  if (validateOnly) {
    console.log(`\n✓ Validation complete: ${servers.length} server(s) validated successfully`);
    return;
  }
  
  // Generate registry
  await generateRegistry(servers);
}

// Run the script
main().catch(error => {
  console.error('\n✗ Fatal error:', error);
  process.exit(1);
});
