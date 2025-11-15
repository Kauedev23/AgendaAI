import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import BarberDashboard from "./pages/BarberDashboard";
import Settings from "./pages/Settings";
import Barbers from "./pages/Barbers";
import Services from "./pages/Services";
import Appointments from "./pages/Appointments";
import Reports from "./pages/Reports";
import PublicBooking from "./pages/PublicBooking";
import Subscription from "./pages/Subscription";
import ManageSubscription from "./pages/ManageSubscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/barber-dashboard" element={<BarberDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/barbers" element={<Barbers />} />
          <Route path="/services" element={<Services />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/manage-subscription" element={<ManageSubscription />} />
          <Route path="/:slug" element={<PublicBooking />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
