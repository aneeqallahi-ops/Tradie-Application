import React, { useState } from "react";
import { useParams } from "wouter";
import { useGetInvoice, useGetMe, useMarkInvoicePaid, useSendInvoiceReminder } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusPill } from "@/components/status-pill";
import { useToast } from "@/hooks/use-toast";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, BellRing, CheckCircle2, CreditCard, Link as LinkIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function InvoiceDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me } = useGetMe();
  const { data: invoice, isLoading } = useGetInvoice(Number(id), { 
    query: { enabled: !!id, queryKey: ['invoice', id] } 
  });

  const markPaid = useMarkInvoicePaid();
  const sendReminder = useSendInvoiceReminder();

  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    method: "Bank Transfer",
    date: new Date().toISOString().split('T')[0]
  });

  if (isLoading || !invoice) {
    return (
      <Layout>
        <Header title="Invoice" showBack onBack={() => window.history.back()} />
        <div className="p-6 space-y-4">
          <div className="h-64 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />
        </div>
      </Layout>
    );
  }

  const handleMarkPaid = () => {
    markPaid.mutate({
      id: invoice.id,
      data: {
        paymentMethod: paymentData.method,
        paidAt: new Date(paymentData.date).toISOString()
      }
    }, {
      onSuccess: () => {
        toast({ title: "Invoice marked as paid!" });
        setPaymentDrawerOpen(false);
        queryClient.invalidateQueries({ queryKey: ['invoice', String(invoice.id)] });
      },
      onError: () => {
        toast({ title: "Failed to mark paid", variant: "destructive" });
      }
    });
  };

  const handleSendReminder = () => {
    sendReminder.mutate({ id: invoice.id }, {
      onSuccess: () => toast({ title: "Reminder sent to client" }),
      onError: () => toast({ title: "Failed to send reminder", variant: "destructive" })
    });
  };

  const isPaid = invoice.status === "paid";

  return (
    <Layout>
      <Header 
        title={`Invoice #${invoice.invoiceNumber || invoice.id}`} 
        showBack onBack={() => window.history.back()} 
      />
      
      <div className="px-6 pb-[160px] mt-2 space-y-6">
        <div className="flex items-center justify-between mb-2">
          <StatusPill status={invoice.status} className="px-4 py-1.5 text-sm" />
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{invoice.type} INVOICE</div>
        </div>

        {/* Document View */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white text-black p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-primary" />
          
          <div className="flex justify-between items-start mb-10 pt-4 border-b-2 border-gray-100 pb-8">
            <div>
              <div className="font-black text-2xl tracking-tight text-gray-900">{me?.user?.businessName || "Your Business"}</div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">ABN {me?.user?.abn || "Not set"}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice To</div>
              <div className="font-bold text-base text-gray-900">{invoice.client?.name}</div>
            </div>
          </div>

          <div className="flex justify-between mb-10 text-sm bg-gray-50 p-4 rounded-2xl">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Issue Date</div>
              <div className="font-bold text-gray-900">{formatDate(invoice.createdAt)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Due Date</div>
              <div className="font-bold text-red-600">{formatDate(invoice.dueDate)}</div>
            </div>
          </div>

          <div className="space-y-4 mb-10">
            <div className="font-bold text-xs uppercase tracking-widest text-gray-400 border-b-2 border-gray-100 pb-3">Description</div>
            {invoice.job?.title ? (
              <div className="flex justify-between text-sm py-2 border-b border-gray-50 pb-3">
                <div className="flex-1 pr-4 font-medium text-gray-800">{invoice.job.title} - {invoice.type} Payment</div>
                <div className="font-bold tabular-nums">{formatCurrency(invoice.subtotal)}</div>
              </div>
            ) : (
               <div className="flex justify-between text-sm py-2 border-b border-gray-50 pb-3">
               <div className="flex-1 pr-4 font-medium text-gray-800">{invoice.type} Payment</div>
               <div className="font-bold tabular-nums">{formatCurrency(invoice.subtotal)}</div>
             </div>
            )}
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl space-y-3">
            <div className="flex justify-between text-sm font-medium text-gray-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-500">
              <span>GST Included (10%)</span>
              <span className="tabular-nums">{formatCurrency(invoice.gstAmount)}</span>
            </div>
            <div className="flex justify-between font-black text-2xl pt-4 mt-2 border-t-2 border-gray-200 text-gray-900">
              <span>Total Due</span>
              <span className="tabular-nums">{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {invoice.sopaText && (
            <div className="mt-8 text-[9px] text-gray-400 leading-relaxed text-justify bg-gray-50 p-4 rounded-xl">
              {invoice.sopaText}
            </div>
          )}
        </motion.div>

        {/* Payment Link Info */}
        {invoice.stripePaymentLink && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-primary/10 border border-primary/20 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <LinkIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white mb-1">Online Payment Enabled</div>
              <a href={invoice.stripePaymentLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all block">
                {invoice.stripePaymentLink}
              </a>
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
            onClick={() => window.open(`/api/export/invoice/${invoice?.id}/pdf`, '_blank')}
            title="Download PDF"
          >
            <Download className="w-5 h-5" />
          </Button>
          
          {!isPaid ? (
            <>
              <Button 
                variant="outline"
                className="w-14 h-14 rounded-2xl p-0 shrink-0 border-white/20 bg-white/5 hover:bg-white/10 text-white"
                onClick={handleSendReminder}
                disabled={sendReminder.isPending}
                title="Send Reminder"
              >
                <BellRing className="w-5 h-5" />
              </Button>
              <Drawer open={paymentDrawerOpen} onOpenChange={setPaymentDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button className="flex-1 h-14 rounded-2xl font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Mark Paid
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-[#1C1C1E] border-white/10 h-[60vh] rounded-t-[32px]">
                  <div className="p-6">
                    <DrawerTitle className="text-2xl font-bold text-white mb-6">Record Payment</DrawerTitle>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Payment Method</label>
                        <Select value={paymentData.method} onValueChange={v => setPaymentData({...paymentData, method: v})}>
                          <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                            <SelectItem value="Bank Transfer" className="focus:bg-white/10">Bank Transfer</SelectItem>
                            <SelectItem value="Credit Card" className="focus:bg-white/10">Credit Card</SelectItem>
                            <SelectItem value="Cash" className="focus:bg-white/10">Cash</SelectItem>
                            <SelectItem value="Cheque" className="focus:bg-white/10">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Date Paid</label>
                        <Input 
                          type="date" 
                          value={paymentData.date}
                          onChange={e => setPaymentData({...paymentData, date: e.target.value})}
                          className="h-14 bg-white/5 border-white/10 rounded-xl focus:ring-primary text-white block w-full" 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 bg-[#1C1C1E]/80 backdrop-blur-xl border-t border-white/10">
                    <Button 
                      onClick={handleMarkPaid} 
                      disabled={markPaid.isPending} 
                      className="w-full h-14 rounded-xl text-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      {markPaid.isPending ? "Saving..." : "Confirm Payment"}
                    </Button>
                  </div>
                </DrawerContent>
              </Drawer>
            </>
          ) : (
             <div className="flex-1 h-14 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold tracking-wide">
               Paid on {invoice.paidAt ? formatDate(invoice.paidAt) : 'Unknown Date'}
             </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
