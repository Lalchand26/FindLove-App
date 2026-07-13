import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export function useChatRealtime(session, currentChatUser) {
  const [messages, setMessages] = useState([]);

  // 1. Messages ko fetch aur realtime suno
  useEffect(() => {
    if (!session || !currentChatUser) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${currentChatUser.id}),and(sender_id.eq.${currentChatUser.id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });
      
      if (!error) {
        setMessages(data || []);
      }
    };
    
    fetchMessages();

    // Pure 'messages' table ke public changes ko listen karein
    const channel = supabase
      .channel('public:messages') 
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new;
        
        // Check karein ki kya ye naya message isi specific chat window ka hai
        const isCurrentChat = 
          (newMsg.sender_id === session.user.id && newMsg.receiver_id === currentChatUser.id) ||
          (newMsg.sender_id === currentChatUser.id && newMsg.receiver_id === session.user.id);

        if (isCurrentChat) {
          // Duplicate messages se bachne ke liye check karein
          setMessages((prev) => {
            const exists = prev.some(msg => msg.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, currentChatUser?.id]); // Deep dependencies for performance

  // 2. Message bhejne ka function
  const sendMessage = async (content, type = 'text') => {
    if (!session || !currentChatUser) return;

    let finalContent = content;

    // Image Upload Fallback (Agar seedhe File pass ho tab ke liye safety check)
    if (type === 'image' && content instanceof File) {
      const fileName = `${session.user.id}/${Date.now()}-${content.name}`;
      const { data, error } = await supabase.storage
        .from('chat-images') // FIXED: Video bucket ki jagah sahi image bucket kiya
        .upload(fileName, content);

      if (error) {
        toast.error("Image upload failed");
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(fileName);
      finalContent = publicUrl;
    }

    // Insert to DB
    const { data: insertedData, error } = await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: currentChatUser.id,
      content: finalContent,
      type: type
    }).select(); // '.select()' lagane se instant inserted row mil jati hai

    // Local state ko instantly update karne ke liye optimistic update
    if (!error && insertedData && insertedData[0]) {
      setMessages((prev) => {
        const exists = prev.some(msg => msg.id === insertedData[0].id);
        if (exists) return prev;
        return [...prev, insertedData[0]];
      });
    }
  };

  // Ab sirf wahi chizein return ho rahi hain jo real-time message exchange ke liye zaroorat hain
  return { messages, sendMessage };
}