const path = require('path');

function buildApiHeaders({ cacheControl, contentType = true }) {
  const headers = [
    'Access-Control-Allow-Origin: *',
    'Access-Control-Allow-Methods: GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers: Accept, Content-Type, If-None-Match, If-Modified-Since, Cache-Control',
    'Access-Control-Expose-Headers: ETag, Last-Modified, Cache-Control, Content-Length, Content-Type',
    'Access-Control-Max-Age: 86400',
  ];

  if (contentType) {
    headers.push('Content-Type: application/json; charset=utf-8');
  }

  headers.push(`Cache-Control: ${cacheControl}`);
  return headers;
}

function buildHeaderSection(pathPattern, headers) {
  const headerLines = headers.map((header) => `  ${header}`).join('\n');
  return `${pathPattern}\n${headerLines}`;
}

function buildCloudflareHeaders(registryVersion) {
  const sections = [
    buildHeaderSection('/*', [
      'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
      "Content-Security-Policy: default-src 'none'; script-src 'self' https://static.cloudflareinsights.com; script-src-elem 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'X-Content-Type-Options: nosniff',
      'X-Frame-Options: DENY',
      'Referrer-Policy: no-referrer',
      'Permissions-Policy: geolocation=(), microphone=(), camera=(), usb=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=()',
      'Cross-Origin-Opener-Policy: same-origin',
      'Cross-Origin-Resource-Policy: cross-origin',
      'X-Permitted-Cross-Domain-Policies: none',
      'Origin-Agent-Cluster: ?1',
      'X-Robots-Tag: noindex, nofollow',
    ]),
    buildHeaderSection('/index.html', ['Cache-Control: no-store']),
    buildHeaderSection(`/v${registryVersion}/index.html`, ['Cache-Control: no-store']),
    buildHeaderSection(
      `/v${registryVersion}/servers.json`,
      buildApiHeaders({ cacheControl: 'public, max-age=300', contentType: true }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/servers`,
      buildApiHeaders({ cacheControl: 'public, max-age=300', contentType: false }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/servers/index.json`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: true }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/health`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: false }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/health.json`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: true }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/ping`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: false }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/ping.json`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: true }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/version`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: false }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/version.json`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: true }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/servers/*/versions/latest.json`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: true }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/servers/*/versions/latest`,
      buildApiHeaders({ cacheControl: 'no-store', contentType: false }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/servers/*/versions/*.json`,
      buildApiHeaders({
        cacheControl: 'public, max-age=31536000, immutable',
        contentType: true,
      }),
    ),
    buildHeaderSection(
      `/v${registryVersion}/servers/*/versions/*`,
      buildApiHeaders({
        cacheControl: 'public, max-age=31536000, immutable',
        contentType: false,
      }),
    ),
  ];

  return `${sections.join('\n\n')}\n`;
}

function buildCloudflareRedirects(
  registryVersion,
  { cloudflareLeanOutput = false, additionalRedirects = [] } = {},
) {
  const baseLines = [
    `/ /v${registryVersion}/ 302`,
    `/v${registryVersion} /v${registryVersion}/ 302`,
    `/servers.json /v${registryVersion}/servers.json 302`,
    `/servers /v${registryVersion}/servers/index.json 302`,
    `/health /v${registryVersion}/health.json 302`,
    `/ping /v${registryVersion}/ping.json 302`,
    `/version /v${registryVersion}/version.json 302`,
  ];

  if (cloudflareLeanOutput) {
    baseLines.push(
      `/v${registryVersion}/health /v${registryVersion}/health.json 302`,
      `/v${registryVersion}/ping /v${registryVersion}/ping.json 302`,
      `/v${registryVersion}/version /v${registryVersion}/version.json 302`,
    );
  }

  const uniqueLines = Array.from(new Set([...baseLines, ...additionalRedirects]));
  return `${uniqueLines.join('\n')}\n`;
}

async function writeDeploymentProfileFiles({
  fs,
  outputRootDir,
  registryVersion,
  deploymentEnvironment,
  cloudflareLeanOutput = false,
  additionalCloudflareRedirects = [],
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
      buildCloudflareRedirects(registryVersion, {
        cloudflareLeanOutput,
        additionalRedirects: additionalCloudflareRedirects,
      }),
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
