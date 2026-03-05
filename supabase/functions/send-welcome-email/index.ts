import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://ikhtiar.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Email service configuration
// Supports Resend (recommended) or SendGrid
const EMAIL_SERVICE = Deno.env.get("EMAIL_SERVICE") || "resend"; // "resend" or "sendgrid"
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "welcome@ikhtiar.app";
const FROM_NAME = Deno.env.get("FROM_NAME") || "Ikhtari";

// Send email using Resend
async function sendEmailWithResend(email: string, name: string) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const emailContent = {
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "Welcome to Ikhtari! 🎉",
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
            <h2 style="color: #0A0A0A; margin-top: 0;">Welcome, ${name}! 🎉</h2>
            <p style="color: #666; font-size: 16px;">
              Thank you for joining Ikhtari! We're thrilled to have you on this journey.
            </p>
            <p style="color: #666; font-size: 16px;">
              Your profile is now complete and you're ready to start connecting with amazing people who share your values.
            </p>
            <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="margin: 0; color: #0A0A0A; font-weight: 600;">What's next?</p>
              <ul style="color: #666; margin: 10px 0 0 0; padding-left: 20px;">
                <li>Start swiping to discover potential matches</li>
                <li>Complete your profile to increase your visibility</li>
                <li>Be authentic and respectful in your interactions</li>
              </ul>
            </div>
            <p style="color: #666; font-size: 16px;">
              We're here to help you find meaningful connections. If you have any questions or need support, don't hesitate to reach out.
            </p>
            <p style="color: #666; font-size: 16px; margin-top: 30px;">
              Best regards,<br>
              <strong style="color: #B8860B;">The Ikhtari Team</strong>
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Ikhtari. All rights reserved.</p>
            <p>
              <a href="https://ikhtiar.app" style="color: #B8860B; text-decoration: none;">Visit our website</a> | 
              <a href="https://ikhtiar.app/support" style="color: #B8860B; text-decoration: none;">Support</a>
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to Ikhtari! 🎉

Thank you for joining Ikhtari, ${name}! We're thrilled to have you on this journey.

Your profile is now complete and you're ready to start connecting with amazing people who share your values.

What's next?
- Start swiping to discover potential matches
- Complete your profile to increase your visibility
- Be authentic and respectful in your interactions

We're here to help you find meaningful connections. If you have any questions or need support, don't hesitate to reach out.

Best regards,
The Ikhtari Team

© ${new Date().getFullYear()} Ikhtari. All rights reserved.
Visit us at https://ikhtiar.app
    `.trim(),
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Send email using SendGrid
async function sendEmailWithSendGrid(email: string, name: string) {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured");
  }

  const emailContent = {
    personalizations: [
      {
        to: [{ email }],
        subject: "Welcome to Ikhtari! 🎉",
      },
    ],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    content: [
      {
        type: "text/html",
        value: `
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
                <h2 style="color: #0A0A0A; margin-top: 0;">Welcome, ${name}! 🎉</h2>
                <p style="color: #666; font-size: 16px;">
                  Thank you for joining Ikhtari! We're thrilled to have you on this journey.
                </p>
                <p style="color: #666; font-size: 16px;">
                  Your profile is now complete and you're ready to start connecting with amazing people who share your values.
                </p>
                <div style="background-color: #F5F5F5; padding: 20px; border-radius: 8px; margin: 30px 0;">
                  <p style="margin: 0; color: #0A0A0A; font-weight: 600;">What's next?</p>
                  <ul style="color: #666; margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Start swiping to discover potential matches</li>
                    <li>Complete your profile to increase your visibility</li>
                    <li>Be authentic and respectful in your interactions</li>
                  </ul>
                </div>
                <p style="color: #666; font-size: 16px;">
                  We're here to help you find meaningful connections. If you have any questions or need support, don't hesitate to reach out.
                </p>
                <p style="color: #666; font-size: 16px; margin-top: 30px;">
                  Best regards,<br>
                  <strong style="color: #B8860B;">The Ikhtari Team</strong>
                </p>
              </div>
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Ikhtari. All rights reserved.</p>
                <p>
                  <a href="https://ikhtiar.app" style="color: #B8860B; text-decoration: none;">Visit our website</a> | 
                  <a href="https://ikhtiar.app/support" style="color: #B8860B; text-decoration: none;">Support</a>
                </p>
              </div>
            </body>
          </html>
        `,
      },
    ],
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify(emailContent),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${error}`);
  }

  return { success: true };
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

    // Get user profile to get name and email
    const { data: profile, error: profileError } = await supabaseClient
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if welcome email was already sent (optional: add a field to track this)
    // For now, we'll send it every time the function is called
    // You can add a `welcome_email_sent` boolean field to the users table to prevent duplicates

    const userEmail = profile.email || user.email;
    const userName = profile.first_name 
      ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ""}`
      : user.email?.split("@")[0] || "there";

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email based on configured service
    let emailResult;
    if (EMAIL_SERVICE === "sendgrid") {
      emailResult = await sendEmailWithSendGrid(userEmail, userName);
    } else {
      // Default to Resend
      emailResult = await sendEmailWithResend(userEmail, userName);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Welcome email sent successfully",
        emailResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send welcome email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

