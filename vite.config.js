import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'ccms-db.json');

function ccmsFilePersistencePlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/db', (req, res, next) => {
      try {
        if (!fs.existsSync(DB_DIR)) {
          fs.mkdirSync(DB_DIR, { recursive: true });
        }
        if (req.method === 'GET') {
          if (fs.existsSync(DB_FILE)) {
            const raw = fs.readFileSync(DB_FILE, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(raw);
            return;
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 404;
            res.end(JSON.stringify({ ok: false, message: 'No database file yet' }));
            return;
          }
        }
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const payload = {
                ...parsed,
                updatedAt: new Date().toISOString(),
              };
              fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, file: 'data/ccms-db.json', updatedAt: payload.updatedAt }));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: String(err) }));
            }
          });
          return;
        }
      } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, error: String(err) }));
        return;
      }
      next();
    });
  };

  return {
    name: 'ccms-file-persistence',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), ccmsFilePersistencePlugin()],
  server: { host: '0.0.0.0', allowedHosts: true },
});
