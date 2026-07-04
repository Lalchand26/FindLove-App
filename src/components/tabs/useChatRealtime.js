import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export const useChatRealtime = (session, currentChatUser) => {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); 
  const [isVideoCalling, setIsVideoCalling] = useState(false);
  const [activeCall, setActiveCall] = useState(null); // 👈 NAYA: callId store karne ke liye
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

  // 2. Message bhejo - same as before
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

  // 3. Call Initiate Karo - FIXED
  const initiateCall = async (callType = 'video', receiverId) => {
    if (!currentChatUser?.id || !session?.user?.id) return null;
    
    // 👇 FIX 1: Channel name fixed. Date.now hata diya
    const channelName = [session.user.id, receiverId].sort().join('_');
    
    const { data, error } = await supabase
     .from('calls')
     .insert({
        caller_id: session.user.id,
        receiver_id: receiverId,
        channel_name: `call_${channelName}`, // 👈 Ab same rahega
        status: 'ringing',
        call_type: callType
      })
     .select()
     .single();
    
    if (error) {
      console.error('Call create error:', error);
      alert('Call nahi lagi: ' + error.message);
      return null;
    }
    
    console.log('Call row ban gayi:', data);
    setActiveCall(data); // 👈 CallId save kar li
    setIsVideoCalling(true); 
    return data; 
  };

  // 4. Call Accept/Reject - FIXED
  const respondToCall = async (accepted, callData) => {
    const { error } = await supabase
     .from('calls')
     .update({ status: accepted ? 'answered' : 'rejected' })
     .eq('id', callData.id);
    
    if (error) console.error('Respond error:', error);
    setIncomingCall(null); 
    if(accepted) {
      setActiveCall(callData); // 👈 CallId save
      setIsVideoCalling(true);
    }
  };

  // 5. Call band karo - FIXED
  const endCall = async () => {
    if(activeCall?.id) {
      await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCall.id);
    }
    setIsVideoCalling(false);
    setIncomingCall(null);
    setActiveCall(null);
  }

  // 6. Realtime subscription - Chat + Call DB se
  useEffect(() => {
    if (!currentChatUser?.id || !session?.user?.id) {
      setMessages([]);
      return;
    }

    fetchMessages();

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
     .channel(`chat_${session.user.id}`) 
     
     // 1. Messages ke liye
     .on('postgres_changes', {
         event: 'INSERT', 
         schema: 'public', 
         table: 'messages',
         filter: `receiver_id=eq.${session.user.id}`
       }, (payload) => {
         if(payload.new.sender_id === currentChatUser.id) {
           setMessages((prev) => [...prev, payload.new]);
         }
       }
     )
     
     // 2. Incoming Call ke liye
     .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'calls',
        filter: `receiver_id=eq.${session.user.id}`
      }, (payload) => {
        console.log('📞 Incoming call:', payload.new);
        setIncomingCall(payload.new); // Popup dikhao
      })

     // 3. Call status change ke liye - FIX 2
     .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'calls',
        // 👇 FIX: OR condition sahi kiya
        filter: `or(caller_id.eq.${session.user.id},receiver_id.eq.${session.user.id})`
      }, (payload) => {
        console.log('Call status update:', payload.new);
        
        if (payload.new.status === 'answered') {
          setActiveCall(payload.new); // 👈 Answer hote hi callId save
        }

        if (payload.new.status === 'rejected') {
          alert('User rejected the call');
          setIsVideoCalling(false);
          setActiveCall(null);
        }
        
        if (payload.new.status === 'ended') {
          alert('Call ended');
          setIsVideoCalling(false);
          setActiveCall(null);
        }
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
    initiateCall,
    respondToCall,
    endCall,
    incomingCall,
    isVideoCalling,
    activeCall // 👈 NAYA: Agora me channel_name dene ke liye
  };
};
