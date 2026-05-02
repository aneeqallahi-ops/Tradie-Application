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
  within: "#16a34a",
  above: "#d97706",
  below: "#2563eb",
  no_data: "#9ca3af",
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-primary">{label}</span>
          {auditTrigger && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> May attract ATO attention
            </span>
          )}
        </div>
        <span
          className="text-sm font-bold"
          style={{ color: STATUS_COLORS[status] ?? STATUS_COLORS.no_data }}
        >
          {hasData ? pct(userValue as number) : "—"}
        </span>
      </div>

      <ChartContainer config={chartConfig} className="h-14 w-full aspect-auto">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, chartMax * 100]}
            hide
          />
          <YAxis type="category" dataKey="name" hide />
          {/* ATO safe band shaded */}
          {hasRange && (
            <ReferenceArea
              x1={(benchmarkLow as number) * 100}
              x2={(benchmarkHigh as number) * 100}
              fill="#dcfce7"
              stroke="#86efac"
              strokeWidth={1}
              ifOverflow="extendDomain"
            />
          )}
          {/* Benchmark low/high lines */}
          {hasRange && (
            <ReferenceLine
              x={(benchmarkLow as number) * 100}
              stroke="#16a34a"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          {hasRange && (
            <ReferenceLine
              x={(benchmarkHigh as number) * 100}
              stroke="#16a34a"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          <Bar dataKey="value" radius={4} barSize={24}>
            <Cell fill={STATUS_COLORS[status] ?? STATUS_COLORS.no_data} />
          </Bar>
          <Tooltip
            formatter={(value: number) => [`${value.toFixed(1)}%`, label]}
            cursor={false}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
        </BarChart>
      </ChartContainer>

      <div className="flex items-center justify-between text-[10px] text-gray-400">
        {hasRange ? (
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-green-100 border border-green-300" />
            ATO band: {pct(benchmarkLow as number)}–{pct(benchmarkHigh as number)}
          </span>
        ) : (
          <span>No benchmark data for this ratio</span>
        )}
        <span>Your ratio: {hasData ? pct(userValue as number) : "no data"}</span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{interpretation}</p>
    </div>
  );
}

export default function BenchmarksTab() {
  const { data, isLoading, isError } = useGetTaxBenchmarks();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
        <p className="text-red-700 font-medium text-sm">Could not load benchmarks. Try again later.</p>
      </div>
    );
  }

  if (!data || data.empty) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-3">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto">
          <BarChart2 className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-primary">
          {data?.message ?? "Set your trade type to see benchmarks."}
        </p>
        {(!data?.industry || !data?.bandLabel) && (
          <Link href="/settings" className="text-sm text-accent font-medium hover:underline">
            Go to Settings →
          </Link>
        )}
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          ATO benchmarks compare your expense ratios to industry peers and help identify audit risks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Industry + band header */}
      <div className="bg-primary text-white rounded-2xl p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-0.5">Your industry benchmark</div>
        <div className="text-lg font-bold">{data.industryLabel ?? data.industry}</div>
        {data.bandLabel && (
          <div className="text-sm text-gray-300 mt-0.5">Turnover band: {data.bandLabel}</div>
        )}
        <div className="text-xs text-gray-400 mt-1">FY{data.financialYear} · ATO Small Business Benchmarks</div>
      </div>

      {/* Audit warning */}
      {data.hasAuditTriggers && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <div className="font-bold text-red-800 text-sm">Ratios outside the ATO safe band</div>
            <p className="text-xs text-red-700 mt-1">
              One or more ratios are more than 5% outside the ATO safe range. Ensure all
              expenses are fully documented with receipts.
            </p>
          </div>
        </div>
      )}

      {/* Ratio charts */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-green-100 border border-green-300" />
            Green shaded = ATO safe range
          </span>
          <span className="flex items-center gap-1 ml-2">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-600" />
            = within  
            <span className="inline-block w-3 h-3 rounded-sm bg-amber-500 ml-1" />
            = above  
            <span className="inline-block w-3 h-3 rounded-sm bg-blue-600 ml-1" />
            = below
          </span>
        </div>

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

      <p className="text-[10px] text-gray-400 text-center px-2">
        ATO benchmark ratios are for comparison only. Being outside the range doesn't automatically trigger an audit but may increase review risk.
      </p>
    </div>
  );
}
