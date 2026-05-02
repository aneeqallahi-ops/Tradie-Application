import React, { useState } from "react";
import { useGetInvoices } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Plus, FileText, CheckCircle2, AlertTriangle, Search } from "lucide-react";
import { Link } from "wouter";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";

const TABS = ["All", "Unpaid", "Paid", "Overdue"];

export default function InvoicesList() {
  const [filter, setFilter] = useState("All");
  const { data: invoices = [], isLoading } = useGetInvoices();

  const today = new Date();

  const filtered = invoices.filter(inv => {
    if (filter === "All") return true;
    if (filter === "Unpaid") return inv.status === "unpaid";
    if (filter === "Paid") return inv.status === "paid";
    if (filter === "Overdue") return inv.status === "unpaid" && inv.dueDate != null && new Date(inv.dueDate) < today;
    return true;
  });

  const totalUnpaid = invoices
    .filter(i => i.status === "unpaid")
    .reduce((sum, i) => sum + Number(i.total || 0), 0);

  return (
    <Layout>
      <Header 
        title="Invoices" 
        rightContent={
          <button className="p-2 text-white hover:text-primary transition-colors">
            <Search className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-6 pb-32 mt-2">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar sticky top-[72px] z-20 bg-background/80 backdrop-blur-md pt-2">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                filter === t 
                  ? "bg-primary text-black shadow-[0_0_15px_rgba(20,184,166,0.3)]" 
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Summary Strip */}
        {totalUnpaid > 0 && filter !== "Paid" && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/20 text-white rounded-3xl p-5 mb-6 flex justify-between items-center relative overflow-hidden"
          >
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative z-10">
              <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Outstanding Total</div>
              <div className="text-3xl font-black tabular-nums tracking-tight">{formatCurrency(totalUnpaid)}</div>
            </div>
            <div className="relative z-10 text-right">
              <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Unpaid</div>
              <div className="text-3xl font-black">{invoices.filter(i => i.status === "unpaid").length}</div>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 text-muted-foreground bg-white/5 border border-white/10 rounded-3xl"
          >
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white/40" />
            </div>
            <p className="font-bold text-white mb-2 text-lg">
              {filter === "All" ? "No invoices yet" : `No ${filter.toLowerCase()} invoices`}
            </p>
            <p className="text-sm">Create an invoice from a job to get paid.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((inv, idx) => {
                const isOverdue = inv.status === "unpaid" && inv.dueDate != null && new Date(inv.dueDate) < today;
                return (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link href={`/invoices/${inv.id}`} className="block bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/[0.07] transition-all relative overflow-hidden group">
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 opacity-50 group-hover:opacity-100 transition-opacity ${isOverdue ? 'bg-red-500' : inv.status === 'paid' ? 'bg-emerald-500' : 'bg-primary'}`} />
                      
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-white text-base truncate pr-2">{inv.invoiceNumber || `INV-${inv.id}`}</div>
                          <div className="text-sm font-medium text-muted-foreground mt-0.5">{inv.client?.name || "—"}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-white text-lg tabular-nums tracking-tight">{formatCurrency(inv.total)}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2">
                        <div className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider">
                          {isOverdue ? (
                            <span className="text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Overdue</span>
                          ) : inv.status === "paid" ? (
                            <span className="text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Paid {inv.paidAt ? formatDate(inv.paidAt) : ""}</span>
                          ) : (
                            <span className="text-muted-foreground">Due {formatDate(inv.dueDate)}</span>
                          )}
                        </div>
                        <StatusPill status={inv.status} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Link
        href="/invoices/new"
        className="fixed bottom-[88px] right-6 w-16 h-16 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(20,184,166,0.3)] hover:scale-105 active:scale-95 transition-transform z-50"
      >
        <Plus className="w-7 h-7 fill-current" />
      </Link>
    </Layout>
  );
}
