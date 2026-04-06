import React from "react";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string | null | undefined;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  if (!status) return null;
  
  const normalized = status.toUpperCase();
  
  let bg = "bg-gray-100";
  let text = "text-gray-700";
  let label = status;

  switch (normalized) {
    case "COMPLETE":
    case "COMPLETED":
      bg = "bg-[#DCFCE7]";
      text = "text-[#166534]";
      label = "Complete";
      break;
    case "IN_PROGRESS":
    case "IN PROGRESS":
    case "ACTIVE":
      bg = "bg-[#FEF9C3]";
      text = "text-[#854D0E]";
      label = "In Progress";
      break;
    case "QUOTE":
    case "PENDING":
    case "SENT":
    case "DRAFT":
      bg = "bg-[#EFF6FF]";
      text = "text-[#1D4ED8]";
      break;
    case "OVERDUE":
    case "DECLINED":
    case "CANCELLED":
      bg = "bg-[#FEE2E2]";
      text = "text-[#991B1B]";
      break;
    case "PAID":
    case "ACCEPTED":
      bg = "bg-[#F0FDF4]";
      text = "text-[#166534]";
      break;
  }

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap", bg, text, className)}>
      {label}
    </span>
  );
}
