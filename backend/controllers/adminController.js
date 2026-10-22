const Admin = require("../models/Admin");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const generateToken = (id) => {
    return jwt.sign({ id, role: "superadmin" }, process.env.JWT_SECRET || "secret_key", { expiresIn: "30d" });
};

exports.registerAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const exists = await Admin.findOne({ username });
        if (exists) return res.status(400).json({ message: "Admin already exists" });

        const admin = await Admin.create({ username, password });
        res.status(201).json({
            _id: admin._id,
            username: admin.username,
            token: generateToken(admin._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });

        if (admin && (await admin.comparePassword(password))) {
            res.json({
                _id: admin._id,
                username: admin.username,
                token: generateToken(admin._id),
                role: "admin"
            });
        } else {
            res.status(401).json({ message: "Invalid admin credentials" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}).select("-password");
        res.json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAllApplications = async (req, res) => {
    try {
        const users = await User.find({ "applications.0": { $exists: true } })
            .select("name email mobileNumber age gender income category state district applications");

        const records = [];
        users.forEach(user => {
            (user.applications || []).forEach(app => {
                records.push({
                    applicationId: app._id,
                    trackingNumber: app.trackingNumber,
                    schemeName: app.schemeName,
                    schemeId: app.schemeId,
                    status: app.status,
                    appliedAt: app.appliedAt,
                    user: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        mobileNumber: user.mobileNumber || "N/A",
                        age: user.age || "N/A",
                        gender: user.gender || "N/A",
                        income: user.income || "N/A",
                        category: user.category || "N/A",
                        state: user.state || "N/A",
                        district: user.district || "N/A"
                    }
                });
            });
        });

        // Sort newest first
        records.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        const total    = records.length;
        const approved = records.filter(r => r.status === "Approved").length;
        const rejected = records.filter(r => r.status === "Rejected").length;
        const pending  = records.filter(r => r.status !== "Approved" && r.status !== "Rejected").length;

        const page  = parseInt(req.query.page)  || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip  = (page - 1) * limit;

        res.json({
            stats: { total, approved, rejected, pending },
            applications: records.slice(skip, skip + limit),
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                totalRecords: total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    try {
        const { userId, applicationId, status } = req.body;
        const validStatuses = ["Under Review", "Document Verification", "Approved", "Rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const app = user.applications.id(applicationId);
        if (!app) return res.status(404).json({ message: "Application not found" });

        app.status = status;
        await user.save();

        res.json({ success: true, message: "Status updated", status });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
