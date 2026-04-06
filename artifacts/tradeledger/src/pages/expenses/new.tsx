import React, { useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useCreateExpense, useGetJobs } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, Wrench, Fuel, Car, HardHat, Phone, Users, FileBadge, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

const CATEGORIES = [
  { id: "tools_equipment", label: "Tools & Equipment", icon: Wrench },
  { id: "vehicle_fuel", label: "Vehicle - Fuel", icon: Fuel },
  { id: "vehicle_other", label: "Vehicle - Other", icon: Car },
  { id: "protective_clothing", label: "Protective Clothing", icon: HardHat },
  { id: "phone_internet", label: "Phone & Internet", icon: Phone },
  { id: "subcontractor_payment", label: "Subcontractor Payment", icon: Users },
  { id: "licences_subs", label: "Licences & Subs", icon: FileBadge },
  { id: "other_business", label: "Other Business", icon: MoreHorizontal },
];

export default function NewExpense() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialJobId = params.get("jobId");

  const { toast } = useToast();
  const createExpense = useCreateExpense();
  const { data: jobs = [] } = useGetJobs();
  const activeJobs = jobs.filter(j => j.status === "active" || j.status === "in_progress");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    vendor: "",
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
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    createExpense.mutate({
      data: {
        amount: parsedAmount,
        category: formData.category,
        vendor: formData.vendor,
        expenseDate: new Date(formData.expenseDate).toISOString(),
        jobId: formData.jobId !== "none" ? Number(formData.jobId) : undefined,
        isGstClaimable: formData.isGstClaimable,
        receiptUrl: receiptUrl ?? undefined,
        subcontractorName: formData.category === "subcontractor_payment" ? formData.subcontractorName : undefined,
        subcontractorAbn: formData.category === "subcontractor_payment" ? formData.subcontractorAbn : undefined,
        addToTpar: formData.category === "subcontractor_payment" ? formData.addToTpar : undefined,
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
      <Header title="Add Expense" showBack onBack={() => window.history.back()} />
      
      <div className="px-5 pb-[160px] space-y-6 animate-in fade-in slide-in-from-bottom-4">
        
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
          className="w-full h-40 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-3 text-gray-500 hover:bg-gray-200 transition-colors active:scale-[0.98] disabled:opacity-60"
        >
          {receiptUrl ? (
            <>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <span className="font-semibold text-sm text-green-700">Receipt Uploaded</span>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <span className="font-semibold text-sm">{receiptUploading ? "Uploading..." : "Snap Receipt"}</span>
            </>
          )}
        </button>

        <div className="space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount *</label>
              <Input 
                type="number" 
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="h-14 text-2xl font-bold bg-secondary border-none" 
                placeholder="$0.00"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date *</label>
              <Input 
                type="date" 
                value={formData.expenseDate}
                onChange={e => setFormData({...formData, expenseDate: e.target.value})}
                className="h-14 bg-secondary border-none" 
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor / Store</label>
            <Input 
              value={formData.vendor}
              onChange={e => setFormData({...formData, vendor: e.target.value})}
              className="h-12 bg-secondary border-none font-medium" 
              placeholder="e.g. Bunnings"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary rounded-xl mt-2">
            <div>
              <div className="font-semibold text-sm">Includes GST</div>
              <div className="text-xs text-gray-500">Claimable: {formatCurrency(gstAmount)}</div>
            </div>
            <Switch 
              checked={formData.isGstClaimable}
              onCheckedChange={v => setFormData({...formData, isGstClaimable: v})}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Category *</label>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(cat => {
              const isSelected = formData.category === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFormData({...formData, category: cat.id})}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 text-center transition-all ${
                    isSelected ? "border-primary bg-primary text-white shadow-md" : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
                  }`}
                >
                  <cat.icon className="w-6 h-6" />
                  <span className="text-xs font-semibold leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {formData.category === "subcontractor_payment" && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-2">
            <div className="font-bold text-amber-900 text-sm">Subcontractor Details</div>
            <div className="space-y-3">
              <Input 
                placeholder="Contractor Name" 
                value={formData.subcontractorName}
                onChange={e => setFormData({...formData, subcontractorName: e.target.value})}
                className="bg-white border-amber-200"
              />
              <Input 
                placeholder="ABN" 
                value={formData.subcontractorAbn}
                onChange={e => setFormData({...formData, subcontractorAbn: e.target.value})}
                className="bg-white border-amber-200"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm font-medium text-amber-900">Add to TPAR Register</div>
              <Switch 
                checked={formData.addToTpar}
                onCheckedChange={v => setFormData({...formData, addToTpar: v})}
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Link to Job (Optional)</label>
          <Select value={formData.jobId} onValueChange={v => setFormData({...formData, jobId: v})}>
            <SelectTrigger className="h-14 bg-white border-gray-200 rounded-2xl font-medium">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No job</SelectItem>
              {activeJobs.map(j => (
                <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-white border-t border-gray-100 z-40">
        <div className="max-w-[480px] mx-auto">
          <Button 
            className="w-full h-14 rounded-full text-lg font-semibold bg-primary hover:bg-primary/90 text-white"
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
