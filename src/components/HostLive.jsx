import React, { useState, useEffect } from 'react';
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

// Viewer Count Synchronizer Component inside LiveKitRoom context
function ViewerCounter({ roomName }) {
  const remoteParticipants = useRemoteParticipants();
  const viewerCount = remoteParticipants.length;

  useEffect(() => {
    // Update viewer count in Supabase whenever it changes
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
  
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const userId = session?.user?.id;
  const roomName = `room_${userId}`;

  // Helper: Update stream in DB
  const updateStreamStatusInDB = async (status) => {
    if (!userId) return;
    try {
      const participantName = session?.user?.email?.split('@')[0] || `Host_${userId.substring(0, 5)}`;
      
      // First delete existing session for this user to avoid conflict
      await supabase.from('live_streams').delete().eq('user_id', userId);

      if (status) {
        // Insert fresh live stream record
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
        if (error) console.error("Error inserting live_stream:", error.message);
      }
    } catch (err) {
      console.error("Error updating stream status:", err);
    }
  };

  const stopStream = async () => {
    await updateStreamStatusInDB(false);
    setIsLive(false);
    setToken('');
    toast.success("Stream ended");
    if (onEnd) onEnd();
  };

  // Handle Share Stream
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

  // Cleanup when component unmounts or page is refreshed/closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLive && userId) {
        supabase.from('live_streams').delete().eq('user_id', userId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (isLive && userId) {
        supabase.from('live_streams').delete().eq('user_id', userId);
      }
    };
  }, [isLive, userId]);

  const startStream = async () => {
    if (!userId) return toast.error("Please login first");
    if (!livekitUrl) return toast.error("VITE_LIVEKIT_URL missing in env");

    setIsLoading(true);
    const participantName = session?.user?.email?.split('@')[0] || `Host_${userId.substring(0, 5)}`;

    try {
      // 1. Fetch LiveKit Token from Supabase Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, participantName, isHost: true },
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to fetch LiveKit token");
      }

      const tokenReceived = typeof data === 'string' ? data : data?.token;
      if (!tokenReceived) {
        throw new Error("No token returned from server function");
      }

      // 2. Insert/Update Database Record
      await updateStreamStatusInDB(true);

      // 3. Update UI State
      setToken(tokenReceived);
      setIsLive(true);
      toast.success("You are now LIVE!");

    } catch (err) {
      console.error("Start stream failed:", err);
      toast.error(err.message || "Failed to start live stream");
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

                {/* Real-time Viewer Counter Component */}
                <ViewerCounter roomName={roomName} />
              </div>

              <div className="flex items-center gap-2">
                {/* Share Button for Host */}
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
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs transition"
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