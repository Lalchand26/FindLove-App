import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, Image } from 'lucide-react';

export default function ProfileGallery({ userId, fallbackAvatar, existingGallery }) {
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);

    const fetchGallery = async () => {
      if (!userId) return;
      let allImages = [];

      // 1. Avatar URL lete hain
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', userId).maybeSingle();
      if (profile?.avatar_url) allImages.push(profile.avatar_url);

      // 2. Existing Gallery logic
      if (Array.isArray(existingGallery) && existingGallery.length > 0) {
        allImages = [...allImages, ...existingGallery];
      } else if (typeof existingGallery === 'string' && existingGallery) {
        try {
          const parsed = JSON.parse(existingGallery);
          if (Array.isArray(parsed)) allImages = [...allImages, ...parsed];
        } catch (e) {
          allImages = [...allImages, ...existingGallery.split(',').filter(Boolean)];
        }
      }

      // 3. profile_photos table se actual records fetch karte hain
      try {
        const { data: photos, error } = await supabase
          .from('profile_photos')
          .select('url')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && photos) {
          allImages = [...allImages, ...photos.map(p => p.url)];
        }
      } catch (err) {
        console.error("Error fetching profile_photos:", err);
      }

      setImages([...new Set(allImages)].filter(Boolean));
    };

    fetchGallery();
  }, [userId, existingGallery]);

  const next = () => setCurrent((current + 1) % images.length);
  const prev = () => setCurrent((current - 1 + images.length) % images.length);

  if (images.length === 0) {
    return <img src={fallbackAvatar} className="w-full h-80 object-cover rounded-2xl" alt="avatar fallback" />;
  }

  return (
    <div className="relative w-full h-80 bg-gray-200 rounded-2xl overflow-hidden group">
      <img src={images[current]} className="w-full h-full object-cover" alt={`Gallery item ${current + 1}`} />
      
      {/* 🚀 FIXED: Dynamic Photo Count Badge is now inside the gallery component */}
      {images.length > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-black/60 text-white backdrop-blur-sm text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm select-none">
          <Image size={12} className="stroke-[2.5]" />
          <span>{images.length} {images.length === 1 ? 'Photo' : 'Photos'}</span>
        </div>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
          {images.map((_, i) => (
            <span 
              key={i} 
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white scale-110' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}

      {images.length > 1 && (
        <>
          <button 
            onClick={(e) => { e.stopPropagation(); prev(); }} 
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition duration-200"
          >
            <ChevronLeft size={18}/>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); next(); }} 
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition duration-200"
          >
            <ChevronRight size={18}/>
          </button>
        </>
      )}
    </div>
  );
}