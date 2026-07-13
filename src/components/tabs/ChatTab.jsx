import React, { useState, useRef, useEffect } from 'react';
import { Smile, Image, Video, Send, X, RefreshCcw, Trash2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export default function ChatTab({
  session,
  activeChatWith,
  messages, 
  sendMessage,
  deleteMessage
}) {
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [stream, setStream] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  
  // Real-time aur instant updates ke liye local state
  const [localMessages, setLocalMessages] = useState([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Parent messages ko hamesha real-time trace karo bina bypass kiye
  useEffect(() => {
    if (messages) {
      setLocalMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Camera Open karne ka function
  const openCamera = async (facing = cameraFacing) => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: true // Chat ke dauran dono taraf se aawaz aur video ke liye
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      return mediaStream;
    } catch (err) {
      toast.error("Camera permission denied");
      console.error(err);
      return null;
    }
  };

  // Camera Close karne ka function
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

  const handleSendAction = async (content, type = 'text') => {
    if (!activeChatWith || !content) return;

    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      sender_id: session.user.id,
      receiver_id: activeChatWith.id,
      content: content,
      type: type,
      created_at: new Date().toISOString()
    };

    setLocalMessages(prev => [...prev, tempMsg]);

    try {
      if (sendMessage) {
        await sendMessage(content, type);
      } else {
        await supabase.from('messages').insert([{
          sender_id: session.user.id,
          receiver_id: activeChatWith.id,
          content: content,
          type: type
        }]);
      }
    } catch (err) {
      console.error("Message send error:", err);
      setLocalMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const loadingToast = toast.loading("Uploading image...");
    const fileName = `${session.user.id}/${Date.now()}_${file.name}`;
    
    const { error } = await supabase.storage.from('chat-images').upload(fileName, file, { contentType: file.type });
    toast.dismiss(loadingToast);

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(fileName);
      await handleSendAction(publicUrl, 'image');
      toast.success("Image sent!");
    } else {
      toast.error("Failed to upload image: " + error.message);
    }
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

    const targetUrl = msg.content || msg.text || msg.message;

    if ((msg.type === 'image' || msg.type === 'video') && targetUrl) {
      try {
        if (targetUrl.startsWith('http')) {
          const bucket = msg.type === 'image' ? 'chat-images' : 'chat-videos';
          const urlObj = new URL(targetUrl);
          const path = urlObj.pathname.split(`/${bucket}/`)[1]; 
          if (path) {
            await supabase.storage.from(bucket).remove([path]);
          }
        }
      } catch (urlErr) {
        console.error("Storage cleanup pass:", urlErr);
      }
    }

    if (deleteMessage) {
      await deleteMessage(msg.id);
      toast.success("Message deleted");
    } else {
      try {
        const { error } = await supabase.from('messages').delete().eq('id', msg.id);
        if (!error) {
          toast.success("Message deleted");
        } else {
          toast.error("Database deletion error: " + error.message);
        }
      } catch (dbErr) {
        toast.error("Failed to execute delete");
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  if (!activeChatWith) return <div className="text-center p-10 text-gray-500">Select a user to start chat</div>;

  return (
    <div className="flex flex-col h-[75vh] bg-gray-50 dark:bg-[#121212] rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
      
      {/* Header */}
      <div className="p-4 bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 rounded-t-2xl">
        <img src={activeChatWith.avatar_url} className="w-10 h-10 rounded-full object-cover border border-pink-400" alt="avatar" />
        <div>
          <h3 className="font-bold text-gray-800 dark:text-gray-100">{activeChatWith.full_name}</h3>
          <p className="text-xs text-green-500 font-medium">Active now</p>
        </div>
      </div>

      {/* Chat Message View Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#141414]">
        {localMessages.map((msg) => {
          const isMe = msg.sender_id === session.user.id;
          const displayContent = msg.content || msg.text || msg.message;
          const msgType = msg.type || 'text';

          return (
            <div
              key={msg.id}
              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              onMouseEnter={() => setHoveredMsg(msg.id)}
              onMouseLeave={() => setHoveredMsg(null)}
            >
              <div className={`max-w-[70%] p-3 rounded-2xl relative shadow-md group transition-all duration-200 ${
                isMe 
                  ? 'bg-pink-500 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-[#222] text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-100 dark:border-gray-800'
              }`}>

                {/* Trash Delete Button */}
                {hoveredMsg === msg.id && (
                  <button
                    onClick={() => handleDeleteMessage(msg)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 z-10 shadow-md transform scale-110 transition active:scale-95"
                  >
                    <Trash2 size={12} />
                  </button>
                )}

                {/* TEXT RENDERING */}
                {msgType === 'text' && displayContent && (
                  <p className="text-sm font-normal leading-relaxed break-words whitespace-pre-wrap">{displayContent}</p>
                )}

                {/* IMAGE RENDERING */}
                {msgType === 'image' && displayContent && (
                  <div className="rounded-lg overflow-hidden max-w-[240px]">
                    <img src={displayContent} className="w-full h-auto object-cover" alt="Shared attachment" />
                  </div>
                )}

                {/*旧 VIDEO DATA RENDERING */}
                {msgType === 'video' && displayContent && (
                  <div className="rounded-lg overflow-hidden max-w-[280px] bg-black">
                    <video src={displayContent} controls className="w-full h-auto" playsInline>
                      Your browser does not support video.
                    </video>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Camera Live Preview Panel */}
      {stream && (
        <div className="relative bg-black border-t border-gray-200 dark:border-gray-800">
          <video ref={videoRef} autoPlay playsInline className="w-full h-44 object-cover" />
          <button onClick={switchCamera} className="absolute top-2 right-2 bg-white/80 backdrop-blur p-1.5 rounded-full text-gray-700 hover:bg-white"><RefreshCcw size={16}/></button>
          <button onClick={closeCamera} className="absolute top-2 left-2 bg-white/80 backdrop-blur p-1.5 rounded-full text-gray-700 hover:bg-white"><X size={16}/></button>
        </div>
      )}

      {/* Action Input Field Controls */}
      <div className="p-4 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800 flex items-center gap-3 relative rounded-b-2xl">
        <button type="button" className="text-gray-500 hover:text-pink-500 transition" onClick={() => setShowEmoji(!showEmoji)}><Smile size={22} /></button>
        
        <label className="cursor-pointer text-gray-500 hover:text-pink-500 transition">
          <Image size={22} />
          <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
        </label>
        
        {/* FIXED: Ab yeh Video Icon hai jo click karne par dono side camera open karega */}
        <button 
          type="button" 
          className={`transition ${stream ? 'text-pink-500 animate-pulse' : 'text-gray-500 hover:text-pink-500'}`} 
          onClick={stream ? closeCamera : () => openCamera()}
        >
          <Video size={22} />
        </button>

        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
          placeholder="Type a message..." 
          className="flex-1 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100" 
        />
        <button type="button" className="text-pink-500 hover:scale-110 transition active:scale-95" onClick={handleSend}><Send size={22} /></button>

        {showEmoji && <div className="absolute bottom-16 left-4 z-50 shadow-2xl rounded-xl overflow-hidden"><EmojiPicker onEmojiClick={(e) => setInput(input + e.emoji)} theme="light" /></div>}
      </div>
    </div>
  );
}