const User = require("../models/User");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebaseAdmin");
const { sendOtpEmail } = require("../utils/emailService");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "secret_key", { expiresIn: "30d" });
};

// ── In-memory OTP store: { email -> { otp, expiresAt, userData } } ────────────
const otpStore = new Map();

function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function storeOtp(email, otp, payload) {
    otpStore.set(email.toLowerCase(), {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        payload   // { type: "login"|"register", userId or userData }
    });
}

function verifyStoredOtp(email, otp) {
    const record = otpStore.get(email.toLowerCase());
    if (!record) return { valid: false, reason: "No OTP found for this email. Please request a new one." };
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return { valid: false, reason: "OTP has expired. Please request a new one." };
    }
    if (record.otp !== otp.trim()) return { valid: false, reason: "Invalid OTP. Please try again." };
    otpStore.delete(email.toLowerCase());
    return { valid: true, payload: record.payload };
}

exports.register = async (req, res) => {
    try {
        const { name, email, password, mobileNumber } = req.body;
        console.log("Registering user:", email);
        
        // Name Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Full Name is required." });
        }
        if (name.trim().split(" ").length < 2) {
            return res.status(400).json({ message: "Please enter both your first and last name." });
        }
        const nameRegex = /^[a-zA-Z\s]*$/;
        if (!nameRegex.test(name)) {
            return res.status(400).json({ message: "Name should only contain letters and spaces." });
        }

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !email.trim()) {
            return res.status(400).json({ message: "Email is required." });
        }
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address." });
        }

        // Mobile Number Validation
        if (!mobileNumber || !mobileNumber.trim()) {
            return res.status(400).json({ message: "Mobile number is required." });
        }
        if (!/^\d{10}$/.test(mobileNumber)) {
            return res.status(400).json({ message: "Mobile number must be exactly 10 digits." });
        }

        // Password Validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!password || !passwordRegex.test(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&)." });
        }

        const userExists = await User.findOne({ email });

        if (userExists) return res.status(400).json({ message: "User already exists" });

        const user = await User.create({ name, email, password, mobileNumber });

        // Generate and send OTP for verification
        const otp = generateOtp();
        storeOtp(email, otp, { type: "register", userId: user._id.toString() });
        const emailResult = await sendOtpEmail(user.email, user.name, otp);
        console.log(`🔐 Registration OTP sent to ${user.email}:`, otp, "| Email result:", emailResult.provider || emailResult.error);

        res.status(201).json({
            requiresOtp: true,
            email: user.email,
            message: "Account created! Please verify your email with the OTP sent to you."
        });
    } catch (error) {
        console.error("Register Error Stack:", error.stack);
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            const otp = generateOtp();
            storeOtp(email, otp, { type: "login", userId: user._id.toString() });

            const emailResult = await sendOtpEmail(user.email, user.name, otp);
            console.log(`🔐 OTP sent to ${user.email}:`, otp, "| Email result:", emailResult.provider || emailResult.error);

            return res.json({
                requiresOtp: true,
                email: user.email,
                message: "OTP sent to your registered email address."
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            console.log(`📝 Updating profile for user: ${user.email}`);
            console.log("📩 Request Body:", req.body);

            user.age = req.body.age !== undefined ? req.body.age : user.age;
            user.gender = req.body.gender !== undefined ? req.body.gender : user.gender;
            user.income = req.body.income !== undefined ? req.body.income : user.income;
            user.category = req.body.category !== undefined ? req.body.category : user.category;
            user.education = req.body.education !== undefined ? req.body.education : user.education;
            user.occupation = req.body.occupation !== undefined ? req.body.occupation : user.occupation;
            user.caste = req.body.caste !== undefined ? req.body.caste : user.caste;
            user.state = req.body.state !== undefined ? req.body.state : user.state;
            user.district = req.body.district !== undefined ? req.body.district : user.district;
            user.aadhaarNumber = req.body.aadhaarNumber !== undefined ? req.body.aadhaarNumber : user.aadhaarNumber;
            user.dob = req.body.dob !== undefined ? req.body.dob : user.dob;

            // Allow updating mobile number
            if (req.body.mobileNumber) {
                console.log(`📱Updating Mobile Number to: ${req.body.mobileNumber}`);
                user.mobileNumber = req.body.mobileNumber;
            }

            const updatedUser = await user.save();
            console.log(`✅ User saved. Mobile Number in DB: ${updatedUser.mobileNumber}`);

            res.json({
                _id: updatedUser._id,
                mobileNumber: updatedUser.mobileNumber,
                profile: {
                    age: updatedUser.age,
                    gender: updatedUser.gender,
                    income: updatedUser.income,
                    category: updatedUser.category,
                    education: updatedUser.education,
                    occupation: updatedUser.occupation,
                    caste: updatedUser.caste,
                    state: updatedUser.state,
                    district: updatedUser.district,
                    aadhaarNumber: updatedUser.aadhaarNumber,
                    dob: updatedUser.dob,
                    previousSearches: updatedUser.previousSearches || []
                },
                applications: updatedUser.applications || []
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.uploadProfilePicture = async (req, res) => {
    try {
        console.log("📸 Profile Picture Upload Request Received");
        if (!req.file) {
            console.error("❌ No file uploaded");
            return res.status(400).json({ message: "No file uploaded. Please select an image." });
        }

        console.log("✅ File uploaded to Cloudinary:", req.file.path);

        const user = await User.findById(req.user.id);
        if (user) {
            // Cloudinary provides the full URL in req.file.path
            user.profilePicture = req.file.path;
            await user.save();
            console.log("✅ User profile picture updated in DB");

            res.json({
                message: "Profile picture updated successfully",
                profilePicture: user.profilePicture
            });
        } else {
            console.error("❌ User not found for ID:", req.user.id);
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("❌ Profile Upload Error:", error);
        res.status(500).json({ message: "Image upload failed", error: error.message });
    }
}


exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                mobileNumber: user.mobileNumber,
                role: user.role,
                token: generateToken(user._id),
                profilePicture: user.profilePicture,
                profile: {
                    age: user.age,
                    gender: user.gender,
                    income: user.income,
                    category: user.category,
                    education: user.education,
                    occupation: user.occupation,
                    caste: user.caste,
                    state: user.state,
                    district: user.district,
                    aadhaarNumber: user.aadhaarNumber,
                    dob: user.dob,
                    previousSearches: user.previousSearches || []
                },
                applications: user.applications || [],
                documents: user.documents
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── OTP: resend ──────────────────────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: "No account found with this email." });

        const otp = generateOtp();
        storeOtp(email, otp, { type: "login", userId: user._id.toString() });
        const emailResult = await sendOtpEmail(user.email, user.name, otp);
        console.log(`🔐 Resend OTP to ${user.email}:`, otp, "| Result:", emailResult.provider || emailResult.error);

        res.json({ success: true, message: "OTP sent to your email address." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── OTP: verify ──────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required." });

        const result = verifyStoredOtp(email.toLowerCase(), otp);
        if (!result.valid) return res.status(400).json({ message: result.reason });

        const user = await User.findById(result.payload.userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role,
            token: generateToken(user._id),
            profilePicture: user.profilePicture,
            profile: {
                age: user.age,
                gender: user.gender,
                income: user.income,
                category: user.category,
                education: user.education,
                occupation: user.occupation,
                caste: user.caste,
                state: user.state,
                district: user.district,
                aadhaarNumber: user.aadhaarNumber || "",
                dob: user.dob || "",
                previousSearches: user.previousSearches || []
            },
            applications: user.applications || []
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ── Forgot-password OTP store: { email -> { otp, expiresAt } } ───────────────
const forgotOtpStore = new Map();
// ── Reset-token store: { token -> { email, expiresAt } } ─────────────────────
const resetTokenStore = new Map();

function generateResetToken() {
    const crypto = require("crypto");
    return crypto.randomBytes(32).toString("hex");
}

exports.forgotPasswordSendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required." });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: "No account found with this email." });

        const otp = generateOtp();
        forgotOtpStore.set(email.toLowerCase(), {
            otp,
            expiresAt: Date.now() + 10 * 60 * 1000
        });

        const emailResult = await sendOtpEmail(user.email, user.name, otp);
        console.log(`🔑 Forgot-password OTP for ${user.email}:`, otp, "|", emailResult.provider || emailResult.error);

        res.json({ success: true, message: "OTP sent to your registered email address." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.forgotPasswordVerifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required." });

        const record = forgotOtpStore.get(email.toLowerCase());
        if (!record) return res.status(400).json({ message: "No OTP found. Please request a new one." });
        if (Date.now() > record.expiresAt) {
            forgotOtpStore.delete(email.toLowerCase());
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }
        if (record.otp !== otp.trim()) return res.status(400).json({ message: "Invalid OTP. Please try again." });

        forgotOtpStore.delete(email.toLowerCase());

        // Issue a short-lived reset token (15 minutes)
        const resetToken = generateResetToken();
        resetTokenStore.set(resetToken, {
            email: email.toLowerCase(),
            expiresAt: Date.now() + 15 * 60 * 1000
        });

        res.json({ success: true, resetToken, message: "OTP verified. You may now reset your password." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { resetToken, password, confirmPassword } = req.body;
        if (!resetToken || !password) return res.status(400).json({ message: "Reset token and new password are required." });
        if (confirmPassword !== undefined && password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        const record = resetTokenStore.get(resetToken);
        if (!record) return res.status(400).json({ message: "Invalid or expired reset token. Please start over." });
        if (Date.now() > record.expiresAt) {
            resetTokenStore.delete(resetToken);
            return res.status(400).json({ message: "Reset token has expired. Please start over." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: "Password must be at least 8 characters with uppercase, lowercase, number and special character (@$!%*?&)." });
        }

        const user = await User.findOne({ email: record.email });
        if (!user) return res.status(404).json({ message: "User not found." });

        user.password = password; // pre-save hook will hash it
        await user.save();

        resetTokenStore.delete(resetToken);
        console.log(`✅ Password reset for ${record.email}`);

        res.json({ success: true, message: "Password reset successfully. You can now log in." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getApplicationHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const applications = user.applications || [];

        // Stats
        const total = applications.length;
        const approved = applications.filter(a => a.status === "Approved").length;
        const rejected = applications.filter(a => a.status === "Rejected").length;
        const pending = applications.filter(a =>
            a.status !== "Approved" && a.status !== "Rejected"
        ).length;

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const skip = (page - 1) * limit;

        // Sort newest first
        const sorted = [...applications].sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        const paginated = sorted.slice(skip, skip + limit);
        const totalPages = Math.ceil(total / limit);

        res.json({
            stats: { total, approved, rejected, pending },
            applications: paginated,
            pagination: {
                page,
                limit,
                totalPages,
                totalRecords: total,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addSearchQuery = async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || query.trim() === "") return res.status(400).json({ message: "Query is required" });

        const user = await User.findById(req.user.id);
        if (user) {
            if (!user.previousSearches) user.previousSearches = [];
            user.previousSearches = [query, ...user.previousSearches.filter(q => q.toLowerCase() !== query.toLowerCase())].slice(0, 10);
            await user.save();
            res.json({ success: true, previousSearches: user.previousSearches });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
