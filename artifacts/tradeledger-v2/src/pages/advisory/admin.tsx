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

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "in_progress", label: "In Progress", icon: <Loader className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "completed", label: "Completed", icon: <CheckCircle className="w-3.5 h-3.5" />, color: "text-green-600 bg-green-50 border-green-200" },
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
    query: { enabled: isAdmin },
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
        <Header title="Advisory Admin" />
        <div className="px-5 pb-8">
          <div className="h-32 bg-gray-100 animate-pulse rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <Header title="Advisory Admin" />
        <div className="px-5 pb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-3" data-testid="admin-forbidden">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <p className="font-semibold text-primary text-base">Admin access required</p>
            <p className="text-sm text-gray-500">
              This area is for advisory specialists. Contact an administrator if you need access.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Advisory Admin" />
      <div className="px-5 pb-8 space-y-6">
        <div className="bg-primary text-white rounded-2xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-1">Internal tool</p>
          <p className="text-xl font-black leading-tight">Update Request Status</p>
          <p className="text-sm text-gray-300 mt-1.5">
            Move advisory requests through pending, in progress, and completed.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">All Requests</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
              <p className="text-sm text-gray-400">No advisory requests yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const isUpdating = pendingId === r.id;
                const ownerLabel = r.owner?.businessName || r.owner?.email || (r.owner?.id ? `User #${r.owner.id}` : "Unknown user");
                return (
                  <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-primary text-sm">
                        {SERVICE_LABELS[r.serviceType] ?? r.serviceType}
                        <span className="text-[10px] text-gray-400 font-normal ml-2">#{r.id}</span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">For: {ownerLabel}</p>
                      {r.helpNeeded && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.helpNeeded}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        Submitted {fmtDate(r.createdAt)} · Urgency: {r.urgency ?? "no_rush"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map(opt => {
                        const isActive = (r.status ?? "pending") === opt.value;
                        return (
                          <button
                            key={opt.value}
                            disabled={isUpdating || isActive}
                            onClick={() => handleUpdate(r.id, opt.value)}
                            data-testid={`button-status-${r.id}-${opt.value}`}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1.5 rounded-full border transition-opacity ${opt.color} ${
                              isActive ? "opacity-100 ring-2 ring-offset-1 ring-current" : "opacity-60 hover:opacity-100"
                            } ${isUpdating ? "cursor-wait" : isActive ? "cursor-default" : "cursor-pointer"}`}
                          >
                            {opt.icon}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
