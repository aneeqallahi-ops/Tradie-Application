import React from "react";
import { useGetQuotes } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Search, Plus, FileText } from "lucide-react";
import { Link } from "wouter";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";

export default function QuotesList() {
  const { data: quotes = [], isLoading } = useGetQuotes();

  const pendingQuotes = quotes.filter(q => q.status === "sent" || q.status === "draft" || q.status === "viewed");
  const readyQuotes = quotes.filter(q => q.status === "accepted");

  return (
    <Layout>
      <Header 
        title="Quotes" 
        rightContent={
          <button className="p-2 text-primary">
            <Search className="w-5 h-5" />
          </button>
        }
      />
      
      <div className="px-5 pb-24">
        {/* Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
          <div className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
            All Quotes
          </div>
          <div className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
            Pending ({pendingQuotes.length})
          </div>
          <div className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
            Accepted ({readyQuotes.length})
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {pendingQuotes.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Awaiting Response ({pendingQuotes.length})</div>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                  {pendingQuotes.map(quote => (
                    <Link key={quote.id} href={`/quotes/${quote.id}`} className="block p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-semibold text-[15px] truncate pr-2">{quote.title}</div>
                        <div className="font-bold">{formatCurrency(quote.total)}</div>
                      </div>
                      <div className="text-sm text-gray-500 mb-3">{quote.client?.name}</div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 bg-secondary rounded-md font-medium text-gray-600">{quote.state}</span>
                          <span>Sent {formatDate(quote.sentAt || quote.createdAt)}</span>
                        </div>
                        <StatusPill status={quote.status} />
                      </div>
                      {quote.viewedAt && (
                        <div className="mt-2 text-xs text-accent font-medium flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-accent rounded-full"></div>
                          Opened {formatDate(quote.viewedAt)}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {readyQuotes.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ready to Start ({readyQuotes.length})</div>
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                  {readyQuotes.map(quote => (
                    <Link key={quote.id} href={`/quotes/${quote.id}`} className="block p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-semibold text-[15px] truncate pr-2">{quote.title}</div>
                        <div className="font-bold">{formatCurrency(quote.total)}</div>
                      </div>
                      <div className="text-sm text-gray-500 mb-3">{quote.client?.name}</div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 bg-secondary rounded-md font-medium text-gray-600">{quote.state}</span>
                        </div>
                        <StatusPill status={quote.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {quotes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-medium text-gray-900 mb-1">No quotes yet</p>
                <p className="text-sm">Create your first quote to get started.</p>
              </div>
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
