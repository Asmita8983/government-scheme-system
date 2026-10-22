const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin"); const bcrypt = require("bcryptjs");

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");

            // Try finding in User first, then Admin
            let user = await User.findById(decoded.id).select("-password");
            if (!user) {
                user = await Admin.findById(decoded.id).select("-password");
            }

            req.user = user;
            if (!req.user) {
                return res.status(401).json({ message: "Not authorized, participant not found" });
            }
            return next();
        } catch (error) {
            console.error("Token verification failed:", error.message);
            return res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
};

const admin = (req, res, next) => {
    // Check if user has admin role (either from superadmin model or user model with admin role)
    if (req.user && (req.user.role === "admin" || req.user.role === "superadmin")) {
        next();
    } else {
        res.status(403).json({ message: "Access Denied: Administrative Clearance Required" });
    }
};

module.exports = { protect, admin };
