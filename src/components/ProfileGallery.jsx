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

      // 1. Avatar URL fetch from 'profiles'
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.avatar_url) {
          allImages.push(profile.avatar_url);
        }
      } catch (e) {
        console.error("Error fetching avatar_url:", e);
      }

      // 2. Existing Gallery Props/Metadata (Array / JSON / String)
      if (Array.isArray(existingGallery) && existingGallery.length > 0) {
        allImages = [...allImages, ...existingGallery];
      } else if (typeof existingGallery === 'string' && existingGallery.trim()) {
        try {
          const parsed = JSON.parse(existingGallery);
          if (Array.isArray(parsed)) allImages = [...allImages, ...parsed];
        } catch (e) {
          allImages = [...allImages, ...existingGallery.split(',').map(s => s.trim()).filter(Boolean)];
        }
      }

      // 3. 'profile_photos' Table se Saari Photos Fetch
      try {
        const { data: photos, error } = await supabase
          .from('profile_photos')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && photos && photos.length > 0) {
          // Column names handling: url || photo_url || image_url
          const photoUrls = photos
            .map(p => p.url || p.photo_url || p.image_url)
            .filter(Boolean);
            
          allImages = [...allImages, ...photoUrls];
        }
      } catch (err) {
        console.error("Error fetching profile_photos:", err);
      }

      // Filter out invalid/empty entries & removes duplicates
      const uniqueImages = [...new Set(allImages.filter(img => typeof img === 'string' && img.length > 5))];
      setImages(uniqueImages);
    };

    fetchGallery();
  }, [userId, existingGallery]);

  const next = (e) => {
    e?.stopPropagation();
    setCurrent((prev) => (prev + 1) % images.length);
  };

  const prev = (e) => {
    e?.stopPropagation();
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) {
    return (
      <img
        src={fallbackAvatar || `https://ui-avatars.com/api/?name=User&background=random`}
        className="w-full h-80 object-cover rounded-2xl"
        alt="avatar fallback"
      />
    );
  }

  return (
    <div className="relative w-full h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden group select-none">
      <img
        src={images[current]}
        className="w-full h-full object-cover transition-all duration-300"
        alt={`Gallery photo ${current + 1}`}
      />

      {/* Photo Count Badge */}
      {images.length > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-black/60 text-white backdrop-blur-sm text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Image size={12} className="stroke-[2.5]" />
          <span>{images.length} {images.length === 1 ? 'Photo' : 'Photos'}</span>
        </div>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm">
          {images.map((_, i) => (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${
                i === current ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}

      {/* Left/Right Navigation Buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition duration-200 z-10"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition duration-200 z-10"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}