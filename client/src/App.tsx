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

import Home from "@/pages/Home";
import Search from "@/pages/Search";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import PropertyDetail from "@/pages/PropertyDetail";
import Notifications from "@/pages/Notifications";
import Messages from "@/pages/Messages";
import ChatRoom from "@/pages/ChatRoom";
import AddProperty from "@/pages/AddProperty";
import EditProperty from "@/pages/EditProperty";
import ClientDashboard from "@/pages/dashboard/ClientDashboard";
import MyVisits from "@/pages/MyVisits";
import ProprietaireDashboard from "@/pages/dashboard/ProprietaireDashboard";
import CommissionnaireDashboard from "@/pages/dashboard/CommissionnaireDashboard";
import AgentDashboard from "@/pages/dashboard/AgentDashboard";
import LegalPage from "@/pages/LegalPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <ScrollToTop />
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
    </>
  );
}

function DashboardRouter() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
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
