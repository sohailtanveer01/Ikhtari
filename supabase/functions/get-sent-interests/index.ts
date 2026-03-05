import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtiar.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders,
      });
    }

    // Get all sent interest requests
    const { data: requests, error: requestsError } = await supabase
      .from("interest_requests")
      .select("*")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false });

    if (requestsError) {
      return new Response(JSON.stringify({ error: requestsError.message }), {
        status: 500, headers: corsHeaders,
      });
    }

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({ interests: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient profiles
    const recipientIds = requests.map((r: any) => r.recipient_id);
    const { data: recipientProfiles } = await supabase
      .from("users")
      .select("id, first_name, last_name, name, photos, dob, city, country")
      .in("id", recipientIds);

    const profileMap = new Map<string, any>();
    if (recipientProfiles) {
      recipientProfiles.forEach((p: any) => profileMap.set(p.id, p));
    }

    // Build response
    const interests = requests.map((r: any) => ({
      id: r.id,
      recipient_id: r.recipient_id,
      status: r.status,
      match_id: r.match_id,
      created_at: r.created_at,
      reviewed_at: r.reviewed_at,
      recipient_profile: profileMap.get(r.recipient_id) || {},
    }));

    return new Response(
      JSON.stringify({ interests }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});
