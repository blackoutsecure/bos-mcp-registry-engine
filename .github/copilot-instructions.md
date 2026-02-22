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

## Repository scope

- Static generation only. No runtime MCP server.
- No backend/web server additions (no Express/API runtime/Dockerized service runtime).
- No workflow orchestration files in this repo (`.github/workflows/*`).
- This repo contains generator logic and Marketplace Action packaging only.

## Current project layout (must remain accurate)

- Server definitions: `servers/<name>/server.json` and `servers/<name>/versions/<semver>.json`
- Schemas: `src/schemas/*.json`
- Default config: `src/lib/mcp-registry.config.json`
- Entrypoint: `src/index.js`
- Output: `dist/registry`

## Generator/output requirements

The generator must:

- Validate manifests using `src/schemas/server.schema.json` and `src/schemas/version.schema.json`
- Read local servers from `servers/`
- Optionally read external server roots from `src/lib/mcp-registry.config.json` (or `MCP_REGISTRY_CONFIG` override)
- Generate static versioned registry artifacts under `dist/registry/v0.1`
- Generate `dist/registry/v0` as compatibility alias of `v0.1`
- Generate hosting profile files:
  - `deployment_environment=github` → `.nojekyll`
  - `deployment_environment=cloudflare` → `_headers` and `_redirects`

## Action contract (`action.yml`)

- Runtime: Node.js (`node20`)
- Inputs:
  - `source` (default `./servers`)
  - `output` (default `./dist`)
  - `deployment_environment` (default `github`; supported: `github`, `cloudflare`)

## Static-only limitations

Do not implement dynamic endpoints or flows that require server compute (auth exchange, publish/write APIs, runtime validation service, dynamic filtering/pagination execution).

## Change discipline

- Keep implementations minimal, explicit, and host-agnostic.
- Preserve compatibility with official MCP registry behavior where static hosting allows.
- Ensure README/action docs reflect only what is implemented in this repository.
