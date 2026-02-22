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
        '--source',
        './custom-servers',
        '--output',
        './build-registry',
        '--config',
        './custom-config.json',
        '--validate-only',
      ],
      { GITHUB_ACTIONS: 'false' },
    );

    expect(config.source).to.equal('./custom-servers');
    expect(config.output).to.equal('./build-registry');
    expect(config.registryVersion).to.equal('0.1');
    expect(config.configFile).to.equal('./custom-config.json');
    expect(config.validateOnly).to.equal(true);
  });

  it('uses action inputs inside GitHub Actions', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          source: './action-servers',
          output: './action-registry',
          public_directory: 'site',
          deployment_environment: 'cloudflare',
          config: './config/action-config.json',
          external_repositories: '["./extra-servers"]',
        };

        return values[name] || '';
      },
    };

    const config = getRuntimeConfig(actionCore, [], { GITHUB_ACTIONS: 'true' });

    expect(config.source).to.equal('./action-servers');
    expect(config.output).to.equal('./action-registry');
    expect(config.publicDirectoryName).to.equal('site');
    expect(config.registryVersion).to.equal('0.1');
    expect(config.deploymentEnvironment).to.equal('cloudflare');
    expect(config.configFile).to.equal('./config/action-config.json');
    expect(config.externalRepositories).to.deep.equal(['./extra-servers']);
    expect(config.validateOnly).to.equal(false);
  });

  it('fails for invalid external_repositories JSON', () => {
    const actionCore = {
      getInput(name) {
        const values = {
          external_repositories: '{invalid-json}',
        };

        return values[name] || '';
      },
    };

    expect(() =>
      getRuntimeConfig(actionCore, [], { GITHUB_ACTIONS: 'true' }),
    ).to.throw('Invalid external repositories value');
  });

  it('fails for invalid deployment environment', () => {
    expect(() =>
      getRuntimeConfig(core, ['--deployment-environment', 'invalid'], {
        GITHUB_ACTIONS: 'false',
      }),
    ).to.throw('Invalid deployment environment selected: invalid');
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

  it('supports public directory override from cli', () => {
    const config = getRuntimeConfig(core, ['--public-directory', 'site'], {
      GITHUB_ACTIONS: 'false',
    });

    expect(config.publicDirectoryName).to.equal('site');
  });
});
