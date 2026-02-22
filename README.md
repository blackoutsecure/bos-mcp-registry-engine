# MCP Registry Engine

A **static MCP Registry Engine** that generates and validates MCP (Model Context Protocol) server definitions.

## 🎯 Purpose

This repository is designed to:

- ✅ Generate static MCP registry JSON files
- ✅ Validate MCP server definitions against schemas
- ✅ Produce a versioned registry at `/registry/v0.1`
- ✅ Provide a GitHub Action for automated registry generation

**This is NOT:**

- ❌ An MCP server implementation
- ❌ A backend service with Docker/Express
- ❌ A runtime hosting solution

## 📁 Structure

```text
mcp-registry-engine/
├── .github/
│   └── copilot-instructions.md    # GitHub Copilot guidance
├── servers/                        # Server definitions
│   └── <name>/
│       ├── server.json            # Server metadata
│       └── versions/
│           └── <semver>.json      # Version-specific data
├── schemas/                        # JSON schemas
│   ├── server.schema.json         # Server validation schema
│   └── version.schema.json        # Version validation schema
├── scripts/
│   └── generate-registry.js       # Main generator script
├── registry/                       # Generated output (gitignored)
│   └── v0.1/
│       ├── servers.json           # Index of all servers
│       └── servers/<name>/versions/
│           ├── <version>.json     # Specific versions
│           └── latest.json        # Latest version
├── mcp-registry.config.json       # Configuration
├── action.yml                      # GitHub Action definition
└── package.json
```

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Generate Registry

```bash
npm run generate
```

### Validate Only

```bash
npm run validate
```

## 📝 Adding a Server

1. Create a directory under `servers/<your-server-name>/`

1. Create `server.json`:

   ```json
   {
     "name": "your-server",
     "displayName": "Your MCP Server",
     "description": "What your server does",
     "author": "Your Name",
     "homepage": "https://your-server.com",
     "repository": "https://github.com/you/your-server",
    "license": "Apache-2.0",
     "categories": ["development"],
     "tags": ["tool", "automation"]
   }
   ```

1. Create version files in `versions/<semver>.json`:

   ```json
   {
     "version": "1.0.0",
     "releaseDate": "2024-11-20",
     "mcpVersion": "0.1",
     "runtime": "node",
     "minNodeVersion": "16.0.0",
     "installCommand": "npm install -g your-package",
     "runCommand": "your-command",
     "capabilities": {
       "resources": true,
       "tools": true,
       "prompts": false
     },
     "tools": [],
     "resources": [],
     "configuration": {
       "required": [],
       "optional": []
     }
   }
   ```

1. Run the generator to validate and build:

   ```bash
   npm run generate
   ```

## 🎬 Using as a GitHub Action

This repository provides a reusable GitHub Action for generating MCP registries.

### Basic Usage in Your Workflow

Create `.github/workflows/generate-registry.yml`:

```yaml
name: Generate MCP Registry

on:
  push:
    branches: [main]
    paths:
      - 'servers/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate Registry
        uses: blackoutmode/mcp-registry-engine@v1
        with:
          source: './servers'
          output: './registry'
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: mcp-registry
          path: registry/
```

### Use Locally (This Repository)

If using the action in this repository:

```yaml
- name: Generate MCP Registry
  uses: ./
  with:
    source: './servers'
    output: './registry'
```

### Deploy to GitHub Pages

```yaml
name: Deploy to Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: blackoutmode/mcp-registry-engine@v1
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './registry'
      
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

## 📚 Example

See the GitHub MCP Server example:

- [servers/github/server.json](servers/github/server.json)
- [servers/github/versions/1.0.0.json](servers/github/versions/1.0.0.json)

## ✅ Validation

The engine validates all JSON files against schemas:

- Server metadata must include: `name`, `displayName`, `description`, `author`, `homepage`
- Version files must include: `version`, `mcpVersion`, `runtime`
- Version numbers must follow semantic versioning (e.g., `1.0.0`)

## 🏗️ Output Format

The generated `registry/v0.1/servers.json` contains:

```json
{
  "version": "0.1",
  "generatedAt": "2024-11-20T12:00:00.000Z",
  "servers": [
    {
      "name": "github",
      "displayName": "GitHub MCP Server",
      "description": "...",
      "latestVersion": "1.0.0",
      "versions": ["1.0.0"]
    }
  ]
}
```

Individual server versions are at:

- `registry/v0.1/servers/<name>/versions/<version>.json`
- `registry/v0.1/servers/<name>/versions/latest.json`

## 🗂️ Ignored Files

The following are automatically excluded from version control (see [.gitignore](.gitignore)):

- **Generated files**: `registry/` folder (build output)
- **Dependencies**: `node_modules/`, `yarn.lock`, `pnpm-lock.yaml`
- **IDE files**: `.vscode/`, `.idea/`, `*.swp`
- **OS files**: `.DS_Store`, `Thumbs.db`
- **Environment files**: `.env`, `.env.local`
- **Logs**: `*.log`, `npm-debug.log*`

**Note**: `package-lock.json` is intentionally **committed** for reproducible builds.

## 🤝 Contributing

1. Fork the repository
2. Add your server definition to `servers/`
3. Run `npm run validate` to check for errors
4. Submit a pull request

## 📄 License

Apache-2.0
