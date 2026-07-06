import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Image, Send, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function ChatInput({ onSendMessage, session }) {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef(null);

  // Click outside emoji picker to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current &&!emojiRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!session?.user?.id) {
      alert('Please login again');
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);

      await onSendMessage(publicUrl, 'image');
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message, 'text');
      setMessage('');
      setShowEmojiPicker(false);
    }
  };

  return (
    <div className="relative">
      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div ref={emojiRef} className="absolute bottom-16 left-4 z-50">
          <EmojiPicker 
            onEmojiClick={onEmojiClick}
            width={320}
            height={400}
            theme="light"
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t bg-white flex items-center gap-2">
        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 active:scale-95"
        >
          <Smile className="w-5 h-5 text-rose-600" />
        </button>

        {/* Image Upload */}
        <label className="p-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 cursor-pointer active:scale-95">
          <Image className="w-5 h-5 text-rose-600" />
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            className="hidden"
            disabled={uploading}
          />
        </label>
        
        {/* Text Input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
        
        {/* Send Button */}
        <button 
          type="submit" 
          disabled={!message.trim() || uploading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white disabled:opacity-50 active:scale-95"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}