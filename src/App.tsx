import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Leaderboard from "./pages/Leaderboard";
import Tests from "./pages/Tests";
import TakeTest from "./pages/TakeTest";
import TestResult from "./pages/TestResult";
import Admin from "./pages/Admin";
import EditTest from "./pages/EditTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Layout><Dashboard /></Layout>} />
              <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
              <Route path="/tests" element={<Layout><Tests /></Layout>} />
              <Route path="/test/:testId" element={<Layout><TakeTest /></Layout>} />
              <Route path="/test/:testId/result" element={<Layout><TestResult /></Layout>} />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <Layout><Admin /></Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/test/:testId" element={
                <ProtectedRoute requiredRole="admin">
                  <Layout><EditTest /></Layout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
