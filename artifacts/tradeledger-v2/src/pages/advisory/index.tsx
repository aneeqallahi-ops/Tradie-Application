import React, { useState, useEffect } from "react";
import { Layout, Header } from "@/components/layout";
import { useGetAdvisoryRequests, useGetTaxPosition } from "@workspace/api-client-react";
import { IntakeForm, type ServiceType } from "./intake-form";
import { useSearch } from "wouter";
import { Calculator, Home, TrendingUp, Briefcase, Clock, CheckCircle, Loader } from "lucide-react";

interface ServiceCard {
  id: ServiceType;
  icon: React.ReactNode;
  title: string;
  pitch: string;
  cta: string;
}

const SERVICES: ServiceCard[] = [
  {
    id: "tax_advisory",
    icon: <Calculator className="w-6 h-6 text-purple-600" />,
    title: "Tax Advisory",
    pitch: "Maximise deductions, minimise tax. Our registered tax agents specialise in tradies and sole traders.",
    cta: "Book a tax consult",
  },
  {
    id: "mortgage_advisory",
    icon: <Home className="w-6 h-6 text-blue-600" />,
    title: "Mortgage Advisory",
    pitch: "Self-employed lending is our specialty. We'll find lenders who understand tradie income.",
    cta: "Book a mortgage consult",
  },
  {
    id: "property_sourcing",
    icon: <TrendingUp className="w-6 h-6 text-green-600" />,
    title: "Property Sourcing",
    pitch: "Build wealth through property. Our buyers agents find investment properties that work for your income.",
    cta: "Book a property consult",
  },
  {
    id: "business_funding",
    icon: <Briefcase className="w-6 h-6 text-amber-600" />,
    title: "Business Funding",
    pitch: "Equipment finance, working capital, business loans. Fast approvals for tradies who need to move.",
    cta: "Book a funding consult",
  },
];

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pending", icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-600 bg-amber-50 border-amber-200" },
  in_progress: { label: "In Progress", icon: <Loader className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  completed: { label: "Completed", icon: <CheckCircle className="w-3.5 h-3.5" />, color: "text-green-600 bg-green-50 border-green-200" },
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

  const [activeService, setActiveService] = useState<ServiceType | null>(null);
  const [prefillHelp, setPrefillHelp] = useState<string>("");
  const [autoOpened, setAutoOpened] = useState(false);

  const annualIncome = taxPosition?.revenueYtd
    ? Math.round(Number(taxPosition.revenueYtd) * (365 / Math.max(taxPosition.daysIntoFy ?? 180, 1)))
    : undefined;

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
      <div className="px-5 pb-8 space-y-6">

        {/* Hero */}
        <div className="bg-primary text-white rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-1">Human-backed advice</p>
          <p className="text-xl font-black leading-tight">Talk to a Specialist</p>
          <p className="text-sm text-gray-300 mt-1.5">
            Real experts, not bots. All specialists understand tradie businesses.
          </p>
        </div>

        {/* Service cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Services</p>
          {SERVICES.map(service => (
            <div
              key={service.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                  {service.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary text-sm">{service.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{service.pitch}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPrefillHelp("");
                  setActiveService(service.id);
                }}
                className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                {service.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Past requests */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Your Requests</p>
          {requestsLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
              <p className="text-sm text-gray-400">No requests yet. Book a call above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => {
                const statusCfg = STATUS_CONFIG[r.status ?? "pending"] ?? STATUS_CONFIG.pending;
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-primary text-sm truncate">
                        {SERVICE_LABELS[r.serviceType] ?? r.serviceType}
                      </p>
                      {r.helpNeeded && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.helpNeeded}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(r.createdAt)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
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
          prefillHelp={prefillHelp}
          sourceModule={sourceModule}
        />
      )}
    </Layout>
  );
}
