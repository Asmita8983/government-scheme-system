/**
 * Configure Resend for application emails.
 * Usage: node scripts/setup-resend.js re_your_api_key_here
 */
const fs = require("fs");
const path = require("path");

const apiKey = process.argv[2]?.trim();
const envPath = path.join(__dirname, "../.env");

if (!apiKey || !apiKey.startsWith("re_")) {
  console.log(`
Usage:
  node scripts/setup-resend.js re_xxxxxxxxxxxxxxxx

Steps:
  1. Sign up free at https://resend.com
  2. Go to API Keys → Create API Key
  3. Paste the key (starts with re_) as the argument above
  4. Restart the backend server
`);
  process.exit(1);
}

async function main() {
  const testRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Government Scheme Portal <onboarding@resend.dev>",
      to: ["delivered@resend.dev"],
      subject: "Resend API test",
      html: "<p>If this succeeds, your API key is valid.</p>",
    }),
  });
  const body = await testRes.json().catch(() => ({}));
  if (!testRes.ok) {
    throw new Error(body.message || JSON.stringify(body));
  }
  console.log("✅ Resend API key is valid!");

  let env = fs.readFileSync(envPath, "utf8");
  const setEnv = (key, value) => {
    const re = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    env = re.test(env) ? env.replace(re, line) : env + (env.endsWith("\n") ? "" : "\n") + line + "\n";
  };
  setEnv("RESEND_API_KEY", apiKey);
  setEnv("RESEND_FROM", "Government Scheme Portal <onboarding@resend.dev>");
  fs.writeFileSync(envPath, env);
  console.log("✅ Updated", envPath);
  console.log("Restart the backend, then apply for a scheme to test email.");
}

main().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
