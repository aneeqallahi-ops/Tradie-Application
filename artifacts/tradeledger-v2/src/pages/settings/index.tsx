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
      
      <div className="px-5 pb-24 space-y-8 animate-in fade-in">
        
        {/* Profile Header */}
        <div className="flex items-center gap-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{me?.user?.businessName || "Your Business"}</h2>
            <div className="text-gray-500 text-sm mt-0.5 font-medium">ABN: {me?.user?.abn || "Not set"}</div>
            <div className="text-sm mt-1 font-medium text-accent">{currentTradeCard.emoji} {currentTradeCard.label}</div>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="p-2 rounded-full hover:bg-secondary transition-colors text-gray-400 hover:text-primary"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Account</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-base leading-none">{currentTradeCard.emoji}</span>
                  </div>
                  <span className="font-medium">Trade Type</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{currentTradeCard.label}</span>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><Building className="w-4 h-4 text-gray-600" /></div>
                  <span className="font-medium">Business Details</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><MapPin className="w-4 h-4 text-gray-600" /></div>
                  <span className="font-medium">State & Region</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{me?.user?.state}</span>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Preferences</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <span className="font-medium text-gray-700">Default Hourly Rate</span>
                <span className="font-bold">${me?.user?.hourlyRate || "85"}/hr</span>
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <span className="font-medium text-gray-700">Default Markup</span>
                <span className="font-bold">{me?.user?.defaultMarkupPercent || "20"}%</span>
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <span className="font-medium text-gray-700">Tax Set-aside</span>
                <span className="font-bold text-red-600">{me?.user?.profitFirstTaxPercent || "15"}%</span>
              </button>
              <button onClick={() => setEditOpen(true)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <span className="font-medium text-gray-700">Expenses Float</span>
                <span className="font-bold text-amber-600">{me?.user?.profitFirstExpensesPercent || "10"}%</span>
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Compliance</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <Link href="/subcontractors" className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center"><Users className="w-4 h-4 text-amber-600" /></div>
                  <span className="font-medium text-gray-900">Subcontractor Register (TPAR)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </Link>
              <div className="w-full flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#DCFCE7] flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-[#166534]" /></div>
                  <span className="font-medium text-gray-900">GST Registration</span>
                </div>
                <span className="text-sm font-bold text-[#166534]">{me?.user?.gstRegistered ? "Registered" : "Not Registered"}</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Data & Export</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              <button onClick={() => handleExport("CSV")} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <div className="flex items-center gap-3">
                  <FileDown className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">Export all data (CSV)</span>
                </div>
              </button>
              <button onClick={() => handleExport("Logbook")} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">Export Logbook (PDF)</span>
                </div>
              </button>
            </div>
          </section>

        </div>

        <button 
          onClick={handleLogout}
          className="w-full py-4 text-red-600 font-semibold flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-colors mt-8"
        >
          <LogOut className="w-5 h-5" /> Log Out
        </button>

        <div className="text-center mt-8 pb-8">
          <div className="text-primary font-bold text-xl mb-1">TradeLedger</div>
          <div className="text-xs text-gray-400">Version 1.0.0</div>
        </div>
      </div>

      {/* Edit Settings Drawer */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="bg-white h-[92vh] rounded-t-[24px]">
          <div className="p-6 overflow-y-auto pb-28">
            <DrawerTitle className="text-2xl font-bold mb-6">Edit Settings</DrawerTitle>

            <div className="space-y-5">

              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Trade</div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Trade Type</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {TRADE_CARDS.map(card => {
                    const isSelected = formData.tradeType === card.value;
                    return (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, tradeType: card.value })}
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

              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">Business</div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Business Name</label>
                <Input
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  className="h-12 bg-secondary border-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">ABN</label>
                <Input
                  value={formData.abn}
                  onChange={e => setFormData({ ...formData, abn: e.target.value })}
                  placeholder="XX XXX XXX XXX"
                  className="h-12 bg-secondary border-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">State</label>
                <Select value={formData.state} onValueChange={v => setFormData({ ...formData, state: v })}>
                  <SelectTrigger className="h-12 bg-secondary border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12 bg-secondary border-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 bg-secondary border-none"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary rounded-2xl">
                <div>
                  <div className="font-medium">GST Registered</div>
                  <div className="text-sm text-gray-500">Registered for GST</div>
                </div>
                <Switch
                  checked={formData.gstRegistered}
                  onCheckedChange={v => setFormData({ ...formData, gstRegistered: v })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Annual Turnover Band</label>
                <p className="text-xs text-gray-500">Used for ATO benchmark comparisons.</p>
                <Select value={formData.annualTurnoverBand || undefined} onValueChange={v => setFormData({ ...formData, annualTurnoverBand: v })}>
                  <SelectTrigger className="h-12 bg-secondary border-none">
                    <SelectValue placeholder="Select a band" />
                  </SelectTrigger>
                  <SelectContent>
                    {TURNOVER_BANDS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-4">Rates</div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Default Hourly Rate ($)</label>
                <Input
                  type="number"
                  value={formData.hourlyRate}
                  onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })}
                  className="h-12 bg-secondary border-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Default Material Markup (%)</label>
                <Input
                  type="number"
                  value={formData.defaultMarkupPercent}
                  onChange={e => setFormData({ ...formData, defaultMarkupPercent: e.target.value })}
                  className="h-12 bg-secondary border-none"
                />
              </div>

              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-4">Profit First</div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Tax Set-aside (%)</label>
                <Input
                  type="number"
                  value={formData.profitFirstTaxPercent}
                  onChange={e => setFormData({ ...formData, profitFirstTaxPercent: e.target.value })}
                  min="0" max="50"
                  className="h-12 bg-secondary border-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Expenses Float (%)</label>
                <Input
                  type="number"
                  value={formData.profitFirstExpensesPercent}
                  onChange={e => setFormData({ ...formData, profitFirstExpensesPercent: e.target.value })}
                  min="0" max="50"
                  className="h-12 bg-secondary border-none"
                />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
              className="w-full h-14 rounded-full text-lg font-semibold"
            >
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
