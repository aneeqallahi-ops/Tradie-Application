import React, { useState, useContext, createContext, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Home, FileText, Briefcase, Receipt, Settings2, Bell, X, CheckCheck } from "lucide-react";
import { useGetDashboard, useGetNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useQueryClient } from "@tanstack/react-query";

const NotifContext = createContext<{ open: () => void }>({ open: () => {} });

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: FileText, label: "Quotes", href: "/quotes" },
    { icon: Briefcase, label: "Jobs", href: "/jobs" },
    { icon: Receipt, label: "Expenses", href: "/expenses" },
    { icon: Settings2, label: "Settings", href: "/settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t border-[#F0EDE8] z-50 flex items-center justify-around px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
              isActive ? "text-accent" : "text-[#BBBBBB]"
            }`}
          >
            <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
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
      <DrawerContent className="max-h-[85vh]">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <DrawerTitle className="text-lg font-bold">Notifications</DrawerTitle>
            <div className="flex items-center gap-3">
              {unread.length > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={markAll.isPending}
                  className="flex items-center gap-1 text-xs font-semibold text-accent"
                >
                  <CheckCheck className="w-4 h-4" /> Mark all read
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[65vh] space-y-2 -mx-1 px-1">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-900">All caught up</p>
                <p className="text-sm mt-1">No notifications yet.</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkOne(n.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-colors ${
                    n.isRead ? "bg-gray-50 text-gray-500" : "bg-white border border-gray-200 shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {!n.isRead && (
                        <span className="inline-block w-2 h-2 bg-accent rounded-full mr-2 mb-1 align-middle" />
                      )}
                      <span className="text-sm font-semibold text-primary">{n.type ?? "Notification"}</span>
                      <p className="text-xs text-gray-500 mt-1">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
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
      <div className="min-h-[100dvh] bg-background">
        <main className="max-w-[480px] mx-auto bg-background min-h-[100dvh] relative pb-[80px]">
          {children}
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
    <header className="px-5 py-4 flex items-center justify-between sticky top-0 bg-background z-40 bg-opacity-90 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {showBack && (
          <button onClick={onBack} className="p-2 -ml-2 text-primary hover:bg-secondary rounded-full transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <h1 className="text-xl font-bold text-primary tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {rightContent}
        {!rightContent && !showBack && (
          <button onClick={openNotif} className="relative p-2 -mr-2">
            <Bell className="w-6 h-6 text-primary" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-background" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}
