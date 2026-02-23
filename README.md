# Blackout Secure MCP Registry Engine

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-Action-blue?logo=github)](https://github.com/marketplace/actions/blackout-secure-mcp-registry-engine)
[![GitHub release](https://img.shields.io/github/v/release/blackoutsecure/bos-mcp-registry-engine?sort=semver)](https://github.com/blackoutsecure/bos-mcp-registry-engine/releases)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

Static MCP registry generator and GitHub Marketplace Action for producing host-agnostic registry artifacts.

## What it does

- Validates `servers/<name>/server.json` and `servers/<name>/versions/<semver>.json`
- Generates static registry output under `dist/<output>`
- Supports server-manifest lifecycle in MCP server repositories (generate/update + validate)
- Keeps generated public artifacts in the configured `output` folder (default: `public`)
- Produces versioned API-compatible artifacts for `v0.1` and `v0` alias
- Supports deployment profiles:
  - `github` (generates `.nojekyll`)
  - `cloudflare` (generates `_headers` and `_redirects`)
  - `none` (no host-specific profile files; suitable for local/static hosting like Apache/Nginx)

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
          # Required
          # Supported values:
          # generate_registry, validate_registry,
          # generate_server_manifest, validate_server_manifest
          action_type: 'generate_registry'
          # Optional (default): info
          # Suggested: debug, info, warn, error
          log_level: 'info'
          source: './servers'
          # Optional (default): public
          # Generates to dist/public
          output: 'public'
          # Optional (default): github
          deployment_environment: 'github'
          # Optional
          # config: './config/custom-registry-config.json'
```

### Inputs

The table below is aligned with [action.yml](action.yml) inputs.

| Input                    | Required | Default     | Description            |
| ------------------------ | -------- | ----------- | ---------------------- |
| `action_type`            | Yes      | _(none)_    | Operation mode         |
| `log_level`              | No       | `info`      | Console logging level  |
| `source`                 | No       | `./servers` | Servers root path      |
| `output`                 | No       | `public`    | Registry public folder |
| `deployment_environment` | No       | `github`    | Hosting profile        |
| `config`                 | No       | _(none)_    | Registry config file   |
| `server_slug`            | No       | _(none)_    | Server folder slug     |
| `server_name`            | No       | _(none)_    | Server manifest name   |
| `server_description`     | No       | _(none)_    | Server description     |
| `server_title`           | No       | _(none)_    | Server title           |
| `server_website_url`     | No       | _(none)_    | Server website URL     |
| `repository_url`         | No       | _(none)_    | Repository URL         |
| `repository_source`      | No       | `github`    | Repository source      |
| `repository_subfolder`   | No       | _(none)_    | Repository subfolder   |
| `server_version`         | No       | `1.0.0`     | Version manifest value |
| `release_date`           | No       | _(none)_    | Release date           |
| `package_registry_type`  | No       | `npm`       | Package registry type  |
| `package_identifier`     | No       | _(none)_    | Package identifier     |
| `package_transport_type` | No       | `stdio`     | Package transport type |

Input details:

- `action_type`: `generate_registry`, `validate_registry`, `generate_server_manifest`, `validate_server_manifest`.
- `log_level`: `debug`, `info`, `warn`, `error`.
- `output` and `deployment_environment` apply to registry actions.
- `server_slug` is required for server-manifest actions.
- `server_name` and `server_description` are required for `generate_server_manifest`.
- `config` supports `version` and `externalRepositories`.

### Inputs by `action_type`

| Input Group              | generate_registry | validate_registry | generate_server_manifest | validate_server_manifest |
| ------------------------ | ----------------- | ----------------- | ------------------------ | ------------------------ |
| `source`                 | Required          | Required          | Required                 | Required                 |
| `log_level`              | Optional          | Optional          | Optional                 | Optional                 |
| `output`                 | Optional          | Optional          | N/A                      | N/A                      |
| `deployment_environment` | Optional          | Optional          | N/A                      | N/A                      |
| `config`                 | Optional          | Optional          | N/A                      | N/A                      |
| `server_slug`            | N/A               | N/A               | Required                 | Required                 |
| `server_name`            | N/A               | N/A               | Required                 | N/A                      |
| `server_description`     | N/A               | N/A               | Required                 | N/A                      |
| `server_title`           | N/A               | N/A               | Optional                 | N/A                      |
| `server_website_url`     | N/A               | N/A               | Optional                 | N/A                      |
| `repository_*`           | N/A               | N/A               | Optional                 | N/A                      |
| `server_version`         | N/A               | N/A               | Optional                 | N/A                      |
| `release_date`           | N/A               | N/A               | Optional                 | N/A                      |
| `package_*`              | N/A               | N/A               | Optional                 | N/A                      |

Legend:

- Required = must be supplied for that action type.
- Optional = supported and not required.
- N/A = ignored for that action type.

### `action_type` values

| Value                    | Behavior              | Generates files |
| ------------------------ | --------------------- | --------------- |
| generate_registry        | Validate + generate   | Yes             |
| validate_registry        | Validate only         | No              |
| generate_server_manifest | Generate/update files | Yes             |
| validate_server_manifest | Validate one server   | No              |

Notes:

- Use explicit values only; legacy aliases are not supported.

### `log_level` values

- `debug`: troubleshooting.
- `info`: default operational logging.
- `warn`: warnings and errors.
- `error`: errors only.

### Verification guarantees

- `generate_registry`: validates all discovered manifests before writing registry artifacts.
- `validate_registry`: validates all discovered manifests and exits without writing output.
- `generate_server_manifest`: generates/updates files and then validates generated manifests before success.
- `generate_server_manifest`: updates `versions/latest.json` to match the generated `server_version` manifest.
- `validate_server_manifest`: validates existing manifests for `server_slug` and fails on schema/version errors.

If validation fails, the action exits non-zero and workflow steps fail.

### Trusted contribution model

For trusted ingestion (avoid blind adds), use this workflow pattern:

- Require PR-based changes for `servers/**` (no direct pushes to protected branches).
- Enforce CODEOWNERS review for `servers/**` and registry config files.
- Run `action_type: validate_registry` in PR checks before merge.
- Pin action versions in workflows (for example `@v1` or full SHA in stricter environments).
- Keep external sources explicit in `config` and review config changes like code.
- Optionally add policy checks (organization allowlists, signed commits, branch protections).

Trusted PR verification example:

```yaml
name: Verify Registry Inputs

on:
  pull_request:
    paths:
      - 'servers/**'
      - 'config/**'

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate registry manifests
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          action_type: 'validate_registry'
          log_level: 'info'
          source: './servers'
          config: './config/custom-registry-config.json'
```

### `deployment_environment` values

| Value        | Intended host                             | Profile files generated  | Notes                                      |
| ------------ | ----------------------------------------- | ------------------------ | ------------------------------------------ |
| `github`     | GitHub Pages                              | `.nojekyll`              | Prevents Jekyll processing on Pages        |
| `cloudflare` | Cloudflare Pages / Workers static hosting | `_headers`, `_redirects` | Applies headers and redirect aliases       |
| `none`       | Generic static hosts                      | _(none)_                 | Host-agnostic output with no profile files |

### Action vs CLI output semantics

- In GitHub Actions, `output` is the public directory name under internal base `dist`.
- Effective Action output path is always `dist/<output>`.
- In local CLI usage, `--output` still means base output directory (for example `./dist`) and `--public-directory` controls the public folder name.

### How `output` works

- Internal base path remains `dist`.
- Action input `output` controls only the public directory name under that base.
- Effective Action output path is `dist/<output>`.

Examples:

- `output: public` → `dist/public`
- `output: registry` → `dist/registry`

### Workflow example: validate then generate

Use two jobs so generation only runs after successful validation.

```yaml
name: Validate and Generate MCP Registry

on:
  push:
    branches: [main]
    paths:
      - 'servers/**'
      - 'src/**'
      - 'action.yml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate MCP manifests
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          action_type: 'validate_registry'
          log_level: 'info'
          source: './servers'

  generate:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4
      - name: Generate static registry artifacts
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          action_type: 'generate_registry'
          log_level: 'info'
          source: './servers'
          output: 'public'
          deployment_environment: 'github'

      - name: Upload registry artifact
        uses: actions/upload-artifact@v4
        with:
          name: mcp-registry-public
          path: dist/public
```

### Workflow example: generate/update server manifests in an MCP server repo

````yaml
name: Generate MCP Server Manifests

on:
  workflow_dispatch:

jobs:
  server-manifest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate or update server manifests
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          action_type: 'generate_server_manifest'
          log_level: 'info'
          source: './servers'
          server_slug: 'github'
          server_name: 'io.github.github/github'
          server_description: 'Official GitHub MCP server.'
          server_version: '1.0.0'
          package_identifier: '@modelcontextprotocol/server-github'

      - name: Validate generated server manifests
        uses: blackoutsecure/bos-mcp-registry-engine@v1
        with:
          action_type: 'validate_server_manifest'
          log_level: 'info'
          source: './servers'
          server_slug: 'github'

## Local usage

```bash
npm install
npm run validate
npm run generate
````

Optional custom config file:

```bash
node src/index.js --config ./config/custom-registry-config.json
```

or:

```bash
MCP_REGISTRY_CONFIG=./config/custom-registry-config.json npm run generate
```

Run validation-only mode (no output generation):

```bash
node src/index.js --action-type validate_registry
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

### `versions/<semver>.json`

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

- Use `config` to set `version` and external repositories in one reusable checked-in file.

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
          action_type: 'generate_registry'
          log_level: 'info'
          source: './servers'
          output: 'public'
          deployment_environment: 'github'
          config: './config/custom-registry-config.json'
```

## Output

Core generated files (shown for Action defaults where `output: public`):

- `dist/public/index.html`
- `dist/public/v0.1/index.html`
- `dist/public/v0.1/servers.json`
- `dist/public/v0.1/servers/index.json`
- `dist/public/v0.1/servers/<url-encoded-serverName>/versions/<version>.json`
- `dist/public/v0.1/servers/<url-encoded-serverName>/versions/latest.json`
- `dist/public/v0/` (compatibility alias of `v0.1`)

Deployment-specific:

- `github`: `dist/public/.nojekyll`
- `cloudflare`: `dist/public/_headers`, `dist/public/_redirects`
- `none`: no platform-specific profile files are generated (output remains portable static files with root/version `index.html` redirects)

### Hosting matrix

| `deployment_environment` | Recommended host                                  | Generated profile files  | Notes                                                                                                             |
| ------------------------ | ------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `github`                 | GitHub Pages                                      | `.nojekyll`              | Keeps Pages from running Jekyll processing.                                                                       |
| `cloudflare`             | Cloudflare Pages / Workers static files           | `_headers`, `_redirects` | Applies security/cache headers and redirect aliases.                                                              |
| `none`                   | Local preview, Apache, Nginx, generic static host | _(none)_                 | Host-agnostic static output only; root and version `index.html` files still provide navigation/redirect behavior. |

## Repository scope

This repository is for static registry generation and Marketplace Action packaging only.

- No runtime MCP server
- No backend hosting logic
- No workflow orchestration files in this repo
- No direct publishing to third-party MCP marketplaces from this action

## Release/quality checks

```bash
npm run check
```

This runs build (with clean `dist` for action packaging), lint, format check, validation, tests, and production audit gate.

## License

Apache-2.0. See [LICENSE](LICENSE).

## Support

- Issues: [blackoutsecure/bos-mcp-registry-engine/issues](https://github.com/blackoutsecure/bos-mcp-registry-engine/issues)
- Security: [SECURITY.md](SECURITY.md)
