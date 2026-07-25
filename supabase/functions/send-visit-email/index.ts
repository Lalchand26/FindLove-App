import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight Request Handle करना
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log("Received body:", body)

    const { visitorId, targetUserId, visitorName, type, email, resetLink } = body

    // Environment Variables
    const EMAIL_USER = Deno.env.get('EMAIL_USER') || 'anishmj701@gmail.com'
    const EMAIL_PASS = Deno.env.get('EMAIL_PASS') || Deno.env.get('BREVO_API_KEY')!
    const APP_URL = Deno.env.get('APP_URL') || 'https://find-love-app-theta.vercel.app'

    // =============================================================
    // 1. RESET PASSWORD EMAIL (Aapka Exact Layout & Blue Button)
    // =============================================================
    if (type === 'reset_password') {
      if (!email) {
        throw new Error("Email address is required for password reset")
      }

      const finalResetLink = resetLink || `${APP_URL}/reset-password`

      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': EMAIL_PASS,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'CityCrossed', email: EMAIL_USER },
          to: [{ email: email }],
          subject: 'Reset your password',
          htmlContent: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px; margin: 0; color: #1f2937;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
                
                <h2 style="font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 16px; color: #111827;">
                  Reset your password
                </h2>
                
                <p style="font-size: 15px; line-height: 1.5; margin-bottom: 20px; color: #374151;">
                  We received a request to reset your password. Follow the link below to choose a new one.
                </p>

                <!-- Blue Color Clickable Reset Password Link / Button -->
                <div style="margin-bottom: 24px;">
                  <a href="${finalResetLink}" 
                     target="_blank" 
                     style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none; display: inline-block;">
                    Reset password
                  </a>
                </div>

                <p style="font-size: 14px; line-height: 1.5; margin: 0; color: #6b7280;">
                  If you didn't request this, you can safely ignore this email.
                </p>

              </div>
            </body>
            </html>
          `,
        }),
      })

      const brevoResult = await brevoRes.json()
      if (!brevoRes.ok) throw new Error(brevoResult.message || "Failed to send reset email")

      return new Response(
        JSON.stringify({ success: true, message: "Reset password email sent successfully" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =============================================================
    // 2. PROFILE VISIT EMAIL (24-Hour Rate Limit Active)
    // =============================================================
    if (!visitorId || !targetUserId) {
      throw new Error(`Missing required fields: visitorId=${visitorId}, targetUserId=${targetUserId}`)
    }

    if (visitorId === targetUserId) {
      return new Response(
        JSON.stringify({ success: true, message: "Self-visit ignored" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let cleanName = visitorName || 'Someone'
    if (cleanName.includes('@')) {
      cleanName = cleanName.split('@')[0]
    }
    cleanName = cleanName.trim()

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 24-Hour Check for Profile Visit
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: recentVisits, error: checkError } = await supabase
      .from('profile_visits')
      .select('id, created_at')
      .eq('visitor_id', visitorId)
      .eq('visited_id', targetUserId)
      .gte('created_at', twentyFourHoursAgo)
      .limit(1)

    if (checkError) console.error("Check visit error:", checkError.message)

    if (recentVisits && recentVisits.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          message: "Notification skipped: Already sent in last 24 hours" 
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert DB records
    await supabase.from('profile_visits').insert([{ visitor_id: visitorId, visited_id: targetUserId }])
    await supabase.from('notifications').insert([
      {
        user_id: targetUserId,
        actor_id: visitorId,
        type: 'profile_visit',
        title: 'New Profile Visit',
        message: `${cleanName} just visited your profile "view profile"`
      }
    ])

    // Send Profile Visit Email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', targetUserId)
      .single()

    let targetEmail = profile?.email

    if (!targetEmail) {
      const { data: userData } = await supabase.auth.admin.getUserById(targetUserId)
      targetEmail = userData?.user?.email
    }

    if (targetEmail) {
      const profileLink = `${APP_URL}/dashboard?user=${visitorId}`

      await fetch('https://api.brevo.com/v3/smtp/email', {
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
    }

    return new Response(
      JSON.stringify({ success: true, message: "Visit recorded and email sent successfully" }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})