import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AlertsTab({ session, setSelectedUser, setActiveTab }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const userId = session?.user?.id;

  const fetchVisits = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // 1. Fetch profile visits where current logged-in user is the visited person
      const { data: visitData, error } = await supabase
        .from("profile_visits")
        .select("*")
        .eq("visited_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Visits Fetch Error:", error.message);
        setVisits([]);
        return;
      }

      if (!visitData || visitData.length === 0) {
        setVisits([]);
        return;
      }

      // 2. Extract unique visitor_ids
      const visitorIds = [
        ...new Set(visitData.map((v) => v.visitor_id).filter(Boolean)),
      ];

      // 3. Fetch full profiles for these visitors
      let profiles = [];
      if (visitorIds.length > 0) {
        const { data: pData, error: pError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", visitorIds);

        if (pError) {
          console.error("❌ Profiles Fetch Error:", pError.message);
        } else {
          profiles = pData || [];
        }
      }

      // 4. Combine visit data with visitor profile data
      const merged = visitData.map((v) => {
        return {
          ...v,
          visitor: profiles.find((p) => p.id === v.visitor_id) || null,
        };
      });

      setVisits(merged);
    } catch (err) {
      console.error("💥 Unexpected error in fetchVisits:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial Fetch & Realtime Listener
  useEffect(() => {
    fetchVisits();

    if (!userId) return;

    // 🔔 REALTIME LISTEN: Automatic update
    const channel = supabase
      .channel("realtime_profile_visits")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profile_visits",
          filter: `visited_id=eq.${userId}`,
        },
        () => {
          fetchVisits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchVisits]);

  // 🎯 FIX: Open Visitor Profile properly
  const handleVisitorClick = (visit) => {
    if (!visit) return;

    const actorProfile = visit.visitor; 
    const visitorId = visit.visitor_id; 

    if (!visitorId) return;

    // 1. Agar App Tabs me state render kar rahi hai:
    if (setSelectedUser && setActiveTab) {
      setSelectedUser(actorProfile || { id: visitorId });
      setActiveTab("user-profile"); // Is tab ka naam apne App.jsx ke state tab se match kar lein (e.g. 'view-profile' ya 'user-profile')
    } else {
      // 2. Otherwise Direct Route Navigation
      navigate(`/profile/${visitorId}`);
    }
  };

  if (loading) {
    return (
      <p className="text-center p-8 animate-pulse text-gray-500 font-bold">
        🔄 Loading alerts...
      </p>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">
          🔔 Profile Visits
        </h2>
        <button
          onClick={fetchVisits}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
        >
          🔄 Refresh
        </button>
      </div>

      {visits.length === 0 ? (
        <p className="text-center text-gray-500 py-8 font-bold">
          Abhi koi naya visit nahi hai
        </p>
      ) : (
        visits.map((v) => {
          const rawName =
            v.visitor?.full_name ||
            v.visitor?.username ||
            v.visitor?.name ||
            v.visitor?.email?.split("@")[0] ||
            "User";

          const visitorName = rawName.trim();

          const avatarUrl =
            v.visitor?.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              visitorName
            )}&background=e91e63&color=fff`;

          return (
            <div
              key={v.id}
              onClick={() => handleVisitorClick(v)}
              className="p-5 border rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition shadow-sm hover:shadow-md bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl}
                  alt={visitorName}
                  className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-gray-700 shrink-0"
                />
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-normal">
                    <span className="font-bold text-gray-900 dark:text-white">{visitorName}</span> just visited your profile on CityCrossed.
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {v.created_at &&
                      new Date(v.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                  </p>
                </div>
              </div>

              {/* Right Side Action Button */}
              {v.visitor_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Card ka main click double trigger mat hone do
                    handleVisitorClick(v);
                  }}
                  className="text-xs bg-[#e91e63] hover:bg-[#d81b60] text-white font-bold px-4 py-2 rounded-xl transition shrink-0 shadow-sm whitespace-nowrap"
                >
                  View Profile
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}