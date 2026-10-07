import { Router, type Response } from 'express';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { 
  members, 
  memberships, 
  membershipPlans, 
  payments, 
  notifications 
} from '../db/schema.ts';
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm';
import { generateNextMemberCode, generateNextReceiptNumber, isValidUuid } from '../lib/server-ids.ts';
import { logAuditEvent } from '../lib/audit.ts';

const router = Router();

// GET /api/members - List members with current active membership and status
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { status, search } = req.query;

    const allMembers = await db.query.members.findMany({
      where: eq(members.gymId, gymId),
      orderBy: (m, { desc }) => [desc(m.createdAt)],
      with: {
        memberships: {
          orderBy: (ms, { desc }) => [desc(ms.endDate)],
          limit: 1,
        },
        payments: {
          orderBy: (p, { desc }) => [desc(p.paymentDate)],
        },
      },
    });

    // Compute dynamic membership dues and pending amounts for each member
    const result = allMembers.map((m) => {
      const latestMembership = m.memberships?.[0] || null;
      const totalPaid = (m.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
      const totalFee = latestMembership ? parseFloat(latestMembership.price || '0') : 0;
      const pendingAmount = Math.max(0, totalFee - totalPaid);

      return {
        id: m.id,
        gymId: m.gymId,
        memberId: m.memberCode,
        name: m.name,
        phone: m.phone,
        email: m.email,
        dateOfBirth: m.dateOfBirth,
        gender: m.gender,
        address: m.address,
        joinedDate: m.joinDate,
        status: m.status,
        emergencyContact: m.emergencyContactName,
        notes: m.notes,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        activeMembership: latestMembership ? {
          id: latestMembership.id,
          planId: latestMembership.planId,
          planName: latestMembership.planName,
          startDate: latestMembership.startDate,
          endDate: latestMembership.endDate,
          totalFee: parseFloat(latestMembership.totalFee || '0'),
          discount: parseFloat(latestMembership.discount || '0'),
          finalAmount: parseFloat(latestMembership.price || '0'),
          status: latestMembership.status,
          paidAmount: totalPaid,
          pendingAmount: pendingAmount,
        } : null,
      };
    });

    // Filter in-memory if query params present
    let filtered = result;
    if (status && status !== 'ALL') {
      filtered = filtered.filter(m => m.status.toUpperCase() === String(status).toUpperCase());
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(q) || 
        (m.phone && m.phone.includes(q)) || 
        m.memberId.toLowerCase().includes(q)
      );
    }

    res.json(filtered);
  } catch (error: any) {
    console.error('Error in GET /api/members:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch members' } });
  }
});

// GET /api/members/:id - Full details with memberships & payments
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const memberId = req.params.id;

    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    const member = await db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.gymId, gymId)),
      with: {
        memberships: {
          orderBy: (ms, { desc }) => [desc(ms.startDate)],
        },
        payments: {
          orderBy: (p, { desc }) => [desc(p.paymentDate)],
        },
        attendance: {
          orderBy: (a, { desc }) => [desc(a.checkInTime)],
          limit: 30,
        },
        workouts: {
          orderBy: (w, { desc }) => [desc(w.createdAt)],
          limit: 10,
        },
      },
    });

    if (!member) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    res.json(member);
  } catch (error: any) {
    console.error('Error fetching member details:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch member details' } });
  }
});

// POST /api/members - Transactional member creation with concurrency-safe memberCode
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { 
      name, 
      phone, 
      email, 
      dateOfBirth, 
      gender, 
      address, 
      joinedDate, 
      emergencyContact, 
      notes,
      planId,
      startDate,
      discount = 0,
      initialPayment = 0,
      paymentMethod = 'Cash'
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Member name is required' } });
    }

    const effectiveJoinDate = joinedDate || new Date().toISOString().split('T')[0];

    // Run within a transactional block
    const createdData = await db.transaction(async (tx) => {
      // 1. Generate concurrency-safe member code (e.g. GM-016)
      const memberCode = await generateNextMemberCode(tx, gymId);

      // Determine initial status based on payment and plan
      let initialStatus = 'ACTIVE';
      const numInitialPayment = parseFloat(String(initialPayment)) || 0;

      // 2. Insert member record
      const [newMember] = await tx.insert(members).values({
        gymId,
        memberCode,
        name,
        phone: phone || null,
        email: email || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || 'Prefer not to say',
        address: address || null,
        joinDate: effectiveJoinDate,
        status: initialStatus,
        emergencyContactName: emergencyContact || null,
        notes: notes || null,
      }).returning();

      let createdMembership = null;
      let createdPayment = null;

      // 3. If a plan is selected, create membership pass
      if (planId) {
        const plan = await tx.query.membershipPlans.findFirst({
          where: and(eq(membershipPlans.id, planId), eq(membershipPlans.gymId, gymId)),
        });

        if (plan) {
          const sDate = new Date(startDate || effectiveJoinDate);
          const eDate = new Date(sDate);
          eDate.setDate(eDate.getDate() + (plan.durationDays || 30));

          const numTotalFee = parseFloat(plan.price);
          const numDiscount = Math.max(0, parseFloat(String(discount)) || 0);
          const numFinalPrice = Math.max(0, numTotalFee - numDiscount);

          const isFullyPaid = numInitialPayment >= numFinalPrice;
          const membershipStatus = isFullyPaid ? 'Active' : (numInitialPayment > 0 ? 'Pending' : 'Pending');

          const [insertedMembership] = await tx.insert(memberships).values({
            gymId,
            memberId: newMember.id,
            planId: plan.id,
            planName: plan.name,
            startDate: sDate.toISOString().split('T')[0],
            endDate: eDate.toISOString().split('T')[0],
            totalFee: numTotalFee.toFixed(2),
            discount: numDiscount.toFixed(2),
            price: numFinalPrice.toFixed(2),
            status: membershipStatus,
          }).returning();
          createdMembership = insertedMembership;

          // If payment was made upfront, record it with concurrency-safe receipt
          if (numInitialPayment > 0) {
            const receiptNumber = await generateNextReceiptNumber(tx, gymId);

            const [insertedPayment] = await tx.insert(payments).values({
              gymId,
              memberId: newMember.id,
              memberName: newMember.name,
              membershipId: insertedMembership.id,
              receiptNumber,
              amount: numInitialPayment.toFixed(2),
              paymentMethod: paymentMethod || 'Cash',
              status: isFullyPaid ? 'Paid' : 'Partial',
              paymentDate: new Date(),
              notes: 'Initial membership fee collection',
            }).returning();
            createdPayment = insertedPayment;
          }

          // Update member status if payment pending
          if (!isFullyPaid) {
            await tx.update(members)
              .set({ status: 'PAYMENT PENDING' })
              .where(eq(members.id, newMember.id));
            newMember.status = 'PAYMENT PENDING';
          }
        }
      }

      // 4. Log notification for new onboarding
      await tx.insert(notifications).values({
        gymId,
        type: 'new_member',
        title: 'New Member Onboarded',
        message: `${name} registered with ID ${memberCode}.`,
        memberId: newMember.id,
        memberName: name,
        phone: phone || null,
        read: false,
      });

      return {
        member: newMember,
        membership: createdMembership,
        payment: createdPayment,
      };
    });

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'MEMBER_CREATED',
      entityType: 'MEMBER',
      entityId: createdData.member.id,
      details: `Created member ${createdData.member.name} (Code: ${createdData.member.memberCode})`,
    });

    res.status(201).json(createdData);
  } catch (error: any) {
    console.error('Error in POST /api/members:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to create member' } });
  }
});

// PUT /api/members/:id - Update member profile
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const memberId = req.params.id;

    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    const { 
      name, 
      phone, 
      email, 
      dateOfBirth, 
      gender, 
      address, 
      emergencyContact, 
      notes,
      status,
      accountStatus
    } = req.body;

    const existing = await db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.gymId, gymId)),
    });

    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    const [updated] = await db.update(members)
      .set({
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: String(phone).trim() } : {}),
        ...(email !== undefined ? { email: String(email).trim() } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(address !== undefined ? { address: String(address).trim() } : {}),
        ...(emergencyContact !== undefined ? { emergencyContactName: String(emergencyContact).trim() } : {}),
        ...(notes !== undefined ? { notes: String(notes).trim() } : {}),
        ...(status !== undefined ? { status: String(status).trim() } : {}),
        ...(accountStatus !== undefined ? { accountStatus: String(accountStatus).trim() } : (status === 'SUSPENDED' ? { accountStatus: 'SUSPENDED' } : {})),
        updatedAt: new Date(),
      })
      .where(and(eq(members.id, memberId), eq(members.gymId, gymId)))
      .returning();

    const isArchived = String(status || '').toUpperCase() === 'ARCHIVED' || String(status || '').toUpperCase() === 'INACTIVE';

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: isArchived ? 'MEMBER_ARCHIVED' : 'MEMBER_UPDATED',
      entityType: 'MEMBER',
      entityId: memberId,
      details: `Updated member ${updated.name}. Status: ${updated.status}`,
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === '22P02') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }
    console.error('Error in PUT /api/members/:id:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update member' } });
  }
});

// DELETE /api/members/:id - Delete member (OWNER ONLY - guarded against financial history loss)
router.delete('/:id', requireAuth, requireRole(['OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const memberId = req.params.id;

    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    const existing = await db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.gymId, gymId)),
    });

    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    // Financial audit preservation: Do not allow deletion if payment receipts exist
    const hasPayments = await db.query.payments.findFirst({
      where: and(eq(payments.memberId, memberId), eq(payments.gymId, gymId)),
    });

    if (hasPayments) {
      return res.status(400).json({
        error: {
          code: 'MEMBER_HAS_PAYMENTS',
          message: 'Cannot delete member because payment receipts are linked to their account. Please set their status to Inactive or Archived to preserve financial audit trail.',
        },
      });
    }

    await db.delete(members)
      .where(and(eq(members.id, memberId), eq(members.gymId, gymId)));

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'MEMBER_DELETED',
      entityType: 'MEMBER',
      entityId: memberId,
      details: `Deleted member ${existing.name} (${existing.memberCode})`,
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === '22P02') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }
    console.error('Error deleting member:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete member' } });
  }
});

// POST /api/members/:id/invite - Generate single-use invitation code for member mobile/portal onboarding
router.post('/:id/invite', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const memberId = req.params.id;

    if (!isValidUuid(memberId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    const member = await db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.gymId, gymId)),
    });

    if (!member) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found' } });
    }

    // Generate 6-char alphanumeric invite token
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const invitationToken = `GYM-${randomSuffix}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day validity

    const [updated] = await db.update(members)
      .set({
        invitationToken,
        invitationExpiresAt: expiresAt,
        accountStatus: 'INVITED',
        updatedAt: new Date(),
      })
      .where(and(eq(members.id, memberId), eq(members.gymId, gymId)))
      .returning();

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'MEMBER_INVITED',
      entityType: 'MEMBER',
      entityId: memberId,
      details: `Generated onboarding invitation code for ${member.name} (${member.memberCode}). Code: ${invitationToken}`,
    });

    res.json({
      success: true,
      invitationToken,
      expiresAt,
      member: updated,
    });
  } catch (error: any) {
    console.error('Error creating member invitation:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate invitation' } });
  }
});

export default router;
