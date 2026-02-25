import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtari.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const body = await req.json();

        const { event } = body;
        const {
            type,
            app_user_id,
            entitlement_ids,
            period_type
        } = event;

        if (!app_user_id) {
            return new Response(JSON.stringify({ error: "No app_user_id" }), { status: 400 });
        }

        let isPremium = false;
        let boostCountUpdate = undefined;

        // Check for Ikhtari Pro entitlement
        if (entitlement_ids && entitlement_ids.includes('Ikhtari Pro')) {
            isPremium = true;
        }

        // Logic based on event type
        switch (type) {
            case "INITIAL_PURCHASE":
                isPremium = true;
                boostCountUpdate = 5; // Grant 5 boosts on initial purchase
                break;
            case "RENEWAL":
                isPremium = true;
                // Optional: Grant more boosts on renewal?
                break;
            case "EXPIRATION":
            case "CANCELLATION":
                isPremium = false;
                break;
            case "BILLING_ISSUE":
                // Maybe keep it for a grace period?
                break;
        }

        const updatePayload: any = { is_premium: isPremium };
        if (boostCountUpdate !== undefined) {
            // Fetch current boost count first to increment it safely (or just set it if that's the rule)
            const { data: userData } = await supabase
                .from("users")
                .select("boost_count")
                .eq("id", app_user_id)
                .single();

            updatePayload.boost_count = (userData?.boost_count || 0) + boostCountUpdate;
        }

        const { error: updateError } = await supabase
            .from("users")
            .update(updatePayload)
            .eq("id", app_user_id);

        if (updateError) {
            console.error("Error updating user:", updateError);
            return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err) {
        console.error("Webhook processing error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
