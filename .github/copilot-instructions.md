# GitHub Copilot Instructions

You are working in **Blackout Secure MCP Registry Engine**, a static MCP registry generator and GitHub Marketplace Action.

## Public, safe, and marketplace-ready content

- Never include secrets, credentials, tokens, private URLs, internal endpoints, or personal data in code, docs, examples, tests, or logs.
- Use only repository/public references in documentation and examples.
- Keep wording suitable for public Marketplace users.

## Authoritative references

- Registry: https://registry.modelcontextprotocol.io/
- Docs: https://registry.modelcontextprotocol.io/docs
- OpenAPI: https://registry.modelcontextprotocol.io/openapi.yaml
- Upstream repo: https://github.com/modelcontextprotocol/registry
- MCP Specification (protocol): https://modelcontextprotocol.io/specification/2025-11-25
- MCP protocol schema source of truth: https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-11-25/schema.ts
- Registry server schema reference: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/draft/server.schema.json

## Protocol and schema alignment

- Treat MCP protocol semantics as authoritative from the 2025-11-25 specification and linked `schema.ts`.
- Treat registry manifest structure as authoritative from the MCP Registry `server.schema.json` reference.
- Preserve this repository's split manifest layout (`server.json` + `versions/<semver>.json`) while requiring current registry field semantics.
- Do not accept legacy/alias field names when a current canonical field is defined by upstream schema.

## Repository scope

- Static generation/validation tooling only. No runtime MCP server.
- No backend/web server additions (no Express/API runtime/Dockerized service runtime).
- No workflow orchestration files in this repo (`.github/workflows/*`).
- This repo contains generator logic and Marketplace Action packaging only.

## Current project layout (must remain accurate)

- Server definitions: `servers/<name>/server.json` and `servers/<name>/versions/<semver>.json`
- Schemas: `src/schemas/*.json`
- Built-in defaults: `version=0.1`, `externalRepositories=[]`
- Entrypoint: `src/index.js`
- Registry output model:
  - Internal base output directory: `dist`
  - Action input `output` controls public directory name under base (`dist/<output>`, default `dist/public`)
  - CLI `--output` controls base directory; CLI `--public-directory` controls public folder name

## Generator/output requirements

The generator must:

- Validate manifests using `src/schemas/server.schema.json` and `src/schemas/version.schema.json`
- Read local servers from `servers/`
- Optionally read external server roots from a custom config file when `MCP_REGISTRY_CONFIG` (or `--config`) is provided
- Generate static versioned registry artifacts under `dist/<output>/v0.1` (Action runtime)
- Generate hosting profile files:
  - `deployment_environment=github` → `.nojekyll`
  - `deployment_environment=cloudflare` → `_headers` and `_redirects` (security/CORS policy + redirect aliases)
  - `deployment_environment=none` → no hosting profile files (host-agnostic static output)
- Action-type behavior:
  - `generate_registry`: validate manifests then generate artifacts; if source has no valid servers, generate empty registry output
  - `validate_registry`: validate manifests only; fail if source has no valid servers
  - `generate_server_manifest`: generate/update one server manifest set then validate
  - `validate_server_manifest`: validate one server manifest set

## Action contract (`action.yml`)

- Runtime: Node.js (`node20`)
- Inputs:
  - `action_type` (required; supported: `generate_registry`, `validate_registry`, `generate_server_manifest`, `validate_server_manifest`)
  - `log_level` (optional; default `info`; supported: `debug`, `info`, `warn`, `error`)
  - `source` (default `./servers`)
  - `output_directory` (default `dist`; action runtime base output directory)
  - `output` (default `public`; action runtime resolves to `<output_directory>/<output>`)
  - `deployment_environment` (default `github`; supported: `github`, `cloudflare`, `none`)
  - `cloudflare_lean_output` (default `true`; when enabled with `deployment_environment=cloudflare`, emits JSON-only lean output and uses `_redirects` aliases)
  - `config` (optional custom config file path)
  - server-manifest inputs (used for `generate_server_manifest`/`validate_server_manifest`):
    - `server_slug`
    - `server_name`
    - `server_description`
    - `server_title`
    - `server_website_url`
    - `repository_url`
    - `repository_source`
    - `repository_subfolder`
    - `server_version`
    - `release_date`
    - `package_registry_type`
    - `package_identifier`
    - `package_transport_type`

Notes:

- Do not reintroduce removed legacy contracts (`public_directory`, `external_repositories` action input, `--validate-only`, or legacy action aliases `generate`/`validate`).
- Keep logging routed through the logger utility and honor `log_level` filtering.
- For Cloudflare output, prefer lean JSON-only artifacts (no extensionless duplicate files) and preserve compatibility through `_redirects` aliases.
- For Cloudflare output, keep CORS explicit for read-only API access (`GET`, `HEAD`, `OPTIONS`) and maintain strict security headers in `_headers`.

## Static-only limitations

Do not implement dynamic endpoints or flows that require server compute (auth exchange, publish/write APIs, runtime validation service, dynamic filtering/pagination execution).

## Change discipline

- Keep implementations minimal, explicit, and host-agnostic.
- Preserve compatibility with official MCP registry behavior where static hosting allows.
- Ensure README/action docs reflect only what is implemented in this repository.
