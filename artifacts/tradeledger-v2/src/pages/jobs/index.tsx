import React, { useState } from "react";
import { useGetJobs } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Search, Plus, Wrench } from "lucide-react";
import { Link } from "wouter";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";

export default function JobsList() {
  const [filter, setFilter] = useState("Active");
  const { data: jobs = [], isLoading } = useGetJobs();

  const tabs = ["Active", "Complete", "Paid", "All"];

  const filteredJobs = jobs.filter(j => {
    if (filter === "All") return true;
    if (filter === "Active") return j.status === "active" || j.status === "in_progress";
    if (filter === "Complete") return j.status === "complete" || j.status === "completed";
    if (filter === "Paid") return j.status === "paid";
    return true;
  });

  return (
    <Layout>
      <Header 
        title="Jobs" 
        rightContent={
          <button className="p-2 text-white hover:text-primary transition-colors">
            <Search className="w-5 h-5" />
          </button>
        }
      />
      
      <div className="px-6 pb-32">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar sticky top-[72px] z-20 bg-background/80 backdrop-blur-md pt-2">
          {tabs.map(t => (
            <button 
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                filter === t 
                  ? "bg-primary text-black shadow-[0_0_15px_rgba(20,184,166,0.3)]" 
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredJobs.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 text-muted-foreground bg-white/5 border border-white/10 rounded-3xl"
                >
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Wrench className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="font-bold text-white mb-2 text-lg">No jobs found</p>
                  <p className="text-sm">Convert a quote to start a job.</p>
                </motion.div>
              ) : (
                filteredJobs.map((job, idx) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link href={`/jobs/${job.id}`} className="block bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/[0.07] transition-all relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-white text-base truncate pr-2">{job.title}</div>
                        <div className="font-black text-white text-lg tabular-nums tracking-tight shrink-0">{formatCurrency(job.total)}</div>
                      </div>
                      
                      <div className="text-sm font-medium text-muted-foreground mb-4">{job.client?.name}</div>
                      
                      {job.status === 'IN_PROGRESS' && (
                        <div className="mb-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: '50%' }} 
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-accent rounded-full shadow-[0_0_10px_rgba(251,146,60,0.5)]" 
                          />
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="px-2 py-1 bg-white/5 rounded-md border border-white/10 text-white/70">{job.state}</span>
                          <span>Scheduled {job.scheduledDate ? formatDate(job.scheduledDate) : "TBD"}</span>
                        </div>
                        <StatusPill status={job.status} />
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Link href="/quotes/new" className="fixed bottom-[88px] right-6 w-16 h-16 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(20,184,166,0.3)] hover:scale-105 active:scale-95 transition-transform z-50">
        <Plus className="w-7 h-7 fill-current" />
      </Link>
    </Layout>
  );
}
