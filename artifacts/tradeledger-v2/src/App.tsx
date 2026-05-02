import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMe } from "@workspace/api-client-react";

import Dashboard from "./pages/dashboard";
import QuotesList from "./pages/quotes";
import NewQuote from "./pages/quotes/new";
import QuoteDetail from "./pages/quotes/detail";
import JobsList from "./pages/jobs";
import JobDetail from "./pages/jobs/detail";
import InvoicesList from "./pages/invoices";
import NewInvoice from "./pages/invoices/new";
import InvoiceDetail from "./pages/invoices/detail";
import ExpensesList from "./pages/expenses";
import NewExpense from "./pages/expenses/new";
import Logbook from "./pages/logbook";
import Settings from "./pages/settings";
import Subcontractors from "./pages/subcontractors";
import Notifications from "./pages/notifications";
import Onboarding from "./pages/onboarding";
import TaxPage from "./pages/tax";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { data: me, isLoading: meLoading } = useGetMe({ query: { enabled: isAuthenticated, queryKey: ["me"] } });

  if (isLoading || (isAuthenticated && meLoading)) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary text-white rounded-3xl flex items-center justify-center text-3xl font-bold mb-6 shadow-xl">TL</div>
        <h1 className="text-4xl font-bold text-primary mb-3 tracking-tight">TradeLedger</h1>
        <p className="text-gray-500 mb-10 text-lg max-w-[280px]">Premium business management for Australian tradies.</p>
        <button onClick={() => login()} className="w-full max-w-[300px] h-14 bg-primary text-white rounded-full font-semibold text-lg hover:scale-[0.98] transition-transform shadow-lg">
          Log In
        </button>
      </div>
    );
  }

  if (me?.needsOnboarding && window.location.pathname !== import.meta.env.BASE_URL + "onboarding") {
    window.location.href = import.meta.env.BASE_URL.replace(/\/$/, "") + "/onboarding";
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/quotes" component={() => <ProtectedRoute component={QuotesList} />} />
      <Route path="/quotes/new" component={() => <ProtectedRoute component={NewQuote} />} />
      <Route path="/quotes/:id" component={() => <ProtectedRoute component={QuoteDetail} />} />
      <Route path="/jobs" component={() => <ProtectedRoute component={JobsList} />} />
      <Route path="/jobs/:id" component={() => <ProtectedRoute component={JobDetail} />} />
      <Route path="/invoices" component={() => <ProtectedRoute component={InvoicesList} />} />
      <Route path="/invoices/new" component={() => <ProtectedRoute component={NewInvoice} />} />
      <Route path="/invoices/:id" component={() => <ProtectedRoute component={InvoiceDetail} />} />
      <Route path="/expenses" component={() => <ProtectedRoute component={ExpensesList} />} />
      <Route path="/expenses/new" component={() => <ProtectedRoute component={NewExpense} />} />
      <Route path="/logbook" component={() => <ProtectedRoute component={Logbook} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/subcontractors" component={() => <ProtectedRoute component={Subcontractors} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
      <Route path="/tax" component={() => <ProtectedRoute component={TaxPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
