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

    // Verify user is part of this match
    if (match.user1 !== user.id && match.user2 !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No initiated_by — no gate for either user
    if (!match.initiated_by) {
      return new Response(
        JSON.stringify({ gateRequired: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gate already approved — both can chat freely
    if (match.gate_approved_at) {
      return new Response(
        JSON.stringify({ gateRequired: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otherUserId = match.user1 === user.id ? match.user2 : match.user1;

    // ── INITIATOR (the one who sent interest) ────────────────────────────────
    // Must answer the acceptor's questions; then waits for acceptor to approve
    if (match.initiated_by === user.id) {
      const { data: questions } = await supabase
        .from("intent_questions")
        .select("id, question_text, display_order")
        .eq("user_id", otherUserId)
        .order("display_order", { ascending: true });

      // Acceptor has no questions → no gate
      if (!questions || questions.length === 0) {
        return new Response(
          JSON.stringify({ gateRequired: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existingAnswers } = await supabase
        .from("match_intent_answers")
        .select("question_id")
        .eq("match_id", matchId)
        .eq("answerer_id", user.id);

      const answeredIds = new Set((existingAnswers || []).map((a: any) => a.question_id));
      const allAnswered = questions.every((q: any) => answeredIds.has(q.id));

      const { data: otherProfile } = await supabase
        .from("users")
        .select("first_name, name")
        .eq("id", otherUserId)
        .single();
      const otherUserName = otherProfile?.first_name || otherProfile?.name || "them";

      if (allAnswered) {
        // Answers submitted — waiting for acceptor to review and approve
        return new Response(
          JSON.stringify({ awaitingApproval: true, otherUserName }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Not all answered yet — show the question form
      const unansweredQuestions = questions.filter((q: any) => !answeredIds.has(q.id));
      return new Response(
        JSON.stringify({ gateRequired: true, questions: unansweredQuestions, otherUserName }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACCEPTOR (the one who accepted interest) ──────────────────────────────
    const initiatorId = match.initiated_by;

    const { data: myQuestions } = await supabase
      .from("intent_questions")
      .select("id, question_text, display_order")
      .eq("user_id", user.id)
      .order("display_order", { ascending: true });

    // Acceptor has no questions → no gate
    if (!myQuestions || myQuestions.length === 0) {
      return new Response(
        JSON.stringify({ gateRequired: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: initiatorAnswers } = await supabase
      .from("match_intent_answers")
      .select("question_id, answer_text")
      .eq("match_id", matchId)
      .eq("answerer_id", initiatorId);

    const initiatorAnswerMap = new Map(
      (initiatorAnswers || []).map((a: any) => [a.question_id, a.answer_text])
    );
    const allAnsweredByInitiator = myQuestions.every((q: any) => initiatorAnswerMap.has(q.id));

    const { data: initiatorProfile } = await supabase
      .from("users")
      .select("first_name, name")
      .eq("id", initiatorId)
      .single();
    const initiatorName = initiatorProfile?.first_name || initiatorProfile?.name || "them";

    if (!allAnsweredByInitiator) {
      // Initiator hasn't answered yet — acceptor waits
      return new Response(
        JSON.stringify({
          waitingForOther: true,
          otherUserName: initiatorName,
          initiatedById: initiatorId,
          myQuestions: myQuestions.map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            display_order: q.display_order,
          })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initiator answered all — acceptor must review and approve
    const reviewAnswers = myQuestions
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((q: any) => ({
        question_text: q.question_text,
        answer_text: initiatorAnswerMap.get(q.id) || "",
        display_order: q.display_order,
      }));

    return new Response(
      JSON.stringify({ reviewRequired: true, otherUserName: initiatorName, answers: reviewAnswers }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error in get-chat-gate:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
