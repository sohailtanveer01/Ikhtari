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
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Accept session_ids from client (profiles seen this session, may not be in DB yet)
    let session_ids: string[] = [];
    try {
      const body = await req.json();
      session_ids = body?.session_ids || [];
    } catch (_) { /* no body is fine */ }

    // Get DB-persisted seen profile IDs for this user
    const { data: seenRows } = await supabaseAdmin
      .from("discover_seen_profiles")
      .select("profile_id, seen_at")
      .eq("user_id", user.id)
      .order("seen_at", { ascending: false });

    // Merge DB IDs + session IDs, deduplicated
    const dbIds = new Set((seenRows || []).map((r: any) => r.profile_id));
    const seenAtMap = new Map((seenRows || []).map((r: any) => [r.profile_id, r.seen_at]));

    const now = new Date().toISOString();
    const sessionOnlyIds = session_ids.filter((id: string) => !dbIds.has(id));
    sessionOnlyIds.forEach((id: string) => seenAtMap.set(id, now));

    const allSeenIds = [...dbIds, ...sessionOnlyIds];

    if (allSeenIds.length === 0) {
      return new Response(
        JSON.stringify({ profiles: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profile data
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("users")
      .select("*")
      .in("id", allSeenIds)
      .eq("account_active", true);

    if (profilesError) {
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const profileIds = (profiles || []).map((p: any) => p.id);

    // Check if current user is certified and has expectations
    const { data: myCert } = await supabaseAdmin
      .from("marriage_course_certifications")
      .select("is_certified")
      .eq("user_id", user.id)
      .single();

    let myExpectations: any = null;
    if (myCert?.is_certified) {
      const { data: myExp } = await supabaseAdmin
        .from("marriage_expectations_obligations")
        .select("*")
        .eq("user_id", user.id)
        .single();
      myExpectations = myExp;
    }

    // Batch-fetch certifications for seen profiles
    const certificationMap = new Map<string, { is_certified: boolean; show_badge: boolean }>();
    const expectationsMap = new Map<string, any>();

    if (profileIds.length > 0) {
      const { data: certs } = await supabaseAdmin
        .from("marriage_course_certifications")
        .select("user_id, is_certified, show_badge")
        .in("user_id", profileIds);
      (certs || []).forEach((c: any) => {
        certificationMap.set(c.user_id, { is_certified: c.is_certified, show_badge: c.show_badge });
      });

      // Fetch expectations only if I'm certified
      if (myExpectations) {
        const certifiedIds = (certs || []).filter((c: any) => c.is_certified).map((c: any) => c.user_id);
        if (certifiedIds.length > 0) {
          const { data: exps } = await supabaseAdmin
            .from("marriage_expectations_obligations")
            .select("*")
            .in("user_id", certifiedIds)
            .eq("is_complete", true);
          (exps || []).forEach((e: any) => expectationsMap.set(e.user_id, e));
        }
      }
    }

    // Compatibility scoring (mirrors get-discover-feed logic)
    const computeScore = (mine: any, theirs: any): number | null => {
      if (!mine || !theirs) return null;
      const categories = [
        { key: "religious_expectations", weight: 0.3 },
        { key: "financial_expectations", weight: 0.2 },
        { key: "lifestyle_expectations", weight: 0.2 },
        { key: "family_expectations", weight: 0.2 },
        { key: "mahr_expectations", weight: 0.1 },
      ];
      let overall = 0;
      for (const cat of categories) {
        const a = mine[cat.key];
        const b = theirs[cat.key];
        if (!a || !b) continue;
        const fields = Object.keys(a);
        let total = 0, count = 0;
        for (const f of fields) {
          if (a[f] === undefined || b[f] === undefined) continue;
          const av = String(a[f]), bv = String(b[f]);
          if (av === bv) { total += 100; }
          else if (av === "flexible" || av === "very_flexible" || bv === "flexible" || bv === "very_flexible") { total += 80; }
          else { total += 40; }
          count++;
        }
        overall += (count > 0 ? total / count : 0) * cat.weight;
      }
      return Math.round(overall);
    };

    // Batch-fetch active boosts
    const boostMap = new Map<string, string>();
    if (profileIds.length > 0) {
      const { data: activeBoosts } = await supabaseAdmin
        .from("profile_boosts")
        .select("user_id, expires_at")
        .in("user_id", profileIds)
        .gt("expires_at", new Date().toISOString());
      (activeBoosts || []).forEach((b: any) => {
        if (b?.user_id && b?.expires_at) boostMap.set(b.user_id, b.expires_at);
      });
    }

    // Enrich profiles with compatibility, certification, boost, and seen_at
    const enriched = (profiles || [])
      .map((p: any) => {
        const cert = certificationMap.get(p.id);
        const theirExp = expectationsMap.get(p.id);
        const compatScore = myExpectations && theirExp ? computeScore(myExpectations, theirExp) : null;
        const boostExpiresAt = boostMap.get(p.id) ?? null;
        return {
          ...p,
          seen_at: seenAtMap.get(p.id) ?? now,
          compatibility_score: compatScore,
          is_certified: cert?.is_certified || false,
          show_badge: cert?.show_badge || false,
          is_boosted: Boolean(boostExpiresAt),
          boost_expires_at: boostExpiresAt,
        };
      })
      .sort((a: any, b: any) => new Date(b.seen_at).getTime() - new Date(a.seen_at).getTime());

    return new Response(
      JSON.stringify({ profiles: enriched }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in get-seen-profiles:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
