import React, { useState, useEffect } from "react";
import { Layout, Header } from "@/components/layout";
import { useGetAdvisoryRequests, useGetTaxPosition, useGetMe } from "@workspace/api-client-react";
import { IntakeForm, type ServiceType, type IncomePrefillSource } from "./intake-form";
import { useSearch } from "wouter";
import { Calculator, Home, TrendingUp, Briefcase, Clock, CheckCircle, Loader } from "lucide-react";
import { motion } from "framer-motion";

const TURNOVER_BAND_MIDPOINTS: Record<string, number> = {
  under_50k: 25000,
  "50k_150k": 100000,
  "150k_600k": 375000,
  over_600k: 900000,
};

function deriveIncomePrefill(
  revenueYtd: number | string | null | undefined,
  daysIntoFy: number | null | undefined,
  annualTurnoverBand: string | null | undefined,
): { income: number | undefined; source: IncomePrefillSource } {
  const revenue = revenueYtd != null ? Number(revenueYtd) : NaN;
  const days = daysIntoFy ?? 0;
  if (Number.isFinite(revenue) && revenue > 0 && days > 60) {
    return { income: Math.round(revenue * (365 / days)), source: "ytd" };
  }
  if (annualTurnoverBand && TURNOVER_BAND_MIDPOINTS[annualTurnoverBand] != null) {
    return { income: TURNOVER_BAND_MIDPOINTS[annualTurnoverBand], source: "settings" };
  }
  return { income: undefined, source: "none" };
}

interface ServiceCard {
  id: ServiceType;
  icon: React.ReactNode;
  title: string;
  pitch: string;
  cta: string;
  color: string;
  bgGlow: string;
}

const SERVICES: ServiceCard[] = [
  {
    id: "tax_advisory",
    icon: <Calculator className="w-6 h-6 text-[#9333ea]" />,
    title: "Tax Advisory",
    pitch: "Maximise deductions, minimise tax. Our registered tax agents specialise in tradies and sole traders.",
    cta: "Book a tax consult",
    color: "border-[#9333ea]/30 text-[#9333ea]",
    bgGlow: "bg-[#9333ea]/10",
  },
  {
    id: "mortgage_advisory",
    icon: <Home className="w-6 h-6 text-[#2563eb]" />,
    title: "Mortgage Advisory",
    pitch: "Self-employed lending is our specialty. We'll find lenders who understand tradie income.",
    cta: "Book a mortgage consult",
    color: "border-[#2563eb]/30 text-[#2563eb]",
    bgGlow: "bg-[#2563eb]/10",
  },
  {
    id: "property_sourcing",
    icon: <TrendingUp className="w-6 h-6 text-[#16a34a]" />,
    title: "Property Sourcing",
    pitch: "Build wealth through property. Our buyers agents find investment properties that work for your income.",
    cta: "Book a property consult",
    color: "border-[#16a34a]/30 text-[#16a34a]",
    bgGlow: "bg-[#16a34a]/10",
  },
  {
    id: "business_funding",
    icon: <Briefcase className="w-6 h-6 text-[#d97706]" />,
    title: "Business Funding",
    pitch: "Equipment finance, working capital, business loans. Fast approvals for tradies who need to move.",
    cta: "Book a funding consult",
    color: "border-[#d97706]/30 text-[#d97706]",
    bgGlow: "bg-[#d97706]/10",
  },
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pending", icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  in_progress: { label: "In Progress", icon: <Loader className="w-3.5 h-3.5" />, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  completed: { label: "Completed", icon: <CheckCircle className="w-3.5 h-3.5" />, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

const SERVICE_LABELS: Record<string, string> = {
  tax_advisory: "Tax Advisory",
  mortgage_advisory: "Mortgage Advisory",
  property_sourcing: "Property Sourcing",
  business_funding: "Business Funding",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdvisoryPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const strategyParam = params.get("strategy");
  const savingParam = params.get("saving");

  const { data: taxPosition } = useGetTaxPosition();
  const { data: requestsData, isLoading: requestsLoading } = useGetAdvisoryRequests();
  const { data: me } = useGetMe();

  const [activeService, setActiveService] = useState<ServiceType | null>(null);
  const [prefillHelp, setPrefillHelp] = useState<string>("");
  const [autoOpened, setAutoOpened] = useState(false);

  const { income: annualIncome, source: incomeSource } = deriveIncomePrefill(
    taxPosition?.ytdRevenueExGst,
    taxPosition?.fyDaysElapsed,
    me?.user?.annualTurnoverBand,
  );

  useEffect(() => {
    if (strategyParam && !autoOpened) {
      const saving = savingParam ? `$${Number(savingParam).toLocaleString("en-AU")}` : "";
      const helpText = saving
        ? `I'd like advice on the "${strategyParam.replace(/_/g, " ")}" strategy (estimated saving: ${saving}).`
        : `I'd like advice on the "${strategyParam.replace(/_/g, " ")}" strategy.`;
      setPrefillHelp(helpText);
      setActiveService("tax_advisory");
      setAutoOpened(true);
    }
  }, [strategyParam, savingParam, autoOpened]);

  const sourceModule = strategyParam ? "strategy_engine" : "manual";

  const requests = requestsData?.requests ?? [];

  return (
    <Layout>
      <Header title="Advisory" />
      <div className="px-6 pb-32 space-y-8 mt-2">

        {/* Hero */}
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Human-backed advice</p>
            <p className="text-3xl font-black leading-tight text-white mb-2 tracking-tight">Talk to a Specialist</p>
            <p className="text-sm font-medium text-white/80 leading-relaxed max-w-[280px]">
              Real experts, not bots. All specialists understand tradie businesses.
            </p>
          </div>
        </div>

        {/* Service cards */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pl-2">Services</p>
          <div className="grid gap-4">
            {SERVICES.map((service, idx) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white/5 rounded-3xl border border-white/10 p-5 relative overflow-hidden group"
              >
                <div className={`absolute -right-10 -bottom-10 w-32 h-32 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${service.bgGlow}`} />
                <div className="relative z-10">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${service.bgGlow} ${service.color}`}>
                      {service.icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-bold text-white text-lg tracking-tight mb-1">{service.title}</p>
                      <p className="text-sm font-medium text-white/60 leading-relaxed">{service.pitch}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPrefillHelp("");
                      setActiveService(service.id);
                    }}
                    className="w-full bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold py-3.5 rounded-xl text-sm transition-colors"
                  >
                    {service.cta}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Past requests */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pl-2">Your Requests</p>
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white/5 rounded-3xl border border-white/10 p-8 text-center">
              <p className="font-medium text-muted-foreground text-sm">No requests yet. Book a call above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const statusCfg = STATUS_CONFIG[r.status ?? "pending"] ?? STATUS_CONFIG.pending;
                return (
                  <div key={r.id} className="bg-white/5 rounded-3xl border border-white/10 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-white text-base">
                        {SERVICE_LABELS[r.serviceType] ?? r.serviceType}
                      </p>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>
                    {r.helpNeeded && (
                      <p className="text-sm font-medium text-white/70 mb-3 line-clamp-2 leading-relaxed">{r.helpNeeded}</p>
                    )}
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{fmtDate(r.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {activeService && (
        <IntakeForm
          open={!!activeService}
          onClose={() => { setActiveService(null); setPrefillHelp(""); }}
          serviceType={activeService}
          prefillIncome={annualIncome}
          prefillIncomeSource={incomeSource}
          prefillHelp={prefillHelp}
          sourceModule={sourceModule}
        />
      )}
    </Layout>
  );
}
