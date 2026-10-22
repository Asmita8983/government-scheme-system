const mongoose = require("mongoose");

const actionSchema = new mongoose.Schema({
    actionType: { type: String, required: true }, // e.g., 'click', 'view'
    contentInfo: { type: String, required: true }, // e.g., 'apply-scheme-123', 'nav-about'
    timestamp: { type: Date, default: Date.now }
});

const analyticsSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true }, // Unique session ID
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Optional user tracking
    ipAddress: { type: String },
    userAgent: { type: String },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    pagesVisited: [{ type: String }],
    actions: [actionSchema]
}, { timestamps: true });

// Optional: index for month-wise searches
analyticsSchema.index({ startTime: 1 });

module.exports = mongoose.model("Analytics", analyticsSchema);
