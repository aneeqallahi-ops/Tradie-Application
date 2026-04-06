import React, { useState } from "react";
import { useGetSubcontractors, useCreateSubcontractor } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Users, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";

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
    // Basic fake validation for mockup
    return abn && abn.replace(/\s/g, '').length === 11;
  };

  return (
    <Layout>
      <Header title="Subcontractors" showBack onBack={() => window.history.back()} />
      
      <div className="px-5 pb-32 animate-in fade-in">
        
        <div className="bg-amber-50 border-l-4 border-l-amber-500 p-4 rounded-xl mb-6">
          <div className="font-semibold text-amber-900 text-sm">TPAR Due 28 August</div>
          <div className="text-amber-800 text-xs mt-1">Taxable Payments Annual Report requires you to report total payments made to contractors for building and construction services.</div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-bold text-lg text-gray-900">Your Register</h3>
              <span className="text-sm font-semibold text-gray-500">{subs.length} Active</span>
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {subs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  No subcontractors added yet.
                </div>
              ) : (
                subs.map(sub => (
                  <div key={sub.id} className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-[15px]">{sub.name}</div>
                      <div className="font-bold">{formatCurrency(sub.totalPaidThisFy)}</div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-gray-500">ABN: {sub.abn}</span>
                        {isAbnValid(sub.abn || "") ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-gray-400">Paid this FY</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <div className="fixed bottom-[80px] right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50 cursor-pointer">
            <Plus className="w-6 h-6" />
          </div>
        </DrawerTrigger>
        <DrawerContent className="bg-white h-[80vh] rounded-t-[24px]">
          <div className="p-6">
            <DrawerTitle className="text-2xl font-bold mb-6">Add Subcontractor</DrawerTitle>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Contractor / Business Name *</label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 bg-secondary border-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">ABN *</label>
                <Input value={formData.abn} onChange={e => setFormData({...formData, abn: e.target.value})} placeholder="XX XXX XXX XXX" className="h-12 bg-secondary border-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Phone (Optional)</label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="tel" className="h-12 bg-secondary border-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Email (Optional)</label>
                <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="h-12 bg-secondary border-none" />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
            <Button onClick={handleSave} disabled={createSub.isPending} className="w-full h-14 rounded-full text-lg font-semibold">Save Contractor</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
