import { lazy, Suspense, useEffect } from "react";
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

const Profile = lazy(() => import("@/pages/Profile"));
const PropertyDetail = lazy(() => import("@/pages/PropertyDetail"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Messages = lazy(() => import("@/pages/Messages"));
const ChatRoom = lazy(() => import("@/pages/ChatRoom"));
const AddProperty = lazy(() => import("@/pages/AddProperty"));
const EditProperty = lazy(() => import("@/pages/EditProperty"));
const ClientDashboard = lazy(() => import("@/pages/dashboard/ClientDashboard"));
const MyVisits = lazy(() => import("@/pages/MyVisits"));
const ProprietaireDashboard = lazy(() => import("@/pages/dashboard/ProprietaireDashboard"));
const CommissionnaireDashboard = lazy(() => import("@/pages/dashboard/CommissionnaireDashboard"));
const AgentDashboard = lazy(() => import("@/pages/dashboard/AgentDashboard"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));

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
            <ProtectedRoute allowedRoles={['proprietaire']}><AddProperty /></ProtectedRoute>
          </Route>
          <Route path="/property/:id/edit">
            <ProtectedRoute allowedRoles={['proprietaire']}><EditProperty /></ProtectedRoute>
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
          <Route path="/pending-properties">
            <ProtectedRoute allowedRoles={['commissionnaire']}><CommissionnaireDashboard /></ProtectedRoute>
          </Route>
          <Route path="/agent-dashboard">
            <ProtectedRoute allowedRoles={['agent']}><AgentDashboard /></ProtectedRoute>
          </Route>
          <Route path="/legal/:pageType" component={LegalPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
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
    case 'commissionnaire':
      return <Redirect to="/pending-properties" />;
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
