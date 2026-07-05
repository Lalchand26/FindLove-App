import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export const useChatRealtime = (session, currentChatUser) => {
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); 
  const [isVideoCalling, setIsVideoCalling] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const channelRef = useRef(null);

  const roomChannel = currentChatUser?.id && session?.user?.id 
    ? [session.user.id, currentChatUser.id].sort().join('_') 
    : null;

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
      const { error } = await supabase
       .from('messages')
       .insert({
         sender_id: session.user.id,
         receiver_id: currentChatUser.id,
         content: messageData.content,
         type: messageData.type || 'text'
       });
      if (error) throw error;
    } catch (err) {
      console.error('Send message error:', err.message);
      alert('Message send failed: ' + err.message);
    }
  };

  const initiateCall = async (callType = 'video', receiverId) => {
    if (!currentChatUser?.id || !session?.user?.id) return null;
    const channelName = `call_${roomChannel}`; // Dono ka same channel
    
    const { data, error } = await supabase
     .from('calls')
     .insert({
        caller_id: session.user.id,
        receiver_id: receiverId,
        channel_name: channelName,
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
    
    console.log("Call created:", data);
    setActiveCall(data); // Caller turant join ki taiyari karega
    setIsVideoCalling(true); 
    return data; 
  };

  const respondToCall = async (accepted, callData) => {
    const { error } = await supabase
     .from('calls')
     .update({ status: accepted ? 'answered' : 'rejected' })
     .eq('id', callData.id);
    
    if (error) console.error('Respond error:', error);
    
    setIncomingCall(null); 
    if(accepted) {
      setActiveCall(callData); // Receiver bhi join karega
      setIsVideoCalling(true);
    }
  };

  const endCall = async () => {
    if(activeCall?.id) {
      await supabase.from('calls').update({ status: 'ended' }).eq('id', activeCall.id);
    }
    setIsVideoCalling(false);
    setIncomingCall(null);
    setActiveCall(null);
  }

  useEffect(() => {
    if (!roomChannel) {
      setMessages([]);
      return;
    }
    fetchMessages();
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
     .channel(`room_${roomChannel}`)
     .on('postgres_changes', {
         event: 'INSERT', 
         schema: 'public', 
         table: 'messages',
         filter: `or(and(sender_id.eq.${session.user.id},receiver_id.eq.${currentChatUser.id}),and(sender_id.eq.${currentChatUser.id},receiver_id.eq.${session.user.id}))`
       }, (payload) => {
         setMessages((prev) => [...prev, payload.new]);
       }
     )
     .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'calls',
        filter: `receiver_id=eq.${session.user.id}` // Sirf jisko call aayi hai
      }, (payload) => {
        console.log("📞 Incoming Call:", payload.new);
        setIncomingCall(payload.new);
      })
     .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'calls',
        filter: `or(caller_id.eq.${session.user.id},receiver_id.eq.${session.user.id})` // Dono sunenge
      }, (payload) => {
        console.log("📞 Call Update:", payload.new.status);
        
        if (payload.new.status === 'answered') {
          setActiveCall(payload.new); // 👈 Sabse important fix
          setIsVideoCalling(true);
          setIncomingCall(null);
        }
        if (payload.new.status === 'rejected') {
          alert('User ne call reject kar di');
          setIsVideoCalling(false);
          setActiveCall(null);
        }
        if (payload.new.status === 'ended') {
          alert('Call khatam ho gayi');
          setIsVideoCalling(false);
          setActiveCall(null);
        }
      })
     .subscribe((status) => {
       console.log('Supabase channel status:', status);
     });

    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [roomChannel, session?.user?.id, currentChatUser?.id]);

  return { 
    messages, setMessages, loadingMessages, sendMessage,
    initiateCall, respondToCall, endCall,
    incomingCall, isVideoCalling, activeCall
  };
};