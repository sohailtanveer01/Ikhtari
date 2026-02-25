import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtari.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@ikhtari.com";
const FROM_NAME = Deno.env.get("FROM_NAME") || "Ikhtari";

// Email sent when the wali already has an Ikhtari account
function buildExistingUserEmail(inviterName: string, waliEmail: string): object {
  return {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: waliEmail,
    subject: `${inviterName} has invited you to be their Wali on Ikhtari`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #0A0A0A; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #B8860B; margin: 0; font-size: 28px;">Ikhtari</h1>
          </div>
          <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0A0A0A; margin-top: 0;">You've been invited as a Wali</h2>
            <p style="color: #666; font-size: 16px;">
              <strong style="color: #0A0A0A;">${inviterName}</strong> has invited you to be their Wali (Islamic guardian) on Ikhtari.
            </p>
            <div style="background-color: #F9F5E7; border-left: 4px solid #B8860B; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
              <p style="margin: 0; color: #7a5c00; font-size: 14px; line-height: 1.6;">
                As a Wali, you will have <strong>read-only access</strong> to ${inviterName}'s conversations. Both sides of every chat will see a "Wali is present" badge, adding transparency aligned with Islamic courtship values.
              </p>
            </div>
            <p style="color: #666; font-size: 16px;">
              To accept or decline this invitation, open the Ikhtari app and go to:
            </p>
            <p style="text-align: center; margin: 24px 0;">
              <span style="background-color: #0A0A0A; color: #B8860B; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                Profile → Settings → Wali / Chaperone
              </span>
            </p>
            <p style="color: #999; font-size: 14px;">
              If you don't wish to be a Wali for this person, you can simply ignore this email or decline in the app.
            </p>
            <p style="color: #666; font-size: 16px; margin-top: 30px;">
              Best regards,<br>
              <strong style="color: #B8860B;">The Ikhtari Team</strong>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Ikhtari. All rights reserved.</p>
            <p>
              <a href="https://ikhtari.com" style="color: #B8860B; text-decoration: none;">Visit our website</a> |
              <a href="https://ikhtari.com/support" style="color: #B8860B; text-decoration: none;">Support</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
You've been invited as a Wali on Ikhtari

${inviterName} has invited you to be their Wali (Islamic guardian) on Ikhtari.

As a Wali, you will have read-only access to ${inviterName}'s conversations. Both sides of every chat will see a "Wali is present" badge, adding transparency aligned with Islamic courtship values.

To accept or decline, open the Ikhtari app and go to:
Profile → Settings → Wali / Chaperone

If you don't wish to accept, you can ignore this email or decline in the app.

Best regards,
The Ikhtari Team

© ${new Date().getFullYear()} Ikhtari. All rights reserved.
https://ikhtari.com
    `.trim(),
  };
}

// Email sent when the wali does NOT have an Ikhtari account yet
function buildNewUserEmail(inviterName: string, waliEmail: string): object {
  return {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: waliEmail,
    subject: `${inviterName} wants you to be their Wali on Ikhtari`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #0A0A0A; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #B8860B; margin: 0; font-size: 28px;">Ikhtari</h1>
            <p style="color: #9CA3AF; margin: 8px 0 0 0; font-size: 14px;">Islamic Matrimonial App</p>
          </div>
          <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0A0A0A; margin-top: 0;">You've been invited as a Wali</h2>
            <p style="color: #666; font-size: 16px;">
              <strong style="color: #0A0A0A;">${inviterName}</strong> has invited you to be their Wali (Islamic guardian) on <strong>Ikhtari</strong>, an Islamic matrimonial app built on the values of halal courtship.
            </p>
            <div style="background-color: #F9F5E7; border-left: 4px solid #B8860B; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
              <p style="margin: 0; color: #7a5c00; font-size: 14px; line-height: 1.6;">
                As a Wali, you will have <strong>read-only access</strong> to ${inviterName}'s conversations once you create a free account and accept the invitation. Both sides of every chat will see a "Wali is present" badge.
              </p>
            </div>
            <p style="color: #666; font-size: 16px;">
              To get started, download Ikhtari and sign up using <strong>${waliEmail}</strong> — your invite will be linked automatically.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://apps.apple.com/app/ikhtari" style="display: inline-block; background-color: #B8860B; color: #000000; padding: 14px 32px; border-radius: 30px; font-size: 16px; font-weight: 700; text-decoration: none;">
                Download Ikhtari
              </a>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
              You must sign up with <strong>${waliEmail}</strong> for the invite to be linked.
            </p>
            <p style="color: #666; font-size: 16px; margin-top: 30px;">
              Best regards,<br>
              <strong style="color: #B8860B;">The Ikhtari Team</strong>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Ikhtari. All rights reserved.</p>
            <p>
              <a href="https://ikhtari.com" style="color: #B8860B; text-decoration: none;">Visit our website</a> |
              <a href="https://ikhtari.com/support" style="color: #B8860B; text-decoration: none;">Support</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
You've been invited as a Wali on Ikhtari

${inviterName} has invited you to be their Wali (Islamic guardian) on Ikhtari, an Islamic matrimonial app.

As a Wali, you will have read-only access to ${inviterName}'s conversations once you create a free account and accept the invitation.

To get started, download Ikhtari and sign up using ${waliEmail} — your invite will be linked automatically.

Download: https://apps.apple.com/app/ikhtari

You must sign up with ${waliEmail} for the invite to be linked.

Best regards,
The Ikhtari Team

© ${new Date().getFullYear()} Ikhtari. All rights reserved.
https://ikhtari.com
    `.trim(),
  };
}

async function sendEmail(payload: object): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (user.email?.toLowerCase() === normalizedEmail) {
      return new Response(
        JSON.stringify({ error: "You cannot invite yourself as a Wali" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, {
      auth: { persistSession: false },
    });

    // Fetch inviter's display name
    const { data: inviterProfile } = await serviceClient
      .from("users")
      .select("first_name, last_name, name")
      .eq("id", user.id)
      .maybeSingle();

    const inviterName =
      inviterProfile?.first_name && inviterProfile?.last_name
        ? `${inviterProfile.first_name} ${inviterProfile.last_name}`
        : inviterProfile?.first_name || inviterProfile?.name || "Someone";

    // Look up whether the wali already has an account
    const { data: chaperoneUser } = await serviceClient
      .from("users")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    const chaperoneId = chaperoneUser?.id ?? null;
    const hasAccount = !!chaperoneId;

    // Upsert the chaperone link
    const { error: upsertError } = await serviceClient
      .from("chaperone_links")
      .upsert(
        {
          user_id: user.id,
          invite_email: normalizedEmail,
          chaperone_id: chaperoneId,
          status: "pending",
        },
        { onConflict: "user_id,invite_email" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send the appropriate email — fire and don't fail the request if it errors
    try {
      const emailPayload = hasAccount
        ? buildExistingUserEmail(inviterName, normalizedEmail)
        : buildNewUserEmail(inviterName, normalizedEmail);
      await sendEmail(emailPayload);
      console.log(`Wali invite email sent to ${normalizedEmail} (has_account=${hasAccount})`);
    } catch (emailError) {
      // Log but don't surface to client — the invite record was already saved
      console.error("Failed to send wali invite email:", emailError);
    }

    return new Response(
      JSON.stringify({ status: "invited", has_account: hasAccount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in invite-chaperone:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
