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


    // Get all profile views for the current user (where they were viewed)
    // Group by viewer_id to get view counts and last viewed time
    const { data: views, error: viewsError } = await supabaseClient
      .from("profile_views")
      .select("viewer_id, created_at")
      .eq("viewed_id", user.id)
      .order("created_at", { ascending: false });

    if (viewsError) {
      console.error("❌ Error fetching views:", viewsError);
      return new Response(
        JSON.stringify({ error: viewsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!views || views.length === 0) {
      return new Response(
        JSON.stringify({ viewers: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group views by viewer_id and calculate stats
    const viewerStats = new Map();
    views.forEach((view) => {
      const viewerId = view.viewer_id;
      if (!viewerStats.has(viewerId)) {
        viewerStats.set(viewerId, {
          viewer_id: viewerId,
          viewCount: 0,
          lastViewedAt: view.created_at,
        });
      }
      const stats = viewerStats.get(viewerId);
      stats.viewCount++;
      // Keep the most recent view time
      if (new Date(view.created_at) > new Date(stats.lastViewedAt)) {
        stats.lastViewedAt = view.created_at;
      }
    });

    // Get unique viewer IDs
    const viewerIds = Array.from(viewerStats.keys());

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


    // Filter out blocked users from viewer IDs
    const unblockedViewerIds = viewerIds.filter(id => !blockedUserIds.has(id));

    if (unblockedViewerIds.length === 0) {
      return new Response(
        JSON.stringify({ viewers: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch full user profiles for all viewers (excluding blocked users)
    const { data: viewers, error: viewersError } = await supabaseClient
      .from("users")
      .select("*")
      .in("id", unblockedViewerIds)
      .eq("account_active", true);

    if (viewersError) {
      console.error("❌ Error fetching viewer profiles:", viewersError);
      return new Response(
        JSON.stringify({ error: viewersError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine viewer profiles with view stats, sorted by most recent view
    // Also filter out any blocked users as a safety check
    const viewersWithStats = viewers
      .filter((viewer) => !blockedUserIds.has(viewer.id))
      .map((viewer) => {
        const stats = viewerStats.get(viewer.id);
        return {
          ...viewer,
          viewCount: stats.viewCount,
          lastViewedAt: stats.lastViewedAt,
        };
      })
      .sort((a, b) =>
        new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime()
      );


    return new Response(
      JSON.stringify({ viewers: viewersWithStats }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in get-viewers:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

