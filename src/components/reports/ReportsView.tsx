import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/AppIcon';
import { SegmentedControl } from '../ui/SegmentedControl';
import { 
  getPayments, 
  getExpenses, 
  getMembers, 
  getMemberships, 
  getPlans, 
  getGym 
} from '../../lib/storage';
import { formatINR } from '../../lib/calculations';
import { exportPaymentsPDF } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext.tsx';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { showToast } = useToast();
  const { isTrainer } = useAuth();
  const gym = getGym();
  const payments = getPayments();
  const expenses = getExpenses();
  const members = getMembers();
  const memberships = getMemberships();
  const plans = getPlans();

  const [dateRange, setDateRange] = useState<string>('THIS_MONTH');

  // Filter payments & expenses by selected date range
  const filteredData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDateString = '';

    if (dateRange === 'THIS_MONTH') {
      startDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    } else if (dateRange === 'LAST_MONTH') {
      const lm = currentMonth === 0 ? 11 : currentMonth - 1;
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
      startDateString = `${ly}-${String(lm + 1).padStart(2, '0')}-01`;
    } else if (dateRange === 'LAST_3_MONTHS') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      startDateString = d.toISOString().split('T')[0];
    } else if (dateRange === 'THIS_YEAR') {
      startDateString = `${currentYear}-01-01`;
    }

    const validPayments = payments.filter((p) => {
      if (p.status === 'Refunded') return false;
      if (!startDateString) return true;
      return p.paymentDate >= startDateString;
    });

    const validExpenses = expenses.filter((e) => {
      if (!startDateString) return true;
      return e.date >= startDateString;
    });

    return { validPayments, validExpenses };
  }, [payments, expenses, dateRange]);

  const { validPayments, validExpenses } = filteredData;

  const totalCollected = useMemo(() => {
    return validPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [validPayments]);

  const totalExpenses = useMemo(() => {
    return validExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [validExpenses]);

  const netProfit = totalCollected - totalExpenses;

  // Breakdown by Payment Method
  const methodData = useMemo(() => {
    const map: Record<string, number> = {};
    validPayments.forEach((p) => {
      map[p.paymentMethod] = (map[p.paymentMethod] || 0) + p.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [validPayments]);

  // Breakdown by Membership Plan
  const planData = useMemo(() => {
    const map: Record<string, number> = {};
    validPayments.forEach((p) => {
      const ms = memberships.find((m) => m.id === p.membershipId);
      const planName = ms?.planName || 'General Access';
      map[planName] = (map[planName] || 0) + p.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [validPayments, memberships]);

  const newMembersThisMonth = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    return members.filter((m) => (m.joinedDate || (m as any).joinDate || '').startsWith(currentMonthPrefix)).length;
  }, [members]);

  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const expiredCount = members.filter((m) => m.status === 'EXPIRED').length;

  const handleExportPDF = () => {
    exportPaymentsPDF(validPayments, gym);
    showToast('Exported analytical report to PDF');
  };

  const handleExportCSV = () => {
    let csv = 'Metric,Value\n';
    csv += `Total Revenue Collected,${totalCollected}\n`;
    csv += `Total Expenses,${totalExpenses}\n`;
    csv += `Net Operating Profit,${netProfit}\n`;
    csv += `Total Active Members,${activeCount}\n`;
    csv += `Total Expired Members,${expiredCount}\n\n`;

    csv += 'Payment Method Breakdown\nMethod,Amount\n';
    methodData.forEach((m) => {
      csv += `${m.name},${m.value}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial-report-${dateRange.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report CSV exported');
  };

  if (isTrainer) {
    const totalTrainees = members.length;
    const planCounts: Record<string, number> = {};
    memberships.forEach((m) => {
      planCounts[m.planName] = (planCounts[m.planName] || 0) + 1;
    });
    const traineePlanData = Object.entries(planCounts).map(([name, count]) => ({ name, value: count }));

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-[26px] sm:text-[30px] font-bold text-[#1d1d1f] tracking-tight">
            Athlete Analytics
          </h2>
          <p className="text-[13px] text-[#8e8e93] mt-0.5">
            Member distribution, pass retention, and training participation
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
            <div className="text-[12px] font-medium text-[#8e8e93]">Total Trainees</div>
            <div className="text-[28px] font-bold text-[#1d1d1f] mt-1">{totalTrainees}</div>
          </div>
          <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
            <div className="text-[12px] font-medium text-[#8e8e93]">Active Athletes</div>
            <div className="text-[28px] font-bold text-[#34c759] mt-1">{activeCount}</div>
          </div>
          <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
            <div className="text-[12px] font-medium text-[#8e8e93]">Expired Passes</div>
            <div className="text-[28px] font-bold text-[#ff3b30] mt-1">{expiredCount}</div>
          </div>
          <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
            <div className="text-[12px] font-medium text-[#8e8e93]">Retention Rate</div>
            <div className="text-[28px] font-bold text-[#0071e3] mt-1">
              {totalTrainees > 0 ? `${Math.round((activeCount / totalTrainees) * 100)}%` : '100%'}
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
          <h3 className="text-[16px] font-bold text-[#1d1d1f] mb-4 tracking-tight">
            Trainees by Membership Plan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {traineePlanData.map((item) => (
              <div key={item.name} className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px]">
                <div className="text-[12px] text-[#8e8e93] truncate">{item.name}</div>
                <div className="text-[18px] font-bold text-[#1d1d1f] mt-0.5">{item.value} Members</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const dateRangeOptions = [
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'LAST_MONTH', label: 'Last Month' },
    { id: 'LAST_3_MONTHS', label: '3 Months' },
    { id: 'THIS_YEAR', label: 'This Year' },
    { id: 'ALL', label: 'All Time' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[26px] sm:text-[30px] font-bold text-[#1d1d1f] tracking-tight">
            Reports & Analytics
          </h2>
          <p className="text-[13px] text-[#8e8e93] mt-0.5">
            Cash flows, channel breakdown, and membership retention
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="md" onClick={handleExportCSV} className="gap-1.5 text-[13px]">
            <AppIcon name="square.and.arrow.down" size={14} />
            <span>CSV</span>
          </Button>
          <Button variant="secondary" size="md" onClick={handleExportPDF} className="gap-1.5 text-[13px]">
            <AppIcon name="printer" size={14} />
            <span>PDF</span>
          </Button>
        </div>
      </div>

      {/* Apple Segmented Time Range Selector */}
      <div className="overflow-x-auto pb-1 no-scrollbar">
        <SegmentedControl
          value={dateRange}
          onChange={setDateRange}
          options={dateRangeOptions}
          size="md"
        />
      </div>

      {/* 3 Executive Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">Gross Inflow</div>
          <div className="text-[28px] font-bold text-[#34c759] mt-1 tracking-tight">
            {formatINR(totalCollected)}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">
            Collected membership revenue
          </div>
        </div>

        <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">Total Outflow</div>
          <div className="text-[28px] font-bold text-[#1d1d1f] mt-1 tracking-tight">
            {formatINR(totalExpenses)}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">
            Operating overhead & maintenance
          </div>
        </div>

        <div className="p-5 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
          <div className="text-[12px] font-medium text-[#8e8e93]">Net Operating Profit</div>
          <div
            className={`text-[28px] font-bold mt-1 tracking-tight ${
              netProfit >= 0 ? 'text-[#0071e3]' : 'text-[#ff3b30]'
            }`}
          >
            {formatINR(netProfit)}
          </div>
          <div className="text-[12px] text-[#8e8e93] mt-0.5">
            Margin: {totalCollected > 0 ? ((netProfit / totalCollected) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
                Payment Methods
              </h3>
              <p className="text-[12px] text-[#8e8e93]">Collections by channel</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
              <AppIcon name="creditcard" size={15} />
            </div>
          </div>

          <div className="h-56 w-full my-2">
            {methodData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-[#8e8e93]">
                No payment data in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" stroke="#8e8e93" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="#8e8e93" fontSize={12} width={80} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-[#e5e5ea] rounded-[12px] p-2.5 shadow-sm text-[12px]">
                            <div className="text-[#8e8e93]">{payload[0].payload.name}</div>
                            <div className="text-[#0071e3] font-bold text-[14px]">
                              {formatINR(payload[0].value as number)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="#0071e3" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-[#f0f0f2] grid grid-cols-2 gap-2 text-[12px]">
            {methodData.map((m) => (
              <div key={m.name} className="flex justify-between text-[#8e8e93]">
                <span>{m.name}:</span>
                <span className="text-[#1d1d1f] font-semibold">{formatINR(m.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Revenue */}
        <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
                Plan Popularity
              </h3>
              <p className="text-[12px] text-[#8e8e93]">Revenue by membership tier</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#34c759]/10 text-[#34c759] flex items-center justify-center">
              <AppIcon name="chart.bar" size={15} />
            </div>
          </div>

          <div className="h-56 w-full my-2">
            {planData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[13px] text-[#8e8e93]">
                No plan data in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#8e8e93" fontSize={11} />
                  <YAxis stroke="#8e8e93" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-[#e5e5ea] rounded-[12px] p-2.5 shadow-sm text-[12px]">
                            <div className="text-[#8e8e93]">{payload[0].payload.name}</div>
                            <div className="text-[#34c759] font-bold text-[14px]">
                              {formatINR(payload[0].value as number)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="#34c759" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-[#f0f0f2] grid grid-cols-2 gap-2 text-[12px]">
            {planData.map((p) => (
              <div key={p.name} className="flex justify-between text-[#8e8e93]">
                <span className="truncate pr-2">{p.name}:</span>
                <span className="text-[#1d1d1f] font-semibold">{formatINR(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Membership Health Summary */}
      <div className="p-6 bg-white border border-[#e5e5ea] rounded-[22px] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-[#1d1d1f] tracking-tight">
              Retention & Churn
            </h3>
            <p className="text-[12px] text-[#8e8e93]">Health of subscriber community</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
            <AppIcon name="person.2" size={15} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px]">
            <div className="text-[12px] text-[#8e8e93]">New Sign-ups</div>
            <div className="text-[24px] font-bold text-[#1d1d1f] mt-1">{newMembersThisMonth}</div>
            <div className="text-[11px] text-[#34c759] mt-0.5 font-medium">This month</div>
          </div>
          <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px]">
            <div className="text-[12px] text-[#8e8e93]">Active Members</div>
            <div className="text-[24px] font-bold text-[#34c759] mt-1">{activeCount}</div>
            <div className="text-[11px] text-[#8e8e93] mt-0.5">Up-to-date passes</div>
          </div>
          <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px]">
            <div className="text-[12px] text-[#8e8e93]">Expired Passes</div>
            <div className="text-[24px] font-bold text-[#ff9500] mt-1">{expiredCount}</div>
            <div className="text-[11px] text-[#8e8e93] mt-0.5">Pending renewal</div>
          </div>
          <div className="p-4 bg-[#fafafc] border border-[#e5e5ea] rounded-[16px]">
            <div className="text-[12px] text-[#8e8e93]">Estimated Churn</div>
            <div className="text-[24px] font-bold text-[#ff3b30] mt-1">
              {members.length > 0 ? ((expiredCount / members.length) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-[11px] text-[#8e8e93] mt-0.5">Lapsed ratio</div>
          </div>
        </div>
      </div>
    </div>
  );
};
