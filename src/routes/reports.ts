import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { payments, expenses, memberships, membershipPlans } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GET /api/reports - Financial and operational report metrics (OWNER or MANAGER)
router.get('/', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate: Date;

    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      // 'all'
      startDate = new Date(2000, 0, 1);
    }

    const startISO = startDate.toISOString();
    const startDateStr = startISO.split('T')[0];

    // Fetch payments
    const allPayments = await db.query.payments.findMany({
      where: and(eq(payments.gymId, gymId), eq(payments.status, 'Paid')),
    });

    const filteredPayments = allPayments.filter(p => p.paymentDate >= startDate);
    const totalCollected = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    // Fetch expenses
    const allExpenses = await db.query.expenses.findMany({
      where: eq(expenses.gymId, gymId),
    });

    const filteredExpenses = allExpenses.filter(e => e.expenseDate >= startDateStr);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const netProfit = totalCollected - totalExpenses;
    const profitMargin = totalCollected > 0 ? ((netProfit / totalCollected) * 100).toFixed(1) : '0.0';

    // Payment method distribution
    const methodCounts: Record<string, number> = {};
    for (const p of filteredPayments) {
      methodCounts[p.paymentMethod] = (methodCounts[p.paymentMethod] || 0) + parseFloat(p.amount);
    }
    const paymentMethods = Object.entries(methodCounts).map(([method, total]) => ({
      method,
      total,
      percentage: totalCollected > 0 ? Math.round((total / totalCollected) * 100) : 0,
    }));

    // Plan distribution
    const allMemberships = await db.query.memberships.findMany({
      where: eq(memberships.gymId, gymId),
    });
    const planCounts: Record<string, number> = {};
    for (const ms of allMemberships) {
      planCounts[ms.planName] = (planCounts[ms.planName] || 0) + 1;
    }
    const planBreakdown = Object.entries(planCounts).map(([name, count]) => ({
      name,
      count,
    }));

    res.json({
      period,
      summary: {
        totalCollected,
        totalExpenses,
        netProfit,
        profitMargin: parseFloat(profitMargin),
        transactionCount: filteredPayments.length,
      },
      paymentMethods,
      planBreakdown,
    });
  } catch (error: any) {
    console.error('Error in /api/reports:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate financial reports' } });
  }
});

export default router;
