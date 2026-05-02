import React from "react";
import { useGetTaxBenchmarks } from "@workspace/api-client-react";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, BarChart2 } from "lucide-react";
import { Link } from "wouter";

function RatioBar({
  label,
  userValue,
  benchmarkLow,
  benchmarkHigh,
  status,
  interpretation,
  auditTrigger,
}: {
  label: string;
  userValue: number | null | undefined;
  benchmarkLow: number | null | undefined;
  benchmarkHigh: number | null | undefined;
  status: string;
  interpretation: string;
  auditTrigger: boolean;
}) {
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const barMax = Math.max((benchmarkHigh ?? 0) * 1.5, (userValue ?? 0) * 1.2, 0.01);

  const userPct = userValue !== null && userValue !== undefined ? (userValue / barMax) * 100 : null;
  const lowPct = benchmarkLow !== null && benchmarkLow !== undefined ? (benchmarkLow / barMax) * 100 : null;
  const highPct = benchmarkHigh !== null && benchmarkHigh !== undefined ? (benchmarkHigh / barMax) * 100 : null;

  const statusColor =
    status === "within" ? "text-green-600" :
    status === "above" ? "text-amber-600" :
    status === "below" ? "text-blue-600" : "text-gray-400";

  const StatusIcon =
    status === "within" ? CheckCircle2 :
    status === "above" ? TrendingUp :
    status === "below" ? TrendingDown : BarChart2;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusColor}`} />
          <span className="font-semibold text-sm text-primary">{label}</span>
          {auditTrigger && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" /> May attract ATO attention
            </span>
          )}
        </div>
        <span className={`text-sm font-bold ${statusColor}`}>
          {userValue !== null && userValue !== undefined ? pct(userValue) : "—"}
        </span>
      </div>

      {/* Bar chart */}
      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
        {/* ATO safe band */}
        {lowPct !== null && highPct !== null && (
          <div
            className="absolute top-0 bottom-0 bg-green-100 rounded-sm"
            style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
          />
        )}
        {/* User ratio marker */}
        {userPct !== null && (
          <div
            className={`absolute top-1 bottom-1 w-1 rounded-full ${
              status === "within" ? "bg-green-600" :
              status === "above" ? "bg-amber-500" : "bg-blue-500"
            }`}
            style={{ left: `${Math.min(userPct, 98)}%` }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-green-100 border border-green-300" />
            ATO band {benchmarkLow !== null && benchmarkLow !== undefined ? pct(benchmarkLow) : "—"}–{benchmarkHigh !== null && benchmarkHigh !== undefined ? pct(benchmarkHigh) : "—"}
          </span>
        </div>
        <span>Your ratio: {userValue !== null && userValue !== undefined ? pct(userValue) : "no data"}</span>
      </div>

      {/* Interpretation */}
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
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl" />
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
        {!data?.industry && (
          <Link href="/settings" className="text-sm text-accent font-medium hover:underline">
            Go to Settings →
          </Link>
        )}
        <p className="text-xs text-gray-400">
          ATO benchmarks compare your expense ratios to industry peers and help identify audit risks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Industry + band header */}
      <div className="bg-primary text-white rounded-2xl p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-300">Your industry benchmark</div>
        <div className="text-lg font-bold mt-1">{data.industryLabel ?? data.industry}</div>
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
              One or more of your expense ratios are more than 5% outside the ATO benchmark range. This can flag your return for review. Ensure you have receipts and records for all expenses.
            </p>
          </div>
        </div>
      )}

      {/* Ratio bars */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
          <span>Green band = ATO safe range</span>
          <span className="ml-2 inline-block w-1 h-4 rounded-full bg-green-500 align-middle" />
          <span>Marker = your ratio</span>
        </div>

        {data.ratios.map(ratio => (
          <RatioBar
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
        ATO benchmark ratios are for comparison only. Being outside the range doesn't automatically trigger an audit but may increase review risk. Ratios are based on your YTD figures.
      </p>
    </div>
  );
}
