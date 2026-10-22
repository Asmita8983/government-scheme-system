const Tesseract = require('tesseract.js');
const path = require('path');

// Basic OCR Function using Tesseract.js
const extractTextWithTesseract = async (imageBuffer) => {
    try {
        console.log("Starting Tesseract OCR...");

        // Tesseract.recognize accepts buffer directly
        const { data: { text } } = await Tesseract.recognize(
            imageBuffer,
            'eng',
            {
                logger: m => console.log(`OCR Progress: ${m.status} (${Math.round(m.progress * 100)}%)`),
            }
        );

        console.log("OCR Completed. Extracted Text Length:", text.length);
        return text;

    } catch (error) {
        console.error("Tesseract OCR Failed:", error);
        throw new Error("Failed to extract text from image");
    }
};

// Parse Aadhaar Details from Text (Regex Based Fallback)
const parseAadhaarDetails = (text) => {
    const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ");

    // 1. Aadhaar Number (XXXX XXXX XXXX)
    const aadhaarRegex = /\b\d{4}\s\d{4}\s\d{4}\b/;
    const aadhaarMatch = cleanText.match(aadhaarRegex);

    // 2. DOB (DD/MM/YYYY)
    const dobRegex = /\b\d{2}\/\d{2}\/\d{4}\b/;
    const dobMatch = cleanText.match(dobRegex);

    // 3. Gender (Male/Female)
    const genderRegex = /\b(MALE|FEMALE|Male|Female)\b/i;
    const genderMatch = cleanText.match(genderRegex);

    // 4. Name is tricky without AI. We might assume it's near the top or near "Name" label.
    // For now, let's return what we found.

    return {
        aadhaarNumber: aadhaarMatch ? aadhaarMatch[0] : null,
        dob: dobMatch ? dobMatch[0] : null,
        gender: genderMatch ? genderMatch[0].toUpperCase() : null,
        rawText: text
    };
};

module.exports = { extractTextWithTesseract, parseAadhaarDetails };
