import { Video, Phone } from 'lucide-react';

export default function ChatHeader({ chatPartner, onVideoCall }) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-3">
        <img src={chatPartner.avatar_url} className="w-10 h-10 rounded-full" />
        <div>
          <p className="font-bold">{chatPartner.full_name}</p>
          <p className="text-xs text-green-500">• Online</p>
        </div>
      </div>
      
      {/* ✅ Video Call Button Yahan */}
      <button 
        onClick={onVideoCall}
        className="p-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white active:scale-95"
      >
        <Video className="w-5 h-5" />
      </button>
    </div>
  );
}