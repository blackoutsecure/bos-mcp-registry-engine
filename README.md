# Blackout Secure MCP Registry Engine

Copyright © 2025-2026 Blackout Secure | Apache License 2.0

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Action-blue?logo=github)](https://github.com/marketplace)
[![GitHub release](https://img.shields.io/github/v/release/blackoutsecure/bos-mcp-registry-engine?sort=semver)](https://github.com/blackoutsecure/bos-mcp-registry-engine/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

A host-agnostic static MCP Registry Engine that indexes, validates, and publishes MCP services. Generates a complete MCP registry under `/registry/v0.1` for deployment to any static hosting environment or platform.

## ✨ Features

- Static MCP registry generation with no runtime hosting dependency
- Schema validation for `server.json` and version manifests
- Semantic-version sorting with automatic `latest.json` generation
- Optional aggregation of external local repositories via config
- Composite GitHub Action for CI/CD automation
- Portable output for GitHub Pages, Blob storage, CDN, or any static host

## 📋 Requirements

- Node.js 18+
- MCP server manifests under `servers/<name>/`

## 🚀 Quick Start

### Local CLI

```bash
npm install
npm run validate
npm run generate
```

### GitHub Action

```yaml
name: Build MCP Registry

on:
  push:
    branches: [main]
    paths:
      - 'servers/**'
      - 'schemas/**'
      - 'scripts/**'

jobs:
  registry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate registry
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          source: './servers'
          output: './registry'
```

## ⚙️ Action Inputs

| Input    | Description                          | Default      |
| -------- | ------------------------------------ | ------------ |
| `source` | Path to server definitions directory | `./servers`  |
| `output` | Path to output registry root         | `./registry` |

The action writes generated files to `<output>/v0.1`.

## 🧱 Repository Structure

```text
servers/
  <name>/
    server.json
    versions/
      <semver>.json
schemas/
  server.schema.json
  version.schema.json
scripts/
  generate-registry.js
registry/
  v0.1/
    servers.json
    servers/<name>/versions/<version>.json
    servers/<name>/versions/latest.json
```

## 📝 Add a Server

1. Create `servers/<name>/server.json`
2. Create one or more `servers/<name>/versions/<semver>.json`
3. Run `npm run validate`
4. Run `npm run generate`

Sample files:

- [servers/github/server.json](servers/github/server.json)
- [servers/github/versions/1.0.0.json](servers/github/versions/1.0.0.json)

## 📦 Output Contract

Generated files:

- `registry/v0.1/servers.json`
- `registry/v0.1/servers/<name>/versions/<version>.json`
- `registry/v0.1/servers/<name>/versions/latest.json`

`servers.json` includes:

- Registry version
- Generation timestamp
- Normalized server index with latest version and full version list

## 🌐 External Repositories (Optional)

Configure additional local paths in `mcp-registry.config.json`:

```json
{
  "version": "0.1",
  "externalRepositories": [
    "../another-repo/servers",
    { "path": "../team-repo/servers" }
  ]
}
```

Each external path must point to a `servers`-style directory.

## 🤝 Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## ✅ Release Checklist

- Update version in `package.json` if required
- Run `npm run validate`
- Run `npm run generate`
- Confirm action metadata in `action.yml`
- Publish a GitHub release with changelog notes

## 📄 License

Licensed under Apache License 2.0. See [LICENSE](LICENSE).

## 💬 Support

- Issues: [GitHub Issues](https://github.com/blackoutsecure/bos-mcp-registry-engine/issues)
- Security: See [SECURITY.md](SECURITY.md)

---

**Made by [Blackout Secure](https://github.com/blackoutsecure)**
