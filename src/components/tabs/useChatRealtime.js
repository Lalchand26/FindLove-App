import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export const useChatRealtime = (session, currentChatUser) => {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const channelRef = useRef(null);

  // 1. Messages fetch karne ka function
  const fetchMessages = async () => {
    if (!currentChatUser?.id || !session?.user?.id) {
      setMessages([]);
      return;
    }
    try {
      setLoadingMessages(true);
      const { data, error } = await supabase
       .from('messages')
       .select('*')
       .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${currentChatUser.id}),and(sender_id.eq.${currentChatUser.id},receiver_id.eq.${session.user.id})`)
       .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Fetch messages error:', err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 2. Message bhejne ka function - Ye missing tha
  const sendMessage = async (messageData) => {
    if (!currentChatUser?.id || !session?.user?.id) return;
    
    try {
      const { error } = await supabase
       .from('messages')
       .insert({
         sender_id: session.user.id,
         receiver_id: currentChatUser.id,
         content: messageData.content, // Sirf text ya URL
         type: messageData.type // 'text' ya 'image'
       });
      
      if (error) throw error;
      // Realtime se automatically message aa jayega, manually set karne ki zarurat nahi
    } catch (err) {
      console.error('Send message error:', err.message);
      alert('Message send failed: ' + err.message);
    }
  };

  // 3. Realtime subscription
  useEffect(() => {
    if (!currentChatUser?.id || !session?.user?.id) {
      setMessages([]);
      return;
    }

    fetchMessages();

    // Purana channel remove karo
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Naya channel banao - postgres_changes use karo
    const channel = supabase
     .channel(`messages_${session.user.id}_${currentChatUser.id}`)
     .on(
       'postgres_changes',
       {
         event: 'INSERT',
         schema: 'public',
         table: 'messages',
         filter: `sender_id=eq.${session.user.id},receiver_id=eq.${currentChatUser.id}`
       },
       (payload) => {
         console.log('New message sent:', payload);
         setMessages((prev) => [...prev, payload.new]);
       }
     )
     .on(
       'postgres_changes',
       {
         event: 'INSERT',
         schema: 'public',
         table: 'messages',
         filter: `sender_id=eq.${currentChatUser.id},receiver_id=eq.${session.user.id}`
       },
       (payload) => {
         console.log('New message received:', payload);
         setMessages((prev) => [...prev, payload.new]);
       }
     )
     .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Connected for chat');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentChatUser?.id, session?.user?.id]);

  return { messages, setMessages, loadingMessages, sendMessage }; // 👈 sendMessage return karo
};