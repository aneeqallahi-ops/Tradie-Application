import React, { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useCreateInvoice, useGetJobs, useGetMe } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { motion } from "framer-motion";
import { Link2 } from "lucide-react";

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
      setFormData(prev => ({...prev, total: String(selectedJob.total)}));
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
      
      <div className="px-6 pb-[150px] space-y-6 mt-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          <div className="space-y-5 bg-white/5 p-6 rounded-3xl border border-white/10">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Job *</label>
              <Select value={formData.jobId} onValueChange={v => setFormData({...formData, jobId: v})}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-medium">
                  <SelectValue placeholder="Select Job" />
                </SelectTrigger>
                <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                  {jobs.map(j => (
                    <SelectItem key={j.id} value={String(j.id)} className="focus:bg-white/10">
                      {j.title} - {j.client?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                    <SelectItem value="Full" className="focus:bg-white/10">Full</SelectItem>
                    <SelectItem value="Deposit" className="focus:bg-white/10">Deposit</SelectItem>
                    <SelectItem value="Progress" className="focus:bg-white/10">Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Due Date</label>
                <Input 
                  type="date" 
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white block w-full" 
                />
              </div>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative z-10">
              <label className="text-[11px] font-bold text-primary uppercase tracking-wider block mb-2">Invoice Total *</label>
              <div className="flex items-center text-5xl font-black tabular-nums tracking-tight">
                <span className="text-white/40 mr-1">$</span>
                <input 
                  type="number" 
                  value={formData.total}
                  onChange={e => setFormData({...formData, total: e.target.value})}
                  className="bg-transparent border-none text-white w-full focus:ring-0 p-0 shadow-none placeholder:text-white/20 h-16"
                  placeholder="0.00"
                />
              </div>
              
              <div className="mt-6 pt-4 border-t border-primary/20 space-y-2 text-sm text-white/80 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Included (10%)</span>
                  <span>{formatCurrency(gstAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-2">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Payment Link (Stripe/Square)
            </label>
            <Input 
              value={formData.stripePaymentLink}
              onChange={e => setFormData({...formData, stripePaymentLink: e.target.value})}
              placeholder="https://buy.stripe.com/..." 
              className="h-14 bg-black/20 border-white/10 rounded-xl focus:ring-primary text-white font-medium" 
            />
          </div>

        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-white/10 z-40">
        <div className="max-w-[480px] mx-auto">
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-black shadow-[0_0_20px_rgba(20,184,166,0.3)]"
            onClick={handleSave}
            disabled={createInvoice.isPending || !formData.jobId || !formData.total}
          >
            {createInvoice.isPending ? "Generating..." : "Generate Invoice"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
