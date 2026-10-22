const mongoose = require("mongoose");

const chatLogSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Optional: link to registered user
        sessionId: { type: String, required: true }, // To group messages in one session
        userMessage: { type: String }, // What the user said (transcript)
        aiResponse: { type: String }, // What the AI replied
        language: { type: String, default: "en-IN" },
        extractedData: {
            age: Number,
            income: Number,
            category: String,
            occupation: String
        },
        meta: {
            timestamp: { type: Date, default: Date.now }
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ChatLog", chatLogSchema);
