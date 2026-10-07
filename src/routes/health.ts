import { Router } from 'express';
import { checkDatabaseConnection } from '../db/index.ts';

const router = Router();

// Handle both /health and /api/health
router.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    service: 'gym-manager-saas',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Handle both /health/db and /api/health/db
router.get(['/health/db', '/api/health/db'], async (req, res) => {
  const result = await checkDatabaseConnection();

  if (result.ok) {
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      latencyMs: result.latencyMs,
      config: {
        host: result.summary.host,
        port: result.summary.port,
        database: result.summary.database,
        mode: result.summary.mode,
        ssl: result.summary.ssl,
      },
    });
  } else {
    res.status(503).json({
      status: 'error',
      database: 'unavailable',
      code: result.error?.code || 'DB_UNREACHABLE',
      error: result.error?.message || 'Database connection failed',
      guidance: result.error?.guidance || 'Check database configuration and proxy status.',
      config: {
        host: result.summary.host,
        port: result.summary.port,
        database: result.summary.database,
        mode: result.summary.mode,
      },
    });
  }
});

export default router;
