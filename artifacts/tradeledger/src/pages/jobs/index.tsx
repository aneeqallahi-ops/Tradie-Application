import React, { useState } from "react";
import { useGetJobs } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Search, Plus } from "lucide-react";
import { Link } from "wouter";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";

export default function JobsList() {
  const [filter, setFilter] = useState("All");
  const { data: jobs = [], isLoading } = useGetJobs();

  const tabs = ["All", "Active", "In Progress", "Complete", "Paid"];

  const filteredJobs = jobs.filter(j => {
    if (filter === "All") return true;
    if (filter === "Active") return j.status === "active" || j.status === "in_progress";
    if (filter === "In Progress") return j.status === "in_progress";
    if (filter === "Complete") return j.status === "complete" || j.status === "completed";
    if (filter === "Paid") return j.status === "paid";
    return true;
  });

  return (
    <Layout>
      <Header 
        title="Jobs" 
        rightContent={
          <button className="p-2 text-primary">
            <Search className="w-5 h-5" />
          </button>
        }
      />
      
      <div className="px-5 pb-24">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
          {tabs.map(t => (
            <button 
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === t ? "bg-primary text-white" : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No jobs found.</div>
            ) : (
              filteredJobs.map(job => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-semibold text-[15px] truncate pr-2">{job.title}</div>
                    <div className="font-bold">{formatCurrency(job.total)}</div>
                  </div>
                  <div className="text-sm text-gray-500 mb-3">{job.client?.name}</div>
                  
                  {job.status === 'IN_PROGRESS' && (
                    <div className="mb-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full w-1/2"></div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-1.5 py-0.5 bg-secondary rounded-md font-medium text-gray-600">{job.state}</span>
                      <span>Scheduled {job.scheduledDate ? formatDate(job.scheduledDate) : "TBD"}</span>
                    </div>
                    <StatusPill status={job.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <Link href="/quotes/new" className="fixed bottom-[80px] right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50">
        <Plus className="w-6 h-6" />
      </Link>
    </Layout>
  );
}
