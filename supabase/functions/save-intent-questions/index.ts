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
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = await req.json();
    const { questions } = body;

    if (!Array.isArray(questions) || questions.length < 3 || questions.length > 6) {
      return new Response(
        JSON.stringify({ error: "Must provide between 3 and 6 questions" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate each question
    for (const q of questions) {
      if (!q.question_text || typeof q.question_text !== "string" || q.question_text.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: "Each question must have non-empty question_text" }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Delete all existing intent questions for this user
    const { error: deleteError } = await supabase
      .from("intent_questions")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting old questions:", deleteError);
      return new Response(
        JSON.stringify({ error: deleteError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Insert new questions
    const questionsToInsert = questions.map((q: any, index: number) => ({
      user_id: user.id,
      question_text: q.question_text.trim(),
      is_from_library: q.is_from_library || false,
      library_question_id: q.library_question_id || null,
      display_order: q.display_order ?? index,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("intent_questions")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting questions:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Set intent_questions_set = true on user
    const { error: updateError } = await supabase
      .from("users")
      .update({ intent_questions_set: true })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true, questions: inserted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
