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

    // Service role client — bypasses RLS for seen-profile writes/reads
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

    const { limit = 4, mark_seen_ids = [], exclude_ids = [], feed_mode = 'compatible' } = await req.json();

    // Persist seen profiles to DB (best-effort — failures don't block the response)
    if (mark_seen_ids.length > 0) {
      const seenRows = mark_seen_ids.map((id: string) => ({
        user_id: user.id,
        profile_id: id,
      }));
      const { error: upsertError } = await supabaseAdmin
        .from("discover_seen_profiles")
        .upsert(seenRows, { onConflict: "user_id,profile_id", ignoreDuplicates: true });
      if (upsertError) {
        console.error("Failed to persist seen profiles:", upsertError.message);
      }
    }

    // Get current user's profile
    const { data: currentUserProfile, error: userProfileError } = await supabaseClient
      .from("users")
      .select("gender")
      .eq("id", user.id)
      .single();

    if (userProfileError || !currentUserProfile) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const oppositeGender = currentUserProfile.gender === "male" ? "female" : currentUserProfile.gender === "female" ? "male" : null;
    if (!oppositeGender) {
      return new Response(
        JSON.stringify({ error: "Invalid user gender" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's preferences
    const { data: preferences } = await supabaseClient
      .from("user_preferences")
      .select("location_enabled, location_filter_type, search_radius_miles, search_location, search_country, age_min, age_max, height_min_cm, ethnicity_preferences, marital_status_preferences, children_preferences, religiosity_preferences")
      .eq("user_id", user.id)
      .single();

    // Build exclusion set — always starts with client-sent IDs (no DB dependency)
    // This guarantees correct exclusion even if the DB write above failed.
    const seenProfileIds = new Set<string>([...mark_seen_ids, ...exclude_ids]);

    // Also merge in DB-persisted seen profiles (for cross-session exclusion)
    const { data: seenProfiles, error: seenFetchError } = await supabaseAdmin
      .from("discover_seen_profiles")
      .select("profile_id")
      .eq("user_id", user.id);
    if (seenFetchError) {
      console.error("Failed to fetch seen profiles from DB:", seenFetchError.message);
    }
    (seenProfiles || []).forEach((s: any) => seenProfileIds.add(s.profile_id));

    // Get users that already have an interest_request (sent by current user)
    const { data: sentInterests } = await supabaseClient
      .from("interest_requests")
      .select("recipient_id")
      .eq("sender_id", user.id);
    const sentInterestIds = new Set((sentInterests || []).map((s: any) => s.recipient_id));

    // Also exclude users who sent interest to current user (they appear in interests tab)
    const { data: receivedInterests } = await supabaseClient
      .from("interest_requests")
      .select("sender_id")
      .eq("recipient_id", user.id);
    const receivedInterestIds = new Set((receivedInterests || []).map((r: any) => r.sender_id));

    // Get blocked users (both ways)
    const { data: blocksIBlocked } = await supabaseClient
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    const { data: blocksIAmBlocked } = await supabaseClient
      .from("blocks")
      .select("blocker_id")
      .eq("blocked_id", user.id);

    const blockedUserIds = new Set<string>();
    if (blocksIBlocked) blocksIBlocked.forEach((b: any) => blockedUserIds.add(b.blocked_id));
    if (blocksIAmBlocked) blocksIAmBlocked.forEach((b: any) => blockedUserIds.add(b.blocker_id));

    // Get unmatched users
    const { data: unmatches } = await supabaseClient
      .from("unmatches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    const unmatchedUserIds = new Set<string>();
    if (unmatches) {
      unmatches.forEach((u: any) => {
        unmatchedUserIds.add(u.user1_id === user.id ? u.user2_id : u.user1_id);
      });
    }

    // Get matched users
    const { data: matches } = await supabaseClient
      .from("matches")
      .select("user1, user2")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`);
    const matchedUserIds = new Set<string>();
    if (matches) {
      matches.forEach((m: any) => {
        matchedUserIds.add(m.user1 === user.id ? m.user2 : m.user1);
      });
    }

    // Fetch profiles
    let query = supabaseClient
      .from("users")
      .select("*")
      .neq("id", user.id)
      .eq("gender", oppositeGender)
      .eq("account_active", true)
      .order("last_active_at", { ascending: false })
      .limit(limit * 10); // Extra to account for in-memory filtering

    const { data: allProfiles, error: profilesError } = await query;
    if (profilesError) {
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper functions
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const calculateAge = (dob: string | null): number | null => {
      if (!dob) return null;
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return age;
    };

    const parseHeightToCm = (heightStr: string | null): number | null => {
      if (!heightStr) return null;
      const cmMatch = heightStr.match(/(\d+)\s*cm/i);
      if (cmMatch) return parseInt(cmMatch[1], 10);
      const ftMatch = heightStr.match(/(\d+)'(\d+)/);
      if (ftMatch) return Math.round((parseInt(ftMatch[1], 10) * 30.48) + (parseInt(ftMatch[2], 10) * 2.54));
      return null;
    };

    // Extract search location
    let searchLat: number | null = null;
    let searchLon: number | null = null;
    let searchRadiusMeters: number | null = null;
    let searchCountry: string | null = null;

    if (preferences?.location_enabled) {
      if (preferences.location_filter_type === "distance" && preferences?.search_location) {
        const searchMatch = preferences.search_location.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
        if (searchMatch) {
          searchLon = parseFloat(searchMatch[1]);
          searchLat = parseFloat(searchMatch[2]);
          searchRadiusMeters = (preferences.search_radius_miles || 50) * 1609.34;
        }
      } else if (preferences.location_filter_type === "country" && preferences?.search_country) {
        searchCountry = preferences.search_country;
      }
    }

    // Fetch active boosts
    const candidateIds = (allProfiles || []).map((p: any) => p.id);
    const boostMap = new Map<string, string>();
    if (candidateIds.length > 0) {
      const { data: activeBoosts } = await supabaseClient
        .from("profile_boosts")
        .select("user_id, expires_at")
        .in("user_id", candidateIds)
        .gt("expires_at", new Date().toISOString());
      if (activeBoosts) {
        activeBoosts.forEach((b: any) => {
          if (b?.user_id && b?.expires_at) boostMap.set(b.user_id, b.expires_at);
        });
      }
    }

    // Filter profiles
    let filteredProfiles = (allProfiles || []).filter((profile: any) => {
      if (seenProfileIds.has(profile.id)) return false;
      if (sentInterestIds.has(profile.id)) return false;
      // Note: receivedInterestIds are NOT excluded — they appear with "Liked you" label
      if (blockedUserIds.has(profile.id)) return false;
      if (unmatchedUserIds.has(profile.id)) return false;
      if (matchedUserIds.has(profile.id)) return false;
      if (!profile.photos || profile.photos.length === 0) return false;

      // Preference filters — only applied in 'filters' mode
      if (feed_mode === 'filters') {
        // Location filter
        if (preferences?.location_enabled) {
          if (preferences.location_filter_type === "distance") {
            if (searchLat !== null && searchLon !== null && searchRadiusMeters !== null && profile.location) {
              const profileMatch = profile.location.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
              if (profileMatch) {
                const distance = calculateDistance(searchLat, searchLon, parseFloat(profileMatch[2]), parseFloat(profileMatch[1]));
                if (distance > searchRadiusMeters) return false;
              } else {
                return false;
              }
            } else if (!profile.location) {
              return false;
            }
          } else if (preferences.location_filter_type === "country" && searchCountry) {
            if (!profile.nationality || !profile.nationality.toLowerCase().includes(searchCountry.toLowerCase())) {
              return false;
            }
          }
        }

        // Age filter
        if (preferences && (preferences.age_min !== null || preferences.age_max !== null) && profile.dob) {
          const age = calculateAge(profile.dob);
          if (age === null) return false;
          if (preferences.age_min !== null && age < preferences.age_min) return false;
          if (preferences.age_max !== null && age > preferences.age_max) return false;
        }

        // Height filter
        if (preferences && preferences.height_min_cm !== null && profile.height) {
          const heightCm = parseHeightToCm(profile.height);
          if (heightCm === null || heightCm < preferences.height_min_cm) return false;
        }

        // Ethnicity filter
        if (preferences?.ethnicity_preferences?.length > 0) {
          if (!profile.ethnicity || !preferences.ethnicity_preferences.includes(profile.ethnicity)) return false;
        }

        // Marital status filter
        if (preferences?.marital_status_preferences?.length > 0) {
          if (!profile.marital_status || !preferences.marital_status_preferences.includes(profile.marital_status)) return false;
        }

        // Children filter
        if (preferences?.children_preferences?.length > 0) {
          const profileHasChildren = profile.has_children === true ? "yes" : profile.has_children === false ? "no" : null;
          if (profileHasChildren === null || !preferences.children_preferences.includes(profileHasChildren)) return false;
        }
      }

      return true;
    });

    // Fetch certification & expectations for compatibility scoring
    const filteredIds = filteredProfiles.map((p: any) => p.id);

    // Check if current user is certified + has expectations
    const { data: mycertification } = await supabaseClient
      .from("marriage_course_certifications")
      .select("is_certified")
      .eq("user_id", user.id)
      .single();

    let myExpectations: any = null;
    const certificationMap = new Map<string, { is_certified: boolean; show_badge: boolean }>();
    const expectationsMap = new Map<string, any>();

    // Only fetch expectations when we need compatibility scoring (not in 'all' mode)
    if (feed_mode !== 'all' && mycertification?.is_certified) {
      const { data: meData } = await supabaseClient
        .from("marriage_expectations_obligations")
        .select("*")
        .eq("user_id", user.id)
        .single();
      myExpectations = meData;
    }

    // Batch-fetch certifications for filtered profiles (always needed for badge display)
    if (filteredIds.length > 0) {
      const { data: certs } = await supabaseClient
        .from("marriage_course_certifications")
        .select("user_id, is_certified, show_badge")
        .in("user_id", filteredIds);
      if (certs) {
        certs.forEach((c: any) => {
          certificationMap.set(c.user_id, { is_certified: c.is_certified, show_badge: c.show_badge });
        });
      }

      // Batch-fetch expectations for certified profiles (only if I'm certified and not in 'all' mode)
      if (myExpectations) {
        const certifiedIds = certs?.filter((c: any) => c.is_certified).map((c: any) => c.user_id) || [];
        if (certifiedIds.length > 0) {
          const { data: exps } = await supabaseClient
            .from("marriage_expectations_obligations")
            .select("*")
            .in("user_id", certifiedIds)
            .eq("is_complete", true);
          if (exps) {
            exps.forEach((e: any) => expectationsMap.set(e.user_id, e));
          }
        }
      }
    }

    // Compatibility scoring — must exactly mirror lib/compatibility.ts
    // Categories: Deen 30%, Financial 20%, Lifestyle 20%, Family 20%, Mahr 10%
    const OPTION_ORDERS: Record<string, string[]> = {
      primary_provider: ["husband", "shared", "flexible"],
      expected_income_range: ["low", "medium", "high", "flexible"],
      financial_transparency: ["true", "false"],
      savings_expectations: ["high", "medium", "low", "none"],
      living_arrangement: ["separate", "with_family", "flexible"],
      work_life_balance: ["traditional", "modern", "flexible"],
      social_activities: ["conservative", "moderate", "active"],
      technology_usage: ["limited", "moderate", "active"],
      travel_expectations: ["frequent", "occasional", "rare", "none"],
      mahr_type: ["cash", "property", "education", "symbolic", "flexible"],
      mahr_range: ["symbolic", "modest", "moderate", "substantial", "flexible"],
      payment_timeline: ["immediate", "deferred", "flexible"],
      flexibility: ["strict", "moderate", "very_flexible"],
      family_involvement: ["high", "moderate", "low", "none"],
      living_with_inlaws: ["yes", "temporary", "no", "flexible"],
      family_visits: ["frequent", "moderate", "occasional", "rare"],
      cultural_priorities: ["islamic_first", "balanced", "cultural_first"],
      prayer_together: ["always", "often", "sometimes", "prefer_not"],
      religious_education_children: ["essential", "important", "preferred"],
      religious_activities: ["very_active", "active", "moderate", "minimal"],
      madhhab_compatibility: ["essential", "important", "preferred", "flexible"],
    };
    const scoreField = (av: string, bv: string, field: string): number => {
      if (av === bv) return 100;
      if (av === "flexible" || av === "very_flexible" || bv === "flexible" || bv === "very_flexible") return 80;
      const order = OPTION_ORDERS[field];
      if (!order) return 50;
      const ia = order.indexOf(av), ib = order.indexOf(bv);
      if (ia === -1 || ib === -1) return 50;
      return Math.abs(ia - ib) === 1 ? 60 : 20;
    };
    const scoreCategory = (a: any, b: any): number => {
      if (!a || !b) return 0;
      const fields = Object.keys(a);
      let total = 0, count = 0;
      for (const f of fields) {
        if (a[f] === undefined || b[f] === undefined) continue;
        total += scoreField(String(a[f]), String(b[f]), f);
        count++;
      }
      return count > 0 ? Math.round(total / count) : 0;
    };
    const computeScore = (mine: any, theirs: any): number | null => {
      if (!mine || !theirs) return null;
      const deen     = scoreCategory(mine.religious_expectations,  theirs.religious_expectations);
      const financial = scoreCategory(mine.financial_expectations, theirs.financial_expectations);
      const lifestyle = scoreCategory(mine.lifestyle_expectations, theirs.lifestyle_expectations);
      const family   = scoreCategory(mine.family_expectations,     theirs.family_expectations);
      const mahr     = scoreCategory(mine.mahr_expectations,       theirs.mahr_expectations);
      return Math.round(deen * 0.30 + financial * 0.20 + lifestyle * 0.20 + family * 0.20 + mahr * 0.10);
    };

    // Fetch prompts for filtered profiles
    const promptMap = new Map<string, any[]>();
    if (filteredIds.length > 0) {
      const { data: prompts } = await supabaseClient
        .from("user_prompts")
        .select("user_id, question, answer, display_order")
        .in("user_id", filteredIds)
        .order("display_order", { ascending: true });
      prompts?.forEach((p: any) => {
        if (!promptMap.has(p.user_id)) promptMap.set(p.user_id, []);
        promptMap.get(p.user_id)!.push({ question: p.question, answer: p.answer, display_order: p.display_order });
      });
    }

    // Fetch intent questions for filtered profiles
    const intentQuestionsMap = new Map<string, any[]>();
    if (filteredIds.length > 0) {
      const { data: intentQuestions } = await supabaseClient
        .from("intent_questions")
        .select("id, user_id, question_text, is_from_library, library_question_id, display_order")
        .in("user_id", filteredIds)
        .order("display_order", { ascending: true });
      intentQuestions?.forEach((q: any) => {
        if (!intentQuestionsMap.has(q.user_id)) intentQuestionsMap.set(q.user_id, []);
        intentQuestionsMap.get(q.user_id)!.push({
          id: q.id,
          question_text: q.question_text,
          is_from_library: q.is_from_library,
          library_question_id: q.library_question_id,
          display_order: q.display_order,
        });
      });
    }

    // Sort: boosted first, then by compatibility score (highest first), then non-certified last
    const BOOST_BONUS = 1000; // Boosted profiles always appear first

    const mapped = filteredProfiles.map((p: any) => {
      const boostExpiresAt = boostMap.get(p.id) ?? null;
      const isBoosted = Boolean(boostExpiresAt);
      const cert = certificationMap.get(p.id);
      const theirExp = expectationsMap.get(p.id);
      const compatScore = myExpectations && theirExp ? computeScore(myExpectations, theirExp) : null;

      return {
        ...p,
        is_boosted: isBoosted,
        boost_expires_at: boostExpiresAt,
        is_certified: cert?.is_certified || false,
        show_badge: cert?.show_badge || false,
        compatibility_score: compatScore,
        is_interested_in_me: receivedInterestIds.has(p.id),
        prompts: promptMap.get(p.id) || [],
        intent_questions: intentQuestionsMap.get(p.id) || [],
      };
    });

    let ranked: any[];
    if (feed_mode === 'all') {
      // Random shuffle — boosted profiles still appear first
      const boosted = mapped.filter((p: any) => p.is_boosted).sort(() => Math.random() - 0.5);
      const rest = mapped.filter((p: any) => !p.is_boosted).sort(() => Math.random() - 0.5);
      ranked = [...boosted, ...rest];
    } else {
      // Score-based sort: boosted > compat score > certified > non-certified
      ranked = mapped
        .map((p: any) => {
          let sortKey = 0;
          if (p.is_boosted) {
            sortKey = BOOST_BONUS + (p.compatibility_score ?? 0);
          } else if (p.compatibility_score !== null) {
            sortKey = p.compatibility_score;
          } else if (p.is_certified) {
            sortKey = -1;
          } else {
            sortKey = -2;
          }
          return { ...p, __sortKey: sortKey };
        })
        .sort((a: any, b: any) => b.__sortKey - a.__sortKey)
        .map(({ __sortKey, ...rest }: any) => rest);
    }

    const paginatedProfiles = ranked.slice(0, limit);
    const hasMore = ranked.length > limit;

    return new Response(
      JSON.stringify({ profiles: paginatedProfiles, has_more: hasMore }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in get-discover-feed:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
