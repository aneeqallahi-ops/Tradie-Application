import React, { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetQuote, useConvertQuoteToJob, useGetMe, useSendQuote, useUpdateQuote } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { StatusPill } from "@/components/status-pill";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2, Send, FileEdit, X, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

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
        <div className="p-6 space-y-4">
          <div className="h-48 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
          <div className="h-24 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
          <div className="h-64 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
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

      <div className="px-6 pb-[160px] space-y-6 mt-2">

        {/* View Toggle */}
        <div className="bg-white/5 border border-white/10 p-1.5 rounded-2xl flex sticky top-[72px] z-20 backdrop-blur-md">
          <button
            onClick={() => setActiveView("client")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeView === "client" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"}`}
          >
            Client View
          </button>
          <button
            onClick={() => setActiveView("internal")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${activeView === "internal" ? "bg-primary text-black shadow-sm" : "text-muted-foreground hover:text-white"}`}
          >
            Internal Edit
          </button>
        </div>

        {activeView === "client" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white text-black p-8 rounded-3xl min-h-[600px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-primary" />
            
            <div className="text-center mb-10 pt-4">
              <div className="text-2xl font-black tracking-tight">{me?.user?.businessName || "Your Business"}</div>
              <div className="text-gray-400 text-[10px] font-bold tracking-widest mt-2 uppercase">Quote For</div>
              <div className="text-primary font-bold mt-1 text-lg">{quote.client?.name}</div>
            </div>

            <div className="mb-10">
              <div className="font-black text-2xl tracking-tight mb-4">{quote.title}</div>
              {quote.description && (
                <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{quote.description}</div>
              )}
            </div>

            <div className="space-y-4 mb-10">
              <div className="font-bold text-xs uppercase tracking-wider text-gray-400 border-b-2 border-gray-100 pb-3">Scope of Work</div>
              {clientLineItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0 pb-3">
                  <div className="flex-1 pr-4 font-medium text-gray-800">{item.description} <span className="text-gray-400 text-xs ml-2 font-bold">×{item.quantity}</span></div>
                  <div className="font-bold tabular-nums">{formatCurrency(item.lineTotal)}</div>
                </div>
              ))}
              {Number(quote.travelCost) > 0 && (
                <div className="flex justify-between text-sm py-2 border-b border-gray-50 pb-3">
                  <div className="flex-1 pr-4 font-medium text-gray-800">Travel Charge ({quote.travelKm}km)</div>
                  <div className="font-bold tabular-nums">{formatCurrency(quote.travelCost)}</div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl space-y-3 mb-10">
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>GST (10%)</span>
                <span className="tabular-nums">{formatCurrency(quote.gstAmount)}</span>
              </div>
              <div className="flex justify-between font-black text-2xl pt-4 border-t-2 border-gray-200 mt-2 text-gray-900">
                <span>Total Due</span>
                <span className="tabular-nums">{formatCurrency(quote.total)}</span>
              </div>
            </div>

            <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 leading-relaxed font-medium">
              <span className="font-bold text-blue-900">Deposit required:</span> {formatCurrency(quote.depositAmount)} ({quote.depositPercent}%){quote.depositCompliant ? " ✓ Compliant" : " ⚠ Check limits"}<br/><br/>
              Valid until: {quote.validUntil ? formatDate(quote.validUntil) : "30 days from sent date"}.
              All work will be completed in accordance with standard industry practices.
              Payment is required strictly within 7 days of invoice unless otherwise agreed.
            </div>

            {quote.sopaText && (
              <div className="mt-6 text-[9px] text-gray-400 leading-relaxed text-justify bg-gray-50 p-4 rounded-xl">
                {quote.sopaText}
              </div>
            )}
          </motion.div>
        )}

        {activeView === "internal" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            <div className="bg-primary/10 border border-primary/20 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative z-10 flex items-center justify-between mb-2">
                <StatusPill status={quote.status} className="text-sm px-4 py-1.5" />
              </div>
              <div className="relative z-10 mt-6">
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">Quote Total</div>
                <div className="text-4xl font-black text-white tracking-tight tabular-nums">{formatCurrency(quote.total)}</div>
              </div>
            </div>

            {internalItems.length > 0 && (
              <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white/40"></span> Hidden Cost Items
                </div>
                <div className="space-y-3">
                  {internalItems.map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-white bg-white/5 p-4 rounded-2xl border border-white/5">
                      <span className="pr-4 font-medium">{item.description} <span className="text-muted-foreground font-bold text-xs ml-2">×{item.quantity}</span></span>
                      <span className="font-bold tabular-nums">{formatCurrency(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {quote.internalNotes && (
              <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Internal Notes</div>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{quote.internalNotes}</p>
              </div>
            )}

            {internalItems.length === 0 && !quote.internalNotes && (
              <div className="text-center py-12 text-muted-foreground text-sm bg-white/5 border border-white/10 rounded-3xl font-medium">
                No hidden items or internal notes.
              </div>
            )}

            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-5">Activity Timeline</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10 pl-1">
                <div className="flex gap-5 relative">
                  <div className="w-6 h-6 bg-[#1C1C1E] border-2 border-white/20 rounded-full shrink-0 flex items-center justify-center z-10 mt-0.5"></div>
                  <div>
                    <div className="text-sm font-bold text-white mb-0.5">Created</div>
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{formatDate(quote.createdAt)}</div>
                  </div>
                </div>
                {quote.sentAt && (
                  <div className="flex gap-5 relative">
                    <div className="w-6 h-6 bg-[#1C1C1E] border-2 border-primary rounded-full shrink-0 flex items-center justify-center z-10 mt-0.5"></div>
                    <div>
                      <div className="text-sm font-bold text-white mb-0.5">Sent to client</div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{formatDate(quote.sentAt)}</div>
                    </div>
                  </div>
                )}
                {quote.viewedAt && (
                  <div className="flex gap-5 relative">
                    <div className="w-6 h-6 bg-accent rounded-full shrink-0 flex items-center justify-center z-10 mt-0.5 shadow-[0_0_10px_rgba(251,146,60,0.5)]"></div>
                    <div>
                      <div className="text-sm font-bold text-accent mb-0.5">Viewed by client</div>
                      <div className="text-[11px] font-medium text-accent/70 uppercase tracking-wider">{formatDate(quote.viewedAt)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/90 backdrop-blur-xl border-t border-white/10 z-40">
        <div className="max-w-[480px] mx-auto flex gap-3">
          <Button
            variant="outline"
            className="w-14 h-14 rounded-2xl p-0 shrink-0 border-white/20 bg-white/5 hover:bg-white/10 text-white"
            onClick={() => window.open(`/api/export/quote/${quote.id}/pdf`, '_blank')}
            title="Download PDF"
          >
            <Download className="w-5 h-5" />
          </Button>
          {isDraft && (
            <>
              <Button variant="outline" onClick={handleOpenEdit} className="w-14 h-14 rounded-2xl p-0 shrink-0 border-white/20 bg-white/5 hover:bg-white/10 text-white">
                <FileEdit className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendQuote.isPending}
                className="flex-1 h-14 rounded-2xl font-bold bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <Send className="w-4 h-4 mr-2" /> Send
              </Button>
              <Button
                onClick={handleConvert}
                disabled={convertToJob.isPending}
                className="flex-1 h-14 rounded-2xl font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
              >
                <ArrowRight className="w-4 h-4 mr-2" /> To Job
              </Button>
            </>
          )}
          {isSent && (
            <>
              <Button variant="outline" onClick={handleOpenEdit} className="flex-1 h-14 rounded-2xl font-bold border-white/20 bg-white/5 hover:bg-white/10 text-white">
                <FileEdit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button
                onClick={handleConvert}
                disabled={convertToJob.isPending}
                className="flex-1 h-14 rounded-2xl font-bold bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" /> Convert to Job
              </Button>
            </>
          )}
          {quote.status === "accepted" && (
            <Button
              onClick={handleConvert}
              disabled={convertToJob.isPending}
              className="w-full h-14 rounded-2xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" /> Convert to Job
            </Button>
          )}
          {(quote.status === "declined" || quote.status === "expired") && (
            <div className="flex-1 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-muted-foreground font-bold text-sm uppercase tracking-wider">
              Quote {quote.status}
            </div>
          )}
        </div>
      </div>

      {/* Edit Quote Drawer */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="bg-[#1C1C1E] border-white/10 h-[85vh] rounded-t-[32px]">
          <div className="p-6 overflow-y-auto pb-32">
            <div className="flex items-center justify-between mb-8">
              <DrawerTitle className="text-2xl font-bold text-white">Edit Quote</DrawerTitle>
              <button onClick={() => setEditOpen(false)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Title</label>
                <Input
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Scope of work…"
                  className="bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white resize-none min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Valid Until</label>
                <Input
                  type="date"
                  value={editForm.validUntil}
                  onChange={e => setEditForm(f => ({ ...f, validUntil: e.target.value }))}
                  className="h-14 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary text-white block w-full"
                />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/10">
            <Button
              onClick={handleSaveEdit}
              disabled={updateQuote.isPending}
              className="w-full h-14 rounded-xl font-bold text-lg bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(20,184,166,0.3)]"
            >
              {updateQuote.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </Layout>
  );
}
