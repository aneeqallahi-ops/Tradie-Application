import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreateAdvisoryRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export type ServiceType = "tax_advisory" | "mortgage_advisory" | "property_sourcing" | "business_funding";
export type SourceModule = "manual" | "tax_position" | "benchmark_alert" | "strategy_engine" | "deductible_prompt";

const SERVICE_LABELS: Record<ServiceType, string> = {
  tax_advisory: "Tax Advisory",
  mortgage_advisory: "Mortgage Advisory",
  property_sourcing: "Property Sourcing",
  business_funding: "Business Funding",
};

const URGENCY_OPTIONS = [
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "no_rush", label: "No rush" },
];

export type IncomePrefillSource = "ytd" | "settings" | "none";

interface IntakeFormProps {
  open: boolean;
  onClose: () => void;
  serviceType: ServiceType;
  prefillIncome?: number;
  prefillIncomeSource?: IncomePrefillSource;
  prefillHelp?: string;
  sourceModule?: SourceModule;
}

const PREFILL_LABELS: Record<IncomePrefillSource, string | null> = {
  ytd: "Estimated from your YTD revenue",
  settings: "From your settings",
  none: null,
};

export function IntakeForm({ open, onClose, serviceType, prefillIncome, prefillIncomeSource = "none", prefillHelp, sourceModule = "manual" }: IntakeFormProps) {
  const queryClient = useQueryClient();
  const createRequest = useCreateAdvisoryRequest();

  const [income, setIncome] = useState(prefillIncome != null ? String(Math.round(prefillIncome)) : "");
  const [helpNeeded, setHelpNeeded] = useState(prefillHelp ?? "");
  const [urgency, setUrgency] = useState<"this_week" | "this_month" | "no_rush">("no_rush");
  const [submitted, setSubmitted] = useState(false);
  const [incomeTouched, setIncomeTouched] = useState(false);
  const [helpTouched, setHelpTouched] = useState(false);

  useEffect(() => {
    if (!submitted && !incomeTouched) {
      setIncome(prefillIncome != null ? String(Math.round(prefillIncome)) : "");
    }
  }, [prefillIncome, submitted, incomeTouched]);

  useEffect(() => {
    if (!submitted && !helpTouched) {
      setHelpNeeded(prefillHelp ?? "");
    }
  }, [prefillHelp, submitted, helpTouched]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRequest.mutate(
      {
        data: {
          serviceType,
          currentIncome: income ? Number(income) : undefined,
          helpNeeded: helpNeeded || undefined,
          urgency,
          sourceModule,
        },
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          queryClient.invalidateQueries({ queryKey: ["/api/advisory/requests"] });
          queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        },
      }
    );
  };

  const handleClose = () => {
    setSubmitted(false);
    setIncome(prefillIncome != null ? String(Math.round(prefillIncome)) : "");
    setHelpNeeded(prefillHelp ?? "");
    setUrgency("no_rush");
    setIncomeTouched(false);
    setHelpTouched(false);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent side="bottom" className="bg-[#1C1C1E] border-white/10 rounded-t-[32px] max-h-[90vh] overflow-y-auto px-6 py-8">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl font-black text-white tracking-tight text-left">
            {SERVICE_LABELS[serviceType]}
          </SheetTitle>
        </SheetHeader>

        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-10 text-center gap-6">
            <div className="w-20 h-20 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center relative shadow-[0_0_30px_rgba(20,184,166,0.3)]">
              <CheckCircle className="w-10 h-10 text-primary relative z-10" />
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            </div>
            <div>
              <p className="font-black text-white text-2xl tracking-tight mb-2">Request sent!</p>
              <p className="text-sm font-medium text-white/70 max-w-xs mx-auto leading-relaxed">
                We've received your request — a specialist will be in touch within 1 business day.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-4 w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 rounded-xl text-lg transition-colors"
            >
              Done
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 pb-8">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block pl-1">
                Service
              </label>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-base font-bold text-white">
                {SERVICE_LABELS[serviceType]}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block pl-1" htmlFor="income">
                Current annual income
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-black text-xl">$</span>
                <input
                  id="income"
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="e.g. 120000"
                  value={income}
                  onChange={e => { setIncome(e.target.value); setIncomeTouched(true); }}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-4 text-lg text-white font-black tabular-nums tracking-tight focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-white/20"
                  data-testid="advisory-income-input"
                />
              </div>
              {!incomeTouched && PREFILL_LABELS[prefillIncomeSource] && (
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-2 px-1" data-testid="advisory-income-prefill-label">
                  Prefilled: {PREFILL_LABELS[prefillIncomeSource]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block pl-1" htmlFor="help">
                What do you need help with?
              </label>
              <textarea
                id="help"
                rows={4}
                placeholder="Describe what you're looking for help with..."
                value={helpNeeded}
                onChange={e => { setHelpNeeded(e.target.value); setHelpTouched(true); }}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-base text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block pl-1" htmlFor="urgency">
                How urgent is this?
              </label>
              <select
                id="urgency"
                value={urgency}
                onChange={e => setUrgency(e.target.value as typeof urgency)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-base text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
              >
                {URGENCY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value} className="bg-[#1C1C1E]">{o.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={createRequest.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 mt-4"
            >
              {createRequest.isPending ? "Sending..." : "Book a call"}
            </button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
