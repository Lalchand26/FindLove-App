import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export const useChatRealtime = (session, currentChatUser) => {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); // 👈 Call ke liye naya state
  const channelRef = useRef(null);

  // 1. Messages fetch - same as before
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

  // 2. Message bhejo - same
  const sendMessage = async (messageData) => {
    if (!currentChatUser?.id || !session?.user?.id) return;
    try {
      const { error } = await supabase
       .from('messages')
       .insert({
         sender_id: session.user.id,
         receiver_id: currentChatUser.id,
         content: messageData.content,
         type: messageData.type
       });
      if (error) throw error;
    } catch (err) {
      console.error('Send message error:', err.message);
      alert('Message send failed: ' + err.message);
    }
  };

  // 3. Call Initiate Karo 👈 NAYA
  const initiateCall = async (callType = 'video') => {
    if (!currentChatUser?.id || !session?.user?.id) return;
    
    const channelName = `call_${Date.now()}_${session.user.id}`;
    
    // Supabase Broadcast se dusre user ko bhej
    channelRef.current.send({
      type: 'broadcast',
      event: 'incoming-call',
      payload: {
        from: session.user.id,
        from_name: session.user.user_metadata?.name || 'Unknown',
        from_photo: session.user.user_metadata?.avatar_url,
        channel_name: channelName,
        call_type: callType
      }
    });
    
    return channelName; // Caller isko use karke Agora join karega
  };

  // 4. Call Accept/Reject 👈 NAYA
  const respondToCall = (accepted, callerId, channelName) => {
    channelRef.current.send({
      type: 'broadcast',
      event: accepted ? 'call-accepted' : 'call-rejected',
      payload: { from: session.user.id, to: callerId, channel_name: channelName }
    });
    setIncomingCall(null); // Popup band karo
  };

  // 5. Realtime subscription - Chat + Call
  useEffect(() => {
    if (!currentChatUser?.id || !session?.user?.id) {
      setMessages([]);
      return;
    }

    fetchMessages();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Ek hi channel pe Chat + Call events suno
    const channel = supabase
     .channel(`private_${session.user.id}`) // 👈 User ka private channel
     // Messages ke liye
     .on('postgres_changes', {
         event: 'INSERT', schema: 'public', table: 'messages',
         filter: `receiver_id=eq.${session.user.id}`
       }, (payload) => {
         if(payload.new.sender_id === currentChatUser.id) {
           setMessages((prev) => [...prev, payload.new]);
         }
       }
     )
     // Incoming Call ke liye 👈 NAYA
     .on('broadcast', { event: 'incoming-call' }, (payload) => {
        console.log('📞 Incoming call:', payload);
        setIncomingCall(payload.payload); // Popup dikhao
     })
     // Call Accepted ke liye 👈 NAYA
     .on('broadcast', { event: 'call-accepted' }, (payload) => {
        console.log('✅ Call accepted:', payload);
        // Caller ko batana ki Agora join kar le
     })
     // Call Rejected ke liye 👈 NAYA
     .on('broadcast', { event: 'call-rejected' }, (payload) => {
        console.log('❌ Call rejected:', payload);
        alert('User rejected the call');
     })
     .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Connected for chat + calls');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentChatUser?.id, session?.user?.id]);

  return { 
    messages, 
    setMessages, 
    loadingMessages, 
    sendMessage,
    initiateCall, // 👈 Return karo
    respondToCall, // 👈 Return karo
    incomingCall // 👈 Return karo
  };
};
