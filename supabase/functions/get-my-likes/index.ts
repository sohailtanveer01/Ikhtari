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


    // Get all swipes where the current user liked someone (action = 'like')
    const { data: swipes, error: swipesError } = await supabaseClient
      .from("swipes")
      .select("swiped_id, created_at")
      .eq("swiper_id", user.id)
      .eq("action", "like")
      .order("created_at", { ascending: false });

    if (swipesError) {
      console.error("❌ Error fetching swipes:", swipesError);
      return new Response(
        JSON.stringify({ error: swipesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!swipes || swipes.length === 0) {
      return new Response(
        JSON.stringify({ myLikes: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get unique user IDs that were liked
    const likedUserIds = [...new Set(swipes.map((swipe) => swipe.swiped_id))];

    // Get all matches for the current user to exclude matched users
    const { data: matches, error: matchesError } = await supabaseClient
      .from("matches")
      .select("user1, user2")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`);

    if (matchesError) {
      console.error("❌ Error fetching matches:", matchesError);
    }

    // Get blocked users (both ways - users I blocked and users who blocked me)
    const { data: blocksIBlocked } = await supabaseClient
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id);

    const { data: blocksIAmBlocked } = await supabaseClient
      .from("blocks")
      .select("blocker_id")
      .eq("blocked_id", user.id);

    const blockedUserIds = new Set<string>();
    if (blocksIBlocked) {
      blocksIBlocked.forEach(block => blockedUserIds.add(block.blocked_id));
    }
    if (blocksIAmBlocked) {
      blocksIAmBlocked.forEach(block => blockedUserIds.add(block.blocker_id));
    }


    // Get unmatched users (both ways - users I unmatched and users who unmatched me)
    const { data: unmatches, error: unmatchesError } = await supabaseClient
      .from("unmatches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (unmatchesError) {
      console.error("❌ Error fetching unmatches:", unmatchesError);
    }

    // Extract unmatched user IDs
    const unmatchedUserIds = new Set<string>();
    if (unmatches) {
      unmatches.forEach((unmatch) => {
        if (unmatch.user1_id === user.id) {
          unmatchedUserIds.add(unmatch.user2_id);
        } else {
          unmatchedUserIds.add(unmatch.user1_id);
        }
      });
    }

    // Extract matched user IDs
    const matchedUserIds = new Set<string>();
    if (matches) {
      matches.forEach((match) => {
        if (match.user1 === user.id) {
          matchedUserIds.add(match.user2);
        } else {
          matchedUserIds.add(match.user1);
        }
      });
    }

    // Filter out matched users, unmatched users, and blocked users (both ways) from likedUserIds
    const unmatchedLikedIds = likedUserIds.filter(
      (id) => !matchedUserIds.has(id) && !blockedUserIds.has(id) && !unmatchedUserIds.has(id)
    );

    if (unmatchedLikedIds.length === 0) {
      return new Response(
        JSON.stringify({ myLikes: [] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch full user profiles for the liked users (excluding matched users)
    const { data: likedProfiles, error: profilesError } = await supabaseClient
      .from("users")
      .select("id, first_name, last_name, name, photos")
      .in("id", unmatchedLikedIds)
      .eq("account_active", true);

    if (profilesError) {
      console.error("❌ Error fetching liked user profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map profiles with their like timestamp (most recent like)
    // Also filter out any blocked users, matched users, and unmatched users as a safety check
    const myLikesWithTimestamp = (likedProfiles || [])
      .filter((profile) =>
        !blockedUserIds.has(profile.id) && !matchedUserIds.has(profile.id) && !unmatchedUserIds.has(profile.id)
      )
      .map((profile) => {
        const mostRecentSwipe = swipes.find((swipe) => swipe.swiped_id === profile.id);
        return {
          ...profile,
          likedAt: mostRecentSwipe?.created_at,
        };
      })
      .sort((a, b) => {
        // Sort by most recently liked first
        const dateA = a.likedAt ? new Date(a.likedAt).getTime() : 0;
        const dateB = b.likedAt ? new Date(b.likedAt).getTime() : 0;
        return dateB - dateA;
      });



    return new Response(
      JSON.stringify({ myLikes: myLikesWithTimestamp }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in get-my-likes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

