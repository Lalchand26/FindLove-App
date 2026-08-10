import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Smile, Gift } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function LiveChat({ roomName, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiftMenu, setShowGiftMenu] = useState(false);
  const messagesEndRef = useRef(null);

  const giftsList = [
    { name: 'Heart', emoji: '❤️' },
    { name: 'Rose', emoji: '🌹' },
    { name: 'Crown', emoji: '👑' },
    { name: 'Diamond', emoji: '💎' },
    { name: 'Fire', emoji: '🔥' }
  ];

  useEffect(() => {
    fetchMessages();

    // Supabase Realtime Subscription for instant message/gift sync
    const channel = supabase
      .channel(`public:live_chat:${roomName}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'live_chat', 
          filter: `room_name=eq.${roomName}` 
        },
        (payload) => {
          setMessages((prev) => {
            // Duplicate messages se bachne ke liye ID check
            if (prev.some((msg) => msg.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('live_chat')
      .select('*')
      .eq('room_name', roomName)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages(data || []);
  };

  // Common function to send text or gift
  const handleSendMessage = async (contentToSend = null, type = 'text') => {
    const messageContent = contentToSend || newMessage.trim();
    if (!messageContent) return;

    // Safely extract auth user or fallback to props
    const { data: { user } } = await supabase.auth.getUser();
    
    const currentUsername = 
      user?.email?.split('@')[0] || 
      currentUser?.email?.split('@')[0] || 
      (typeof currentUser === 'string' ? currentUser : null) || 
      'Anonymous';

    const userId = user?.id || currentUser?.id || null;

    // Temporary optimistic ID for fast local display
    const tempId = 'temp_' + Date.now();
    const tempMessage = {
      id: tempId,
      room_name: roomName,
      user_id: userId,
      username: currentUsername,
      message: messageContent,
      type: type,
      created_at: new Date().toISOString()
    };

    // Instant local state update (No waiting / No refresh needed)
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage('');
    setShowEmojiPicker(false);
    setShowGiftMenu(false);

    // Database Insert
    const { data, error } = await supabase.from('live_chat').insert([
      {
        room_name: roomName,
        user_id: userId,
        username: currentUsername,
        message: messageContent,
        type: type,
        created_at: new Date().toISOString()
      }
    ]).select();

    if (error) {
      console.error('Error sending message:', error);
      // Revert if error occurs
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else if (data && data[0]) {
      // Replace temporary record with actual database record
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data[0] : m)));
    }
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white relative">
      <div className="p-3 border-b border-white/10 flex justify-between items-center">
        <h3 className="font-bold">Live Chat</h3>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm flex items-start gap-1">
            <span className="font-bold text-red-400">{msg.username}: </span>
            {msg.type === 'gift' ? (
              <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                Sent a Gift: {msg.message}
              </span>
            ) : (
              <span className="text-gray-200">{msg.message}</span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-3 z-50">
          <EmojiPicker
            theme="dark"
            onEmojiClick={onEmojiClick}
            searchDisabled={false}
            width={300}
            height={350}
          />
        </div>
      )}

      {/* Gift Menu Popup */}
      {showGiftMenu && (
        <div className="absolute bottom-16 right-3 bg-gray-800 p-3 rounded-xl border border-white/10 flex gap-3 shadow-xl z-50">
          {giftsList.map((gift) => (
            <button
              key={gift.name}
              onClick={() => handleSendMessage(`${gift.emoji} ${gift.name}`, 'gift')}
              className="flex flex-col items-center p-2 hover:bg-gray-700 rounded-lg transition text-xl"
              title={gift.name}
            >
              <span>{gift.emoji}</span>
              <span className="text-[10px] text-gray-300">{gift.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Area - Fixed for Mobile */}
      <div className="p-2 sm:p-3 border-t border-white/10 flex items-center gap-1.5 sm:gap-2 relative">
        <button
          type="button"
          onClick={() => {
            setShowEmojiPicker(!showEmojiPicker);
            setShowGiftMenu(false);
          }}
          className="text-gray-400 hover:text-white p-1 shrink-0"
        >
          <Smile size={20} />
        </button>

        <button
          type="button"
          onClick={() => {
            setShowGiftMenu(!showGiftMenu);
            setShowEmojiPicker(false);
          }}
          className="text-yellow-400 hover:text-yellow-300 p-1 shrink-0"
        >
          <Gift size={20} />
        </button>

        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message..."
          className="flex-1 min-w-0 bg-gray-800 rounded-lg px-2.5 py-2 text-white text-xs sm:text-sm outline-none focus:ring-1 focus:ring-red-500"
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          className="bg-red-600 hover:bg-red-700 p-2 rounded-lg text-white transition shrink-0 flex items-center justify-center"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}