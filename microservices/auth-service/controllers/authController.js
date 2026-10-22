const User = require("../models/User");
const jwt = require("jsonwebtoken");
const admin = require("../config/firebaseAdmin");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || "secret_key", { expiresIn: "30d" });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, mobileNumber } = req.body;
        console.log("Registering user:", email);
        const userExists = await User.findOne({ email });

        if (userExists) return res.status(400).json({ message: "User already exists" });

        const user = await User.create({ name, email, password, mobileNumber });
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            role: user.role,
            token: generateToken(user._id),
            profile: {
                age: null,
                gender: "",
                income: null,
                category: "",
                education: "",
                occupation: "",
                caste: "",
                state: "",
                district: ""
            }
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
                    district: user.district
                }
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

            user.age = req.body.age || user.age;
            user.gender = req.body.gender || user.gender;
            user.income = req.body.income || user.income;
            user.category = req.body.category || user.category;
            user.education = req.body.education || user.education;
            user.occupation = req.body.occupation || user.occupation;
            user.caste = req.body.caste || user.caste;
            user.state = req.body.state || user.state;
            user.district = req.body.district || user.district;

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
                    district: updatedUser.district
                }
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
                    dob: user.dob
                },
                documents: user.documents
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
