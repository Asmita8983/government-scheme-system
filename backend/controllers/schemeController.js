const Scheme = require("../models/Scheme");
const User = require("../models/User");
const evaluateEligibility = require("../utils/ruleEngine");
const extractText = require("../utils/pdfParser");
const { extractSchemeWithAI, getPersonalizedRecommendationsWithAI, getLocalRecommendations } = require("../utils/aiService");
const { sendBulkSMS } = require("../utils/smsService");
const {
    sendApplicationNotification,
    getApplicationNotificationMessage,
} = require("../utils/notificationService");

// Helper to extract keywords from text using regex
const extractCriteria = (text) => {
    const data = {
        name: "",
        description: "",
        benefit: "",
        applyLink: "",
        rules: {
            ageMin: null,
            ageMax: null,
            incomeMax: null,
            gender: "Any",
            category: "Any",
            education: "",
            occupation: "",
            state: "Any",
            district: "Any"
        },
        documentsRequired: []
    };

    // 1. Extract Scheme Name
    const nameMatch = text.match(/(?:Scheme Name|Name of Scheme|Ministry of|Subject|Title|Project):\s*(.*?)(?:\.|\n|$)/i);
    const capitalMatch = text.match(/^([A-Z\s]{10,80})$/m);

    if (nameMatch && nameMatch[1].trim().length > 5) {
        data.name = nameMatch[1].trim();
    } else if (capitalMatch) {
        data.name = capitalMatch[1].trim();
    } else {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
        data.name = lines[0] || "New Government Scheme";
    }

    data.name = data.name.replace(/^(FOR|THE|APPLICATION|GOVERNMENT|CIRCULAR)\s+/i, '').trim();

    // 2. Extract Description
    const descLines = text.split('\n').filter(l => l.length > 20).slice(0, 5).join(' ').trim();
    data.description = descLines.substring(0, 500) + (descLines.length > 500 ? "..." : "");

    // 3. Extract Benefits
    const benefitMatch = text.match(/(?:benefit|subsidy|assistance|incentive|amount|grant|pension|scholarship)\s*(?:of|is)?\s*(?:Rs\.?|INR)?\s*([\d,]+.*?)(?:\.|\n|$)/i);
    if (benefitMatch) data.benefit = benefitMatch[1].trim();
    else data.benefit = "Direct Benefit Transfer / Financial Assistance";

    // 3.5 Extract Apply Link
    const linkMatch = text.match(/(?:apply|link|website|online|visit|portal|url).*?((?:https?:\/\/|www\.)[^\s]+)/i) ||
        text.match(/((?:https?:\/\/|www\.)[^\s]+)/i);

    if (linkMatch) {
        let url = linkMatch[1];
        // Clean trailing punctuation commonly picked up
        url = url.replace(/[\)\.,;>]$/, '');
        if (url.startsWith('www.')) url = 'https://' + url;
        data.applyLink = url;
    }

    // 4. Extract Age Rules
    const ageMinMatch = text.match(/(?:age|years?)\s*(?:limit|above|between|min|minimum|at least|starts from)\s*(?:of)?\s*(\d+)/i);
    if (ageMinMatch) data.rules.ageMin = parseInt(ageMinMatch[1]);

    const ageMaxMatch = text.match(/(?:age|years?)\s*(?:below|up to|maximum|max|under|not exceeding)\s*(?:of)?\s*(\d+)/i);
    if (ageMaxMatch) data.rules.ageMax = parseInt(ageMaxMatch[1]);

    // 5. Extract Income Rules
    const incomeMatch = text.match(/(?:income|salary|earnings|revenue)\s*(?:below|up to|less than|maximum|not exceeding|limit is)\s*(?:Rs\.?|INR)?\s*([\d,]+)/i);
    if (incomeMatch) data.rules.incomeMax = parseInt(incomeMatch[1].replace(/,/g, ''));

    // 6. Extract Documents
    const docKeywords = ["Aadhar", "PAN", "Income Certificate", "Caste Certificate", "Residence Proof", "Ration Card", "Bank Passbook", "Voter ID", "Photo", "MarkSheet", "Domicile"];
    docKeywords.forEach(doc => {
        if (new RegExp(doc, "i").test(text)) {
            data.documentsRequired.push(doc);
        }
    });

    // 7. Gender & Category
    if (/\b(?:female|women|girl|lady)\b/i.test(text)) data.rules.gender = "Female";
    if (/\b(?:male|men|boy)\b/i.test(text)) data.rules.gender = "Male";

    const categories = ["OBC", "SC", "ST", "General", "EWS", "Minority", "Reserved"];
    categories.forEach(cat => {
        if (new RegExp(`\\b${cat}\\b`, "i").test(text)) data.rules.category = cat;
    });

    return data;
};

exports.analyzePDF = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No PDF uploaded" });

        console.log(`Processing document: ${req.file.originalname} (${req.file.size} bytes)`);
        const text = await extractText(req.file.buffer);

        if (!text || text.length < 50) {
            throw new Error("Text extraction yielded no results or document is too small.");
        }

        // Split text into potential scheme blocks with diverse boundaries
        const potentialBlocks = text.split(/(?=Scheme Name|Name of Scheme|MINISTRY OF|SUBJECT\s*:|APPENDIX|ANNEXURE|PART\s+[IXV]+|SECTION\s+[IXV]+)/i)
            .filter(block => block.trim().length > 300);

        console.log(`Analyzing ${potentialBlocks.length} major sections...`);

        const extractedSchemes = [];
        const seenNames = new Set();

        // Strategy: Try AI first if API key exists, otherwise Regex
        const useAI = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here";

        if (useAI) {
            console.log("Using AI for extraction...");
            // If document is massive, we might need to chunk it carefully. 
            // For now, let's treat the whole text or substantial blocks as input.
            // If blocks are found, process each. If not, process whole tax.

            const blocksToProcess = potentialBlocks.length > 0 ? potentialBlocks : [text];

            for (const block of blocksToProcess.slice(0, 5)) { // Limit to 5 blocks to save tokens/time
                const scheme = await extractSchemeWithAI(block);
                if (scheme && scheme.name && !seenNames.has(scheme.name.toLowerCase())) {
                    // Normalize AI output to match strict schema defaults if null
                    scheme.rules = {
                        ...scheme.rules,
                        gender: scheme.rules?.gender || "Any",
                        category: scheme.rules?.category || "Any",
                        state: scheme.rules?.state || "Any",
                        district: scheme.rules?.district || "Any"
                    };

                    extractedSchemes.push(scheme);
                    seenNames.add(scheme.name.toLowerCase());
                }
            }
        }

        // Fallback to Regex if AI failed or didn't run, or found nothing
        if (extractedSchemes.length === 0) {
            console.log("Fallback to Regex extraction...");
            potentialBlocks.forEach((block) => {
                const scheme = extractCriteria(block);
                if (scheme && scheme.name && !seenNames.has(scheme.name.toLowerCase())) {
                    extractedSchemes.push(scheme);
                    seenNames.add(scheme.name.toLowerCase());
                }
            });

            if (extractedSchemes.length === 0) {
                const single = extractCriteria(text);
                if (single) extractedSchemes.push(single);
            }
        }

        res.json({
            message: `Document processed. Found ${extractedSchemes.length} potential schemes.`,
            schemes: extractedSchemes,
            count: extractedSchemes.length,
            method: extractedSchemes.length > 0 && useAI ? "AI-Enhanced" : "Regex-Standard"
        });
    } catch (error) {
        console.error("Bulk extraction error CRITICAL:", error);
        if (error.stack) console.error(error.stack);
        res.status(500).json({
            message: "PDF analysis failed",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const eligibilityCache = new Map();
const ELIGIBILITY_CACHE_TTL_MS = 60 * 1000;

function buildEligibilityCacheKey(userId, userProfile) {
    return `${userId || "guest"}:${JSON.stringify(userProfile)}`;
}

exports.getEligibleSchemes = async (req, res) => {
    try {
        let previousSearches = [];
        let dbProfile = {};
        let userId = null;

        // 1. Try to load user from token optionally for searchHistory and full profile integrity
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const jwt = require("jsonwebtoken");
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
                userId = decoded.id;
                const user = await User.findById(decoded.id).select(
                    "age gender income category education occupation state district previousSearches"
                );
                if (user) {
                    previousSearches = user.previousSearches || [];
                    dbProfile = {
                        age: user.age,
                        gender: user.gender,
                        income: user.income,
                        category: user.category,
                        education: user.education,
                        occupation: user.occupation,
                        state: user.state,
                        district: user.district
                    };
                }
            } catch (err) {
                console.log("Optional user loading failed in getEligibleSchemes:", err.message);
            }
        }

        const rawProfile = req.body;

        // Normalize profile data (merge dbProfile and request body, prefer request body values if provided)
        const userProfile = {
            age: rawProfile.age !== undefined && rawProfile.age !== null ? parseInt(rawProfile.age) : (dbProfile.age || 0),
            gender: rawProfile.gender || dbProfile.gender || "Any",
            income: rawProfile.income !== undefined && rawProfile.income !== null ? parseInt(rawProfile.income) : (dbProfile.income || 0),
            category: rawProfile.category || dbProfile.category || "Any",
            education: rawProfile.education || dbProfile.education || "",
            occupation: rawProfile.occupation || dbProfile.occupation || "",
            state: rawProfile.state || dbProfile.state || "",
            district: rawProfile.district || dbProfile.district || ""
        };

        const useAi = req.query.ai === "true";
        const cacheKey = buildEligibilityCacheKey(userId, userProfile);
        if (!useAi) {
            const cached = eligibilityCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return res.json(cached.data);
            }
        }

        const schemes = await Scheme.find({ isActive: true }).lean();

        const aiRecs = useAi
            ? await getPersonalizedRecommendationsWithAI(userProfile, schemes, previousSearches)
            : getLocalRecommendations(userProfile, schemes, previousSearches);
        
        // Map recommendation outcomes back to frontend response schema
        const result = schemes.map((scheme) => {
            const eligibility = evaluateEligibility(userProfile, scheme.rules);
            const aiMatch = aiRecs.find(rec => rec.schemeId === scheme._id.toString()) || { score: eligibility.isEligible ? 75 : 30 };

            // Determine if the scheme matches occupation or search terms
            let matchedTags = [];
            if (scheme.rules.occupation && userProfile.occupation && scheme.rules.occupation.toLowerCase() === userProfile.occupation.toLowerCase()) {
                matchedTags.push("Occupation Match");
            }
            if (previousSearches.length > 0) {
                const schemeText = `${scheme.name} ${scheme.description} ${scheme.benefit}`.toLowerCase();
                const matchedSearch = previousSearches.find(q => schemeText.includes(q.toLowerCase()));
                if (matchedSearch) matchedTags.push("Search Interest Match");
            }

            return {
                _id: scheme._id,
                name: scheme.name,
                description: scheme.description,
                benefit: scheme.benefit,
                documentsRequired: scheme.documentsRequired,
                applyLink: scheme.applyLink,
                deadline: scheme.deadline,
                eligible: eligibility.isEligible,
                score: aiMatch.score, // Gemini AI-calculated score or advanced rule fallback
                rules: scheme.rules,
                matchedTags,
                aiRecommendationInsight: aiMatch.aiRecommendationInsight || (eligibility.isEligible 
                    ? "Highly recommended government welfare benefit." 
                    : "Review specific rules for matching."),
                reason: eligibility.isEligible
                    ? eligibility.reasons.join(", ")
                    : eligibility.failedCriteria[0] // Show the primary failure reason
            };
        });

        // Rank schemes by score
        result.sort((a, b) => b.score - a.score);

        if (!useAi) {
            eligibilityCache.set(cacheKey, {
                data: result,
                expiresAt: Date.now() + ELIGIBILITY_CACHE_TTL_MS,
            });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.getAllSchemesAdmin = async (req, res) => {
    try {
        const schemes = await Scheme.find().sort("-createdAt");
        res.json(schemes);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.createScheme = async (req, res) => {
    try {
        const { name, description, benefit, documentsRequired, applyLink, deadline, rules: nestedRules, ...flatRules } = req.body;

        // Structure the rules object, accepting both nested and flat inputs
        const rules = {
            ageMin: (nestedRules?.ageMin ?? flatRules.ageMin) || null,
            ageMax: (nestedRules?.ageMax ?? flatRules.ageMax) || null,
            incomeMax: (nestedRules?.incomeMax ?? flatRules.incomeMax) || null,
            gender: (nestedRules?.gender ?? flatRules.gender) || "Any",
            category: (nestedRules?.category ?? flatRules.category) || "Any",
            education: (nestedRules?.education ?? flatRules.education) || "",
            occupation: (nestedRules?.occupation ?? flatRules.occupation) || "",
            caste: (nestedRules?.caste ?? flatRules.caste) || "",
            state: (nestedRules?.state ?? flatRules.state) || "",
            district: (nestedRules?.district ?? flatRules.district) || ""
        };

        const scheme = await Scheme.create({
            name,
            description,
            benefit,
            documentsRequired,
            applyLink,
            deadline: deadline || null,
            rules
        });

        // 🔔 Send SMS Notification to Eligible Users
        // Doing this asynchronously to not block the response
        (async () => {
            try {
                console.log("📨 Preparing to send SMS notifications for new scheme to eligible users...");
                const users = await User.find({ mobileNumber: { $exists: true, $ne: "" } });

                let eligibleNumbers = [];

                for (const user of users) {
                    // Normalize profile for evaluation
                    const userProfile = {
                        age: user.age ? parseInt(user.age) : 0,
                        income: user.income ? parseInt(user.income) : 0,
                        gender: user.gender || "Any",
                        category: user.category || "Any",
                        education: user.education || "",
                        occupation: user.occupation || "",
                        state: user.state || "",
                        district: user.district || ""
                    };

                    const eligibility = evaluateEligibility(userProfile, rules);
                    if (eligibility.isEligible && user.mobileNumber && user.mobileNumber.length >= 10) {
                        eligibleNumbers.push(user.mobileNumber);
                    }
                }

                if (eligibleNumbers.length > 0) {
                    const message = `Check Now: New Gov Scheme '${name}' Added! You are eligible for this scheme. Login to apply. - GovSchemePortal`;
                    await sendBulkSMS(eligibleNumbers, message);
                } else {
                    console.log("ℹ️ No eligible users with valid mobile numbers found to send SMS.");
                }
            } catch (notifyErr) {
                console.error("❌ SMS Notification Failed:", notifyErr);
            }
        })();

        res.status(201).json(scheme);
    } catch (error) {
        console.error("Create scheme error:", error);
        res.status(500).json({ message: "Failed to create scheme", error: error.message });
    }
};

exports.updateScheme = async (req, res) => {
    try {
        const { name, description, benefit, documentsRequired, applyLink, deadline, rules: nestedRules, ...flatRules } = req.body;

        const rules = {
            ageMin: (nestedRules?.ageMin ?? flatRules.ageMin) || null,
            ageMax: (nestedRules?.ageMax ?? flatRules.ageMax) || null,
            incomeMax: (nestedRules?.incomeMax ?? flatRules.incomeMax) || null,
            gender: (nestedRules?.gender ?? flatRules.gender) || "Any",
            category: (nestedRules?.category ?? flatRules.category) || "Any",
            education: (nestedRules?.education ?? flatRules.education) || "",
            occupation: (nestedRules?.occupation ?? flatRules.occupation) || "",
            caste: (nestedRules?.caste ?? flatRules.caste) || "",
            state: (nestedRules?.state ?? flatRules.state) || "",
            district: (nestedRules?.district ?? flatRules.district) || ""
        };

        const scheme = await Scheme.findByIdAndUpdate(
            req.params.id,
            { name, description, benefit, documentsRequired, applyLink, deadline: deadline || null, rules },
            { new: true }
        );
        res.json(scheme);
    } catch (error) {
        res.status(500).json({ message: "Failed to update scheme", error: error.message });
    }
};

exports.toggleSchemeStatus = async (req, res) => {
    try {
        const scheme = await Scheme.findById(req.params.id);
        if (!scheme) return res.status(404).json({ message: "Scheme not found" });

        scheme.isActive = !scheme.isActive;
        await scheme.save();
        res.json(scheme);
    } catch (error) {
        res.status(500).json({ message: "Failed to toggle status", error: error.message });
    }
};

exports.applyForScheme = async (req, res) => {
    try {
        const scheme = await Scheme.findById(req.params.id);
        if (!scheme) {
            return res.status(404).json({ success: false, message: "Scheme not found" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 1. DUPLICATE SCHEME CHECK (User-level)
        const alreadyApplied = user.applications && user.applications.some(
            (app) => app.schemeId.toString() === scheme._id.toString()
        );
        if (alreadyApplied) {
            return res.status(400).json({
                success: false,
                isFraud: true,
                fraudType: "DUPLICATE_APPLICATION",
                message: "Duplicate application filing detected! You have already submitted an application for this welfare scheme. Guidelines strictly prohibit multiple submissions for the same citizen profile."
            });
        }

        // 2. FRAUD CHECK (Aadhaar cross-user level identity hijacking check)
        const aadhaarNum = user.profile?.aadhaarNumber || user.aadhaarNumber;
        if (aadhaarNum && aadhaarNum.trim()) {
            const crossUser = await User.findOne({
                _id: { $ne: user._id },
                $or: [
                    { aadhaarNumber: aadhaarNum },
                    { "profile.aadhaarNumber": aadhaarNum }
                ],
                "applications.schemeId": scheme._id
            });
            if (crossUser) {
                return res.status(400).json({
                    success: false,
                    isFraud: true,
                    fraudType: "IDENTITY_THEFT_FRAUD",
                    message: "CRITICAL FRAUD ALERT: Another registered profile has already claimed benefits for this scheme using this Aadhaar Identity. Double claiming is an offence under Section 37 of the National Aadhaar Registry Code."
                });
            }
        }

        // 3. GENERATE SECURE GOVERNMENT TRACKING ID AND SUBMIT APPLICATION
        const trackingNumber = `GOV-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        if (!user.applications) {
            user.applications = [];
        }

        user.applications.push({
            schemeId: scheme._id,
            schemeName: scheme.name,
            appliedAt: new Date(),
            status: "Under Review",
            trackingNumber: trackingNumber
        });

        await user.save();

        const appliedAt = user.applications[user.applications.length - 1].appliedAt;
        const notification = await sendApplicationNotification(user, scheme, {
            trackingNumber,
            status: "Under Review",
            appliedAt,
        });

        res.json({
            success: true,
            message: getApplicationNotificationMessage(notification),
            trackingNumber,
            applyLink: scheme.applyLink,
            notification: {
                delivered: notification.delivered,
                email: notification.email,
                sms: notification.sms,
            },
        });
    } catch (error) {
        console.error("Welfare Application process failed:", error);
        res.status(500).json({ success: false, message: "Application execution failed", error: error.message });
    }
};
