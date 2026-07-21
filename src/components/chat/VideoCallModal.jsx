import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, RefreshCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function VideoCallModal({ isOpen, onClose, activeChatWith, session }) {
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');

  const localVideoRef = useRef(null);

  useEffect(() => {
    if (isOpen && activeChatWith?.id) {
      startCamera(cameraFacing);
      sendCallSignal('CALL_REQUEST');
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen]);

  // Send Signaling Message via Supabase Realtime
// Send Signaling Message via Supabase Realtime with proper cleanup
  const sendCallSignal = (type) => {
    if (!activeChatWith?.id || !session?.user) return;

    // Unique channel instance for sending signal
    const channelName = `user-calls:${activeChatWith.id}`;
    const channel = supabase.channel(channelName);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call-signal',
          payload: {
            type, // 'CALL_REQUEST' or 'CALL_ENDED'
            caller: {
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || 'Someone',
              avatar_url: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.user_metadata?.full_name || 'User')}&background=random`
            }
          }
        }).then(() => {
          // Signal send hone ke baad channel clean/remove kar do taaki agli call me issue na aaye
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        });
      }
    });
  };

  const startCamera = async (facing) => {
    try {
      if (stream) stopCamera();

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: true,
      });

      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleEndCall = () => {
    sendCallSignal('CALL_ENDED');
    onClose();
  };

  if (!isOpen) return null;

  // Safe Avatar URL Generator
  const userAvatar = activeChatWith?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatWith?.full_name || 'User')}&background=random`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col items-center">
        
        {/* Header Details */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between text-white bg-black/40 p-3 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img 
              src={userAvatar} 
              alt="avatar" 
              className="w-10 h-10 rounded-full object-cover border-2 border-pink-500" 
            />
            <div>
              <h4 className="font-semibold text-sm">{activeChatWith?.full_name}</h4>
              <p className="text-xs text-green-400 font-medium">Ringing...</p>
            </div>
          </div>

          <button 
            onClick={switchCamera}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition text-white"
            title="Switch Camera"
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        {/* Video Area */}
        <div className="w-full h-[450px] bg-gray-950 relative flex items-center justify-center overflow-hidden">
          {isVideoOff ? (
            <div className="flex flex-col items-center gap-2">
              <img 
                src={userAvatar} 
                alt="avatar" 
                className="w-24 h-24 rounded-full object-cover border-4 border-pink-500 animate-pulse" 
              />
              <p className="text-gray-400 text-sm">Camera Turned Off</p>
            </div>
          ) : (
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted
              className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`} 
            />
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-gray-900 w-full flex items-center justify-center gap-6">
          <button 
            onClick={toggleMute}
            className={`p-4 rounded-full text-white transition ${isMuted ? 'bg-red-500' : 'bg-gray-700'}`}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button 
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition shadow-lg transform active:scale-95"
            title="End Call"
          >
            <PhoneOff size={26} />
          </button>

          <button 
            onClick={toggleVideo}
            className={`p-4 rounded-full text-white transition ${isVideoOff ? 'bg-red-500' : 'bg-gray-700'}`}
          >
            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        </div>

      </div>
    </div>
  );
}