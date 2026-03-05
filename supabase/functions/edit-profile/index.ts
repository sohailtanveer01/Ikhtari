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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get update payload from request
    const body = await req.json();
    const { updatePayload, prompts } = body;

    if (!updatePayload || typeof updatePayload !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid update payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Ensure mandatory fields are not null
    // Get current profile to use as fallback for mandatory fields
    const { data: currentProfile } = await supabaseClient
      .from("users")
      .select("gender, dob, first_name, last_name")
      .eq("id", user.id)
      .single();

    // Build final update payload with mandatory fields
    const finalUpdatePayload: any = {
      ...updatePayload,
      last_active_at: new Date().toISOString(),
    };

    // Ensure mandatory fields are included (use current values if not provided)
    if (!finalUpdatePayload.gender && currentProfile?.gender) {
      finalUpdatePayload.gender = currentProfile.gender;
    }
    if (!finalUpdatePayload.dob && currentProfile?.dob) {
      finalUpdatePayload.dob = currentProfile.dob;
    }
    if (!finalUpdatePayload.first_name && currentProfile?.first_name) {
      finalUpdatePayload.first_name = currentProfile.first_name;
    }
    if (!finalUpdatePayload.last_name && currentProfile?.last_name) {
      finalUpdatePayload.last_name = currentProfile.last_name;
    }

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabaseClient
      .from("users")
      .update(finalUpdatePayload)
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle prompts update if provided
    if (prompts && Array.isArray(prompts)) {

      // Delete existing prompts
      const { error: deleteError } = await supabaseClient
        .from("user_prompts")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("❌ Error deleting prompts:", deleteError);
        // Don't fail the request, just log the error
      }

      // Filter out empty prompts and insert new ones
      const filledPrompts = prompts.filter((p: any) => p.question?.trim() && p.answer?.trim());
      if (filledPrompts.length > 0) {
        const promptsToInsert = filledPrompts.map((prompt: any, index: number) => ({
          user_id: user.id,
          question: prompt.question.trim(),
          answer: prompt.answer.trim(),
          display_order: index,
        }));

        const { error: promptsError } = await supabaseClient
          .from("user_prompts")
          .insert(promptsToInsert);

        if (promptsError) {
          console.error("❌ Error inserting prompts:", promptsError);
          return new Response(
            JSON.stringify({ error: `Failed to update prompts: ${promptsError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

      }
    }


    return new Response(
      JSON.stringify({
        success: true,
        profile: updatedProfile,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in update-profile:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

