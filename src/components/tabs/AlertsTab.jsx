import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bell, Eye } from 'lucide-react';

export default function AlertsTab({ session }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Database se puraane alerts fetch karne ka function
  const fetchAlerts = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    if (!session?.user?.id) return;

    // 🔥 2. REALTIME SUBSCRIPTION (Sabse important part)
    // Yeh database me 'alerts' table par nazar rakhega, jaise hi naya row aayega UI update kar dega
    const channel = supabase
      .channel('realtime-alerts-room')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `user_id=eq.${session.user.id}`, // Sirf isi logged-in user ke alerts pakdega
        },
        (payload) => {
          console.log('New real-time alert received:', payload.new);
          // Naye alert ko real-time me list me sabse upar daal do
          setAlerts((prevAlerts) => [payload.new, ...prevAlerts]);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  if (loading) {
    return <p className="text-center text-gray-400 font-bold animate-pulse py-10">🔄 Loading alerts...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-900">
      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-900 pb-4 mb-4">
        <Bell className="text-pink-500" size={22} />
        <h2 className="text-xl font-black text-gray-900 dark:text-white">Activity Alerts</h2>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-400">
            <Eye size={32} />
          </div>
          <p className="font-black text-gray-700 dark:text-gray-300">No one has viewed your profile yet.</p>
          <p className="text-xs text-gray-400 max-w-xs">Keep updating your profile to get discovered!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className="flex items-start gap-3 p-4 bg-pink-50/50 dark:bg-pink-950/10 border border-pink-100/50 dark:border-pink-900/30 rounded-2xl transition hover:bg-pink-50 dark:hover:bg-pink-950/20"
            >
              <div className="p-2 bg-gradient-to-tr from-pink-500 to-rose-500 text-white rounded-xl text-xs shrink-0 font-bold">
                👁️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white">{alert.title}</p>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mt-0.5">{alert.message}</p>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}