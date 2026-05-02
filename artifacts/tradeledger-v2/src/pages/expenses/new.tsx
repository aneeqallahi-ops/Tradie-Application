import React, { useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useCreateExpense, useGetJobs, useGetMe, useGetTaxPrompts } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, CheckCircle2, Image as ImageIcon, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { TRADE_EXPENSE_CATEGORIES, type TradeType } from "@/lib/trade-config";
import DeductiblePrompt from "@/components/deductible-prompt";
import { motion } from "framer-motion";

export default function NewExpense() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialJobId = params.get("jobId");

  const { toast } = useToast();
  const createExpense = useCreateExpense();
  const { data: jobs = [] } = useGetJobs();
  const { data: me } = useGetMe();
  const activeJobs = jobs.filter(j => j.status === "active" || j.status === "in_progress");

  const tradeType = (me?.user?.tradeType ?? "other") as TradeType;
  const categories = TRADE_EXPENSE_CATEGORIES[tradeType] ?? TRADE_EXPENSE_CATEGORIES.other;
  const { data: prompts, refetch: refetchPrompts } = useGetTaxPrompts();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    vendor: "",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
    category: "",
    jobId: initialJobId || "none",
    isGstClaimable: true,
    subcontractorName: "",
    subcontractorAbn: "",
    addToTpar: true
  });

  const parsedAmount = Number(formData.amount) || 0;
  const gstAmount = formData.isGstClaimable ? parsedAmount / 11 : 0;

  const selectedCategory = categories.find(c => c.key === formData.category);
  const descriptionPlaceholder = selectedCategory?.examples
    ? `e.g. ${selectedCategory.examples}`
    : "Description (optional)";

  const isSubcontractor = formData.category === "subcontractor_payment";

  const handleReceiptCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptUploading(true);
    try {
      const fd = new FormData();
      fd.append("receipt", file);
      const res = await fetch("/api/uploads/receipt", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { fileUrl: string };
      setReceiptUrl(data.fileUrl);
      toast({ title: "Receipt uploaded" });
    } catch {
      toast({ title: "Failed to upload receipt", variant: "destructive" });
    } finally {
      setReceiptUploading(false);
    }
  };

  const handleSave = () => {
    if (!formData.amount || !formData.category || !formData.expenseDate) {
      toast({ title: "Amount, Date and Category required", variant: "destructive" });
      return;
    }

    createExpense.mutate({
      data: {
        amount: parsedAmount,
        category: formData.category,
        vendor: formData.vendor,
        description: formData.description || undefined,
        expenseDate: new Date(formData.expenseDate).toISOString(),
        jobId: formData.jobId !== "none" ? Number(formData.jobId) : undefined,
        isGstClaimable: formData.isGstClaimable,
        receiptUrl: receiptUrl ?? undefined,
        subcontractorName: isSubcontractor ? formData.subcontractorName : undefined,
        subcontractorAbn: isSubcontractor ? formData.subcontractorAbn : undefined,
        addToTpar: isSubcontractor ? formData.addToTpar : undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Expense saved" });
        if (initialJobId) {
          setLocation(`/jobs/${initialJobId}`);
        } else {
          setLocation("/expenses");
        }
      },
      onError: () => {
        toast({ title: "Failed to save expense", variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <Header title="Capture Expense" showBack onBack={() => window.history.back()} />
      
      <div className="px-6 pb-[150px] space-y-6 mt-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Receipt Capture */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={handleReceiptCapture}
            disabled={receiptUploading}
            className="w-full h-40 bg-white/5 rounded-3xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 text-white/50 hover:bg-white/10 hover:border-white/30 hover:text-white transition-all active:scale-[0.98] disabled:opacity-60 relative overflow-hidden group"
          >
            {receiptUrl ? (
              <>
                <div className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm" style={{ backgroundImage: `url(${receiptUrl})` }} />
                <div className="relative z-10 w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="relative z-10 font-bold text-sm text-emerald-400 uppercase tracking-wider">Receipt Uploaded</span>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.1)] group-hover:bg-primary group-hover:text-black transition-colors">
                  <Camera className="w-6 h-6 text-primary group-hover:text-black transition-colors" />
                </div>
                <span className="font-bold text-sm uppercase tracking-wider">{receiptUploading ? "Uploading..." : "Snap Receipt"}</span>
              </>
            )}
          </button>

          <div className="space-y-5 bg-white/5 p-6 rounded-3xl border border-white/10">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-black text-xl">$</span>
                  <Input 
                    type="number" 
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="h-16 pl-10 text-2xl font-black bg-black/20 border-white/10 rounded-xl focus:ring-primary text-white tabular-nums tracking-tight" 
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date *</label>
                <Input 
                  type="date" 
                  value={formData.expenseDate}
                  onChange={e => setFormData({...formData, expenseDate: e.target.value})}
                  className="h-16 bg-black/20 border-white/10 rounded-xl focus:ring-primary text-white block w-full font-bold" 
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vendor / Store</label>
              <Input 
                value={formData.vendor}
                onChange={e => setFormData({...formData, vendor: e.target.value})}
                className="h-14 bg-black/20 border-white/10 rounded-xl focus:ring-primary text-white font-medium" 
                placeholder="e.g. Bunnings"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Description</label>
              <Input
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="h-14 bg-black/20 border-white/10 rounded-xl focus:ring-primary text-white font-medium"
                placeholder={descriptionPlaceholder}
              />
            </div>

            <div className="flex items-center justify-between p-5 bg-primary/10 border border-primary/20 rounded-2xl mt-4">
              <div>
                <div className="font-bold text-white text-sm">Includes GST</div>
                <div className="text-xs font-bold text-primary uppercase tracking-wider mt-1">Claimable: {formatCurrency(gstAmount)}</div>
              </div>
              <Switch 
                checked={formData.isGstClaimable}
                onCheckedChange={v => setFormData({...formData, isGstClaimable: v})}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-2 block">Category *</label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => {
                const isSelected = formData.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setFormData({...formData, category: cat.key, description: ""})}
                    className={`p-4 rounded-2xl border flex flex-col gap-2 text-left transition-all ${
                      isSelected 
                        ? "border-primary bg-primary text-black shadow-[0_0_15px_rgba(20,184,166,0.3)]" 
                        : "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="font-black text-base leading-none shrink-0 tracking-tight">{cat.label.split(" ")[0]}</span>
                    <span className={`text-[11px] font-bold uppercase tracking-wider leading-tight ${isSelected ? 'text-black/70' : 'text-muted-foreground'}`}>{cat.label.split(" ").slice(1).join(" ")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contextual deductible prompt */}
          {formData.category && (() => {
            const EXPENSE_TO_PROMPT_KEY: Record<string, string> = {
              vehicle_fuel: "vehicle",
              vehicle_other: "vehicle",
              electrical_materials: "materials",
              plumbing_materials: "materials",
              timber_materials: "materials",
              building_materials: "materials",
              paint_materials: "materials",
              hvac_materials: "materials",
              tile_materials: "materials",
              landscaping_materials: "materials",
              concrete_materials: "materials",
              equipment_hire: "materials",
              protective_clothing: "ppe",
              licences_subscriptions: "licences",
              subcontractor_payment: "subcontractor",
            };
            const promptKey = EXPENSE_TO_PROMPT_KEY[formData.category] ?? formData.category;
            const matchingPrompt = prompts?.prompts?.find(
              p => p.key === promptKey && !p.dismissed
            );
            if (!matchingPrompt) return null;
            return (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <DeductiblePrompt
                  promptKey={matchingPrompt.key}
                  label={`Can I claim ${matchingPrompt.label}?`}
                  rule={matchingPrompt.rule}
                  examples={matchingPrompt.examples}
                  onDismiss={() => refetchPrompts()}
                  compact
                />
              </motion.div>
            );
          })()}

          {isSubcontractor && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 space-y-5">
              <div className="font-bold text-amber-500 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Subcontractor Details
              </div>
              <div className="space-y-4">
                <Input 
                  placeholder="Contractor / Business Name" 
                  value={formData.subcontractorName}
                  onChange={e => setFormData({...formData, subcontractorName: e.target.value})}
                  className="h-14 bg-black/20 border-amber-500/20 text-white placeholder:text-white/30"
                />
                <Input 
                  placeholder="ABN" 
                  value={formData.subcontractorAbn}
                  onChange={e => setFormData({...formData, subcontractorAbn: e.target.value})}
                  className="h-14 bg-black/20 border-amber-500/20 text-white placeholder:text-white/30"
                />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-amber-500/20">
                <div className="text-[11px] font-bold text-amber-500/80 uppercase tracking-wider">Add to TPAR Register</div>
                <Switch 
                  checked={formData.addToTpar}
                  onCheckedChange={v => setFormData({...formData, addToTpar: v})}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </motion.div>
          )}

          <div className="space-y-2 bg-white/5 p-6 rounded-3xl border border-white/10">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Link to Job (Optional)</label>
            <Select value={formData.jobId} onValueChange={v => setFormData({...formData, jobId: v})}>
              <SelectTrigger className="h-14 bg-black/20 border-white/10 rounded-xl focus:ring-primary text-white">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                <SelectItem value="none" className="focus:bg-white/10">No job</SelectItem>
                {activeJobs.map(j => (
                  <SelectItem key={j.id} value={String(j.id)} className="focus:bg-white/10">{j.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-white/10 z-40">
        <div className="max-w-[480px] mx-auto">
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-black shadow-[0_0_20px_rgba(20,184,166,0.3)]"
            onClick={handleSave}
            disabled={createExpense.isPending || receiptUploading}
          >
            {createExpense.isPending ? "Saving..." : "Save Expense"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
