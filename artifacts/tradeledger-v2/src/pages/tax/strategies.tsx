import React, { useState } from "react";
import { useGetTaxStrategies } from "@workspace/api-client-react";
import { TrendingUp, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, MessageSquare } from "lucide-react";
import { Link } from "wouter";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  deduction: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  vehicle: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  super: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  benchmarks: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  compliance: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  cashflow: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
  deduction: "Deduction",
  vehicle: "Vehicle",
  super: "Super",
  benchmarks: "Benchmarks",
  compliance: "Compliance",
  cashflow: "Cash Flow",
};

function fmtDollars(n: number) {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

interface StrategyCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedSaving: number;
  deadline: string | null | undefined;
  atoReference: string;
  atoReferenceUrl: string;
  talkToCpa: boolean;
  advisoryUrl: string;
  isRisk: boolean;
}

function StrategyCard({
  title,
  description,
  category,
  estimatedSaving,
  deadline,
  atoReference,
  atoReferenceUrl,
  talkToCpa,
  advisoryUrl,
  isRisk,
}: StrategyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.deduction;
  const catLabel = CATEGORY_LABELS[category] ?? category;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
              {catLabel}
            </span>
            {isRisk && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> Risk
              </span>
            )}
            {deadline && (
              <span className="text-[10px] text-gray-500 font-medium">
                📅 {deadline}
              </span>
            )}
          </div>
          <div className="font-semibold text-primary text-sm leading-tight">{title}</div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className={`text-base font-black ${isRisk ? "text-red-600" : "text-green-600"}`}>
            {isRisk ? `${fmtDollars(estimatedSaving)} risk` : `${fmtDollars(estimatedSaving)} saving`}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>

          <div className="flex flex-wrap gap-2">
            <a
              href={atoReferenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-blue-600 font-medium hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {atoReference}
            </a>
          </div>

          {talkToCpa && (
            <Link href={advisoryUrl}>
              <button className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-semibold py-3 rounded-xl mt-1">
                <MessageSquare className="w-4 h-4" />
                Talk to your CPA
              </button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function StrategiesTab() {
  const { data, isLoading, isError } = useGetTaxStrategies();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
        <p className="text-red-700 font-medium text-sm">Could not load strategies. Try again later.</p>
      </div>
    );
  }

  if (!data || data.empty || data.strategies.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center space-y-3">
        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <p className="font-semibold text-primary">
          {data?.message ?? "Log more activity to unlock personalised strategies."}
        </p>
        <p className="text-xs text-gray-400 max-w-xs mx-auto">
          Strategies are unlocked once you have revenue, expenses, and a trade type configured.
        </p>
        <Link href="/settings">
          <span className="text-sm text-accent font-medium hover:underline">Go to Settings →</span>
        </Link>
      </div>
    );
  }

  const savings = data.strategies.filter(s => !s.isRisk);
  const risks = data.strategies.filter(s => s.isRisk);
  const totalSaving = data.totalPotentialSaving;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="bg-primary text-white rounded-2xl p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-0.5">Total potential saving</div>
        <div className="text-3xl font-black">{fmtDollars(totalSaving)}</div>
        <div className="text-sm text-gray-300 mt-0.5">
          {data.strategies.length} strateg{data.strategies.length === 1 ? "y" : "ies"} identified for FY{data.financialYear}
        </div>
      </div>

      {/* Savings strategies */}
      {savings.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            Opportunities to reduce tax
          </div>
          {savings.map(s => (
            <StrategyCard key={s.id} {...s} />
          ))}
        </div>
      )}

      {/* Risk strategies */}
      {risks.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            Risks to address
          </div>
          {risks.map(s => (
            <StrategyCard key={s.id} {...s} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center px-2">
        Estimated savings are indicative only, based on your current data and 2025–26 tax rates. Consult a registered tax agent before acting.
      </p>
    </div>
  );
}
