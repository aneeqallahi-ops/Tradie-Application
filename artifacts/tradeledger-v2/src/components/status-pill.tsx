import React from "react";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string | null | undefined;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  if (!status) return null;
  
  const normalized = status.toUpperCase();
  
  let bg = "bg-white/10";
  let text = "text-white/80";
  let border = "border-white/10";
  let label = status;

  switch (normalized) {
    case "COMPLETE":
    case "COMPLETED":
    case "PAID":
    case "ACCEPTED":
      bg = "bg-emerald-500/10";
      text = "text-emerald-400";
      border = "border-emerald-500/20";
      label = normalized === "PAID" ? "Paid" : normalized === "ACCEPTED" ? "Accepted" : "Complete";
      break;
    case "IN_PROGRESS":
    case "IN PROGRESS":
    case "ACTIVE":
      bg = "bg-amber-500/10";
      text = "text-amber-400";
      border = "border-amber-500/20";
      label = "In Progress";
      break;
    case "QUOTE":
    case "PENDING":
    case "SENT":
    case "DRAFT":
      bg = "bg-primary/10";
      text = "text-primary";
      border = "border-primary/20";
      label = normalized === "QUOTE" ? "Quote" : normalized === "PENDING" ? "Pending" : normalized === "SENT" ? "Sent" : "Draft";
      break;
    case "OVERDUE":
    case "DECLINED":
    case "CANCELLED":
      bg = "bg-red-500/10";
      text = "text-red-400";
      border = "border-red-500/20";
      label = normalized === "OVERDUE" ? "Overdue" : normalized === "DECLINED" ? "Declined" : "Cancelled";
      break;
  }

  return (
    <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide whitespace-nowrap border backdrop-blur-sm uppercase", bg, text, border, className)}>
      {label}
    </span>
  );
}
