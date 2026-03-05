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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { matchId } = await req.json();
    if (!matchId) {
      return new Response(JSON.stringify({ error: "matchId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the match record
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, user1, user2, initiated_by, gate_approved_at")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is part of the match
    if (match.user1 !== user.id && match.user2 !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the acceptor (NOT the initiator) can approve
    if (match.initiated_by === user.id) {
      return new Response(JSON.stringify({ error: "You cannot approve your own answers" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already approved — idempotent
    if (match.gate_approved_at) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set gate_approved_at on the match
    const { error: updateError } = await supabase
      .from("matches")
      .update({ gate_approved_at: new Date().toISOString() })
      .eq("id", matchId);

    if (updateError) {
      console.error("Error approving gate:", updateError);
      return new Response(JSON.stringify({ error: "Failed to approve" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get approver's name to notify the initiator
    const { data: approverProfile } = await supabase
      .from("users")
      .select("first_name, name")
      .eq("id", user.id)
      .single();
    const approverName = approverProfile?.first_name || approverProfile?.name || "Someone";

    // Notify the initiator that they can now chat
    await sendPushToUser(supabase, match.initiated_by, {
      title: "You can now chat!",
      body: `${approverName} reviewed your answers and approved the chat. Say hello!`,
      data: { type: "gate_approved", matchId },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error in approve-chat-gate:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendPushToUser(
  supabase: any,
  userId: string,
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  try {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("notifications_enabled")
      .eq("user_id", userId)
      .single();

    if (prefs?.notifications_enabled === false) return;

    const { data: tokenRows } = await supabase
      .from("user_push_tokens")
      .select("token")
      .eq("user_id", userId)
      .eq("revoked", false)
      .order("last_seen_at", { ascending: false })
      .limit(5);

    const tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
    if (tokens.length === 0) return;

    const messages = tokens.map((to: string) => ({
      to,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.error("Push notification failed:", e);
  }
}
