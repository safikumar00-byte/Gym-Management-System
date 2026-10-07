import { Router, type Response } from 'express';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { membershipPlans, memberships } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { isValidUuid } from '../lib/server-ids.ts';

const router = Router();

// GET /api/plans - List all plans for the tenant gym
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const plans = await db.query.membershipPlans.findMany({
      where: eq(membershipPlans.gymId, gymId),
      orderBy: (p, { asc }) => [asc(p.durationMonths)],
    });

    res.json(plans);
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch membership plans' } });
  }
});

// POST /api/plans - Create a new plan (OWNER or MANAGER)
router.post('/', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { name, durationMonths, durationDays, price, description, active } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Plan name and price are required' } });
    }

    const months = parseInt(durationMonths, 10) || 1;
    const days = parseInt(durationDays, 10) || (months * 30);
    const numPrice = parseFloat(price);

    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Price must be a non-negative number' } });
    }

    const [created] = await db.insert(membershipPlans).values({
      gymId,
      name: String(name).trim(),
      durationMonths: months,
      durationDays: days,
      price: numPrice.toFixed(2),
      description: description ? String(description).trim() : null,
      active: active !== undefined ? !!active : true,
    }).returning();

    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create membership plan' } });
  }
});

// PUT /api/plans/:id - Update plan (OWNER or MANAGER)
router.put('/:id', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const planId = req.params.id;

    if (!isValidUuid(planId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    }

    const { name, durationMonths, durationDays, price, description, active } = req.body;

    // Check ownership
    const existing = await db.query.membershipPlans.findFirst({
      where: and(eq(membershipPlans.id, planId), eq(membershipPlans.gymId, gymId)),
    });

    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    }

    const [updated] = await db.update(membershipPlans)
      .set({
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(durationMonths !== undefined ? { durationMonths: parseInt(durationMonths, 10) } : {}),
        ...(durationDays !== undefined ? { durationDays: parseInt(durationDays, 10) } : {}),
        ...(price !== undefined ? { price: parseFloat(price).toFixed(2) } : {}),
        ...(description !== undefined ? { description: String(description).trim() } : {}),
        ...(active !== undefined ? { active: !!active } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(membershipPlans.id, planId), eq(membershipPlans.gymId, gymId)))
      .returning();

    res.json(updated);
  } catch (error: any) {
    if (error.code === '22P02') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    }
    console.error('Error updating plan:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update plan' } });
  }
});

// DELETE /api/plans/:id - Delete plan if not referenced by existing memberships (OWNER or MANAGER)
router.delete('/:id', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const planId = req.params.id;

    if (!isValidUuid(planId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    }

    // Guard: Check if memberships reference this plan
    const refCount = await db.query.memberships.findFirst({
      where: and(eq(memberships.planId, planId), eq(memberships.gymId, gymId)),
    });

    if (refCount) {
      return res.status(400).json({ 
        error: { 
          code: 'PLAN_IN_USE', 
          message: 'Cannot delete plan because member subscriptions are actively linked to it. Please deactivate the plan instead.' 
        } 
      });
    }

    await db.delete(membershipPlans)
      .where(and(eq(membershipPlans.id, planId), eq(membershipPlans.gymId, gymId)));

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === '22P02') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Plan not found' } });
    }
    console.error('Error deleting plan:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete plan' } });
  }
});

export default router;
