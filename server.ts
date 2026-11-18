import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initDatabase } from './src/server/db.ts';
import { createApiRouter } from './src/server/routes.ts';

async function startServer() {
  initDatabase();

  const app = express();
  app.set('trust proxy', 1);
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '4mb' }));
  app.use(cookieParser());

  // Serve uploaded CMS & profile images safely
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  app.use('/uploads', express.static(uploadsDir, { fallthrough: true }));

  // Mount API routes
  app.use('/api', createApiRouter());

  // Error handler for multer & JSON errors
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Bad request' });
    }
    next();
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EDUNEXA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
