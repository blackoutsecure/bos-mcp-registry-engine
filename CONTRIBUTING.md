# Contributing to MCP Registry Engine

Thank you for your interest in contributing! This guide will help you add your MCP server to the registry.

## 📋 Prerequisites

- Node.js 16.0.0 or higher
- Basic understanding of JSON and semantic versioning
- An MCP server you want to register

## 🚀 Getting Started

1. **Fork the repository**

   ```bash
   gh repo fork blackoutmode/mcp-registry-engine --clone
   cd mcp-registry-engine
   ```

1. **Install dependencies**

   ```bash
   npm install
   ```

1. **Create a new branch**

   ```bash
   git checkout -b add-my-server
   ```

## 📝 Adding Your Server

### Step 1: Create Server Directory

Create a folder for your server under `servers/`:

```bash
mkdir -p servers/my-server/versions
```

### Step 2: Add Server Metadata

Create `servers/my-server/server.json`:

```json
{
  "name": "my-server",
  "displayName": "My Awesome MCP Server",
  "description": "A brief description of what your server does (max 200 chars)",
  "author": "Your Name or Organization",
  "homepage": "https://github.com/yourorg/your-mcp-server",
  "repository": "https://github.com/yourorg/your-mcp-server",
  "license": "Apache-2.0",
  "categories": ["development", "productivity"],
  "tags": ["api", "automation", "tools"]
}
```

**Required Fields:**

- `name`: Lowercase, hyphens allowed (e.g., `my-server`)
- `displayName`: Human-readable name
- `description`: What your server does
- `author`: Your name or organization
- `homepage`: Link to documentation or homepage

**Optional Fields:**

- `repository`: Source code URL
- `license`: SPDX license identifier
- `categories`: Classification (e.g., development, data, communication)
- `tags`: Search keywords

### Step 3: Add Version Information

Create `servers/my-server/versions/1.0.0.json`:

```json
{
  "version": "1.0.0",
  "releaseDate": "2024-11-20",
  "mcpVersion": "0.1",
  "runtime": "node",
  "minNodeVersion": "16.0.0",
  "installCommand": "npm install -g @yourorg/mcp-server-my-server",
  "runCommand": "mcp-server-my-server",
  "capabilities": {
    "resources": true,
    "tools": true,
    "prompts": false
  },
  "tools": [
    {
      "name": "do_something",
      "description": "Does something useful"
    }
  ],
  "resources": [
    {
      "name": "data_source",
      "description": "Access to data"
    }
  ],
  "configuration": {
    "required": ["API_KEY"],
    "optional": ["DEBUG_MODE"]
  }
}
```

**Required Fields:**

- `version`: Semantic version (e.g., `1.0.0`)
- `mcpVersion`: MCP protocol version (currently `0.1`)
- `runtime`: `node`, `python`, `docker`, or `binary`

**Runtime-Specific Fields:**

- For `node` runtime: include `minNodeVersion`
- For `python` runtime: include `minPythonVersion`

**Capability Fields:**

- `capabilities.resources`: Does your server provide resources?
- `capabilities.tools`: Does your server provide tools?
- `capabilities.prompts`: Does your server provide prompts?

**Configuration:**

- `configuration.required`: Array of required environment variables
- `configuration.optional`: Array of optional environment variables

### Step 4: Validate Your Changes

Run the validation tool:

```bash
npm run validate
```

This will check that:

- Your JSON is valid
- All required fields are present
- The version follows semantic versioning
- The name follows naming rules

### Step 5: Generate Registry

Test the full generation:

```bash
npm run generate
```

Check the output in `registry/v0.1/` to ensure your server appears correctly.

### Step 6: Commit and Push

```bash
git add servers/my-server/
git commit -m "Add my-server to registry"
git push origin add-my-server
```

### Step 7: Create Pull Request

Open a pull request on GitHub with:

- **Title**: `Add [Your Server Name] to registry`
- **Description**: Brief description of what your server does
- Link to your server's repository or documentation

## ✅ Checklist

Before submitting your PR, ensure:

- [ ] `server.json` has all required fields
- [ ] Server name uses lowercase and hyphens only
- [ ] At least one version file exists
- [ ] Version follows semantic versioning (x.y.z)
- [ ] `npm run validate` passes without errors
- [ ] `npm run generate` completes successfully
- [ ] All JSON files are properly formatted (2-space indent)
- [ ] Links in metadata are valid and accessible

## 📚 Categories

Choose appropriate categories for your server:

- `development`: Code, Git, CI/CD, testing
- `productivity`: Task management, notes, calendars
- `data`: Databases, APIs, data processing
- `communication`: Chat, email, notifications
- `ai-ml`: AI/ML models, training, inference
- `security`: Authentication, encryption, secrets
- `monitoring`: Logging, metrics, alerts
- `media`: Images, video, audio processing
- `documentation`: Docs, wikis, knowledge bases
- `collaboration`: Team tools, project management

## 🐛 Reporting Issues

If you encounter problems:

1. Check existing [issues](https://github.com/blackoutmode/mcp-registry-engine/issues)
2. Open a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs

## 💡 Questions

- Open a [discussion](https://github.com/blackoutmode/mcp-registry-engine/discussions)
- Check the [README](README.md) for documentation

## 📄 Code of Conduct

Be respectful and constructive. We're building something useful together!

## 🙏 Thank You

Your contribution helps grow the MCP ecosystem. Thank you for taking the time to add your server!
