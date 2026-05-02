import React, { useState } from "react";
import { useGetLogbook, useGetLogbookSummary, useSetupLogbook, useLogTrip } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { Navigation, Car, MapPin, Flag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function Logbook() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: status, isLoading: statusLoading } = useGetLogbook();
  const { data: summary, isLoading: summaryLoading } = useGetLogbookSummary({ query: { enabled: !!status?.active, queryKey: ["logbook-summary"] } });
  const setupLogbook = useSetupLogbook();
  const logTrip = useLogTrip();

  const [setupData, setSetupData] = useState({ make: "", model: "", odometerStart: "" });
  const [tripData, setTripData] = useState({
    tripDate: new Date().toISOString().split('T')[0],
    startLocation: "",
    endLocation: "",
    distanceKm: "",
    purpose: "Job site travel",
    isBusiness: true,
    notes: ""
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (statusLoading) {
    return (
      <Layout>
        <Header title="Logbook" />
        <div className="p-6"><div className="h-48 bg-white/5 border border-white/10 animate-pulse rounded-3xl" /></div>
      </Layout>
    );
  }

  const handleSetup = () => {
    if (!setupData.make || !setupData.model || !setupData.odometerStart) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    setupLogbook.mutate({
      data: {
        vehicleMake: setupData.make,
        vehicleModel: setupData.model,
        odometerStart: Number(setupData.odometerStart)
      }
    }, {
      onSuccess: () => {
        toast({ title: "Logbook started!" });
        queryClient.invalidateQueries({ queryKey: ['/api/logbook'] });
      }
    });
  };

  const handleLogTrip = () => {
    if (!tripData.distanceKm) {
      toast({ title: "Distance required", variant: "destructive" });
      return;
    }
    logTrip.mutate({
      data: {
        ...tripData,
        distanceKm: Number(tripData.distanceKm)
      }
    }, {
      onSuccess: () => {
        toast({ title: "Trip logged" });
        setDrawerOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/logbook/summary'] });
        setTripData(prev => ({...prev, distanceKm: "", startLocation: "", endLocation: "", notes: ""}));
      }
    });
  };

  if (!status?.active) {
    return (
      <Layout>
        <Header title="Logbook" />
        <div className="px-6 pb-24 h-full flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto w-full"
          >
            <div className="w-24 h-24 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
              <Car className="w-10 h-10 text-primary" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10" />
            </div>
            
            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Start your 12-week logbook</h2>
            <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
              Track your trips for 12 continuous weeks to claim vehicle expenses on your tax return for up to 5 years.
            </p>
            
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 space-y-5 text-left">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vehicle Make</label>
                <Input value={setupData.make} onChange={e => setSetupData({...setupData, make: e.target.value})} placeholder="e.g. Toyota" className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vehicle Model</label>
                <Input value={setupData.model} onChange={e => setSetupData({...setupData, model: e.target.value})} placeholder="e.g. Hilux" className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Odometer (km)</label>
                <Input type="number" value={setupData.odometerStart} onChange={e => setSetupData({...setupData, odometerStart: e.target.value})} placeholder="0" className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white" />
              </div>
              <Button onClick={handleSetup} disabled={setupLogbook.isPending} className="w-full h-14 rounded-xl mt-4 bg-primary text-black font-bold text-lg hover:bg-primary/90 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                Start Logbook
              </Button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Logbook" />
      
      <div className="px-6 pb-32 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none text-white">
              <Car className="w-64 h-64" />
            </div>
            
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-primary uppercase tracking-wider">Week {status.weekNumber} of 12</div>
              <div className="text-xs font-medium bg-white/10 px-3 py-1 rounded-full text-white">{status.daysRemaining} days left</div>
            </div>
            
            <div className="text-3xl font-bold tracking-tight text-white mb-6">{status.vehicleMake} {status.vehicleModel}</div>
            
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, ((status.weekNumber || 1) / 12) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(20,184,166,0.5)]" 
              />
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {status.tripsThisWeek} trips logged this week
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Total Km</div>
            <div className="text-xl font-bold text-white">{summary?.totalKm || 0}</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Biz Km</div>
            <div className="text-xl font-bold text-primary">{summary?.businessKm || 0}</div>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
            <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Biz %</div>
            <div className="text-xl font-bold text-white">{summary?.businessPercent?.toFixed(1) || 0}%</div>
          </div>
        </motion.div>

        {summary && summary.estimatedTaxSaving > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-primary/10 p-5 rounded-2xl border border-primary/20 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Est. Tax Saving</div>
                <div className="text-xs text-primary/80 mt-1">Based on projected deduction</div>
              </div>
              <div className="text-2xl font-bold text-primary">{formatCurrency(summary.estimatedTaxSaving)}</div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4 mt-2">
            <h3 className="font-bold tracking-tight text-lg text-white">Recent Trips</h3>
          </div>
          
          <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5">
            {summary?.trips?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No trips logged yet.</div>
            ) : (
              summary?.trips?.map((trip, idx) => (
                <div key={trip.id} className="p-5 hover:bg-white/[0.02] transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${trip.isBusiness ? 'bg-primary shadow-primary/40' : 'bg-white/40'}`} />
                      <span className={`font-bold text-sm ${trip.isBusiness ? 'text-primary' : 'text-white/60'}`}>
                        {trip.isBusiness ? 'Business' : 'Personal'}
                      </span>
                    </div>
                    <div className="font-bold text-white">{trip.distanceKm} km</div>
                  </div>
                  
                  <div className="flex flex-col gap-3 text-sm text-white/80 pl-5 relative before:absolute before:left-[4px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground absolute -left-1 bg-[#1A1A1E]" /> 
                      <span className="truncate">{trip.startLocation || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Flag className="w-3.5 h-3.5 text-muted-foreground absolute -left-1 bg-[#1A1A1E]" /> 
                      <span className="truncate">{trip.endLocation || "Unknown"}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    <span>{formatDate(trip.tripDate)}</span>
                    <span>{trip.purpose}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <div className="fixed bottom-[88px] right-6 w-16 h-16 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(20,184,166,0.3)] hover:scale-105 active:scale-95 transition-transform z-50 cursor-pointer">
            <Navigation className="w-7 h-7 fill-current" />
          </div>
        </DrawerTrigger>
        <DrawerContent className="bg-[#1C1C1E] border-white/10 h-[90vh] rounded-t-[32px]">
          <div className="p-6 overflow-y-auto pb-28">
            <DrawerTitle className="text-2xl font-bold text-white mb-6">Log a Trip</DrawerTitle>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl">
                <div>
                  <div className="font-bold text-white">{tripData.isBusiness ? "Business Trip" : "Personal Trip"}</div>
                  <div className="text-xs text-muted-foreground mt-1">Only business trips are tax deductible</div>
                </div>
                <Switch 
                  checked={tripData.isBusiness}
                  onCheckedChange={v => setTripData({...tripData, isBusiness: v})}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                  <Input type="date" value={tripData.tripDate} onChange={e => setTripData({...tripData, tripDate: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Distance (km)</label>
                  <Input type="number" value={tripData.distanceKm} onChange={e => setTripData({...tripData, distanceKm: e.target.value})} placeholder="0" className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white font-medium" />
                </div>
              </div>

              <div className="space-y-0 bg-white/5 border border-white/10 rounded-2xl relative before:absolute before:left-[27px] before:top-12 before:bottom-12 before:w-[2px] before:bg-white/10">
                <div className="relative p-2">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground bg-[#1A1A1E] z-10" />
                  <Input value={tripData.startLocation} onChange={e => setTripData({...tripData, startLocation: e.target.value})} placeholder="Start location" className="h-14 bg-transparent border-none pl-12 font-medium text-white focus-visible:ring-0 placeholder:text-white/30" />
                </div>
                <div className="h-px bg-white/10 mx-4" />
                <div className="relative p-2">
                  <Flag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground bg-[#1A1A1E] z-10" />
                  <Input value={tripData.endLocation} onChange={e => setTripData({...tripData, endLocation: e.target.value})} placeholder="End location" className="h-14 bg-transparent border-none pl-12 font-medium text-white focus-visible:ring-0 placeholder:text-white/30" />
                </div>
              </div>

              {tripData.isBusiness && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Purpose</label>
                  <Select value={tripData.purpose} onValueChange={v => setTripData({...tripData, purpose: v})}>
                    <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                      <SelectItem value="Job site travel" className="focus:bg-white/10">Job site travel</SelectItem>
                      <SelectItem value="Picking up materials" className="focus:bg-white/10">Picking up materials</SelectItem>
                      <SelectItem value="Quoting/Estimating" className="focus:bg-white/10">Quoting/Estimating</SelectItem>
                      <SelectItem value="Meeting client" className="focus:bg-white/10">Meeting client</SelectItem>
                      <SelectItem value="Other" className="focus:bg-white/10">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes</label>
                <Textarea value={tripData.notes} onChange={e => setTripData({...tripData, notes: e.target.value})} placeholder="Optional notes..." className="bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white resize-none min-h-[100px]" />
              </div>

            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/10">
            <Button onClick={handleLogTrip} disabled={logTrip.isPending} className="w-full h-14 rounded-xl text-lg font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
              {logTrip.isPending ? "Saving..." : "Save Trip"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
