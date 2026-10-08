import { db } from './index.ts';
import { 
  gyms, 
  userProfiles, 
  gymCounters, 
  membershipPlans, 
  members, 
  memberships, 
  payments, 
  expenses, 
  notifications 
} from './schema.ts';
import { 
  INITIAL_GYM, 
  INITIAL_PLANS, 
  INITIAL_MEMBERS, 
  INITIAL_MEMBERSHIPS, 
  INITIAL_PAYMENTS, 
  INITIAL_EXPENSES, 
  INITIAL_NOTIFICATIONS 
} from '../lib/seedData.ts';
import { eq } from 'drizzle-orm';

export async function seedDatabaseIfEmpty(): Promise<{ seeded: boolean; gym?: any; reason?: string }> {
  try {
    const existingGym = await db.query.gyms.findFirst();
    if (existingGym) {
      return { seeded: false, gym: existingGym, reason: 'ALREADY_INITIALIZED' };
    }

    if (process.env.ALLOW_MANUAL_SEED !== 'true') {
      return { seeded: false, reason: 'AUTOMATIC_SEED_DISABLED_FOR_PRODUCTION' };
    }

    console.log('[Gym Manager] Manual seed flag detected. Seeding test dataset...');

    // 1. Insert Gym
    const [insertedGym] = await db.insert(gyms).values({
      name: INITIAL_GYM.name,
      phone: INITIAL_GYM.phone,
      email: INITIAL_GYM.email,
      address: INITIAL_GYM.address,
      upiId: INITIAL_GYM.upiId,
      currency: INITIAL_GYM.currency || 'INR',
      timezone: 'Asia/Kolkata',
      receiptPrefix: INITIAL_GYM.receiptPrefix || 'GM-',
      receiptFooter: INITIAL_GYM.receiptFooter || 'Thank you for training with us!',
    }).returning();

    const gymId = insertedGym.id;

    // 2. Insert Plans
    const planMap = new Map<string, string>();
    for (const p of INITIAL_PLANS) {
      const [insertedPlan] = await db.insert(membershipPlans).values({
        gymId,
        name: p.name,
        durationMonths: p.durationMonths || 1,
        durationDays: p.durationDays || (p.durationMonths * 30),
        price: p.price.toFixed(2),
        description: p.description || null,
        active: p.status === 'active',
      }).returning();
      planMap.set(p.id, insertedPlan.id);
    }

    // 3. Insert Members
    const memberMap = new Map<string, string>();
    let maxMemberSeq = 0;
    for (const m of INITIAL_MEMBERS) {
      const seqMatch = m.memberId?.match(/\d+/);
      if (seqMatch) {
        const seqVal = parseInt(seqMatch[0], 10);
        if (seqVal > maxMemberSeq) maxMemberSeq = seqVal;
      }

      const [insertedMember] = await db.insert(members).values({
        gymId,
        memberCode: m.memberId,
        name: m.name,
        phone: m.phone || null,
        email: m.email || null,
        dateOfBirth: m.dateOfBirth || null,
        gender: m.gender || 'Prefer not to say',
        address: m.address || null,
        joinDate: m.joinedDate,
        status: m.status,
        emergencyContactName: m.emergencyContact || null,
        notes: m.notes || null,
      }).returning();
      memberMap.set(m.id, insertedMember.id);
    }

    // 4. Insert Memberships
    const membershipMap = new Map<string, string>();
    for (const ms of INITIAL_MEMBERSHIPS) {
      const dbMemberId = memberMap.get(ms.memberId);
      const dbPlanId = planMap.get(ms.planId) || Array.from(planMap.values())[0];
      if (!dbMemberId || !dbPlanId) continue;

      const [insertedMs] = await db.insert(memberships).values({
        gymId,
        memberId: dbMemberId,
        planId: dbPlanId,
        planName: ms.planName,
        startDate: ms.startDate,
        endDate: ms.endDate || ms.expiryDate,
        totalFee: ms.totalFee.toFixed(2),
        discount: (ms.discount || 0).toFixed(2),
        price: ms.finalAmount.toFixed(2),
        status: ms.status,
      }).returning();
      membershipMap.set(ms.id, insertedMs.id);
    }

    // 5. Insert Payments
    let maxReceiptSeq = 0;
    for (const pay of INITIAL_PAYMENTS) {
      const dbMemberId = memberMap.get(pay.memberId);
      if (!dbMemberId) continue;

      const seqMatch = pay.receiptNumber?.match(/\d+/);
      if (seqMatch) {
        const seqVal = parseInt(seqMatch[0], 10);
        if (seqVal > maxReceiptSeq) maxReceiptSeq = seqVal;
      }

      const dbMembershipId = pay.membershipId ? membershipMap.get(pay.membershipId) : null;

      await db.insert(payments).values({
        gymId,
        memberId: dbMemberId,
        memberName: pay.memberName,
        membershipId: dbMembershipId,
        receiptNumber: pay.receiptNumber,
        amount: pay.amount.toFixed(2),
        paymentMethod: pay.paymentMethod,
        status: pay.status || 'Paid',
        paymentDate: new Date(pay.paymentDate || pay.date || new Date()),
        notes: pay.notes || null,
      });
    }

    // 6. Insert Expenses
    for (const exp of INITIAL_EXPENSES) {
      await db.insert(expenses).values({
        gymId,
        category: exp.category,
        description: exp.description,
        amount: exp.amount.toFixed(2),
        expenseDate: exp.date,
        paymentMethod: exp.paymentMethod || 'Cash',
        notes: exp.notes || null,
      });
    }

    // 7. Insert Notifications
    for (const n of INITIAL_NOTIFICATIONS) {
      const dbMemberId = n.memberId ? memberMap.get(n.memberId) : null;
      await db.insert(notifications).values({
        gymId,
        type: n.type,
        title: n.title,
        message: n.message,
        memberId: dbMemberId,
        memberName: n.memberName || null,
        amount: n.amount ? n.amount.toFixed(2) : null,
        date: n.date || null,
        read: n.read || false,
        phone: n.phone || null,
      });
    }

    // 8. Insert Counters for safe concurrent generation
    await db.insert(gymCounters).values({
      gymId,
      memberSequence: Math.max(maxMemberSeq, 15),
      receiptSequence: Math.max(maxReceiptSeq, 150),
    });

    console.log('[Gym Manager] Initial seed completed successfully for gymId:', gymId);
    return { seeded: true, gym: insertedGym };
  } catch (error: any) {
    const code = error?.code || error?.cause?.code;
    if (code === '42P01' || error?.message?.includes('does not exist')) {
      console.warn('[Gym Manager Seed] Tables not found. Run `npm run db:push` to sync database schema.');
      return { seeded: false, reason: 'SCHEMA_NOT_FOUND' };
    }
    console.error('[Gym Manager Seed] Failed to seed database:', error?.message || error);
    throw error;
  }
}
