import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { memberships, membershipPlans, members, payments, notifications } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { generateNextReceiptNumber, isValidUuid } from '../lib/server-ids.ts';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

// GET /api/memberships - List memberships
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { memberId } = req.query;

    const allMemberships = await db.query.memberships.findMany({
      where: eq(memberships.gymId, gymId),
      orderBy: (ms, { desc }) => [desc(ms.startDate)],
      with: {
        member: true,
        plan: true,
      },
    });

    let mapped = allMemberships.map(ms => ({
      id: ms.id,
      gymId: ms.gymId,
      memberId: ms.memberId,
      planId: ms.planId,
      planName: ms.planName,
      startDate: ms.startDate,
      endDate: ms.endDate,
      totalFee: parseFloat(ms.totalFee),
      discount: parseFloat(ms.discount),
      finalAmount: parseFloat(ms.price),
      status: ms.status,
      createdAt: ms.createdAt.toISOString(),
      updatedAt: ms.updatedAt.toISOString(),
    }));

    if (memberId) {
      mapped = mapped.filter(ms => ms.memberId === memberId);
    }

    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching memberships:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch memberships' } });
  }
});

// Handler for membership creation / renewal
const handleAssignOrRenewMembership = async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { 
      memberId, 
      planId, 
      startDate, 
      endDate,
      discount = 0, 
      initialPayment = 0, 
      paymentAmount = 0,
      paymentMethod = 'Cash',
      idempotencyKey,
      notes
    } = req.body;

    if (!memberId || !planId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Member ID and Plan ID are required' } });
    }

    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    if (!isValidUuid(planId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Membership plan not found' } });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Verify member
      const member = await tx.query.members.findFirst({
        where: and(eq(members.id, memberId), eq(members.gymId, gymId)),
      });
      if (!member) {
        throw new Error('Member not found');
      }

      // 2. Verify plan
      const plan = await tx.query.membershipPlans.findFirst({
        where: and(eq(membershipPlans.id, planId), eq(membershipPlans.gymId, gymId)),
      });
      if (!plan) {
        throw new Error('Membership plan not found');
      }

      // 3. Compute dates
      const sDate = new Date(startDate || new Date());
      const eDate = endDate ? new Date(endDate) : new Date(sDate);
      if (!endDate) {
        eDate.setDate(eDate.getDate() + (plan.durationDays || 30));
      }

      const numTotalFee = parseFloat(plan.price);
      const numDiscount = Math.max(0, parseFloat(String(discount)) || 0);
      const numFinalAmount = Math.max(0, numTotalFee - numDiscount);
      const numInitialPayment = Math.max(
        0, 
        parseFloat(String(initialPayment)) || parseFloat(String(paymentAmount)) || 0
      );

      const isFullyPaid = numInitialPayment >= numFinalAmount;
      const msStatus = isFullyPaid ? 'Active' : 'Pending';

      // 4. Insert new membership
      const [newMembership] = await tx.insert(memberships).values({
        gymId,
        memberId: member.id,
        planId: plan.id,
        planName: plan.name,
        startDate: sDate.toISOString().split('T')[0],
        endDate: eDate.toISOString().split('T')[0],
        totalFee: numTotalFee.toFixed(2),
        discount: numDiscount.toFixed(2),
        price: numFinalAmount.toFixed(2),
        status: msStatus,
      }).returning();

      let createdPayment = null;

      // 5. If upfront payment collected, record it
      if (numInitialPayment > 0) {
        const receiptNumber = await generateNextReceiptNumber(tx, gymId);

        const [payment] = await tx.insert(payments).values({
          gymId,
          memberId: member.id,
          memberName: member.name,
          membershipId: newMembership.id,
          receiptNumber,
          amount: numInitialPayment.toFixed(2),
          paymentMethod: paymentMethod || 'Cash',
          status: isFullyPaid ? 'Paid' : 'Partial',
          paymentDate: new Date(),
          idempotencyKey: idempotencyKey || null,
          notes: notes || 'Membership renewal payment',
        }).returning();
        createdPayment = payment;
      }

      // 6. Update member status
      const updatedMemberStatus = isFullyPaid ? 'ACTIVE' : 'PAYMENT PENDING';
      await tx.update(members)
        .set({ status: updatedMemberStatus, updatedAt: new Date() })
        .where(eq(members.id, member.id));

      // 7. Notification
      await tx.insert(notifications).values({
        gymId,
        type: 'membership_renewal',
        title: 'Membership Renewed',
        message: `${member.name} renewed with ${plan.name}.`,
        memberId: member.id,
        memberName: member.name,
        read: false,
      });

      // 8. Audit trail
      await logAuditEvent({
        gymId,
        userId: req.user!.userId,
        action: 'MEMBERSHIP_RENEWED',
        entityType: 'MEMBERSHIP',
        entityId: newMembership.id,
        details: `Renewed membership for ${member.name} with plan ${plan.name} (Amount: ₹${numFinalAmount})`,
        tx,
      });

      return {
        membership: newMembership,
        payment: createdPayment,
      };
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.code === '22P02') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Entity not found' } });
    }
    const isNotFound = error.message?.includes('not found');
    if (!isNotFound) {
      console.error('Error renewing membership:', error);
    }
    res.status(isNotFound ? 404 : 500).json({ error: { code: isNotFound ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message || 'Failed to renew membership' } });
  }
};

// Support both POST / and POST /renew
router.post('/', requireAuth, requireRole(['OWNER', 'MANAGER']), handleAssignOrRenewMembership);
router.post('/renew', requireAuth, requireRole(['OWNER', 'MANAGER']), handleAssignOrRenewMembership);

export default router;
