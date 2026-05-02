import React, { useState } from "react";
import { useGetDashboard, useGetTparSummary, useGetTaxPrompts } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { formatCurrency, formatPercent } from "@/lib/format";
import { StatusPill } from "@/components/status-pill";
import { ChevronRight, Info, Plus, FileText, Camera, Navigation, X, CalendarClock, Users, Lightbulb } from "lucide-react";
import { Link } from "wouter";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { TaxPositionCard } from "@/components/tax-position-card";

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
        <Header title="TradeLedger" />
        <div className="p-5 space-y-4">
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
          <div className="h-40 bg-gray-200 animate-pulse rounded-2xl mt-4" />
        </div>
      </Layout>
    );
  }

  const { thisMonthInvoiced, lastMonthInvoiced, pendingQuotesCount, activeJobsCount, unpaidInvoicesCount, unpaidAmount, financialSummary, basPosition, recentJobs } = data;

  const momPercent = lastMonthInvoiced ? ((thisMonthInvoiced - lastMonthInvoiced) / lastMonthInvoiced) * 100 : 0;
  const isBasUrgent = basPosition.daysUntilDue <= 28;

  return (
    <Layout>
      <Header title="TradeLedger" />
      
      <div className="px-5 pb-6 space-y-6">
        {/* FY Selector */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm">
            <button className="text-gray-400 hover:text-primary">&lt;</button>
            <span className="font-semibold text-sm">{financialSummary.financialYear}</span>
            <button className="text-gray-400 hover:text-primary">&gt;</button>
          </div>
        </div>

        {/* 2x2 Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary text-white rounded-2xl p-4 flex flex-col justify-between shadow-sm">
            <div className="text-sm text-gray-300 font-medium">This month</div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{formatCurrency(thisMonthInvoiced)}</div>
              <div className={`text-xs mt-1 ${momPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                {momPercent >= 0 ? "+" : ""}{formatPercent(momPercent)} vs last
              </div>
            </div>
          </div>
          
          <Link href="/quotes" className="bg-white rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
            <div className="text-sm text-gray-500 font-medium">Pending quotes</div>
            <div className="text-3xl font-bold mt-2">{pendingQuotesCount}</div>
          </Link>
          
          <Link href="/jobs" className="bg-white rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:bg-gray-50 active:scale-95 transition-all">
            <div className="text-sm text-gray-500 font-medium">Active Jobs</div>
            <div className="text-3xl font-bold mt-2">{activeJobsCount}</div>
          </Link>
          
          <Link href="/jobs" className={`bg-white rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:bg-gray-50 active:scale-95 transition-all ${unpaidInvoicesCount > 0 ? "border-l-4 border-l-red-600" : ""}`}>
            <div className="text-sm text-gray-500 font-medium">Unpaid</div>
            <div className="mt-2">
              <div className="text-2xl font-bold">{unpaidInvoicesCount}</div>
              {unpaidAmount > 0 && <div className="text-xs text-red-600 font-semibold mt-1">{formatCurrency(unpaidAmount)}</div>}
            </div>
          </Link>
        </div>

        {/* WYAK Card */}
        <Drawer>
          <DrawerTrigger asChild>
            <button className="w-full bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-accent flex items-center justify-between text-left active:scale-[0.98] transition-all">
              <div>
                <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">What you actually keep</div>
                <div className="text-3xl font-bold mt-1 tracking-tight">{formatCurrency(financialSummary.takeHome)}</div>
                <div className="text-sm text-gray-500 mt-1">Estimated · {financialSummary.financialYear}</div>
              </div>
              <ChevronRight className="text-gray-300 w-6 h-6" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-white h-[88vh] rounded-t-[24px]">
            <div className="p-6 overflow-y-auto pb-24">
              <div className="flex items-center justify-between mb-6">
                <DrawerTitle className="text-2xl font-bold">Your Money, Simplified</DrawerTitle>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total invoiced ({financialSummary.financialYear})</span>
                    <span className="font-medium">{formatCurrency(financialSummary.totalInvoicedFy)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Minus GST collected</span>
                    <span className="text-red-600 font-medium">-{formatCurrency(financialSummary.gstCollected)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-gray-100 pt-3">
                    <span>Your actual income</span>
                    <span>{formatCurrency(financialSummary.actualIncome)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Business expenses</span>
                    <span className="text-red-600 font-medium">-{formatCurrency(financialSummary.businessExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Vehicle deduction</span>
                    {financialSummary.vehicleDeduction > 0 ? (
                      <span className="text-red-600 font-medium">-{formatCurrency(financialSummary.vehicleDeduction)}</span>
                    ) : (
                      <Link href="/logbook" className="text-accent font-medium hover:underline">Set up logbook →</Link>
                    )}
                  </div>
                  <div className="flex justify-between font-semibold border-t border-gray-100 pt-3">
                    <span>Taxable income</span>
                    <span>{formatCurrency(financialSummary.taxableIncome)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-500 flex items-center gap-1">
                      Estimated income tax & medicare
                      <Info className="w-3.5 h-3.5 text-gray-400" />
                    </span>
                    <span className="text-red-600 font-medium">-{formatCurrency(financialSummary.estimatedIncomeTax + financialSummary.medicareLevy)}</span>
                  </div>
                </div>

                <div className="bg-secondary rounded-2xl p-6 mt-6">
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">You keep approximately</div>
                  <div className="text-5xl font-bold tracking-tight">{formatCurrency(financialSummary.takeHome)}</div>
                  <div className="text-xs text-gray-400 mt-3">This is an estimate based on current tax rates and does not constitute financial advice.</div>
                  
                  <div className="flex w-full h-4 rounded-full overflow-hidden mt-6 bg-gray-100">
                    <div className="bg-[#86EFAC]" style={{ width: `${financialSummary.yoursPercent}%` }} />
                    <div className="bg-[#FDE68A]" style={{ width: `${financialSummary.expensesPercent}%` }} />
                    <div className="bg-[#FCA5A5]" style={{ width: `${financialSummary.taxPercent}%` }} />
                  </div>
                  <div className="flex w-full text-[10px] uppercase font-bold text-gray-500 mt-2">
                    {financialSummary.yoursPercent > 0 && (
                      <div className="flex items-center gap-1 min-w-0" style={{ width: `${financialSummary.yoursPercent}%` }}>
                        <span className="w-2 h-2 rounded-full bg-[#86EFAC] flex-shrink-0" />
                        <span className="truncate">Yours {financialSummary.yoursPercent}%</span>
                      </div>
                    )}
                    {financialSummary.expensesPercent > 0 && (
                      <div className="flex items-center gap-1 min-w-0 justify-center" style={{ width: `${financialSummary.expensesPercent}%` }}>
                        <span className="w-2 h-2 rounded-full bg-[#FDE68A] flex-shrink-0" />
                        <span className="truncate">Exp {financialSummary.expensesPercent}%</span>
                      </div>
                    )}
                    {financialSummary.taxPercent > 0 && (
                      <div className="flex items-center gap-1 min-w-0 justify-end" style={{ width: `${financialSummary.taxPercent}%` }}>
                        <span className="w-2 h-2 rounded-full bg-[#FCA5A5] flex-shrink-0" />
                        <span className="truncate">Tax {financialSummary.taxPercent}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`rounded-2xl p-5 border ${isBasUrgent ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">Q{basPosition.quarter} BAS due {fmtBasDate(basPosition.dueDate)}</div>
                      <div className={`text-sm mt-1 ${isBasUrgent ? 'text-amber-800 font-medium' : 'text-gray-500'}`}>
                        {basPosition.daysUntilDue} days away
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Est. GST Payable</div>
                      <div className="font-bold text-lg">{formatCurrency(basPosition.netGstPayable)}</div>
                    </div>
                  </div>
                  {isBasUrgent && (
                    <Button className="w-full mt-4 bg-accent hover:bg-accent/90 text-white rounded-full h-12">
                      Lodge for $79
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
              <DrawerTrigger asChild>
                <Button className="w-full h-14 rounded-full text-lg font-semibold">Done</Button>
              </DrawerTrigger>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Tax Position — What You'll Owe */}
        <TaxPositionCard />

        {/* Missed Deductions Card */}
        {prompts && prompts.missedDeductions.length > 0 && (
          <Link href="/tax" className="block bg-blue-50 border border-blue-200 rounded-2xl p-4 hover:bg-blue-100 active:scale-[0.98] transition-all">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-blue-900 text-sm">
                  {prompts.missedDeductions.length} deduction{prompts.missedDeductions.length !== 1 ? "s" : ""} you might have missed
                </div>
                <div className="text-xs text-blue-700 mt-0.5 line-clamp-1">
                  {prompts.missedDeductions.slice(0, 3).map(d => d.label).join(", ")}
                  {prompts.missedDeductions.length > 3 ? " & more" : ""}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
            </div>
          </Link>
        )}

        {/* Quick Actions */}
        <div className="bg-secondary rounded-2xl p-2 flex justify-between">
          <Link href="/quotes/new" className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white flex-1 transition-colors">
            <Plus className="w-6 h-6 mb-1 text-primary" />
            <span className="text-xs font-semibold">New Quote</span>
          </Link>
          <Link href="/jobs" className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white flex-1 transition-colors">
            <FileText className="w-6 h-6 mb-1 text-primary" />
            <span className="text-xs font-semibold">Invoice</span>
          </Link>
          <Link href="/expenses/new" className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white flex-1 transition-colors">
            <Camera className="w-6 h-6 mb-1 text-primary" />
            <span className="text-xs font-semibold">Scan</span>
          </Link>
          <Link href="/logbook" className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-white flex-1 transition-colors">
            <Navigation className="w-6 h-6 mb-1 text-primary" />
            <span className="text-xs font-semibold">Log Trip</span>
          </Link>
        </div>

        {/* Compliance Section */}
        <div>
          <h3 className="text-lg font-bold mb-3">Compliance</h3>
          <div className="space-y-3">

            {/* BAS Card */}
            <div className={`rounded-2xl p-4 shadow-sm border bg-white ${isBasUrgent ? 'border-l-4 border-l-accent border-gray-100' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary shrink-0">
                    <CalendarClock className={`w-5 h-5 ${isBasUrgent ? 'text-accent' : 'text-primary'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[15px] text-primary">
                      Q{basPosition.quarter} BAS Due
                    </div>
                    <div className={`text-xs mt-0.5 font-medium ${isBasUrgent ? 'text-accent' : 'text-gray-500'}`}>
                      {fmtBasDate(basPosition.dueDate)} · {basPosition.daysUntilDue} days away
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Est. GST</div>
                  <div className="font-bold text-base mt-0.5 text-primary">
                    {formatCurrency(basPosition.netGstPayable)}
                  </div>
                </div>
              </div>
            </div>

            {/* TPAR / Subcontractor Payments Card */}
            <Link href="/subcontractors" className="block rounded-2xl p-4 shadow-sm border border-gray-100 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[15px] text-primary">TPAR</div>
                    <div className="text-xs mt-0.5 font-medium text-gray-500">
                      Due {tpar?.dueDate ?? "28 August"} · {tpar?.financialYear ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Paid to Subs</div>
                    <div className="font-bold text-base mt-0.5 text-primary">
                      {formatCurrency(tpar?.totalAmount ?? 0)}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {tpar?.subcontractors?.length ?? 0} contractor{(tpar?.subcontractors?.length ?? 0) !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              </div>
            </Link>

          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-lg font-bold mb-3">Recent Activity</h3>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {recentJobs.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No recent activity</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentJobs.map(job => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-[15px] text-primary truncate pr-2">{job.title}</div>
                      <div className="font-bold text-right shrink-0">{job.total ? formatCurrency(job.total) : "—"}</div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500">{job.client?.name}</div>
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
