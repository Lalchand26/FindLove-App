import React from 'react';

export default function MessageBubble({ message, isOwnMessage }) {
  const isImage = message.type === 'image';
  const isVideo = message.type === 'video'; // 👈 NAYA
  const time = new Date(message.created_at).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex ${isOwnMessage? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[70%] ${isOwnMessage? 'items-end' : 'items-start'} flex-col`}>
        <div
          className={`rounded-2xl px-3 py-2 shadow-md ${
            isOwnMessage
             ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-br-sm'
              : 'bg-white text-rose-900 rounded-bl-sm border-rose-100'
          }`}
        >
          {/* IMAGE */}
          {isImage && (
            <img
              src={message.content}
              alt="Chat image"
              className="rounded-lg max-w-full h-auto max-h-64 object-cover cursor-pointer"
              onClick={() => window.open(message.content, '_blank')}
            />
          )}

          {/* VIDEO 👇 NAYA */}
          {isVideo && (
            <div className="w-64">
              <video
                src={message.content}
                controls
                className="rounded-lg w-full"
                preload="metadata"
              />
              <p className="text-[10px] mt-1 opacity-70">📹 3 min video</p>
            </div>
          )}

          {/* TEXT */}
          {!isImage && !isVideo && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
        <span className={`text-xs mt-1 ${isOwnMessage? 'text-rose-400' : 'text-rose-500'}`}>
          {time}
        </span>
      </div>
    </div>
  );
}