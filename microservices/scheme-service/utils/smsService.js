// smsService.js - Real SMS functionality via Fast2SMS
require('dotenv').config();
const axios = require('axios');

// Add FAST2SMS_API_KEY to your .env file
const API_KEY = process.env.FAST2SMS_API_KEY;

/**
 * Sends a real SMS to a single number
 * @param {string} to - The recipient's phone number
 * @param {string} body - The message content
 */
const sendSMS = async (to, body) => {
    // Basic formatting: Fast2SMS expects numbers without '+'
    let formatNum = to.trim().replace('+', '');
    // If it's a 12 digit number starting with 91, keep it. If it's 10 digits, it's fine.

    if (!API_KEY) {
        console.log(`📱 [Mock SMS] To: ${formatNum} | Message: "${body}"`);
        console.log("⚠️ Add FAST2SMS_API_KEY to your .env to send real SMS!");
        return { success: true, mock: true };
    }

    try {
        const response = await axios.post("https://www.fast2sms.com/dev/bulkV2", {
            route: "q", // "q" is Quick Route, generally better for testing/free without DLT
            message: body,
            language: "english",
            flash: 0,
            numbers: formatNum
        }, {
            headers: {
                "authorization": API_KEY,
                "Content-Type": "application/json"
            }
        });

        if (response.data && response.data.return === true) {
            console.log(`✅ [Real SMS Sent to ${formatNum} successfully]`);
            return { success: true, response: response.data };
        } else {
            console.error(`❌ [SMS Error] Failed to send to ${formatNum}:`, response.data.message);
            return { success: false, error: response.data.message };
        }
    } catch (error) {
        // Log the exact message returned by Fast2SMS
        const msg = (error.response && error.response.data && error.response.data.message)
            ? error.response.data.message
            : error.message;
        console.error(`❌ [SMS API Error] Fast2SMS Rejected Request for ${formatNum}:`, msg);
        return { success: false, error: msg };
    }
};

/**
 * Sends real SMS to multiple numbers
 * @param {string[]} numbers - Array of phone numbers
 * @param {string} body - The message content
 */
const sendBulkSMS = async (numbers, body) => {
    if (!numbers || numbers.length === 0) {
        console.log("ℹ️ No recipients for Bulk SMS.");
        return { successCount: 0, failCount: 0 };
    }

    // Filter out invalid numbers first
    const validNumbers = numbers.filter(n => n && n.length >= 10);

    if (validNumbers.length === 0) {
        console.log("ℹ️ No valid phone numbers found for Bulk SMS.");
        return { successCount: 0, failCount: 0 };
    }

    console.log(`📨 Initiating Bulk SMS to ${validNumbers.length} users...`);

    let successCount = 0;
    let failCount = 0;

    // Fast2SMS allows comma-separated numbers for bulk
    // Let's batch them in a single request if we have an API Key, or loop if we want to mock individually.

    if (API_KEY) {
        // Fast2SMS supports up to a certain limit of comma-separated numbers
        const numbersString = validNumbers.map(n => n.replace('+', '')).join(',');
        const result = await sendSMS(numbersString, body);
        if (result.success) {
            successCount = validNumbers.length;
        } else {
            failCount = validNumbers.length;
        }
    } else {
        // Mock individually for console clarity
        for (const num of validNumbers) {
            const result = await sendSMS(num, body);
            if (result.success) successCount++;
            else failCount++;
        }
    }

    console.log(`📢 Bulk SMS Complete. Success: ${successCount}, Failed: ${failCount}`);
    return { successCount, failCount };
};

module.exports = { sendSMS, sendBulkSMS };
