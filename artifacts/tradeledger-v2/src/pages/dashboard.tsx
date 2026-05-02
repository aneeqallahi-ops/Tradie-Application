import React from "react";
import { useGetDashboard, useGetTparSummary, useGetTaxPrompts } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatusPill } from "@/components/status-pill";
import { ChevronRight, Plus, FileText, Camera, Navigation, Lightbulb, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

function fmtBasDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard();
  const { data: tpar } = useGetTparSummary();
  const { data: prompts } = useGetTaxPrompts();

  if (isLoading || !data) {
    return (
      <Layout>
        <Header title="Overview" />
        <div className="p-5 space-y-6">
          <div className="h-32 bg-white/5 animate-pulse rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/5 animate-pulse rounded-3xl" />)}
          </div>
        </div>
      </Layout>
    );
  }

  const { thisMonthInvoiced, lastMonthInvoiced, pendingQuotesCount, activeJobsCount, unpaidInvoicesCount, unpaidAmount, financialSummary, basPosition, recentJobs } = data;

  const momPercent = lastMonthInvoiced ? ((thisMonthInvoiced - lastMonthInvoiced) / lastMonthInvoiced) * 100 : 0;
  const isBasUrgent = basPosition.daysUntilDue <= 28;

  return (
    <Layout>
      <Header title="Overview" />
      
      <div className="px-5 pb-6 space-y-8">
        
        {/* Hero Value — WYAK */}
        <Drawer>
          <DrawerTrigger asChild>
            <motion.button 
              whileTap={{ scale: 0.98 }}
              className="w-full relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-6 text-left shadow-2xl"
            >
              <div className="absolute top-0 right-0 p-6 opacity-20 text-primary pointer-events-none">
                <TrendingUp className="w-32 h-32 -mt-8 -mr-8" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(26,219,165,0.8)]" />
                  <span className="text-[11px] font-bold text-primary tracking-widest uppercase">Est. Take Home</span>
                </div>
                <div className="text-5xl font-black text-white tracking-tighter mb-2">{formatCurrency(financialSummary.takeHome)}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/50">{financialSummary.financialYear} Financial Year</span>
                  <div className="flex items-center gap-1 text-primary text-sm font-semibold">
                    Details <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.button>
          </DrawerTrigger>
          <DrawerContent className="bg-card border-white/10 rounded-t-[2rem] max-h-[90vh]">
            <div className="p-6 overflow-y-auto pb-24">
              <DrawerTitle className="text-2xl font-bold text-white mb-8">Take Home Breakdown</DrawerTitle>
              
              <div className="space-y-6">
                <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 font-medium">Invoiced YTD</span>
                    <span className="text-white font-bold">{formatCurrency(financialSummary.totalInvoicedFy)}</span>
                  </div>
                  <div className="flex justify-between items-center text-destructive">
                    <span className="font-medium">GST Collected</span>
                    <span className="font-bold">-{formatCurrency(financialSummary.gstCollected)}</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Actual Income</span>
                    <span className="text-white font-bold text-lg">{formatCurrency(financialSummary.actualIncome)}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-destructive">
                    <span className="font-medium">Business Expenses</span>
                    <span className="font-bold">-{formatCurrency(financialSummary.businessExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center text-destructive">
                    <span className="font-medium">Vehicle Deduction</span>
                    {financialSummary.vehicleDeduction > 0 ? (
                      <span className="font-bold">-{formatCurrency(financialSummary.vehicleDeduction)}</span>
                    ) : (
                      <Link href="/logbook" className="text-primary font-bold hover:underline">Set up logbook →</Link>
                    )}
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">Taxable Income</span>
                    <span className="text-white font-bold text-lg">{formatCurrency(financialSummary.taxableIncome)}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-destructive">
                    <span className="font-medium">Est. Tax & Medicare</span>
                    <span className="font-bold">-{formatCurrency(financialSummary.estimatedIncomeTax + financialSummary.medicareLevy)}</span>
                  </div>
                  <div className="h-px bg-white/10 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-bold">You Keep (Est.)</span>
                    <span className="text-primary font-black text-2xl">{formatCurrency(financialSummary.takeHome)}</span>
                  </div>
                </div>

                {/* Profit First Bar */}
                <div className="mt-8">
                  <h4 className="text-sm font-bold text-white mb-4">Target Allocation (per $1)</h4>
                  <div className="flex w-full h-6 rounded-full overflow-hidden bg-white/10 shadow-inner">
                    <div className="bg-primary transition-all duration-1000" style={{ width: `${financialSummary.yoursPercent}%` }} />
                    <div className="bg-amber-400 transition-all duration-1000" style={{ width: `${financialSummary.expensesPercent}%` }} />
                    <div className="bg-destructive transition-all duration-1000" style={{ width: `${financialSummary.taxPercent}%` }} />
                  </div>
                  <div className="flex justify-between mt-3 text-xs font-bold uppercase tracking-wider">
                    <span className="text-primary">Yours {financialSummary.yoursPercent}%</span>
                    <span className="text-amber-400">Exp {financialSummary.expensesPercent}%</span>
                    <span className="text-destructive">Tax {financialSummary.taxPercent}%</span>
                  </div>
                </div>

              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-white/5">
              <DrawerTrigger asChild>
                <Button className="w-full h-14 rounded-2xl text-lg font-bold bg-primary text-background hover:bg-primary/90">Done</Button>
              </DrawerTrigger>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-3">
          <Link href="/quotes/new" className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-primary/50 transition-all active:scale-95">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Quote</span>
          </Link>
          <Link href="/jobs" className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-primary/50 transition-all active:scale-95">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Invoice</span>
          </Link>
          <Link href="/expenses/new" className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-primary/50 transition-all active:scale-95">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Receipt</span>
          </Link>
          <Link href="/logbook" className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-primary/50 transition-all active:scale-95">
              <Navigation className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Drive</span>
          </Link>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">This Month</div>
            <div className="text-2xl font-bold text-white">{formatCurrency(thisMonthInvoiced)}</div>
            <div className={`text-xs mt-2 font-semibold ${momPercent >= 0 ? "text-primary" : "text-destructive"}`}>
              {momPercent >= 0 ? "+" : ""}{formatPercent(momPercent)} vs last
            </div>
          </div>
          
          <Link href="/jobs" className={`bg-white/5 border rounded-3xl p-5 hover:bg-white/10 transition-colors ${unpaidInvoicesCount > 0 ? "border-destructive/50" : "border-white/10"}`}>
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Awaiting Payment</div>
            <div className="text-2xl font-bold text-white">{unpaidInvoicesCount} <span className="text-sm font-medium text-white/40">inv</span></div>
            {unpaidAmount > 0 && <div className="text-xs text-destructive font-bold mt-2">{formatCurrency(unpaidAmount)} total</div>}
          </Link>

          <Link href="/quotes" className="bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/10 transition-colors">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Pending Quotes</div>
            <div className="text-2xl font-bold text-white">{pendingQuotesCount}</div>
          </Link>

          <Link href="/jobs" className="bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/10 transition-colors">
            <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Active Jobs</div>
            <div className="text-2xl font-bold text-white">{activeJobsCount}</div>
          </Link>
        </div>

        {/* BAS Warning */}
        <div className={`rounded-3xl p-5 border relative overflow-hidden ${isBasUrgent ? 'bg-destructive/10 border-destructive/30' : 'bg-white/5 border-white/10'}`}>
          {isBasUrgent && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/20 blur-3xl pointer-events-none rounded-full" />
          )}
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider mb-1 text-white/50">Q{basPosition.quarter} BAS Due</div>
              <div className="font-bold text-white">{fmtBasDate(basPosition.dueDate)}</div>
              <div className={`text-sm mt-1 font-semibold ${isBasUrgent ? 'text-destructive' : 'text-primary'}`}>
                In {basPosition.daysUntilDue} days
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">Est. GST</div>
              <div className="font-bold text-xl text-white">{formatCurrency(basPosition.netGstPayable)}</div>
            </div>
          </div>
        </div>

        {/* Missed Deductions Alert */}
        {prompts && prompts.missedDeductions.length > 0 && (
          <Link href="/tax" className="block bg-primary/10 border border-primary/30 rounded-3xl p-5 hover:bg-primary/20 transition-colors relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-white text-lg">
                  {prompts.missedDeductions.length} deduction{prompts.missedDeductions.length !== 1 ? "s" : ""} to claim
                </div>
                <div className="text-sm text-white/70 mt-1 leading-relaxed">
                  {prompts.missedDeductions.slice(0, 2).map(d => d.label).join(", ")}
                  {prompts.missedDeductions.length > 2 ? " & more" : ""}
                </div>
                <div className="text-xs font-bold text-primary uppercase tracking-wider mt-3">Review Now →</div>
              </div>
            </div>
          </Link>
        )}

        {/* Recent Jobs */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
            {recentJobs.length === 0 ? (
              <div className="p-8 text-center text-white/40 font-medium">No recent activity</div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentJobs.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block p-5 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-white truncate pr-4">{job.title}</div>
                      <div className="font-bold text-white shrink-0">{job.total ? formatCurrency(job.total) : "—"}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-white/50">{job.client?.name}</div>
                      <StatusPill status={job.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
