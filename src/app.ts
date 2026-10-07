import express from 'express';
import cors from 'cors';

import healthRouter from './routes/health.ts';
import authRouter from './routes/auth.ts';
import gymRouter from './routes/gym.ts';
import membersRouter from './routes/members.ts';
import plansRouter from './routes/plans.ts';
import membershipsRouter from './routes/memberships.ts';
import paymentsRouter from './routes/payments.ts';
import expensesRouter from './routes/expenses.ts';
import notificationsRouter from './routes/notifications.ts';
import dashboardRouter from './routes/dashboard.ts';
import reportsRouter from './routes/reports.ts';
import searchRouter from './routes/search.ts';
import backupRouter from './routes/backup.ts';
import auditRouter from './routes/audit.ts';
import memberRouter from './routes/member.ts';
import communityRouter from './routes/community.ts';

export function createApp(): express.Express {
  const app = express();

  // 1. Middlewares
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());

  // 2. Health Checks (Always available)
  app.use(healthRouter);

  // 3. Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/gym', gymRouter);
  app.use('/api/members', membersRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/memberships', membershipsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/backup', backupRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/member', memberRouter);
  app.use('/api/community', communityRouter);

  // 4. 404 handler for unknown /api routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found' } });
  });

  // 5. Centralized API error handler
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    res.status(err.status || 500).json({
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'An unexpected server error occurred',
      }
    });
  });

  return app;
}

export const app = createApp();
export default app;
