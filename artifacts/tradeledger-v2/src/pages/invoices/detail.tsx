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
import { Download, BellRing, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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
        <div className="p-5 space-y-4">
          <div className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
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
      
      <div className="px-5 pb-[160px] animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-4">
          <StatusPill status={invoice.status} className="text-sm px-3 py-1" />
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{invoice.type} INVOICE</div>
        </div>

        {/* Document View */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-50">
            <div>
              <div className="font-bold text-xl text-primary">{me?.user?.businessName || "Your Business"}</div>
              <div className="text-xs text-gray-500 mt-1">ABN {me?.user?.abn || "Not set"}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice To</div>
              <div className="font-semibold text-sm text-gray-900 mt-1">{invoice.client?.name}</div>
            </div>
          </div>

          <div className="flex justify-between mb-8 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Issue Date</div>
              <div className="font-medium">{formatDate(invoice.createdAt)}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500 mb-1">Due Date</div>
              <div className="font-medium text-accent">{formatDate(invoice.dueDate)}</div>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="font-bold text-sm border-b border-gray-100 pb-2">Description</div>
            {invoice.job?.title && (
              <div className="flex justify-between text-sm py-2">
                <div className="flex-1 pr-4 font-medium">{invoice.job.title} - {invoice.type} Payment</div>
                <div className="font-medium">{formatCurrency(invoice.subtotal)}</div>
              </div>
            )}
            {!invoice.job?.title && (
               <div className="flex justify-between text-sm py-2">
               <div className="flex-1 pr-4 font-medium">{invoice.type} Payment</div>
               <div className="font-medium">{formatCurrency(invoice.subtotal)}</div>
             </div>
            )}
          </div>

          <div className="space-y-2 mt-8 bg-secondary p-4 rounded-xl">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>GST (10%)</span>
              <span>{formatCurrency(invoice.gstAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-xl pt-3 mt-2 border-t border-gray-200">
              <span>Total Due</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {invoice.sopaText && (
            <div className="mt-8 text-[10px] text-gray-400 leading-relaxed text-justify bg-gray-50 p-4 rounded-xl">
              {invoice.sopaText}
            </div>
          )}
        </div>

        {/* Payment Link Info */}
        {invoice.stripePaymentLink && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <div className="text-sm font-semibold text-blue-900 mb-1">Online Payment Enabled</div>
            <div className="text-xs text-blue-700 break-all">{invoice.stripePaymentLink}</div>
          </div>
        )}
      </div>

      <div className="fixed bottom-[64px] left-0 right-0 p-4 bg-white border-t border-gray-100 z-40">
        <div className="max-w-[480px] mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-full font-semibold border-gray-200"
            onClick={() => window.open(`/api/export/invoice/${invoice?.id}/pdf`, '_blank')}
          >
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
          {!isPaid ? (
            <>
              <Button 
                variant="outline"
                className="w-14 h-14 rounded-full p-0 flex-shrink-0 border-gray-200"
                onClick={handleSendReminder}
                disabled={sendReminder.isPending}
              >
                <BellRing className="w-5 h-5 text-gray-600" />
              </Button>
              <Drawer open={paymentDrawerOpen} onOpenChange={setPaymentDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button className="flex-1 h-14 rounded-full font-semibold bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Paid
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-white rounded-t-[24px]">
                  <div className="p-6">
                    <DrawerTitle className="text-2xl font-bold mb-6">Record Payment</DrawerTitle>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Payment Method</label>
                        <Select value={paymentData.method} onValueChange={v => setPaymentData({...paymentData, method: v})}>
                          <SelectTrigger className="h-14 bg-secondary border-none font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-400 uppercase">Date Paid</label>
                        <Input 
                          type="date" 
                          value={paymentData.date}
                          onChange={e => setPaymentData({...paymentData, date: e.target.value})}
                          className="h-14 bg-secondary border-none" 
                        />
                      </div>
                      <Button onClick={handleMarkPaid} disabled={markPaid.isPending} className="w-full h-14 rounded-full text-lg font-semibold bg-green-600 hover:bg-green-700 text-white mt-4">
                        Confirm Payment
                      </Button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </>
          ) : (
             <div className="flex-1 h-14 rounded-full flex items-center justify-center bg-green-50 text-green-700 font-semibold border border-green-200">
               Paid on {invoice.paidAt ? formatDate(invoice.paidAt) : 'Unknown Date'}
             </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
