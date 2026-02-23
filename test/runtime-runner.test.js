const { expect } = require('chai');
const {
  buildStartupConfig,
  logStartup,
  runAction,
  runApp,
  handleRunError,
} = require('../src/lib/runtime-runner');

describe('runtime-runner', () => {
  it('buildStartupConfig includes expected runtime fields', () => {
    const runtimeConfig = {
      actionType: 'generate_registry',
      source: './servers',
      output: './dist',
      publicDirectoryName: 'public',
      deploymentEnvironment: 'github',
      cloudflareLeanOutput: true,
      configFile: './config.json',
      logLevel: 'debug',
      uploadArtifacts: true,
      artifactName: 'mcp-registry-files',
      artifactRetentionDays: 1,
      commitGeneratedArtifacts: true,
      artifactCommitterName: 'bot',
      artifactCommitterEmail: 'bot@example.com',
    };

    const startup = buildStartupConfig(runtimeConfig);

    expect(startup).to.deep.equal({
      actionType: 'generate_registry',
      source: './servers',
      output: './dist',
      publicDirectoryName: 'public',
      deploymentEnvironment: 'github',
      cloudflareLeanOutput: true,
      configFile: './config.json',
      logLevel: 'debug',
      uploadArtifacts: true,
      artifactName: 'mcp-registry-files',
      artifactRetentionDays: 1,
      commitGeneratedArtifacts: true,
    });
  });

  it('logStartup logs info and debug output', () => {
    const infoMessages = [];
    const debugMessages = [];
    const logger = {
      level: 'debug',
      info: (...args) => infoMessages.push(args.join(' ')),
      debug: (...args) => debugMessages.push(args),
      warn: () => {},
      error: () => {},
    };

    const runtimeConfig = {
      actionType: 'generate_registry',
      source: './servers',
      output: './dist',
      publicDirectoryName: 'public',
      deploymentEnvironment: 'github',
      cloudflareLeanOutput: true,
      configFile: undefined,
      logLevel: 'debug',
      uploadArtifacts: true,
      artifactName: 'mcp-registry-files',
      artifactRetentionDays: 1,
      commitGeneratedArtifacts: true,
      artifactCommitterName: 'bot',
      artifactCommitterEmail: 'bot@example.com',
    };

    logStartup({ logger, appVersion: '1.2.3', runtimeConfig });

    expect(infoMessages[0]).to.equal(
      'Running bos-mcp-registry-engine v1.2.3 (log level: debug)',
    );
    expect(debugMessages).to.have.length(1);
    expect(debugMessages[0][0]).to.equal('Runtime configuration');
    expect(debugMessages[0][1]).to.have.property(
      'artifactCommitterName',
      'bot',
    );
  });

  it('runAction dispatches generate_registry and runs commit/upload', async () => {
    const calls = [];
    const deps = {
      runRegistryGeneration: async (options) => {
        calls.push({ name: 'runRegistryGeneration', options });
        return { outputRootDir: '/tmp/dist/public' };
      },
      generateServerManifest: async () => {
        calls.push({ name: 'generateServerManifest' });
      },
      validateServerManifest: async () => {
        calls.push({ name: 'validateServerManifest' });
      },
      commitGeneratedArtifacts: async (options) => {
        calls.push({ name: 'commitGeneratedArtifacts', options });
      },
      uploadArtifacts: async (options) => {
        calls.push({ name: 'uploadArtifacts', options });
      },
    };

    const logger = {
      level: 'info',
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    const runtimeConfig = {
      actionType: 'generate_registry',
      source: './servers',
      output: './dist',
      publicDirectoryName: 'public',
      registryVersion: '0.1',
      deploymentEnvironment: 'github',
      cloudflareLeanOutput: true,
      configFile: undefined,
      externalRepositories: [],
      commitGeneratedArtifacts: true,
      artifactCommitterName: 'bot',
      artifactCommitterEmail: 'bot@example.com',
      uploadArtifacts: true,
      artifactName: 'mcp-registry-files',
      artifactRetentionDays: 1,
    };

    await runAction(runtimeConfig, logger, deps);

    expect(calls.map((item) => item.name)).to.deep.equal([
      'runRegistryGeneration',
      'commitGeneratedArtifacts',
      'uploadArtifacts',
    ]);
  });

  it('runAction dispatches validate_registry without commit/upload', async () => {
    const calls = [];
    const deps = {
      runRegistryGeneration: async () => {
        calls.push('runRegistryGeneration');
        return { outputRootDir: '/tmp/dist/public' };
      },
      generateServerManifest: async () => {},
      validateServerManifest: async () => {},
      commitGeneratedArtifacts: async () => {
        calls.push('commitGeneratedArtifacts');
      },
      uploadArtifacts: async () => {
        calls.push('uploadArtifacts');
      },
    };

    const logger = {
      level: 'info',
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    await runAction(
      {
        actionType: 'validate_registry',
        source: './servers',
        output: './dist',
        publicDirectoryName: 'public',
        registryVersion: '0.1',
        deploymentEnvironment: 'github',
        cloudflareLeanOutput: true,
        configFile: undefined,
        externalRepositories: [],
      },
      logger,
      deps,
    );

    expect(calls).to.deep.equal(['runRegistryGeneration']);
  });

  it('runAction dispatches server manifest actions', async () => {
    const calls = [];
    const deps = {
      runRegistryGeneration: async () => {},
      generateServerManifest: async () => {
        calls.push('generateServerManifest');
      },
      validateServerManifest: async () => {
        calls.push('validateServerManifest');
      },
      commitGeneratedArtifacts: async () => {},
      uploadArtifacts: async () => {},
    };

    const logger = {
      level: 'info',
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    await runAction(
      {
        actionType: 'generate_server_manifest',
        source: './servers',
        serverManifest: { serverSlug: 'example' },
      },
      logger,
      deps,
    );

    await runAction(
      {
        actionType: 'validate_server_manifest',
        source: './servers',
        serverManifest: { serverSlug: 'example' },
      },
      logger,
      deps,
    );

    expect(calls).to.deep.equal([
      'generateServerManifest',
      'validateServerManifest',
    ]);
  });

  it('runAction throws for unsupported action type', async () => {
    const logger = {
      level: 'info',
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    let thrownError;
    try {
      await runAction(
        {
          actionType: 'unknown',
          source: './servers',
        },
        logger,
        {
          runRegistryGeneration: async () => {},
          generateServerManifest: async () => {},
          validateServerManifest: async () => {},
          commitGeneratedArtifacts: async () => {},
          uploadArtifacts: async () => {},
        },
      );
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).to.be.instanceOf(Error);
    expect(thrownError.message).to.equal('Unsupported action type: unknown');
  });

  it('runApp uses injected dependencies for config, logger, and dispatch', async () => {
    const calls = [];
    const injectedLogger = {
      level: 'debug',
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    const dependencies = {
      getRuntimeConfig: () => ({
        actionType: 'validate_registry',
        logLevel: 'debug',
        source: './servers',
        output: './dist',
        publicDirectoryName: 'public',
        registryVersion: '0.1',
        deploymentEnvironment: 'github',
        cloudflareLeanOutput: true,
        configFile: undefined,
        externalRepositories: [],
      }),
      createLogger: () => {
        calls.push('createLogger');
        return injectedLogger;
      },
      runRegistryGeneration: async () => {
        calls.push('runRegistryGeneration');
        return { outputRootDir: '/tmp/dist/public' };
      },
      generateServerManifest: async () => {
        calls.push('generateServerManifest');
      },
      validateServerManifest: async () => {
        calls.push('validateServerManifest');
      },
      commitGeneratedArtifacts: async () => {
        calls.push('commitGeneratedArtifacts');
      },
      uploadArtifacts: async () => {
        calls.push('uploadArtifacts');
      },
    };

    await runApp({
      core: { getInput: () => '' },
      appVersion: '1.0.0',
      argv: [],
      env: { GITHUB_ACTIONS: 'false' },
      dependencies,
    });

    expect(calls).to.deep.equal(['createLogger', 'runRegistryGeneration']);
  });

  it('handleRunError sets failure in GitHub Actions mode', () => {
    const failedMessages = [];
    const core = {
      setFailed: (message) => failedMessages.push(message),
    };

    handleRunError({
      error: new Error('boom'),
      core,
      env: { GITHUB_ACTIONS: 'true' },
    });

    expect(failedMessages).to.deep.equal(['boom']);
  });
});
