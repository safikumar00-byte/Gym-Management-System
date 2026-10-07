import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { 
  gyms, 
  members, 
  membershipPlans, 
  memberships, 
  payments, 
  expenses, 
  notifications 
} from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

const handleExport = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;

    const [gym, allPlans, allMembers, allMemberships, allPayments, allExpenses, allNotifications] = await Promise.all([
      db.query.gyms.findFirst({ where: eq(gyms.id, gymId) }),
      db.query.membershipPlans.findMany({ where: eq(membershipPlans.gymId, gymId) }),
      db.query.members.findMany({ where: eq(members.gymId, gymId) }),
      db.query.memberships.findMany({ where: eq(memberships.gymId, gymId) }),
      db.query.payments.findMany({ where: eq(payments.gymId, gymId) }),
      db.query.expenses.findMany({ where: eq(expenses.gymId, gymId) }),
      db.query.notifications.findMany({ where: eq(notifications.gymId, gymId) }),
    ]);

    const backupPayload = {
      exportVersion: '2.0.0-cloud',
      exportDate: new Date().toISOString(),
      gym,
      plans: allPlans,
      members: allMembers,
      memberships: allMemberships,
      payments: allPayments,
      expenses: allExpenses,
      notifications: allNotifications,
    };

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'BACKUP_EXPORTED',
      entityType: 'BACKUP',
      entityId: gymId,
      details: `Full tenant data backup exported (${allMembers.length} members, ${allPayments.length} payments)`,
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=gym_backup_${gym?.receiptPrefix || 'GM'}_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backupPayload);
  } catch (error: any) {
    console.error('Error exporting backup:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to export backup' } });
  }
};

// GET /api/backup and /api/backup/export - Export entire tenant dataset safely (OWNER ONLY)
router.get('/', requireAuth, requireRole(['OWNER']), handleExport);
router.get('/export', requireAuth, requireRole(['OWNER']), handleExport);

export default router;
