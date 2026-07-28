import React, { useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantTile,
  useTracks,
  GridLayout,
  useRemoteParticipants
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import LiveChat from './LiveChat';
import { LogOut, Radio, Share2, Check, Users } from 'lucide-react';

// Viewer Count Badge Component for Viewer view
function ViewerCounter() {
  const remoteParticipants = useRemoteParticipants();
  // Total people = Host + Remote Participants (Viewers)
  const totalCount = remoteParticipants.length + 1;

  return (
    <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/10">
      <Users size={16} className="text-red-500" />
      <span className="font-bold text-xs">{totalCount} Watching</span>
    </div>
  );
}

// Custom Video Grid for Viewer
function ViewerVideoGrid() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: true }
  );

  return (
    <div className="flex-1 w-full h-full relative flex items-center justify-center">
      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
          Waiting for host video stream...
        </div>
      ) : (
        <GridLayout tracks={tracks} style={{ height: '100%', width: '100%' }}>
          <ParticipantTile />
        </GridLayout>
      )}
    </div>
  );
}

export default function Viewer({ stream, token, onLeave }) {
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;
  const [copied, setCopied] = useState(false);

  const handleShareStream = async () => {
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Live Stream',
          text: `Hey! Check out this live stream: ${stream?.room_name || 'Live Room'}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!token || !livekitUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-white">
        <p className="text-red-400 font-semibold">Missing LiveKit credentials or token</p>
        <button onClick={onLeave} className="mt-4 bg-gray-800 px-4 py-2 rounded-lg text-white">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-80px)] bg-gray-950 text-white p-4">
      <LiveKitRoom
        video={false} 
        audio={true} 
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        onDisconnected={onLeave}
        className="flex-1 flex flex-col md:flex-row gap-4 h-full"
      >
        {/* Host Stream Video Area */}
        <div className="flex-1 flex flex-col relative bg-black rounded-2xl overflow-hidden border border-white/10">
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/10">
                <Radio size={16} className="text-red-500 animate-pulse" />
                <span className="font-bold text-xs">WATCHING LIVE</span>
              </div>

              {/* Viewer Count Badge */}
              <ViewerCounter />
            </div>

            <div className="flex items-center gap-2">
              {/* Share Stream Button */}
              <button
                onClick={handleShareStream}
                className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs transition text-white border border-white/10 shadow-lg"
                title="Share Stream"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} className="text-blue-400" />}
                <span>{copied ? 'Copied!' : 'Share'}</span>
              </button>

              <button
                onClick={onLeave}
                className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs transition text-red-400 border border-white/10"
              >
                <LogOut size={14} /> Leave Stream
              </button>
            </div>
          </div>

          <ViewerVideoGrid />
          
          <RoomAudioRenderer />
        </div>

        {/* Live Chat Box */}
        <div className="w-full md:w-80 lg:w-96 h-full bg-gray-900 rounded-2xl overflow-hidden border border-white/10 flex flex-col">
          <LiveChat roomName={stream.room_name} />
        </div>
      </LiveKitRoom>
    </div>
  );
}