import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { notifications } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// GET /api/notifications - List notifications
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const items = await db.query.notifications.findMany({
      where: eq(notifications.gymId, gymId),
      orderBy: (n, { desc }) => [desc(n.createdAt)],
      limit: 50,
    });

    const mapped = items.map(n => ({
      id: n.id,
      gymId: n.gymId,
      type: n.type,
      title: n.title,
      message: n.message,
      memberId: n.memberId,
      memberName: n.memberName,
      amount: n.amount ? parseFloat(n.amount) : undefined,
      date: n.date || n.createdAt.toISOString().split('T')[0],
      read: n.read,
      phone: n.phone,
      createdAt: n.createdAt.toISOString(),
    }));

    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' } });
  }
});

// PUT /api/notifications/:id/read - Mark one as read
router.put('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const notifId = req.params.id;

    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notifId), eq(notifications.gymId, gymId)));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update notification' } });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;

    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.gymId, gymId));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update notifications' } });
  }
});

// DELETE /api/notifications/clear - Delete read notifications
router.delete('/clear', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;

    await db.delete(notifications)
      .where(and(eq(notifications.gymId, gymId), eq(notifications.read, true)));

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to clear notifications' } });
  }
});

export default router;
