import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
import ClientDashboard from "@/pages/dashboard/ClientDashboard";
import ProprietaireDashboard from "@/pages/dashboard/ProprietaireDashboard";
import CommissionnaireDashboard from "@/pages/dashboard/CommissionnaireDashboard";
import AgentDashboard from "@/pages/dashboard/AgentDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={Search} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/profile" component={Profile} />
      <Route path="/property/:id" component={PropertyDetail} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/messages" component={Messages} />
      <Route path="/messages/:id" component={ChatRoom} />
      <Route path="/add-property" component={AddProperty} />
      <Route path="/my-properties" component={ProprietaireDashboard} />
      <Route path="/my-visits" component={ClientDashboard} />
      <Route path="/dashboard" component={DashboardRouter} />
      <Route path="/pending-properties" component={CommissionnaireDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DashboardRouter() {
  return <ClientDashboard />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
