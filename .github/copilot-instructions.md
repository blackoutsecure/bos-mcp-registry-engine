# GitHub Copilot Instructions

You are working in a repository for the **Blackout Secure MCP Registry Engine**, a static MCP registry builder.

## Scope

- Do NOT build an MCP server here.
- Do NOT add Docker, Express, or any backend.
- This repository is only for:
  - Generating static MCP registry JSON
  - Generating static index pages for root and version paths
  - Validating MCP server definitions against schemas
  - Optionally ingesting additional server definitions from configured local paths
  - Optionally generating Cloudflare Pages `_headers` when explicitly enabled
   - Optionally generating Cloudflare Pages `_redirects` when explicitly enabled
  - Producing registry output under `/registry/v0.1`
  - Exposing a reusable GitHub Action that runs the generator

## Data Model

1. Each server definition uses:
   - servers/<name>/server.json
   - servers/<name>/versions/<semver>.json

2. The generator script:
   - scripts/generate-registry.js
  must:
   - Read all servers from /servers
  - Optionally read additional server roots listed in mcp-registry.config.json
   - Validate JSON against MCP schemas
   - Generate:
       /registry/index.html
       /registry/v0.1/index.html
       /registry/v0.1/servers.json
       /registry/v0.1/servers/<name>/versions/<version>.json
       /registry/v0.1/servers/<name>/versions/latest.json
    - Optionally generate:
       /registry/_headers (only when Cloudflare mode is enabled)
       /registry/_redirects (only when Cloudflare mode is enabled)

3. The output must be 100% static and host‑agnostic.

## GitHub Action

The Action in `action.yml` must:
- Runs the Node.js generator
- Accepts inputs:
    - source (default: ./servers)
    - output (default: ./registry)
  - cloudflare_pages (default: false)
- Does NOT define workflows; only the Action itself.

## Guardrails

- Add .github/workflows here as part of the Action definition.
- Implement an MCP server.
- Add runtime hosting logic.

## Engineering Expectations

- Keep implementation small, composable, and host‑agnostic.
- Provide clear error messages when validation fails.
- Preserve the registry output contract and folder layout.
- Avoid unrelated refactors.

## Reference Template

Use the GitHub MCP Server sample as the baseline format:
- servers/github/server.json
- servers/github/versions/1.0.0.json

All code, scripts, and docs updates must follow these rules.
