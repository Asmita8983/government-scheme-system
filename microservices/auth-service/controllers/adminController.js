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
