import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { SearchInput } from '../ui/SearchInput';
import { AppIcon } from '../ui/AppIcon';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { 
  getExpenses, 
  addExpense, 
  deleteExpense, 
  getDashboardMetrics, 
  getGym 
} from '../../lib/storage';
import { formatINR, formatDate, getTodayString } from '../../lib/calculations';
import { exportExpensesCSV } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext.tsx';

export const ExpensesView: React.FC = () => {
  const { showToast } = useToast();
  const { isTrainer } = useAuth();
  const gym = getGym();
  const metrics = getDashboardMetrics();
  const expenses = getExpenses();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('Maintenance');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');

  const categories: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Salaries',
    'Equipment',
    'Maintenance',
    'Marketing',
    'Other',
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        e.description.toLowerCase().includes(query) ||
        (e.notes && e.notes.toLowerCase().includes(query));
      const matchesCategory =
        categoryFilter === 'ALL' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const handleExportCSV = () => {
    exportExpensesCSV(filteredExpenses);
    showToast(`Exported ${filteredExpenses.length} expense records to CSV`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a description and valid amount', 'error');
      return;
    }

    try {
      addExpense({
        category,
        description: description.trim(),
        amount: numAmount,
        date,
        paymentMethod,
        notes: notes.trim(),
      });
      showToast(`Expense of ${formatINR(numAmount)} recorded`);
      setIsAddModalOpen(false);
      setDescription('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record expense', 'error');
    }
  };

  const handleDeleteConfirm = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete.id);
      showToast('Expense record deleted');
      setExpenseToDelete(null);
    }
  };

  if (isTrainer) {
    return (
      <div className="p-8 bg-white border border-[#e5e5ea] rounded-[22px] text-center max-w-md mx-auto my-12 space-y-4 shadow-xs">
        <div className="w-12 h-12 mx-auto bg-[#f2f2f7] rounded-full text-[#8e8e93] flex items-center justify-center">
          <AppIcon name="lock" size={20} />
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-[#1d1d1f] tracking-tight">Expenses Restricted</h3>
          <p className="text-[13px] text-[#8e8e93] mt-1.5 leading-relaxed">
            Operational overhead, payroll, and maintenance records are restricted to Owner and Manager roles.
          </p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-[#f2f2f7] hover:bg-[#ebebed] focus:bg-white border border-transparent focus:border-[#0071e3] rounded-[12px] text-[14px] text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all";
  const labelClass = "text-[13px] font-medium text-[#1d1d1f] mb-1 block tracking-tight";

  const paymentMethods: PaymentMethod[] = ['UPI', 'Cash', 'Card', 'Bank Transfer'];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[26px] sm:text-[30px] font-bold text-[#1d1d1f] tracking-tight">
            Expenses
          </h2>
          <span className="text-[12px] font-medium text-[#8e8e93] bg-white border border-[#e5e5ea] px-3 py-0.5 rounded-full shadow-2xs">
            {expenses.length} records
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportCSV}
            className="gap-1.5 text-[13px] hidden sm:inline-flex"
          >
            <AppIcon name="square.and.arrow.up" size={14} />
            <span>CSV</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5"
          >
            <AppIcon name="plus" size={16} strokeWidth={2.4} />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">This Month's Outflow</div>
          <div className="text-[28px] font-bold text-[#1d1d1f] mt-1 tracking-tight">
            {formatINR(metrics.thisMonthExpenses)}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">
            Operational overhead & supplies
          </div>
        </div>

        <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">This Month's Collections</div>
          <div className="text-[28px] font-bold text-[#34c759] mt-1 tracking-tight">
            {formatINR(metrics.thisMonthRevenue)}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">
            Gross membership payments
          </div>
        </div>

        <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">Net Operating Balance</div>
          <div className={`text-[28px] font-bold mt-1 tracking-tight ${
            metrics.netIncome >= 0 ? 'text-[#0071e3]' : 'text-[#ff3b30]'
          }`}>
            {formatINR(metrics.netIncome)}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">
            Revenue minus logged expenses
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onClear={() => setSearchTerm('')}
            placeholder="Search description, vendor..."
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-[#e5e5ea] rounded-full px-4 py-2 text-[13px] text-[#1d1d1f] outline-none focus:border-[#0071e3] transition-all cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-[#f0f0f2] bg-[#fafafc] text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wider">
                <th className="px-6 py-3.5">Date</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Mode</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f2]">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[#8e8e93]">
                    No expense records match your filters.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#fafafc] transition-colors h-[54px]">
                    <td className="px-6 py-3 text-[#8e8e93] text-[13px]">{formatDate(exp.date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-semibold bg-[#f2f2f7] text-[#1d1d1f] px-2.5 py-0.5 rounded-full">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#1d1d1f] font-medium">
                      <div>{exp.description}</div>
                      {exp.notes && <div className="text-[11px] text-[#8e8e93]">{exp.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-[#8e8e93] text-[13px]">{exp.paymentMethod}</td>
                    <td className="px-4 py-3 font-bold text-[#1d1d1f]">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setExpenseToDelete(exp)}
                        className="w-8 h-8 rounded-full bg-[#f2f2f7] hover:bg-[#ffe5e5] text-[#8e8e93] hover:text-[#ff3b30] inline-flex items-center justify-center transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <AppIcon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Grouped View */}
        <div className="lg:hidden divide-y divide-[#f0f0f2]">
          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-[#8e8e93] text-[13px]">
              No expense records found.
            </div>
          ) : (
            filteredExpenses.map((exp) => (
              <div key={exp.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold bg-[#f2f2f7] text-[#1d1d1f] px-2 py-0.5 rounded-full">
                      {exp.category}
                    </span>
                    <span className="text-[12px] text-[#8e8e93]">{formatDate(exp.date)}</span>
                  </div>
                  <div className="text-[14px] font-semibold text-[#1d1d1f] mt-1">{exp.description}</div>
                  <div className="text-[12px] text-[#8e8e93]">Via {exp.paymentMethod}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-[15px] font-bold text-[#1d1d1f]">{formatINR(exp.amount)}</div>
                  <button
                    onClick={() => setExpenseToDelete(exp)}
                    className="w-8 h-8 rounded-full bg-[#f2f2f7] hover:bg-[#ffe5e5] text-[#8e8e93] hover:text-[#ff3b30] flex items-center justify-center transition-colors"
                  >
                    <AppIcon name="trash" size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Expense"
        subtitle="Log operational overhead and maintenance payments"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Description / Payee *</label>
            <input
              type="text"
              required
              placeholder="e.g. BESCOM Electricity Bill, Trainer Stipend"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>Amount (₹) *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 3500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Payment Method</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {paymentMethods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                    paymentMethod === m
                      ? 'bg-[#0071e3] text-white shadow-2xs'
                      : 'bg-[#f2f2f7] text-[#8e8e93] hover:text-[#1d1d1f]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes / Vendor Invoice (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Paid via owner Google Pay"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="pt-3 border-t border-[#f0f0f2] flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {expenseToDelete && (
        <ConfirmDialog
          isOpen={!!expenseToDelete}
          onClose={() => setExpenseToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Expense"
          message={`Are you sure you want to remove the expense record "${expenseToDelete.description}" of ${formatINR(expenseToDelete.amount)}?`}
          confirmLabel="Delete"
        />
      )}
    </div>
  );
};
