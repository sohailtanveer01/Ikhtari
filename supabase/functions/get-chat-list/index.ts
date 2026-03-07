/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />
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


    // Get list of blocked users (both ways - users I blocked and users who blocked me)
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

    // Fetch all matches for the user
    const { data: matches, error: matchesError } = await supabaseClient
      .from("matches")
      .select("*")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (matchesError) {
      console.error("❌ Matches error:", matchesError);
      return new Response(
        JSON.stringify({ error: matchesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Don't return early if no matches - we still need to check for compliments and rematch requests
    // Initialize validMatches array
    const validMatches: any[] = [];

    // For each match, get the other user's profile, last message, and unread count
    // Only process if matches exist
    const matchesWithData = (matches && matches.length > 0) ? await Promise.all(
      matches.map(async (match) => {
        const otherUserId = match.user1 === user.id ? match.user2 : match.user1;

        // Skip if user is blocked (either way)
        if (blockedUserIds.has(otherUserId)) {
          return null;
        }

        // Get other user's profile
        const { data: otherUser, error: userError } = await supabaseClient
          .from("users")
          .select("*")
          .eq("id", otherUserId)
          .single();

        if (userError || !otherUser) {
          console.error("❌ Error fetching user profile:", userError);
          return null;
        }

        // Get last message first (we'll use this for both rematch check and display)
        const { data: lastMessage } = await supabaseClient
          .from("messages")
          .select("*")
          .eq("match_id", match.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Check if this match was created from accepting a rematch request
        // Check if there's an unmatch record with status "accepted" where current user requested the rematch
        const { data: acceptedRematch } = await supabaseClient
          .from("unmatches")
          .select("rematch_requested_by, rematch_status")
          .eq("rematch_status", "accepted")
          .eq("rematch_requested_by", user.id)
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`)
          .maybeSingle();
        
        // Only show rematch accepted message if match is recent (within 10 minutes) or has no messages
        // This prevents showing the message for old matches
        const matchCreatedAt = new Date(match.created_at).getTime();
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        const isRecentMatch = matchCreatedAt > tenMinutesAgo;
        const hasNoMessages = !lastMessage;
        
        // Only show rematch accepted if there's an accepted rematch record AND
        // (match is recent OR there are no messages yet)
        const isRematchAccepted = !!acceptedRematch && (isRecentMatch || hasNoMessages);

        // Count unread messages (messages from other user that are not read)
        const { count: unreadCount, error: countError } = await supabaseClient
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("match_id", match.id)
          .eq("sender_id", otherUserId)
          .eq("read", false);

        if (countError) {
          console.error("Error counting unread messages:", countError);
        }

        return {
          id: match.id,
          created_at: match.created_at,
          otherUser,
          lastMessage: lastMessage || null,
          unreadCount: Number(unreadCount) || 0, // Ensure it's a number
          lastMessageTime: lastMessage?.created_at || match.created_at,
          isRematchAccepted, // Flag to indicate this match was created from accepting rematch
        };
      })
    ) : [];

    // Filter out any null results (failed user profile fetches)
    const validRegularMatches = matchesWithData.filter((match) => match !== null);
    validMatches.push(...validRegularMatches);

    // Get all matches to check if compliment users are already matched
    const { data: allMatches } = await supabaseClient
      .from("matches")
      .select("user1, user2")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`);

    // Create a set of matched user IDs
    const matchedUserIdsSet = new Set<string>();
    if (allMatches) {
      allMatches.forEach((match) => {
        if (match.user1 === user.id) {
          matchedUserIdsSet.add(match.user2);
        } else {
          matchedUserIdsSet.add(match.user1);
        }
      });
    }

    // Get pending compliments where current user is the recipient
    // Only show if status is pending (not accepted - accepted means they matched)

    // First, let's test if we can query compliments at all
    const { data: allComplimentsTest, error: testError } = await supabaseClient
      .from("compliments")
      .select("id, sender_id, recipient_id, status")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);


    const { data: pendingCompliments, error: complimentsError } = await supabaseClient
      .from("compliments")
      .select("*")
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (complimentsError) {
      console.error("❌ Error fetching pending compliments:", JSON.stringify(complimentsError, null, 2));
      console.error("❌ Error code:", complimentsError.code);
      console.error("❌ Error message:", complimentsError.message);
      console.error("❌ Error details:", complimentsError.details);
      console.error("❌ Error hint:", complimentsError.hint);
    } else {
      if (pendingCompliments && pendingCompliments.length > 0) {
      }
    }

    // Add pending compliments to chat list (only if not already matched)
    if (pendingCompliments && pendingCompliments.length > 0) {
      const complimentMatches = await Promise.all(
        pendingCompliments.map(async (compliment) => {
          const senderId = compliment.sender_id;

          // Skip if user is blocked
          if (blockedUserIds.has(senderId)) {
            return null;
          }

          // Skip if already matched (shouldn't happen with status='pending', but safety check)
          if (matchedUserIdsSet.has(senderId)) {
            return null;
          }

          // Get sender's profile
          const { data: senderProfile, error: userError } = await supabaseClient
            .from("users")
            .select("*")
            .eq("id", senderId)
            .eq("account_active", true)
            .single();

          if (userError || !senderProfile) {
            console.error("❌ Error fetching sender profile for compliment:", JSON.stringify(userError, null, 2));
            return null;
          }


          // Create a fake "last message" from the compliment
          const complimentMessage = {
            id: `compliment-${compliment.id}`,
            match_id: null,
            sender_id: senderId,
            message: compliment.message,
            message_type: "text",
            created_at: compliment.created_at,
            read: false,
          };

          return {
            id: `compliment-${compliment.id}`, // Use special ID for navigation
            created_at: compliment.created_at,
            otherUser: senderProfile,
            lastMessage: complimentMessage,
            unreadCount: 1, // Show as unread
            lastMessageTime: compliment.created_at,
            isCompliment: true,
            complimentId: compliment.id,
            complimentMessage: compliment.message,
          };
        })
      );

      const validComplimentMatches = complimentMatches.filter((match) => match !== null);
      validMatches.push(...validComplimentMatches);
    } else {
    }

    // Also show compliments I sent (only pending or declined - not accepted, since accepted means they matched)
    // Only show if not already matched
    const { data: sentCompliments, error: sentComplimentsError } = await supabaseClient
      .from("compliments")
      .select("*")
      .eq("sender_id", user.id)
      .in("status", ["pending", "declined"])
      .order("created_at", { ascending: false });

    if (sentComplimentsError) {
      console.error("❌ Error fetching sent compliments:", sentComplimentsError);
    }

    if (sentCompliments && sentCompliments.length > 0) {
      const sentComplimentMatches = await Promise.all(
        sentCompliments.map(async (compliment) => {
          const recipientId = compliment.recipient_id;

          // Skip if user is blocked
          if (blockedUserIds.has(recipientId)) {
            return null;
          }

          // Skip if already matched (don't show compliment conversation if match exists)
          if (matchedUserIdsSet.has(recipientId)) {
            return null;
          }

          // Get recipient's profile
          const { data: recipientProfile, error: userError } = await supabaseClient
            .from("users")
            .select("*")
            .eq("id", recipientId)
            .eq("account_active", true)
            .single();

          if (userError || !recipientProfile) {
            console.error("❌ Error fetching recipient profile for sent compliment:", userError);
            return null;
          }

          // Create a fake "last message" from the compliment
          const complimentMessage = {
            id: `compliment-${compliment.id}`,
            match_id: null,
            sender_id: user.id,
            message: compliment.message,
            message_type: "text",
            created_at: compliment.created_at,
            read: true,
          };

          return {
            id: `compliment-${compliment.id}`,
            created_at: compliment.created_at,
            otherUser: recipientProfile,
            lastMessage: complimentMessage,
            unreadCount: 0,
            lastMessageTime: compliment.created_at,
            isCompliment: true,
            complimentId: compliment.id,
            complimentMessage: compliment.message,
            complimentStatus: compliment.status, // "pending" or "declined"
            isComplimentSender: true,
          };
        })
      );

      const validSentComplimentMatches = sentComplimentMatches.filter((match) => match !== null);
      validMatches.push(...validSentComplimentMatches);
    }


    // Log all compliment matches for debugging
    const complimentMatches = validMatches.filter(m => m.isCompliment);
    if (complimentMatches.length > 0) {
    }

    // Sort all matches by the most recent message time
    validMatches.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime).getTime();
      const timeB = new Date(b.lastMessageTime).getTime();
      return timeB - timeA; // Sort descending (newest first)
    });

    return new Response(
      JSON.stringify({
        matches: validMatches,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error in get-chat-list:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

