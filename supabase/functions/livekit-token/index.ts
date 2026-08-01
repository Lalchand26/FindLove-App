import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken, RoomServiceClient } from "npm:livekit-server-sdk@2.3.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("📥 Received request body:", JSON.stringify(body));

    const { roomName, participantName, visitorId, targetUserId, visitorName, isHost } = body;

    if (!roomName || !participantName) {
      return new Response(
        JSON.stringify({ error: "Missing roomName or participantName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    let livekitHost = Deno.env.get("LIVEKIT_HOST"); // e.g. https://your-project.livekit.cloud
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const SENDER_EMAIL = "anishmj701@gmail.com";
    const SITE_URL = Deno.env.get("SITE_URL") || "https://www.citycrossed.com";

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "Missing LiveKit Credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔴 1. CHECK IF ROOM IS ACTIVE (Sirf viewer/joiner ke liye check karein, Host ke liye nahi)
    if (!isHost && livekitHost) {
      try {
        // LiveKit Host Formatting Fix (ensure http/https prefix)
        if (!livekitHost.startsWith("http://") && !livekitHost.startsWith("https://")) {
          livekitHost = `https://${livekitHost}`;
        }

        const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
        const activeRooms = await roomService.listRooms([roomName]);
        
        const targetRoom = activeRooms.find((r) => r.name === roomName);

        // Agar room exist nahi karta ya usme koi host/participant nahi hai
        if (!targetRoom || targetRoom.numParticipants === 0) {
          console.warn(`⚠️ Room ${roomName} is not active currently.`);
          return new Response(
            JSON.stringify({ error: "No active live stream found for this room", isLive: false }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (lkErr: any) {
        console.error("LiveKit room verification error:", lkErr.message);
        // Fallback: Agar LiveKit Check fail hota hai (API error), toh return 404 for viewer
        return new Response(
          JSON.stringify({ error: "Stream unavailable or host offline", isLive: false }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- VISIT LOGGING & BREVO EMAIL LOGIC ---
    const effectiveVisitorId = visitorId || participantName;

    if (supabaseUrl && supabaseServiceKey && targetUserId && effectiveVisitorId !== targetUserId) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const displayVisitor = visitorName || participantName || "Someone";

        if (visitorId) {
          await supabaseAdmin.from('profile_visits').insert({ visitor_id: visitorId, visited_id: targetUserId });
          console.log("✅ Visit logged");
        }

        await supabaseAdmin.from('notifications').insert({
          user_id: targetUserId,
          type: 'profile_visit',
          title: 'New Profile Visit',
          message: `${displayVisitor} visited your profile.`,
          read: false
        });
        console.log("✅ In-app notification created");

        const { data: targetProfile, error: profileError } = await supabaseAdmin
          .from('profiles').select('email, full_name').eq('id', targetUserId).single();

        if (profileError) console.error("Profile fetch error:", profileError);

        if (targetProfile?.email && brevoApiKey) {
          console.log(`📧 Attempting Brevo email to: ${targetProfile.email}`);

          const profileLink = visitorId 
            ? `${SITE_URL}/profile/${visitorId}` 
            : `${SITE_URL}`;

          const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "api-key": brevoApiKey,
            },
            body: JSON.stringify({
              sender: { name: "CityCrossed", email: SENDER_EMAIL },
              to: [{ email: targetProfile.email, name: targetProfile.full_name || "User" }],
              subject: "👀 Someone viewed your profile on CityCrossed!",
              htmlContent: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                </head>
                <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
                    <tr>
                      <td style="padding: 24px;">
                        <h2 style="color: #e11d48; margin-top: 0;">Hello ${targetProfile.full_name || 'User'},</h2>
                        <p style="font-size: 16px; color: #334155; line-height: 1.5;">
                          <strong style="color: #0f172a;">${displayVisitor}</strong> just visited your profile on <strong>CityCrossed</strong>.
                        </p>
                        <p style="font-size: 14px; color: #64748b;">
                          Log in now to check them out and start a conversation!
                        </p>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                          <tr>
                            <td align="center">
                              <a href="${profileLink}" 
                                 target="_blank"
                                 style="background-color: #e11d48; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 16px; display: inline-block;">
                                View Profile 👤
                              </a>
                            </td>
                          </tr>
                        </table>

                        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                          Direct Link:<br/>
                          <a href="${profileLink}" style="color: #e11d48; word-break: break-all;">${profileLink}</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
              `
            }),
          });

          const resData = await emailResponse.json();
          if (emailResponse.ok) {
            console.log("✅ Brevo email sent successfully!", resData.messageId);
          } else {
            console.error("❌ Brevo Error Details:", JSON.stringify(resData));
          }
        }
      } catch (bgErr: any) {
        console.error("💥 Email trigger exception:", bgErr.message);
      }
    }

    // --- LIVEKIT TOKEN GENERATION ---
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: "24h",
    });

    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
    const token = await at.toJwt();

    return new Response(JSON.stringify({ token, isLive: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (err: any) {
    console.error("Function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});