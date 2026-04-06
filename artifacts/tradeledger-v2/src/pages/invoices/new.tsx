import React, { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useCreateInvoice, useGetJobs, useGetMe } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";

export default function NewInvoice() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialJobId = params.get("jobId");
  
  const { toast } = useToast();
  const createInvoice = useCreateInvoice();
  const { data: jobs = [] } = useGetJobs();
  const { data: me } = useGetMe();

  const [formData, setFormData] = useState({
    jobId: initialJobId || "",
    type: "Full",
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days default
    total: "",
    stripePaymentLink: ""
  });

  const selectedJob = jobs.find(j => j.id === Number(formData.jobId));
  
  // Auto-fill total from job if selected and total is empty
  React.useEffect(() => {
    if (selectedJob && selectedJob.total && !formData.total && formData.type === "Full") {
      setFormData(prev => ({...prev, total: selectedJob.total!}));
    }
  }, [selectedJob, formData.type]);

  const parsedTotal = Number(formData.total) || 0;
  const gstAmount = parsedTotal - (parsedTotal / 1.1);
  const subtotal = parsedTotal - gstAmount;

  const handleSave = () => {
    if (!formData.jobId || !formData.total) {
      toast({ title: "Job and Total required", variant: "destructive" });
      return;
    }

    createInvoice.mutate({
      data: {
        jobId: Number(formData.jobId),
        type: formData.type,
        total: parsedTotal,
        subtotal: subtotal,
        gstAmount: gstAmount,
        dueDate: new Date(formData.dueDate).toISOString(),
        stripePaymentLink: formData.stripePaymentLink
      }
    }, {
      onSuccess: (res) => {
        toast({ title: "Invoice created" });
        setLocation(`/jobs/${formData.jobId}`);
      }
    });
  };

  return (
    <Layout>
      <Header title="New Invoice" showBack onBack={() => window.history.back()} />
      
      <div className="px-5 pb-[150px] space-y-6 animate-in fade-in slide-in-from-bottom-4">
        
        <div className="space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Job</label>
            <Select value={formData.jobId} onValueChange={v => setFormData({...formData, jobId: v})}>
              <SelectTrigger className="h-14 bg-secondary border-none font-medium">
                <SelectValue placeholder="Select Job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map(j => (
                  <SelectItem key={j.id} value={String(j.id)}>{j.title} - {j.client?.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Type</label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger className="h-12 bg-secondary border-none font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Deposit">Deposit</SelectItem>
                  <SelectItem value="Progress">Progress</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Due Date</label>
              <Input 
                type="date" 
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
                className="h-12 bg-secondary border-none" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-primary text-white rounded-3xl p-6 shadow-lg">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Invoice Total</label>
            <div className="flex items-center text-4xl font-bold">
              <span className="text-gray-400 mr-1">$</span>
              <input 
                type="number" 
                value={formData.total}
                onChange={e => setFormData({...formData, total: e.target.value})}
                className="bg-transparent border-none text-white w-full focus:ring-0 p-0 shadow-none placeholder:text-gray-600"
                placeholder="0.00"
              />
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10 space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Include (10%)</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Payment Link (Stripe/Square)</label>
          <Input 
            value={formData.stripePaymentLink}
            onChange={e => setFormData({...formData, stripePaymentLink: e.target.value})}
            placeholder="https://buy.stripe.com/..." 
            className="h-14 bg-white border-gray-200 rounded-2xl font-medium" 
          />
        </div>

      </div>

      <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-white border-t border-gray-100 z-40">
        <div className="max-w-[480px] mx-auto">
          <Button 
            className="w-full h-14 rounded-full text-lg font-semibold bg-primary hover:bg-primary/90 text-white"
            onClick={handleSave}
            disabled={createInvoice.isPending}
          >
            {createInvoice.isPending ? "Generating..." : "Generate Invoice"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
