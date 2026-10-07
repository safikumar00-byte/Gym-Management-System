import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { payments, members, memberships, notifications, gyms } from '../db/schema.ts';
import { eq, and, desc, sql } from 'drizzle-orm';
import { generateNextReceiptNumber, isValidUuid } from '../lib/server-ids.ts';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

// GET /api/payments - List all payments scoped to gym (OWNER or MANAGER)
router.get('/', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { memberId, paymentMethod } = req.query;

    const allPayments = await db.query.payments.findMany({
      where: eq(payments.gymId, gymId),
      orderBy: (p, { desc }) => [desc(p.paymentDate)],
      with: {
        member: true,
        membership: true,
      },
    });

    let mapped = allPayments.map(p => {
      const dateStr = p.paymentDate instanceof Date ? p.paymentDate.toISOString().split('T')[0] : String(p.paymentDate || '').split('T')[0];
      return {
        id: p.id,
        gymId: p.gymId,
        memberId: p.memberId,
        memberName: p.memberName,
        membershipId: p.membershipId,
        receiptNumber: p.receiptNumber,
        amount: parseFloat(p.amount),
        paymentMethod: p.paymentMethod,
        paymentDate: dateStr,
        date: dateStr,
        status: p.status,
        notes: p.notes,
        idempotencyKey: p.idempotencyKey,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt || ''),
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt || ''),
      };
    });

    if (memberId) {
      mapped = mapped.filter(p => p.memberId === memberId);
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      mapped = mapped.filter(p => p.paymentMethod.toUpperCase() === String(paymentMethod).toUpperCase());
    }

    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payments' } });
  }
});

// POST /api/payments - Server-validated transactional payment creation with Idempotency
router.post('/', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  const { memberId, membershipId, amount, paymentMethod, notes, idempotencyKey: bodyKey } = req.body;
  const headerKey = req.headers['idempotency-key'] as string | undefined;
  const idempotencyKey = bodyKey || headerKey;
  const gymId = req.user!.gymId;

  try {
    if (!memberId || amount === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Member ID and payment amount are required' } });
    }

    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: 'PAYMENT_FAILED', message: 'MEMBER_NOT_FOUND: Member does not exist or does not belong to this gym' } });
    }

    if (membershipId && !isValidUuid(membershipId)) {
      return res.status(404).json({ error: { code: 'PAYMENT_FAILED', message: 'MEMBERSHIP_NOT_FOUND: Membership not found' } });
    }

    const payAmount = parseFloat(String(amount));
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Payment amount must be greater than zero' } });
    }

    // Idempotency check: Return existing payment if key already processed for this gym
    if (idempotencyKey) {
      const existing = await db.query.payments.findFirst({
        where: and(eq(payments.gymId, gymId), eq(payments.idempotencyKey, idempotencyKey)),
      });
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    // Execute within a strict database transaction with pessimistic locking
    const createdPayment = await db.transaction(async (tx) => {
      // Re-check idempotency key inside the transaction in case a concurrent request already committed it
      if (idempotencyKey) {
        const existingTx = await tx.query.payments.findFirst({
          where: and(eq(payments.gymId, gymId), eq(payments.idempotencyKey, idempotencyKey)),
        });
        if (existingTx) {
          return existingTx;
        }
      }

      // 1. Verify member belongs to gym and lock member row
      const memberRows = await tx.execute(
        sql`SELECT id, name, gym_id FROM members WHERE id = ${memberId} AND gym_id = ${gymId} FOR UPDATE`
      );
      const member = memberRows.rows?.[0] as any;

      if (!member) {
        throw new Error('MEMBER_NOT_FOUND: Member does not exist or does not belong to this gym');
      }

      // Re-check idempotency key after acquiring member lock to catch concurrent commits
      if (idempotencyKey) {
        const existingTx = await tx.query.payments.findFirst({
          where: and(eq(payments.gymId, gymId), eq(payments.idempotencyKey, idempotencyKey)),
        });
        if (existingTx) {
          return existingTx;
        }
      }

      // 2. Resolve target membership with row-level lock
      let targetMembership: any = null;
      if (membershipId) {
        const msRows = await tx.execute(
          sql`SELECT id, price, plan_name, status FROM memberships WHERE id = ${membershipId} AND gym_id = ${gymId} AND member_id = ${memberId} FOR UPDATE`
        );
        targetMembership = msRows.rows?.[0];
      } else {
        const msRows = await tx.execute(
          sql`SELECT id, price, plan_name, status FROM memberships WHERE gym_id = ${gymId} AND member_id = ${memberId} ORDER BY end_date DESC LIMIT 1 FOR UPDATE`
        );
        targetMembership = msRows.rows?.[0];
      }

      // 3. Load existing payments to independently calculate amount due
      let finalFee = targetMembership ? parseFloat(targetMembership.price) : payAmount;
      let totalPaidAlready = 0;

      if (targetMembership) {
        const existingPayments = await tx.query.payments.findMany({
          where: and(eq(payments.membershipId, targetMembership.id), eq(payments.gymId, gymId)),
        });
        totalPaidAlready = existingPayments
          .filter(p => p.status !== 'Refunded')
          .reduce((sum, p) => sum + parseFloat(p.amount), 0);
      }

      const pendingDue = Math.max(0, finalFee - totalPaidAlready);

      // Server-side validation: payment amount shouldn't exceed pending balance with reasonable tolerance
      if (targetMembership && payAmount > (pendingDue + 0.01)) {
        throw new Error(`EXCESS_PAYMENT: Payment amount (₹${payAmount}) exceeds the outstanding balance (₹${pendingDue.toFixed(2)})`);
      }

      // 4. Generate concurrency-safe receipt number
      const receiptNumber = await generateNextReceiptNumber(tx, gymId);

      // 5. Insert payment record
      const [newPayment] = await tx.insert(payments).values({
        gymId,
        memberId: member.id,
        memberName: member.name,
        membershipId: targetMembership ? targetMembership.id : null,
        receiptNumber,
        amount: payAmount.toFixed(2),
        paymentMethod: paymentMethod || 'Cash',
        status: 'Paid',
        paymentDate: new Date(),
        idempotencyKey: idempotencyKey || null,
        notes: notes || null,
      }).returning();

      // 6. Update membership and member status
      if (targetMembership) {
        const newTotalPaid = totalPaidAlready + payAmount;
        const isNowFullyPaid = newTotalPaid >= (finalFee - 0.01);
        const newStatus = isNowFullyPaid ? 'Active' : 'Pending';

        await tx.update(memberships)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(memberships.id, targetMembership.id));

        // Update member status
        const memberStatus = isNowFullyPaid ? 'ACTIVE' : 'PAYMENT PENDING';
        await tx.update(members)
          .set({ status: memberStatus, updatedAt: new Date() })
          .where(eq(members.id, member.id));
      }

      // 7. Log notification
      await tx.insert(notifications).values({
        gymId,
        type: 'payment_received',
        title: 'Payment Collected',
        message: `₹${payAmount.toLocaleString('en-IN')} received from ${member.name} (${receiptNumber}).`,
        memberId: member.id,
        memberName: member.name,
        amount: payAmount.toFixed(2),
        read: false,
      });

      // 8. Log audit trail
      await logAuditEvent({
        gymId,
        userId: req.user!.userId,
        action: 'PAYMENT_CREATED',
        entityType: 'PAYMENT',
        entityId: newPayment.id,
        details: `Collected ₹${payAmount} from ${member.name} (${receiptNumber}) via ${paymentMethod || 'Cash'}`,
        tx,
      });

      return newPayment;
    });

    res.status(201).json(createdPayment);
  } catch (error: any) {
    const rawMsg = String(error?.message || '');
    const causeMsg = String(error?.cause?.message || '');
    const causeDetail = String(error?.cause?.detail || '');
    const errCode = error?.code || error?.cause?.code;

    const isUniqueViolation = 
      errCode === '23505' || 
      rawMsg.toLowerCase().includes('unique') || 
      causeMsg.toLowerCase().includes('unique') ||
      causeDetail.toLowerCase().includes('unique') ||
      rawMsg.includes('gym_payment_idempotency_unique') ||
      causeMsg.includes('gym_payment_idempotency_unique');

    // Check if duplicate key violation was due to concurrent idempotent request
    if (idempotencyKey && isUniqueViolation) {
      // Retry up to 5 times with small backoff in case concurrent transaction is still committing
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await db.query.payments.findFirst({
          where: and(eq(payments.gymId, gymId), eq(payments.idempotencyKey, idempotencyKey)),
        });
        if (existing) {
          return res.status(200).json(existing);
        }
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }

    const message = error?.message || 'Payment processing failed';
    const isValidation = 
      message.includes('EXCESS_PAYMENT') || 
      message.includes('MEMBER_NOT_FOUND') || 
      message.includes('MEMBERSHIP_NOT_FOUND') ||
      causeMsg.includes('EXCESS_PAYMENT');

    if (isValidation) {
      console.warn('Payment creation rejected (validation):', message);
    } else {
      console.error('Payment creation failed:', error);
    }
    res.status(isValidation ? 400 : 500).json({ error: { code: 'PAYMENT_FAILED', message } });
  }
});

// Helper function for refund logic
async function handlePaymentRefund(paymentId: string, gymId: string, userId: string) {
  if (!isValidUuid(paymentId)) {
    throw new Error('Payment not found');
  }

  return await db.transaction(async (tx) => {
    const payment = await tx.query.payments.findFirst({
      where: and(eq(payments.id, paymentId), eq(payments.gymId, gymId)),
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'Refunded') {
      return payment;
    }

    const [refunded] = await tx.update(payments)
      .set({ status: 'Refunded', updatedAt: new Date() })
      .where(eq(payments.id, paymentId))
      .returning();

    // Recalculate member/membership status
    if (payment.membershipId) {
      await tx.update(memberships)
        .set({ status: 'Pending', updatedAt: new Date() })
        .where(eq(memberships.id, payment.membershipId));

      await tx.update(members)
        .set({ status: 'PAYMENT PENDING', updatedAt: new Date() })
        .where(eq(members.id, payment.memberId));
    }

    await logAuditEvent({
      gymId,
      userId,
      action: 'PAYMENT_REFUNDED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      details: `Refunded payment ${payment.receiptNumber} of ₹${payment.amount} for ${payment.memberName}`,
      tx,
    });

    return refunded;
  });
}

// POST /api/payments/refund - Mark payment as refunded via body (OWNER ONLY)
router.post('/refund', requireAuth, requireRole(['OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const paymentId = req.body?.paymentId || req.body?.id;
    if (!paymentId) {
      return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'paymentId is required' } });
    }
    const updatedPayment = await handlePaymentRefund(paymentId, gymId, req.user!.userId);
    res.json(updatedPayment);
  } catch (error: any) {
    const isNotFound = error.message === 'Payment not found' || error.code === '22P02';
    if (!isNotFound) {
      console.error('Error refunding payment:', error);
    }
    res.status(isNotFound ? 404 : 500).json({ error: { code: isNotFound ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message || 'Failed to refund payment' } });
  }
});

// POST /api/payments/:id/refund - Mark payment as refunded (OWNER ONLY)
router.post('/:id/refund', requireAuth, requireRole(['OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const paymentId = req.params.id;
    const updatedPayment = await handlePaymentRefund(paymentId, gymId, req.user!.userId);
    res.json(updatedPayment);
  } catch (error: any) {
    const isNotFound = error.message === 'Payment not found' || error.code === '22P02';
    if (!isNotFound) {
      console.error('Error refunding payment:', error);
    }
    res.status(isNotFound ? 404 : 500).json({ error: { code: isNotFound ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message || 'Failed to refund payment' } });
  }
});

export default router;
