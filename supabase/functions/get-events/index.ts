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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse optional location from body
    let latitude: number | null = null;
    let longitude: number | null = null;
    let radius_miles = 100;

    try {
      const body = await req.json();
      if (typeof body.latitude === "number") latitude = body.latitude;
      if (typeof body.longitude === "number") longitude = body.longitude;
      if (typeof body.radius_miles === "number") radius_miles = body.radius_miles;
    } catch {
      // No body or invalid JSON — proceed without location
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let eventsData: any[] = [];

    if (latitude !== null && longitude !== null) {
      // Order by distance using PostGIS
      const { data, error } = await serviceClient.rpc("get_events_by_distance", {
        user_lat: latitude,
        user_lon: longitude,
        radius_m: radius_miles * 1609.34,
      });

      if (error) {
        console.error("RPC error:", error);
        // Fallback to date-sorted if RPC fails
        const { data: fallback, error: fbError } = await serviceClient
          .from("events")
          .select("*")
          .eq("is_active", true)
          .gt("event_date", new Date().toISOString())
          .order("event_date", { ascending: true });

        if (fbError) throw fbError;
        eventsData = fallback || [];
      } else {
        eventsData = (data || []).map((row: any) => ({
          ...row,
          distance_miles: row.distance_meters != null
            ? Math.round((row.distance_meters / 1609.34) * 10) / 10
            : null,
        }));
      }
    } else {
      // No location — sort by date
      const { data, error } = await serviceClient
        .from("events")
        .select("*")
        .eq("is_active", true)
        .gt("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (error) throw error;
      eventsData = (data || []).map((row: any) => ({ ...row, distance_miles: null }));
    }

    // Fetch user's tickets for these events
    const eventIds = eventsData.map((e: any) => e.id);
    let userTicketEventIds = new Set<string>();

    if (eventIds.length > 0) {
      const { data: tickets } = await supabaseClient
        .from("event_tickets")
        .select("event_id")
        .eq("user_id", user.id)
        .in("event_id", eventIds)
        .eq("status", "confirmed");

      if (tickets) {
        tickets.forEach((t: any) => userTicketEventIds.add(t.event_id));
      }
    }

    const events = eventsData.map((event: any) => ({
      ...event,
      user_has_ticket: userTicketEventIds.has(event.id),
    }));

    return new Response(
      JSON.stringify({ events, user_location_used: latitude !== null && longitude !== null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-events:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
