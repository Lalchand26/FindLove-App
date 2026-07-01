import { useEffect, useRef } from 'react';

export default function MessageList({ messages, loadingMessages, session }) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50/40 space-y-3">
      {loadingMessages? (
        <div className="text-center text-xs font-bold text-gray-400 py-10">Syncing stream...</div>
      ) : messages.length === 0? (
        <div className="text-center text-xs font-bold text-gray-400 py-10">No messages yet.</div>
      ) : (
        messages.map((msg) => {
          const isMe = msg.sender_id === session.user.id;
          return (
            <div key={msg.id || msg.created_at} className={`flex ${isMe? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-sm ${isMe? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                {msg.type === 'image' || msg.image_url? (
                  <img src={msg.image_url} alt="Attachment" className="max-w-xs max-h-48 rounded-lg object-cover mb-1" />
                ) : (
                  <p>{msg.content}</p>
                )}
                <span className={`text-[8px] block text-right mt-1 ${isMe? 'text-pink-100' : 'text-gray-400'}`}>
                  ⏰ {msg.created_at? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}