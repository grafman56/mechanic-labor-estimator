import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorizeBasic, hostedAuthConfig } from './src/server/auth.mjs';
import { FixedWindowRateLimiter, rateLimitConfig } from './src/server/rate-limit.mjs';
import { decodeVinAndFindManuals } from './src/server/vin-lookup.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number.parseInt(process.env.PORT ?? '8099', 10);
const host = process.env.HOST ?? '0.0.0.0';
const authConfig = hostedAuthConfig(process.env, host === '127.0.0.1' || host === '::1');
const rateLimiter = new FixedWindowRateLimiter(rateLimitConfig(process.env));
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

function staticPath(requestUrl) {
  const pathname = new URL(requestUrl, 'http://localhost').pathname;
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!requested || requested.split('/').some((part) => part.startsWith('.'))) return null;
  if (!mimeTypes.has(extname(requested))) return null;
  const candidate = resolve(root, normalize(requested));
  return relative(root, candidate).startsWith('..') ? null : candidate;
}

function isApiRequest(requestUrl) {
  return new URL(requestUrl, 'http://localhost').pathname.startsWith('/api/');
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (!authorizeBasic(request.headers.authorization, authConfig)) {
    response.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Mechanic Labor Planner"' });
    response.end();
    return;
  }
  if (isApiRequest(request.url)) {
    const result = rateLimiter.check(request.socket.remoteAddress ?? 'unknown');
    if (!result.allowed) {
      response.writeHead(429, { 'Retry-After': String(result.retryAfterSeconds) });
      response.end();
      return;
    }
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' });
      response.end();
      return;
    }
    const apiUrl = new URL(request.url, 'http://localhost');
    if (apiUrl.pathname === '/api/vin-manuals') {
      try {
        sendJson(response, 200, await decodeVinAndFindManuals(apiUrl.searchParams.get('vin')));
      } catch (error) {
        sendJson(response, 400, { error: error.message });
      }
      return;
    }
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  const path = staticPath(request.url);
  if (!path) {
    response.writeHead(404);
    response.end();
    return;
  }
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': mimeTypes.get(extname(path)) ?? 'application/octet-stream' });
    if (request.method === 'HEAD') response.end();
    else createReadStream(path).pipe(response);
  } catch {
    response.writeHead(404);
    response.end();
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Mechanic Labor Planner listening on ${port}\n`);
});
