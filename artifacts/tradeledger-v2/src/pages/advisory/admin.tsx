import React, { useState } from "react";
import { Layout, Header } from "@/components/layout";
import {
  useGetAllAdvisoryRequests,
  useGetAdvisoryAdminMe,
  useUpdateAdvisoryRequestStatus,
  getGetAllAdvisoryRequestsQueryKey,
  getGetAdvisoryRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, Loader, CheckCircle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "in_progress", label: "In Progress", icon: <Loader className="w-3.5 h-3.5" />, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { value: "completed", label: "Completed", icon: <CheckCircle className="w-3.5 h-3.5" />, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
] as const;

const SERVICE_LABELS: Record<string, string> = {
  tax_advisory: "Tax Advisory",
  mortgage_advisory: "Mortgage Advisory",
  property_sourcing: "Property Sourcing",
  business_funding: "Business Funding",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdvisoryAdminPage() {
  const queryClient = useQueryClient();
  const { data: meData, isLoading: meLoading } = useGetAdvisoryAdminMe();
  const isAdmin = !!meData?.isAdmin;

  const { data: requestsData, isLoading } = useGetAllAdvisoryRequests({
    query: { enabled: isAdmin, queryKey: ["/api/admin/advisory-requests"] },
  });
  const updateStatus = useUpdateAdvisoryRequestStatus();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const requests = requestsData?.requests ?? [];

  const handleUpdate = (id: number, status: "pending" | "in_progress" | "completed") => {
    setPendingId(id);
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSettled: () => {
          setPendingId(null);
          queryClient.invalidateQueries({ queryKey: getGetAllAdvisoryRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdvisoryRequestsQueryKey() });
        },
      },
    );
  };

  if (meLoading) {
    return (
      <Layout>
        <Header title="Advisory Queue" />
        <div className="px-6 pb-8 mt-4">
          <div className="h-32 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <Header title="Advisory Queue" />
        <div className="px-6 pb-8 mt-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center space-y-4" data-testid="admin-forbidden">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <p className="font-black text-white text-xl tracking-tight">Admin access required</p>
            <p className="text-sm font-medium text-red-200 leading-relaxed max-w-[250px] mx-auto">
              This area is for advisory specialists. Contact an administrator if you need access.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Advisory Queue" />
      <div className="px-6 pb-32 space-y-8 mt-2">
        <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Internal Tool</p>
            <p className="text-3xl font-black leading-tight text-white mb-2 tracking-tight">Manage Requests</p>
            <p className="text-sm font-medium text-white/80 leading-relaxed max-w-[280px]">
              Move advisory requests through pending, in progress, and completed.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pl-2">All Requests ({requests.length})</p>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white/5 rounded-3xl border border-white/10 p-8 text-center">
              <p className="font-medium text-muted-foreground text-sm">No advisory requests yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((r, idx) => {
                const isUpdating = pendingId === r.id;
                const ownerLabel = r.owner?.businessName || r.owner?.email || (r.owner?.id ? `User #${r.owner.id}` : "Unknown user");
                return (
                  <motion.div 
                    key={r.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 rounded-3xl border border-white/10 p-5 space-y-4 relative overflow-hidden group"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-white text-base">
                          {SERVICE_LABELS[r.serviceType] ?? r.serviceType}
                        </p>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">#{r.id}</span>
                      </div>
                      <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">{ownerLabel}</p>
                      
                      {r.helpNeeded && (
                        <p className="text-sm font-medium text-white/80 bg-black/20 p-4 rounded-xl border border-white/5 line-clamp-3 leading-relaxed">{r.helpNeeded}</p>
                      )}
                      
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-4 flex justify-between">
                        <span>{fmtDate(r.createdAt)}</span>
                        <span className="text-white/60">Urgency: {String(r.urgency ?? "no_rush").replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                      {STATUS_OPTIONS.map(opt => {
                        const isActive = (r.status ?? "pending") === opt.value;
                        return (
                          <button
                            key={opt.value}
                            disabled={isUpdating || isActive}
                            onClick={() => handleUpdate(r.id, opt.value)}
                            data-testid={`button-status-${r.id}-${opt.value}`}
                            className={`flex-1 inline-flex justify-center items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-lg border transition-all ${opt.color} ${
                              isActive ? "opacity-100 shadow-sm" : "opacity-40 hover:opacity-100 bg-transparent border-transparent"
                            } ${isUpdating ? "cursor-wait" : isActive ? "cursor-default" : "cursor-pointer"}`}
                          >
                            {opt.icon}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
