import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "../../lib/supabase";
import Viewer from "../Viewer";
import HostLive from "../HostLive";
import { Radio, RefreshCw, PlusCircle, WifiOff } from "lucide-react";
import { toast } from "react-hot-toast";

export default function LiveTab({ session }) {
  const [streams, setStreams] = useState([]);
  const [activeStream, setActiveStream] = useState(null);
  const [viewerToken, setViewerToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isHosting, setIsHosting] = useState(false);
  const hasCheckedUrlRoom = useRef(false);

  // Function to join a stream programmatically
  const handleJoinByRoomName = useCallback(async (roomName) => {
    try {
      // 1. Find stream details from DB using room_name
      const { data: streamData, error: streamError } = await supabase
        .from('live_streams')
        .select('*')
        .eq('room_name', roomName)
        .eq('is_live', true)
        .single();

      if (streamError || !streamData) {
        toast.error("Stream is not active or doesn't exist.");
        // Clear query param from URL if stream is dead
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const participantName =
        session?.user?.email?.split('@')[0] || `Viewer_${Math.floor(Math.random() * 1000)}`;

      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName: streamData.room_name,
          participantName,
          isHost: false,
        },
      });

      if (error) throw error;

      const token = typeof data === 'string' ? data : data?.token;
      if (!token) {
        throw new Error("Token not received from server");
      }

      setActiveStream(streamData);
      setViewerToken(token);
    } catch (err) {
      toast.error("Failed to join shared stream: " + (err.message || "Unknown error"));
      console.error(err);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [session]);

  // Fetch only active streams (is_live === true)
  const fetchActiveStreams = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('is_live', true)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Error fetching streams: " + error.message);
        setStreams([]);
      } else {
        const activeOnly = (data || []).filter((s) => s.is_live === true);
        setStreams(activeOnly);

        // Check if URL has a room query param for direct sharing join (only once per mount)
        if (!hasCheckedUrlRoom.current && !activeStream && !isHosting) {
          hasCheckedUrlRoom.current = true;
          const params = new URLSearchParams(window.location.search);
          const sharedRoom = params.get('room');
          if (sharedRoom) {
            handleJoinByRoomName(sharedRoom);
          }
        }
      }
    } catch (err) {
      console.error("Fetch active streams error:", err);
      setStreams([]);
    } finally {
      setLoading(false);
    }
  }, [activeStream, isHosting, handleJoinByRoomName]);

  useEffect(() => {
    fetchActiveStreams();

    // Supabase Realtime Listener for Live Stream Table Changes
    const channel = supabase
      .channel('live_streams_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_streams' },
        () => {
          fetchActiveStreams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveStreams]);

  const handleJoin = async (stream) => {
    // Append room query parameter to URL for shareability
    const newUrl = `${window.location.pathname}?room=${stream.room_name}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    await handleJoinByRoomName(stream.room_name);
  };

  // 1. Host View Mode
  if (isHosting) {
    return (
      <HostLive
        session={session}
        onEnd={() => {
          setIsHosting(false);
          fetchActiveStreams();
        }}
      />
    );
  }

  // 2. Viewer View Mode
  if (activeStream && viewerToken) {
    return (
      <Viewer
        stream={activeStream}
        token={viewerToken}
        onLeave={() => {
          setActiveStream(null);
          setViewerToken(null);
          // Remove query param from URL on leave
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchActiveStreams();
        }}
      />
    );
  }

  // 3. Main Stream Cards Listing
  return (
    <div className="w-full p-4 bg-gray-950 min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Radio className="text-red-500 animate-pulse" /> Live
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsHosting(true)}
            className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-lg text-white font-bold hover:bg-red-700 transition"
          >
            <PlusCircle size={18} /> Go Live
          </button>
          <button
            onClick={fetchActiveStreams}
            className="p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition"
            title="Refresh Streams"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Stream Cards Grid */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">Checking active streams...</p>
      ) : streams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="bg-gray-900 rounded-2xl p-4 text-white border border-white/10 flex flex-col justify-between gap-3 shadow-lg"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-white truncate max-w-[200px]">
                    {stream.title || "Untitled Live"}
                  </h3>
                  <span className="bg-red-600/20 text-red-400 border border-red-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    LIVE
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {stream.viewer_count || 0} watching
                </p>
              </div>

              <button
                onClick={() => handleJoin(stream)}
                className="w-full bg-red-600 py-2.5 rounded-xl font-bold hover:bg-red-700 transition text-white shadow-md hover:shadow-red-600/20"
              >
                Join Stream
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
          <WifiOff size={48} className="mb-4 text-gray-600" />
          <h3 className="text-xl font-bold text-gray-300">No one is Live right now</h3>
          <p className="text-sm mt-1 text-gray-500">Be the first to start a stream!</p>
        </div>
      )}
    </div>
  );
}