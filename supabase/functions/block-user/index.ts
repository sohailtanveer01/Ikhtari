import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtiar.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      console.error("❌ Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { userId, matchId, reportReason, reportDetails } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: "Cannot block yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Check if already blocked
    const { data: existingBlock, error: checkError } = await supabaseClient
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected if no block exists
      console.error("❌ Error checking existing block:", checkError);
      return new Response(
        JSON.stringify({ error: "Error checking existing block" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingBlock) {
      // Already blocked - update report if provided
      if (reportReason) {
        const { error: updateReportError } = await supabaseClient
          .from("reports")
          .upsert({
            reporter_id: user.id,
            reported_id: userId,
            reason: reportReason,
            details: reportDetails || null,
            created_at: new Date().toISOString(),
          }, {
            onConflict: "reporter_id,reported_id",
          });

        if (updateReportError) {
          console.error("❌ Error updating report:", updateReportError);
          // Don't fail the request if report update fails
        }
      }
    } else {
      // Create block record
      const { error: insertError } = await supabaseClient
        .from("blocks")
        .insert({
          blocker_id: user.id,
          blocked_id: userId,
        });

      if (insertError) {
        console.error("❌ Error inserting block:", insertError);
        return new Response(
          JSON.stringify({ error: "Error blocking user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create report record if reason is provided
      if (reportReason) {
        const { error: reportError } = await supabaseClient
          .from("reports")
          .insert({
            reporter_id: user.id,
            reported_id: userId,
            reason: reportReason,
            details: reportDetails || null,
          });

        if (reportError) {
          console.error("❌ Error inserting report:", reportError);
          // Don't fail the request if report insertion fails
        }
      }
    }

    // If matchId is provided, delete the match (preserve messages for abuse tracking)
    if (matchId) {
      const { data: match, error: matchError } = await supabaseClient
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (!matchError && match) {
        // Verify user is part of the match
        if (match.user1 === user.id || match.user2 === user.id) {
          const { error: deleteMatchError } = await supabaseClient
            .from("matches")
            .delete()
            .eq("id", matchId);

          if (deleteMatchError) {
            console.error("⚠️ Error deleting match:", deleteMatchError);
            // Don't fail the request if match deletion fails
          } else {
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in block-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

