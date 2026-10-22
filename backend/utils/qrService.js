const Jimp = require('jimp');
const jsQR = require('jsqr');

/**
 * Extracts QR code content from an image buffer
 * @param {Buffer} buffer - Image file buffer
 * @returns {Promise<Object|null>} - Extracted data or null
 */
const extractQRCode = async (buffer) => {
    try {
        const image = await Jimp.read(buffer);
        const { data, width, height } = image.bitmap;
        const code = jsQR(data, width, height);

        if (code) {
            console.log("✅ QR Code Detected:", code.data);
            return {
                raw: code.data,
                parsed: parseSecureQRCode(code.data) // Try to parse XML if Aadhaar
            };
        }
        return null;
    } catch (error) {
        console.error("⚠️ QR Extraction Error:", error.message);
        return null;
    }
};

/**
 * Parses Aadhaar Secure QR Code XML Data
 * Note: Aadhaar QR codes contain signed XML. We can extract basic details.
 * @param {string} data - Raw QR string
 */
const parseSecureQRCode = (data) => {
    try {
        // Aadhaar QR XML format check
        if (data.includes("<?xml") && data.includes("uidai")) {
            // Very basic XML extraction using regex to avoid heavy xml parsers deps
            // <PrintLetterBarcodeData uid="1234..." name="John Doe" ... />

            const extractAttr = (attr) => {
                const match = data.match(new RegExp(`${attr}="([^"]+)"`));
                return match ? match[1] : null;
            };

            return {
                type: "Aadhaar",
                uid: extractAttr("uid"), // Masked UID in new QRs, or full in old
                name: extractAttr("name"),
                gender: extractAttr("gender"),
                yob: extractAttr("yob"),
                co: extractAttr("co"), // Care of / Address part
                house: extractAttr("house"),
                street: extractAttr("street"),
                lm: extractAttr("lm"), // Landmark
                loc: extractAttr("loc"), // Locality
                vtc: extractAttr("vtc"), // Village/Town/City
                po: extractAttr("po"), // Post Office
                dist: extractAttr("dist"),
                subdist: extractAttr("subdist"),
                state: extractAttr("state"),
                pc: extractAttr("pc"), // Pincode
                dob: extractAttr("dob") // Sometimes present in newer QRs
            };
        }

        // PAN or other simple strings?
        // Often just text.
        return { type: "Unknown", rawText: data };

    } catch (e) {
        return { type: "Error", rawText: data };
    }
};

module.exports = { extractQRCode };
