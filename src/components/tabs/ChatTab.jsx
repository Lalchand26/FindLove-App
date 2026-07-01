import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import VideoCallOverlay from './VideoCallOverlay';
import { Video, ArrowLeft, MessageSquare } from 'lucide-react';

export default function ChatTab({ session, activeChatWith, setSelectedChatUser }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentChatUser, setCurrentChatUser] = useState(activeChatWith || null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isVideoCalling, setIsVideoCalling] = useState(false);
  const messagesEndRef = useRef(null);

  // 👇 FIX: Channel name ko memoize kar taaki har render pe change na ho
  const videoChannelName = useMemo(() => {
    if (!session?.user?.id ||!currentChatUser?.id) return null;
    return `call_${[session.user.id, currentChatUser.id].sort().map(id => id.substring(0,8)).join('_')}`;
  }, [session?.user?.id, currentChatUser?.id]);

  // Jab Dashboard se new user aaye to update kar
  useEffect(() => {
    if (activeChatWith) {
      setCurrentChatUser(activeChatWith);
    }
  }, [activeChatWith]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch liked users for chat list
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);

      // Step 1: Get all users I liked
      const { data: likes, error: likesError } = await supabase
     .from('likes')
     .select('liked_id')
     .eq('liker_id', session.user.id)
     .eq('action_type', 'like');

      if (likesError) throw likesError;

      if (!likes || likes.length === 0) {
        setUsers([]);
        return;
      }

      const likedUserIds = likes.map(l => l.liked_id);

      // Step 2: Get their profiles
      const { data: profiles, error: profilesError } = await supabase
     .from('profiles')
     .select('*')
     .in('id', likedUserIds);

      if (profilesError) throw profilesError;
      setUsers(profiles || []);

    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, [session.user.id]);

  // Fetch messages for current chat
  const fetchMessages = useCallback(async () => {
    if (!currentChatUser) return;

    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
     .from('messages')
     .select('*')
     .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${currentChatUser.id}),and(sender_id.eq.${currentChatUser.id},receiver_id.eq.${session.user.id})`)
     .order('created_at', { ascending: true });

      if (error) throw error;

      // Ensure data content is clean string, not structured object
      const sanitizedMessages = (data || []).map(msg => {
        if (typeof msg.content === 'object' && msg.content!== null) {
          return {...msg, content: msg.content.content || JSON.stringify(msg.content) };
        }
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed && typeof parsed === 'object' && parsed.content) {
            return {...msg, content: parsed.content };
          }
        } catch (e) {
          // It's a plain string, do nothing
        }
        return msg;
      });

      setMessages(sanitizedMessages);
    } catch (err) {
      console.error('Fetch messages error:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [session.user.id, currentChatUser]);

  // Real-time message subscription
  useEffect(() => {
    if (!currentChatUser ||!session?.user?.id) return;

    const channel = supabase
   .channel(`chat-room-${currentChatUser.id}`)
   .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${session.user.id}`
        },
        (payload) => {
          if (payload.new.sender_id === currentChatUser.id) {
            let newMessage = {...payload.new };

            // Clean dynamic payload string objects if stringified JSON arrives
            try {
              const parsed = JSON.parse(newMessage.content);
              if (parsed && typeof parsed === 'object' && parsed.content) {
                newMessage.content = parsed.content;
              }
            } catch (e) {
              // Plain string structure, let it pass
            }

            setMessages(prev => [...prev, newMessage]);
          }
        }
      )
   .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentChatUser, session.user.id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Send message handler
  const handleSendMessage = async (content, type = 'text') => {
    if (!currentChatUser ||!content) return;

    try {
      // Direct string content update to keep DB records simple
      const { data, error } = await supabase
     .from('messages')
     .insert({
          sender_id: session.user.id,
          receiver_id: currentChatUser.id,
          content: content.trim(),
          type: type
        })
     .select()
     .single();

      if (error) throw error;

      // Add to local state immediately
      setMessages(prev => [...prev, data]);
    } catch (err) {
      console.error('Send message error:', err);
      alert('Failed to send message');
    }
  };

  // 👇 FIX: Ye function add kar
  const handleEndVideoCall = () => {
    console.log(">>> PARENT: Closing video call, back to chat <<<")
    setIsVideoCalling(false)
  }

  // ✅ Jab koi chat select nahi hai - User List Dikhao
  if (!currentChatUser) {
    return (
      <div className="h-[calc(100vh-180px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-pink-200"
                    />
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

  // ✅ Jab chat open hai - Full Screen Chat Window
  return (
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-rose-100 bg-white/80 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back Button */}
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
            <img
              src={currentChatUser.avatar_url}
              alt={currentChatUser.full_name}
              className="w-10 h-10 rounded-full object-cover border-2 border-pink-200"
            />
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

        {/* Video Call Button */}
        <button
          onClick={() => {
            console.log(">>> Starting video call <<<")
            setIsVideoCalling(true)
          }}
          className="p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:shadow-lg hover:scale-105 transition active:scale-95"
          title="Start Video Call"
        >
          <Video className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
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

      {/* Input with Image Upload */}
      <ChatInput onSendMessage={handleSendMessage} session={session} />

      {/* 👇 FIX: VideoCallOverlay - key + onClose sahi */}
      {isVideoCalling && videoChannelName && session?.user?.id && (
        <VideoCallOverlay
          key="video-call-stable"
          channelName={videoChannelName}
          userId={session.user.id}
          onCallEnd={handleEndVideoCall}
        />
      )}
    </div>
  );
}