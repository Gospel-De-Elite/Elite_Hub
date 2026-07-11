"use strict";

/**
 * Mailer — thin wrapper around the Resend API.
 *
 * All email sending in Elite Hub goes through this file.
 * Swap the provider here and nothing else needs to change.
 *
 * Resend is used because:
 *   - Excellent Nigerian deliverability
 *   - Generous free tier (3,000 emails/month)
 *   - Dead-simple Node SDK — one function call, no SMTP config
 *
 * In development (NODE_ENV !== "production"), emails are NOT sent.
 * The raw content is logged to the console so flows can be tested
 * end-to-end without a real Resend account or verified domain.
 */

const { Resend } = require("resend");
const env    = require("../config/env");
const logger = require("./logger");

let resend;

function getClient() {
  if (!resend) {
    resend = new Resend(env.resend.apiKey);
  }
  return resend;
}

/**
 * Send a single email.
 *
 * @param {object} opts
 * @param {string}          opts.to      - Recipient email address
 * @param {string}          opts.subject - Email subject line
 * @param {string}          opts.html    - HTML body
 * @param {string}          [opts.text]  - Plain-text fallback (auto-generated if omitted)
 * @param {string}          [opts.from]  - Override sender (defaults to FROM_EMAIL env var)
 */
async function sendEmail({ to, subject, html, text, from }) {
  const sender = from || env.resend.fromEmail;

  if (env.nodeEnv !== "production") {
    logger.info(
      `[mailer:dev] Would send email to <${to}>\n` +
      `  Subject : ${subject}\n` +
      `  From    : ${sender}\n` +
      `  Body    : ${text || "(html only)"}`
    );
    return { id: "dev-mode-no-email-sent" };
  }

  try {
    const result = await getClient().emails.send({
      from:    sender,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    logger.info(`[mailer] Email sent to <${to}> — id: ${result.data?.id}`);
    return result.data;
  } catch (err) {
    // Never throw from the mailer — a failed email should never crash the
    // request that triggered it (e.g. registration should succeed even if
    // the welcome email fails). Log and return null so callers can decide
    // whether to surface the issue.
    logger.error(`[mailer] Failed to send email to <${to}>: ${err.message}`);
    return null;
  }
}

// ─── Template helpers ─────────────────────────────────────────────────────────

/**
 * Email verification link sent on registration and on resend request.
 */
async function sendVerificationEmail({ to, firstName, verificationUrl }) {
  return sendEmail({
    to,
    subject: "Verify your Elite Hub email address",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
          <h1 style="font-size: 22px; margin-bottom: 8px;">Hi ${firstName},</h1>
          <p style="color: #64748b; margin-bottom: 24px;">
            Thanks for creating your Elite Hub account. Click the button below to verify your
            email address and activate your account.
          </p>
          <a href="${verificationUrl}"
             style="display: inline-block; background: #26A7EF; color: #fff;
                    padding: 12px 28px; border-radius: 8px; text-decoration: none;
                    font-weight: 600; font-size: 15px;">
            Verify Email Address
          </a>
          <p style="margin-top: 24px; font-size: 13px; color: #94a3b8;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          <p style="margin-top: 8px; font-size: 13px; color: #94a3b8;">
            Or copy this link: <a href="${verificationUrl}" style="color: #26A7EF;">${verificationUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            Elite Hub · De Elite Digitals · <a href="https://elitehub.ng" style="color: #94a3b8;">elitehub.ng</a>
          </p>
        </body>
      </html>
    `,
    text:
      `Hi ${firstName},\n\n` +
      `Verify your Elite Hub email: ${verificationUrl}\n\n` +
      `This link expires in 24 hours.\n\n` +
      `Elite Hub · De Elite Digitals`,
  });
}

/**
 * Password reset link.
 */
async function sendPasswordResetEmail({ to, firstName, resetUrl }) {
  return sendEmail({
    to,
    subject: "Reset your Elite Hub password",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
          <h1 style="font-size: 22px; margin-bottom: 8px;">Password reset request</h1>
          <p style="color: #64748b; margin-bottom: 8px;">Hi ${firstName},</p>
          <p style="color: #64748b; margin-bottom: 24px;">
            We received a request to reset your Elite Hub password.
            Click the button below to choose a new one.
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #26A7EF; color: #fff;
                    padding: 12px 28px; border-radius: 8px; text-decoration: none;
                    font-weight: 600; font-size: 15px;">
            Reset Password
          </a>
          <p style="margin-top: 24px; font-size: 13px; color: #94a3b8;">
            This link expires in 30 minutes. If you didn't request a reset, no action is needed.
          </p>
          <p style="margin-top: 8px; font-size: 13px; color: #94a3b8;">
            Or copy this link: <a href="${resetUrl}" style="color: #26A7EF;">${resetUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            Elite Hub · De Elite Digitals · <a href="https://elitehub.ng" style="color: #94a3b8;">elitehub.ng</a>
          </p>
        </body>
      </html>
    `,
    text:
      `Hi ${firstName},\n\n` +
      `Reset your Elite Hub password: ${resetUrl}\n\n` +
      `This link expires in 30 minutes.\n\n` +
      `Elite Hub · De Elite Digitals`,
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
