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
          deployment_environment: 'github'
```

### Inputs

| Input                    | Description                                               | Default     |
| ------------------------ | --------------------------------------------------------- | ----------- |
| `source`                 | Path to servers directory                                 | `./servers` |
| `output`                 | Base output path (registry writes to `<output>/registry`) | `./dist`    |
| `deployment_environment` | `github` or `cloudflare`                                  | `github`    |

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

## Default config location

Default config file path:

- [src/lib/mcp-registry.config.json](src/lib/mcp-registry.config.json)

External repositories can be added via `externalRepositories` in that file.

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
