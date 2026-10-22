const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
// const { verifyToken, isAdmin } = require('../middleware/auth'); 
// Assuming auth middleware exists if needed, but for simplicity let's rely on standard routes now.
// For admin endpoints, add `verifyToken` and `isAdmin` later if implemented in the project.

// Record visit info (can be called repeatedly without duplicating session if sessionId is same)
router.post('/visit', analyticsController.recordVisit);

// Record click actions
router.post('/action', analyticsController.recordAction);

// Get analytics data for Admin Panel
router.get('/admin', analyticsController.getAnalytics);

// Generate Advanced AI Analytics Report
router.get('/admin/ai-insights', analyticsController.getAdvancedAIAnalysisReport);

// Public API for homepage widgets
router.get('/public/stats', analyticsController.getPublicStats);

module.exports = router;
