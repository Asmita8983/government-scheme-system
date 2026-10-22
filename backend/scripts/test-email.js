/**
 * Send a test email. Usage: node scripts/test-email.js recipient@example.com
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const {
  sendSchemeApplicationEmail,
  verifyEmailConfiguration,
} = require("../utils/emailService");

const to = process.argv[2];
if (!to) {
  console.log("Usage: node scripts/test-email.js recipient@example.com");
  process.exit(1);
}

const mockUser = { name: "Test User", email: to };
const mockScheme = {
  name: "PM-KISAN (Test)",
  description: "Income support for farmer families.",
  benefit: "₹6,000 per year in three installments.",
  applyLink: "https://pmkisan.gov.in",
  documentsRequired: ["Aadhaar", "Land records", "Bank passbook"],
  rules: { ageMin: 18, ageMax: 99, incomeMax: 200000, gender: "Any", state: "Any" },
};

async function main() {
  await verifyEmailConfiguration();
  const result = await sendSchemeApplicationEmail(mockUser, mockScheme, {
    trackingNumber: "GOV-2026-TEST01",
    status: "Under Review",
    appliedAt: new Date(),
  });
  console.log("\nResult:", JSON.stringify(result, null, 2));
  if (result.previewUrl) {
    console.log("\nDev preview (open in browser):", result.previewUrl);
  }
  process.exit(result.success ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
