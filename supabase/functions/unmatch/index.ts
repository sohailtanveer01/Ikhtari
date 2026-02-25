import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtari.com",
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
    const { matchId } = await req.json();

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: "matchId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Verify the match exists and user is part of it
    const { data: match, error: matchError } = await supabaseClient
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      console.error("❌ Match not found:", matchError);
      return new Response(
        JSON.stringify({ error: "Match not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is part of the match
    if (match.user1 !== user.id && match.user2 !== user.id) {
      console.error("❌ User is not part of this match");
      return new Response(
        JSON.stringify({ error: "Unauthorized: User is not part of this match" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already unmatched
    const { data: existingUnmatch } = await supabaseClient
      .from("unmatches")
      .select("id")
      .eq("match_id", matchId)
      .single();

    if (!existingUnmatch) {
      // Insert into unmatches table before deleting match
      // Ensure consistent ordering: user1_id < user2_id
      const user1Id = match.user1 < match.user2 ? match.user1 : match.user2;
      const user2Id = match.user1 < match.user2 ? match.user2 : match.user1;

      const { error: unmatchInsertError } = await supabaseClient
        .from("unmatches")
        .insert({
          match_id: matchId,
          user1_id: user1Id,
          user2_id: user2Id,
          unmatched_by: user.id, // Who initiated the unmatch
        });

      if (unmatchInsertError) {
        console.error("❌ Error inserting unmatch record:", unmatchInsertError);
        return new Response(
          JSON.stringify({ error: "Error recording unmatch" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

    }

    // Delete the match (preserve messages for future rematch feature)
    const { error: deleteError } = await supabaseClient
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (deleteError) {
      console.error("❌ Error deleting match:", deleteError);
      return new Response(
        JSON.stringify({ error: "Error deleting match" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in unmatch function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

