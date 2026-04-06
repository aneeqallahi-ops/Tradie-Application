import React, { useState } from "react";
import { useGetExpenses, useGetExpenseSummary } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Camera, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/format";

export default function ExpensesList() {
  const [activeTab, setActiveTab] = useState("All");

  const { data: expenses = [], isLoading } = useGetExpenses();
  const { data: summary, isLoading: isSummaryLoading } = useGetExpenseSummary();

  const grouped = (() => {
    if (activeTab === "By Category") {
      return expenses.reduce((acc, exp) => {
        const key = exp.category || "Uncategorised";
        if (!acc[key]) acc[key] = [];
        acc[key].push(exp);
        return acc;
      }, {} as Record<string, typeof expenses>);
    }
    if (activeTab === "By Job") {
      return expenses.reduce((acc, exp) => {
        const key = exp.jobId ? `Job #${exp.jobId}` : "No Job";
        if (!acc[key]) acc[key] = [];
        acc[key].push(exp);
        return acc;
      }, {} as Record<string, typeof expenses>);
    }
    return expenses.reduce((acc, exp) => {
      const d = new Date(exp.expenseDate);
      const month = d.toLocaleString("default", { month: "long", year: "numeric" });
      if (!acc[month]) acc[month] = [];
      acc[month].push(exp);
      return acc;
    }, {} as Record<string, typeof expenses>);
  })();

  return (
    <Layout>
      <Header title="Expenses" />

      <div className="px-5 pb-24">
        {/* Stat Cards */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1 hide-scrollbar">
          <div className="bg-primary text-white p-4 rounded-2xl shadow-sm min-w-[140px] shrink-0">
            <div className="text-xs text-gray-300 font-medium mb-1">This Month</div>
            <div className="text-xl font-bold">{isSummaryLoading ? "—" : formatCurrency(summary?.thisMonth)}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm min-w-[140px] shrink-0 border border-gray-100">
            <div className="text-xs text-gray-500 font-medium mb-1">GST Claimable</div>
            <div className="text-xl font-bold text-green-600">{isSummaryLoading ? "—" : formatCurrency(summary?.gstClaimable)}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm min-w-[140px] shrink-0 border border-gray-100">
            <div className="text-xs text-gray-500 font-medium mb-1">This FY Total</div>
            <div className="text-xl font-bold">{isSummaryLoading ? "—" : formatCurrency(summary?.thisFy)}</div>
          </div>
        </div>

        {summary?.subcontractorCount && summary.subcontractorCount > 0 && (
          <Link href="/subcontractors" className="mb-6 block bg-amber-50 border-l-4 border-l-amber-500 p-4 rounded-xl shadow-sm hover:bg-amber-100 transition-colors">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-amber-900 text-sm">TPAR Reporting Required</div>
                <div className="text-amber-800 text-xs mt-1">You have {summary.subcontractorCount} subcontractor expenses. Review your register.</div>
              </div>
            </div>
          </Link>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
          {["All", "By Category", "By Job"].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1 text-sm font-semibold transition-colors ${
                activeTab === t ? "text-primary border-b-2 border-primary -mb-[9px]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([groupKey, exps]) => (
              <div key={groupKey}>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{groupKey}</div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {exps.map(exp => (
                    <div key={exp.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-[15px]">{exp.category}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {exp.vendor && <span className="text-xs text-gray-600">{exp.vendor}</span>}
                          <span className="text-xs text-gray-400">{formatDate(exp.expenseDate)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(exp.amount)}</div>
                        {exp.gstClaimable && Number(exp.gstClaimable) > 0 && (
                          <div className="text-[10px] font-semibold text-green-600 mt-0.5">+{formatCurrency(exp.gstClaimable)} GST</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {expenses.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Camera className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-medium text-gray-900 mb-1">No expenses yet</p>
                <p className="text-sm">Scan a receipt to log an expense.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Link href="/expenses/new" className="fixed bottom-[80px] right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50">
        <Camera className="w-6 h-6" />
      </Link>
    </Layout>
  );
}
