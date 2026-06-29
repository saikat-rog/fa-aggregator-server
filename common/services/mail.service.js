import nodemailer from "nodemailer";
import env from "../../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: false,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

const appName = "Folksmint";
const supportSignature = "The Folksmint Team";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const paragraph = (content) => `<p style="margin:0 0 16px;">${content}</p>`;

const renderEmailLayout = ({ title, body }) => `
  <div style="margin:0;padding:0;background:#f6f7f9;font-family:Arial,sans-serif;color:#17202a;">
    <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e6e8eb;border-radius:8px;padding:28px;">
        <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(title)}</h1>
        <div style="font-size:15px;line-height:1.6;color:#374151;">
          ${body}
          ${paragraph(`Regards,<br />${supportSignature}`)}
        </div>
      </div>
    </div>
  </div>
`;

export const buildOtpEmail = ({ otp, purpose = "verify_email" }) => {
  const isPasswordReset = purpose === "reset_password";
  const title = isPasswordReset ? "Reset your password" : "Verify your email";
  const intro = isPasswordReset
    ? "Use this OTP to reset your password."
    : `Use this OTP to verify your ${appName} account.`;

  return {
    subject: isPasswordReset ? `${appName} password reset OTP` : `${appName} email verification OTP`,
    html: renderEmailLayout({
      title,
      body: `
        ${paragraph(intro)}
        <div style="margin:24px 0;padding:18px;background:#f3f4f6;border-radius:8px;text-align:center;font-size:28px;letter-spacing:4px;font-weight:700;color:#111827;">
          ${escapeHtml(otp)}
        </div>
        ${paragraph("This OTP is valid for 5 minutes. If you did not request it, you can ignore this email.")}
      `,
    }),
  };
};

export const buildWelcomeEmail = ({ name, role = "user" } = {}) => ({
  subject: `Welcome to ${appName}`,
  html: renderEmailLayout({
    title: `Welcome${name ? `, ${name}` : ""}!`,
    body: `
      ${paragraph(`Your ${appName} ${escapeHtml(role)} account is ready.`)}
      ${paragraph("You can now sign in and continue from where you left off.")}
    `,
  }),
});

export const buildAdvisorApprovalEmail = ({ name, username } = {}) => ({
  subject: "Your advisor application has been approved",
  html: renderEmailLayout({
    title: "Advisor application approved",
    body: `
      ${paragraph(`Hi ${escapeHtml(name || "there")},`)}
      ${paragraph(`Congratulations! Your ${appName} advisor application has been approved.`)}
      ${
        username
          ? paragraph(`Your advisor username is <strong>${escapeHtml(username)}</strong>.`)
          : ""
      }
      ${paragraph("You can now access advisor features from your account.")}
    `,
  }),
});

export const buildAdvisorRejectionEmail = ({ name, reason } = {}) => ({
  subject: "Your advisor application update",
  html: renderEmailLayout({
    title: "Advisor application reviewed",
    body: `
      ${paragraph(`Hi ${escapeHtml(name || "there")},`)}
      ${paragraph(`Thank you for applying to become a ${appName} advisor. We are unable to approve your application at this time.`)}
      ${reason ? paragraph(`<strong>Reason:</strong> ${escapeHtml(reason)}`) : ""}
      ${paragraph("You can review the feedback and apply again when you are ready.")}
    `,
  }),
});

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!to || !subject || !html) {
    throw new Error("to, subject and html are required to send email");
  }

  const info = await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html,
    text,
  });

  return info;
};

export const sendTemplatedEmail = async ({ to, template }) =>
  sendEmail({
    to,
    ...template,
  });
