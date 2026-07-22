import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, RefreshCcw } from 'lucide-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { supabase } from '../../lib/supabase';

export default function VideoCallModal({ isOpen, onClose, activeChatWith, session }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [isConnecting, setIsConnecting] = useState(true);

  // Video Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const roomRef = useRef(null);
  const attachedAudioElements = useRef([]);

  useEffect(() => {
    if (isOpen && activeChatWith?.id && session?.user) {
      initCall();
    } else {
      leaveCall();
    }

    return () => {
      leaveCall();
    };
  }, [isOpen, activeChatWith?.id]);

  const attachTrack = (track) => {
    if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
      track.attach(remoteVideoRef.current);
    }
    if (track.kind === Track.Kind.Audio) {
      const el = track.attach();
      document.body.appendChild(el);
      attachedAudioElements.current.push(el);
    }
  };

  const initCall = async () => {
    setIsConnecting(true);
    try {
      // 1. Signal Notification
      sendCallSignal('CALL_REQUEST');

      // 2. Room ID (Exact same for both users)
      const roomId = [session.user.id, activeChatWith.id].sort().join('_');
      const username = session.user.id;

      // 3. Supabase Token Fetch
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          room: roomId,
          username,
        },
      });

      if (error) {
        console.error('Supabase Function Error:', error);
        setIsConnecting(false);
        return;
      }

      if (!data?.token) {
        console.error('Token not received in response:', data);
        setIsConnecting(false);
        return;
      }

      // 4. Resolve LiveKit URL with Fallback
      const livekitUrl = data?.livekitUrl || import.meta.env.VITE_LIVEKIT_URL;
      if (!livekitUrl) {
        console.error('LiveKit WebSocket URL is missing!');
        setIsConnecting(false);
        return;
      }

      // 5. Room instance
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      // Listeners connect hone se PEHLE attach karein
      room.on(RoomEvent.TrackSubscribed, (track) => {
        attachTrack(track);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      // Connect to LiveKit Room
      await room.connect(livekitUrl, data.token);

      // Enable Camera and Microphone with Permission Fallback
      try {
        await room.localParticipant.enableCameraAndMicrophone();
      } catch (mediaErr) {
        console.error("Camera or Microphone permission denied:", mediaErr);
      }

      // Attach Local Video
      const localTrackPub = Array.from(room.localParticipant.videoTrackPublications.values())[0];
      if (localTrackPub?.track && localVideoRef.current) {
        localTrackPub.track.attach(localVideoRef.current);
      }

      // Sync existing remote participants
      room.remoteParticipants.forEach((participant) => {
        participant.trackPublications.forEach((publication) => {
          if (publication.track && publication.isSubscribed) {
            attachTrack(publication.track);
          }
        });
      });

      setIsConnecting(false);
    } catch (err) {
      console.error('Call initialization failed:', err);
      setIsConnecting(false);
    }
  };

  const leaveCall = () => {
    // Audio elements cleanup from DOM
    attachedAudioElements.current.forEach((el) => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    attachedAudioElements.current = [];

    if (roomRef.current) {
      // Local Tracks Stop (Hardware Camera & Mic release)
      roomRef.current.localParticipant?.videoTrackPublications.forEach((pub) => {
        pub.track?.stop();
      });
      roomRef.current.localParticipant?.audioTrackPublications.forEach((pub) => {
        pub.track?.stop();
      });

      roomRef.current.disconnect();
      roomRef.current = null;
    }
  };

  const sendCallSignal = (type) => {
    if (!activeChatWith?.id || !session?.user) return;

    const channelName = `user-calls:${activeChatWith.id}`;
    const channel = supabase.channel(channelName);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call-signal',
          payload: {
            type,
            caller: {
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || 'Someone',
              avatar_url: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.user_metadata?.full_name || 'User')}&background=random`
            }
          }
        }).then(() => {
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        });
      }
    });
  };

  const switchCamera = async () => {
    if (roomRef.current?.localParticipant) {
      try {
        const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
        await roomRef.current.localParticipant.switchCamera(nextFacing);
        setCameraFacing(nextFacing);
      } catch (err) {
        console.error("Failed to switch camera:", err);
      }
    }
  };

  const toggleMute = async () => {
    if (roomRef.current) {
      const enabled = roomRef.current.localParticipant.isMicrophoneEnabled;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!enabled);
      setIsMuted(enabled);
    }
  };

  const toggleVideo = async () => {
    if (roomRef.current) {
      const enabled = roomRef.current.localParticipant.isCameraEnabled;
      await roomRef.current.localParticipant.setCameraEnabled(!enabled);
      setIsVideoOff(enabled);
    }
  };

  const handleEndCall = () => {
    sendCallSignal('CALL_ENDED');
    leaveCall();
    onClose();
  };

  if (!isOpen) return null;

  const userAvatar = activeChatWith?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatWith?.full_name || 'User')}&background=random`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col items-center">
        
        {/* Header Details */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-white bg-black/40 p-3 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img 
              src={userAvatar} 
              alt="avatar" 
              className="w-10 h-10 rounded-full object-cover border-2 border-pink-500" 
            />
            <div>
              <h4 className="font-semibold text-sm">{activeChatWith?.full_name}</h4>
              <p className="text-xs text-green-400 font-medium">{isConnecting ? 'Connecting...' : 'Connected'}</p>
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

        {/* Main Video Screen (Remote User Video) */}
        <div className="w-full h-[450px] bg-gray-950 relative flex items-center justify-center overflow-hidden">
          {/* Remote Video */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />

          {/* Local PiP Video */}
          <div className="absolute bottom-4 right-4 w-28 h-40 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
            {isVideoOff ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-xs text-gray-400">
                Off
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