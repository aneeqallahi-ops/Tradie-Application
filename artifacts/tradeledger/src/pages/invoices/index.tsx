import React, { useState } from "react";
import { useGetInvoices } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Plus, FileText } from "lucide-react";
import { Link } from "wouter";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";

const TABS = ["All", "Unpaid", "Paid", "Overdue"];

export default function InvoicesList() {
  const [filter, setFilter] = useState("All");
  const { data: invoices = [], isLoading } = useGetInvoices();

  const today = new Date();

  const filtered = invoices.filter(inv => {
    if (filter === "All") return true;
    if (filter === "Unpaid") return inv.status === "unpaid";
    if (filter === "Paid") return inv.status === "paid";
    if (filter === "Overdue") return inv.status === "unpaid" && inv.dueDate != null && new Date(inv.dueDate) < today;
    return true;
  });

  const totalUnpaid = invoices
    .filter(i => i.status === "unpaid")
    .reduce((sum, i) => sum + Number(i.total || 0), 0);

  return (
    <Layout>
      <Header title="Invoices" />

      <div className="px-5 pb-24">
        {/* Summary Strip */}
        {totalUnpaid > 0 && (
          <div className="bg-primary text-white rounded-2xl p-4 mb-5 flex justify-between items-center shadow-sm">
            <div>
              <div className="text-xs text-gray-300 font-medium mb-0.5">Outstanding</div>
              <div className="text-2xl font-bold">{formatCurrency(totalUnpaid)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-300 font-medium mb-0.5">Invoices unpaid</div>
              <div className="text-2xl font-bold">{invoices.filter(i => i.status === "unpaid").length}</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 hide-scrollbar">
          {TABS.map(t => (
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
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-medium text-gray-900 mb-1">
              {filter === "All" ? "No invoices yet" : `No ${filter.toLowerCase()} invoices`}
            </p>
            <p className="text-sm">Create an invoice from a job to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
            {filtered.map(inv => {
              const isOverdue = inv.status === "unpaid" && inv.dueDate != null && new Date(inv.dueDate) < today;
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`} className="block p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <div className="font-semibold text-[15px]">{inv.invoiceNumber || `INV-${inv.id}`}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{inv.client?.name || "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[15px]">{formatCurrency(inv.total)}</div>
                      <div className={`text-xs mt-0.5 ${isOverdue ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                        {isOverdue ? "Overdue" : `Due ${formatDate(inv.dueDate)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-400">{formatDate(inv.createdAt)}</div>
                    <StatusPill status={inv.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/invoices/new"
        className="fixed bottom-[80px] right-5 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform z-50"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </Layout>
  );
}
