import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export const useChatRealtime = (session, currentChatUser) => {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); 
  const [isCalling, setIsCalling] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const channelRef = useRef(null);
  const endCallTimeoutRef = useRef(null);

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

  const sendMessage = async (messageData) => {
    if (!currentChatUser?.id || !session?.user?.id) return;
    try {
      const { error } = await supabase.from('messages').insert({
         sender_id: session.user.id,
         receiver_id: currentChatUser.id,
         content: messageData.content,
         type: messageData.type
       });
      if (error) throw error;
    } catch (err) {
      console.error('Send message error:', err.message);
    }
  };

  // 👇 FIXED: Sirf 1 parameter lega ab - receiverId
  const initiateCall = async (receiverId) => {
    if (!receiverId || !session?.user?.id) {
      alert("User ID nahi mila")
      return null;
    }
    const channelName = [session.user.id, receiverId].sort().join('_');
    
    console.log("Calling:", {from: session.user.id, to: receiverId}) // debug

    const { data, error } = await supabase.from('calls').insert({
        caller_id: session.user.id,
        receiver_id: receiverId,
        channel_name: channelName,
        status: 'ringing',
        call_type: 'audio', // force audio
        from_name: session.user_metadata?.full_name || 'User',
        from_photo: session.user_metadata?.avatar_url || null
      }).select().single();
      
    if (error) {
      console.error("Supabase Insert Error:", error)
      return alert('Call nahi lagi: ' + error.message);
    }
    setActiveCall(data);
    setIsCalling(true);
    return data; 
  };

  const respondToCall = async (accepted, callData) => {
    const { error } = await supabase.from('calls').update({ 
      status: accepted ? 'answered' : 'rejected',
      updated_at: new Date().toISOString()
    }).eq('id', callData.id);
    
    if (error) console.error('Respond error:', error);
    setIncomingCall(null); 
    
    if(accepted) {
      setActiveCall(callData);
      setIsCalling(true);
    }
  };

  const endCall = async () => {
    clearTimeout(endCallTimeoutRef.current);
    if(activeCall?.id) {
      await supabase.from('calls').update({ 
        status: 'ended',
        updated_at: new Date().toISOString()
      }).eq('id', activeCall.id);
    }
    setIsCalling(false);
    setIncomingCall(null);
    setActiveCall(null);
  }

  useEffect(() => {
    if (!currentChatUser?.id || !session?.user?.id) {
      setMessages([]);
      return;
    }
    fetchMessages();
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(`chat_${session.user.id}`) 
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, (payload) => {
         if(payload.new.sender_id === currentChatUser.id) setMessages((prev) => [...prev, payload.new]);
       })
     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls', filter: `receiver_id=eq.${session.user.id}` }, (payload) => {
        if(payload.new.status === 'ringing') setIncomingCall(payload.new);
      })
     .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `caller_id=eq.${session.user.id}` }, (payload) => {
        if (payload.new.status === 'answered') setActiveCall(payload.new);
        if (payload.new.status === 'rejected') { setIsCalling(false); setActiveCall(null); }
        if (payload.new.status === 'ended') {
          clearTimeout(endCallTimeoutRef.current);
          endCallTimeoutRef.current = setTimeout(() => { setIsCalling(false); setActiveCall(null); }, 1000)
        }
      })
     .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls', filter: `receiver_id=eq.${session.user.id}` }, (payload) => {
        if (payload.new.status === 'ended') {
          clearTimeout(endCallTimeoutRef.current);
          endCallTimeoutRef.current = setTimeout(() => { setIsCalling(false); setActiveCall(null); setIncomingCall(null); }, 1000)
        }
      })
     .subscribe();
    channelRef.current = channel;

    return () => {
      clearTimeout(endCallTimeoutRef.current);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [currentChatUser?.id, session?.user?.id]);

  return { 
    messages, 
    loadingMessages, 
    sendMessage, 
    initiateCall, 
    respondToCall, 
    endCall, 
    incomingCall, 
    isCalling,
    activeCall 
  };
};