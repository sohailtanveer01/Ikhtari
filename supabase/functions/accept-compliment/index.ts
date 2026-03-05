import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtiar.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Expo push helper
async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  if (!tokens || tokens.length === 0) return;
  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) console.error("Expo push error:", res.status, json);
  } catch (e) {
    console.error("Expo push exception:", e);
  }
}

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

    // Use the service role key to have admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { complimentId } = await req.json();

    if (!complimentId) {
      return new Response(
        JSON.stringify({ error: "complimentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the compliment
    const { data: compliment, error: complimentError } = await supabaseAdmin
      .from("compliments")
      .select("*")
      .eq("id", complimentId)
      .single();

    if (complimentError || !compliment) {
      return new Response(
        JSON.stringify({ error: "Compliment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (compliment.recipient_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You can only accept compliments sent to you" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (compliment.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Compliment has already been ${compliment.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create match
    const user1 = user.id < compliment.sender_id ? user.id : compliment.sender_id;
    const user2 = user.id > compliment.sender_id ? user.id : compliment.sender_id;

    let matchId: string;
    
    // Check if match already exists
    const { data: existingMatch } = await supabaseAdmin
      .from("matches")
      .select("*")
      .or(`and(user1.eq.${user1},user2.eq.${user2}),and(user1.eq.${user2},user2.eq.${user1})`)
      .maybeSingle();

    if (existingMatch) {
      // Match already exists, use it
      matchId = existingMatch.id;
    } else {
      // Create new match — compliment sender liked first
      const { data: newMatch, error: matchError } = await supabaseAdmin
        .from("matches")
        .insert({ user1, user2, initiated_by: compliment.sender_id })
        .select()
        .single();

      if (matchError) {
        console.error("❌ Error creating match:", matchError);
        return new Response(
          JSON.stringify({ error: "Failed to create match", details: matchError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      matchId = newMatch.id;
    }

    // Update compliment status
    await supabaseAdmin
      .from("compliments")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", complimentId);

    // Send push notification to the compliment sender
    try {
      const { data: senderProfile } = await supabaseAdmin
        .from("users")
        .select("first_name, name")
        .eq("id", user.id) // The user accepting is the one whose name should appear
        .single();
      const accepterName = senderProfile?.first_name || senderProfile?.name || "Someone";

      const { data: tokenRows } = await supabaseAdmin
        .from("user_push_tokens")
        .select("token")
        .eq("user_id", compliment.sender_id)
        .eq("revoked", false)
        .order("last_seen_at", { ascending: false })
        .limit(5);

      const tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
      if (tokens.length > 0) {
        await sendExpoPush(tokens, {
          title: "Compliment Accepted! 💖",
          body: `${accepterName} accepted your compliment. It's a match!`,
          data: { type: "match", matchId: matchId },
        });
      }
    } catch (e) {
      console.error("Push notification failed:", e);
    }

    // Create the initial message in the chat (only if it doesn't already exist)
    // Check if a message with this compliment text already exists for this match
    const { data: existingMessage } = await supabaseAdmin
      .from("messages")
      .select("id")
      .eq("match_id", matchId)
      .eq("sender_id", compliment.sender_id)
      .eq("content", compliment.message)
      .maybeSingle();

    if (!existingMessage && matchId) {
      const { error: messageError } = await supabaseAdmin.from("messages").insert({
        match_id: matchId,
        sender_id: compliment.sender_id,
        content: compliment.message,
        message_type: "text",
      });
      
      if (messageError) {
        console.error("⚠️ Error inserting compliment message:", messageError);
        // Don't fail the request if message insertion fails
      } else {
      }
    } else if (existingMessage) {
    }


    return new Response(
      JSON.stringify({ success: true, matchId, message: "Compliment accepted and match created" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in accept-compliment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

