# GitHub Copilot Instructions

You are working in a repository that implements a **static MCP Registry Engine**.

## GOALS

- Do NOT build an MCP server here.
- Do NOT add Docker, Express, or any backend.
- This repo is ONLY for:
  - Generating static MCP registry JSON
  - Validating MCP server definitions
  - Optionally scanning other repositories for MCP server metadata
  - Producing a single registry folder: /registry/v0.1
  - Exposing a GitHub Action that runs the engine

## ARCHITECTURE

1. MCP servers publish metadata into:
   - servers/<name>/server.json
   - servers/<name>/versions/<semver>.json

2. A Node.js script at:
   - scripts/generate-registry.js
   must:
   - Read all servers from /servers
   - Optionally read additional servers from repositories listed in mcp-registry.config.json
   - Validate JSON against MCP schemas
   - Generate:
       /registry/v0.1/servers.json
       /registry/v0.1/servers/<name>/versions/<version>.json
       /registry/v0.1/servers/<name>/versions/latest.json

3. The output must be 100% static and host‑agnostic.

## GITHUB ACTION

Create an Action (action.yml) that:
- Runs the Node.js generator
- Accepts inputs:
    - source (default: ./servers)
    - output (default: ./registry)
- Does NOT define workflows; only the Action itself.

## DO NOT

- Add .github/workflows here as part of the Action definition.
- Implement an MCP server.
- Add runtime hosting logic.

## DO

- Focus on clean, typed Node.js scripts.
- Provide clear error messages when validation fails.
- Keep the engine small, composable, and host‑agnostic.

## TEMPLATES

Use the GitHub MCP Server as an example entry:
- servers/github/server.json
- servers/github/versions/1.0.0.json

Your job is to generate code, scripts, and configuration that follow these rules exactly.
