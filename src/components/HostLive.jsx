import React, { useState, useEffect, useRef } from 'react';
import { LiveKitRoom, ParticipantTile, RoomAudioRenderer, ControlBar, useTracks, GridLayout, useRemoteParticipants } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { supabase } from '../lib/supabase';
import LiveChat from './LiveChat';
import { Radio, PhoneOff, Share2, Check, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

function CustomVideoGrid() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], { onlySubscribed: false });
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100% - 70px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}

// Viewer Count Synchronizer Component
function ViewerCounter({ roomName }) {
  const remoteParticipants = useRemoteParticipants();
  const viewerCount = remoteParticipants.length;

  useEffect(() => {
    const updateCountInDB = async () => {
      await supabase
        .from('live_streams')
        .update({ viewer_count: viewerCount })
        .eq('room_name', roomName);
    };
    updateCountInDB();
  }, [viewerCount, roomName]);

  return (
    <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/10">
      <Users size={16} className="text-red-500" />
      <span className="font-bold text-xs">{viewerCount} Watching</span>
    </div>
  );
}

export default function HostLive({ session, onEnd }) {
  const [token, setToken] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const userId = session?.user?.id;
  const roomName = `room_${userId}`;
  
  // Ref to track live state accurately in unmount hooks
  const isLiveRef = useRef(isLive);
  useEffect(() => {
    isLiveRef.current = isLive;
  }, [isLive]);

  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  // Helper: Clear active user's stream from DB synchronously/async
  const removeStreamFromDB = async () => {
    if (!userId) return;
    try {
      // 1. Mark is_live false first for realtime listeners
      await supabase
        .from('live_streams')
        .update({ is_live: false, viewer_count: 0 })
        .eq('user_id', userId);

      // 2. Delete row completely
      await supabase.from('live_streams').delete().eq('user_id', userId);
      console.log("✅ Stream completely cleared from DB");
    } catch (err) {
      console.error("Failed to clean stream from DB:", err);
    }
  };

  // Helper: Create fresh stream record
  const updateStreamStatusInDB = async () => {
    if (!userId) return;
    const participantName = session?.user?.email?.split('@')[0] || `Host_${userId.substring(0, 5)}`;
    
    // Purana koi bhi zombie stream pehle clear karo
    await removeStreamFromDB();

    const { error } = await supabase.from('live_streams').insert([
      {
        user_id: userId,
        room_name: roomName,
        title: `${participantName}'s Live`,
        is_live: true,
        viewer_count: 0,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) throw new Error("Database update error: " + error.message);
  };

  // Stop Stream Action
  const stopStream = async () => {
    setIsLoading(true);
    setIsLive(false);
    setToken('');
    await removeStreamFromDB();
    setIsLoading(false);
    toast.success("Stream ended");
    if (onEnd) onEnd();
  };

  // Cleanup on Mount & Tab Unload
  useEffect(() => {
    // Page Mount par pehle clean kar lo agar previous crash ki wajah se row reh gayi ho
    if (userId) {
      removeStreamFromDB();
    }

    const handleBeforeUnload = (e) => {
      if (isLiveRef.current && userId) {
        // Keepalive fetch payload to guarantee execution on tab close
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseKey) {
          fetch(`${supabaseUrl}/rest/v1/live_streams?user_id=eq.${userId}`, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            keepalive: true
          });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // React Component Unmount cleanup
      if (isLiveRef.current && userId) {
        removeStreamFromDB();
      }
    };
  }, [userId]);

  const handleShareStream = async () => {
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join My Live Stream',
          text: `Hey! I am live right now. Join my live stream!`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Stream link copied to clipboard!");
    }
  };

  const startStream = async () => {
    if (!userId) return toast.error("Please login first");
    if (!livekitUrl) return toast.error("VITE_LIVEKIT_URL missing in env");

    setIsLoading(true);
    const participantName = session?.user?.email?.split('@')[0] || `Host_${userId.substring(0, 5)}`;

    try {
      // 1. Fetch Token
      const { data, error: fnError } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, participantName, isHost: true },
      });

      if (fnError) throw new Error(fnError.message || "Failed to fetch LiveKit token");

      const tokenReceived = typeof data === 'string' ? data : data?.token;
      if (!tokenReceived) throw new Error("No token returned from server function");

      // 2. Insert into DB
      await updateStreamStatusInDB();

      // 3. UI state updates
      setToken(tokenReceived);
      setIsLive(true);
      toast.success("You are now LIVE!");

    } catch (err) {
      console.error("Start stream failed:", err);
      toast.error(err.message || "Failed to start live stream");
      await removeStreamFromDB();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-80px)] bg-gray-950 text-white p-4 flex flex-col">
      {isLive && token ? (
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={livekitUrl}
          connect={true}
          onDisconnected={stopStream}
          className="flex-1 flex flex-col md:flex-row gap-4 h-full"
        >
          <div className="flex-1 flex flex-col relative bg-black rounded-2xl overflow-hidden border border-white/10">
            <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/10">
                  <Radio size={16} className="text-red-500 animate-pulse" />
                  <span className="font-bold text-xs">LIVE</span>
                </div>

                <ViewerCounter roomName={roomName} />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareStream}
                  className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs transition text-white border border-white/10 shadow-lg"
                  title="Share Stream"
                >
                  {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} className="text-blue-400" />}
                  <span>{copied ? 'Copied!' : 'Share'}</span>
                </button>

                <button 
                  onClick={stopStream} 
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs transition disabled:opacity-50"
                >
                  <PhoneOff size={14} /> End Stream
                </button>
              </div>
            </div>

            <CustomVideoGrid />
            
            <div className="h-[70px] bg-gray-900 border-t border-white/10 flex items-center justify-center">
              <ControlBar controls={{ chat: false, leave: false }} />
            </div>
            
            <RoomAudioRenderer />
          </div>

          <div className="w-full md:w-80 lg:w-96 h-full bg-gray-900 rounded-2xl overflow-hidden border border-white/10 flex flex-col">
            <LiveChat roomName={roomName} currentUser={session?.user} />
          </div>
        </LiveKitRoom>
      ) : (
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="text-gray-400">Ready to go live?</p>
          <button 
            onClick={startStream} 
            disabled={isLoading} 
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition"
          >
            <Radio size={18} className="animate-pulse" />
            {isLoading ? "Connecting..." : "Go Live"}
          </button>
        </div>
      )}
    </div>
  );
}