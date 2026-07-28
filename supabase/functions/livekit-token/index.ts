import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk@2.3.0";
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

    const { roomName, participantName, visitorId, targetUserId, visitorName } = body;

    if (!roomName || !participantName) {
      return new Response(
        JSON.stringify({ error: "Missing roomName or participantName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const SENDER_EMAIL = "anishmj701@gmail.com"; // ✅ VERIFIED EMAIL DAAL DIYA

    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: "Missing LiveKit Credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- VISIT LOGGING & BREVO EMAIL LOGIC ---
    if (supabaseUrl && supabaseServiceKey && visitorId && targetUserId && visitorId !== targetUserId) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const displayVisitor = visitorName || participantName || "Someone";

        // 1. Log visit in DB
        await supabaseAdmin.from('profile_visits').insert({ visitor_id: visitorId, visited_id: targetUserId });
        console.log("✅ Visit logged");

        // 2. Insert Notification in DB - APP NOTIFICATION
        await supabaseAdmin.from('notifications').insert({
          user_id: targetUserId,
          type: 'profile_visit',
          title: 'New Profile Visit',
          message: `${displayVisitor} visited your profile.`,
          read: false
        });
        console.log("✅ In-app notification created");

        // 3. Fetch Target User's Email
        const { data: targetProfile, error: profileError } = await supabaseAdmin
          .from('profiles').select('email, full_name').eq('id', targetUserId).single();

        if (profileError) console.error("Profile fetch error:", profileError);

        if (targetProfile?.email && brevoApiKey) {
          console.log(`📧 Attempting Brevo email to: ${targetProfile.email}`);

          const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "api-key": brevoApiKey,
            },
            body: JSON.stringify({
              sender: { name: "CityCrossed", email: SENDER_EMAIL }, // ✅ Ab ye verified hai
              to: [{ email: targetProfile.email, name: targetProfile.full_name || "User" }],
              subject: "👀 Someone viewed your profile on CityCrossed!",
              htmlContent: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                  <h2>Hello ${targetProfile.full_name || 'User'},</h2>
                  <p><strong>${displayVisitor}</strong> just visited your profile on CityCrossed.</p>
                  <p>Log in now to check them out and start a conversation!</p>
                  <br/>
                  <a href="https://citycrossed.com" style="background: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Profile</a>
                </div>
              `
            }),
          });

          const resData = await emailResponse.json();
          if (emailResponse.ok) {
            console.log("✅ Brevo email sent successfully!", resData.messageId);
          } else {
            console.error("❌ Brevo Error Details:", JSON.stringify(resData));
          }
        } else {
          if (!brevoApiKey) console.warn("⚠️ BREVO_API_KEY secret missing!");
          if (!targetProfile?.email) console.warn("⚠️ Target user profile has no email!");
        }
      } catch (bgErr: any) {
        console.error("💥 Email trigger exception:", bgErr.message);
      }
    }

    // --- LIVEKIT TOKEN GENERATION - FEATURE INTACT ---
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      ttl: "24h",
    });

    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
    const token = await at.toJwt();

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (err: any) {
    console.error("Function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});