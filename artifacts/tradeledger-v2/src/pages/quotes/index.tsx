import React, { useState } from "react";
import { useGetQuotes } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Search, Plus, FileText, Clock, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

export default function QuotesList() {
  const [filter, setFilter] = useState("Pending");
  const { data: quotes = [], isLoading } = useGetQuotes();

  const pendingQuotes = quotes.filter(q => q.status === "sent" || q.status === "draft" || q.status === "viewed");
  const readyQuotes = quotes.filter(q => q.status === "accepted");

  const displayQuotes = filter === "Pending" ? pendingQuotes : filter === "Accepted" ? readyQuotes : quotes;

  return (
    <Layout>
      <Header 
        title="Quotes" 
        rightContent={
          <button className="p-2 text-white hover:text-primary transition-colors">
            <Search className="w-5 h-5" />
          </button>
        }
      />
      
      <div className="px-6 pb-32">
        {/* Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar sticky top-[72px] z-20 bg-background/80 backdrop-blur-md pt-2">
          {["Pending", "Accepted", "All Quotes"].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                filter === tab 
                  ? "bg-primary text-black shadow-[0_0_15px_rgba(20,184,166,0.3)]" 
                  : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {tab}
              {tab === "Pending" && pendingQuotes.length > 0 && ` (${pendingQuotes.length})`}
              {tab === "Accepted" && readyQuotes.length > 0 && ` (${readyQuotes.length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />)}
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {displayQuotes.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="grid gap-4"
                >
                  {displayQuotes.map((quote, idx) => (
                    <motion.div
                      key={quote.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link href={`/quotes/${quote.id}`} className="block bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/[0.07] transition-all relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-white text-base truncate pr-2">{quote.title}</div>
                          <div className="font-black text-white text-lg tabular-nums tracking-tight shrink-0">{formatCurrency(quote.total)}</div>
                        </div>
                        
                        <div className="text-sm font-medium text-muted-foreground mb-4">{quote.client?.name}</div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span className="px-2 py-1 bg-white/5 rounded-md border border-white/10 text-white/70">{quote.state}</span>
                            {quote.status === "accepted" ? (
                              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Accepted</span>
                            ) : (
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Sent {formatDate(quote.sentAt || quote.createdAt)}</span>
                            )}
                          </div>
                          <StatusPill status={quote.status} />
                        </div>
                        
                        {quote.viewedAt && quote.status !== "accepted" && (
                          <div className="mt-4 text-[11px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shadow-[0_0_8px_currentColor]"></div>
                            Opened {formatDate(quote.viewedAt)}
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 text-muted-foreground bg-white/5 border border-white/10 rounded-3xl"
                >
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-white/40" />
                  </div>
                  <p className="font-bold text-white mb-2 text-lg">No quotes found</p>
                  <p className="text-sm">Create your first quote to win work.</p>
                  <Link href="/quotes/new" className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-primary text-black font-bold mt-6 hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                    Create Quote
                  </Link>
                </motion.div>
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
