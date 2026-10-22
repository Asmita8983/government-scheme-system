const mongoose = require("mongoose");
const Admin = require("./models/Admin");
require("dotenv").config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/gov_schemes");
        console.log("Connected to MongoDB for Admin Seeding...");

        await Admin.deleteMany({ username: "admin" });
        await Admin.create({
            username: "admin",
            password: "adminpassword123", // Will be hashed by pre-save hook
            role: "superadmin"
        });

        console.log("Admin account created: admin / adminpassword123");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
