import React, { useState } from "react";
import { useGetSubcontractors, useCreateSubcontractor } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Users, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Subcontractors() {
  const { data: subs = [], isLoading } = useGetSubcontractors();
  const createSub = useCreateSubcontractor();
  const { toast } = useToast();
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", abn: "", phone: "", email: "" });

  const handleSave = () => {
    if (!formData.name || !formData.abn) {
      toast({ title: "Name and ABN required", variant: "destructive" });
      return;
    }
    
    createSub.mutate({ data: formData }, {
      onSuccess: () => {
        toast({ title: "Subcontractor added" });
        setDrawerOpen(false);
        setFormData({ name: "", abn: "", phone: "", email: "" });
      }
    });
  };

  const isAbnValid = (abn: string) => {
    return abn && abn.replace(/\s/g, '').length === 11;
  };

  return (
    <Layout>
      <Header title="Subcontractors" showBack onBack={() => window.history.back()} />
      
      <div className="px-6 pb-32 mt-2">
        
        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl mb-6 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/20 blur-2xl rounded-full" />
          <div className="relative z-10 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-500 text-base mb-1">TPAR Due 28 August</div>
              <div className="text-amber-500/80 text-sm font-medium leading-relaxed">Taxable Payments Annual Report requires you to report total payments made to contractors for building and construction services.</div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-4 px-2">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Your Register</h3>
              <span className="text-[11px] font-bold text-primary uppercase tracking-widest">{subs.length} Active</span>
            </div>
            
            <AnimatePresence mode="popLayout">
              {subs.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-12 text-center text-muted-foreground bg-white/5 border border-white/10 rounded-3xl"
                >
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="font-bold text-white mb-2 text-lg">No subcontractors</p>
                  <p className="text-sm">Add subcontractors to track payments for TPAR.</p>
                </motion.div>
              ) : (
                <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5">
                  {subs.map((sub, idx) => (
                    <motion.div 
                      key={sub.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-5 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-white text-base">{sub.name}</div>
                        <div className="font-black text-white text-lg tabular-nums tracking-tight">{formatCurrency(sub.totalPaidThisFy)}</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span className="text-muted-foreground">ABN: {sub.abn}</span>
                          {isAbnValid(sub.abn || "") ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-primary tracking-wider">Paid this FY</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <div className="fixed bottom-[88px] right-6 w-16 h-16 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(20,184,166,0.3)] hover:scale-105 active:scale-95 transition-transform z-50 cursor-pointer">
            <Plus className="w-7 h-7" />
          </div>
        </DrawerTrigger>
        <DrawerContent className="bg-[#1C1C1E] border-white/10 h-[85vh] rounded-t-[32px]">
          <div className="p-6 overflow-y-auto pb-32">
            <DrawerTitle className="text-2xl font-bold text-white mb-8">Add Subcontractor</DrawerTitle>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Contractor / Business Name *</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">ABN *</label>
                <Input value={formData.abn} onChange={e => setFormData({...formData, abn: e.target.value})} placeholder="XX XXX XXX XXX" className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Phone (Optional)</label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="tel" className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Email (Optional)</label>
                <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-medium" />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/10">
            <Button onClick={handleSave} disabled={createSub.isPending} className="w-full h-14 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90 text-black shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              {createSub.isPending ? "Saving..." : "Save Contractor"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
