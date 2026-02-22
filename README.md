# Blackout Secure MCP Registry Engine

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Action-blue?logo=github)](https://github.com/marketplace/actions/blackout-secure-mcp-registry-engine)
[![GitHub release](https://img.shields.io/github/v/release/blackoutsecure/bos-mcp-registry-engine?sort=semver)](https://github.com/blackoutsecure/bos-mcp-registry-engine/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

Static MCP registry generator and GitHub Marketplace Action for producing host-agnostic registry artifacts.

## What it does

- Validates `servers/<name>/server.json` and `servers/<name>/versions/<semver>.json`
- Generates static registry output under `dist/registry`
- Produces versioned API-compatible artifacts for `v0.1` and `v0` alias
- Supports deployment profiles:
  - `github` (generates `.nojekyll`)
  - `cloudflare` (generates `_headers` and `_redirects`)

## Action usage (Marketplace)

```yaml
name: Build MCP Registry

on:
  push:
    branches: [main]
    paths:
      - 'servers/**'
      - 'src/**'

jobs:
  registry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate registry
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          source: './servers'
          output: './dist'
          # Optional (default): github
          deployment_environment: 'github'
          # Optional
          # config: './config/custom-registry-config.json'
          # Optional JSON array
          # external_repositories: '["../team-repo/servers", {"path":"../shared/servers"}]'
```

### Inputs

| Input                    | Description                                               | Default     |
| ------------------------ | --------------------------------------------------------- | ----------- |
| `source`                 | Path to servers directory                                 | `./servers` |
| `output`                 | Base output path (registry writes to `<output>/registry`) | `./dist`    |
| `deployment_environment` | Optional: `github` or `cloudflare`                        | `github`    |
| `config`                 | Optional path to custom config file                       | _(none)_    |
| `external_repositories`  | Optional JSON array of extra servers roots                | _(none)_    |

## Local usage

```bash
npm install
npm run validate
npm run generate
```

Optional custom config file:

```bash
node src/index.js --config ./config/custom-registry-config.json
```

or:

```bash
MCP_REGISTRY_CONFIG=./config/custom-registry-config.json npm run generate
```

No config file is required by default. Built-in defaults are:

- `version`: `0.1`
- `externalRepositories`: `[]`

## Required input layout

```text
servers/
  <name>/
    server.json
    versions/
      <semver>.json
```

Sample files:

- [servers/github/server.json](servers/github/server.json)
- [servers/github/versions/1.0.0.json](servers/github/versions/1.0.0.json)

## Manifest format

### server.json

Minimum required fields:

- `name`
- `description`

Recommended fields:

- `$schema`
- `title`
- `websiteUrl`
- `repository`
- `_meta`

Example:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.github/github",
  "title": "GitHub",
  "description": "Official GitHub MCP server for repositories, pull requests, issues, and related workflows.",
  "websiteUrl": "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
  "repository": {
    "url": "https://github.com/modelcontextprotocol/servers",
    "source": "github",
    "subfolder": "src/github"
  }
}
```

### versions/<semver>.json

Required fields:

- `version` (must be valid semver and cannot be `latest`)
- At least one of:
  - `packages`
  - `remotes`

Example:

```json
{
  "version": "1.0.0",
  "releaseDate": "2024-11-20",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@modelcontextprotocol/server-github",
      "version": "1.0.0",
      "transport": {
        "type": "stdio"
      }
    }
  ]
}
```

## Optional config file

If needed, provide a custom config file with:

- `version`
- `externalRepositories`

Use a config file when you want to:

- Aggregate servers from additional local repositories
- Keep environment-specific source roots outside default `servers/`
- Override registry version metadata for controlled publishing flows

Recommendation:

- Use `external_repositories` input for simple GitHub Action setups.
- Use `config` when you also need to set `version` and keep a reusable checked-in config file.

### externalRepositories format

`externalRepositories` must be an array of local directory references. Each entry can be:

- A string path
- An object with `path`
- An object with `serversPath`

Each resolved path must point to a `servers`-style directory containing:

- `<server-name>/server.json`
- `<server-name>/versions/<semver>.json`

Example:

```json
{
  "version": "0.1",
  "externalRepositories": [
    "../another-repo/servers",
    { "path": "../team-repo/servers" },
    { "serversPath": "../shared/servers" }
  ]
}
```

Notes:

- Paths are resolved from the workspace root.
- Invalid or missing paths are skipped with a warning.
- Duplicate server names are ignored after first load.

### GitHub Action example with config

```yaml
jobs:
  registry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate registry with external repositories
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          source: './servers'
          output: './dist'
          deployment_environment: 'github'
          config: './config/custom-registry-config.json'
```

### GitHub Action example with external_repositories input

```yaml
jobs:
  registry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate registry with direct external repositories
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          source: './servers'
          output: './dist'
          # Optional (default): github
          deployment_environment: 'github'
          external_repositories: '["../another-repo/servers", {"path":"../shared/servers"}]'
```

## Output

Core generated files:

- `dist/registry/index.html`
- `dist/registry/v0.1/index.html`
- `dist/registry/v0.1/servers.json`
- `dist/registry/v0.1/servers/index.json`
- `dist/registry/v0.1/servers/<url-encoded-serverName>/versions/<version>.json`
- `dist/registry/v0.1/servers/<url-encoded-serverName>/versions/latest.json`
- `dist/registry/v0/` (compatibility alias of `v0.1`)

Deployment-specific:

- `github`: `dist/registry/.nojekyll`
- `cloudflare`: `dist/registry/_headers`, `dist/registry/_redirects`

## Repository scope

This repository is for static registry generation and Marketplace Action packaging only.

- No runtime MCP server
- No backend hosting logic
- No workflow orchestration files in this repo

## Release/quality checks

```bash
npm run check
```

This runs build (with clean `dist`), lint, format check, validation, tests, and production audit gate.

## License

Apache-2.0. See [LICENSE](LICENSE).

## Support

- Issues: https://github.com/blackoutsecure/bos-mcp-registry-engine/issues
- Security: [SECURITY.md](SECURITY.md)
