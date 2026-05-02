import React, { useState, useContext, createContext, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Home, FileText, Briefcase, Receipt, Calculator, Users, Settings2, Bell, X, CheckCheck, Menu, Plus } from "lucide-react";
import { useGetDashboard, useGetNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

const NotifContext = createContext<{ open: () => void }>({ open: () => {} });

export function BottomNav() {
  const [location] = useLocation();

  const primaryNavItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: FileText, label: "Quotes", href: "/quotes" },
    { icon: Briefcase, label: "Jobs", href: "/jobs" },
    { icon: Receipt, label: "Expenses", href: "/expenses" },
  ];

  const secondaryNavItems = [
    { icon: Calculator, label: "Tax Hub", href: "/tax" },
    { icon: Users, label: "Advisory", href: "/advisory" },
    { icon: Settings2, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-background/80 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-2 shadow-2xl safe-area-bottom">
      {primaryNavItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center w-16 h-full gap-1.5 transition-all duration-300 ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-white"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-[1px] w-8 h-[2px] bg-primary rounded-b-full shadow-[0_0_10px_rgba(26,219,165,0.5)]"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <item.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </Link>
        );
      })}

      <Drawer>
        <DrawerTrigger asChild>
          <button className={`flex flex-col items-center justify-center w-16 h-full gap-1.5 transition-all duration-300 text-muted-foreground hover:text-white`}>
            <Menu className="w-[22px] h-[22px]" strokeWidth={1.5} />
            <span className="text-[10px] font-medium tracking-wide">More</span>
          </button>
        </DrawerTrigger>
        <DrawerContent className="bg-card/95 backdrop-blur-3xl border-white/10 rounded-t-3xl">
          <div className="p-6 pb-12">
            <DrawerTitle className="text-xl font-bold text-white mb-6 px-2">More Tools</DrawerTitle>
            <div className="grid grid-cols-2 gap-3">
              {secondaryNavItems.map(item => (
                <Link key={item.href} href={item.href} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <item.icon className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useGetNotifications({ query: { enabled: open, queryKey: ["/api/notifications", open] } });
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });
  };

  const handleMarkOne = (id: number) => {
    markOne.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });
  };

  const unread = notifications.filter(n => !n.isRead);

  return (
    <Drawer open={open} onOpenChange={v => !v && onClose()}>
      <DrawerContent className="max-h-[85vh] bg-card border-white/10">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <DrawerTitle className="text-lg font-bold text-white">Notifications</DrawerTitle>
            <div className="flex items-center gap-3">
              {unread.length > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={markAll.isPending}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  <CheckCheck className="w-4 h-4" /> Mark all read
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[65vh] space-y-2 -mx-1 px-1">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="font-semibold text-white">All caught up</p>
                <p className="text-sm mt-1">No new notifications.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkOne(n.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all ${
                    n.isRead ? "bg-white/5 text-muted-foreground" : "bg-primary/10 border border-primary/20 text-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {!n.isRead && (
                        <span className="inline-block w-2 h-2 bg-primary rounded-full mr-2 mb-1 align-middle shadow-[0_0_8px_rgba(26,219,165,0.6)]" />
                      )}
                      <span className="text-sm font-semibold">{n.type ?? "Notification"}</span>
                      <p className="text-xs text-white/60 mt-1.5 leading-relaxed">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-white/40 shrink-0 mt-0.5 font-medium tracking-wide">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const openNotif = useCallback(() => setNotifOpen(true), []);

  return (
    <NotifContext.Provider value={{ open: openNotif }}>
      <div className="min-h-[100dvh] bg-background text-foreground selection:bg-primary/30">
        <main className="max-w-[480px] mx-auto min-h-[100dvh] relative pb-[90px] pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomNav />
        <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
      </div>
    </NotifContext.Provider>
  );
}

export function Header({
  title,
  rightContent,
  showBack = false,
  onBack,
}: {
  title: React.ReactNode;
  rightContent?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
}) {
  const { open: openNotif } = useContext(NotifContext);
  const { data: dashboard } = useGetDashboard();
  const unreadCount = dashboard?.notificationsUnreadCount || 0;

  return (
    <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={onBack} className="p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {rightContent}
        {!rightContent && !showBack && (
          <button onClick={openNotif} className="relative p-2 -mr-2 text-white/70 hover:text-white transition-colors">
            <Bell className="w-[22px] h-[22px]" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-primary rounded-full border-[2px] border-background shadow-[0_0_8px_rgba(26,219,165,0.6)]" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
