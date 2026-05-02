import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetClients, useCreateQuote, useGetMe, useCreateClient } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Trash2, Plus, Info, UserPlus, LayoutTemplate, FileText } from "lucide-react";
import { TRADE_QUOTE_TEMPLATES, type TradeType } from "@/lib/trade-config";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function NewQuote() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: clients = [] } = useGetClients();
  const { data: me } = useGetMe();
  const createQuote = useCreateQuote();
  const createClient = useCreateClient();

  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: "", phone: "", email: "", abn: "" });
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const tradeType = (me?.user?.tradeType ?? "other") as TradeType;
  const tradeTemplates = TRADE_QUOTE_TEMPLATES[tradeType] ?? [];
  const showTemplates = tradeType !== "other" && tradeTemplates.length > 0;

  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    description: "",
    state: me?.user?.state || "NSW",
    validUntil: "",
    depositPercent: "10",
    travelKm: "0",
    internalNotes: "",
  });

  const [showTravel, setShowTravel] = useState(false);
  const [lineItems, setLineItems] = useState([
    { id: 1, description: "", quantity: 1, unitCost: 0, markupPercent: Number(me?.user?.defaultMarkupPercent || 20), isInternal: false }
  ]);

  const [previewMode, setPreviewMode] = useState<"internal" | "client">("internal");

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Date.now(), description: "", quantity: 1, unitCost: 0, markupPercent: Number(me?.user?.defaultMarkupPercent || 20), isInternal: false }]);
  };

  const applyTemplate = (templateIndex: number) => {
    const template = tradeTemplates[templateIndex];
    if (!template) return;
    const newItems = template.items.map((item, idx) => ({
      id: Date.now() + idx,
      description: item.desc,
      quantity: item.qty,
      unitCost: item.unit_cost,
      markupPercent: item.markup,
      isInternal: false,
    }));
    setLineItems(newItems);
    setTemplatesOpen(false);
  };

  const removeLineItem = (id: number) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: number, field: string, value: any) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    lineItems.forEach(item => {
      const cost = item.unitCost * item.quantity;
      const markup = cost * (item.markupPercent / 100);
      subtotal += cost + markup;
    });

    if (showTravel && formData.travelKm) {
      subtotal += Number(formData.travelKm) * 0.88; // Standard rate
    }

    const gstAmount = subtotal * 0.1;
    const total = subtotal + gstAmount;
    const depositAmount = total * (Number(formData.depositPercent) / 100);

    return { subtotal, gstAmount, total, depositAmount };
  };

  const totals = calculateTotals();
  const getDepositLimit = (state: string, total: number) => {
    switch (state) {
      case "VIC":
        return total < 20000
          ? { maxPercent: 10, maxFixed: null, message: "VIC: max 10% for jobs under $20,000" }
          : { maxPercent: 5, maxFixed: null, message: "VIC: max 5% for jobs $20,000 and over" };
      case "NSW":
        return total < 20000
          ? { maxPercent: 10, maxFixed: null, message: "NSW: max 10% for jobs under $20,000" }
          : { maxPercent: null, maxFixed: 1000, message: "NSW: max $1,000 deposit for jobs $20,000 and over" };
      case "QLD":
        return total < 3300
          ? { maxPercent: null, maxFixed: 100, message: "QLD: max $100 deposit for jobs under $3,300" }
          : { maxPercent: 10, maxFixed: null, message: "QLD: max 10% deposit for residential jobs" };
      default:
        return { maxPercent: null, maxFixed: null, message: "No fixed statutory limit in this state." };
    }
  };
  const depositLimit = getDepositLimit(formData.state, totals.total);
  const depositPct = Number(formData.depositPercent);
  const isDepositCompliant =
    (depositLimit.maxPercent === null || depositPct <= depositLimit.maxPercent) &&
    (depositLimit.maxFixed === null || totals.depositAmount <= depositLimit.maxFixed);

  const handleCreateClient = () => {
    if (!newClientData.name) {
      toast({ title: "Client name required", variant: "destructive" });
      return;
    }
    createClient.mutate({ data: newClientData }, {
      onSuccess: (client) => {
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        setFormData(prev => ({ ...prev, clientId: String(client.id) }));
        setNewClientOpen(false);
        setNewClientData({ name: "", phone: "", email: "", abn: "" });
        toast({ title: `${client.name} added as client` });
      },
      onError: () => {
        toast({ title: "Failed to create client", variant: "destructive" });
      }
    });
  };

  const handleSave = () => {
    if (!formData.title || !formData.clientId) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    createQuote.mutate({
      data: {
        clientId: Number(formData.clientId),
        title: formData.title,
        description: formData.description,
        state: formData.state,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
        depositPercent: Number(formData.depositPercent),
        travelKm: showTravel ? Number(formData.travelKm) : 0,
        internalNotes: formData.internalNotes,
        lineItems: lineItems.map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unitCost: item.unitCost,
          markupPercent: item.markupPercent,
          isInternal: item.isInternal,
          sortOrder: idx
        }))
      }
    }, {
      onSuccess: (res) => {
        toast({ title: "Quote created successfully" });
        setLocation(`/quotes/${res.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create quote", variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <Header title="New Quote" showBack onBack={() => window.history.back()} />
      
      <div className="px-6 pb-[150px] space-y-8 mt-2">
        
        {/* Toggle Mode */}
        <div className="bg-white/5 border border-white/10 p-1.5 rounded-2xl flex sticky top-[72px] z-20 backdrop-blur-md">
          <button 
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${previewMode === 'internal' ? 'bg-primary text-black shadow-sm' : 'text-muted-foreground hover:text-white'}`}
            onClick={() => setPreviewMode('internal')}
          >
            Internal Edit
          </button>
          <button 
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${previewMode === 'client' ? 'bg-white/10 text-white shadow-sm' : 'text-muted-foreground hover:text-white'}`}
            onClick={() => setPreviewMode('client')}
          >
            Client Preview
          </button>
        </div>

        {previewMode === 'internal' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Client *</label>
                <Drawer open={newClientOpen} onOpenChange={setNewClientOpen}>
                  <DrawerTrigger asChild>
                    <button
                      type="button"
                      className="text-primary text-xs font-bold uppercase tracking-wider hover:text-primary/80 flex items-center gap-1.5 transition-colors bg-primary/10 px-3 py-1.5 rounded-lg"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> New Client
                    </button>
                  </DrawerTrigger>
                  <DrawerContent className="bg-[#1C1C1E] border-white/10 h-[85vh] rounded-t-[32px]">
                    <div className="p-6 overflow-y-auto pb-32">
                      <DrawerTitle className="text-2xl font-bold text-white mb-6">New Client</DrawerTitle>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name *</label>
                          <Input value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone</label>
                          <Input type="tel" value={newClientData.phone} onChange={e => setNewClientData({...newClientData, phone: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</label>
                          <Input type="email" value={newClientData.email} onChange={e => setNewClientData({...newClientData, email: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ABN</label>
                          <Input value={newClientData.abn} onChange={e => setNewClientData({...newClientData, abn: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/10">
                      <Button onClick={handleCreateClient} disabled={createClient.isPending} className="w-full h-14 rounded-xl text-lg font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                        {createClient.isPending ? "Saving..." : "Create Client"}
                      </Button>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
              {clients.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setNewClientOpen(true)}
                  className="w-full h-14 border-2 border-dashed border-white/20 rounded-xl text-white/50 font-bold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Add your first client
                </button>
              ) : (
                <Select value={formData.clientId} onValueChange={v => setFormData({...formData, clientId: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-xl focus:ring-primary text-white font-medium">
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                    {clients.map(c => <SelectItem key={c.id} value={String(c.id)} className="focus:bg-white/10 focus:text-white">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </section>

            <section className="space-y-5 bg-white/5 p-6 rounded-3xl border border-white/10">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Job Title *</label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="h-14 text-lg font-bold bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white"
                  placeholder="e.g. Bathroom Renovation"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white resize-none min-h-[100px] text-base"
                  placeholder="Brief scope of work..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">State</label>
                  <Select value={formData.state} onValueChange={v => setFormData({...formData, state: v})}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-xl focus:ring-primary text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                      {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(s => (
                        <SelectItem key={s} value={s} className="focus:bg-white/10">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Valid Until</label>
                  <Input 
                    type="date"
                    value={formData.validUntil} 
                    onChange={e => setFormData({...formData, validUntil: e.target.value})}
                    className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white block w-full"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white tracking-tight">Line Items</h3>
                {showTemplates && (
                  <Drawer open={templatesOpen} onOpenChange={setTemplatesOpen}>
                    <DrawerTrigger asChild>
                      <button
                        className="text-primary text-xs font-bold uppercase tracking-wider hover:text-primary/80 flex items-center gap-1.5 transition-colors bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20"
                      >
                        <LayoutTemplate className="w-3.5 h-3.5" /> Templates
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="bg-[#1C1C1E] border-white/10 h-[70vh] rounded-t-[32px]">
                      <div className="p-6 overflow-y-auto pb-8">
                        <DrawerTitle className="text-2xl font-bold text-white mb-6">Job Templates</DrawerTitle>
                        <div className="space-y-3">
                          {tradeTemplates.map((template, idx) => (
                            <button
                              key={idx}
                              onClick={() => applyTemplate(idx)}
                              className="w-full text-left p-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-[0.98] transition-all group"
                            >
                              <div className="font-bold text-lg text-white mb-2 group-hover:text-primary transition-colors">{template.name}</div>
                              <div className="text-sm text-muted-foreground">{template.items.length} items pre-filled</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
              </div>
              
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="bg-white/5 rounded-3xl p-5 border border-white/10 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/50 group-hover:bg-primary transition-colors" />
                    
                    <button 
                      onClick={() => removeLineItem(item.id)}
                      className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="space-y-5 pr-8">
                      <Input 
                        placeholder="Item description" 
                        value={item.description}
                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                        className="font-bold text-base bg-transparent border-b border-white/10 rounded-none px-0 h-10 focus:ring-0 focus:border-primary focus:shadow-none placeholder:text-white/20 text-white"
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-muted-foreground font-bold block tracking-wider">Qty</label>
                          <Input 
                            type="number" 
                            value={item.quantity}
                            onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                            className="h-12 text-center bg-black/20 border-white/10 rounded-xl text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-muted-foreground font-bold block tracking-wider">Cost ($)</label>
                          <Input 
                            type="number" 
                            value={item.unitCost}
                            onChange={e => updateLineItem(item.id, 'unitCost', Number(e.target.value))}
                            className="h-12 text-center bg-black/20 border-white/10 rounded-xl text-white font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase text-muted-foreground font-bold block tracking-wider">Markup %</label>
                          <Input 
                            type="number" 
                            value={item.markupPercent}
                            onChange={e => updateLineItem(item.id, 'markupPercent', Number(e.target.value))}
                            className="h-12 text-center bg-black/20 border-white/10 rounded-xl text-primary font-bold"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-3">
                          <Switch 
                            checked={item.isInternal}
                            onCheckedChange={v => updateLineItem(item.id, 'isInternal', v)}
                            className="data-[state=checked]:bg-primary"
                          />
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Hide from client</span>
                        </div>
                        <div className="font-black text-white text-lg tabular-nums">
                          {formatCurrency((item.unitCost * item.quantity) * (1 + item.markupPercent/100))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={addLineItem}
                className="w-full h-14 border-2 border-dashed border-white/10 rounded-2xl text-white/60 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Add Blank Item
              </button>
            </section>

            <section className="bg-white/5 rounded-3xl p-5 border border-white/10">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white">Travel Charge</div>
                <Switch checked={showTravel} onCheckedChange={setShowTravel} className="data-[state=checked]:bg-primary" />
              </div>
              {showTravel && (
                <div className="flex items-center gap-4 mt-5 pt-5 border-t border-white/10">
                  <Input 
                    type="number" 
                    placeholder="Km" 
                    value={formData.travelKm}
                    onChange={e => setFormData({...formData, travelKm: e.target.value})}
                    className="w-24 h-12 bg-black/20 border-white/10 text-white text-center font-bold text-lg rounded-xl focus-visible:ring-primary"
                  />
                  <div className="text-sm font-bold text-muted-foreground">× $0.88/km =</div>
                  <div className="font-black text-white text-xl tabular-nums ml-auto">{formatCurrency(Number(formData.travelKm) * 0.88)}</div>
                </div>
              )}
            </section>

            <section className="space-y-5 bg-white/5 p-6 rounded-3xl border border-white/10">
              <h3 className="text-xl font-bold text-white tracking-tight">Terms & Deposit</h3>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Deposit Required (%)</label>
                <Input 
                  type="number"
                  value={formData.depositPercent}
                  onChange={e => setFormData({...formData, depositPercent: e.target.value})}
                  className="h-14 bg-black/20 border-white/10 text-white text-xl font-bold rounded-xl focus-visible:ring-primary"
                />
              </div>
              
              <div className={`p-5 rounded-2xl border ${isDepositCompliant ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                <div className="flex items-start gap-4">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-base mb-1">Deposit: {formatCurrency(totals.depositAmount)}</div>
                    <div className="text-sm leading-relaxed opacity-90">
                      {isDepositCompliant 
                        ? `Compliant — ${depositLimit.message}`
                        : `Warning: ${depositLimit.message}. Reduce deposit to comply.`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Internal Notes</label>
                <Textarea 
                  value={formData.internalNotes}
                  onChange={e => setFormData({...formData, internalNotes: e.target.value})}
                  className="bg-black/20 border-white/10 rounded-xl focus-visible:ring-primary text-white resize-none min-h-[100px]"
                  placeholder="Not visible to client..."
                />
              </div>
            </section>

            {/* Summary Block */}
            <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative z-10 space-y-3 text-sm font-medium text-white/80">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (10%)</span>
                  <span className="tabular-nums">{formatCurrency(totals.gstAmount)}</span>
                </div>
                <div className="flex justify-between items-end mt-2 pt-4 border-t border-primary/20">
                  <span className="font-bold text-primary uppercase tracking-wider text-xs">Total</span>
                  <span className="text-4xl font-black text-white tracking-tight tabular-nums">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {previewMode === 'client' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white text-black p-8 rounded-3xl min-h-[600px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-primary" />
            
            <div className="text-center mb-10 pt-4">
              <div className="text-2xl font-black tracking-tight">{me?.user?.businessName || "Your Business"}</div>
              <div className="text-gray-400 text-xs font-bold tracking-widest mt-2 uppercase">Quote</div>
            </div>
            
            <div className="mb-10">
              <div className="font-bold text-xl mb-3">{formData.title || "Job Title"}</div>
              <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{formData.description}</div>
            </div>

            <div className="space-y-5 mb-10">
              <div className="font-bold text-xs uppercase tracking-wider text-gray-400 border-b-2 border-gray-100 pb-3">Scope of Work</div>
              {lineItems.filter(item => !item.isInternal).map(item => (
                <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0 pb-3">
                  <div className="flex-1 pr-4 font-medium text-gray-800">{item.description || "Item description"} <span className="text-gray-400 text-xs ml-2 font-bold">x{item.quantity}</span></div>
                  <div className="font-bold tabular-nums">{formatCurrency((item.unitCost * item.quantity) * (1 + item.markupPercent/100))}</div>
                </div>
              ))}
              {showTravel && Number(formData.travelKm) > 0 && (
                 <div className="flex justify-between text-sm py-1 border-b border-gray-50 pb-3">
                 <div className="flex-1 font-medium text-gray-800">Travel to site</div>
                 <div className="font-bold tabular-nums">{formatCurrency(Number(formData.travelKm) * 0.88)}</div>
               </div>
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl space-y-3 mb-10">
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>GST Includes</span>
                <span className="tabular-nums">{formatCurrency(totals.gstAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-2xl pt-4 border-t-2 border-gray-200 mt-2 text-gray-900">
                <span>Total Due</span>
                <span className="tabular-nums">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 leading-relaxed font-medium">
              <span className="font-bold text-blue-900">Deposit required:</span> {formatCurrency(totals.depositAmount)} ({formData.depositPercent}%)<br/><br/>
              This quote is valid until {formData.validUntil ? formatDate(formData.validUntil) : "30 days from sent date"}.
              All work will be completed in accordance with standard industry practices.
              Payment is required strictly within 7 days of invoice unless otherwise agreed.
            </div>
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-white/10 z-40">
        <div className="max-w-[480px] mx-auto">
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-black shadow-[0_0_20px_rgba(20,184,166,0.3)]"
            onClick={handleSave}
            disabled={createQuote.isPending || !isDepositCompliant}
          >
            {createQuote.isPending ? "Saving..." : `Create Quote · ${formatCurrency(totals.total)}`}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
