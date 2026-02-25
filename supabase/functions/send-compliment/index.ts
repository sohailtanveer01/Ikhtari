/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ===========================================================================
// CORS and Supabase client setup
// ===========================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtari.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ===========================================================================
// Expo Push Notifications Helper
// ===========================================================================
async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, unknown> }
) {
  if (!tokens || tokens.length === 0) return;
  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) console.error("Expo push error:", res.status, json);
  } catch (e) {
    console.error("Expo push exception:", e);
  }
}

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

    const { recipientId, message } = await req.json();

    if (!recipientId || !message) {
      return new Response(
        JSON.stringify({ error: "recipientId and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate message length (200 characters)
    if (message.length > 200) {
      return new Response(
        JSON.stringify({ error: "Message must be 200 characters or less" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check daily limit (3 compliments per day)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { count: dailyCount, error: countError } = await supabaseClient
      .from("compliments")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .gte("created_at", today.toISOString());

    if (countError) {
      console.error("Error checking daily compliment count:", countError);
    } else if (dailyCount && dailyCount >= 3) {
      const now = new Date();
      const tonight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
      const diffMs = tonight.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const timeRemaining = `${hours}h:${minutes}m`;

      return new Response(
        JSON.stringify({
          error: "DAILY_LIMIT_REACHED",
          message: `You have used all 3 compliments for today. You can try again after ${timeRemaining}.`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is trying to send to themselves
    if (user.id === recipientId) {
      return new Response(
        JSON.stringify({ error: "Cannot send compliment to yourself" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if a compliment already exists from this sender to this recipient
    const { data: existingCompliment } = await supabaseClient
      .from("compliments")
      .select("id")
      .eq("sender_id", user.id)
      .eq("recipient_id", recipientId)
      .maybeSingle();

    if (existingCompliment) {
      return new Response(
        JSON.stringify({ error: "You have already sent a compliment to this user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if they're already matched
    const { data: existingMatch } = await supabaseClient
      .from("matches")
      .select("id")
      .or(`and(user1.eq.${user.id},user2.eq.${recipientId}),and(user1.eq.${recipientId},user2.eq.${user.id})`)
      .maybeSingle();

    if (existingMatch) {
      return new Response(
        JSON.stringify({ error: "You are already matched with this user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if recipient has blocked the sender
    const { data: blockedCheck } = await supabaseClient
      .from("blocks")
      .select("id")
      .eq("blocker_id", recipientId)
      .eq("blocked_id", user.id)
      .maybeSingle();

    if (blockedCheck) {
      return new Response(
        JSON.stringify({ error: "Cannot send compliment to this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if sender has blocked the recipient
    const { data: senderBlockedCheck } = await supabaseClient
      .from("blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", recipientId)
      .maybeSingle();

    if (senderBlockedCheck) {
      return new Response(
        JSON.stringify({ error: "Cannot send compliment to a blocked user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the compliment
    const { data: compliment, error: complimentError } = await supabaseClient
      .from("compliments")
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        message: message.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (complimentError) {
      console.error("❌ Error creating compliment:", complimentError);
      return new Response(
        JSON.stringify({ error: "Failed to send compliment", details: complimentError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===========================================================================
    // PUSH NOTIFICATION: Notify recipient about the new compliment
    // ===========================================================================
    if (compliment) {
      try {
        // Get sender's first name for the notification
        const { data: senderProfile } = await supabaseClient
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .single();

        const senderName = senderProfile?.first_name || "Someone";

        // Now, send a push notification to the recipient
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!serviceKey) {
          console.error("Missing SUPABASE_SERVICE_ROLE_KEY; skipping push notification.");
        } else {
          const tokenClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, {
            auth: { persistSession: false },
          });

          const { data: rows, error: tokenErr } = await tokenClient
            .from("user_push_tokens")
            .select("token")
            .eq("user_id", recipientId)
            .eq("revoked", false)
            .order("last_seen_at", { ascending: false })
            .limit(5);

          if (tokenErr) {
            console.error("Error fetching push tokens for compliment recipient:", tokenErr);
          } else {
            const tokens = (rows ?? []).map((r: any) => r.token).filter(Boolean);
            if (tokens.length > 0) {
              await sendExpoPush(tokens, {
                title: `You received a new compliment! ✨`,
                body: `${senderName} sent you a message: "${message.trim().slice(0, 100)}..."`,
                data: { type: "new_compliment", complimentId: compliment.id },
              });
            }
          }
        }
      } catch (e) {
        console.error("Error sending compliment push notification:", e);
      }
    }

    // Also record this as a "like" swipe (so it counts as a super like)
    // Check if a swipe already exists
    const { data: existingSwipe } = await supabaseClient
      .from("swipes")
      .select("id")
      .eq("swiper_id", user.id)
      .eq("swiped_id", recipientId)
      .maybeSingle();

    if (!existingSwipe) {
      // Record as a "superlike" action to indicate it's a compliment
      const { error: swipeError } = await supabaseClient
        .from("swipes")
        .insert({
          swiper_id: user.id,
          swiped_id: recipientId,
          action: "superlike", // Using superlike to indicate compliment
        });

      if (swipeError) {
        console.error("⚠️ Error recording swipe for compliment:", swipeError);
        // Don't fail the request if swipe recording fails
      }
    }


    return new Response(
      JSON.stringify({
        success: true,
        compliment: {
          id: compliment.id,
          message: compliment.message,
          status: compliment.status,
          createdAt: compliment.created_at,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error in send-compliment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

