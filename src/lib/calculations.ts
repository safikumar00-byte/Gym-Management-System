/**
 * Accurate financial and business logic calculations for GYM MANAGER
 */

export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  // Format as Indian Rupee style e.g. ₹1,85,000
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));
  const str = absAmount.toString();
  
  let result = '';
  if (str.length <= 3) {
    result = str;
  } else {
    const last3 = str.substring(str.length - 3);
    const rest = str.substring(0, str.length - 3);
    const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${withCommas},${last3}`;
  }
  
  return `${isNegative ? '-' : ''}₹${result}`;
}

export function formatCurrencySimple(amount: number): string {
  return formatINR(amount);
}

export function calculatePendingAmount(finalAmount: number, totalPaid: number): number {
  const pending = Number(finalAmount || 0) - Number(totalPaid || 0);
  return Math.max(0, Math.round(pending * 100) / 100);
}

export function calculateNetIncome(revenue: number, expenses: number): number {
  return (Number(revenue || 0) - Number(expenses || 0));
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    return `${day} ${month}`;
  } catch {
    return dateString;
  }
}

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMonthsToDate(dateString: string, months: number): string {
  const d = new Date(dateString || getTodayString());
  d.setMonth(d.getMonth() + months);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDate(dateString: string, days: number): string {
  const d = new Date(dateString || getTodayString());
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysDifference(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function generateWhatsAppReminderMessage(gymName: string, memberName: string, pendingAmount: number): string {
  return `Hi ${memberName},\n\nThis is a reminder from ${gymName}.\n\nYour membership payment of ${formatINR(pendingAmount)} is pending.\n\nPlease complete the payment at your earliest convenience.\n\nThank you.`;
}

export function getWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  // Default to 91 (India) prefix if 10 digits
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}
