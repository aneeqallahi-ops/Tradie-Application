import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetJob, useUpdateJobStatus } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Phone, Mail, FileText, CheckCircle2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function JobDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Overview");

  const { data: job, isLoading } = useGetJob(Number(id), { 
    query: { enabled: !!id, queryKey: ['job', id] } 
  });
  
  const updateStatus = useUpdateJobStatus();

  if (isLoading || !job) {
    return (
      <Layout>
        <Header title="Job Detail" showBack onBack={() => window.history.back()} />
        <div className="p-5 space-y-4">
          <div className="h-40 bg-gray-200 animate-pulse rounded-2xl" />
        </div>
      </Layout>
    );
  }

  const handleMarkComplete = () => {
    updateStatus.mutate({ id: job.id, data: { status: "complete" } }, {
      onSuccess: () => {
        toast({ title: "Job marked as complete" });
        queryClient.invalidateQueries({ queryKey: ['job', String(id)] });
      }
    });
  };

  const totalQuoted = job.quoteLineItems?.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) || 0;
  const totalExpenses = job.expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const margin = totalQuoted > 0 ? ((totalQuoted - totalExpenses) / totalQuoted) * 100 : 0;
  const isLowMargin = margin < 20 && margin > 0;
  const isOverBudget = margin <= 0 && totalExpenses > 0;

  return (
    <Layout>
      <Header title={`Job #${job.jobNumber || job.id}`} showBack onBack={() => window.history.back()} />
      
      <div className="px-5 pb-[100px] animate-in fade-in slide-in-from-bottom-4">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold truncate pr-4">{job.title}</h2>
          <StatusPill status={job.status} />
        </div>

        {/* Tab Bar */}
        <div className="flex bg-secondary p-1 rounded-xl mb-6">
          {["Overview", "Costs", "Invoices"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Client</div>
              <div className="font-bold text-lg mb-4">{job.client?.name}</div>
              <div className="flex gap-3">
                {job.client?.phone && (
                  <a href={`tel:${job.client.phone}`} className="flex-1 flex items-center justify-center gap-2 bg-secondary py-3 rounded-xl text-accent font-semibold text-sm hover:bg-orange-50 transition-colors">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                )}
                {job.client?.email && (
                  <a href={`mailto:${job.client.email}`} className="flex-1 flex items-center justify-center gap-2 bg-secondary py-3 rounded-xl text-accent font-semibold text-sm hover:bg-orange-50 transition-colors">
                    <Mail className="w-4 h-4" /> Email
                  </a>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex justify-between border-b border-gray-50 pb-3">
                <span className="text-gray-500 text-sm">Scheduled</span>
                <span className="font-medium text-sm">{job.scheduledDate ? formatDate(job.scheduledDate) : "Unscheduled"}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-3">
                <span className="text-gray-500 text-sm">State</span>
                <span className="font-medium text-sm">{job.state || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Job Total</span>
                <span className="font-bold">{formatCurrency(job.total)}</span>
              </div>
            </div>

            {job.description && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Notes</h3>
                <div className="bg-secondary p-4 rounded-xl text-sm text-gray-700 whitespace-pre-wrap">
                  {job.description}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "Costs" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Est. Margin</div>
                  <div className="text-2xl font-bold mt-1">{margin.toFixed(1)}%</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Est. Profit</div>
                  <div className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalQuoted - totalExpenses)}</div>
                </div>
              </div>
              
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : isLowMargin ? 'bg-amber-500' : 'bg-green-500'}`} 
                  style={{ width: `${Math.max(0, Math.min(100, margin))}%` }} 
                />
              </div>

              {isOverBudget && <div className="mt-3 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg text-center">Over Budget! Costs exceed quoted amount.</div>}
              {isLowMargin && <div className="mt-3 text-xs text-amber-700 font-semibold bg-amber-50 p-2 rounded-lg text-center">Low Margin Warning</div>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Quoted Work</h3>
                <span className="text-sm font-bold text-gray-500">{formatCurrency(totalQuoted)}</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {job.quoteLineItems?.map(item => (
                  <div key={item.id} className="p-3 text-sm flex justify-between">
                    <span className="text-gray-700 pr-4">{item.description} <span className="text-gray-400 text-xs">x{item.quantity}</span></span>
                    <span className="font-medium shrink-0">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
                {(!job.quoteLineItems || job.quoteLineItems.length === 0) && (
                  <div className="p-4 text-center text-gray-400 text-sm">No quoted items</div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">Actual Expenses</h3>
                <span className="text-sm font-bold text-gray-500">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {job.expenses?.map(exp => (
                  <div key={exp.id} className="p-3 text-sm flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{exp.category}</div>
                      {exp.vendor && <div className="text-xs text-gray-500">{exp.vendor}</div>}
                    </div>
                    <span className="font-medium text-red-600">-{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
                {(!job.expenses || job.expenses.length === 0) && (
                  <div className="p-4 text-center text-gray-400 text-sm">No expenses logged yet</div>
                )}
              </div>
              <Link href={`/expenses/new?jobId=${job.id}`} className="mt-3 block w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-500 font-semibold hover:border-gray-300 hover:text-gray-700 transition-colors">
                + Attach Expense
              </Link>
            </div>
          </div>
        )}

        {activeTab === "Invoices" && (
          <div className="space-y-4">
            {job.invoices?.map(inv => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex justify-between mb-2">
                  <div className="font-bold">{inv.invoiceNumber || `INV-${inv.id}`}</div>
                  <div className="font-bold">{formatCurrency(inv.total)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">{inv.type} Invoice</div>
                  <StatusPill status={inv.status} />
                </div>
              </Link>
            ))}
            
            {(!job.invoices || job.invoices.length === 0) && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-900 mb-1">No invoices yet</p>
                <p className="text-sm">Create an invoice to get paid.</p>
              </div>
            )}

            <Link href={`/invoices/new?jobId=${job.id}`} className="block mt-4 w-full h-14 bg-primary text-white rounded-full font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
              <Plus className="w-5 h-5" /> Create Invoice
            </Link>
          </div>
        )}

      </div>

      {/* Sticky Action Bar */}
      {activeTab === "Overview" && (
        <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-white border-t border-gray-100 z-40">
          <div className="max-w-[480px] mx-auto flex gap-3">
            <Link href={`/invoices/new?jobId=${job.id}`} className="flex-1">
              <Button variant="outline" className="w-full h-14 rounded-full font-semibold border-gray-200">
                <FileText className="w-4 h-4 mr-2" /> Invoice
              </Button>
            </Link>
            {job.status !== "complete" && job.status !== "paid" && (
              <Button 
                onClick={handleMarkComplete}
                disabled={updateStatus.isPending}
                className="flex-1 h-14 rounded-full font-semibold bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
              </Button>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
