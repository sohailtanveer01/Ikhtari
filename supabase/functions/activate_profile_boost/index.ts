import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtiar.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const minutesRaw = typeof body?.minutes === "number" ? body.minutes : 30;
    const minutes = Math.max(1, Math.min(60, Math.floor(minutesRaw))); // clamp 1..60

    // --- DAILY BOOST LIMIT CHECK (1 per day) ---
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { count: dailyBoostCount, error: boostCountErr } = await supabaseClient
      .from("profile_boosts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", today.toISOString());

    if (boostCountErr) {
      console.error("Error checking daily boost count:", boostCountErr);
    } else if (dailyBoostCount && dailyBoostCount >= 1) {
      const now = new Date();
      const tonight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
      const diffMs = tonight.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const timeRemaining = `${hours}h:${minutes}m`;

      return new Response(JSON.stringify({
        error: "DAILY_LIMIT_REACHED",
        message: `You have used your boost for today. You can try again after ${timeRemaining}.`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // ------------------------------------------

    // If a boost is already active, return it
    const { data: existing, error: existingErr } = await supabaseClient
      .from("profile_boosts")
      .select("id, user_id, started_at, expires_at")
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      console.error("Error checking existing boost:", existingErr);
    } else if (existing) {
      return new Response(JSON.stringify({ boost: existing }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const expiresAt = addMinutes(now, minutes);


    const { data: created, error: insertErr } = await supabaseClient
      .from("profile_boosts")
      .insert({
        user_id: user.id,
        started_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id, user_id, started_at, expires_at")
      .single();

    // If we raced another request, the exclusion constraint will reject one insert.
    // In that case, just return the active boost.
    if (insertErr) {
      console.error("Error creating boost (maybe race):", insertErr);
      const { data: after, error: afterErr } = await supabaseClient
        .from("profile_boosts")
        .select("id, user_id, started_at, expires_at")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (afterErr || !after) {
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ boost: after }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ boost: created }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in activate_profile_boost:", error);
    return new Response(JSON.stringify({ error: (error as any)?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


