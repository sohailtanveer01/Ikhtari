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
        const { email } = await req.json();
        if (!email) {
            return new Response(
                JSON.stringify({ error: "Email is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase client with Service Role Key for admin fallback
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Try to find the user in public.users by email directly (fastest)
        let { data: profile, error: profileError } = await supabaseAdmin
            .from("users")
            .select("id, account_active, email")
            .eq("email", email.toLowerCase())
            .maybeSingle();

        if (profileError) {
            console.error("Error querying user profile by email:", profileError);
        }

        // 2. Fallback: If not found by email, find in auth.users and then check public.users by ID
        if (!profile) {
            const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

            if (listError) {
                console.error("Error listing auth users:", listError);
            } else {
                const authUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

                if (authUser) {
                    // Check public.users by ID
                    const { data: idProfile, error: idError } = await supabaseAdmin
                        .from("users")
                        .select("id, account_active, email")
                        .eq("id", authUser.id)
                        .maybeSingle();

                    if (idError) {
                        console.error("Error querying user profile by ID:", idError);
                    } else if (idProfile) {
                        profile = idProfile;

                        // Repair: Update public.users with the email for future direct lookups
                        await supabaseAdmin
                            .from("users")
                            .update({ email: email.toLowerCase() })
                            .eq("id", authUser.id);
                    }
                }
            }
        }

        if (!profile) {
            return new Response(
                JSON.stringify({ exists: false }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                exists: true,
                account_active: profile.account_active ?? true
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error checking user status:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
