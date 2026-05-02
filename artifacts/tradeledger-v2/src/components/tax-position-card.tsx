import React from "react";
import { useGetTaxPosition } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { ChevronRight, Receipt } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const lightStyles: Record<string, { dot: string; pill: string; label: string; text: string; bg: string; border: string }> = {
  green: { dot: "bg-emerald-400", pill: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", label: "On track", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  amber: { dot: "bg-amber-400", pill: "bg-amber-500/10 border-amber-500/20 text-amber-400", label: "Watch", text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  red: { dot: "bg-red-400", pill: "bg-red-500/10 border-red-500/20 text-red-400", label: "Behind", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  grey: { dot: "bg-white/40", pill: "bg-white/5 border-white/10 text-white/60", label: "Building data", text: "text-white/60", bg: "bg-white/5", border: "border-white/10" },
};

export function TaxPositionCard() {
  const { data, isLoading, isError, refetch } = useGetTaxPosition();

  if (isLoading) {
    return <div className="w-full h-36 bg-white/5 animate-pulse rounded-3xl border border-white/10" />;
  }

  if (isError || !data) {
    return (
      <div className="w-full bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">What you'll owe</div>
        </div>
        <div className="text-sm text-white/80 mb-4">Couldn't load your tax position.</div>
        <button
          onClick={() => refetch()}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  const light = lightStyles[data.trafficLight] ?? lightStyles.grey;

  if (data.empty) {
    return (
      <div className="w-full bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">What you'll owe</div>
        </div>
        <div className="text-sm text-white/80">{data.message ?? "Need at least 30 days of activity."}</div>
      </div>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="w-full bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 text-left active:scale-[0.98] transition-all relative overflow-hidden group hover:bg-white/10">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
          
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase">What you'll owe</div>
                <div className="text-xs font-medium text-white/60 mt-0.5">FY {data.financialYear}</div>
              </div>
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${light.pill} flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${light.dot}`} />
              {light.label}
            </div>
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <div className="text-4xl font-bold tracking-tight text-white mb-1">{formatCurrency(data.taxOwedToday)}</div>
              <div className="text-xs font-medium text-muted-foreground">Owed today (YTD)</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white mb-1">{formatCurrency(data.weeklySetAside)}<span className="text-sm font-medium text-muted-foreground">/wk</span></div>
              <div className="text-xs font-medium text-muted-foreground">To set aside</div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="text-xs font-medium text-muted-foreground">EOFY projection</div>
            <div className="flex items-center gap-1.5 group-hover:text-primary transition-colors">
              <span className="text-sm font-bold text-white group-hover:text-primary">{formatCurrency(data.projectedTotalTaxEoy)}</span>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-primary" />
            </div>
          </div>
        </button>
      </DrawerTrigger>
      
      <DrawerContent className="bg-[#1C1C1E] border-white/10 h-[88vh] rounded-t-[32px]">
        <div className="p-6 overflow-y-auto pb-28">
          <DrawerTitle className="text-2xl font-bold text-white mb-1">What You'll Owe</DrawerTitle>
          <div className="text-sm font-medium text-muted-foreground mb-8">Live calculation · ATO FY {data.financialYear}</div>

          <div className={`rounded-2xl p-5 mb-8 border ${light.pill}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${light.dot}`} />
              <span className="font-bold text-sm uppercase tracking-wider">{light.label}</span>
            </div>
            <div className="text-sm leading-relaxed opacity-90">{data.trafficLightReason}</div>
          </div>

          <div className="space-y-4 mb-8 bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Income & Deductions</div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Income (ex. GST) YTD</span>
              <span className="font-semibold text-white">{formatCurrency(data.ytdRevenueExGst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Expenses YTD</span>
              <span className="text-white font-semibold">-{formatCurrency(data.ytdExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Vehicle deduction YTD</span>
              <span className="text-white font-semibold">-{formatCurrency(data.vehicleDeductionYtd ?? 0)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-white/10 pt-4 mt-2">
              <span className="text-white">Taxable income (YTD)</span>
              <span className="text-white">{formatCurrency(data.taxableIncomeYtd ?? 0)}</span>
            </div>
          </div>

          <div className="space-y-4 mb-8 bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Tax Calculation</div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Income tax (YTD)</span>
              <span className="font-semibold text-white">{formatCurrency(data.incomeTaxYtd ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Medicare levy (YTD)</span>
              <span className="font-semibold text-white">{formatCurrency(data.medicareLevyYtd ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Low Income Tax Offset</span>
              <span className="text-emerald-400 font-semibold">-{formatCurrency(data.litoYtd ?? 0)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-white/10 pt-4 mt-2 text-lg">
              <span className="text-white">Owed today</span>
              <span className="text-primary">{formatCurrency(data.taxOwedToday)}</span>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-8">
            <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-4">EOFY Projection</div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-white/60">Projected income</span><span className="font-semibold text-white">{formatCurrency(data.projectedAnnualIncome ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Projected total tax</span><span className="font-bold text-white">{formatCurrency(data.projectedTotalTaxEoy)}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Recommended set-aside</span><span className="font-bold text-white">{(data.recommendedSetAsidePercent).toFixed(1)}%</span></div>
              <div className="flex justify-between border-t border-primary/20 pt-3 mt-1"><span className="text-white/60">Currently saved (Profit First)</span><span className="font-semibold text-white">{formatCurrency(data.currentSavings)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-1 text-white"><span>Save this week</span><span className="text-primary">{formatCurrency(data.weeklySetAside)}</span></div>
            </div>
          </div>

          {data.brackets && data.brackets.length > 0 && (
            <div className="mb-6">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Bracket breakdown (YTD)</div>
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                {data.brackets.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{b.range}</span>
                      <span className="text-xs text-white/50">{b.rate}</span>
                    </div>
                    <span className="font-bold text-white">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] font-medium text-muted-foreground/60 leading-relaxed text-center px-4">
            Estimate based on ATO FY {data.financialYear} brackets, Medicare levy and LITO. Not financial advice.
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/10">
          <DrawerTrigger asChild>
            <Button className="w-full h-14 rounded-xl text-lg font-bold bg-white text-black hover:bg-white/90">
              Close
            </Button>
          </DrawerTrigger>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
