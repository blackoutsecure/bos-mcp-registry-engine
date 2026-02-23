const { expect } = require('chai');
const { getRuntimeConfig } = require('../src/lib/project-config');

describe('project-config', () => {
  const core = {
    getInput: () => '',
  };

  it('uses cli args outside GitHub Actions', () => {
    const config = getRuntimeConfig(
      core,
      [
        '--action-type',
        'validate_registry',
        '--source',
        './custom-servers',
        '--output',
        './build-registry',
        '--config',
        './custom-config.json',
      ],
      { GITHUB_ACTIONS: 'false' },
    );

    expect(config.actionType).to.equal('validate_registry');
    expect(config.source).to.equal('./custom-servers');
    expect(config.output).to.equal('./build-registry');
    expect(config.registryVersion).to.equal('0.1');
    expect(config.configFile).to.equal('./custom-config.json');
    expect(config.logLevel).to.equal('info');
  });

  it('uses action inputs inside GitHub Actions', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          action_type: 'validate_registry',
          log_level: 'debug',
          source: './action-servers',
          output: 'site',
          output_directory: 'dist',
          deployment_environment: 'cloudflare',
          config: './config/action-config.json',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], { GITHUB_ACTIONS: 'true' });

    expect(config.actionType).to.equal('validate_registry');
    expect(config.source).to.equal('./action-servers');
    expect(config.output).to.equal('dist');
    expect(config.publicDirectoryName).to.equal('site');
    expect(config.registryVersion).to.equal('0.1');
    expect(config.deploymentEnvironment).to.equal('cloudflare');
    expect(config.logLevel).to.equal('debug');
    expect(config.configFile).to.equal('./config/action-config.json');
    expect(config.externalRepositories).to.equal(undefined);
  });

  it('supports output_directory and output together in GitHub Actions', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          action_type: 'generate_registry',
          output_directory: './release-dist',
          output: 'registry-public',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], { GITHUB_ACTIONS: 'true' });

    expect(config.output).to.equal('./release-dist');
    expect(config.publicDirectoryName).to.equal('registry-public');
  });

  it('uses DEPLOY_DIR fallback for output base path in GitHub Actions', () => {
    const config = getRuntimeConfig(
      {
        getInput(name) {
          const values = {
            action_type: 'generate_registry',
          };

          return values[name] || '';
        },
      },
      [],
      {
        GITHUB_ACTIONS: 'true',
        DEPLOY_DIR: './deploy-output',
      },
    );

    expect(config.output).to.equal('./deploy-output');
  });

  it('fails for invalid external repositories env JSON', () => {
    expect(() =>
      getRuntimeConfig(core, [], {
        GITHUB_ACTIONS: 'true',
        MCP_REGISTRY_EXTERNAL_REPOSITORIES: '{invalid-json}',
      }),
    ).to.throw('Invalid external repositories value');
  });

  it('fails for invalid deployment environment', () => {
    expect(() =>
      getRuntimeConfig(core, ['--deployment-environment', 'invalid'], {
        GITHUB_ACTIONS: 'false',
      }),
    ).to.throw('Invalid deployment environment selected: invalid');
  });

  it('fails for invalid action type', () => {
    expect(() =>
      getRuntimeConfig(core, ['--action-type', 'publish'], {
        GITHUB_ACTIONS: 'false',
      }),
    ).to.throw('Invalid action type selected: publish');
  });

  it('fails for legacy action type aliases', () => {
    expect(() =>
      getRuntimeConfig(core, ['--action-type', 'validate'], {
        GITHUB_ACTIONS: 'false',
      }),
    ).to.throw('Invalid action type selected: validate');
  });

  it('uses MCP_REGISTRY_CONFIG when provided', () => {
    const config = getRuntimeConfig(core, [], {
      GITHUB_ACTIONS: 'false',
      MCP_REGISTRY_CONFIG: './config/registry.settings.json',
    });

    expect(config.configFile).to.equal('./config/registry.settings.json');
  });

  it('supports none deployment environment', () => {
    const config = getRuntimeConfig(
      core,
      ['--deployment-environment', 'none'],
      {
        GITHUB_ACTIONS: 'false',
      },
    );

    expect(config.deploymentEnvironment).to.equal('none');
  });

  it('supports cloudflare lean output from cli', () => {
    const config = getRuntimeConfig(
      core,
      ['--cloudflare-lean-output', 'true'],
      {
        GITHUB_ACTIONS: 'false',
      },
    );

    expect(config.cloudflareLeanOutput).to.equal(true);
  });

  it('supports cloudflare lean output from action input', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          cloudflare_lean_output: 'true',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], {
      GITHUB_ACTIONS: 'true',
    });

    expect(config.cloudflareLeanOutput).to.equal(true);
  });

  it('supports public directory override from cli', () => {
    const config = getRuntimeConfig(core, ['--public-directory', 'site'], {
      GITHUB_ACTIONS: 'false',
    });

    expect(config.publicDirectoryName).to.equal('site');
  });

  it('uses output input as public directory name in GitHub Actions', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          output: 'registry-site',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], {
      GITHUB_ACTIONS: 'true',
    });

    expect(config.output).to.equal('dist');
    expect(config.publicDirectoryName).to.equal('registry-site');
  });

  it('normalizes output input when it includes dist prefix in GitHub Actions', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          output: 'dist/public',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], {
      GITHUB_ACTIONS: 'true',
    });

    expect(config.output).to.equal('dist');
    expect(config.publicDirectoryName).to.equal('public');
  });

  it('normalizes output input with leading ./ in GitHub Actions', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          output: './dist/public',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], {
      GITHUB_ACTIONS: 'true',
    });

    expect(config.output).to.equal('dist');
    expect(config.publicDirectoryName).to.equal('public');
  });

  it('supports log level from cli', () => {
    const config = getRuntimeConfig(
      core,
      ['--action-type', 'generate_registry', '--log-level', 'warn'],
      {
        GITHUB_ACTIONS: 'false',
      },
    );

    expect(config.logLevel).to.equal('warn');
  });

  it('fails for invalid log level', () => {
    expect(() =>
      getRuntimeConfig(core, ['--action-type', 'generate_registry'], {
        GITHUB_ACTIONS: 'true',
        MCP_REGISTRY_LOG_LEVEL: 'trace',
      }),
    ).to.throw('Invalid log level selected: trace');
  });

  it('maps server manifest generation inputs', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          action_type: 'generate_server_manifest',
          server_slug: 'example',
          server_name: 'io.example/example',
          server_title: 'Example',
          server_description: 'Example MCP server',
          server_website_url: 'https://example.com',
          repository_url: 'https://github.com/example/example',
          repository_source: 'github',
          repository_subfolder: 'mcp',
          server_version: '1.2.3',
          release_date: '2026-01-15',
          package_registry_type: 'npm',
          package_identifier: '@example/mcp-server',
          package_transport_type: 'stdio',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], { GITHUB_ACTIONS: 'true' });

    expect(config.actionType).to.equal('generate_server_manifest');
    expect(config.serverManifest).to.deep.equal({
      serverSlug: 'example',
      serverName: 'io.example/example',
      serverTitle: 'Example',
      serverDescription: 'Example MCP server',
      serverWebsiteUrl: 'https://example.com',
      repositoryUrl: 'https://github.com/example/example',
      repositorySource: 'github',
      repositorySubfolder: 'mcp',
      serverVersion: '1.2.3',
      releaseDate: '2026-01-15',
      packageRegistryType: 'npm',
      packageIdentifier: '@example/mcp-server',
      packageTransportType: 'stdio',
    });
  });

  it('maps artifact upload inputs in GitHub Actions runtime', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          action_type: 'generate_registry',
          upload_artifacts: 'true',
          artifact_name: 'registry-release-files',
          artifact_retention_days: '5',
          commit_generated_artifacts: 'false',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], { GITHUB_ACTIONS: 'true' });

    expect(config.uploadArtifacts).to.equal(true);
    expect(config.artifactName).to.equal('registry-release-files');
    expect(config.artifactRetentionDays).to.equal(5);
    expect(config.commitGeneratedArtifacts).to.equal(false);
  });

  it('uses artifact upload defaults when not provided', () => {
    const config = getRuntimeConfig(core, [], { GITHUB_ACTIONS: 'true' });

    expect(config.uploadArtifacts).to.equal(true);
    expect(config.cloudflareLeanOutput).to.equal(true);
    expect(config.artifactName).to.equal('mcp-registry-files');
    expect(config.artifactRetentionDays).to.equal(1);
    expect(config.commitGeneratedArtifacts).to.equal(true);
    expect(config.artifactCommitterName).to.equal('github-actions[bot]');
    expect(config.artifactCommitterEmail).to.equal(
      '41898282+github-actions[bot]@users.noreply.github.com',
    );
  });

  it('supports committer env overrides', () => {
    const config = getRuntimeConfig(core, [], {
      GITHUB_ACTIONS: 'true',
      MCP_REGISTRY_ARTIFACT_COMMITTER_NAME: 'registry-bot',
      MCP_REGISTRY_ARTIFACT_COMMITTER_EMAIL: 'registry-bot@example.com',
    });

    expect(config.artifactCommitterName).to.equal('registry-bot');
    expect(config.artifactCommitterEmail).to.equal('registry-bot@example.com');
  });

  it('supports committer overrides from GitHub Action inputs', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          action_type: 'generate_registry',
          artifact_committer_name: 'custom-bot',
          artifact_committer_email: 'custom-bot@example.com',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], { GITHUB_ACTIONS: 'true' });

    expect(config.artifactCommitterName).to.equal('custom-bot');
    expect(config.artifactCommitterEmail).to.equal('custom-bot@example.com');
  });

  it('fails for invalid artifact retention days', () => {
    expect(() =>
      getRuntimeConfig(
        {
          getInput(name) {
            const values = {
              action_type: 'generate_registry',
              artifact_retention_days: '0',
            };

            return values[name] || '';
          },
        },
        [],
        { GITHUB_ACTIONS: 'true' },
      ),
    ).to.throw('Invalid artifact retention days');
  });

  it('fails when artifact retention days exceed supported maximum', () => {
    expect(() =>
      getRuntimeConfig(
        {
          getInput(name) {
            const values = {
              action_type: 'generate_registry',
              artifact_retention_days: '401',
            };

            return values[name] || '';
          },
        },
        [],
        { GITHUB_ACTIONS: 'true' },
      ),
    ).to.throw('Invalid artifact retention days');
  });

  it('fails when commit_generated_artifacts is enabled and upload_artifacts is disabled', () => {
    expect(() =>
      getRuntimeConfig(
        {
          getInput(name) {
            const values = {
              action_type: 'generate_registry',
              upload_artifacts: 'false',
              commit_generated_artifacts: 'true',
            };

            return values[name] || '';
          },
        },
        [],
        { GITHUB_ACTIONS: 'true' },
      ),
    ).to.throw(
      'Invalid configuration: commit_generated_artifacts requires upload_artifacts=true for generate_registry.',
    );
  });
});
