import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtiar.app",
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
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ward_id } = await req.json();
    if (!ward_id) {
      return new Response(JSON.stringify({ error: "Missing ward_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify caller is an active chaperone for this ward
    const { data: link } = await serviceClient
      .from("chaperone_links")
      .select("id")
      .eq("chaperone_id", user.id)
      .eq("user_id", ward_id)
      .eq("status", "active")
      .maybeSingle();

    if (!link) {
      return new Response(JSON.stringify({ error: "Not authorized as wali for this ward" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch interest requests received by the ward (people who liked them)
    const { data: interests } = await serviceClient
      .from("interest_requests")
      .select("id, sender_id, status, created_at")
      .eq("recipient_id", ward_id)
      .order("created_at", { ascending: false });

    // Enrich with sender profiles
    const enriched = await Promise.all(
      (interests || []).map(async (req: any) => {
        const { data: profile } = await serviceClient
          .from("users")
          .select("id, first_name, last_name, name, main_photo, age, city, country")
          .eq("id", req.sender_id)
          .single();
        return { ...req, sender_profile: profile || null };
      })
    );

    return new Response(JSON.stringify({ interests: enriched }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in get-chaperone-ward-interests:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
