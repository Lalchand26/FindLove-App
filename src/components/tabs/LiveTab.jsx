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
        console.error("Error fetching streams:", error.message);
        setStreams([]);
      } else {
        // Double filter: sirf unhi rooms ko rakho jo sach me active hain
        const activeOnly = (data || []).filter((s) => Boolean(s.is_live));
        setStreams(activeOnly);

        // Direct URL Check (only once on load)
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
  }, [activeStream, isHosting]);

  // Function to join a stream programmatically
  const handleJoinByRoomName = useCallback(async (roomName) => {
    try {
      // 1. Find active stream from DB
      const { data: streamData, error: streamError } = await supabase
        .from('live_streams')
        .select('*')
        .eq('room_name', roomName)
        .eq('is_live', true)
        .maybeSingle();

      if (streamError || !streamData) {
        toast.error("Stream ends or is no longer active.");
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchActiveStreams();
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

      if (error) {
        toast.error("Host is currently offline");
        // DB cleanup trigger for dead room
        await supabase
          .from('live_streams')
          .delete()
          .eq('room_name', roomName);

        fetchActiveStreams();
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const token = typeof data === 'string' ? data : data?.token;
      if (!token) throw new Error("Token missing from backend server");

      setActiveStream(streamData);
      setViewerToken(token);
    } catch (err) {
      toast.error("Failed to join live stream.");
      console.error(err);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [session, fetchActiveStreams]);

  useEffect(() => {
    fetchActiveStreams();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('live_streams_realtime')
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
    const newUrl = `${window.location.pathname}?room=${stream.room_name}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    await handleJoinByRoomName(stream.room_name);
  };

  // 1. Host Mode
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

  // 2. Viewer Mode
  if (activeStream && viewerToken) {
    return (
      <Viewer
        stream={activeStream}
        token={viewerToken}
        onLeave={() => {
          setActiveStream(null);
          setViewerToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchActiveStreams();
        }}
      />
    );
  }

  // 3. Main Stream Listing
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

      {/* Streams UI List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <RefreshCw className="animate-spin mb-2" size={24} />
          <p>Checking active streams...</p>
        </div>
      ) : streams && streams.length > 0 ? (
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
        /* Empty State - Jab koi live nahi ho tab strictly yehi screen dikhegi */
        <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 bg-gray-900/40 rounded-3xl border border-dashed border-white/10 p-6">
          <WifiOff size={48} className="mb-4 text-gray-600" />
          <h3 className="text-xl font-bold text-gray-300">No one is Live right now</h3>
          <p className="text-sm mt-1 text-gray-500">Be the first to start a stream!</p>
        </div>
      )}
    </div>
  );
}