import React, { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetQuote, useConvertQuoteToJob, useGetMe, useSendQuote, useUpdateQuote } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2, Send, FileEdit, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

export default function QuoteDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: quote, isLoading } = useGetQuote(Number(id), {
    query: { enabled: !!id, queryKey: ["quote", id] }
  });

  const convertToJob = useConvertQuoteToJob();
  const sendQuote = useSendQuote();
  const updateQuote = useUpdateQuote();

  const [activeView, setActiveView] = useState<"client" | "internal">("client");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", validUntil: "" });

  if (isLoading || !quote) {
    return (
      <Layout>
        <Header title="Quote" showBack onBack={() => window.history.back()} />
        <div className="p-5 space-y-4">
          <div className="h-40 bg-gray-200 animate-pulse rounded-2xl" />
          <div className="h-24 bg-gray-200 animate-pulse rounded-2xl" />
          <div className="h-48 bg-gray-200 animate-pulse rounded-2xl" />
        </div>
      </Layout>
    );
  }

  const handleSend = () => {
    sendQuote.mutate({ id: quote.id }, {
      onSuccess: () => {
        toast({ title: "Quote marked as sent!" });
        queryClient.invalidateQueries({ queryKey: ["quote", id] });
      },
      onError: () => {
        toast({ title: "Failed to send quote", variant: "destructive" });
      }
    });
  };

  const handleOpenEdit = () => {
    setEditForm({
      title: quote.title || "",
      description: quote.description || "",
      validUntil: quote.validUntil || "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    updateQuote.mutate({ id: quote.id, data: { title: editForm.title, description: editForm.description, validUntil: editForm.validUntil, state: quote.state } }, {
      onSuccess: () => {
        toast({ title: "Quote updated" });
        queryClient.invalidateQueries({ queryKey: ["quote", id] });
        setEditOpen(false);
      },
      onError: () => toast({ title: "Failed to update quote", variant: "destructive" }),
    });
  };

  const handleConvert = () => {
    convertToJob.mutate({ id: quote.id }, {
      onSuccess: (job) => {
        toast({ title: "Converted to Job!" });
        setLocation(`/jobs/${job.id}`);
      },
      onError: () => {
        toast({ title: "Failed to convert", variant: "destructive" });
      }
    });
  };

  const clientLineItems = quote.lineItems?.filter(item => !item.isInternal) || [];
  const internalItems = quote.lineItems?.filter(item => item.isInternal) || [];
  const isDraft = quote.status === "draft";
  const isSent = quote.status === "sent";

  return (
    <Layout>
      <Header title={`Quote #${quote.quoteNumber || quote.id}`} showBack onBack={() => window.history.back()} />

      <div className="px-5 pb-[160px] space-y-5 animate-in fade-in slide-in-from-bottom-4">

        {/* Status + Total */}
        <div className="flex items-center justify-between">
          <StatusPill status={quote.status} className="text-sm px-3 py-1" />
          <div className="text-sm font-semibold text-gray-500">
            Total {formatCurrency(quote.total)}
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex bg-secondary p-1 rounded-xl">
          <button
            onClick={() => setActiveView("client")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeView === "client" ? "bg-white shadow-sm text-primary" : "text-gray-500"}`}
          >
            Client View
          </button>
          <button
            onClick={() => setActiveView("internal")}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeView === "internal" ? "bg-white shadow-sm text-primary" : "text-gray-500"}`}
          >
            Internal
          </button>
        </div>

        {activeView === "client" && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="text-center mb-8">
              <div className="text-xl font-bold">{me?.user?.businessName || "Your Business"}</div>
              <div className="text-gray-400 text-xs mt-1 font-medium tracking-widest">QUOTE TO</div>
              <div className="text-primary font-semibold mt-1">{quote.client?.name}</div>
            </div>

            <div className="mb-6">
              <div className="font-bold text-lg">{quote.title}</div>
              {quote.description && (
                <div className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{quote.description}</div>
              )}
            </div>

            <div className="space-y-2 mb-6">
              <div className="font-bold border-b border-gray-100 pb-2 text-sm">Scope of Work</div>
              {clientLineItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-50">
                  <div className="flex-1 pr-4">{item.description} <span className="text-gray-400 text-xs ml-1">×{item.quantity}</span></div>
                  <div className="font-medium">{formatCurrency(item.lineTotal)}</div>
                </div>
              ))}
              {Number(quote.travelCost) > 0 && (
                <div className="flex justify-between text-sm py-2 border-b border-gray-50">
                  <div className="flex-1 pr-4">Travel Charge ({quote.travelKm}km)</div>
                  <div className="font-medium">{formatCurrency(quote.travelCost)}</div>
                </div>
              )}
            </div>

            <div className="space-y-2 bg-secondary p-4 rounded-xl">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal (excl. GST)</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST (10%)</span>
                <span>{formatCurrency(quote.gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 mt-1 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>

            <div className="mt-5 p-4 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
              <div>Deposit: {formatCurrency(quote.depositAmount)} ({quote.depositPercent}%){quote.depositCompliant ? " ✓ Compliant" : " ⚠ Check limits"}</div>
              <div>Valid until: {quote.validUntil ? formatDate(quote.validUntil) : "30 days from sent date"}</div>
            </div>

            {quote.sopaText && (
              <div className="mt-4 text-[9px] text-gray-400 leading-relaxed text-justify bg-gray-50 p-3 rounded-xl">
                {quote.sopaText}
              </div>
            )}
          </div>
        )}

        {activeView === "internal" && (
          <div className="space-y-4">
            {internalItems.length > 0 && (
              <div className="bg-gray-100 rounded-2xl p-5 border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span> Hidden Cost Items
                </div>
                <div className="space-y-2">
                  {internalItems.map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-700 bg-white p-3 rounded-xl">
                      <span className="pr-4">{item.description} <span className="text-gray-400">×{item.quantity}</span></span>
                      <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {quote.internalNotes && (
              <div className="bg-gray-100 rounded-2xl p-5 border border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Internal Notes</div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.internalNotes}</p>
              </div>
            )}

            {internalItems.length === 0 && !quote.internalNotes && (
              <div className="text-center py-8 text-gray-400 text-sm">No internal items or notes.</div>
            )}
          </div>
        )}

        {/* Activity Timeline */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Activity</h3>
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:w-[2px] before:bg-gray-100 pl-1">
            <div className="flex gap-4 relative">
              <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded-full shrink-0 flex items-center justify-center z-10"></div>
              <div>
                <div className="text-sm font-semibold">Created</div>
                <div className="text-xs text-gray-500">{formatDate(quote.createdAt)}</div>
              </div>
            </div>
            {quote.sentAt && (
              <div className="flex gap-4 relative">
                <div className="w-6 h-6 bg-white border-2 border-primary rounded-full shrink-0 flex items-center justify-center z-10"></div>
                <div>
                  <div className="text-sm font-semibold">Sent to client</div>
                  <div className="text-xs text-gray-500">{formatDate(quote.sentAt)}</div>
                </div>
              </div>
            )}
            {quote.viewedAt && (
              <div className="flex gap-4 relative">
                <div className="w-6 h-6 bg-accent rounded-full shrink-0 flex items-center justify-center z-10"></div>
                <div>
                  <div className="text-sm font-semibold text-accent">Viewed by client</div>
                  <div className="text-xs text-gray-500">{formatDate(quote.viewedAt)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-white border-t border-gray-100 z-40">
        <div className="max-w-[480px] mx-auto flex gap-3">
          {isDraft && (
            <>
              <Button variant="outline" onClick={handleOpenEdit} className="w-12 h-14 rounded-full p-0 shrink-0 border-gray-200">
                <FileEdit className="w-5 h-5 text-gray-500" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendQuote.isPending}
                variant="outline"
                className="flex-1 h-14 rounded-full font-semibold border-gray-200"
              >
                <Send className="w-4 h-4 mr-2" /> Send to Client
              </Button>
              <Button
                onClick={handleConvert}
                disabled={convertToJob.isPending}
                className="flex-1 h-14 rounded-full font-semibold bg-primary text-white hover:bg-primary/90"
              >
                <ArrowRight className="w-4 h-4 mr-2" /> To Job
              </Button>
            </>
          )}
          {isSent && (
            <>
              <Button variant="outline" onClick={handleOpenEdit} className="flex-1 h-14 rounded-full font-semibold border-gray-200">
                <FileEdit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button
                onClick={handleConvert}
                disabled={convertToJob.isPending}
                className="flex-1 h-14 rounded-full font-semibold bg-primary text-white hover:bg-primary/90"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Convert to Job
              </Button>
            </>
          )}
          {quote.status === "accepted" && (
            <Button
              onClick={handleConvert}
              disabled={convertToJob.isPending}
              className="w-full h-14 rounded-full font-semibold bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Convert to Job
            </Button>
          )}
          {(quote.status === "declined" || quote.status === "expired") && (
            <div className="flex-1 h-14 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 font-medium text-sm capitalize">
              Quote {quote.status}
            </div>
          )}
        </div>
      </div>

      {/* Edit Quote Drawer */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="p-5">
            <div className="flex items-center justify-between mb-6">
              <DrawerTitle className="text-lg font-bold">Edit Quote</DrawerTitle>
              <button onClick={() => setEditOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                <Input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Quote title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Scope of work…"
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valid Until</label>
                <Input
                  type="date"
                  value={editForm.validUntil}
                  onChange={e => setEditForm(f => ({ ...f, validUntil: e.target.value }))}
                />
              </div>
              <Button
                onClick={handleSaveEdit}
                disabled={updateQuote.isPending}
                className="w-full h-12 rounded-full font-semibold bg-primary text-white hover:bg-primary/90 mt-2"
              >
                {updateQuote.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
