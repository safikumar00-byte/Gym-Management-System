import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Member, Payment, Expense, Gym } from '../types';
import { formatINR, formatDate } from './calculations';

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCsv = (val: string | number) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportMembersCSV(members: Member[]) {
  const headers = ['Member ID', 'Name', 'Phone', 'Email', 'Gender', 'Joined Date', 'Status', 'Address'];
  const rows = members.map((m) => [
    m.memberId,
    m.name,
    m.phone,
    m.email,
    m.gender,
    m.joinedDate,
    m.status,
    m.address,
  ]);
  downloadCSV(`gym_members_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

export function exportPaymentsCSV(payments: Payment[]) {
  const headers = ['Receipt #', 'Member Name', 'Amount (INR)', 'Payment Date', 'Method', 'Status', 'Notes'];
  const rows = payments.map((p) => [
    p.receiptNumber,
    p.memberName,
    p.amount,
    p.paymentDate,
    p.paymentMethod,
    p.status,
    p.notes || '',
  ]);
  downloadCSV(`gym_payments_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

export function exportExpensesCSV(expenses: Expense[]) {
  const headers = ['Date', 'Category', 'Description', 'Amount (INR)', 'Method', 'Notes'];
  const rows = expenses.map((e) => [
    e.date,
    e.category,
    e.description,
    e.amount,
    e.paymentMethod,
    e.notes || '',
  ]);
  downloadCSV(`gym_expenses_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
}

export function exportPaymentsPDF(payments: Payment[], gym: Gym) {
  const doc = new jsPDF();
  
  // Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(16);
  doc.text(gym.name.toUpperCase(), 14, 18);
  
  doc.setFontSize(10);
  doc.setFont('courier', 'normal');
  doc.text(`PAYMENT TRANSACTIONS REPORT`, 14, 25);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} | Gym ID: ${gym.id}`, 14, 30);
  
  const tableData = payments.map((p) => [
    p.receiptNumber,
    p.memberName,
    formatINR(p.amount),
    formatDate(p.paymentDate),
    p.paymentMethod,
    p.status,
  ]);

  autoTable(doc, {
    startY: 36,
    head: [['Receipt', 'Member', 'Amount', 'Date', 'Method', 'Status']],
    body: tableData,
    theme: 'plain',
    styles: { font: 'courier', fontSize: 9, cellPadding: 3 },
    headStyles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [23, 23, 23] },
  });

  doc.save(`payments_report_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportFinancialSummaryPDF(
  revenue: number,
  expenses: number,
  netIncome: number,
  pending: number,
  todayCollection: number,
  gym: Gym
) {
  const doc = new jsPDF();

  doc.setFont('courier', 'bold');
  doc.setFontSize(16);
  doc.text(gym.name.toUpperCase(), 14, 18);

  doc.setFontSize(10);
  doc.setFont('courier', 'normal');
  doc.text(`EXECUTIVE FINANCIAL REPORT`, 14, 25);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 30);

  const summaryData = [
    ['This Month Revenue', formatINR(revenue)],
    ['This Month Expenses', formatINR(expenses)],
    ['Net Income', formatINR(netIncome)],
    ['Total Pending Dues', formatINR(pending)],
    ["Today's Collection", formatINR(todayCollection)],
  ];

  autoTable(doc, {
    startY: 38,
    head: [['Financial Metric', 'Amount']],
    body: summaryData,
    theme: 'plain',
    styles: { font: 'courier', fontSize: 10, cellPadding: 4 },
    headStyles: { fontStyle: 'bold', fillColor: [225, 113, 0], textColor: [255, 255, 255] },
  });

  doc.save(`financial_summary_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportReceiptPDF(data: {
  gym: Gym;
  receiptNumber: string;
  paymentDate: string;
  memberName: string;
  memberId: string;
  planName: string;
  totalFee: number;
  previousBalance: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: string;
}) {
  const doc = new jsPDF({ unit: 'mm', format: [80, 160] }); // standard 80mm thermal receipt format

  doc.setFont('courier', 'bold');
  doc.setFontSize(12);
  doc.text(data.gym.name.toUpperCase(), 40, 12, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.text(data.gym.phone, 40, 17, { align: 'center' });
  doc.text('-----------------------------------', 40, 22, { align: 'center' });
  
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text('PAYMENT RECEIPT', 40, 27, { align: 'center' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(`Receipt: ${data.receiptNumber}`, 6, 34);
  doc.text(`Date   : ${formatDate(data.paymentDate)}`, 6, 39);
  doc.text('-----------------------------------', 40, 43, { align: 'center' });

  doc.text(`MEMBER : ${data.memberName}`, 6, 48);
  doc.text(`ID     : ${data.memberId}`, 6, 53);
  doc.text(`PLAN   : ${data.planName}`, 6, 58);
  doc.text('-----------------------------------', 40, 62, { align: 'center' });

  doc.text(`Total Fee:        ${formatINR(data.totalFee)}`, 6, 68);
  doc.text(`Prev Balance:     ${formatINR(data.previousBalance)}`, 6, 74);
  doc.setFont('courier', 'bold');
  doc.text(`AMOUNT PAID:      ${formatINR(data.amountPaid)}`, 6, 80);
  doc.setFont('courier', 'normal');
  doc.text(`Remaining Bal:    ${formatINR(data.remainingBalance)}`, 6, 86);
  doc.text(`Payment Method:   ${data.paymentMethod}`, 6, 92);
  doc.text('-----------------------------------', 40, 97, { align: 'center' });

  doc.setFontSize(7);
  doc.text(data.gym.receiptFooter || 'Thank you for training with us!', 40, 104, { align: 'center' });

  doc.save(`receipt_${data.receiptNumber}.pdf`);
}
