import { format } from "date-fns";

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount == null) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(num);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch (e) {
    return "";
  }
}

export function formatPercent(percent: number | string | null | undefined): string {
  if (percent == null) return "0%";
  const num = typeof percent === "string" ? parseFloat(percent) : percent;
  if (isNaN(num)) return "0%";
  return `${num.toFixed(1)}%`;
}
