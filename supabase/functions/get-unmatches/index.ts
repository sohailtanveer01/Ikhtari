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


    // Get list of users I blocked (user 1 shouldn't see user 2)
    const { data: blocksIBlocked, error: blocksError1 } = await supabaseClient
      .from("blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", user.id);

    if (blocksError1) {
      console.error("❌ Error fetching blocks I made:", blocksError1);
    }

    const blockedUserIds = new Set<string>();
    if (blocksIBlocked) {
      blocksIBlocked.forEach(block => blockedUserIds.add(block.blocked_id));
    }

    // Get all unmatched users from unmatches table (including pending rematch requests)
    const { data: allUnmatches, error: unmatchesError } = await supabaseClient
      .from("unmatches")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (unmatchesError) {
      console.error("❌ Error fetching unmatches:", unmatchesError);
    }

    // Show all unmatches EXCEPT accepted ones (accepted = rematched, they appear in the active chat list)
    // Pending rematch requests are now shown in the Unmatches screen (not the chat list)
    const unmatches = allUnmatches?.filter(
      (unmatch) => {
        const otherUserId = unmatch.user1_id === user.id
          ? unmatch.user2_id
          : unmatch.user1_id;
        if (unmatch.rematch_status === 'accepted') return false;
        if (blockedUserIds.has(otherUserId)) return false;
        return true;
      }
    ) || [];

    const unmatchedUsersData: any[] = [];

    if (unmatches) {
      for (const unmatch of unmatches) {
        // Determine the other user ID
        const otherUserId = unmatch.user1_id === user.id 
          ? unmatch.user2_id 
          : unmatch.user1_id;

        // Get user profile
        const { data: otherUser } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", otherUserId)
          .single();

        if (otherUser) {
          const unmatchedBy = unmatch.unmatched_by === user.id ? "me" : "them";

          unmatchedUsersData.push({
            userId: otherUserId,
            matchId: unmatch.match_id,
            user: otherUser,
            unmatchedAt: unmatch.created_at,
            unmatchedBy,
            type: "unmatched",
            rematch_status: unmatch.rematch_status || null,
            rematch_requested_by: unmatch.rematch_requested_by || null,
          });
        }
      }
    }

    // Get users who blocked me
    const { data: blocksIAmBlocked, error: blocksError2 } = await supabaseClient
      .from("blocks")
      .select("blocker_id, created_at")
      .eq("blocked_id", user.id);

    if (blocksError2) {
      console.error("❌ Error fetching blocks against me:", blocksError2);
    }

    // Fetch user profiles for blocked users
    const blockedUsersData: any[] = [];

    // Note: We don't show users I blocked (user 1 shouldn't see user 2)
    // Only show users who blocked me (user 2 should see that user 1 blocked them)

    // Users who blocked me
    if (blocksIAmBlocked) {
      for (const block of blocksIAmBlocked) {
        const { data: blockerUser } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", block.blocker_id)
          .single();

        if (blockerUser) {
          blockedUsersData.push({
            userId: block.blocker_id,
            user: blockerUser,
            blockedAt: block.created_at,
            blockedBy: "them",
            type: "blocked",
          });
        }
      }
    }

    // Combine and deduplicate (if a user is both unmatched and blocked, prioritize blocked)
    const allUsers = new Map<string, any>();
    
    // Add unmatched users
    unmatchedUsersData.forEach(item => {
      if (!allUsers.has(item.userId)) {
        allUsers.set(item.userId, item);
      }
    });

    // Add blocked users (will overwrite if user was also unmatched)
    blockedUsersData.forEach(item => {
      allUsers.set(item.userId, item);
    });

    const result = Array.from(allUsers.values());


    return new Response(
      JSON.stringify({
        users: result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in get-unmatches:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

