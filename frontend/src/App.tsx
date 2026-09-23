import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNotifications } from "@/hooks/use-notifications";
import { startKeepAlive } from "@/hooks/use-keep-alive";
import { AuthService } from "@/services/auth.service";
import Index from "./pages/Index";
import LiveMatch from "./pages/LiveMatch";
import Tournaments from "./pages/Tournaments";
import CreateTournament from "./pages/CreateTournament";
import TournamentDetail from "./pages/TournamentDetail";
import PlayerProfile from "./pages/PlayerProfile";
import EditProfile from "./pages/EditProfile";
import LiveBroadcast from "./pages/LiveBroadcast";
import CreateBroadcast from "./pages/CreateBroadcast";
import Rankings from "./pages/Rankings";
import News from "./pages/News";
import Smashed from "./pages/Smashed";
import Login from "./pages/Login";
import Court from "./pages/Court";
import Social from "./pages/Social";
import BroadcastCenter from "./pages/BroadcastCenter";
import CreateIndividualMatch from "./pages/CreateIndividualMatch";
import ScoringPage from "./pages/ScoringPage";
import Onboarding from "./pages/Onboarding";
import RegisterParticipant from "./pages/RegisterParticipant";
import MyCircuits from "./pages/MyCircuits";
import MatchScorecard from "./pages/MatchScorecard";
import Players from "./pages/Players";
import NotFound from "./pages/NotFound";
import BottomNav from "./components/layout/BottomNav";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppInner = () => {
  useNotifications();
  useEffect(() => {
    startKeepAlive();
    // Clean up stale local match cache (older than 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const cached = JSON.parse(localStorage.getItem('cache_matches_live') || '[]');
    const fresh = cached.filter((m: any) =>
      new Date(m.createdAt || 0).getTime() > oneDayAgo && m.status === 'live' && !m.winner
    );
    localStorage.setItem('cache_matches_live', JSON.stringify(fresh));
  }, []);

  // Validate session on app load — auto logout if account deleted from DB
  useEffect(() => {
    const validate = async () => {
      if (!AuthService.isLoggedIn()) return;
      const profile = await AuthService.getProfile();
      if (!profile) {
        AuthService.logout();
        window.location.href = '/login';
      }
    };
    validate();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Routes>
        <Route path="/"                    element={<Index />} />
        <Route path="/login"               element={<Login />} />
        <Route path="/onboarding"          element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard"           element={<ProtectedRoute><Court /></ProtectedRoute>} />
        <Route path="/court"               element={<Navigate to="/dashboard" replace />} />
        <Route path="/my-circuits"         element={<ProtectedRoute><MyCircuits /></ProtectedRoute>} />
        <Route path="/smashed"             element={<ProtectedRoute><Smashed /></ProtectedRoute>} />
        <Route path="/social"              element={<ProtectedRoute><Social /></ProtectedRoute>} />
        <Route path="/live-match/active"   element={<LiveMatch />} />
        <Route path="/live-match/create"   element={<ProtectedRoute><CreateIndividualMatch /></ProtectedRoute>} />
        <Route path="/scoring/:matchId"    element={<ProtectedRoute><ScoringPage /></ProtectedRoute>} />
        <Route path="/match/:id"           element={<MatchScorecard />} />
        <Route path="/tournaments"         element={<Tournaments />} />
        <Route path="/tournaments/create"  element={<ProtectedRoute><CreateTournament /></ProtectedRoute>} />
        <Route path="/tournament/:id"      element={<TournamentDetail />} />
        <Route path="/players"             element={<Players />} />
        <Route path="/player/me"           element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
        <Route path="/player/:id"          element={<PlayerProfile />} />
        <Route path="/player/edit"         element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/rankings"            element={<Rankings />} />
        <Route path="/news"                element={<News />} />
        <Route path="/broadcast/create"    element={<ProtectedRoute><CreateBroadcast /></ProtectedRoute>} />
        <Route path="/broadcast/center"    element={<ProtectedRoute><BroadcastCenter /></ProtectedRoute>} />
        <Route path="/broadcast/:id"       element={<LiveBroadcast />} />
        <Route path="/register/:slug"      element={<RegisterParticipant />} />
        <Route path="*"                    element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <ErrorBoundary>
            <AppInner />
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
