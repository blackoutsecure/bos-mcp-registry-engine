# Contributing to Blackout Secure MCP Registry Engine

Thank you for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a branch for your change
4. Install dependencies

```bash
git clone https://github.com/your-username/bos-mcp-registry-engine.git
cd bos-mcp-registry-engine
git checkout -b feature/your-change
npm install
```

## Adding or Updating MCP Servers

1. Add metadata in `servers/<name>/server.json`
2. Add one or more versions in `servers/<name>/versions/<semver>.json`
3. Validate and generate registry output

```bash
npm run validate
npm run generate
```

### Specification and schema references

- MCP protocol baseline: https://modelcontextprotocol.io/specification/2025-11-25
- MCP protocol schema source of truth: https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-11-25/schema.ts
- Registry manifest schema reference: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/draft/server.schema.json

Use these references when updating validation logic, manifest fields, or generated registry artifacts.

## Pull Request Checklist

- [ ] JSON files pass validation
- [ ] Version files use semantic versioning
- [ ] Metadata links are valid
- [ ] README/docs updated if behavior changed
- [ ] No generated registry artifacts committed unless requested

## Code Style

- Keep changes focused and minimal
- Prefer clear names and small functions
- Remove stale comments and unused code
- Preserve existing project structure and output contract

## Reporting Issues

Open an issue with:

- Problem summary
- Reproduction steps
- Expected vs actual behavior
- Error output

Issue tracker: [https://github.com/blackoutsecure/bos-mcp-registry-engine/issues](https://github.com/blackoutsecure/bos-mcp-registry-engine/issues)

## License

By contributing, you agree contributions are licensed under Apache License 2.0.
