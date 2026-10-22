const mongoose = require("mongoose");
const Scheme = require("./models/Scheme");
require("dotenv").config();

const schemes = [
    {
        name: "Awas Yojana Plus 2026",
        description: "Financial assistance for urban housing for low-income families.",
        benefit: "₹2,50,000 Subsidy",
        documentsRequired: ["Aadhar Card", "Income Certificate", "Residence Proof"],
        isActive: true,
        rules: {
            incomeMax: 500000,
            state: "Maharashtra",
            ageMin: 18
        }
    },
    {
        name: "Girl Child Education Scheme",
        description: "Scholarship program for undergraduate girls in STEM fields.",
        benefit: "₹50,000 / Year",
        documentsRequired: ["Marksheets", "Caste Certificate", "Bank Passbook"],
        isActive: true,
        rules: {
            gender: "Female",
            education: "12th Pass",
            incomeMax: 800000
        }
    },
    {
        name: "Farmer Support 4.0",
        description: "Direct benefit transfer for agricultural equipment and seeds.",
        benefit: "₹10,000 / Season",
        documentsRequired: ["Land Records", "Farmer ID"],
        isActive: true,
        rules: {
            occupation: "Farmer",
            ageMin: 21
        }
    }
];

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/gov_schemes")
    .then(async () => {
        console.log("Connected to MongoDB for seeding...");
        await Scheme.deleteMany();
        await Scheme.insertMany(schemes);
        console.log("Database Seeded with Industry-level schemes! 🚀");
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
