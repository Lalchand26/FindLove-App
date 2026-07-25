import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const ProfileVisitor = ({ profileUserId }) => {
  // Strict mode duplicate runs rokne ke liye
  const hasVisited = useRef(false);

  useEffect(() => {
    const handleVisit = async () => {
      // Prevent duplicate call in same render
      if (hasVisited.current) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Skip if not logged in or visiting own profile
        if (!user) return console.log("Visitor: User not logged in");
        if (user.id === profileUserId) return console.log("Visitor: Own profile");

        hasVisited.current = true;

        // 2. Insert record into 'profile_visits' table
        const { error: dbError } = await supabase
          .from('profile_visits')
          .insert([
            {
              visitor_id: user.id,
              visited_id: profileUserId,
            }
          ]);

        if (dbError) {
          console.error("DB Visit Log Error:", dbError.message);
        } else {
          console.log("Visit logged in DB ✅");
        }

        // 3. Visitor Name Formatting
        const rawEmail = user.email || '';
        const emailUsername = rawEmail ? rawEmail.split('@')[0] : '';
        
        const visitorName = 
          user.user_metadata?.full_name || 
          user.user_metadata?.name || 
          user.user_metadata?.username || 
          emailUsername || 
          'Someone';

        // 4. Visitor Profile Link Construct Karein
        const profileUrl = `${window.location.origin}/profile/${user.id}`;

        // 5. Call Supabase Edge Function (Email notification ke liye)
        const { data, error: fnError } = await supabase.functions.invoke('send-visit-email', {
          body: {
            visitorId: user.id,
            targetUserId: profileUserId,
            visitorName: visitorName.trim(),
            profileUrl: profileUrl // 👈 Blue link ke liye URL pass kiya
          }
        });

        if (fnError) {
          let detailedError = fnError.message;
          try {
            const bodyError = await fnError.context?.json();
            if (bodyError?.error) detailedError = bodyError.error;
          } catch (_) {}

          console.error("Visit Edge Function Error:", detailedError);
        } else {
          console.log("Email notification sent ✅", data);
        }

      } catch (err) {
        console.error("Visitor Catch Error:", err);
      }
    };

    if (profileUserId) {
      handleVisit();
    }
  }, [profileUserId]);

  return null;
};

export default ProfileVisitor;