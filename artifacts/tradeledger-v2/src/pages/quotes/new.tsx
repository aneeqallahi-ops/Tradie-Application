import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetClients, useCreateQuote, useGetMe, useCreateClient } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Trash2, Plus, Info, UserPlus, LayoutTemplate } from "lucide-react";
import { TRADE_QUOTE_TEMPLATES, type TradeType } from "@/lib/trade-config";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
      
      <div className="px-5 pb-[150px] space-y-8 animate-in fade-in slide-in-from-bottom-4">
        
        {/* Toggle Mode */}
        <div className="bg-secondary p-1 rounded-lg flex">
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${previewMode === 'internal' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
            onClick={() => setPreviewMode('internal')}
          >
            Internal Edit
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${previewMode === 'client' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
            onClick={() => setPreviewMode('client')}
          >
            Client Preview
          </button>
        </div>

        {previewMode === 'internal' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Client *</label>
                <button
                  type="button"
                  onClick={() => setNewClientOpen(true)}
                  className="text-accent text-sm font-semibold hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> New Client
                </button>
              </div>
              {clients.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setNewClientOpen(true)}
                  className="w-full h-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-medium hover:border-accent hover:text-accent transition-colors"
                >
                  + Add your first client
                </button>
              ) : (
                <Select value={formData.clientId} onValueChange={v => setFormData({...formData, clientId: v})}>
                  <SelectTrigger className="bg-secondary border-none h-12">
                    <SelectValue placeholder="Select Client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </section>

            <section className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Job Title *</label>
                <Input 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="h-12 text-lg font-medium"
                  placeholder="e.g. Bathroom Renovation"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Description</label>
                <Textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="bg-secondary border-none resize-none min-h-[100px]"
                  placeholder="Brief scope of work..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">State</label>
                  <Select value={formData.state} onValueChange={v => setFormData({...formData, state: v})}>
                    <SelectTrigger className="bg-secondary border-none h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Valid Until</label>
                  <Input 
                    type="date"
                    value={formData.validUntil} 
                    onChange={e => setFormData({...formData, validUntil: e.target.value})}
                    className="h-12"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="font-bold text-lg">Line Items</h3>
              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 relative">
                    <button 
                      onClick={() => removeLineItem(item.id)}
                      className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="space-y-3 pr-8">
                      <Input 
                        placeholder="Item description" 
                        value={item.description}
                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                        className="font-medium bg-transparent border-b border-gray-100 rounded-none px-0 h-10 focus:ring-0 focus:border-primary focus:shadow-none"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block">Qty</label>
                          <Input 
                            type="number" 
                            value={item.quantity}
                            onChange={e => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                            className="h-10 text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block">Unit Cost ($)</label>
                          <Input 
                            type="number" 
                            value={item.unitCost}
                            onChange={e => updateLineItem(item.id, 'unitCost', Number(e.target.value))}
                            className="h-10 text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase text-gray-400 font-bold mb-1 block">Markup %</label>
                          <Input 
                            type="number" 
                            value={item.markupPercent}
                            onChange={e => updateLineItem(item.id, 'markupPercent', Number(e.target.value))}
                            className="h-10 text-center"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={item.isInternal}
                            onCheckedChange={v => updateLineItem(item.id, 'isInternal', v)}
                            className="scale-75 origin-left"
                          />
                          <span className="text-xs text-gray-500">Hide from client</span>
                        </div>
                        <div className="font-bold">
                          {formatCurrency((item.unitCost * item.quantity) * (1 + item.markupPercent/100))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`grid gap-3 ${showTemplates ? "grid-cols-2" : "grid-cols-1"}`}>
                <button 
                  onClick={addLineItem}
                  className="py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-semibold hover:border-gray-300 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
                {showTemplates && (
                  <button
                    onClick={() => setTemplatesOpen(true)}
                    className="py-4 border-2 border-dashed border-accent/40 rounded-2xl text-accent font-semibold hover:border-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2"
                  >
                    <LayoutTemplate className="w-4 h-4" /> Templates
                  </button>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Travel Charge</div>
                <Switch checked={showTravel} onCheckedChange={setShowTravel} />
              </div>
              {showTravel && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-50">
                  <Input 
                    type="number" 
                    placeholder="Km" 
                    value={formData.travelKm}
                    onChange={e => setFormData({...formData, travelKm: e.target.value})}
                    className="w-24 h-10"
                  />
                  <div className="text-sm text-gray-500">× $0.88/km =</div>
                  <div className="font-bold">{formatCurrency(Number(formData.travelKm) * 0.88)}</div>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="font-bold text-lg">Terms & Deposit</h3>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Deposit Required (%)</label>
                <Input 
                  type="number"
                  value={formData.depositPercent}
                  onChange={e => setFormData({...formData, depositPercent: e.target.value})}
                  className="h-12"
                />
              </div>
              
              <div className={`p-4 rounded-xl border ${isDepositCompliant ? 'bg-[#DCFCE7]/30 border-[#DCFCE7] text-[#166534]' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm">Deposit: {formatCurrency(totals.depositAmount)}</div>
                    <div className="text-xs mt-1 opacity-90">
                      {isDepositCompliant 
                        ? `Compliant — ${depositLimit.message}`
                        : `Warning: ${depositLimit.message}. Reduce deposit to comply.`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Internal Notes</label>
                <Textarea 
                  value={formData.internalNotes}
                  onChange={e => setFormData({...formData, internalNotes: e.target.value})}
                  className="bg-secondary border-none resize-none"
                  placeholder="Not visible to client..."
                />
              </div>
            </section>

            {/* Summary Block */}
            <div className="bg-primary text-white rounded-2xl p-6 shadow-lg mt-8">
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST (10%)</span>
                  <span>{formatCurrency(totals.gstAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/10">
                <span className="font-medium text-gray-200">Total</span>
                <span className="text-3xl font-bold text-white tracking-tight">{formatCurrency(totals.total)}</span>
              </div>
            </div>

          </div>
        )}

        {previewMode === 'client' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[600px]">
            <div className="text-center mb-8">
              <div className="text-2xl font-bold">{me?.user?.businessName || "Your Business"}</div>
              <div className="text-gray-500 text-sm mt-1">QUOTE</div>
            </div>
            
            <div className="mb-8">
              <div className="font-bold text-lg">{formData.title || "Job Title"}</div>
              <div className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{formData.description}</div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="font-bold border-b pb-2">Scope of Work</div>
              {lineItems.filter(item => !item.isInternal).map(item => (
                <div key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-50">
                  <div className="flex-1 pr-4">{item.description || "Item description"} <span className="text-gray-400 text-xs ml-1">x{item.quantity}</span></div>
                  <div className="font-medium">{formatCurrency((item.unitCost * item.quantity) * (1 + item.markupPercent/100))}</div>
                </div>
              ))}
              {showTravel && Number(formData.travelKm) > 0 && (
                 <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                 <div className="flex-1">Travel to site</div>
                 <div className="font-medium">{formatCurrency(Number(formData.travelKm) * 0.88)}</div>
               </div>
              )}
            </div>

            <div className="space-y-2 mt-8">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST Includes</span>
                <span>{formatCurrency(totals.gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                <span>Total Due</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <div className="mt-12 p-4 bg-gray-50 rounded-xl text-xs text-gray-500 leading-relaxed">
              <strong>Deposit:</strong> {formatCurrency(totals.depositAmount)} ({formData.depositPercent}%)<br/><br/>
              This quote is valid until {formData.validUntil ? formatDate(formData.validUntil) : "30 days from sent date"}.
              All work will be completed in accordance with standard industry practices.
              Payment is required strictly within 7 days of invoice unless otherwise agreed.
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-white border-t z-40">
        <div className="max-w-[480px] mx-auto">
          <Button 
            className="w-full h-14 rounded-full text-lg font-semibold bg-primary hover:bg-primary/90 text-white"
            onClick={handleSave}
            disabled={createQuote.isPending || !isDepositCompliant}
          >
            {createQuote.isPending ? "Saving..." : `Create Quote · ${formatCurrency(totals.total)}`}
          </Button>
        </div>
      </div>
      {/* Templates Drawer */}
      <Drawer open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DrawerContent className="bg-white h-[60vh] rounded-t-[24px]">
          <div className="p-6 overflow-y-auto pb-8">
            <DrawerTitle className="text-xl font-bold mb-4">Job Templates</DrawerTitle>
            <div className="space-y-2">
              {tradeTemplates.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => applyTemplate(idx)}
                  className="w-full text-left p-4 rounded-2xl border border-gray-100 bg-white hover:bg-secondary hover:border-gray-200 active:scale-[0.98] transition-all"
                >
                  <div className="font-semibold text-[15px] text-primary">{template.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{template.items.length} line item{template.items.length !== 1 ? "s" : ""}</div>
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* New Client Drawer */}
      <Drawer open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DrawerContent className="bg-white h-[70vh] rounded-t-[24px]">
          <div className="p-6 overflow-y-auto pb-28">
            <DrawerTitle className="text-2xl font-bold mb-6">Add New Client</DrawerTitle>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Name *</label>
                <Input
                  value={newClientData.name}
                  onChange={e => setNewClientData({ ...newClientData, name: e.target.value })}
                  placeholder="Client or company name"
                  className="h-12 bg-secondary border-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input
                  type="tel"
                  value={newClientData.phone}
                  onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })}
                  placeholder="0400 000 000"
                  className="h-12 bg-secondary border-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  value={newClientData.email}
                  onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                  placeholder="client@example.com"
                  className="h-12 bg-secondary border-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">ABN (optional)</label>
                <Input
                  value={newClientData.abn}
                  onChange={e => setNewClientData({ ...newClientData, abn: e.target.value })}
                  placeholder="XX XXX XXX XXX"
                  className="h-12 bg-secondary border-none"
                />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
            <Button
              onClick={handleCreateClient}
              disabled={createClient.isPending}
              className="w-full h-14 rounded-full text-lg font-semibold"
            >
              {createClient.isPending ? "Adding..." : "Add Client"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
