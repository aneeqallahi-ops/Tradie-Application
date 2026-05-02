import React from "react";
import { useGetTaxPosition } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { ChevronRight, Receipt } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const lightStyles: Record<string, { dot: string; pill: string; label: string }> = {
  green: { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700", label: "On track" },
  amber: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700", label: "Watch" },
  red: { dot: "bg-red-500", pill: "bg-red-50 text-red-700", label: "Behind" },
  grey: { dot: "bg-gray-300", pill: "bg-gray-100 text-gray-600", label: "Building data" },
};

export function TaxPositionCard() {
  const { data, isLoading, isError, refetch } = useGetTaxPosition();

  if (isLoading) {
    return <div className="w-full h-32 bg-gray-200 animate-pulse rounded-2xl" />;
  }

  if (isError || !data) {
    return (
      <div className="w-full bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-red-400">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">What you'll owe</div>
        </div>
        <div className="text-sm text-gray-700 mb-3">Couldn't load your tax position.</div>
        <button
          onClick={() => refetch()}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const light = lightStyles[data.trafficLight] ?? lightStyles.grey;

  if (data.empty) {
    return (
      <div className="w-full bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-gray-300">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">What you'll owe</div>
        </div>
        <div className="text-sm text-gray-600">{data.message ?? "Need at least 30 days of activity."}</div>
      </div>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="w-full bg-white rounded-2xl p-5 shadow-sm border-l-4 border-l-primary text-left active:scale-[0.98] transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">What you'll owe</div>
                <div className="text-xs text-gray-500 mt-0.5">FY {data.financialYear}</div>
              </div>
            </div>
            <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${light.pill} flex items-center gap-1`}>
              <span className={`w-2 h-2 rounded-full ${light.dot}`} />
              {light.label}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold tracking-tight">{formatCurrency(data.taxOwedToday)}</div>
              <div className="text-xs text-gray-500 mt-1">owed today (YTD)</div>
            </div>
            <div className="text-right">
              <div className="text-base font-semibold">{formatCurrency(data.weeklySetAside)}/wk</div>
              <div className="text-xs text-gray-500 mt-1">to set aside</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <div className="text-xs text-gray-500">EOFY projection</div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold">{formatCurrency(data.projectedTotalTaxEoy)}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </button>
      </DrawerTrigger>
      <DrawerContent className="bg-white h-[88vh] rounded-t-[24px]">
        <div className="p-6 overflow-y-auto pb-24">
          <DrawerTitle className="text-2xl font-bold mb-2">What You'll Owe</DrawerTitle>
          <div className="text-sm text-gray-500 mb-6">Live calc · ATO FY {data.financialYear}</div>

          <div className={`rounded-2xl p-5 mb-6 ${light.pill}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${light.dot}`} />
              <span className="font-bold text-sm uppercase tracking-wider">{light.label}</span>
            </div>
            <div className="text-sm">{data.trafficLightReason}</div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Income (ex. GST) YTD</span>
              <span className="font-medium">{formatCurrency(data.ytdRevenueExGst)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Expenses YTD</span>
              <span className="text-red-600 font-medium">-{formatCurrency(data.ytdExpenses)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Vehicle deduction YTD</span>
              <span className="text-red-600 font-medium">-{formatCurrency(data.vehicleDeductionYtd ?? 0)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-100 pt-3">
              <span>Taxable income (YTD)</span>
              <span>{formatCurrency(data.taxableIncomeYtd ?? 0)}</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Income tax (YTD)</span>
              <span className="font-medium">{formatCurrency(data.incomeTaxYtd ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Medicare levy (YTD)</span>
              <span className="font-medium">{formatCurrency(data.medicareLevyYtd ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Low Income Tax Offset</span>
              <span className="text-emerald-700 font-medium">-{formatCurrency(data.litoYtd ?? 0)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-gray-100 pt-3 text-lg">
              <span>Owed today</span>
              <span>{formatCurrency(data.taxOwedToday)}</span>
            </div>
          </div>

          <div className="bg-secondary rounded-2xl p-5 mb-6">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">EOFY Projection</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Projected income</span><span className="font-medium">{formatCurrency(data.projectedAnnualIncome ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Projected total tax</span><span className="font-bold">{formatCurrency(data.projectedTotalTaxEoy)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Recommended set-aside</span><span className="font-bold">{(data.recommendedSetAsidePercent).toFixed(1)}%</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2"><span className="text-gray-500">Currently saved (Profit First)</span><span className="font-medium">{formatCurrency(data.currentSavings)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Save this week</span><span>{formatCurrency(data.weeklySetAside)}</span></div>
            </div>
          </div>

          {data.brackets && data.brackets.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bracket breakdown (YTD)</div>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {data.brackets.map((b, i) => (
                  <div key={i} className="flex justify-between text-sm p-3 border-b border-gray-50 last:border-b-0">
                    <span className="text-gray-600">{b.range} <span className="text-gray-400">({b.rate})</span></span>
                    <span className="font-medium">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] text-gray-400 mt-6">
            Estimate based on ATO FY {data.financialYear} brackets, Medicare levy and LITO. Not financial advice.
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
          <DrawerTrigger asChild>
            <Button className="w-full h-14 rounded-full text-lg font-semibold">Done</Button>
          </DrawerTrigger>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
