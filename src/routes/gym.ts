import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { gyms } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

// GET /api/gym - Get current gym configuration
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const gym = await db.query.gyms.findFirst({
      where: eq(gyms.id, gymId),
    });

    if (!gym) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Gym not found' } });
    }

    res.json(gym);
  } catch (error: any) {
    console.error('Error fetching gym:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch gym configuration' } });
  }
});

// PUT /api/gym - Update gym configuration (OWNER ONLY)
router.put('/', requireAuth, requireRole(['OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { 
      name, 
      phone, 
      email, 
      address, 
      upiId, 
      gstNumber, 
      currency, 
      timezone, 
      receiptPrefix, 
      receiptFooter 
    } = req.body;

    const [updated] = await db.update(gyms)
      .set({
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(email !== undefined ? { email: String(email).trim() } : {}),
        ...(address !== undefined ? { address: String(address).trim() } : {}),
        ...(upiId !== undefined ? { upiId: String(upiId).trim() } : {}),
        ...(gstNumber !== undefined ? { gstNumber: String(gstNumber).trim() } : {}),
        ...(currency !== undefined ? { currency: String(currency).trim().toUpperCase() } : {}),
        ...(timezone !== undefined ? { timezone: String(timezone).trim() } : {}),
        ...(receiptPrefix !== undefined ? { receiptPrefix: String(receiptPrefix).trim() } : {}),
        ...(receiptFooter !== undefined ? { receiptFooter: String(receiptFooter).trim() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(gyms.id, gymId))
      .returning();

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'GYM_CONFIG_UPDATED',
      entityType: 'GYM',
      entityId: gymId,
      details: `Gym details updated: ${name || updated.name}`,
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating gym:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update gym details' } });
  }
});

// PATCH /api/gym/status - Lifecycle management: ACTIVE, SUSPENDED, DEACTIVATED (OWNER ONLY)
router.patch('/status', requireAuth, requireRole(['OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { status } = req.body;

    const validStatuses = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
    const normalizedStatus = String(status || '').toUpperCase();

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: `Invalid gym status. Allowed: ${validStatuses.join(', ')}`,
        },
      });
    }

    const [updated] = await db.update(gyms)
      .set({
        status: normalizedStatus,
        updatedAt: new Date(),
      })
      .where(eq(gyms.id, gymId))
      .returning();

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'GYM_STATUS_CHANGED',
      entityType: 'GYM',
      entityId: gymId,
      details: `Gym status transitioned to ${normalizedStatus}`,
    });

    res.json({
      success: true,
      gymId: updated.id,
      status: updated.status,
    });
  } catch (error: any) {
    console.error('Error changing gym status:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to change gym status' } });
  }
});

export default router;
