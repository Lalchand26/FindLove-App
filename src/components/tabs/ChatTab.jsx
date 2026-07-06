import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import VideoCallOverlay from './VideoCallOverlay'; // Iska naam same rehne do, andar audio hoga
import { ArrowLeft, MessageSquare, Phone } from 'lucide-react'; // Video hata diya
import { useChatRealtime } from './useChatRealtime';

export default function ChatTab({ session, activeChatWith, setSelectedChatUser }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentChatUser, setCurrentChatUser] = useState(activeChatWith || null);
  const [isCalling, setIsCalling] = useState(false); // 👈 naam change
  const [callData, setCallData] = useState(null);
  const messagesEndRef = useRef(null);

  const {
    messages,
    loadingMessages,
    sendMessage,
    initiateCall,
    respondToCall,
    endCall, // 👈 add
    incomingCall,
    isCalling: isCallingFromHook // 👈 hook se bhi le lo
  } = useChatRealtime(session, currentChatUser);

  useEffect(() => {
    if (activeChatWith) {
      setCurrentChatUser(activeChatWith);
    }
  }, [activeChatWith]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hook ke isCalling ko local state se sync karo
  useEffect(() => {
    setIsCalling(isCallingFromHook);
  }, [isCallingFromHook]);

  // 👇 Incoming call handle
  useEffect(() => {
    if (incomingCall &&!isCalling && incomingCall.status === 'ringing') {
      console.log("📞 Incoming call received:", incomingCall);
      setCallData({
        channelName: incomingCall.channel_name,
        isIncoming: true,
        callId: incomingCall.id,
        incomingCallData: incomingCall
      });
      setIsCalling(true);

      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
      new Notification(`${incomingCall.from_name} is calling...`);
    }

    // Agar call dusri taraf se cut hui to
    if (incomingCall?.status === 'ended' || incomingCall?.status === 'rejected') {
      setIsCalling(false);
      setCallData(null);
    }
  }, [incomingCall, isCalling]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const { data: likes } = await supabase
       .from('likes')
       .select('liked_id')
       .eq('liker_id', session.user.id)
       .eq('action_type', 'like');
      if (!likes || likes.length === 0) {
        setUsers([]);
        return;
      }
      const likedUserIds = likes.map(l => l.liked_id);
      const { data: profiles } = await supabase
       .from('profiles')
       .select('*')
       .in('id', likedUserIds);
      setUsers(profiles || []);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [session.user.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSendMessage = async (content, type = 'text') => {
    if (!currentChatUser ||!content) return;
    await sendMessage({ content: content.trim(), type });
  };

  // 👇 Outgoing Call Handler - Sirf Audio
  const handleStartCall = async () => {
    console.log(">>> Starting outgoing call: audio");
    const data = await initiateCall(currentChatUser.id); // 👈 sirf 1 param

    if (data) {
      setCallData({
        channelName: data.channel_name,
        isIncoming: false,
        callId: data.id
      });
      setIsCalling(true);
    }
  };

  const handleEndCall = async () => { // 👈 naam change
    console.log(">>> Closing call <<<");
    await endCall(); // 👈 hook wala use karo
    setIsCalling(false);
    setCallData(null);
  };

  if (!currentChatUser) {
    return (
      <div className="h-[calc(100vh-180px)] bg-white rounded-2xl shadow-sm border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-rose-600" />
            <h2 className="text-lg font-bold text-rose-900">Messages</h2>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100%-65px)] p-4">
          {loadingUsers? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : users.length === 0? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="text-7xl mb-4">💕</div>
              <p className="text-rose-900 font-bold text-lg">No matches yet</p>
              <p className="text-sm text-rose-700/70 mt-2">Like profiles in Discover to start chatting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    setCurrentChatUser(user);
                    setSelectedChatUser?.(user);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50 cursor-pointer active:scale-98 transition"
                >
                  {user.avatar_url? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-14 h-14 rounded-full object-cover border-2 border-pink-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-xl">
                      {user.full_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-rose-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500">Tap to start chatting</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-2xl shadow-sm border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-rose-100 bg-white/80 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setCurrentChatUser(null);
              setSelectedChatUser?.(null);
            }}
            className="p-2 rounded-lg hover:bg-rose-100 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-rose-600" />
          </button>
          {currentChatUser.avatar_url? (
            <img src={currentChatUser.avatar_url} alt={currentChatUser.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-pink-200" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold">
              {currentChatUser.full_name?.charAt(0) || '?'}
            </div>
          )}
          <div>
            <p className="font-bold text-rose-900">{currentChatUser.full_name}</p>
            <p className="text-xs text-green-600">● Online</p>
          </div>
        </div>

        {/* 👇 Sirf 1 Audio Call Button */}
        <button
          onClick={handleStartCall}
          className="p-2.5 rounded-xl bg-green-500 text-white hover:shadow-lg hover:scale-105 transition active:scale-95"
          title="Voice Call"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-rose-50/30 to-pink-50/30">
        {loadingMessages? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-3">💬</div>
            <p className="text-rose-900 font-bold">No messages yet</p>
            <p className="text-xs text-rose-700/70 mt-1">Send a message to start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={msg.sender_id === session.user.id}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} session={session} />

      {isCalling && callData && (
        <VideoCallOverlay
          key="voice-call-stable"
          channelName={callData.channelName}
          userId={session.user.id}
          incomingCall={callData.isIncoming? callData.incomingCallData : null}
          onAcceptCall={() => {
            respondToCall(true, callData.incomingCallData); // 👈 pura object bhejo
          }}
          onRejectCall={() => {
            respondToCall(false, callData.incomingCallData);
            handleEndCall();
          }}
          onCallEnd={handleEndCall}
        />
      )}
    </div>
  );
}