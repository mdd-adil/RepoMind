import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/index.js';
import reposRouter from './routes/repos.js';
import graphRouter from './routes/graph.js';
import modulesRouter from './routes/modules.js';
import ragRouter from './routes/rag.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/repos', reposRouter);
app.use('/api/repos', graphRouter);
app.use('/api/repos', ragRouter);
app.use('/api/modules', modulesRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  await initDb();
  const server = app.listen(PORT, () => {
    console.log(`🚀 Repo Visualizer Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = Number(PORT) + 1;
      console.warn(`⚠️ Port ${PORT} is in use. Trying fallback port ${fallbackPort}...`);
      app.listen(fallbackPort, () => {
        console.log(`🚀 Repo Visualizer Server running on http://localhost:${fallbackPort}`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
