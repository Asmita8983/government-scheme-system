/**
 * Configure Gmail for scheme application emails.
 * Usage: node scripts/setup-email.js your@gmail.com your-app-password
 */
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const envPath = path.join(__dirname, "../.env");
const credPath = path.join(__dirname, "../email-credentials.local.js");

const gmail = process.argv[2];
const appPass = process.argv[3]?.replace(/\s/g, "");

if (!gmail || !appPass) {
  console.log(`
Usage:
  node scripts/setup-email.js your@gmail.com xxxx-xxxx-xxxx-xxxx

Get a Gmail App Password:
  1. Enable 2-Step Verification on your Google account
  2. Open https://myaccount.google.com/apppasswords
  3. Create an app password for "Mail"
  4. Paste the 16-character password (spaces are OK)
`);
  process.exit(1);
}

async function main() {
  console.log("Testing Gmail SMTP...");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmail, pass: appPass },
  });

  await transporter.verify();
  console.log("✅ Gmail SMTP verified!");

  fs.writeFileSync(
    credPath,
    `module.exports = {\n  user: "${gmail}",\n  pass: "${appPass}",\n};\n`
  );
  console.log("✅ Wrote", credPath);

  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const setEnv = (key, value) => {
    const re = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    env = re.test(env) ? env.replace(re, line) : env + (env.endsWith("\n") ? "" : "\n") + line + "\n";
  };
  setEnv("SMTP_SERVICE", "gmail");
  setEnv("SMTP_HOST", "smtp.gmail.com");
  setEnv("SMTP_PORT", "587");
  setEnv("SMTP_USER", gmail);
  setEnv("SMTP_PASS", appPass);
  setEnv("EMAIL_FROM", `Government Scheme Portal <${gmail}>`);
  fs.writeFileSync(envPath, env);
  console.log("✅ Updated", envPath);
  console.log("\nRestart the backend server, then apply for a scheme to test email.");
}

main().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  console.error("\nCommon fixes:");
  console.error("- Use an App Password, not your normal Gmail password");
  console.error("- Enable 2-Step Verification first");
  process.exit(1);
});
