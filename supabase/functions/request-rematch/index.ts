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

    // Get request body
    const { matchId, otherUserId } = await req.json();

    if (!otherUserId) {
      return new Response(
        JSON.stringify({ error: "otherUserId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Check if match already exists (they might have already rematched)
    const { data: existingMatch } = await supabaseClient
      .from("matches")
      .select("*")
      .or(`and(user1.eq.${user.id},user2.eq.${otherUserId}),and(user1.eq.${otherUserId},user2.eq.${user.id})`)
      .single();

    if (existingMatch) {
      // If match exists, remove unmatch record if it exists
      if (matchId) {
        await supabaseClient
          .from("unmatches")
          .delete()
          .eq("match_id", matchId);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          matchId: existingMatch.id,
          message: "Match already exists" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if users are blocked
    const { data: iBlockedThem } = await supabaseClient
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherUserId)
      .single();
    
    const { data: theyBlockedMe } = await supabaseClient
      .from("blocks")
      .select("id")
      .eq("blocker_id", otherUserId)
      .eq("blocked_id", user.id)
      .single();

    if (iBlockedThem || theyBlockedMe) {
      return new Response(
        JSON.stringify({ error: "Cannot rematch with a blocked user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the unmatch record
    if (!matchId) {
      return new Response(
        JSON.stringify({ error: "matchId is required to request rematch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: unmatchRecord, error: unmatchError } = await supabaseClient
      .from("unmatches")
      .select("*")
      .eq("match_id", matchId)
      .single();

    if (unmatchError || !unmatchRecord) {
      return new Response(
        JSON.stringify({ error: "Unmatch record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is part of this unmatch
    if (unmatchRecord.user1_id !== user.id && unmatchRecord.user2_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: User is not part of this unmatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if there's already a pending request
    if (unmatchRecord.rematch_status === 'pending') {
      return new Response(
        JSON.stringify({ error: "Rematch request already pending" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has already requested a rematch (even if rejected)
    // Once a rematch is rejected, the requester cannot request again
    if (unmatchRecord.rematch_requested_by === user.id) {
      return new Response(
        JSON.stringify({ error: "You have already requested a rematch. Rematch requests can only be sent once." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if rematch status is rejected (prevent any new requests after rejection)
    if (unmatchRecord.rematch_status === 'rejected') {
      return new Response(
        JSON.stringify({ error: "Rematch request was rejected. You cannot request a rematch again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update unmatch record with rematch request
    const { error: updateError } = await supabaseClient
      .from("unmatches")
      .update({
        rematch_requested_by: user.id,
        rematch_status: 'pending',
        rematch_requested_at: new Date().toISOString(),
      })
      .eq("match_id", matchId);

    if (updateError) {
      console.error("❌ Error updating rematch request:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to create rematch request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    return new Response(
      JSON.stringify({
        success: true,
        message: "Rematch request sent",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in request-rematch:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

