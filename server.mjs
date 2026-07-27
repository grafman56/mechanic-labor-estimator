import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authorizeBasic, hostedAuthConfig } from './src/server/auth.mjs';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number.parseInt(process.env.PORT ?? '8099', 10);
const host = process.env.HOST ?? '0.0.0.0';
const authConfig = hostedAuthConfig(process.env, host === '127.0.0.1' || host === '::1');
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
  const candidate = resolve(root, normalize(requested));
  return relative(root, candidate).startsWith('..') ? null : candidate;
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (!authorizeBasic(request.headers.authorization, authConfig)) {
    response.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Mechanic Labor Planner"' });
    response.end();
    return;
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
