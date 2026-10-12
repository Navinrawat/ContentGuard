import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Serves /api/* in dev from server/analyze.ts so `npm run dev` runs the full stack. */
function apiPlugin(): Plugin {
  return {
    name: 'contentguard-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const mod = await server.ssrLoadModule('/server/analyze.ts');
          if (!(await mod.handleApi(req, res))) next();
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose server-only settings from .env to the dev middleware (never to the browser bundle).
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) {
    if ((k.startsWith('ANTHROPIC_') || k.startsWith('CONTENTGUARD_')) && v && !process.env[k]) process.env[k] = v;
  }
  return {
    plugins: [react(), apiPlugin()],
    server: { port: 5173 },
  };
});
