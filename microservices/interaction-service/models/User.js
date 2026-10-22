const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
    },


    // Profile fields
    mobileNumber: { type: String, default: "" },
    profilePicture: { type: String, default: "" },
    age: Number,
    gender: String,
    income: Number,
    category: String,
    education: String,
    occupation: String,
    caste: String,
    state: String,
    district: String,

    // Identity Fields
    aadhaarNumber: { type: String, default: "" },
    dob: { type: String, default: "" }, // Format: DD/MM/YYYY

    // Store verified documents
    documents: [
      {
        docType: { type: String }, // e.g. "Aadhaar", "PAN"
        frontUrl: { type: String },     // Cloudinary URL for Front
        backUrl: { type: String },      // Cloudinary URL for Back
        verified: { type: Boolean, default: false },
        isFake: { type: Boolean, default: false },
        authenticityScore: { type: Number, default: 0 }, // 0-100
        verificationDetails: { type: String }, // AI reasoning
        uploadedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

/// 🔐 HASH PASSWORD BEFORE SAVE
userSchema.pre("save", async function () {
  console.log("User pre-save hook triggered");
  if (!this.isModified("password")) {
    console.log("Password not modified");
    return;
  }
  console.log("Hashing password");
  this.password = await bcrypt.hash(this.password, 10);
});

/// 🔐 COMPARE PASSWORD METHOD
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
