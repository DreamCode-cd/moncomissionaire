import { lazy, Suspense, useEffect, Component, ReactNode } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Skeleton } from "@/components/ui/skeleton";

import Home from "@/pages/home";
import Search from "@/pages/Search";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function lazyWithRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() => 
    importFn().catch(() => {
      window.location.reload();
      return { default: () => null };
    })
  );
}

const Profile = lazyWithRetry(() => import("@/pages/Profile"));
const PropertyDetail = lazyWithRetry(() => import("@/pages/PropertyDetail"));
const Notifications = lazyWithRetry(() => import("@/pages/Notifications"));
const Messages = lazyWithRetry(() => import("@/pages/Messages"));
const ChatRoom = lazyWithRetry(() => import("@/pages/ChatRoom"));
const AddProperty = lazyWithRetry(() => import("@/pages/AddProperty"));
const EditProperty = lazyWithRetry(() => import("@/pages/EditProperty"));
const ClientDashboard = lazyWithRetry(() => import("@/pages/dashboard/ClientDashboard"));
const MyVisits = lazyWithRetry(() => import("@/pages/MyVisits"));
const ProprietaireDashboard = lazyWithRetry(() => import("@/pages/dashboard/ProprietaireDashboard"));
const CommissionnaireDashboard = lazyWithRetry(() => import("@/pages/dashboard/CommissionnaireDashboard"));
const ModerateurDashboard = lazyWithRetry(() => import("@/pages/dashboard/ModerateurDashboard"));
const AgentDashboard = lazyWithRetry(() => import("@/pages/dashboard/AgentDashboard"));
const AdminDashboard = lazyWithRetry(() => import("@/pages/dashboard/AdminDashboard"));
const LegalPage = lazyWithRetry(() => import("@/pages/LegalPage"));
const EtatDesLieuxEdition = lazyWithRetry(() => import("@/pages/EtatDesLieuxEdition"));
const EtatDesLieuxPublic = lazyWithRetry(() => import("@/pages/EtatDesLieuxPublic"));

function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    setTimeout(() => window.location.reload(), 100);
  }

  render() {
    if (this.state.hasError) {
      return <PageLoader />;
    }
    return this.props.children;
  }
}

function useRoutePreloader() {
  useEffect(() => {
    const preloadRoutes = () => {
      import("@/pages/PropertyDetail");
      import("@/pages/Profile");
      import("@/pages/Messages");
    };
    
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(preloadRoutes);
    } else {
      setTimeout(preloadRoutes, 2000);
    }
  }, []);
}

function Router() {
  useRoutePreloader();
  
  return (
    <>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Switch>
          <Route path="/" component={Home} />
          <Route path="/search" component={Search} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/property/:id" component={PropertyDetail} />
          <Route path="/profile">
            <ProtectedRoute><Profile /></ProtectedRoute>
          </Route>
          <Route path="/notifications">
            <ProtectedRoute><Notifications /></ProtectedRoute>
          </Route>
          <Route path="/messages">
            <ProtectedRoute><Messages /></ProtectedRoute>
          </Route>
          <Route path="/messages/:id">
            <ProtectedRoute><ChatRoom /></ProtectedRoute>
          </Route>
          <Route path="/add-property">
            <ProtectedRoute allowedRoles={['proprietaire', 'commissionnaire']}><AddProperty /></ProtectedRoute>
          </Route>
          <Route path="/property/:id/edit">
            <ProtectedRoute allowedRoles={['proprietaire', 'commissionnaire']}><EditProperty /></ProtectedRoute>
          </Route>
          <Route path="/my-properties">
            <ProtectedRoute allowedRoles={['proprietaire']}><ProprietaireDashboard /></ProtectedRoute>
          </Route>
          <Route path="/my-visits">
            <ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>
          </Route>
          <Route path="/my-visits/all">
            <ProtectedRoute allowedRoles={['client']}><MyVisits /></ProtectedRoute>
          </Route>
          <Route path="/dashboard">
            <ProtectedRoute><DashboardRouter /></ProtectedRoute>
          </Route>
          <Route path="/mon-portefeuille">
            <ProtectedRoute allowedRoles={['commissionnaire']}><CommissionnaireDashboard /></ProtectedRoute>
          </Route>
          <Route path="/etats-des-lieux/bail/:commissionId/:type?">
            <ProtectedRoute allowedRoles={['commissionnaire']}><EtatDesLieuxEdition /></ProtectedRoute>
          </Route>
          {/* Public : le locataire n'a pas besoin de compte. */}
          <Route path="/etat-des-lieux/:jeton" component={EtatDesLieuxPublic} />
          <Route path="/moderation">
            <ProtectedRoute allowedRoles={['moderateur', 'admin']}><ModerateurDashboard /></ProtectedRoute>
          </Route>
          {/* Ancienne adresse du tableau de bord central, gardée pour les favoris. */}
          <Route path="/pending-properties">
            <Redirect to="/dashboard" />
          </Route>
          <Route path="/agent-dashboard">
            <ProtectedRoute allowedRoles={['agent']}><AgentDashboard /></ProtectedRoute>
          </Route>
          <Route path="/administration">
            <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
          </Route>
          <Route path="/legal/:pageType" component={LegalPage} />
          <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

function DashboardRouter() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <PageLoader />;
  }
  
  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }
  
  switch (user.role) {
    case 'admin':
      return <Redirect to="/administration" />;
    case 'commissionnaire':
      return <Redirect to="/mon-portefeuille" />;
    case 'moderateur':
      return <Redirect to="/moderation" />;
    case 'proprietaire':
      return <Redirect to="/my-properties" />;
    case 'agent':
      return <Redirect to="/agent-dashboard" />;
    case 'client':
    default:
      return <Redirect to="/my-visits" />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
