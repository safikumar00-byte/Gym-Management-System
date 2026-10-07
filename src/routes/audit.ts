import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { auditLogs } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/audit - List audit logs for tenant (OWNER ONLY)
router.get('/', requireAuth, requireRole(['OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10)));

    const logs = await db.query.auditLogs.findMany({
      where: eq(auditLogs.gymId, gymId),
      orderBy: (al, { desc }) => [desc(al.createdAt)],
      limit,
    });

    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs' } });
  }
});

export default router;
