const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

require("dotenv").config({ path: path.join(__dirname, "../.env"), override: true });

const ETHEREAL_CREDS_PATH = path.join(__dirname, "../.ethereal-credentials.json");

/** Optional local file (gitignored): copy from email-credentials.local.js.example */
function loadLocalCredentials() {
  try {
    // eslint-disable-next-line import/no-unresolved, global-require
    return require("../email-credentials.local.js");
  } catch {
    return null;
  }
}

function getSmtpAuth() {
  const local = loadLocalCredentials();
  const user = (process.env.SMTP_USER || local?.user || "").trim();
  const pass = (process.env.SMTP_PASS || local?.pass || "").replace(/\s/g, "");
  return { user, pass };
}

function isResendConfigured() {
  const key = (process.env.RESEND_API_KEY || "").trim();
  return key.length > 0 && key.startsWith("re_");
}

function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY?.trim());
}

function isSmtpConfigured() {
  const { user, pass } = getSmtpAuth();
  return Boolean(user && pass);
}

/** Respects EMAIL_PROVIDER=smtp|resend|brevo in .env (avoids stale system RESEND_API_KEY) */
function getActiveEmailProvider() {
  const pref = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  if (pref === "smtp" && isSmtpConfigured()) return "smtp";
  if (pref === "resend" && isResendConfigured()) return "resend";
  if (pref === "brevo" && isBrevoConfigured()) return "brevo";
  if (isSmtpConfigured()) return "smtp";
  if (isResendConfigured()) return "resend";
  if (isBrevoConfigured()) return "brevo";
  return null;
}

function getFromAddress() {
  const { user } = getSmtpAuth();
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured && !configured.includes("yourdomain.com")) {
    return configured;
  }
  if (user) {
    return `"Government Scheme Portal" <${user}>`;
  }
  if (process.env.BREVO_SENDER_EMAIL) {
    return `"Government Scheme Portal" <${process.env.BREVO_SENDER_EMAIL}>`;
  }
  return '"Government Scheme Portal" <noreply@govscheme.local>';
}

function createSmtpTransporter() {
  const { user, pass } = getSmtpAuth();
  const host = (process.env.SMTP_HOST || "").toLowerCase();
  const useGmail =
    process.env.SMTP_SERVICE === "gmail" ||
    host.includes("gmail") ||
    user.endsWith("@gmail.com");

  if (useGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: true,
    auth: { user, pass },
  });
}

async function getEtherealCredentials() {
  if (fs.existsSync(ETHEREAL_CREDS_PATH)) {
    return JSON.parse(fs.readFileSync(ETHEREAL_CREDS_PATH, "utf8"));
  }
  const account = await nodemailer.createTestAccount();
  const creds = {
    user: account.user,
    pass: account.pass,
    smtp: account.smtp,
  };
  fs.writeFileSync(ETHEREAL_CREDS_PATH, JSON.stringify(creds, null, 2));
  console.log("📧 Dev email account created (Ethereal):", creds.user);
  console.log("   Login at https://ethereal.email to view test messages.");
  return creds;
}

async function getEtherealTransporter() {
  const creds = await getEtherealCredentials();
  const transporter = nodemailer.createTransport({
    host: creds.smtp.host,
    port: creds.smtp.port,
    secure: creds.smtp.secure,
    auth: { user: creds.user, pass: creds.pass },
  });
  transporter._etherealFrom = creds.user;
  return transporter;
}

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const formatEligibilityRules = (rules = {}) => {
  const lines = [];
  if (rules.ageMin != null || rules.ageMax != null) {
    lines.push(`Age: ${rules.ageMin ?? "Any"} – ${rules.ageMax ?? "Any"} years`);
  }
  if (rules.incomeMax != null) {
    lines.push(`Maximum annual income: ₹${rules.incomeMax}`);
  }
  const ruleFields = [
    ["Gender", rules.gender],
    ["Category", rules.category],
    ["Education", rules.education],
    ["Occupation", rules.occupation],
    ["Caste", rules.caste],
    ["State", rules.state],
    ["District", rules.district],
  ];
  for (const [label, val] of ruleFields) {
    if (val && val !== "Any") lines.push(`${label}: ${val}`);
  }
  return lines.length ? lines : ["No specific eligibility restrictions listed."];
};

const buildSchemeApplicationEmail = (user, scheme, applicationInfo) => {
  const { trackingNumber, status, appliedAt } = applicationInfo;
  const rules = scheme.rules || {};
  const eligibilityLines = formatEligibilityRules(rules);
  const documents = scheme.documentsRequired?.length
    ? scheme.documentsRequired.map((d) => `• ${d}`).join("\n")
    : "• As per official scheme guidelines";

  const appliedDate = new Date(appliedAt).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const deadline = scheme.deadline
    ? new Date(scheme.deadline).toLocaleDateString("en-IN", { dateStyle: "full" })
    : "Open until further notice";

  const subject = `Application Received: ${scheme.name} | Tracking ${trackingNumber}`;

  const text = `
Government Scheme Portal — Application Confirmation

Dear ${user.name},

Your application has been submitted successfully.

APPLICATION DETAILS
-------------------
Scheme Name: ${scheme.name}
Tracking Number: ${trackingNumber}
Status: ${status}
Applied On: ${appliedDate}

SCHEME INFORMATION
------------------
Description:
${formatValue(scheme.description)}

Benefits:
${formatValue(scheme.benefit)}

Official Apply Link:
${formatValue(scheme.applyLink)}

Application Deadline: ${deadline}

DOCUMENTS REQUIRED
------------------
${documents.replace(/• /g, "- ")}

ELIGIBILITY CRITERIA
--------------------
${eligibilityLines.join("\n")}

---
This is an automated notification. Please keep your tracking number for future reference.
Government Scheme Portal
`.trim();

  const eligibilityHtml = eligibilityLines.map((line) => `<li>${line}</li>`).join("");
  const documentsHtml = (scheme.documentsRequired?.length
    ? scheme.documentsRequired
    : ["As per official scheme guidelines"]
  )
    .map((d) => `<li>${d}</li>`)
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a365d; color: #fff; padding: 16px 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">Government Scheme Portal</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Application confirmation</p>
  </div>
  <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear <strong>${user.name}</strong>,</p>
    <p>Your application for <strong>${scheme.name}</strong> has been submitted successfully.</p>
    <div style="background: #f0fff4; border-left: 4px solid #38a169; padding: 12px 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px;"><strong>Tracking Number:</strong> <code style="font-size: 16px;">${trackingNumber}</code></p>
      <p style="margin: 0 0 4px;"><strong>Status:</strong> ${status}</p>
      <p style="margin: 0;"><strong>Applied On:</strong> ${appliedDate}</p>
    </div>
    <h2 style="color: #1a365d; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Scheme: ${scheme.name}</h2>
    <h3 style="font-size: 15px; margin-bottom: 6px;">Description</h3>
    <p>${formatValue(scheme.description)}</p>
    <h3 style="font-size: 15px; margin-bottom: 6px;">Benefits</h3>
    <p>${formatValue(scheme.benefit)}</p>
    <h3 style="font-size: 15px; margin-bottom: 6px;">Documents required</h3>
    <ul style="padding-left: 20px;">${documentsHtml}</ul>
    <h3 style="font-size: 15px; margin-bottom: 6px;">Eligibility criteria</h3>
    <ul style="padding-left: 20px;">${eligibilityHtml}</ul>
    <p><strong>Application deadline:</strong> ${deadline}</p>
    ${
      scheme.applyLink
        ? `<p><a href="${scheme.applyLink}" style="display: inline-block; background: #2b6cb0; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Complete on official portal</a></p>`
        : ""
    }
    <p style="font-size: 12px; color: #718096; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      This is an automated notification. Please save your tracking number for future reference.
    </p>
  </div>
</body>
</html>`.trim();

  return { subject, text, html };
};

async function sendViaResend({ to, subject, text, html }) {
  const from =
    process.env.RESEND_FROM?.trim() ||
    "Government Scheme Portal <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(process.env.RESEND_API_KEY || "").trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || `Resend error (${response.status})`);
  }
  return { success: true, provider: "resend", messageId: body.id };
}

async function sendViaBrevo({ to, toName, subject, text, html }) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || getSmtpAuth().user;
  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL is required (must be verified in Brevo dashboard).");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY.trim(),
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Government Scheme Portal", email: senderEmail },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Brevo API error (${response.status})`);
  }
  return { success: true, provider: "brevo", messageId: body.messageId };
}

async function sendViaSmtp(mailOptions) {
  const transporter = createSmtpTransporter();
  await transporter.verify();
  const info = await transporter.sendMail(mailOptions);
  return { success: true, provider: "smtp", messageId: info.messageId };
}

async function sendViaEthereal(mailOptions) {
  const transporter = await getEtherealTransporter();
  const info = await transporter.sendMail({
    ...mailOptions,
    from:
      mailOptions.from ||
      `"Government Scheme Portal" <${transporter._etherealFrom}>`,
  });
  const previewUrl = nodemailer.getTestMessageUrl(info);
  return {
    success: true,
    provider: "ethereal",
    previewUrl,
    devOnly: true,
    messageId: info.messageId,
  };
}

async function verifyEmailConfiguration() {
  const provider = getActiveEmailProvider();
  if (provider === "resend") {
    console.log("✅ Email: Resend API configured");
    return { ok: true, provider: "resend" };
  }
  if (provider === "brevo") {
    console.log("✅ Email: Brevo API configured");
    return { ok: true, provider: "brevo" };
  }
  if (provider === "smtp") {
    try {
      const transporter = createSmtpTransporter();
      await transporter.verify();
      console.log("✅ Email: SMTP configured and verified (" + getSmtpAuth().user + ")");
      return { ok: true, provider: "smtp" };
    } catch (err) {
      console.error("❌ Email: SMTP configured but verification failed:", err.message);
      return { ok: false, error: err.message };
    }
  }
  console.warn(
    "⚠️ Email NOT configured — users will NOT receive inbox emails.\n" +
      "   Easiest fix: Sign up at https://resend.com (free), copy API key, add to backend/.env:\n" +
      "   RESEND_API_KEY=re_xxxxxxxx\n" +
      "   RESEND_FROM=Government Scheme Portal <onboarding@resend.dev>\n" +
      "   Or Gmail: node scripts/setup-email.js your@gmail.com your-app-password"
  );
  return { ok: false, error: "not_configured" };
}

const sendSchemeApplicationEmail = async (user, scheme, applicationInfo) => {
  if (!user?.email) {
    return { success: false, error: "User has no email address on file." };
  }

  const { subject, text, html } = buildSchemeApplicationEmail(user, scheme, applicationInfo);
  const mailOptions = {
    from: getFromAddress(),
    to: user.email,
    subject,
    text,
    html,
  };

  try {
    const provider = getActiveEmailProvider();

    if (provider === "smtp") {
      const result = await sendViaSmtp(mailOptions);
      console.log(`✅ Application email sent via SMTP to ${user.email}`);
      return result;
    }

    if (provider === "resend") {
      const result = await sendViaResend({
        to: user.email,
        subject,
        text,
        html,
      });
      console.log(`✅ Application email sent via Resend to ${user.email}`);
      return result;
    }

    if (provider === "brevo") {
      const result = await sendViaBrevo({
        to: user.email,
        toName: user.name,
        subject,
        text,
        html,
      });
      console.log(`✅ Application email sent via Brevo to ${user.email}`);
      return result;
    }

    if (process.env.ALLOW_DEV_EMAIL === "true") {
      const result = await sendViaEthereal(mailOptions);
      console.log(`📧 Dev test email for ${user.email} — preview: ${result.previewUrl}`);
      return result;
    }

    return {
      success: false,
      error:
        "Email not configured. Add RESEND_API_KEY (https://resend.com) or Gmail SMTP in backend/.env, then restart the server.",
    };
  } catch (error) {
    console.error(`❌ Failed to send application email to ${user.email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ── OTP Email ─────────────────────────────────────────────────────────────────
const buildOtpEmail = (toName, otp) => {
  const subject = `Your OTP for Government Scheme Portal — ${otp}`;
  const text = `Dear ${toName},\n\nYour One-Time Password (OTP) is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.\n\nGovernment Scheme Portal`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#1a365d;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">Government Scheme Portal</h2>
    <p style="margin:6px 0 0;opacity:.85;font-size:13px">Identity Verification</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 8px 8px">
    <p>Dear <strong>${toName}</strong>,</p>
    <p>Use the OTP below to complete your verification. It expires in <strong>10 minutes</strong>.</p>
    <div style="text-align:center;margin:28px 0">
      <div style="display:inline-block;background:#eef2ff;border:2px dashed #4f46e5;border-radius:12px;padding:18px 40px">
        <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1a365d">${otp}</span>
      </div>
    </div>
    <p style="color:#e53e3e;font-size:13px">⚠️ Never share this OTP with anyone. Our team will never ask for it.</p>
    <p style="font-size:12px;color:#718096;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:20px">
      This is an automated message from the Government Scheme Portal. If you did not request this, please ignore this email.
    </p>
  </div>
</body>
</html>`.trim();
  return { subject, text, html };
};

const sendOtpEmail = async (toEmail, toName, otp) => {
  const { subject, text, html } = buildOtpEmail(toName, otp);
  const mailOptions = { from: getFromAddress(), to: toEmail, subject, text, html };

  try {
    const provider = getActiveEmailProvider();
    if (provider === "smtp")   return await sendViaSmtp(mailOptions);
    if (provider === "resend") return await sendViaResend({ to: toEmail, subject, text, html });
    if (provider === "brevo")  return await sendViaBrevo({ to: toEmail, toName, subject, text, html });
    if (process.env.ALLOW_DEV_EMAIL === "true") {
      const result = await sendViaEthereal(mailOptions);
      console.log(`📧 OTP email preview: ${result.previewUrl}`);
      return result;
    }
    return { success: false, error: "Email not configured." };
  } catch (err) {
    console.error(`❌ OTP email failed for ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendSchemeApplicationEmail,
  buildSchemeApplicationEmail,
  verifyEmailConfiguration,
  isSmtpConfigured,
  isBrevoConfigured,
  isResendConfigured,
  sendOtpEmail,
};
