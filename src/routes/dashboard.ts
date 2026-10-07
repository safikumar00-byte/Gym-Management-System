import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { members, memberships, payments, expenses } from '../db/schema.ts';
import { eq, and, gte, lte } from 'drizzle-orm';

const router = Router();

// GET /api/dashboard - Returns all aggregated metrics, charts, and pending lists
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // 1. Fetch all members with their memberships and payments
    const allMembers = await db.query.members.findMany({
      where: eq(members.gymId, gymId),
      with: {
        memberships: {
          orderBy: (ms, { desc }) => [desc(ms.endDate)],
        },
        payments: true,
      },
    });

    const totalMembers = allMembers.length;
    let activeMembers = 0;
    let expiringSoonCount = 0;
    let pendingPaymentsCount = 0;
    let totalPendingDue = 0;
    const urgentPendingList: any[] = [];

    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    for (const m of allMembers) {
      const activeMs = m.memberships?.[0];
      if (activeMs) {
        if (activeMs.endDate >= todayStr && activeMs.status !== 'Expired') {
          activeMembers++;
        }
        if (activeMs.endDate >= todayStr && activeMs.endDate <= sevenDaysStr) {
          expiringSoonCount++;
        }

        const totalFee = parseFloat(activeMs.price || '0');
        const totalPaid = (m.payments || [])
          .filter(p => p.status !== 'Refunded')
          .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

        const due = Math.max(0, totalFee - totalPaid);
        if (due > 0) {
          pendingPaymentsCount++;
          totalPendingDue += due;
          urgentPendingList.push({
            id: m.id,
            memberId: m.memberCode,
            name: m.name,
            phone: m.phone,
            planName: activeMs.planName,
            pendingAmount: due,
            dueDate: activeMs.startDate,
            status: m.status,
          });
        }
      }
    }

    // 2. Fetch payments
    const allPayments = await db.query.payments.findMany({
      where: and(eq(payments.gymId, gymId), eq(payments.status, 'Paid')),
    });

    let todayCollection = 0;
    let thisMonthRevenue = 0;

    for (const p of allPayments) {
      const pDate = new Date(p.paymentDate);
      const pDateStr = pDate.toISOString().split('T')[0];
      const pAmount = parseFloat(p.amount);

      if (pDateStr === todayStr) {
        todayCollection += pAmount;
      }
      if (pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth) {
        thisMonthRevenue += pAmount;
      }
    }

    // 3. Fetch expenses
    const allExpenses = await db.query.expenses.findMany({
      where: eq(expenses.gymId, gymId),
    });

    let thisMonthExpenses = 0;
    for (const e of allExpenses) {
      const eDate = new Date(e.expenseDate);
      if (eDate.getFullYear() === currentYear && eDate.getMonth() === currentMonth) {
        thisMonthExpenses += parseFloat(e.amount);
      }
    }

    const netIncome = thisMonthRevenue - thisMonthExpenses;

    // 4. Monthly comparison chart data (last 6 months)
    const monthlyChartData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const targetY = targetDate.getFullYear();
      const targetM = targetDate.getMonth();
      const label = `${monthNames[targetM]} '${String(targetY).slice(-2)}`;

      const rev = allPayments
        .filter(p => {
          const d = new Date(p.paymentDate);
          return d.getFullYear() === targetY && d.getMonth() === targetM;
        })
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const exp = allExpenses
        .filter(e => {
          const d = new Date(e.expenseDate);
          return d.getFullYear() === targetY && d.getMonth() === targetM;
        })
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      monthlyChartData.push({
        month: label,
        revenue: rev,
        expenses: exp,
        net: rev - exp,
      });
    }

    res.json({
      metrics: {
        totalMembers,
        activeMembers,
        expiringSoonCount,
        todayCollection,
        thisMonthRevenue,
        pendingPaymentsCount,
        totalPendingDue,
        thisMonthExpenses,
        netIncome,
      },
      monthlyChartData,
      urgentPendingList: urgentPendingList.slice(0, 10),
    });
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to compute dashboard metrics' } });
  }
});

export default router;
