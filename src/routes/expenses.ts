import { Router, type Response } from 'express';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { expenses } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit.ts';
import { isValidUuid } from '../lib/server-ids.ts';

const router = Router();

// GET /api/expenses - List expenses (OWNER or MANAGER)
router.get('/', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { category, month } = req.query;

    const allExpenses = await db.query.expenses.findMany({
      where: eq(expenses.gymId, gymId),
      orderBy: (e, { desc }) => [desc(e.expenseDate), desc(e.createdAt)],
    });

    let mapped = allExpenses.map(e => ({
      id: e.id,
      gymId: e.gymId,
      category: e.category,
      description: e.description,
      amount: parseFloat(e.amount),
      date: e.expenseDate,
      paymentMethod: e.paymentMethod,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    if (category && category !== 'ALL') {
      mapped = mapped.filter(e => e.category.toLowerCase() === String(category).toLowerCase());
    }
    if (month) {
      mapped = mapped.filter(e => (e.date || '').startsWith(String(month)));
    }

    res.json(mapped);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch expenses' } });
  }
});

// POST /api/expenses - Add expense (OWNER or MANAGER)
router.post('/', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const { category, description, amount, date, paymentMethod, notes } = req.body;

    if (!category || !description || amount === undefined) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Category, description, and amount are required' } });
    }

    const numAmount = parseFloat(String(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Amount must be a positive number' } });
    }

    const [created] = await db.insert(expenses).values({
      gymId,
      category: String(category).trim(),
      description: String(description).trim(),
      amount: numAmount.toFixed(2),
      expenseDate: date || new Date().toISOString().split('T')[0],
      paymentMethod: paymentMethod ? String(paymentMethod).trim() : 'Cash',
      notes: notes ? String(notes).trim() : null,
    }).returning();

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'EXPENSE_CREATED',
      entityType: 'EXPENSE',
      entityId: created.id,
      details: `Created expense of ₹${numAmount} for "${description}" (${category})`,
    });

    res.status(201).json({
      id: created.id,
      gymId: created.gymId,
      category: created.category,
      description: created.description,
      amount: parseFloat(created.amount),
      date: created.expenseDate,
      paymentMethod: created.paymentMethod,
      notes: created.notes,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to record expense' } });
  }
});

// PUT /api/expenses/:id - Update expense (OWNER or MANAGER)
router.put('/:id', requireAuth, requireRole(['OWNER', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const expenseId = req.params.id;
    const { category, description, amount, date, paymentMethod, notes } = req.body;

    if (!isValidUuid(expenseId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }

    const existing = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, expenseId), eq(expenses.gymId, gymId)),
    });

    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }

    const [updated] = await db.update(expenses)
      .set({
        ...(category !== undefined ? { category: String(category).trim() } : {}),
        ...(description !== undefined ? { description: String(description).trim() } : {}),
        ...(amount !== undefined ? { amount: parseFloat(String(amount)).toFixed(2) } : {}),
        ...(date !== undefined ? { expenseDate: date } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod: String(paymentMethod).trim() } : {}),
        ...(notes !== undefined ? { notes: String(notes).trim() } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, expenseId), eq(expenses.gymId, gymId)))
      .returning();

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'EXPENSE_UPDATED',
      entityType: 'EXPENSE',
      entityId: expenseId,
      details: `Updated expense: ${updated.description}`,
    });

    res.json({
      id: updated.id,
      gymId: updated.gymId,
      category: updated.category,
      description: updated.description,
      amount: parseFloat(updated.amount),
      date: updated.expenseDate,
      paymentMethod: updated.paymentMethod,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error: any) {
    if (error.code === '22P02') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }
    console.error('Error updating expense:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update expense' } });
  }
});

// DELETE /api/expenses/:id - Delete expense (OWNER ONLY)
router.delete('/:id', requireAuth, requireRole(['OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.user!.gymId;
    const expenseId = req.params.id;

    if (!isValidUuid(expenseId)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }

    const existing = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, expenseId), eq(expenses.gymId, gymId)),
    });

    if (!existing) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }

    await db.delete(expenses)
      .where(and(eq(expenses.id, expenseId), eq(expenses.gymId, gymId)));

    await logAuditEvent({
      gymId,
      userId: req.user!.userId,
      action: 'EXPENSE_DELETED',
      entityType: 'EXPENSE',
      entityId: expenseId,
      details: `Deleted expense "${existing.description}" of ₹${existing.amount}`,
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === '22P02') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete expense' } });
  }
});

export default router;
