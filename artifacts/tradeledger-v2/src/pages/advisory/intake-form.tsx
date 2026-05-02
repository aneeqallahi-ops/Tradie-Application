import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreateAdvisoryRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";

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

interface IntakeFormProps {
  open: boolean;
  onClose: () => void;
  serviceType: ServiceType;
  prefillIncome?: number;
  prefillHelp?: string;
  sourceModule?: SourceModule;
}

export function IntakeForm({ open, onClose, serviceType, prefillIncome, prefillHelp, sourceModule = "manual" }: IntakeFormProps) {
  const queryClient = useQueryClient();
  const createRequest = useCreateAdvisoryRequest();

  const [income, setIncome] = useState(prefillIncome != null ? String(Math.round(prefillIncome)) : "");
  const [helpNeeded, setHelpNeeded] = useState(prefillHelp ?? "");
  const [urgency, setUrgency] = useState<"this_week" | "this_month" | "no_rush">("no_rush");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!submitted) {
      setIncome(prefillIncome != null ? String(Math.round(prefillIncome)) : "");
    }
  }, [prefillIncome, submitted]);

  useEffect(() => {
    if (!submitted) {
      setHelpNeeded(prefillHelp ?? "");
    }
  }, [prefillHelp, submitted]);

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
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-lg font-bold text-primary">
            {SERVICE_LABELS[serviceType]}
          </SheetTitle>
        </SheetHeader>

        {submitted ? (
          <div className="flex flex-col items-center py-10 text-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-primary text-lg">Request sent!</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                We've received your request — a specialist will be in touch within 1 business day.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-2 w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 pb-8">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Service
              </label>
              <div className="bg-secondary/60 rounded-xl px-4 py-3 text-sm font-medium text-primary">
                {SERVICE_LABELS[serviceType]}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide" htmlFor="income">
                Current annual income
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
                <input
                  id="income"
                  type="number"
                  min={0}
                  step={1000}
                  placeholder="e.g. 120000"
                  value={income}
                  onChange={e => setIncome(e.target.value)}
                  className="w-full bg-secondary/60 rounded-xl pl-8 pr-4 py-3 text-sm text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide" htmlFor="help">
                What do you need help with?
              </label>
              <textarea
                id="help"
                rows={4}
                placeholder="Describe what you're looking for help with..."
                value={helpNeeded}
                onChange={e => setHelpNeeded(e.target.value)}
                className="w-full bg-secondary/60 rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide" htmlFor="urgency">
                How urgent is this?
              </label>
              <select
                id="urgency"
                value={urgency}
                onChange={e => setUrgency(e.target.value as typeof urgency)}
                className="w-full bg-secondary/60 rounded-xl px-4 py-3 text-sm text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none"
              >
                {URGENCY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={createRequest.isPending}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {createRequest.isPending ? "Sending..." : "Book a call"}
            </button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
