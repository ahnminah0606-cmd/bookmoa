import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import { createDiscussionSummary, toPublicOpenAIError } from './server/openai';
import { verifyFirebaseToken } from './server/auth';
import { findBookQuotes, quoteError } from './server/bookQuotes';
import { analyzeFlowImport, flowImportError, MAX_IMPORT_BYTES } from './server/flowImport';

function localApiPlugin(apiKey: string | undefined, model: string | undefined, projectId: string | undefined, quoteModel?: string, importModel?: string): Plugin {
  return {
    name: 'bookmoa-local-api',
    configureServer(server) {
      server.middlewares.use('/api/flow-import', (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        if (req.method !== 'POST') {
          res.statusCode = 405; res.setHeader('Allow', 'POST');
          res.end(JSON.stringify({ error: 'Method not allowed' })); return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        let tooLarge = false;
        req.on('data', chunk => {
          size += chunk.length;
          if (size > MAX_IMPORT_BYTES + 50_000) {
            if (!tooLarge) { tooLarge = true; res.statusCode = 413; res.end(JSON.stringify({ error: '자료를 나누어 올려 주세요.' })); }
          } else chunks.push(Buffer.from(chunk));
        });
        req.on('end', async () => {
          if (tooLarge) return;
          try {
            await verifyFirebaseToken(req.headers.authorization, projectId);
            const result = await analyzeFlowImport(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'), { apiKey, model: importModel });
            res.end(JSON.stringify(result));
          } catch (error) {
            const failure = flowImportError(error);
            res.statusCode = failure.status; res.end(JSON.stringify({ error: failure.error }));
          }
        });
      });
      server.middlewares.use('/api/quotes', (req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Allow', 'POST');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; if (body.length > 2000) req.destroy(); });
        req.on('end', async () => {
          try {
            await verifyFirebaseToken(req.headers.authorization, projectId);
            const quotes = await findBookQuotes(JSON.parse(body || '{}'), { apiKey, model: quoteModel });
            res.end(JSON.stringify({ quotes }));
          } catch (error) {
            const failure = quoteError(error);
            res.statusCode = failure.status;
            res.end(JSON.stringify({ error: failure.error }));
          }
        });
      });
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
      localApiPlugin(env.OPENAI_API_KEY, env.OPENAI_MODEL, env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID, env.OPENAI_QUOTE_MODEL, env.OPENAI_IMPORT_MODEL),
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
