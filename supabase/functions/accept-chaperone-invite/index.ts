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

    const callerEmail = user.email?.toLowerCase();
    if (!callerEmail) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure a public.users row exists BEFORE updating chaperone_links,
    // because chaperone_id has a FK → public.users(id).
    // gender/first_name/last_name all have DEFAULT '' so this insert is safe.
    // The BEFORE INSERT trigger auto-fills email from auth.users.
    const { error: upsertError } = await serviceClient
      .from("users")
      .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

    if (upsertError) {
      console.error("Upsert users error:", upsertError.message);
      // Non-fatal if the row already exists under a different conflict path
    }

    // Find all pending links where invite_email matches caller's email.
    // Select only "id" so the query works even if expires_at column hasn't
    // been added yet by the migration.
    const { data: pendingLinks, error: fetchError } = await serviceClient
      .from("chaperone_links")
      .select("id")
      .eq("invite_email", callerEmail)
      .eq("status", "pending");

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingLinks || pendingLinks.length === 0) {
      return new Response(
        JSON.stringify({ accepted_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const linkIds = pendingLinks.map((l: any) => l.id);

    // Accept all pending links
    const { error: updateError } = await serviceClient
      .from("chaperone_links")
      .update({
        chaperone_id: user.id,
        status: "active",
        accepted_at: new Date().toISOString(),
      })
      .in("id", linkIds);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ accepted_count: linkIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in accept-chaperone-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
