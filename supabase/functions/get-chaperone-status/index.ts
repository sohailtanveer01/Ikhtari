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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, {
      auth: { persistSession: false },
    });

    // Fetch my_chaperone: the active chaperone link where caller is the ward
    // Exclude expired pending invites
    const now = new Date().toISOString();
    const { data: myChaperone } = await serviceClient
      .from("chaperone_links")
      .select("id, invite_email, status, chaperone_id, created_at, accepted_at, expires_at, last_accessed_at")
      .eq("user_id", user.id)
      .in("status", ["pending", "active"])
      .or(`status.eq.active,expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Enrich with chaperone profile if active
    let myChaperoneEnriched = myChaperone;
    if (myChaperone?.chaperone_id) {
      const { data: chaperoneProfile } = await serviceClient
        .from("users")
        .select("id, first_name, last_name, name, main_photo")
        .eq("id", myChaperone.chaperone_id)
        .single();
      if (chaperoneProfile) {
        myChaperoneEnriched = { ...myChaperone, chaperone_profile: chaperoneProfile };
      }
    }

    // Fetch wardships: links where caller is the chaperone (pending or active), excluding expired pending
    const { data: wardships } = await serviceClient
      .from("chaperone_links")
      .select("id, user_id, invite_email, status, created_at, accepted_at, expires_at, last_accessed_at, wali_name, relationship")
      .eq("chaperone_id", user.id)
      .in("status", ["pending", "active"])
      .or(`status.eq.active,expires_at.is.null,expires_at.gt.${now}`)
      .order("created_at", { ascending: false });

    // Also fetch pending links where invite_email matches caller's email (in case they were invited before signup)
    const callerEmail = user.email?.toLowerCase();
    let emailPendingLinks: any[] = [];
    if (callerEmail) {
      const { data: emailLinks } = await serviceClient
        .from("chaperone_links")
        .select("id, user_id, invite_email, status, created_at, accepted_at, expires_at, last_accessed_at, wali_name, relationship")
        .eq("invite_email", callerEmail)
        .eq("status", "pending")
        .or(`expires_at.is.null,expires_at.gt.${now}`);
      emailPendingLinks = emailLinks || [];
    }

    // Enrich wardships with ward profiles
    const enrichedWardships = await Promise.all(
      (wardships || []).map(async (w: any) => {
        const { data: wardProfile } = await serviceClient
          .from("users")
          .select("id, first_name, last_name, name, main_photo")
          .eq("id", w.user_id)
          .single();
        return { ...w, ward_profile: wardProfile || null };
      })
    );

    // Enrich email-based pending links with ward profiles
    const enrichedEmailLinks = await Promise.all(
      emailPendingLinks.map(async (w: any) => {
        const { data: wardProfile } = await serviceClient
          .from("users")
          .select("id, first_name, last_name, name, main_photo")
          .eq("id", w.user_id)
          .single();
        return { ...w, ward_profile: wardProfile || null };
      })
    );

    // Merge wardships (deduplicate by id)
    const allWardships = [...enrichedWardships];
    for (const el of enrichedEmailLinks) {
      if (!allWardships.find((w: any) => w.id === el.id)) {
        allWardships.push(el);
      }
    }

    return new Response(
      JSON.stringify({
        my_chaperone: myChaperoneEnriched || null,
        wardships: allWardships,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-chaperone-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
