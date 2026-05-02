import React from "react";
import { useGetNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { Header, Layout } from "@/components/layout";
import { Bell, CheckCircle2, AlertTriangle, Check, BellRing } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";

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

  const getIconInfo = (type: string) => {
    switch(type) {
      case 'QUOTE_ACCEPTED': return { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/10 border-emerald-500/20" };
      case 'INVOICE_PAID': return { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/10 border-emerald-500/20" };
      case 'INVOICE_OVERDUE': return { icon: <AlertTriangle className="w-5 h-5 text-red-400" />, bg: "bg-red-500/10 border-red-500/20" };
      case 'BAS_DUE_SOON': return { icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, bg: "bg-amber-500/10 border-amber-500/20" };
      default: return { icon: <BellRing className="w-5 h-5 text-primary" />, bg: "bg-primary/10 border-primary/20" };
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Layout>
      <Header 
        title="Inbox" 
        showBack onBack={() => window.history.back()}
        rightContent={
          unreadCount > 0 ? (
            <button onClick={handleMarkAll} className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 hover:text-white transition-colors bg-primary/10 px-3 py-1.5 rounded-lg">
              <Check className="w-3.5 h-3.5" /> Mark all read
            </button>
          ) : null
        }
      />
      
      <div className="px-6 pb-32 mt-2">
        
        {unreadCount > 0 && (
          <div className="mb-6 flex items-center gap-2">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-2">
              {unreadCount} Unread Message{unreadCount === 1 ? '' : 's'}
            </div>
            <div className="h-px bg-white/10 flex-1 ml-2" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/5 border border-white/10 animate-pulse rounded-3xl" />)}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 text-muted-foreground bg-white/5 border border-white/10 rounded-3xl"
          >
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
              <Bell className="w-8 h-8 text-white/20" />
            </div>
            <p className="font-black text-white mb-2 text-xl tracking-tight">Inbox Zero</p>
            <p className="text-sm font-medium">You're all caught up. No new notifications.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((note, idx) => {
                const { icon, bg } = getIconInfo(note.type || '');
                return (
                  <motion.div 
                    key={note.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => !note.isRead && handleMarkRead(note.id)}
                    className={`flex gap-4 p-5 rounded-3xl transition-all cursor-pointer relative overflow-hidden group ${
                      note.isRead 
                        ? 'bg-transparent border border-white/5 opacity-60 hover:opacity-100 hover:bg-white/[0.02]' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/[0.08]'
                    }`}
                  >
                    {!note.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary opacity-80 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
                    )}
                    
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${note.isRead ? 'bg-white/5 border-white/5' : bg}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className={`text-sm leading-relaxed ${note.isRead ? 'text-white/70 font-medium' : 'text-white font-bold'}`}>
                        {note.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${note.isRead ? 'text-muted-foreground' : 'text-primary'}`}>
                          {formatDate(note.createdAt)}
                        </div>
                        {!note.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Layout>
  );
}
