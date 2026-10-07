import * as dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

import { app } from './src/app.ts';
import { seedDatabaseIfEmpty } from './src/db/seed.ts';
import { pool, checkDatabaseConnection } from './src/db/index.ts';

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // 1. Startup Lifecycle: Database Connectivity Verification (Pre-Flight)
  console.log('[Gym Manager] Initializing application startup lifecycle...');
  const dbHealth = await checkDatabaseConnection();

  let dbReady = false;
  if (dbHealth.ok) {
    console.log(`[Gym Manager] Database connected successfully (${dbHealth.summary.host}:${dbHealth.summary.port}/${dbHealth.summary.database}) [${dbHealth.latencyMs}ms]`);
    dbReady = true;

    // 2. Safe Idempotent Seed
    try {
      await seedDatabaseIfEmpty();
    } catch (seedErr: any) {
      console.warn('[Gym Manager] Initial seed deferred or encountered non-fatal error:', seedErr?.message || seedErr);
    }
  } else {
    console.error('\n================================================================');
    console.error('❌ [Gym Manager] DATABASE PRE-FLIGHT CONNECTION FAILED');
    console.error('================================================================');
    console.error(`Target Host:     ${dbHealth.summary.host}`);
    console.error(`Target Port:     ${dbHealth.summary.port}`);
    console.error(`Target Database: ${dbHealth.summary.database}`);
    console.error(`Target User:     ${dbHealth.summary.user}`);
    console.error(`Connection Mode: ${dbHealth.summary.mode}`);
    console.error(`Error Code:      ${dbHealth.error?.code}`);
    console.error(`Error Details:   ${dbHealth.error?.message}`);
    console.error('\n[Actionable Resolution]:');
    console.error(dbHealth.error?.guidance);
    console.error('================================================================\n');

    if (process.env.NODE_ENV === 'production' || process.env.STRICT_DB_STARTUP === 'true') {
      console.error('[Gym Manager] STRICT_DB_STARTUP or production mode active. Terminating startup.');
      process.exit(1);
    }
  }

  let vite: any = null;

  // 3. Create HTTP Server around Express App
  const server = http.createServer(app);

  // 4. Vite Middleware for Frontend Serving (with HMR attached to server)
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }));

    app.all('/assets/*.css', (req, res) => {
      res.status(404).type('text/css').send('/* CSS asset not found */');
    });
    app.all('/assets/*.js', (req, res) => {
      res.status(404).type('application/javascript').send('/* JS asset not found */');
    });
    app.all('/assets/*', (req, res) => {
      res.status(404).type('text/plain').send('Asset not found');
    });

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. Server error handling (EADDRINUSE and startup errors)
  server.on('error', async (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ [Gym Manager] PORT CONFLICT: Port ${PORT} is already in use by another process.`);
      console.error(`   To free port ${PORT}, identify the process using:`);
      console.error(`     netstat -ano | findstr :${PORT}`);
      console.error(`   and terminate the old process before restarting.\n`);
    } else {
      console.error('❌ [Gym Manager] Server startup error:', err);
    }
    if (vite) {
      try { await vite.close(); } catch (_) {}
    }
    try { await pool.end(); } catch (_) {}
    process.exit(1);
  });

  // 6. Start HTTP Server and Report Status
  server.listen(PORT, '0.0.0.0', () => {
    if (dbReady) {
      console.log(`🚀 [Gym Manager] Server READY and listening on port ${PORT}`);
      console.log(`   • Web App:       http://localhost:${PORT}`);
      console.log(`   • Process Health: http://localhost:${PORT}/api/health`);
      console.log(`   • DB Health:      http://localhost:${PORT}/api/health/db (Connected)`);
    } else {
      console.warn(`⚠️  [Gym Manager] Server listening on port ${PORT} in DEGRADED mode (Database unavailable)`);
      console.warn(`   • Process Health: http://localhost:${PORT}/api/health (OK)`);
      console.warn(`   • DB Health:      http://localhost:${PORT}/api/health/db (503 Service Unavailable)`);
      console.warn(`   • Run proxy/database and restart server for full functionality.`);
    }
  });

  // 7. Graceful shutdown handler
  let isShuttingDown = false;
  const shutdown = async (signal?: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[Gym Manager] Received ${signal || 'shutdown signal'}. Closing server gracefully...`);

    // Close Vite dev watchers and WebSocket server
    if (vite) {
      try {
        await vite.close();
      } catch (e) {
        // ignore
      }
    }

    // Close HTTP Server (stops accepting new connections)
    server.close(async () => {
      console.log('[Gym Manager] HTTP server closed.');
      try {
        await pool.end();
        console.log('[Gym Manager] Database pool drained.');
      } catch (e) {
        // ignore
      }
      process.exit(0);
    });

    // Force exit timeout if lingering keep-alive sockets remain
    setTimeout(() => {
      console.warn('[Gym Manager] Forcing shutdown after timeout.');
      process.exit(0);
    }, 3000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGHUP', () => shutdown('SIGHUP'));

  if (process.platform === 'win32' && process.stdin.isTTY) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on('SIGINT', () => shutdown('SIGINT'));
  }
}

startServer();
