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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { ward_id, match_id } = await req.json();
    if (!ward_id || !match_id) {
      return new Response(
        JSON.stringify({ error: "Missing ward_id or match_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Verify caller has active chaperone link for the ward
    const { data: link, error: linkError } = await serviceClient
      .from("chaperone_links")
      .select("id")
      .eq("chaperone_id", user.id)
      .eq("user_id", ward_id)
      .eq("status", "active")
      .single();

    if (linkError || !link) {
      return new Response(
        JSON.stringify({ error: "No active chaperone link for this ward" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the match belongs to the ward
    const { data: match, error: matchError } = await serviceClient
      .from("matches")
      .select("*")
      .eq("id", match_id)
      .or(`user1.eq.${ward_id},user2.eq.${ward_id}`)
      .single();

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: "Match not found or does not belong to ward" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otherUserId = match.user1 === ward_id ? match.user2 : match.user1;

    // Fetch other user's profile
    const { data: otherUser } = await serviceClient
      .from("users")
      .select("id, first_name, last_name, name, main_photo")
      .eq("id", otherUserId)
      .single();

    // Fetch ward's profile
    const { data: wardProfile } = await serviceClient
      .from("users")
      .select("id, first_name, last_name, name, main_photo")
      .eq("id", ward_id)
      .single();

    // Fetch messages — read-only, no marking as read
    const { data: messages, error: messagesError } = await serviceClient
      .from("messages")
      .select(`
        *,
        reply_to:reply_to_id (
          id,
          sender_id,
          content,
          image_url,
          voice_url
        )
      `)
      .eq("match_id", match_id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      return new Response(
        JSON.stringify({ error: messagesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        messages: messages || [],
        other_user: otherUser,
        ward_profile: wardProfile,
        ward_id,
        match_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-chaperone-messages:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
