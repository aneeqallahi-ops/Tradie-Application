import React, { useState } from "react";
import { useGetTaxStrategies } from "@workspace/api-client-react";
import { TrendingUp, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  deduction: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  vehicle: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  super: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  benchmarks: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  compliance: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  cashflow: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
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
  deadline?: string | null | undefined;
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
    <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-md transition-colors hover:bg-white/[0.07]">
      {/* Header */}
      <button
        className="w-full text-left p-5 flex items-start gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${colors.bg} ${colors.text} ${colors.border}`}>
              {catLabel}
            </span>
            {isRisk && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Risk
              </span>
            )}
            {deadline && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-white/5 border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <span>📅</span> {deadline}
              </span>
            )}
          </div>
          <div className="font-bold text-white text-base leading-snug">{title}</div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
          <div className={`text-lg font-black tracking-tight ${isRisk ? "text-red-400" : "text-primary"}`}>
            {isRisk ? `${fmtDollars(estimatedSaving)} risk` : `${fmtDollars(estimatedSaving)} saving`}
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            {expanded ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-white" />}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-4">
              <p className="text-sm text-white/70 leading-relaxed">{description}</p>

              <div className="flex flex-wrap gap-2">
                <a
                  href={atoReferenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary/80 font-medium hover:text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {atoReference}
                </a>
              </div>

              <Link href={advisoryUrl}>
                <button className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-bold h-12 rounded-xl mt-2 hover:bg-white/90 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  Talk to your CPA
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StrategiesTab() {
  const { data, isLoading, isError } = useGetTaxStrategies();

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
        <p className="text-red-400 font-medium text-sm">Could not load strategies. Try again later.</p>
      </div>
    );
  }

  if (!data || data.empty || data.strategies.length === 0) {
    return (
      <div className="bg-white/5 rounded-3xl p-8 border border-white/10 text-center space-y-4 relative overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <div className="relative">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {data?.message ?? "Log more activity to unlock"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed mb-6">
            Strategies are unlocked once you have revenue, expenses, and a trade type configured.
          </p>
          <Link href="/settings" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-black hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            Update Settings
          </Link>
        </div>
      </div>
    );
  }

  const savings = data.strategies
    .filter(s => !s.isRisk)
    .sort((a, b) => b.estimatedSaving - a.estimatedSaving);
  const risks = data.strategies
    .filter(s => s.isRisk)
    .sort((a, b) => b.estimatedSaving - a.estimatedSaving);
  const totalSaving = data.totalPotentialSaving;

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
        <div className="relative z-10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">Total potential saving</div>
          <div className="text-4xl font-black tracking-tight text-white mb-1">{fmtDollars(totalSaving)}</div>
          <div className="text-sm font-medium text-white/80">
            {data.strategies.length} strateg{data.strategies.length === 1 ? "y" : "ies"} identified for FY{data.financialYear}
          </div>
        </div>
      </div>

      {/* Savings strategies */}
      {savings.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
            Opportunities to reduce tax
          </div>
          <div className="grid gap-4">
            {savings.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <StrategyCard {...s} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Risk strategies */}
      {risks.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
            Risks to address
          </div>
          <div className="grid gap-4">
            {risks.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <StrategyCard {...s} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] font-medium text-muted-foreground/60 text-center px-4 leading-relaxed pb-8">
        Estimated savings are indicative only, based on your current data and 2025–26 tax rates. Consult a registered tax agent before acting.
      </p>
    </div>
  );
}
