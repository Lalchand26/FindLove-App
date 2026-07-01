import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// npm package ko Deno mein use karne ka standard tareeqa
import { RtcTokenBuilder, RtcRole } from 'npm:agora-access-token'; 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS Preflight request ko handle karna (Frontend ko block hone se bachata hai)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { channelName, uid = 0 } = await req.json();

    // 🚨 YAHAN DHYAN DEIN: Ye dono keys Supabase ke secrets mein honi chahiye!
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      throw new Error('Backend Error: Agora App ID ya Certificate missing hai!');
    }

    if (!channelName) {
      throw new Error('Backend Error: Channel Name missing hai!');
    }

    // Token 1 ghante (3600 seconds) ke liye valid rahega
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Token Generate ho raha hai
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    // Frontend ko token bhej do
    return new Response(JSON.stringify({ token: token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Agar koi crash ho toh frontend ko specific error bhejo
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});