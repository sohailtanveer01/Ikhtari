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

    const { matchId, answers } = await req.json();

    if (!matchId || !Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: "matchId and answers are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the match record
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, user1, user2, initiated_by")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is part of this match and is the initiator
    if (match.user1 !== user.id && match.user2 !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (match.initiated_by !== user.id) {
      return new Response(JSON.stringify({ error: "Gate does not apply to you" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine other user (the acceptor)
    const otherUserId = match.user1 === user.id ? match.user2 : match.user1;

    // Get valid question IDs for the acceptor
    const { data: validQuestions } = await supabase
      .from("intent_questions")
      .select("id")
      .eq("user_id", otherUserId);

    const validIds = new Set((validQuestions || []).map((q: any) => q.id));

    // Filter answers to only valid question IDs
    const answersToInsert = answers
      .filter((a: any) => a.question_id && validIds.has(a.question_id) && a.answer_text?.trim())
      .map((a: any) => ({
        match_id: matchId,
        question_id: a.question_id,
        answerer_id: user.id,
        answer_text: a.answer_text.trim(),
      }));

    if (answersToInsert.length === 0) {
      return new Response(JSON.stringify({ error: "No valid answers provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert answers
    const { error: insertError } = await supabase
      .from("match_intent_answers")
      .upsert(answersToInsert, { onConflict: "match_id,question_id,answerer_id" });

    if (insertError) {
      console.error("Error inserting gate answers:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save answers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get submitter's name to notify acceptor
    const { data: submitterProfile } = await supabase
      .from("users")
      .select("first_name, name")
      .eq("id", user.id)
      .single();
    const submitterName = submitterProfile?.first_name || submitterProfile?.name || "Someone";

    // Notify the acceptor to review the answers
    await sendPushToUser(supabase, otherUserId, {
      title: "Answers ready for review!",
      body: `${submitterName} answered your questions. Open the chat to review and approve.`,
      data: { type: "gate_answers_submitted", matchId },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error in submit-chat-gate-answers:", err);
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
