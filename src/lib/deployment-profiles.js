const path = require('path');

function buildCloudflareHeaders(registryVersion) {
  return `/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: geolocation=(), microphone=(), camera=(), usb=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: cross-origin
  X-Permitted-Cross-Domain-Policies: none
  Origin-Agent-Cluster: ?1

/index.html
  Cache-Control: no-store

/v${registryVersion}/index.html
  Cache-Control: no-store

/v${registryVersion}/servers.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: public, max-age=300

/v${registryVersion}/servers
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: public, max-age=300

/v${registryVersion}/servers/index.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v0/servers
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v0/servers/index.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/health
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/health.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/ping
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/ping.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/version
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/version.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/servers/*/versions/latest.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/servers/*/versions/latest
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: no-store

/v${registryVersion}/servers/*/versions/*.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: public, max-age=31536000, immutable

/v${registryVersion}/servers/*/versions/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, HEAD, OPTIONS
  Access-Control-Allow-Headers: Content-Type, If-Modified-Since, Cache-Control
  Cache-Control: public, max-age=31536000, immutable
`;
}

function buildCloudflareRedirects(registryVersion) {
  return `/ /v${registryVersion}/ 302
/v${registryVersion} /v${registryVersion}/ 302
/servers.json /v${registryVersion}/servers.json 302
/servers /v${registryVersion}/servers/index.json 302
/v0/servers /v${registryVersion}/servers/index.json 302
/health /v${registryVersion}/health.json 302
/ping /v${registryVersion}/ping.json 302
/version /v${registryVersion}/version.json 302
`;
}

async function writeDeploymentProfileFiles({
  fs,
  outputRootDir,
  registryVersion,
  deploymentEnvironment,
}) {
  const cloudflareHeadersPath = path.join(outputRootDir, '_headers');
  const cloudflareRedirectsPath = path.join(outputRootDir, '_redirects');
  const noJekyllPath = path.join(outputRootDir, '.nojekyll');

  if (deploymentEnvironment === 'cloudflare') {
    await fs.writeFile(
      cloudflareHeadersPath,
      buildCloudflareHeaders(registryVersion),
      'utf8',
    );
    await fs.writeFile(
      cloudflareRedirectsPath,
      buildCloudflareRedirects(registryVersion),
      'utf8',
    );
    await fs.remove(noJekyllPath);

    return {
      cloudflareHeadersPath,
      cloudflareRedirectsPath,
      noJekyllPath,
    };
  }

  if (deploymentEnvironment === 'github') {
    await fs.writeFile(noJekyllPath, '', 'utf8');
    await Promise.all([
      fs.remove(cloudflareHeadersPath),
      fs.remove(cloudflareRedirectsPath),
    ]);

    return {
      cloudflareHeadersPath,
      cloudflareRedirectsPath,
      noJekyllPath,
    };
  }

  await Promise.all([
    fs.remove(noJekyllPath),
    fs.remove(cloudflareHeadersPath),
    fs.remove(cloudflareRedirectsPath),
  ]);

  return {
    cloudflareHeadersPath,
    cloudflareRedirectsPath,
    noJekyllPath,
  };
}

module.exports = {
  writeDeploymentProfileFiles,
};
