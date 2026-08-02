import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Toaster } from 'react-hot-toast';
import { useChatRealtime } from './components/tabs/useChatRealtime';

// Pages & Components
import Home from './pages/Home';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import RefundPolicy from './pages/RefundPolicy';
import ReturnPolicy from './pages/ReturnPolicy';
import ShippingPolicy from './pages/ShippingPolicy';
import Support from './pages/Support';
import Signup from './pages/Signup';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Safety from './pages/Safety';
import FAQ from './pages/FAQ';
import AdminDashboard from './pages/AdminDashboard';
import ResetPassword from './pages/ResetPassword';
import Login from './components/Login';

// PhonePe Payment Gateway Integration Page/Component
import CheckoutPage from './pages/CheckoutPage';

// Live Streaming Components
const HostLivePage = ({ session }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
    <h1 className="text-2xl font-bold text-red-500 mb-2">🔴 Host Live Stream Room</h1>
    <p className="text-gray-400">Live stream host setup initialized for user: {session?.user?.email}</p>
  </div>
);

const ViewerLivePage = ({ session }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
    <h1 className="text-2xl font-bold text-pink-500 mb-2">📺 Watching Live Stream</h1>
    <p className="text-gray-400">Connected to stream as viewer.</p>
  </div>
);

function AppRoutes({ session }) {
  const navigate = useNavigate();
  const userEmail = session?.user?.email?.trim().toLowerCase();
  const isAdmin = userEmail === 'lalchandpahan88@gmail.com';

  const [currentChatUser, setCurrentChatUser] = useState(null);
  const { messages, sendMessage, startRecording, stopRecording, isRecording } = useChatRealtime(session, currentChatUser);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
      if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
        const loggedInEmail = currentSession?.user?.email?.trim().toLowerCase();
        const isAdminUser = loggedInEmail === 'lalchandpahan88@gmail.com';
        navigate(isAdminUser ? '/admin' : '/dashboard');
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex flex-col">
      <div className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home session={session} />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/support" element={<Support />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/return-policy" element={<ReturnPolicy />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />

          {/* PhonePe Payment Gateway Route */}
          <Route path="/checkout" element={session ? <CheckoutPage session={session} /> : <Navigate to="/login" replace />} />

          {/* Auth Routes */}
          <Route path="/login" element={!session ? <Login /> : <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />
          <Route path="/signup" element={!session ? <Signup /> : <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/profile-setup" element={session ? <ProfileSetup session={session} /> : <Navigate to="/login" replace />} />
          <Route path="/dashboard" element={session ? (<Dashboard session={session} setCurrentChatUser={setCurrentChatUser} messages={messages} sendMessage={sendMessage} startRecording={startRecording} stopRecording={stopRecording} isRecording={isRecording} />) : <Navigate to="/login" replace />} />

          {/* Live Streaming Routes */}
          <Route path="/host-live/:roomName" element={session ? <HostLivePage session={session} /> : <Navigate to="/login" replace />} />
          <Route path="/viewer-live/:roomName" element={session ? <ViewerLivePage session={session} /> : <Navigate to="/login" replace />} />

          {/* Admin Route */}
          <Route path="/admin" element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/login" replace />} />

          {/* Fallback */}
          <Route path="*" element={session ? <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace /> : <Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium text-sm">Loading CityCrossed...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <AppRoutes session={session} />
    </Router>
  );
}