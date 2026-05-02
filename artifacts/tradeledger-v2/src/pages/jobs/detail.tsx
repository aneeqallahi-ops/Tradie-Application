import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetJob, useUpdateJobStatus } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Phone, Mail, FileText, CheckCircle2, Plus, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

export default function JobDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Overview");

  const { data: job, isLoading } = useGetJob(Number(id), { 
    query: { enabled: !!id, queryKey: ['job', id] } 
  });
  
  const updateStatus = useUpdateJobStatus();

  if (isLoading || !job) {
    return (
      <Layout>
        <Header title="Job Detail" showBack onBack={() => window.history.back()} />
        <div className="p-6 space-y-4">
          <div className="h-48 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
        </div>
      </Layout>
    );
  }

  const handleMarkComplete = () => {
    updateStatus.mutate({ id: job.id, data: { status: "complete" } }, {
      onSuccess: () => {
        toast({ title: "Job marked as complete" });
        queryClient.invalidateQueries({ queryKey: ['job', String(id)] });
      }
    });
  };

  const totalQuoted = job.quoteLineItems?.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) || 0;
  const totalExpenses = job.expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const margin = totalQuoted > 0 ? ((totalQuoted - totalExpenses) / totalQuoted) * 100 : 0;
  const isLowMargin = margin < 20 && margin > 0;
  const isOverBudget = margin <= 0 && totalExpenses > 0;

  return (
    <Layout>
      <Header title={`Job #${job.jobNumber || job.id}`} showBack onBack={() => window.history.back()} />
      
      <div className="px-6 pb-[120px] mt-2 space-y-6">
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white truncate pr-4 tracking-tight">{job.title}</h2>
            <StatusPill status={job.status} className="px-4 py-1.5" />
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-2xl mb-8 sticky top-[72px] z-20 backdrop-blur-md">
          {["Overview", "Costs", "Invoices"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeTab === tab ? 'bg-primary text-black shadow-sm' : 'text-muted-foreground hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "Overview" && (
              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Client</div>
                  <div className="font-bold text-xl text-white mb-6">{job.client?.name}</div>
                  <div className="flex gap-4">
                    {job.client?.phone && (
                      <a href={`tel:${job.client.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-white font-bold text-sm transition-colors">
                        <Phone className="w-4 h-4" /> Call
                      </a>
                    )}
                    {job.client?.email && (
                      <a href={`mailto:${job.client.email}`} className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-white font-bold text-sm transition-colors">
                        <Mail className="w-4 h-4" /> Email
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-muted-foreground font-bold text-sm">Scheduled</span>
                    <span className="font-bold text-white text-sm bg-white/5 px-3 py-1 rounded-md border border-white/10">{job.scheduledDate ? formatDate(job.scheduledDate) : "Unscheduled"}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-muted-foreground font-bold text-sm">State</span>
                    <span className="font-bold text-white text-sm">{job.state || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-muted-foreground font-bold text-sm">Job Total</span>
                    <span className="font-black text-2xl text-white tracking-tight tabular-nums">{formatCurrency(job.total)}</span>
                  </div>
                </div>

                {job.description && (
                  <div>
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Notes</h3>
                    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                      {job.description}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Costs" && (
              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 relative overflow-hidden">
                  {/* Decorative background */}
                  <div className={`absolute -right-10 -top-10 w-40 h-40 blur-3xl rounded-full ${isOverBudget ? 'bg-red-500/20' : isLowMargin ? 'bg-amber-500/20' : 'bg-primary/20'}`} />
                  
                  <div className="relative z-10 flex justify-between items-end mb-6">
                    <div>
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Est. Margin</div>
                      <div className="text-3xl font-black text-white mt-1 tabular-nums tracking-tight">{margin.toFixed(1)}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Est. Profit</div>
                      <div className={`text-2xl font-black mt-1 tabular-nums tracking-tight ${isOverBudget ? 'text-red-400' : 'text-primary'}`}>{formatCurrency(totalQuoted - totalExpenses)}</div>
                    </div>
                  </div>
                  
                  <div className="relative z-10 h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, margin))}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] ${isOverBudget ? 'bg-red-500' : isLowMargin ? 'bg-amber-500' : 'bg-primary'}`} 
                    />
                  </div>

                  {isOverBudget && (
                    <div className="relative z-10 mt-5 flex items-start gap-3 text-sm text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      Over Budget! Costs exceed quoted amount.
                    </div>
                  )}
                  {isLowMargin && (
                    <div className="relative z-10 mt-5 flex items-start gap-3 text-sm text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      Low Margin Warning: Margins are below 20%.
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Quoted Work</h3>
                    <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(totalQuoted)}</span>
                  </div>
                  <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5">
                    {job.quoteLineItems?.map(item => (
                      <div key={item.id} className="p-4 text-sm flex justify-between">
                        <span className="text-white/80 font-medium pr-4">{item.description} <span className="text-muted-foreground font-bold text-xs ml-1">x{item.quantity}</span></span>
                        <span className="font-bold text-white tabular-nums shrink-0">{formatCurrency(item.lineTotal)}</span>
                      </div>
                    ))}
                    {(!job.quoteLineItems || job.quoteLineItems.length === 0) && (
                      <div className="p-6 text-center text-muted-foreground text-sm font-medium">No quoted items</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Actual Expenses</h3>
                    <span className="text-sm font-bold text-white tabular-nums">{formatCurrency(totalExpenses)}</span>
                  </div>
                  <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5">
                    {job.expenses?.map(exp => (
                      <div key={exp.id} className="p-4 text-sm flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                        <div>
                          <div className="font-bold text-white mb-0.5">{exp.category}</div>
                          {exp.vendor && <div className="text-xs font-medium text-muted-foreground">{exp.vendor}</div>}
                        </div>
                        <span className="font-black text-red-400 tabular-nums">-{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                    {(!job.expenses || job.expenses.length === 0) && (
                      <div className="p-6 text-center text-muted-foreground text-sm font-medium">No expenses logged yet</div>
                    )}
                  </div>
                  <Link href={`/expenses/new?jobId=${job.id}`} className="mt-4 block w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-center text-white/50 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
                    + Attach Expense
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "Invoices" && (
              <div className="space-y-4">
                {job.invoices?.map(inv => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="block bg-white/5 p-5 rounded-3xl border border-white/10 hover:bg-white/[0.07] transition-all group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between mb-3">
                      <div className="font-bold text-white text-lg">{inv.invoiceNumber || `INV-${inv.id}`}</div>
                      <div className="font-black text-white text-lg tabular-nums tracking-tight">{formatCurrency(inv.total)}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{inv.type} Invoice</div>
                      <StatusPill status={inv.status} />
                    </div>
                  </Link>
                ))}
                
                {(!job.invoices || job.invoices.length === 0) && (
                  <div className="text-center py-16 text-muted-foreground bg-white/5 rounded-3xl border border-white/10">
                    <FileText className="w-10 h-10 text-white/20 mx-auto mb-4" />
                    <p className="font-bold text-white text-lg mb-2">No invoices yet</p>
                    <p className="text-sm">Create an invoice to get paid.</p>
                  </div>
                )}

                <Link href={`/invoices/new?jobId=${job.id}`} className="block mt-6 w-full h-14 bg-primary text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                  <Plus className="w-5 h-5" /> Create Invoice
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Action Bar */}
      {activeTab === "Overview" && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-white/10 z-40">
          <div className="max-w-[480px] mx-auto flex gap-4">
            <Link href={`/invoices/new?jobId=${job.id}`} className="flex-1">
              <Button variant="outline" className="w-full h-14 rounded-xl font-bold border-white/20 bg-white/5 hover:bg-white/10 text-white">
                <FileText className="w-4 h-4 mr-2" /> Invoice
              </Button>
            </Link>
            {job.status !== "complete" && job.status !== "paid" && (
              <Button 
                onClick={handleMarkComplete}
                disabled={updateStatus.isPending}
                className="flex-1 h-14 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" /> Complete
              </Button>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
