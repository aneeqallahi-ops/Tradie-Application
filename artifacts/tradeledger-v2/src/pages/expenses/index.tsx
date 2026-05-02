import React, { useState } from "react";
import { useGetExpenses, useGetExpenseSummary } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Camera, AlertCircle, Plus, Receipt } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";

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
      const month = d.toLocaleString("en-AU", { month: "long", year: "numeric" });
      if (!acc[month]) acc[month] = [];
      acc[month].push(exp);
      return acc;
    }, {} as Record<string, typeof expenses>);
  })();

  return (
    <Layout>
      <Header title="Expenses" />

      <div className="px-6 pb-32 mt-2">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-primary/10 border border-primary/20 p-5 rounded-3xl text-white relative overflow-hidden group hover:bg-primary/20 transition-colors">
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary/80 mb-1">This Month</div>
            <div className="text-2xl font-black tracking-tight tabular-nums">{isSummaryLoading ? "—" : formatCurrency(summary?.thisMonth)}</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-white">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">GST Claimable</div>
            <div className="text-2xl font-black tracking-tight tabular-nums text-emerald-400">{isSummaryLoading ? "—" : formatCurrency(summary?.gstClaimable)}</div>
          </div>
        </div>

        {summary?.subcontractorCount && summary.subcontractorCount > 0 && (
          <Link href="/subcontractors" className="mb-6 block bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl hover:bg-amber-500/20 transition-colors">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-500 text-base mb-1">TPAR Reporting Due</div>
                <div className="text-amber-500/80 text-sm font-medium leading-relaxed">You have {summary.subcontractorCount} subcontractor expenses. Review your register.</div>
              </div>
            </div>
          </Link>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar sticky top-[72px] z-20 bg-background/80 backdrop-blur-md pt-2">
          {["All", "By Category", "By Job"].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                activeTab === t 
                  ? "bg-primary text-black shadow-[0_0_15px_rgba(20,184,166,0.3)]" 
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />)}
          </div>
        ) : (
          <div className="space-y-8">
            <AnimatePresence mode="popLayout">
              {Object.entries(grouped).map(([groupKey, exps]) => (
                <motion.div key={groupKey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-2">{groupKey}</div>
                  <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5">
                    {exps.map(exp => (
                      <div key={exp.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                        <div className="flex-1 pr-4">
                          <div className="font-bold text-white text-base mb-1 capitalize">{String(exp.category).replace(/_/g, ' ')}</div>
                          <div className="flex items-center gap-2">
                            {exp.vendor && <span className="text-sm font-medium text-white/80">{exp.vendor}</span>}
                            {exp.vendor && <span className="text-white/20">•</span>}
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{formatDate(exp.expenseDate)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-white text-lg tabular-nums tracking-tight">{formatCurrency(exp.amount)}</div>
                          {exp.gstClaimable && Number(exp.gstClaimable) > 0 && (
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mt-1">+{formatCurrency(exp.gstClaimable)} GST</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}

              {expenses.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 text-muted-foreground bg-white/5 border border-white/10 rounded-3xl"
                >
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="font-bold text-white mb-2 text-lg">No expenses logged</p>
                  <p className="text-sm">Snap a receipt to claim deductions.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Link href="/expenses/new" className="fixed bottom-[88px] right-6 w-16 h-16 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(20,184,166,0.3)] hover:scale-105 active:scale-95 transition-transform z-50">
        <Camera className="w-7 h-7 fill-current" />
      </Link>
    </Layout>
  );
}
