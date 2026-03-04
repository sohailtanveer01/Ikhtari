import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtari.com",
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

    const body = await req.json();
    const { interest_request_id, action, answers } = body;

    if (!interest_request_id || !["accept", "decline", "answer_back"].includes(action)) {
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

    // Verify caller is recipient
    if (request.recipient_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403, headers: corsHeaders,
      });
    }

    if (request.status !== "pending") {
      return new Response(JSON.stringify({ error: "Request already processed" }), {
        status: 409, headers: corsHeaders,
      });
    }

    const senderId = request.sender_id;

    // Get recipient (current user) name for notifications
    const { data: recipientProfile } = await supabase
      .from("users")
      .select("first_name, name")
      .eq("id", user.id)
      .single();
    const recipientName = recipientProfile?.first_name || recipientProfile?.name || "Someone";

    let matchId = null;

    if (action === "accept") {
      // Create match immediately
      const user1 = user.id < senderId ? user.id : senderId;
      const user2 = user.id > senderId ? user.id : senderId;

      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .eq("user1", user1)
        .eq("user2", user2)
        .maybeSingle();

      if (!existingMatch) {
        // senderId is the one who initiated interest — they must answer questions in chat
        const { data: newMatch, error: matchError } = await supabase
          .from("matches")
          .insert({ user1, user2, initiated_by: senderId })
          .select("id")
          .single();

        if (matchError) console.error("Error creating match:", matchError);
        else matchId = newMatch.id;
      } else {
        matchId = existingMatch.id;
      }

      await supabase
        .from("interest_requests")
        .update({
          status: "accepted",
          match_id: matchId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", interest_request_id);

      // Notify sender to open the chat and answer questions
      await sendPushToUser(supabase, senderId, {
        title: "Interest accepted!",
        body: `${recipientName} accepted your interest. Open the chat to answer their questions!`,
        data: { type: "interest_accepted", matchId },
      });

    } else if (action === "decline") {
      await supabase
        .from("interest_requests")
        .update({
          status: "declined",
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", interest_request_id);

      await sendPushToUser(supabase, senderId, {
        title: "Interest update",
        body: "Your interest wasn't reciprocated this time.",
        data: { type: "interest_declined" },
      });

    } else if (action === "answer_back") {
      if (!Array.isArray(answers) || answers.length === 0) {
        return new Response(JSON.stringify({ error: "Answers required for answer_back" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const { data: senderQuestions } = await supabase
        .from("intent_questions")
        .select("id")
        .eq("user_id", senderId);

      if (!senderQuestions || senderQuestions.length === 0) {
        return new Response(JSON.stringify({ error: "Sender has no questions set" }), {
          status: 400, headers: corsHeaders,
        });
      }

      const senderQuestionIds = new Set(senderQuestions.map((q: any) => q.id));
      for (const qId of senderQuestionIds) {
        if (!answers.find((a: any) => a.question_id === qId)) {
          return new Response(JSON.stringify({ error: "All sender questions must be answered" }), {
            status: 400, headers: corsHeaders,
          });
        }
      }

      const answersToInsert = answers
        .filter((a: any) => senderQuestionIds.has(a.question_id))
        .map((a: any) => ({
          interest_request_id,
          question_id: a.question_id,
          answerer_id: user.id,
          answer_text: a.answer_text.trim(),
        }));

      const { error: answersError } = await supabase
        .from("interest_answers")
        .insert(answersToInsert);

      if (answersError) console.error("Error inserting answers:", answersError);

      const user1 = user.id < senderId ? user.id : senderId;
      const user2 = user.id > senderId ? user.id : senderId;

      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id")
        .eq("user1", user1)
        .eq("user2", user2)
        .maybeSingle();

      if (!existingMatch) {
        const { data: newMatch, error: matchError } = await supabase
          .from("matches")
          .insert({ user1, user2, initiated_by: senderId })
          .select("id")
          .single();

        if (matchError) console.error("Error creating match:", matchError);
        else matchId = newMatch.id;
      } else {
        matchId = existingMatch.id;
      }

      await supabase
        .from("interest_requests")
        .update({
          status: "answered_back",
          match_id: matchId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", interest_request_id);

      await sendPushToUser(supabase, senderId, {
        title: "They answered your questions!",
        body: `${recipientName} answered your questions back. Start chatting!`,
        data: { type: "answer_back", matchId },
      });
    }

    return new Response(
      JSON.stringify({ success: true, action, match_id: matchId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders,
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
