// Production server: serves the built app from dist/ and the /api routes.
// Run `npm run build` first, then `npm start`.

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { handleApi, llmEnabled } from './analyze';

const PORT = Number(process.env.PORT || 8787);
const DIST = resolve('dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

createServer(async (req, res) => {
  if (await handleApi(req, res)) return;

  // Static files, with SPA fallback to index.html. normalize() + prefix check blocks path traversal.
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = normalize(join(DIST, urlPath));
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`ContentGuard AI on http://localhost:${PORT} (LLM review: ${llmEnabled() ? 'on' : 'off'})`);
});
