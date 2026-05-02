import React, { useState, useEffect } from "react";
import { useGetMe, useUpdateSettings, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Header, Layout } from "@/components/layout";
import { ChevronRight, LogOut, FileDown, BookOpen, Users, MapPin, Building, ShieldCheck, Edit2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { TRADE_CARDS, type TradeType } from "@/lib/trade-config";
import { motion } from "framer-motion";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export default function Settings() {
  const { data: me } = useGetMe();
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateSettings = useUpdateSettings();

  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    tradeType: "other" as TradeType,
    businessName: "",
    abn: "",
    state: "NSW",
    phone: "",
    email: "",
    gstRegistered: true,
    hourlyRate: "85",
    defaultMarkupPercent: "20",
    profitFirstTaxPercent: "15",
    profitFirstExpensesPercent: "10",
    annualTurnoverBand: "",
  });

  useEffect(() => {
    if (me?.user) {
      setFormData({
        tradeType: (me.user.tradeType ?? "other") as TradeType,
        businessName: me.user.businessName || "",
        abn: me.user.abn || "",
        state: me.user.state || "NSW",
        phone: me.user.phone || "",
        email: me.user.email || "",
        gstRegistered: me.user.gstRegistered !== false,
        hourlyRate: me.user.hourlyRate?.toString() || "85",
        defaultMarkupPercent: me.user.defaultMarkupPercent?.toString() || "20",
        profitFirstTaxPercent: me.user.profitFirstTaxPercent?.toString() || "15",
        profitFirstExpensesPercent: me.user.profitFirstExpensesPercent?.toString() || "10",
        annualTurnoverBand: me.user.annualTurnoverBand || "",
      });
    }
  }, [me]);

  const TURNOVER_BANDS = [
    { value: "under_50k", label: "Under $50k" },
    { value: "50k_150k", label: "$50k – $150k" },
    { value: "150k_600k", label: "$150k – $600k" },
    { value: "over_600k", label: "Over $600k" },
  ];

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleExport = async (type: string) => {
    try {
      const url = type === "CSV" ? "/api/export/data.csv" : "/api/export/logbook.pdf";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = type === "CSV" ? "tradeledger-export.csv" : "logbook.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        tradeType: formData.tradeType,
        businessName: formData.businessName,
        abn: formData.abn,
        state: formData.state,
        phone: formData.phone,
        email: formData.email,
        gstRegistered: formData.gstRegistered,
        hourlyRate: Number(formData.hourlyRate),
        defaultMarkupPercent: Number(formData.defaultMarkupPercent),
        profitFirstTaxPercent: Number(formData.profitFirstTaxPercent),
        profitFirstExpensesPercent: Number(formData.profitFirstExpensesPercent),
        ...(formData.annualTurnoverBand ? { annualTurnoverBand: formData.annualTurnoverBand } : {}),
      }
    }, {
      onSuccess: () => {
        toast({ title: "Settings saved" });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setEditOpen(false);
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    });
  };

  const initials = me?.user?.businessName?.substring(0, 2).toUpperCase() || "TL";
  const currentTradeCard = TRADE_CARDS.find(c => c.value === (me?.user?.tradeType ?? "other")) ?? TRADE_CARDS[TRADE_CARDS.length - 1];

  return (
    <Layout>
      <Header title="Settings" />
      
      <div className="px-6 pb-32 space-y-8">
        
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-5 bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
          <div className="w-16 h-16 rounded-2xl bg-primary text-black flex items-center justify-center text-2xl font-black shrink-0 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
            {initials}
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <h2 className="text-xl font-bold text-white truncate">{me?.user?.businessName || "Your Business"}</h2>
            <div className="text-muted-foreground text-sm mt-0.5 font-medium">ABN: {me?.user?.abn || "Not set"}</div>
            <div className="inline-flex items-center gap-1.5 mt-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-xs font-semibold text-white">
              <span>{currentTradeCard.emoji}</span> {currentTradeCard.label}
            </div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors shrink-0 z-10"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Sections */}
        <div className="space-y-8">
          
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Account Details</h3>
            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5 backdrop-blur-md">
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <span className="text-xl leading-none">{currentTradeCard.emoji}</span>
                  </div>
                  <span className="font-semibold text-white">Trade Type</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{currentTradeCard.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-white transition-colors" />
                </div>
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Building className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-semibold text-white">Business Details</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-white transition-colors" />
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <MapPin className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-semibold text-white">State & Region</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{me?.user?.state}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-white transition-colors" />
                </div>
              </button>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Financial Preferences</h3>
            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5 backdrop-blur-md">
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                <span className="font-semibold text-white">Default Hourly Rate</span>
                <span className="font-bold text-primary text-lg">${me?.user?.hourlyRate || "85"}<span className="text-sm text-muted-foreground">/hr</span></span>
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                <span className="font-semibold text-white">Default Markup</span>
                <span className="font-bold text-white">{me?.user?.defaultMarkupPercent || "20"}%</span>
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                <span className="font-semibold text-white">Tax Set-aside</span>
                <span className="font-bold text-red-400">{me?.user?.profitFirstTaxPercent || "15"}%</span>
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                <span className="font-semibold text-white">Expenses Float</span>
                <span className="font-bold text-amber-400">{me?.user?.profitFirstExpensesPercent || "10"}%</span>
              </button>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Compliance</h3>
            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5 backdrop-blur-md">
              <Link href="/subcontractors" className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="font-semibold text-white">Subcontractor Register (TPAR)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-white transition-colors" />
              </Link>
              <div className="w-full flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="font-semibold text-white">GST Registration</span>
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${me?.user?.gstRegistered ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-white/50"}`}>
                  {me?.user?.gstRegistered ? "Registered" : "Not Registered"}
                </span>
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">Data & Export</h3>
            <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5 backdrop-blur-md">
              <button onClick={() => handleExport("CSV")} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <FileDown className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-white">Export all data (CSV)</span>
                </div>
              </button>
              <button onClick={() => handleExport("Logbook")} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-white">Export Logbook (PDF)</span>
                </div>
              </button>
            </div>
          </motion.section>

        </div>

        <motion.button 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          onClick={handleLogout}
          className="w-full h-14 text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-colors mt-8"
        >
          <LogOut className="w-5 h-5" /> Log Out
        </motion.button>

        <div className="text-center mt-12 pb-8">
          <div className="text-white/40 font-bold tracking-tight mb-1">TradeLedger</div>
          <div className="text-[10px] font-medium text-white/20 uppercase tracking-widest">Version 2.0.0</div>
        </div>
      </div>

      {/* Edit Settings Drawer */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="bg-[#1C1C1E] border-white/10 h-[92vh] rounded-t-[32px]">
          <div className="p-6 overflow-y-auto pb-32">
            <DrawerTitle className="text-2xl font-bold text-white mb-8">Edit Settings</DrawerTitle>

            <div className="space-y-8">
              
              {/* Trade Type */}
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Your Trade</div>
                <div className="grid grid-cols-2 gap-3">
                  {TRADE_CARDS.map(card => {
                    const isSelected = formData.tradeType === card.value;
                    return (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, tradeType: card.value })}
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

              {/* Business Details */}
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Business</div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/80">Business Name</label>
                    <Input
                      value={formData.businessName}
                      onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                      className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/80">ABN</label>
                    <Input
                      value={formData.abn}
                      onChange={e => setFormData({ ...formData, abn: e.target.value })}
                      placeholder="XX XXX XXX XXX"
                      className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white placeholder:text-white/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/80">State</label>
                      <Select value={formData.state} onValueChange={v => setFormData({ ...formData, state: v })}>
                        <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                          {STATES.map(s => <SelectItem key={s} value={s} className="focus:bg-white/10 focus:text-white">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/80">Phone</label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/80">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl mt-4">
                    <div>
                      <div className="font-semibold text-white">GST Registered</div>
                      <div className="text-xs text-muted-foreground mt-1">Required if turnover exceeds $75k</div>
                    </div>
                    <Switch
                      checked={formData.gstRegistered}
                      onCheckedChange={v => setFormData({ ...formData, gstRegistered: v })}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-white/80">Annual Turnover Band</label>
                    <Select value={formData.annualTurnoverBand || undefined} onValueChange={v => setFormData({ ...formData, annualTurnoverBand: v })}>
                      <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white">
                        <SelectValue placeholder="Select a band" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                        {TURNOVER_BANDS.map(b => <SelectItem key={b.value} value={b.value} className="focus:bg-white/10 focus:text-white">{b.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Rates */}
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Rates</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/80">Hourly Rate ($)</label>
                    <Input
                      type="number"
                      value={formData.hourlyRate}
                      onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })}
                      className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/80">Default Markup (%)</label>
                    <Input
                      type="number"
                      value={formData.defaultMarkupPercent}
                      onChange={e => setFormData({ ...formData, defaultMarkupPercent: e.target.value })}
                      className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Profit First */}
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Profit First Targets</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-red-400">Tax Set-aside (%)</label>
                    <Input
                      type="number"
                      value={formData.profitFirstTaxPercent}
                      onChange={e => setFormData({ ...formData, profitFirstTaxPercent: e.target.value })}
                      min="0" max="50"
                      className="h-14 bg-white/5 border-red-500/20 rounded-xl focus-visible:ring-red-400 text-white font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-amber-400">Expenses Float (%)</label>
                    <Input
                      type="number"
                      value={formData.profitFirstExpensesPercent}
                      onChange={e => setFormData({ ...formData, profitFirstExpensesPercent: e.target.value })}
                      min="0" max="50"
                      className="h-14 bg-white/5 border-amber-500/20 rounded-xl focus-visible:ring-amber-400 text-white font-medium"
                    />
                  </div>
                </div>
              </div>
              
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/10">
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className="w-full h-14 rounded-xl text-lg font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
            >
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
