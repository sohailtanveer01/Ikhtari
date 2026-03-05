import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtiar.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { user_id, limit = 20 } = await req.json();

    if (user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get current user's profile to fetch their gender
    const { data: currentUserProfile, error: userProfileError } = await supabaseClient
      .from("users")
      .select("gender")
      .eq("id", user.id)
      .single();

    if (userProfileError || !currentUserProfile) {
      console.error("Error fetching current user profile:", userProfileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine opposite gender for filtering
    const currentUserGender = currentUserProfile.gender;
    const oppositeGender = currentUserGender === "male" ? "female" : currentUserGender === "female" ? "male" : null;

    if (!oppositeGender) {
      return new Response(
        JSON.stringify({ error: "Invalid user gender" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's preferences
    const { data: preferences, error: prefsError } = await supabaseClient
      .from("user_preferences")
      .select("location_enabled, location_filter_type, search_radius_miles, search_location, search_country, age_min, age_max, height_min_cm, ethnicity_preferences, marital_status_preferences, children_preferences, religiosity_preferences")
      .eq("user_id", user.id)
      .single();

    if (prefsError && prefsError.code !== "PGRST116") {
      console.error("Error fetching preferences:", prefsError);
      // Continue without preferences if not found (PGRST116 = no rows)
    }

    // Get users that the current user has already swiped on
    const { data: swipedUsers } = await supabaseClient
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", user.id);

    const swipedIds = swipedUsers?.map((s) => s.swiped_id) || [];
    const swipedIdsSet = new Set(swipedIds);

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

    // Get all unmatched users (both ways - users I unmatched and users who unmatched me)
    // Exclude all unmatched users regardless of rematch status
    const { data: unmatches } = await supabaseClient
      .from("unmatches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    const unmatchedUserIds = new Set<string>();
    if (unmatches) {
      unmatches.forEach((unmatch) => {
        // Exclude all unmatched users (both ways - if user1 unmatched user2, both are excluded from each other's feed)
        const otherUserId = unmatch.user1_id === user.id ? unmatch.user2_id : unmatch.user1_id;
        unmatchedUserIds.add(otherUserId);
      });
    }

    // Get matched users to exclude from swipe feed
    const { data: matches } = await supabaseClient
      .from("matches")
      .select("user1, user2")
      .or(`user1.eq.${user.id},user2.eq.${user.id}`);

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

    // Get users who have sent a compliment to the current user
    // These users should NOT appear in swipe feed - they should only appear in chat list as pending compliments
    const { data: receivedCompliments } = await supabaseClient
      .from("compliments")
      .select("sender_id")
      .eq("recipient_id", user.id)
      .eq("status", "pending"); // Only exclude if compliment is still pending

    const complimentSenderIds = new Set<string>();
    if (receivedCompliments) {
      receivedCompliments.forEach((compliment) => {
        complimentSenderIds.add(compliment.sender_id);
      });
    }

    // Get users who have liked the current user (to unblur them if they appear in feed)
    const { data: likers } = await supabaseClient
      .from("swipes")
      .select("swiper_id")
      .eq("swiped_id", user.id)
      .eq("action", "like");

    const likerIdsSet = new Set(likers?.map((l: any) => l.swiper_id) || []);


    // Build query for profiles - get more to account for filtering
    // Filter by opposite gender (constant filter - users can't change gender)
    let query = supabaseClient
      .from("users")
      .select("*")
      .neq("id", user.id)
      .eq("gender", oppositeGender) // Only show opposite gender
      .eq("account_active", true) // Only show active profiles
      .order("last_active_at", { ascending: false })
      .limit(limit * 5); // Get more to account for filtering

    // If location filter is enabled, we'll filter client-side after fetching
    // (PostGIS functions require raw SQL which isn't easily available in Supabase JS client)
    const { data: allProfiles, error: profilesError } = await query;

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Helper function to calculate distance between two points using Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000; // Earth radius in meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Helper function to calculate age from DOB
    const calculateAge = (dob: string | null): number | null => {
      if (!dob) return null;
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Helper function to parse height string to cm
    const parseHeightToCm = (heightStr: string | null): number | null => {
      if (!heightStr) return null;

      // Try to parse "175 cm" format
      const cmMatch = heightStr.match(/(\d+)\s*cm/i);
      if (cmMatch) {
        return parseInt(cmMatch[1], 10);
      }

      // Try to parse "5'10\"" or "5'10" format
      const ftMatch = heightStr.match(/(\d+)'(\d+)/);
      if (ftMatch) {
        const feet = parseInt(ftMatch[1], 10);
        const inches = parseInt(ftMatch[2], 10);
        return Math.round((feet * 30.48) + (inches * 2.54));
      }

      return null;
    };

    // Extract search location coordinates if distance filter is enabled
    let searchLat: number | null = null;
    let searchLon: number | null = null;
    let searchRadiusMeters: number | null = null;
    let searchCountry: string | null = null;

    if (preferences?.location_enabled) {
      if (preferences.location_filter_type === "distance" && preferences?.search_location) {
        try {
          const searchLocationStr = preferences.search_location;
          const searchMatch = searchLocationStr.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
          if (searchMatch) {
            searchLon = parseFloat(searchMatch[1]);
            searchLat = parseFloat(searchMatch[2]);
            // Convert miles to meters
            searchRadiusMeters = (preferences.search_radius_miles || 50) * 1609.34;
          }
        } catch (error) {
          console.error("Error parsing search location:", error);
        }
      } else if (preferences.location_filter_type === "country" && preferences?.search_country) {
        searchCountry = preferences.search_country;
      }
    }

    // Fetch active boosts for candidate users (to bias ranking later)
    const candidateIds = (allProfiles || []).map((p: any) => p.id);
    const boostMap = new Map<string, string>(); // user_id -> expires_at (ISO)
    if (candidateIds.length > 0) {
      const { data: activeBoosts, error: boostsError } = await supabaseClient
        .from("profile_boosts")
        .select("user_id, expires_at")
        .in("user_id", candidateIds)
        .gt("expires_at", new Date().toISOString());

      if (boostsError) {
        console.error("Error fetching active boosts:", boostsError);
      } else if (activeBoosts) {
        activeBoosts.forEach((b: any) => {
          if (b?.user_id && b?.expires_at) boostMap.set(b.user_id, b.expires_at);
        });
      }
    }

    // Filter profiles - all filtering logic in one place
    // Note: Gender filtering is already applied at the query level (opposite gender only)
    let filteredProfiles = (allProfiles || []).filter((profile) => {
      // Exclude already swiped users
      if (swipedIdsSet.has(profile.id)) return false;

      // Exclude blocked users (both ways)
      if (blockedUserIds.has(profile.id)) return false;

      // Exclude unmatched users (both ways - regardless of rematch status)
      if (unmatchedUserIds.has(profile.id)) return false;

      // Exclude matched users (they should only appear in chat)
      if (matchedUserIds.has(profile.id)) return false;

      // Exclude users who have sent a compliment to the current user
      // These users should only appear in chat list as pending compliments, not in swipe feed
      if (complimentSenderIds.has(profile.id)) return false;

      // Must have photos
      if (!profile.photos || profile.photos.length === 0) return false;

      // Apply location filter if enabled
      if (preferences?.location_enabled) {
        if (preferences.location_filter_type === "distance") {
          // Distance-based filtering
          if (searchLat !== null && searchLon !== null && searchRadiusMeters !== null && profile.location) {
            try {
              // Extract coordinates from profile's PostGIS point
              const profileLocationStr = profile.location;
              const profileMatch = profileLocationStr.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);

              if (profileMatch) {
                const profileLon = parseFloat(profileMatch[1]);
                const profileLat = parseFloat(profileMatch[2]);

                // Calculate distance
                const distance = calculateDistance(searchLat, searchLon, profileLat, profileLon);

                // Filter by radius
                if (distance > searchRadiusMeters) return false;
              } else {
                // If profile location format is invalid, exclude it when distance filter is enabled
                return false;
              }
            } catch (error) {
              console.error("Error calculating distance for profile:", profile.id, error);
              // If distance calculation fails, exclude the profile when distance filter is enabled
              return false;
            }
          } else {
            // Distance filter enabled but no search location set - exclude profiles without location
            if (!profile.location) return false;
          }
        } else if (preferences.location_filter_type === "country") {
          // Country-based filtering
          if (searchCountry) {
            // Filter by country (case-insensitive partial match)
            if (!profile.nationality ||
              !profile.nationality.toLowerCase().includes(searchCountry.toLowerCase())) {
              return false;
            }
          }
        }
      }

      // Age filter (apply if at least one bound is set)
      if (preferences && (preferences.age_min !== null || preferences.age_max !== null) && profile.dob) {
        const age = calculateAge(profile.dob);
        if (age === null) return false;
        if (preferences.age_min !== null && age < preferences.age_min) return false;
        if (preferences.age_max !== null && age > preferences.age_max) return false;
      }

      // Height filter (minimum only)
      if (preferences && preferences.height_min_cm !== null && profile.height) {
        const heightCm = parseHeightToCm(profile.height);
        if (heightCm === null || heightCm < preferences.height_min_cm) return false;
      }

      // Ethnicity filter
      if (preferences && preferences.ethnicity_preferences &&
        Array.isArray(preferences.ethnicity_preferences) &&
        preferences.ethnicity_preferences.length > 0) {
        if (!profile.ethnicity || !preferences.ethnicity_preferences.includes(profile.ethnicity)) {
          return false;
        }
      }

      // Marital status filter
      if (preferences && preferences.marital_status_preferences &&
        Array.isArray(preferences.marital_status_preferences) &&
        preferences.marital_status_preferences.length > 0) {
        if (!profile.marital_status || !preferences.marital_status_preferences.includes(profile.marital_status)) {
          return false;
        }
      }

      // Children filter
      if (preferences && preferences.children_preferences &&
        Array.isArray(preferences.children_preferences) &&
        preferences.children_preferences.length > 0) {
        // profile.has_children is a boolean, children_preferences contains 'yes' or 'no'
        const profileHasChildren = profile.has_children === true ? "yes" : profile.has_children === false ? "no" : null;
        if (profileHasChildren === null || !preferences.children_preferences.includes(profileHasChildren)) {
          return false;
        }
      }

      return true;
    });

    // AFTER filteredProfiles is computed
    const promptMap = new Map<string, any[]>();

    if (candidateIds.length > 0) {
      const { data: prompts, error } = await supabaseClient
        .from("user_prompts")
        .select("user_id, question, answer, display_order")
        .in("user_id", candidateIds)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching prompts:", error);
      }

      prompts?.forEach((p) => {
        if (!promptMap.has(p.user_id)) {
          promptMap.set(p.user_id, []);
        }
        promptMap.get(p.user_id)!.push({
          question: p.question,
          answer: p.answer,
          display_order: p.display_order,
        });
      });
    }


    // Mark boost state and apply a "biased shuffle" to keep the feed natural:
    // Boosted profiles are more likely to appear earlier, but not in a spammy block.
    const BOOST_BONUS = 3; // higher => stronger prioritization, still mixed via jitter
    const JITTER = 2; // randomness to keep natural mix

    const ranked = filteredProfiles
      .map((p: any, idx: number) => {
        const boostExpiresAt = boostMap.get(p.id) ?? null;
        const isBoosted = Boolean(boostExpiresAt);
        const sortKey = idx + (Math.random() * JITTER) - (isBoosted ? BOOST_BONUS : 0);
        return {
          ...p,
          is_boosted: isBoosted,
          boost_expires_at: boostExpiresAt,
          is_liked_by_them: likerIdsSet.has(p.id),
          prompts: promptMap.get(p.id) || [],
          __sortKey: sortKey,
        };
      })
      .sort((a: any, b: any) => a.__sortKey - b.__sortKey)
      .map(({ __sortKey, ...rest }: any) => rest);

    // Limit results (no duplicates possible: we only sort existing unique profiles)
    const profiles = ranked.slice(0, limit);

    return new Response(
      JSON.stringify({ profiles: profiles || [] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get_swipe_feed:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});