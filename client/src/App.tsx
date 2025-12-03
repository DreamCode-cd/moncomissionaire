import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LoadingScreen } from "@/components/loading-screen";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Properties from "@/pages/properties";
import PropertyDetail from "@/pages/property-detail";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ClientDashboard from "@/pages/dashboard/client";
import ClientProfile from "@/pages/dashboard/client/profile";
import OwnerDashboard from "@/pages/dashboard/owner";
import PropertyNew from "@/pages/dashboard/owner/property-new";
import PropertyEdit from "@/pages/dashboard/owner/property-edit";
import Availabilities from "@/pages/dashboard/owner/availabilities";
import OwnerProfile from "@/pages/dashboard/owner/profile";
import HowItWorks from "@/pages/how-it-works";
import Contact from "@/pages/contact";
import { useEffect } from "react";

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/properties" component={Properties} />
      <Route path="/properties/:id" component={PropertyDetail} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard/client" component={ClientDashboard} />
      <Route path="/dashboard/client/profile" component={ClientProfile} />
      <Route path="/dashboard/owner" component={OwnerDashboard} />
      <Route path="/dashboard/owner/properties/new" component={PropertyNew} />
      <Route path="/dashboard/owner/properties/:id/edit" component={PropertyEdit} />
      <Route path="/dashboard/owner/availabilities" component={Availabilities} />
      <Route path="/dashboard/owner/profile" component={OwnerProfile} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/contact" component={Contact} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <ScrollToTop />
      <Toaster />
      <Router />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;