const { verifyDocumentWithAI } = require('../utils/aiService');
const { extractTextWithTesseract, parseAadhaarDetails } = require('../utils/ocrService');
const { extractQRCode } = require('../utils/qrService');
const { validateAadhaarDetails } = require('../utils/validationService');
const cloudinary = require('../config/cloudinary');
const User = require('../models/User');
const streamifier = require('streamifier');

const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "gov_scheme_documents" },
            (error, result) => {
                if (result) {
                    resolve(result);
                } else {
                    reject(error);
                }
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

exports.verifyDocument = async (req, res) => {
    console.log("-----------------------------------------");
    console.log("INITIATING DOCUMENT VERIFICATION (FRONT + BACK)");
    console.log("-----------------------------------------");

    try {
        const files = req.files || {};
        const frontFile = files['frontImage'] ? files['frontImage'][0] : null;
        const backFile = files['backImage'] ? files['backImage'][0] : null;

        if (!frontFile) {
            console.error("❌ No front image received");
            return res.status(400).json({ message: "Front document image is required." });
        }

        console.log(`✅ Front File Received: ${frontFile.originalname} (${frontFile.mimetype}, ${frontFile.size} bytes)`);
        if (backFile) {
            console.log(`✅ Back File Received: ${backFile.originalname} (${backFile.mimetype}, ${backFile.size} bytes)`);
        }

        // 1. CLOUD STORAGE
        let frontUrl = null;
        let backUrl = null;

        try {
            console.log("📤 Uploading Front Image to Cloudinary...");
            const frontUpload = await uploadToCloudinary(frontFile.buffer);
            frontUrl = frontUpload.secure_url;
            console.log("✅ Front Image Uploaded:", frontUrl);

            if (backFile) {
                console.log("📤 Uploading Back Image to Cloudinary...");
                const backUpload = await uploadToCloudinary(backFile.buffer);
                backUrl = backUpload.secure_url;
                console.log("✅ Back Image Uploaded:", backUrl);
            }
        } catch (cloudErr) {
            console.error("⚠️ Cloudinary Upload Warning:", cloudErr.message);
        }

        // 2_A. QR CODE EXTRACTION (New "Real" Data Method)
        let qrData = {};
        try {
            console.log("🔍 Scanning for QR Code on Front Image...");
            const qrResult = await extractQRCode(frontFile.buffer);
            if (qrResult && qrResult.parsed) {
                console.log("✅ Secure QR Data Found:", qrResult.parsed);
                qrData = qrResult.parsed;
            } else {
                console.log("ℹ️ No readable QR code found.");
            }
        } catch (qrErr) {
            console.error("⚠️ QR Scan Warning:", qrErr.message);
        }

        // 2_B. OCR EXTRACTION (Tesseract) - Front Only for basic details
        let ocrText = "";
        let tesseractData = {};
        try {
            console.log("🔍 Starting Tesseract OCR on Front Image...");
            ocrText = await extractTextWithTesseract(frontFile.buffer);
            tesseractData = parseAadhaarDetails(ocrText);
            console.log("✅ OCR Success (Front). Extracted:", tesseractData);
        } catch (ocrErr) {
            console.error("⚠️ Tesseract OCR Warning:", ocrErr.message);
        }

        // 3. AI AUTHENTICITY & VALIDATION (Gemini)
        let verificationResult = {
            isFake: false,
            authenticityScore: 50, // Default neutral
            verificationStatus: "Unverified",
            remarks: "AI verification skipped or failed."
        };

        try {
            console.log("🤖 Starting AI Authenticity Analysis (Gemini)...");
            const aiResponse = await verifyDocumentWithAI(
                frontFile.buffer,
                backFile ? backFile.buffer : null,
                frontFile.mimetype
            );

            if (aiResponse.error) {
                console.error("❌ AI Service Error:", aiResponse.error);
                // Fallback to OCR data if AI fails
                verificationResult = { ...verificationResult, extractedData: tesseractData };
            } else {
                verificationResult = aiResponse;
                console.log("✅ AI Analysis Complete.");
                console.log("   - Status:", verificationResult.verificationStatus);
                console.log("   - Authenticity Score:", verificationResult.authenticityScore);
                console.log("   - Is Fake:", verificationResult.isFake);
            }
        } catch (aiErr) {
            console.error("❌ AI Service CRITICAL FAILURE:", aiErr);
        }

        // Merge Data
        const finalData = {
            ...verificationResult.extractedData,
            aadhaarNumber: qrData.uid || verificationResult.extractedData?.aadhaarNumber || tesseractData.aadhaarNumber,
            dob: qrData.dob || qrData.yob || verificationResult.extractedData?.dob || tesseractData.dob,
            name: qrData.name || verificationResult.extractedData?.name,
            gender: qrData.gender || verificationResult.extractedData?.gender,
            address: [qrData.house, qrData.street, qrData.loc, qrData.vtc, qrData.dist, qrData.state, qrData.pc].filter(Boolean).join(", "),
            state: qrData.state || verificationResult.extractedData?.state,
            district: qrData.dist || verificationResult.extractedData?.district,
            pincode: qrData.pc
        };

        // If authentic QR code is found, we assume high confidence and verification
        if (qrData.type === 'Aadhaar') {
            verificationResult.verificationStatus = 'Verified';
            verificationResult.authenticityScore = 100;
            verificationResult.isFake = false;
            verificationResult.remarks = "Verified using Secure QR Code Data.";
        } else if (verificationResult.verificationStatus === 'Unverified') {
            // FALLBACK: Local Heuristic Verification via OCR
            // Since AI models are unavailable, we scan for official government markers textually.
            console.log("ℹ️ Performing Local Document Heuristics (Fallback)...");

            let score = 0;
            const textLower = ocrText.toLowerCase();

            // Keywords indicating Government Legitimacy (Common across Aadhaar, PAN, Certificates)
            const legitKeywords = [
                "government of india", "bharat sarkar", "income tax department",
                "unique identification authority", "election commission", "revenue department",
                "caste certificate", "income certificate", "domicile certificate",
                "permanent account number", "aadhaar", "male", "female", "dob", "date of birth"
            ];

            let matches = 0;
            legitKeywords.forEach(word => {
                if (textLower.includes(word)) {
                    score += 15;
                    matches++;
                }
            });

            // Cap Score at 95 (leave 100 for QR verified)
            if (score > 95) score = 95;

            // Determine Status
            if (score >= 60) {
                verificationResult.verificationStatus = 'Verified';
                verificationResult.authenticityScore = score;
                verificationResult.isFake = false;
                verificationResult.remarks = `Verified based on ${matches} official government markers found in document text.`;
            } else if (score >= 30) {
                verificationResult.verificationStatus = 'Pending Review';
                verificationResult.authenticityScore = score;
                verificationResult.remarks = "Document contains some official markers but quality is low.";
            } else {
                verificationResult.verificationStatus = 'Suspicious';
                verificationResult.authenticityScore = score;
                verificationResult.remarks = "Low confidence: Document lacks clear government identification markers.";
            }
            console.log(`✅ Local Heuristics Logic Applied. Score: ${score}, Status: ${verificationResult.verificationStatus}`);
        }

        // 5. DATA VALIDATION (Strict Aadhaar & Format Check)
        const validation = validateAadhaarDetails(finalData);
        console.log("✅ Validation Check:", validation.isValid ? "Passed" : "Failed");

        if (!validation.isValid) {
            console.warn("⚠️ Validation Errors:", validation.errors);
            verificationResult.verificationStatus = 'Suspicious'; // Downgrade if invalid data
            verificationResult.remarks += " | Validation Failed: " + validation.errors.join(", ");
            // We might still allow saving but marked as Suspicious/Unverified
        }

        verificationResult.extractedData = finalData;
        verificationResult.validationDetails = validation.details; // Pass detailed validation to frontend

        // 6. DATABASE UPDATE
        if (req.user && frontUrl) {
            try {
                console.log("💾 Updating User Profile in DB...");
                const updateFields = {
                    $push: {
                        documents: {
                            docType: verificationResult.documentType || (qrData.type === 'Aadhaar' ? 'Aadhaar' : 'Unknown'),
                            frontUrl: frontUrl,
                            backUrl: backUrl,
                            verified: verificationResult.verificationStatus === 'Verified',
                            isFake: verificationResult.isFake || false,
                            authenticityScore: verificationResult.authenticityScore || 0,
                            verificationDetails: verificationResult.remarks || "No details",
                            uploadedAt: new Date()
                        }
                    }
                };

                // Auto-update identity fields ONLY if Authentic AND Valid
                if (verificationResult.verificationStatus === 'Verified' && !verificationResult.isFake && validation.isValid) {
                    if (finalData.aadhaarNumber) updateFields.aadhaarNumber = finalData.aadhaarNumber;
                    if (finalData.dob) {
                        updateFields.dob = finalData.dob;
                        // Calculate Age
                        if (!finalData.age) {
                            const year = parseInt(finalData.dob.split(/[/-]/)[2]) || parseInt(finalData.dob); // Handle YYYY or DD/MM/YYYY
                            if (!isNaN(year)) {
                                updateFields.age = new Date().getFullYear() - year;
                            }
                        } else {
                            updateFields.age = finalData.age;
                        }
                    }
                    if (finalData.gender) updateFields.gender = finalData.gender;
                    if (finalData.state) updateFields.state = finalData.state;
                    if (finalData.district) updateFields.district = finalData.district;
                }

                await User.findByIdAndUpdate(req.user.id, updateFields);
                console.log("✅ User Profile Updated.");
            } catch (dbErr) {
                console.error("❌ Database Update Failed:", dbErr);
            }
        }

        // Return Result
        res.json({
            success: true,
            data: {
                ...verificationResult,
                ocrTextPreview: ocrText ? ocrText.substring(0, 50) + "..." : "OCR Skipped",
                qrData: qrData,
                validation: validation, // Return strict validation details
                frontUrl,
                backUrl
            }
        });

    } catch (error) {
        console.error("❌ UNHANDLED CONTROLLER ERROR:", error);
        res.status(500).json({ message: "Internal System Error", error: error.message });
    }
};
