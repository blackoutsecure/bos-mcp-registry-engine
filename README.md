# Blackout Secure MCP Registry Engine

Copyright © 2025-2026 Blackout Secure | Apache License 2.0

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Action-blue?logo=github)](https://github.com/marketplace)
[![GitHub release](https://img.shields.io/github/v/release/blackoutsecure/bos-mcp-registry-engine?sort=semver)](https://github.com/blackoutsecure/bos-mcp-registry-engine/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

A static, host‑agnostic registry engine for MCP services, supporting validation, listing, and discovery.

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
          cloudflare_pages: 'false'
```

## ⚙️ Action Inputs

| Input    | Description                          | Default      |
| -------- | ------------------------------------ | ------------ |
| `source` | Path to server definitions directory | `./servers`  |
| `output` | Path to output registry root         | `./registry` |
| `cloudflare_pages` | Generate Cloudflare Pages `_headers` and `_redirects` files | `false` |

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
  index.html
  _headers (optional; when Cloudflare mode enabled)
  _redirects (optional; when Cloudflare mode enabled)
  v0.1/
    index.html
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

- `registry/index.html`
- `registry/v0.1/index.html`
- `registry/v0.1/servers.json`
- `registry/v0.1/servers/<name>/versions/<version>.json`
- `registry/v0.1/servers/<name>/versions/latest.json`

Optional (Cloudflare Pages mode):

- `registry/_headers`
- `registry/_redirects`

`servers.json` includes:

- Registry version
- Generation timestamp
- Normalized server index with latest version and full version list

## ☁️ Cloudflare Pages Notes

- Keep your Pages publish directory set to `registry`
- `index.html` is still needed for default `/` routing on static hosts
- Enable `cloudflare_pages: 'true'` to generate recommended `_headers` and `_redirects`
- `_headers` includes baseline security headers, CORS for registry JSON, and cache policies for index/latest/versioned JSON
- `_redirects` adds root and convenience redirects (`/`, `/v0.1`, `/servers.json`) to canonical versioned paths

### Example: GitHub Actions + Cloudflare Pages

```yaml
name: Build and Deploy Registry

on:
  push:
    branches: [main]

jobs:
  registry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate static registry for Cloudflare Pages
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          source: './servers'
          output: './registry'
          cloudflare_pages: 'true'

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: your-pages-project
          directory: registry
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

What this does:

- The registry action builds static output into `registry/`
- `cloudflare_pages: 'true'` adds `registry/_headers` and `registry/_redirects`
- `directory: registry` tells Cloudflare Pages to publish that folder as site root
- `/` resolves via `index.html` and redirect rules to the versioned registry path (`/v0.1/`)

### Troubleshooting (Cloudflare Pages)

- Root page is blank or 404: confirm Pages publish directory is exactly `registry`
- `/_headers` or `/_redirects` behavior missing: confirm `cloudflare_pages: 'true'` in the generation step
- Old routes or headers still served: trigger a new deploy and clear Cloudflare cache
- JSON requests blocked by browser CORS: verify deployment includes generated `registry/_headers`

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
