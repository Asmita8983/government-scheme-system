const Analytics = require("../models/Analytics");
const User = require("../models/User");
const { generateAdvancedAIAnalysis } = require("../utils/aiService");

// Record or Update Visit (Session)
exports.recordVisit = async (req, res) => {
    try {
        const { sessionId, userId, page } = req.body;

        // Find existing session
        let analytics = await Analytics.findOne({ sessionId });

        if (analytics) {
            // Update duration and pages
            const now = new Date();
            analytics.endTime = now;
            analytics.durationSeconds = Math.round((now - analytics.startTime) / 1000); // Difference in seconds

            if (page && !analytics.pagesVisited.includes(page)) {
                analytics.pagesVisited.push(page);
            }

            // Update User ID if it wasn't there before
            if (userId && !analytics.userId) {
                analytics.userId = userId;
            }

            await analytics.save();
            return res.status(200).json({ success: true, analytics });
        } else {
            // Create new session
            analytics = new Analytics({
                sessionId,
                userId: userId || null,
                ipAddress: req.ip || req.headers['x-forwarded-for'],
                userAgent: req.headers['user-agent'],
                pagesVisited: page ? [page] : [],
                startTime: new Date()
            });
            await analytics.save();
            return res.status(201).json({ success: true, analytics });
        }
    } catch (error) {
        console.error("Error recording visit:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Record Action (Click, etc.)
exports.recordAction = async (req, res) => {
    try {
        const { sessionId, actionType, contentInfo } = req.body;

        let analytics = await Analytics.findOne({ sessionId });

        if (!analytics) {
            // Ideally a session should exist, but let's create a minimal one if it doesn't
            analytics = new Analytics({
                sessionId,
                ipAddress: req.ip || req.headers['x-forwarded-for'],
                userAgent: req.headers['user-agent'],
                startTime: new Date()
            });
        }

        analytics.actions.push({
            actionType,
            contentInfo,
            timestamp: new Date()
        });

        // Update end time
        const now = new Date();
        analytics.endTime = now;
        analytics.durationSeconds = Math.round((now - analytics.startTime) / 1000);

        await analytics.save();
        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("Error recording action:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Analytics Data for Admin Dashboard
exports.getAnalytics = async (req, res) => {
    try {
        const totalSessions = await Analytics.countDocuments();
        const activeSessionsLast24h = await Analytics.countDocuments({
            startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        // Monthly stats
        const monthStats = await Analytics.aggregate([
            {
                $group: {
                    _id: { $month: "$startTime" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Average duration
        const durationStats = await Analytics.aggregate([
            {
                $group: {
                    _id: null,
                    avgDuration: { $avg: "$durationSeconds" }
                }
            }
        ]);

        // Popular content (Clicks)
        const popularContent = await Analytics.aggregate([
            { $unwind: "$actions" },
            {
                $group: {
                    _id: "$actions.contentInfo",
                    clicks: { $sum: 1 }
                }
            },
            { $sort: { clicks: -1 } },
            { $limit: 10 }
        ]);

        // Recent Sessions with Time Spent
        const recentSessions = await Analytics.find({})
            .sort({ startTime: -1 })
            .limit(10)
            .select("sessionId ipAddress durationSeconds startTime pagesVisited");

        res.status(200).json({
            success: true,
            data: {
                totalSessions,
                activeSessionsLast24h,
                monthStats,
                avgDuration: durationStats.length > 0 ? durationStats[0].avgDuration : 0,
                popularContent,
                recentSessions
            }
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Generate Advanced AI Insights Report
exports.getAdvancedAIAnalysisReport = async (req, res) => {
    try {
        // Fetch quick summary of analytics
        const totalSessions = await Analytics.countDocuments();
        const durationStats = await Analytics.aggregate([{ $group: { _id: null, avgDuration: { $avg: "$durationSeconds" } } }]);
        const popularContent = await Analytics.aggregate([
            { $unwind: "$actions" },
            { $group: { _id: "$actions.contentInfo", clicks: { $sum: 1 } } },
            { $sort: { clicks: -1 } },
            { $limit: 10 }
        ]);

        const analyticsSummary = {
            totalSessions,
            avgDuration: durationStats.length > 0 ? durationStats[0].avgDuration : 0,
            popularContent
        };

        // Fetch user demographics
        const ageGroups = await User.aggregate([
            { $match: { age: { $exists: true, $ne: null } } },
            { $group: { _id: { $subtract: ["$age", { $mod: ["$age", 10] }] }, count: { $sum: 1 } } }
        ]);
        const stateDistrib = await User.aggregate([
            { $match: { state: { $exists: true, $ne: null } } },
            { $group: { _id: "$state", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const demographicsSummary = { ageGroups, stateDistrib };

        // Generate AI Analysis
        const aiReport = await generateAdvancedAIAnalysis(analyticsSummary, demographicsSummary);

        if (!aiReport) {
            return res.status(500).json({ success: false, message: "AI Analysis Generation Failed" });
        }

        res.status(200).json({ success: true, report: aiReport });
    } catch (error) {
        console.error("AI Insights Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Public Endpoint for Live Widget Trackers
exports.getPublicStats = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        res.status(200).json({ success: true, count: userCount });
    } catch (error) {
        res.status(500).json({ success: false, count: 50000 }); // Graceful fallback
    }
};
