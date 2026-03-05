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

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event_id } = await req.json();
    if (!event_id) {
      return new Response(
        JSON.stringify({ error: "event_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch event
    const { data: event, error: eventError } = await serviceClient
      .from("events")
      .select("*")
      .eq("id", event_id)
      .eq("is_active", true)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check event hasn't passed
    if (new Date(event.event_date) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This event has already passed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check capacity
    if (event.max_capacity !== null && event.tickets_sold >= event.max_capacity) {
      return new Response(
        JSON.stringify({ error: "This event is sold out" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user doesn't already have a ticket
    const { data: existingTicket } = await serviceClient
      .from("event_tickets")
      .select("id, ticket_code")
      .eq("event_id", event_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingTicket) {
      return new Response(
        JSON.stringify({ error: "You already have a ticket for this event", ticket_code: existingTicket.ticket_code }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STRIPE PAYMENT INTENT — uncomment and configure when Stripe keys are ready
    // ─────────────────────────────────────────────────────────────────────────
    // import Stripe from "https://esm.sh/stripe@13?target=deno";
    // const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });
    //
    // if (event.ticket_price > 0) {
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: Math.round(event.ticket_price * 100),  // cents
    //     currency: (event.ticket_currency || "usd").toLowerCase(),
    //     metadata: { event_id, user_id: user.id },
    //   });
    //   return new Response(
    //     JSON.stringify({ requires_payment: true, client_secret: paymentIntent.client_secret }),
    //     { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }
    // ─────────────────────────────────────────────────────────────────────────

    // STUB: Insert confirmed ticket directly
    const { data: ticket, error: ticketError } = await serviceClient
      .from("event_tickets")
      .insert({
        event_id,
        user_id: user.id,
        status: "confirmed",
        amount_paid: event.ticket_price,
        currency: event.ticket_currency || "USD",
      })
      .select("ticket_code")
      .single();

    if (ticketError) {
      console.error("Ticket insert error:", ticketError);
      return new Response(
        JSON.stringify({ error: "Failed to create ticket" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment tickets_sold
    await serviceClient
      .from("events")
      .update({ tickets_sold: event.tickets_sold + 1 })
      .eq("id", event_id);

    return new Response(
      JSON.stringify({
        success: true,
        ticket_code: ticket.ticket_code,
        event_title: event.title,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in purchase-event-ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
