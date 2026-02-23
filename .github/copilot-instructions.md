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
- Generate `dist/<output>/v0` as compatibility alias of `v0.1` (Action runtime)
- Generate hosting profile files:
  - `deployment_environment=github` → `.nojekyll`
  - `deployment_environment=cloudflare` → `_headers` and `_redirects`
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
  - `output` (default `public`; action runtime resolves to `dist/<output>`)
  - `deployment_environment` (default `github`; supported: `github`, `cloudflare`, `none`)
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

## Static-only limitations

Do not implement dynamic endpoints or flows that require server compute (auth exchange, publish/write APIs, runtime validation service, dynamic filtering/pagination execution).

## Change discipline

- Keep implementations minimal, explicit, and host-agnostic.
- Preserve compatibility with official MCP registry behavior where static hosting allows.
- Ensure README/action docs reflect only what is implemented in this repository.
