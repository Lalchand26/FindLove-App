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
    let isMounted = true;

    if (isOpen && activeChatWith?.id && session?.user) {
      if (isMounted) initCall();
    } else {
      leaveCall();
    }

    return () => {
      isMounted = false;
      leaveCall();
    };
  }, [isOpen, activeChatWith?.id]);

  const attachTrack = (track) => {
    if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
      track.attach(remoteVideoRef.current);
      remoteVideoRef.current.style.transform = 'translateZ(0)';
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
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }

      sendCallSignal('CALL_REQUEST');

      const roomId = [session.user.id, activeChatWith.id].sort().join('_');
      const username = session.user.id;

      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName: roomId,
          participantName: username,
          canPublish: true,
        },
      });

      if (error || !data?.token) {
        console.error('Token error:', error || data);
        setIsConnecting(false);
        return;
      }

      const livekitUrl = data?.livekitUrl || import.meta.env.VITE_LIVEKIT_URL;
      if (!livekitUrl) {
        console.error('LiveKit URL missing');
        setIsConnecting(false);
        return;
      }

      // वीडियो स्ट्रीम को बेहतर बनाने के लिए कॉन्फ़िगरेशन
      const room = new Room({
        adaptiveStream: true, // स्ट्रीम क्वालिटी को स्वचालित रूप से समायोजित करें
        dynacast: true,        // मल्टी-पार्टी / 1-ऑन-1 के लिए बैंडविड्थ अनुकूलन
        videoCaptureDefaults: {
          resolution: { width: 320, height: 240, frameRate: 15 } // रिज़ॉल्यूशन और फ्रेम रेट सीमित
        },
        publishDefaults: {
          simulcast: true,
          videoEncoding: {
            maxBitrate: 500_000, // बैंडविड्थ सीमा
            maxFramerate: 15,
          },
        },
        reconnectPolicy: {
          nextRetryDelayInMs: (retryCount) => Math.min(retryCount * 1000, 4000),
        },
      });

      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        attachTrack(track);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        // यदि आवश्यक हो तो स्पीकर्स का हाइलाइटिंग या अन्य व्यवहार
      });

      await room.connect(livekitUrl, data.token, {
        autoSubscribe: true,
      });

      // स्थानीय कैमरा और माइक्रोफ़ोन सक्षम करें
      try {
        await room.localParticipant.enableCameraAndMicrophone();
      } catch (mediaErr) {
        console.warn("Auto-enable failed, trying individual toggles:", mediaErr);
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);
      }

      const localTrackPub = Array.from(room.localParticipant.videoTrackPublications.values())[0];
      if (localTrackPub?.track && localVideoRef.current) {
        localTrackPub.track.attach(localVideoRef.current);
      }

      // यदि पहले से ही रिमोट पार्टिसिपेंट्स हैं, तो उनका ट्रैक भी अटैच करें
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
    attachedAudioElements.current.forEach((el) => {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    attachedAudioElements.current = [];

    if (roomRef.current) {
      try {
        roomRef.current.localParticipant?.videoTrackPublications.forEach((pub) => {
          pub.track?.stop();
        });
        roomRef.current.localParticipant?.audioTrackPublications.forEach((pub) => {
          pub.track?.stop();
        });
        roomRef.current.disconnect();
      } catch (e) {
        console.error("Disconnect cleanup error:", e);
      }
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
        console.error("Switch camera failed:", err);
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
      <div className="relative w-full max-w-4xl h-[85vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-white bg-black/50 px-4 py-3 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img src={userAvatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-pink-500" />
            <div>
              <h4 className="font-semibold text-sm">{activeChatWith?.full_name}</h4>
              <p className="text-xs text-green-400 font-medium">{isConnecting ? 'Connecting...' : 'Connected'}</p>
            </div>
          </div>
          <button onClick={switchCamera} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition text-white" title="Switch Camera">
            <RefreshCcw size={18} />
          </button>
        </div>

        {/* Main Video Area */}
        <div className="flex-1 w-full bg-gray-950 relative flex items-center justify-center overflow-hidden">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover transform-gpu" />

          {/* Local Video Thumbnail */}
          <div className="absolute bottom-6 right-6 w-48 h-36 md:w-60 md:h-44 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-10">
            {isVideoOff ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-sm text-gray-400">
                Camera Off
              </div>
            ) : (
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted
                className={`w-full h-full object-cover transform-gpu ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`} 
              />
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-900 w-full flex items-center justify-center gap-6 border-t border-gray-800">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full text-white transition ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
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
            className={`p-4 rounded-full text-white transition ${isVideoOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        </div>
      </div>
    </div>
  );
}