import React from "react";
import { useGetTaxBenchmarks } from "@workspace/api-client-react";
import { AlertTriangle, BarChart2 } from "lucide-react";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

const STATUS_COLORS: Record<string, string> = {
  within: "#10b981", // emerald-500
  above: "#f59e0b", // amber-500
  below: "#3b82f6", // blue-500
  no_data: "#4b5563", // gray-600
};

interface RatioChartProps {
  label: string;
  userValue: number | null | undefined;
  benchmarkLow: number | null | undefined;
  benchmarkHigh: number | null | undefined;
  status: string;
  interpretation: string;
  auditTrigger: boolean;
}

function RatioChart({
  label,
  userValue,
  benchmarkLow,
  benchmarkHigh,
  status,
  interpretation,
  auditTrigger,
}: RatioChartProps) {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const hasData = userValue !== null && userValue !== undefined;
  const hasRange = benchmarkLow !== null && benchmarkLow !== undefined && benchmarkHigh !== null && benchmarkHigh !== undefined;

  const chartMax = Math.max(
    (benchmarkHigh ?? 0) * 1.6,
    (userValue ?? 0) * 1.4,
    0.1
  );

  const chartData = [{ name: label, value: hasData ? (userValue as number) * 100 : 0 }];

  const chartConfig: ChartConfig = {
    value: {
      label: label,
      color: STATUS_COLORS[status] ?? STATUS_COLORS.no_data,
    },
  };

  return (
    <div className="space-y-3 pb-6 border-b border-white/5 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <span className="font-bold text-sm text-white">{label}</span>
          {auditTrigger && (
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md">
              <AlertTriangle className="w-3 h-3" /> May attract ATO attention
            </div>
          )}
        </div>
        <span
          className="text-lg font-bold tabular-nums shrink-0"
          style={{ color: STATUS_COLORS[status] ?? STATUS_COLORS.no_data }}
        >
          {hasData ? pct(userValue as number) : "—"}
        </span>
      </div>

      <ChartContainer config={chartConfig} className="h-16 w-full aspect-auto mt-2">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, chartMax * 100]}
            hide
          />
          <YAxis type="category" dataKey="name" hide />
          {hasRange && (
            <ReferenceArea
              x1={(benchmarkLow as number) * 100}
              x2={(benchmarkHigh as number) * 100}
              fill="#10b981"
              fillOpacity={0.1}
              stroke="#10b981"
              strokeOpacity={0.2}
              strokeWidth={1}
              ifOverflow="extendDomain"
            />
          )}
          {hasRange && (
            <ReferenceLine
              x={(benchmarkLow as number) * 100}
              stroke="#10b981"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}
          {hasRange && (
            <ReferenceLine
              x={(benchmarkHigh as number) * 100}
              stroke="#10b981"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              strokeWidth={1}
            />
          )}
          <Bar dataKey="value" radius={4} barSize={24}>
            <Cell fill={STATUS_COLORS[status] ?? STATUS_COLORS.no_data} />
          </Bar>
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}%`, label]}
            cursor={false}
            contentStyle={{ backgroundColor: '#1C1C1E', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, borderRadius: 8, padding: '8px 12px' }}
            itemStyle={{ color: '#fff' }}
          />
        </BarChart>
      </ChartContainer>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground mt-1">
        {hasRange ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
            ATO band: {pct(benchmarkLow as number)}–{pct(benchmarkHigh as number)}
          </span>
        ) : (
          <span>No benchmark data for this ratio</span>
        )}
        <span>Your ratio: {hasData ? pct(userValue as number) : "no data"}</span>
      </div>

      <p className="text-xs text-white/60 leading-relaxed bg-white/5 p-3 rounded-xl">{interpretation}</p>
    </div>
  );
}

export default function BenchmarksTab() {
  const { data, isLoading, isError } = useGetTaxBenchmarks();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-center">
        <p className="text-red-400 font-medium text-sm">Could not load benchmarks. Try again later.</p>
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="bg-white/5 rounded-3xl p-8 border border-white/10 text-center space-y-4 relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <div className="relative">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <BarChart2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {data?.message ?? "Set your trade type"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed mb-6">
            ATO benchmarks compare your expense ratios to industry peers to identify audit risks.
          </p>
          {(!data?.industry || !data?.bandLabel) && (
            <Link href="/settings" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-black hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              Update Settings
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Industry + band header */}
      <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative z-10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">Industry Benchmark</div>
          <div className="text-2xl font-bold text-white mb-1">{data.industryLabel ?? data.industry}</div>
          {data.bandLabel && (
            <div className="text-sm font-medium text-white/80">Turnover band: {data.bandLabel}</div>
          )}
          <div className="text-xs font-medium text-primary/60 mt-4 border-t border-primary/20 pt-4">FY{data.financialYear} · ATO Small Business Benchmarks</div>
        </div>
      </div>

      {/* Audit warning */}
      {data.hasAuditTriggers && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="font-bold text-red-400 text-sm">Ratios outside safe band</div>
            <p className="text-sm text-red-400/80 mt-1.5 leading-relaxed">
              One or more ratios are outside the ATO safe range. Ensure all expenses are fully documented with receipts.
            </p>
          </div>
        </div>
      )}

      {/* Ratio charts */}
      <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-6 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground bg-[#1A1A1E] p-3 rounded-xl">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
            ATO safe range
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
            Within  
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 ml-2" />
            Above  
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 ml-2" />
            Below
          </span>
        </div>

        <div className="space-y-6">
          {data.ratios.map(ratio => (
            <RatioChart
              key={ratio.key}
              label={ratio.label}
              userValue={ratio.userValue}
              benchmarkLow={ratio.benchmarkLow}
              benchmarkHigh={ratio.benchmarkHigh}
              status={ratio.status}
              interpretation={ratio.interpretation}
              auditTrigger={ratio.auditTrigger}
            />
          ))}
        </div>
      </div>

      <p className="text-[11px] font-medium text-muted-foreground/60 text-center px-4 leading-relaxed pb-8">
        ATO benchmark ratios are for comparison only. Being outside the range doesn't automatically trigger an audit but may increase review risk.
      </p>
    </div>
  );
}
