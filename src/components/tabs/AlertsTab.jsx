import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export default function AlertsTab({ session, setSelectedUser, setActiveTab }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchAlerts = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch notifications for logged in user
      const { data: notifs, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Notifications Fetch Error:", error.message);
        setAlerts([]);
        return;
      }

      if (!notifs || notifs.length === 0) {
        setAlerts([]);
        return;
      }

      // 2. Extract visitor user IDs
      const actorIds = [
        ...new Set(
          notifs
            .map((n) => n.actor_id || n.sender_id || n.visitor_id)
            .filter(Boolean)
        ),
      ];

      // 3. Fetch full profiles for these visitors
      let profiles = [];
      if (actorIds.length > 0) {
        const { data: pData, error: pError } = await supabase
          .from("profiles")
          .select("*")
          .in("id", actorIds);

        if (pError) console.error("Profiles Fetch Error:", pError.message);
        else profiles = pData || [];
      }

      // 4. Combine notification data with profile data
      const merged = notifs.map((n) => {
        const visitorId = n.actor_id || n.sender_id || n.visitor_id;
        return {
          ...n,
          actor_id: visitorId,
          actor: profiles.find((p) => p.id === visitorId) || null,
        };
      });

      setAlerts(merged);
    } catch (err) {
      console.error("Unexpected error in fetchAlerts:", err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Handle visitor click
  const handleVisitorClick = async (alert) => {
    if (!alert) return;

    if (!alert.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", alert.id);
    }

    const actorProfile = alert.actor;
    const visitorId = alert.actor_id;

    if (actorProfile && setSelectedUser) {
      setSelectedUser(actorProfile);
    }
    if (setActiveTab) {
      setActiveTab("discover");
    }

    if (!setSelectedUser && !setActiveTab && visitorId) {
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
    <div className="space-y-4 max-w-2xl mx-auto p-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-gray-900 dark:text-white">
          🔔 Alerts
        </h2>
        <button
          onClick={fetchAlerts}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
        >
          🔄 Refresh
        </button>
      </div>

      {alerts.length === 0 ? (
        <p className="text-center text-gray-500 py-8 font-bold">
          Abhi koi naya visit nahi hai
        </p>
      ) : (
        alerts.map((a) => {
          // Email se "@" ke pehle wala part nikalne ke liye logic
          const rawName =
            a.actor?.full_name ||
            a.actor?.username ||
            a.actor?.name ||
            a.actor?.email?.split("@")[0] ||
            "Someone";

          // Name ko Clean aur Trim karein
          const visitorName = rawName.trim();

          const avatarUrl =
            a.actor?.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              visitorName
            )}&background=3b82f6&color=fff`;

          const profilePath = a.actor_id ? `/profile/${a.actor_id}` : "#";

          return (
            <div
              key={a.id}
              onClick={() => handleVisitorClick(a)}
              className={`p-4 border rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition shadow-sm hover:shadow-md ${
                a.is_read
                  ? "bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800"
                  : "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60"
              }`}
            >
              <div className="flex items-center gap-4">
                <img
                  src={avatarUrl}
                  alt={visitorName}
                  className="w-12 h-12 rounded-full object-cover border border-blue-200 dark:border-gray-700 shrink-0"
                />
                <div>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-bold">{visitorName}</span> just visited your profile{" "}
                    {a.actor_id && (
                      <Link
                        to={profilePath}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVisitorClick(a);
                        }}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline ml-1"
                      >
                        "view profile"
                      </Link>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>

              {/* Right Side Action Button */}
              {a.actor_id && (
                <Link
                  to={profilePath}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVisitorClick(a);
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl transition shrink-0 inline-block text-center shadow-sm"
                >
                  View Profile 👤
                </Link>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}