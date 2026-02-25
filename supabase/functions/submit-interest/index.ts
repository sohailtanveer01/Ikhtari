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
    const { recipient_id, answers } = body;

    if (!recipient_id || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: corsHeaders,
      });
    }

    if (recipient_id === user.id) {
      return new Response(JSON.stringify({ error: "Cannot send interest to yourself" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Check for blocks
    const { data: block } = await supabase
      .from("blocks")
      .select("id")
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${recipient_id}),and(blocker_id.eq.${recipient_id},blocked_id.eq.${user.id})`)
      .maybeSingle();

    if (block) {
      return new Response(JSON.stringify({ error: "Cannot send interest to this user" }), {
        status: 403, headers: corsHeaders,
      });
    }

    // Check no existing request
    const { data: existingRequest } = await supabase
      .from("interest_requests")
      .select("id")
      .eq("sender_id", user.id)
      .eq("recipient_id", recipient_id)
      .maybeSingle();

    if (existingRequest) {
      return new Response(JSON.stringify({ error: "Interest already sent" }), {
        status: 409, headers: corsHeaders,
      });
    }

    // Get recipient's intent questions to validate answers
    const { data: recipientQuestions } = await supabase
      .from("intent_questions")
      .select("id")
      .eq("user_id", recipient_id)
      .order("display_order", { ascending: true });

    if (!recipientQuestions || recipientQuestions.length === 0) {
      return new Response(JSON.stringify({ error: "Recipient has no questions set" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Validate that all questions are answered
    const questionIds = new Set(recipientQuestions.map((q: any) => q.id));
    const answeredIds = new Set(answers.map((a: any) => a.question_id));

    for (const qId of questionIds) {
      if (!answeredIds.has(qId)) {
        return new Response(JSON.stringify({ error: "All questions must be answered" }), {
          status: 400, headers: corsHeaders,
        });
      }
    }

    // Validate answer text
    for (const answer of answers) {
      if (!answer.answer_text || typeof answer.answer_text !== "string" || answer.answer_text.trim().length === 0) {
        return new Response(JSON.stringify({ error: "All answers must be non-empty" }), {
          status: 400, headers: corsHeaders,
        });
      }
    }

    // Create interest request
    const { data: interestRequest, error: requestError } = await supabase
      .from("interest_requests")
      .insert({
        sender_id: user.id,
        recipient_id,
        status: "pending",
      })
      .select("id")
      .single();

    if (requestError) {
      console.error("Error creating interest request:", requestError);
      return new Response(JSON.stringify({ error: requestError.message }), {
        status: 500, headers: corsHeaders,
      });
    }

    // Insert answers
    const answersToInsert = answers
      .filter((a: any) => questionIds.has(a.question_id))
      .map((a: any) => ({
        interest_request_id: interestRequest.id,
        question_id: a.question_id,
        answerer_id: user.id,
        answer_text: a.answer_text.trim(),
      }));

    const { error: answersError } = await supabase
      .from("interest_answers")
      .insert(answersToInsert);

    if (answersError) {
      console.error("Error inserting answers:", answersError);
    }

    // Send push notification
    try {
      const { data: senderProfile } = await supabase
        .from("users")
        .select("first_name, name")
        .eq("id", user.id)
        .single();
      const senderName = senderProfile?.first_name || senderProfile?.name || "Someone";

      const { data: recipientPrefs } = await supabase
        .from("user_preferences")
        .select("notifications_enabled")
        .eq("user_id", recipient_id)
        .single();

      const notificationsEnabled = recipientPrefs?.notifications_enabled ?? true;

      if (notificationsEnabled) {
        const { data: tokenRows } = await supabase
          .from("user_push_tokens")
          .select("token")
          .eq("user_id", recipient_id)
          .eq("revoked", false)
          .order("last_seen_at", { ascending: false })
          .limit(5);

        const tokens = (tokenRows ?? []).map((r: any) => r.token).filter(Boolean);
        if (tokens.length > 0) {
          await sendExpoPush(tokens, {
            title: "Someone is interested in you!",
            body: `${senderName} answered your questions and expressed interest.`,
            data: { type: "new_interest", senderId: user.id },
          });
        }
      }
    } catch (e) {
      console.error("Push notification failed:", e);
    }

    return new Response(
      JSON.stringify({ success: true, interest_request_id: interestRequest.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});
