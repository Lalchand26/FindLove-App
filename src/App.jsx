import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Toaster } from 'react-hot-toast';

import Home from './pages/Home';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Signup from './pages/Signup';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import Privacy from './pages/Privacy';
import Safety from './pages/Safety';
import FAQ from './pages/FAQ';
import AdminDashboard from './pages/AdminDashboard';
import ResetPassword from './pages/ResetPassword';
import Login from './components/Login';

function AppRoutes({ session }) {
  const navigate = useNavigate();
  const isAdmin = session?.user?.email === 'lalchandpahan88@gmail.com';

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // FIX: PASSWORD_RECOVERY pe bas navigate karo, session ko rehne do
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password');
      }
      // SIGNED_IN pe admin/dashboard redirect
      if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
        const isAdminUser = session?.user?.email === 'lalchandpahan88@gmail.com';
        navigate(isAdminUser? '/admin' : '/dashboard');
      }
    });
    return () => subscription.unsubscribe();
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

          {/* Auth Routes */}
          <Route
            path="/login"
            element={
            !session? <Login /> :
              isAdmin? <Navigate to="/admin" replace /> :
              <Navigate to="/dashboard" replace />
            }
          />
          <Route
            path="/signup"
            element={!session? <Signup /> : <Navigate to="/dashboard" replace />}
          />

          {/* RESET PASSWORD - Session check mat karo, token se access milega */}
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* Protected Routes */}
          <Route
            path="/profile-setup"
            element={session? <ProfileSetup session={session} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/dashboard"
            element={session? <Dashboard session={session} /> : <Navigate to="/login" replace />}
          />

          {/* Admin Route */}
          <Route
            path="/admin"
            element={session && isAdmin? <AdminDashboard /> : <Navigate to="/login" replace />}
          />

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to={session? "/dashboard" : "/"} replace />}
          />
        </Routes>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-500 dark:text-gray-400 py-8 mt-auto bg-white/5 dark:bg-black/20 backdrop-blur-sm border-t border-gray-200 dark:border-white/10">
        <div className="flex justify-center gap-4 mb-2 flex-wrap">
          <a href="/faq" className="hover:text-pink-400 transition">FAQ</a>
          <a href="/support" className="hover:text-pink-400 transition">Support</a>
          <a href="/terms" className="hover:text-pink-400 transition">Terms</a>
          <a href="/privacy" className="hover:text-pink-400 transition">Privacy</a>
          <a href="/safety" className="hover:text-pink-400 transition">Safety Tips</a>
        </div>
        <p>© 2026 FindLove | For 18+ Only | Made in India 🇮🇳</p>
      </footer>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-pink-500 animate-pulse tracking-wider">FINDLOVE</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Loading your experience...</p>
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

export default App;