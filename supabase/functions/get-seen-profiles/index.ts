import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtari.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service role client — bypasses RLS for seen-profile reads
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all seen profile IDs for this user (admin client bypasses RLS)
    const { data: seenRows, error: seenError } = await supabaseAdmin
      .from("discover_seen_profiles")
      .select("profile_id, seen_at")
      .eq("user_id", user.id)
      .order("seen_at", { ascending: false });

    if (seenError) {
      return new Response(
        JSON.stringify({ error: seenError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!seenRows || seenRows.length === 0) {
      return new Response(
        JSON.stringify({ profiles: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const seenProfileIds = seenRows.map((r: any) => r.profile_id);
    const seenAtMap = new Map(seenRows.map((r: any) => [r.profile_id, r.seen_at]));

    // Fetch profile data for seen profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("users")
      .select("id, first_name, last_name, name, photos, dob, city, country, profession, bio, account_active")
      .in("id", seenProfileIds)
      .eq("account_active", true);

    if (profilesError) {
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attach seen_at and preserve order (most recently seen first)
    const enriched = (profiles || [])
      .map((p: any) => ({ ...p, seen_at: seenAtMap.get(p.id) }))
      .sort((a: any, b: any) => new Date(b.seen_at).getTime() - new Date(a.seen_at).getTime());

    return new Response(
      JSON.stringify({ profiles: enriched }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in get-seen-profiles:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
