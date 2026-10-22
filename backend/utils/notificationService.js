const { sendSchemeApplicationEmail } = require("./emailService");
const { sendSMS } = require("./smsService");

function buildApplicationSms(scheme, trackingNumber) {
  const name = (scheme.name || "Scheme").slice(0, 60);
  return (
    `Gov Scheme Portal: Your application for "${name}" is submitted. ` +
    `Tracking ID: ${trackingNumber}. Status: Under Review.`
  );
}

/**
 * Notify user on scheme application (email + SMS fallback).
 */
async function sendApplicationNotification(user, scheme, applicationInfo) {
  const { trackingNumber } = applicationInfo;
  const result = {
    email: null,
    sms: null,
    delivered: false,
  };

  if (user?.email) {
    result.email = await sendSchemeApplicationEmail(user, scheme, applicationInfo);
    if (
      result.email.success &&
      !result.email.devOnly &&
      ["smtp", "brevo", "resend"].includes(result.email.provider)
    ) {
      result.delivered = true;
    }
  } else {
    result.email = { success: false, error: "No email on user profile." };
  }

  const phone = user?.mobileNumber?.trim();
  const shouldSendSms =
    phone && phone.length >= 10 && (!result.delivered || process.env.ALWAYS_SMS_ON_APPLY === "true");

  if (shouldSendSms) {
    result.sms = await sendSMS(phone, buildApplicationSms(scheme, trackingNumber));
    if (result.sms.success && !result.sms.mock) {
      result.delivered = true;
    }
  }

  return result;
}

function getApplicationNotificationMessage(notification) {
  const parts = ["Welfare scheme application submitted and authenticated successfully!"];

  if (notification.email?.success && !notification.email.devOnly) {
    if (notification.email.provider === "resend") {
      parts.push("Confirmation email sent via Resend.");
    } else {
      parts.push("Confirmation email sent to your registered email.");
    }
  } else if (notification.email?.error) {
    parts.push(`Email: ${notification.email.error}`);
  } else if (notification.email?.devOnly) {
    parts.push(
      "Email not configured for inbox delivery. Add RESEND_API_KEY or Gmail SMTP in backend/.env."
    );
  }

  if (notification.sms?.success && !notification.sms.mock) {
    parts.push("SMS confirmation sent to your mobile number.");
  } else if (!notification.delivered && notification.sms?.error) {
    parts.push(`SMS: ${notification.sms.error}`);
  }

  if (!notification.delivered) {
    parts.push(
      "Set up email: get free API key at https://resend.com → add RESEND_API_KEY to backend/.env → restart server."
    );
  }

  return parts.join(" ");
}

module.exports = {
  sendApplicationNotification,
  getApplicationNotificationMessage,
};
