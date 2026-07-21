import React, { useState, useRef, useEffect } from 'react';
import { Smile, Image, Send, X, RefreshCcw, Trash2, Camera, PhoneCall, Phone, PhoneOff } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

import VideoCallModal from "../chat/VideoCallModal";

export default function ChatTab({ session, activeChatWith, messages, sendMessage, deleteMessage }) {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user'); 
  const [stream, setStream] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [localMessages, setLocalMessages] = useState([]);
  
  // Call Modal State
  const [isCallOpen, setIsCallOpen] = useState(false);
  // Incoming Call State
  const [incomingCall, setIncomingCall] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (messages) setLocalMessages(messages);
  }, [messages]);

  useEffect(() => { streamRef.current = stream; }, [stream]);

  // 🔴 Supabase Realtime Broadcast Listener for Incoming Calls
  useEffect(() => {
    if (!session?.user?.id) return;

    // Current user id ke naam se broadcast channel ko subscribe karo
    const channel = supabase.channel(`user-calls:${session.user.id}`);

    channel
      .on('broadcast', { event: 'call-signal' }, ({ payload }) => {
        if (payload.type === 'CALL_REQUEST') {
          setIncomingCall(payload.caller);
        } else if (payload.type === 'CALL_ENDED') {
          setIncomingCall(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const openCamera = async (facing = cameraFacing) => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      toast.error("Camera permission denied");
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    if (stream) openCamera(nextFacing);
  };

  const takeSelfie = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (blob) {
        closeCamera();
        await uploadFile(blob, 'image');
      }
    }, 'image/jpeg');
  };

  const uploadFile = async (file, type) => {
    const loadingToast = toast.loading(`Uploading ${type}...`);
    const fileExt = type === 'video' ? 'webm' : (file.name ? file.name.split('.').pop() : 'jpg');
    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
    const bucket = type === 'video' ? 'chat-videos' : 'chat-images';
    
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    toast.dismiss(loadingToast);

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      await handleSendAction(publicUrl, type);
      toast.success(`${type} sent!`);
    } else {
      toast.error(`Failed to upload ${type}: ` + error.message);
    }
  };

  const handleSendAction = async (content, type = 'text') => {
    if (!activeChatWith || !content) return;
    const tempId = 'temp-' + Date.now();
    const tempMsg = { id: tempId, sender_id: session.user.id, receiver_id: activeChatWith.id, content, type, created_at: new Date().toISOString() };
    setLocalMessages(prev => [...prev, tempMsg]);

    try {
      if (sendMessage) await sendMessage(content, type);
      else await supabase.from('messages').insert([{ sender_id: session.user.id, receiver_id: activeChatWith.id, content, type }]);
    } catch (err) {
      setLocalMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadFile(file, 'image');
    e.target.value = '';
  };

  const handleSend = () => {
    if (input.trim() && activeChatWith) {
      handleSendAction(input.trim(), 'text');
      setInput('');
      setShowEmoji(false);
    }
  };

  const handleDeleteMessage = async (msg) => {
    if (!window.confirm("Delete this message?")) return;
    setLocalMessages(prev => prev.filter(m => m.id !== msg.id));
    if (deleteMessage) await deleteMessage(msg.id);
  };

  if (!activeChatWith) return <div className="text-center p-10 text-gray-500">Select a user to start chat</div>;

  return (
    <div className="flex flex-col h-[75vh] bg-gray-50 dark:bg-[#121212] rounded-2xl shadow-lg border-gray-100 dark:border-gray-800 relative">
      
      {/* Header */}
      <div className="p-4 bg-white dark:bg-[#1a1a1a] border-b flex items-center justify-between rounded-t-2xl">
        <div className="flex items-center gap-3">
          <img src={activeChatWith.avatar_url} className="w-10 h-10 rounded-full object-cover border-pink-400" alt="avatar" />
          <div>
            <h3 className="font-bold">{activeChatWith.full_name}</h3>
            <p className="text-xs text-green-500 font-medium">Active now</p>
          </div>
        </div>

        {/* Video/Audio Call Trigger Button */}
        <button 
          onClick={() => setIsCallOpen(true)} 
          className="p-2.5 bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 text-pink-500 rounded-full transition"
          title="Start Call"
        >
          <PhoneCall size={20} />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.map((msg) => {
          const isMe = msg.sender_id === session.user.id;
          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`} onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}>
              <div className={`max-w-[70%] p-3 rounded-2xl relative shadow-md ${isMe ? 'bg-pink-500 text-white' : 'bg-white dark:bg-[#222]'}`}>
                {hoveredMsg === msg.id && <button onClick={() => handleDeleteMessage(msg)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full"><Trash2 size={12} /></button>}
                {msg.type === 'text' && <p className="text-sm break-words">{msg.content}</p>}
                {msg.type === 'image' && <img src={msg.content} className="w-full max-w-[240px] rounded-lg" alt="img" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Camera Live Preview & Selfie Capture */}
      {stream && (
        <div className="relative bg-black flex justify-center items-center">
          <video ref={videoRef} autoPlay playsInline className={`w-full h-44 object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`} />
          <button onClick={switchCamera} className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full"><RefreshCcw size={16}/></button>
          <button onClick={takeSelfie} className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white border-4 border-pink-500 w-12 h-12 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-pink-500"></div>
          </button>
          <button onClick={closeCamera} className="absolute top-2 left-2 bg-white/80 p-1.5 rounded-full"><X size={16}/></button>
        </div>
      )}

      {/* Input Field Area */}
      <div className="p-4 bg-white dark:bg-[#1a1a1a] border-t flex items-center gap-3 rounded-b-2xl">
        <button onClick={() => setShowEmoji(!showEmoji)}><Smile size={22} /></button>
        <label className="cursor-pointer"><Image size={22} /><input type="file" accept="image/*" hidden onChange={handleImageUpload} /></label>
        <button onClick={stream ? closeCamera : () => openCamera()}><Camera size={22} className={stream ? 'text-pink-500' : ''}/></button>

        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 border rounded-full px-4 py-2 text-sm bg-gray-50 dark:bg-gray-800" />
        <button onClick={handleSend}><Send size={22} className="text-pink-500"/></button>

        {showEmoji && <div className="absolute bottom-16 left-4"><EmojiPicker onEmojiClick={(e) => setInput(input + e.emoji)} /></div>}
      </div>

      {/* 📞 INCOMING CALL NOTIFICATION POPUP MODAL */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 text-white p-6 rounded-3xl w-full max-w-sm text-center flex flex-col items-center gap-4 shadow-2xl animate-pulse">
            <img 
            src={incomingCall.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(incomingCall.full_name || 'User')}&background=random`}
              alt="Caller Avatar" 
              className="w-20 h-20 rounded-full object-cover border-4 border-pink-500 shadow-lg" 
            />
            <div>
              <h3 className="text-xl font-bold">{incomingCall.full_name}</h3>
              <p className="text-sm text-pink-400 font-medium mt-1">Incoming Video Call...</p>
            </div>

            <div className="flex gap-4 w-full mt-4">
              {/* Decline Button */}
              <button 
                onClick={() => setIncomingCall(null)} 
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-full font-semibold transition flex items-center justify-center gap-2 shadow-md"
              >
                <PhoneOff size={18} />
                Decline
              </button>

              {/* Accept Button */}
              <button 
                onClick={() => {
                  setIncomingCall(null);
                  setIsCallOpen(true);
                }} 
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 rounded-full font-semibold transition flex items-center justify-center gap-2 shadow-md"
              >
                <Phone size={18} />
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Modal Component */}
      <VideoCallModal 
        isOpen={isCallOpen} 
        onClose={() => setIsCallOpen(false)} 
        activeChatWith={activeChatWith} 
        session={session}
      />

    </div>
  );
}