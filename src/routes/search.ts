import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { members, payments, membershipPlans } from '../db/schema.ts';
import { eq, and, ilike, or } from 'drizzle-orm';

const router = Router();

// GET /api/search?q=... - Multi-tenant search
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const query = String(req.query.q || '').trim();

    if (!query) {
      return res.json({ members: [], payments: [], plans: [] });
    }

    const pattern = `%${query}%`;

    // Search members
    const matchingMembers = await db.query.members.findMany({
      where: and(
        eq(members.gymId, gymId),
        or(
          ilike(members.name, pattern),
          ilike(members.phone, pattern),
          ilike(members.memberCode, pattern)
        )
      ),
      limit: 10,
    });

    // Search payments / receipts
    const matchingPayments = await db.query.payments.findMany({
      where: and(
        eq(payments.gymId, gymId),
        or(
          ilike(payments.receiptNumber, pattern),
          ilike(payments.memberName, pattern)
        )
      ),
      limit: 10,
    });

    // Search plans
    const matchingPlans = await db.query.membershipPlans.findMany({
      where: and(
        eq(membershipPlans.gymId, gymId),
        ilike(membershipPlans.name, pattern)
      ),
      limit: 5,
    });

    res.json({
      members: matchingMembers.map(m => ({
        id: m.id,
        memberId: m.memberCode,
        name: m.name,
        phone: m.phone,
        status: m.status,
      })),
      payments: matchingPayments.map(p => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        memberName: p.memberName,
        amount: parseFloat(p.amount),
        date: p.paymentDate.toISOString(),
      })),
      plans: matchingPlans.map(p => ({
        id: p.id,
        name: p.name,
        price: parseFloat(p.price),
      })),
    });
  } catch (error: any) {
    console.error('Error in /api/search:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Search failed' } });
  }
});

export default router;
