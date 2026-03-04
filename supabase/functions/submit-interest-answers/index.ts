import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtari.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

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
    if (!res.ok) console.error("Expo push error:", res.status);
  } catch (e) {
    console.error("Expo push exception:", e);
  }
}

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
    if (tokens.length > 0) await sendExpoPush(tokens, payload);
  } catch (e) {
    console.error("Push notification failed:", e);
  }
}

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

    const body = await req.json();
    const { interest_request_id, answers } = body;

    if (!interest_request_id || !Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Get the interest request
    const { data: request, error: requestError } = await supabase
      .from("interest_requests")
      .select("*")
      .eq("id", interest_request_id)
      .single();

    if (requestError || !request) {
      return new Response(JSON.stringify({ error: "Interest request not found" }), {
        status: 404, headers: corsHeaders,
      });
    }

    // Caller must be the original sender (User 1)
    if (request.sender_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: corsHeaders,
      });
    }

    // Must be in awaiting_answers state
    if (request.status !== "awaiting_answers") {
      return new Response(JSON.stringify({ error: "Request is not awaiting answers" }), {
        status: 409, headers: corsHeaders,
      });
    }

    const recipientId = request.recipient_id;

    // Get recipient's intent questions (User 2's questions that User 1 must answer)
    const { data: questions } = await supabase
      .from("intent_questions")
      .select("id")
      .eq("user_id", recipientId);

    if (!questions || questions.length === 0) {
      // No questions to answer — shouldn't happen, but handle gracefully
      return new Response(JSON.stringify({ error: "No questions to answer" }), {
        status: 400, headers: corsHeaders,
      });
    }

    const questionIds = new Set(questions.map((q: any) => q.id));

    // Validate all questions are answered
    for (const qId of questionIds) {
      const ans = answers.find((a: any) => a.question_id === qId);
      if (!ans || !ans.answer_text?.trim()) {
        return new Response(JSON.stringify({ error: "All questions must be answered" }), {
          status: 400, headers: corsHeaders,
        });
      }
    }

    // Upsert answers into interest_answers
    const answersToInsert = answers
      .filter((a: any) => questionIds.has(a.question_id) && a.answer_text?.trim())
      .map((a: any) => ({
        interest_request_id,
        question_id: a.question_id,
        answerer_id: user.id,
        answer_text: a.answer_text.trim(),
      }));

    const { error: answersError } = await supabase
      .from("interest_answers")
      .upsert(answersToInsert, { onConflict: "interest_request_id,question_id,answerer_id" });

    if (answersError) {
      console.error("Error inserting answers:", answersError);
      return new Response(JSON.stringify({ error: answersError.message }), {
        status: 500, headers: corsHeaders,
      });
    }

    // Update interest request status to answers_submitted
    await supabase
      .from("interest_requests")
      .update({
        status: "answers_submitted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", interest_request_id);

    // Get sender name for notification
    const { data: senderProfile } = await supabase
      .from("users")
      .select("first_name, name")
      .eq("id", user.id)
      .single();
    const senderName = senderProfile?.first_name || senderProfile?.name || "Someone";

    // Notify User 2 that answers are ready to review
    await sendPushToUser(supabase, recipientId, {
      title: "Answers ready to review!",
      body: `${senderName} answered your questions. Review and decide!`,
      data: { type: "answers_submitted", interest_request_id, senderId: user.id },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});
