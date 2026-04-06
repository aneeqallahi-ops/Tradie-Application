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
import { Navigation, Car, Calendar, MapPin, Flag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";

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
        <div className="p-5"><div className="h-40 bg-gray-200 animate-pulse rounded-2xl" /></div>
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
        <div className="px-5 pb-24 animate-in fade-in">
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Car className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Start your 12-week logbook</h2>
            <p className="text-gray-500 text-sm mb-8 px-4">Track your trips for 12 continuous weeks to claim vehicle expenses on your tax return for up to 5 years.</p>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Vehicle Make</label>
                <Input value={setupData.make} onChange={e => setSetupData({...setupData, make: e.target.value})} placeholder="e.g. Toyota" className="h-12 bg-secondary border-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Vehicle Model</label>
                <Input value={setupData.model} onChange={e => setSetupData({...setupData, model: e.target.value})} placeholder="e.g. Hilux" className="h-12 bg-secondary border-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Current Odometer (km)</label>
                <Input type="number" value={setupData.odometerStart} onChange={e => setSetupData({...setupData, odometerStart: e.target.value})} placeholder="0" className="h-12 bg-secondary border-none" />
              </div>
              <Button onClick={handleSetup} disabled={setupLogbook.isPending} className="w-full h-14 rounded-full mt-4 bg-primary text-white font-semibold text-lg hover:scale-[0.98] transition-transform">
                Start Logbook
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Logbook" />
      
      <div className="px-5 pb-32 space-y-6 animate-in fade-in">
        
        {/* Progress Card */}
        <div className="bg-primary text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-4 -translate-y-4">
            <Car className="w-40 h-40" />
          </div>
          <div className="text-gray-300 text-sm font-medium mb-1">Week {status.weekNumber} of 12</div>
          <div className="text-2xl font-bold mb-4">{status.vehicleMake} {status.vehicleModel}</div>
          
          <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-white rounded-full" style={{ width: `${Math.min(100, ((status.weekNumber || 1) / 12) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-300 font-medium">
            <span>{status.tripsThisWeek} trips this week</span>
            <span>{status.daysRemaining} days left</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Km</div>
            <div className="text-xl font-bold">{summary?.totalKm || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Biz Km</div>
            <div className="text-xl font-bold text-primary">{summary?.businessKm || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Biz %</div>
            <div className="text-xl font-bold text-accent">{summary?.businessPercent?.toFixed(1) || 0}%</div>
          </div>
        </div>

        {summary && summary.estimatedTaxSaving > 0 && (
          <div className="bg-[#DCFCE7] p-5 rounded-2xl border border-[#bbf7d0] flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-[#166534]">Est. Tax Saving</div>
              <div className="text-xs text-[#166534] opacity-80 mt-0.5">Based on projected deduction</div>
            </div>
            <div className="text-2xl font-bold text-[#166534]">{formatCurrency(summary.estimatedTaxSaving)}</div>
          </div>
        )}

        {/* Trip List */}
        <div>
          <h3 className="font-bold text-lg mb-3">Recent Trips</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {summary?.trips?.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No trips logged yet.</div>
            ) : (
              summary?.trips?.map(trip => (
                <div key={trip.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${trip.isBusiness ? 'bg-accent' : 'bg-gray-300'}`} />
                      <span className="font-bold text-sm">{trip.isBusiness ? 'Business' : 'Personal'}</span>
                    </div>
                    <div className="font-bold">{trip.distanceKm} km</div>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-gray-600 pl-4 relative before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {trip.startLocation || "Unknown"}</div>
                    <div className="flex items-center gap-2"><Flag className="w-3.5 h-3.5 text-gray-400" /> {trip.endLocation || "Unknown"}</div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                    <span>{formatDate(trip.tripDate)}</span>
                    <span>{trip.purpose}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <div className="fixed bottom-[80px] right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50 cursor-pointer">
            <Navigation className="w-6 h-6" />
          </div>
        </DrawerTrigger>
        <DrawerContent className="bg-white h-[85vh] rounded-t-[24px]">
          <div className="p-6 overflow-y-auto pb-24">
            <DrawerTitle className="text-2xl font-bold mb-6">Log a Trip</DrawerTitle>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-secondary rounded-2xl">
                <div>
                  <div className="font-semibold">{tripData.isBusiness ? "Business Trip" : "Personal Trip"}</div>
                  <div className="text-xs text-gray-500">Only business trips are tax deductible</div>
                </div>
                <Switch 
                  checked={tripData.isBusiness}
                  onCheckedChange={v => setTripData({...tripData, isBusiness: v})}
                  className={tripData.isBusiness ? "data-[state=checked]:bg-accent" : ""}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                  <Input type="date" value={tripData.tripDate} onChange={e => setTripData({...tripData, tripDate: e.target.value})} className="h-12 bg-secondary border-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Distance (km)</label>
                  <Input type="number" value={tripData.distanceKm} onChange={e => setTripData({...tripData, distanceKm: e.target.value})} placeholder="0" className="h-12 bg-secondary border-none" />
                </div>
              </div>

              <div className="space-y-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative before:absolute before:left-[27px] before:top-10 before:bottom-10 before:w-[2px] before:bg-gray-100">
                <div className="relative">
                  <MapPin className="absolute left-0 top-3.5 w-4 h-4 text-gray-400 bg-white" />
                  <Input value={tripData.startLocation} onChange={e => setTripData({...tripData, startLocation: e.target.value})} placeholder="Start location" className="h-12 border-none pl-8 font-medium shadow-none focus-visible:ring-0" />
                </div>
                <div className="relative border-t border-gray-50 pt-2">
                  <Flag className="absolute left-0 top-5 w-4 h-4 text-gray-400 bg-white" />
                  <Input value={tripData.endLocation} onChange={e => setTripData({...tripData, endLocation: e.target.value})} placeholder="End location" className="h-12 border-none pl-8 font-medium shadow-none focus-visible:ring-0" />
                </div>
              </div>

              {tripData.isBusiness && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 uppercase">Purpose</label>
                  <Select value={tripData.purpose} onValueChange={v => setTripData({...tripData, purpose: v})}>
                    <SelectTrigger className="h-12 bg-secondary border-none font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Job site travel">Job site travel</SelectItem>
                      <SelectItem value="Picking up materials">Picking up materials</SelectItem>
                      <SelectItem value="Quoting/Estimating">Quoting/Estimating</SelectItem>
                      <SelectItem value="Meeting client">Meeting client</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase">Notes</label>
                <Textarea value={tripData.notes} onChange={e => setTripData({...tripData, notes: e.target.value})} placeholder="Optional notes..." className="bg-secondary border-none resize-none" />
              </div>

            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
            <Button onClick={handleLogTrip} disabled={logTrip.isPending} className="w-full h-14 rounded-full text-lg font-semibold">Save Trip</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
