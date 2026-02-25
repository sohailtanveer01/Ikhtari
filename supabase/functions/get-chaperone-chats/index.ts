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

    const { ward_id } = await req.json();
    if (!ward_id) {
      return new Response(
        JSON.stringify({ error: "Missing ward_id" }),
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

    // Verify caller has an active chaperone link for this ward
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

    // Fetch all matches for the ward
    const { data: matches, error: matchesError } = await serviceClient
      .from("matches")
      .select("*")
      .or(`user1.eq.${ward_id},user2.eq.${ward_id}`)
      .order("created_at", { ascending: false });

    if (matchesError) {
      return new Response(
        JSON.stringify({ error: matchesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chats = await Promise.all(
      (matches || []).map(async (match: any) => {
        const otherUserId = match.user1 === ward_id ? match.user2 : match.user1;

        const { data: otherUser } = await serviceClient
          .from("users")
          .select("id, first_name, last_name, name, main_photo")
          .eq("id", otherUserId)
          .single();

        // Get last message
        const { data: lastMessages } = await serviceClient
          .from("messages")
          .select("content, image_url, created_at, sender_id")
          .eq("match_id", match.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMessage = lastMessages?.[0] || null;

        return {
          match_id: match.id,
          other_user: otherUser,
          last_message: lastMessage,
          created_at: match.created_at,
        };
      })
    );

    return new Response(
      JSON.stringify({ chats, ward_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-chaperone-chats:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
