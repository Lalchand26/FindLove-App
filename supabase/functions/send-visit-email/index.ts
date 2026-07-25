import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log("Received body:", body)

    const { visitorId, targetUserId, visitorName } = body

    if (!visitorId || !targetUserId) {
      throw new Error(`Missing required fields: visitorId=${visitorId}, targetUserId=${targetUserId}`)
    }

    // Self-visit ignore karne ke liye
    if (visitorId === targetUserId) {
      return new Response(
        JSON.stringify({ success: true, message: "Self-visit ignored" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Visitor Name Cleaning
    let cleanName = visitorName || 'Someone';
    if (cleanName.includes('@')) {
      cleanName = cleanName.split('@')[0];
    }
    cleanName = cleanName.trim();

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!
    
    // Secrets se Brevo keys/User/App URL load karna
    const EMAIL_USER = Deno.env.get('EMAIL_USER') || 'anishmj701@gmail.com'
    const EMAIL_PASS = Deno.env.get('EMAIL_PASS') || Deno.env.get('BREVO_API_KEY')!
    const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173'

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // -------------------------------------------------------------
    // 2. RATE LIMITING CHECK (24-Hour Limit) ⏱️
    // -------------------------------------------------------------
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentVisits, error: checkError } = await supabase
      .from('profile_visits')
      .select('id, created_at')
      .eq('visitor_id', visitorId)
      .eq('visited_id', targetUserId)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)

    if (checkError) {
      console.error("Check visit error:", checkError.message)
    }

    // Agar pichle 24 hours ke andar visit record exist karta hai:
    if (recentVisits && recentVisits.length > 0) {
      console.log(`Visit notification skipped: ${cleanName} already visited in last 24h.`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          message: "Notification skipped: Already sent in last 24 hours" 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -------------------------------------------------------------
    // 3. Insert into 'profile_visits' table
    // -------------------------------------------------------------
    const { error: dbError } = await supabase
      .from('profile_visits')
      .insert([
        { 
          visitor_id: visitorId, 
          visited_id: targetUserId 
        }
      ])

    if (dbError) {
      console.error("DB Visit Insert Error:", dbError.message)
    }

    // -------------------------------------------------------------
    // 4. Insert into 'notifications' table (App Notification)
    // -------------------------------------------------------------
    const { error: notifError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: targetUserId,
          actor_id: visitorId,
          type: 'profile_visit',
          title: 'New Profile Visit',
          message: `${cleanName} just visited your profile "view profile"`
        }
      ])

    if (notifError) {
      console.error("Notif Error:", notifError.message)
    }

    // -------------------------------------------------------------
    // 5. Send Email via Brevo API 📩
    // -------------------------------------------------------------
    let emailSent = false;
    let emailErrorMsg = null;

    try {
      // Target user ka email DB se fetching logic
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', targetUserId)
        .single()

      let targetEmail = profile?.email

      // Agar profiles table me email na mile toh Auth System se fetch karein
      if (!targetEmail) {
        const { data: userData } = await supabase.auth.admin.getUserById(targetUserId)
        targetEmail = userData?.user?.email
      }

      if (targetEmail) {
        // Visitor Profile Redirect Link
        const profileLink = `${APP_URL}/dashboard?user=${visitorId}`

        // Brevo REST API Call
        const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': EMAIL_PASS,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'CityCrossed', email: EMAIL_USER },
            to: [{ email: targetEmail }],
            subject: `❤️ ${cleanName} visited your profile!`,
            htmlContent: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <p style="font-size: 16px; line-height: 1.5; margin: 0;">
                  <strong>${cleanName}</strong> just visited your profile 
                  <a href="${profileLink}" style="color: #2563eb; text-decoration: underline; font-weight: bold; margin-left: 4px;">
                    "view profile"
                  </a>
                </p>
              </div>
            `,
          }),
        })

        const brevoResult = await brevoRes.json()
        if (brevoRes.ok) {
          emailSent = true;
          console.log("Email sent via Brevo successfully:", brevoResult);
        } else {
          emailErrorMsg = brevoResult.message || JSON.stringify(brevoResult);
          console.error("Brevo API Error:", brevoResult);
        }
      } else {
        console.error("Target User email not found in DB.");
      }
    } catch (e: any) {
      console.error("Failed to send email:", e.message)
      emailErrorMsg = e.message;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Visit & Notification recorded successfully",
        emailSent: emailSent,
        emailError: emailErrorMsg,
        formattedName: cleanName 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error("Function Error:", err.message)
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})