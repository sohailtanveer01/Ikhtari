import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtiar.app",
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

    // Get pending interest requests received by this user
    const { data: requests, error: requestsError } = await supabase
      .from("interest_requests")
      .select("*")
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestsError) {
      return new Response(JSON.stringify({ error: requestsError.message }), {
        status: 500, headers: corsHeaders,
      });
    }

    if (!requests || requests.length === 0) {
      return new Response(
        JSON.stringify({ interests: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get sender profiles
    const senderIds = requests.map((r: any) => r.sender_id);
    const { data: senderProfiles } = await supabase
      .from("users")
      .select("id, first_name, last_name, name, photos, dob, city, country, profession, height, marital_status, has_children, education, ethnicity, nationality, bio, location")
      .in("id", senderIds);

    const profileMap = new Map<string, any>();
    if (senderProfiles) {
      senderProfiles.forEach((p: any) => profileMap.set(p.id, p));
    }

    // Get answers for these requests
    const requestIds = requests.map((r: any) => r.id);
    const { data: answers } = await supabase
      .from("interest_answers")
      .select("interest_request_id, question_id, answer_text, answerer_id")
      .in("interest_request_id", requestIds);

    // Get the questions for context
    const questionIds = [...new Set((answers || []).map((a: any) => a.question_id))];
    const { data: questions } = await supabase
      .from("intent_questions")
      .select("id, question_text, display_order")
      .in("id", questionIds);

    const questionMap = new Map<string, any>();
    if (questions) {
      questions.forEach((q: any) => questionMap.set(q.id, q));
    }

    // Build response
    const interests = requests.map((r: any) => {
      const senderProfile = profileMap.get(r.sender_id) || {};
      const requestAnswers = (answers || [])
        .filter((a: any) => a.interest_request_id === r.id)
        .map((a: any) => ({
          question_text: questionMap.get(a.question_id)?.question_text || "",
          answer_text: a.answer_text,
          display_order: questionMap.get(a.question_id)?.display_order || 0,
        }))
        .sort((a: any, b: any) => a.display_order - b.display_order);

      return {
        id: r.id,
        sender_id: r.sender_id,
        status: r.status,
        created_at: r.created_at,
        sender_profile: senderProfile,
        answers: requestAnswers,
      };
    });

    return new Response(
      JSON.stringify({ interests }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
});
