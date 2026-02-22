const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

module.exports = {
  PROJECT_ROOT,
  SCHEMAS_DIR: path.join(PROJECT_ROOT, 'src', 'schemas'),
  SERVERS_DIR: path.join(PROJECT_ROOT, 'servers'),
};
