import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import { createDiscussionSummary, toPublicOpenAIError } from './server/openai';
import { verifyFirebaseToken } from './server/auth';

function localApiPlugin(apiKey: string | undefined, model: string | undefined, projectId: string | undefined): Plugin {
  return {
    name: 'bookmoa-local-api',
    configureServer(server) {
      server.middlewares.use('/api/summarize', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 20_000) req.destroy();
        });
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            await verifyFirebaseToken(req.headers.authorization, projectId);
            const payload = JSON.parse(body || '{}');
            const summary = await createDiscussionSummary(payload, { apiKey, model });
            res.end(JSON.stringify({ summary }));
          } catch (error) {
            if (error instanceof Error && error.message === 'UNAUTHORIZED') {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: '로그인이 필요합니다.' }));
              return;
            }
            const publicError = toPublicOpenAIError(error);
            res.statusCode = publicError.status;
            res.end(JSON.stringify({ error: publicError.message }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      localApiPlugin(env.OPENAI_API_KEY, env.OPENAI_MODEL, env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
