import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}));
      const { price, userId, description, pay_currency, is_card } = body;
      const apiKey = Deno.env.get('NOWPAYMENTS_API_KEY');

      // 🔥 Safety Lock: Minimum price ko safely $20 par lock kiya hai
      const requestedPrice = Number(price) || 20.00;
      const safePrice = Math.max(requestedPrice, 20.00);

      // Agar card payment hai, toh NOWPayments ke liye pay_currency 'usd' ya card-supported currency hogi
      let selectedPayCurrency = pay_currency || "usdttrc20";
      
      if (is_card) {
        // NOWPayments par fiat/card checkout ke liye aam taur par USD ya unka fiat option use hota hai
        selectedPayCurrency = "usd"; 
      }

    const payload = {
  price_amount: safePrice,
  price_currency: "USD",
  // pay_currency hata dein taaki user ko gateway par options mil sakein (agar account par enabled ho)
  ipn_callback_url: "https://stoxatobfqrnyfbporkg.supabase.co/functions/v1/nowpayments-ipn",
  order_id: userId ? userId.toString() : "guest_order",
  order_description: description || "Coins Purchase"
};

      const npResponse = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey ?? '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await npResponse.json();
      
      if (!npResponse.ok) {
        console.error("NOWPayments API Error:", data);
        return new Response(JSON.stringify({ error: data.message || "NOWPayments error", details: data }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error("Function Catch Error:", err);
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { 
    status: 405, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
});