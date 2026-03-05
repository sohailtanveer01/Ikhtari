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

    const { complimentId } = await req.json();

    if (!complimentId) {
      return new Response(
        JSON.stringify({ error: "complimentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the compliment
    const { data: compliment, error: complimentError } = await supabaseClient
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

    // Verify the current user is the recipient
    if (compliment.recipient_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "You can only decline compliments sent to you" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if compliment is already accepted or declined
    if (compliment.status !== "pending") {
      return new Response(
        JSON.stringify({ error: `Compliment has already been ${compliment.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update compliment status to declined
    const { error: updateError } = await supabaseClient
      .from("compliments")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
      })
      .eq("id", complimentId);

    if (updateError) {
      console.error("❌ Error updating compliment status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to decline compliment", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Compliment declined"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in decline-compliment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

