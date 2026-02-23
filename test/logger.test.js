const { expect } = require('chai');
const {
  assertValidLogLevel,
  normalizeLogLevel,
  SUPPORTED_LOG_LEVELS,
} = require('../src/lib/logger');

describe('logger', () => {
  it('supports expected log levels', () => {
    expect(SUPPORTED_LOG_LEVELS).to.deep.equal([
      'debug',
      'info',
      'warn',
      'error',
    ]);
  });

  it('normalizes log levels', () => {
    expect(normalizeLogLevel(' DEBUG ')).to.equal('debug');
    expect(normalizeLogLevel(undefined, 'info')).to.equal('info');
  });

  it('fails for unsupported log levels', () => {
    expect(() => assertValidLogLevel('trace')).to.throw(
      'Invalid log level selected: trace',
    );
  });
});
