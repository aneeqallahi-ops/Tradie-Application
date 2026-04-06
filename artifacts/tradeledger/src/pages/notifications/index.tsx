import React from "react";
import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Bell, CheckCircle2, AlertTriangle, FileText, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";

export default function Notifications() {
  const { data: notifications = [], isLoading } = useGetNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const queryClient = useQueryClient();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] })
    });
  };

  const handleMarkAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/notifications'] })
    });
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'QUOTE_ACCEPTED': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'INVOICE_PAID': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'INVOICE_OVERDUE': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'BAS_DUE_SOON': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <Layout>
      <Header 
        title="Notifications" 
        showBack onBack={() => window.history.back()}
        rightContent={
          notifications.some(n => !n.isRead) && (
            <button onClick={handleMarkAll} className="text-sm font-semibold text-primary flex items-center gap-1">
              <Check className="w-4 h-4" /> Mark all read
            </button>
          )
        }
      />
      
      <div className="px-5 pb-24">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-2xl" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Bell className="w-8 h-8 text-gray-300" />
            </div>
            <p className="font-medium text-gray-900 mb-1">All caught up</p>
            <p className="text-sm">You have no new notifications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(note => (
              <div 
                key={note.id} 
                onClick={() => !note.isRead && handleMarkRead(note.id)}
                className={`flex gap-4 p-4 rounded-2xl transition-colors cursor-pointer ${
                  note.isRead ? 'bg-transparent opacity-60' : 'bg-white shadow-sm border border-gray-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${note.isRead ? 'bg-gray-100' : 'bg-secondary'}`}>
                  {getIcon(note.type || '')}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${note.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                    {note.message}
                  </p>
                  <div className="text-xs text-gray-400 mt-1">{formatDate(note.createdAt)}</div>
                </div>
                {!note.isRead && (
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
