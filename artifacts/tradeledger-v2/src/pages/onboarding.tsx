import React, { useState } from "react";
import { useOnboardUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { TRADE_CARDS, type TradeType } from "@/lib/trade-config";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const onboard = useOnboardUser();
  
  const [formData, setFormData] = useState({
    tradeType: "" as TradeType | "",
    businessName: "",
    abn: "",
    gstRegistered: true,
    state: "NSW",
    hourlyRate: "85",
    defaultMarkupPercent: "20",
    phone: "",
    email: "",
    profitFirstTaxPercent: 15,
    profitFirstExpensesPercent: 10,
    annualTurnoverBand: "",
  });

  const TURNOVER_BANDS = [
    { value: "under_50k", label: "Under $50k" },
    { value: "50k_150k", label: "$50k – $150k" },
    { value: "150k_600k", label: "$150k – $600k" },
    { value: "over_600k", label: "Over $600k" },
  ];

  const handleNext = () => {
    if (step === 1) {
      if (!formData.tradeType) {
        toast({ title: "Please select your trade", variant: "destructive" });
        return;
      }
      if (!formData.businessName) {
        toast({ title: "Business Name required", variant: "destructive" });
        return;
      }
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = () => {
    const { annualTurnoverBand, ...rest } = formData;
    onboard.mutate({
      data: {
        ...rest,
        tradeType: rest.tradeType || "other",
        hourlyRate: Number(rest.hourlyRate),
        defaultMarkupPercent: Number(rest.defaultMarkupPercent),
        ...(annualTurnoverBand ? { annualTurnoverBand } : {}),
      }
    }, {
      onSuccess: () => {
        window.location.href = "/";
      },
      onError: () => {
        toast({ title: "Failed to save details", variant: "destructive" });
      }
    });
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col p-6 max-w-[480px] mx-auto">
      <div className="pt-8 pb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">TradeLedger</h1>
        <div className="text-sm font-medium text-muted-foreground">Step {step} of 3</div>
      </div>
      
      <div className="flex-1">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Business Details</h2>
              <p className="text-muted-foreground">Let's get your account set up.</p>
            </div>
            
            <div className="space-y-5">
              {/* Trade selector */}
              <div className="space-y-3">
                <label className="text-sm font-medium">What's your trade? *</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {TRADE_CARDS.map(card => {
                    const isSelected = formData.tradeType === card.value;
                    return (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => updateField("tradeType", card.value)}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-[#1A1A1A] bg-white shadow-sm"
                            : "border-transparent bg-[#F7F4F1] text-gray-700 hover:border-gray-200"
                        }`}
                      >
                        <span className="text-2xl leading-none">{card.emoji}</span>
                        <span className="text-sm font-semibold leading-tight">{card.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Business Name *</label>
                <Input 
                  value={formData.businessName} 
                  onChange={e => updateField("businessName", e.target.value)} 
                  className="bg-secondary border-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#1A1A1A] h-12"
                  placeholder="E.g. Smith Plumbing"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ABN</label>
                <Input 
                  value={formData.abn} 
                  onChange={e => updateField("abn", e.target.value)} 
                  className="bg-secondary border-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#1A1A1A] h-12"
                  placeholder="XX XXX XXX XXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">State</label>
                <Select value={formData.state} onValueChange={v => updateField("state", v)}>
                  <SelectTrigger className="bg-secondary border-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#1A1A1A] h-12">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm">
                <div>
                  <div className="font-medium">GST Registered</div>
                  <div className="text-sm text-muted-foreground">Are you registered for GST?</div>
                </div>
                <Switch 
                  checked={formData.gstRegistered} 
                  onCheckedChange={v => updateField("gstRegistered", v)} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Annual Turnover (estimate)</label>
                <p className="text-xs text-muted-foreground">Used to compare you against ATO industry benchmarks.</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {TURNOVER_BANDS.map(band => {
                    const isSelected = formData.annualTurnoverBand === band.value;
                    return (
                      <button
                        key={band.value}
                        type="button"
                        onClick={() => updateField("annualTurnoverBand", band.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? "border-[#1A1A1A] bg-white shadow-sm"
                            : "border-transparent bg-[#F7F4F1] text-gray-700 hover:border-gray-200"
                        }`}
                      >
                        <span className="text-sm font-semibold">{band.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Your Trade</h2>
              <p className="text-muted-foreground">Default rates for quoting and invoicing.</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Hourly Rate ($)</label>
                <Input 
                  type="number"
                  value={formData.hourlyRate} 
                  onChange={e => updateField("hourlyRate", e.target.value)} 
                  className="bg-secondary border-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#1A1A1A] h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Material Markup (%)</label>
                <Input 
                  type="number"
                  value={formData.defaultMarkupPercent} 
                  onChange={e => updateField("defaultMarkupPercent", e.target.value)} 
                  className="bg-secondary border-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#1A1A1A] h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <Input 
                  type="tel"
                  value={formData.phone} 
                  onChange={e => updateField("phone", e.target.value)} 
                  className="bg-secondary border-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#1A1A1A] h-12"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={e => updateField("email", e.target.value)} 
                  className="bg-secondary border-none focus:bg-white focus:shadow-[inset_0_0_0_2px_#1A1A1A] h-12"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Set aside money automatically</h2>
              <p className="text-muted-foreground">TradeLedger uses the Profit First method to help you save for tax and expenses.</p>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="font-medium">Tax Set-aside</label>
                  <span className="text-lg font-bold">{formData.profitFirstTaxPercent}%</span>
                </div>
                <Slider 
                  value={[formData.profitFirstTaxPercent]} 
                  onValueChange={v => updateField("profitFirstTaxPercent", v[0])}
                  min={10} max={30} step={1}
                />
                <p className="text-sm text-muted-foreground">Recommended: 15%. This covers your Income Tax and GST.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="font-medium">Expenses Float</label>
                  <span className="text-lg font-bold">{formData.profitFirstExpensesPercent}%</span>
                </div>
                <Slider 
                  value={[formData.profitFirstExpensesPercent]} 
                  onValueChange={v => updateField("profitFirstExpensesPercent", v[0])}
                  min={5} max={20} step={1}
                />
                <p className="text-sm text-muted-foreground">Recommended: 10%. Money kept in the business for materials and tools.</p>
              </div>

              <div className="p-4 bg-[#DCFCE7] text-[#166534] rounded-2xl">
                <div className="font-semibold mb-1">You keep {100 - formData.profitFirstTaxPercent - formData.profitFirstExpensesPercent}%</div>
                <div className="text-sm">For every $1,000 you earn, you will pay yourself ${1000 * ((100 - formData.profitFirstTaxPercent - formData.profitFirstExpensesPercent)/100)}.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={handleBack} className="h-14 rounded-full px-8 bg-white border-primary border text-primary">
            Back
          </Button>
        )}
        <Button 
          onClick={step === 3 ? handleSubmit : handleNext} 
          disabled={onboard.isPending || (step === 1 && !formData.tradeType)}
          className="h-14 rounded-full flex-1 bg-primary text-white hover:bg-primary/90 text-lg font-semibold"
        >
          {onboard.isPending ? "Saving..." : step === 3 ? "Complete Setup" : "Next"}
        </Button>
      </div>
    </div>
  );
}
