import React, { useState } from "react";
import { useOnboardUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { TRADE_CARDS, type TradeType } from "@/lib/trade-config";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, CheckCircle2 } from "lucide-react";

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

  const slideVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col p-6 max-w-[480px] mx-auto">
      <div className="pt-8 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Tradie</h1>
        </div>
        <div className="text-xs font-semibold text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
          Step {step} of 3
        </div>
      </div>
      
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Business Details</h2>
                <p className="text-muted-foreground text-sm">Let's get your account set up.</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">What's your trade? *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {TRADE_CARDS.map(card => {
                      const isSelected = formData.tradeType === card.value;
                      return (
                        <button
                          key={card.value}
                          type="button"
                          onClick={() => updateField("tradeType", card.value)}
                          className={`flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(20,184,166,0.1)]"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? "bg-primary/20" : "bg-white/10"}`}>
                             <span className="text-lg leading-none">{card.emoji}</span>
                          </div>
                          <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-white"}`}>{card.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business Name *</label>
                  <Input 
                    value={formData.businessName} 
                    onChange={e => updateField("businessName", e.target.value)} 
                    className="bg-white/5 border-white/10 h-14 rounded-xl text-white focus-visible:ring-primary focus-visible:border-primary"
                    placeholder="E.g. Smith Plumbing"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ABN</label>
                  <Input 
                    value={formData.abn} 
                    onChange={e => updateField("abn", e.target.value)} 
                    className="bg-white/5 border-white/10 h-14 rounded-xl text-white focus-visible:ring-primary focus-visible:border-primary"
                    placeholder="XX XXX XXX XXX"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State</label>
                  <Select value={formData.state} onValueChange={v => updateField("state", v)}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-xl text-white focus:ring-primary">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                      {["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"].map(s => (
                        <SelectItem key={s} value={s} className="focus:bg-white/10 focus:text-white">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl">
                  <div>
                    <div className="font-semibold text-white">GST Registered</div>
                    <div className="text-xs text-muted-foreground mt-1">Are you registered for GST?</div>
                  </div>
                  <Switch 
                    checked={formData.gstRegistered} 
                    onCheckedChange={v => updateField("gstRegistered", v)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Annual Turnover (estimate)</label>
                  <p className="text-xs text-muted-foreground mb-2">Used to compare you against ATO industry benchmarks.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {TURNOVER_BANDS.map(band => {
                      const isSelected = formData.annualTurnoverBand === band.value;
                      return (
                        <button
                          key={band.value}
                          type="button"
                          onClick={() => updateField("annualTurnoverBand", band.value)}
                          className={`p-4 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          }`}
                        >
                          <span className="text-sm font-semibold">{band.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Your Trade</h2>
                <p className="text-muted-foreground text-sm">Default rates for quoting and invoicing.</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Hourly Rate ($)</label>
                  <Input 
                    type="number"
                    value={formData.hourlyRate} 
                    onChange={e => updateField("hourlyRate", e.target.value)} 
                    className="bg-white/5 border-white/10 h-14 rounded-xl text-white focus-visible:ring-primary focus-visible:border-primary text-lg"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Material Markup (%)</label>
                  <Input 
                    type="number"
                    value={formData.defaultMarkupPercent} 
                    onChange={e => updateField("defaultMarkupPercent", e.target.value)} 
                    className="bg-white/5 border-white/10 h-14 rounded-xl text-white focus-visible:ring-primary focus-visible:border-primary text-lg"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</label>
                  <Input 
                    type="tel"
                    value={formData.phone} 
                    onChange={e => updateField("phone", e.target.value)} 
                    className="bg-white/5 border-white/10 h-14 rounded-xl text-white focus-visible:ring-primary focus-visible:border-primary"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={e => updateField("email", e.target.value)} 
                    className="bg-white/5 border-white/10 h-14 rounded-xl text-white focus-visible:ring-primary focus-visible:border-primary"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">Profit First</h2>
                <p className="text-muted-foreground text-sm">Tradie sets money aside automatically.</p>
              </div>
              
              <div className="space-y-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-white">Tax Set-aside</label>
                      <span className="text-xl font-bold text-primary">{formData.profitFirstTaxPercent}%</span>
                    </div>
                    <Slider 
                      value={[formData.profitFirstTaxPercent]} 
                      onValueChange={v => updateField("profitFirstTaxPercent", v[0])}
                      min={10} max={30} step={1}
                      className="py-2"
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 15%. This covers your Income Tax and GST.</p>
                  </div>

                  <div className="h-px bg-white/10" />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold text-white">Expenses Float</label>
                      <span className="text-xl font-bold text-primary">{formData.profitFirstExpensesPercent}%</span>
                    </div>
                    <Slider 
                      value={[formData.profitFirstExpensesPercent]} 
                      onValueChange={v => updateField("profitFirstExpensesPercent", v[0])}
                      min={5} max={20} step={1}
                      className="py-2"
                    />
                    <p className="text-xs text-muted-foreground">Recommended: 10%. Money kept in the business for materials and tools.</p>
                  </div>
                </div>

                <div className="p-5 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-4">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-white mb-1">You keep {100 - formData.profitFirstTaxPercent - formData.profitFirstExpensesPercent}%</div>
                    <div className="text-sm text-primary/80 leading-relaxed">For every $1,000 you earn, you will pay yourself ${1000 * ((100 - formData.profitFirstTaxPercent - formData.profitFirstExpensesPercent)/100)}.</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-8 pb-4 flex gap-3">
        {step > 1 && (
          <Button 
            variant="outline" 
            onClick={handleBack} 
            className="h-14 rounded-xl px-8 bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white"
          >
            Back
          </Button>
        )}
        <Button 
          onClick={step === 3 ? handleSubmit : handleNext} 
          disabled={onboard.isPending || (step === 1 && !formData.tradeType)}
          className="h-14 rounded-xl flex-1 bg-primary text-black hover:bg-primary/90 text-lg font-bold shadow-[0_0_20px_rgba(20,184,166,0.3)] disabled:opacity-50 disabled:shadow-none"
        >
          {onboard.isPending ? "Saving..." : step === 3 ? "Complete Setup" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
