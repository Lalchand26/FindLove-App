import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Toaster } from 'react-hot-toast';
import { useChatRealtime } from './components/tabs/useChatRealtime';

// Pages & Components
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
  const [currentChatUser, setCurrentChatUser] = useState(null);
  const { messages, sendMessage, startRecording, stopRecording, isRecording } = useChatRealtime(session, currentChatUser);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/reset-password');
      if (event === 'SIGNED_IN' && window.location.pathname === '/login') {
        const isAdminUser = currentSession?.user?.email === 'lalchandpahan88@gmail.com';
        navigate(isAdminUser ? '/admin' : '/dashboard');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300 flex flex-col">
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home session={session} />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/support" element={<Support />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/login" element={!session ? <Login /> : isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />} />
          <Route path="/signup" element={!session ? <Signup /> : <Navigate to="/dashboard" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile-setup" element={session ? <ProfileSetup session={session} /> : <Navigate to="/login" replace />} />
          
          <Route path="/dashboard" element={session ?
            <Dashboard
              session={session}
              setCurrentChatUser={setCurrentChatUser}
              messages={messages}
              sendMessage={sendMessage}
              startRecording={startRecording}
              stopRecording={stopRecording}
              isRecording={isRecording}
            /> : <Navigate to="/login" replace />} 
          />

          <Route path="/admin" element={session && isAdmin ? <AdminDashboard /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} replace />} />
        </Routes>
      </div>
      {/* Footer code same as before... */}
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
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <Router>
      <Toaster position="top-center" />
      <AppRoutes session={session} />
    </Router>
  );
}