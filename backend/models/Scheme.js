const mongoose = require("mongoose");

const schemeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    benefit: String,

    documentsRequired: [String],
    applyLink: String,

    rules: {
      ageMin: Number,
      ageMax: Number,
      incomeMax: Number,
      gender: { type: String, default: "Any" },
      category: { type: String, default: "Any" },
      education: String,
      occupation: String,
      caste: String,
      state: String,
      district: String
    },

    isActive: { type: Boolean, default: true },
    deadline: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Scheme", schemeSchema);
