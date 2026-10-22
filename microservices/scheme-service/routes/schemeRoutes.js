const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
    getEligibleSchemes,
    createScheme,
    getAllSchemesAdmin,
    updateScheme,
    toggleSchemeStatus,
    analyzePDF
} = require("../controllers/schemeController");
const { protect, admin } = require("../utils/authMiddleware");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Public/User routes
router.post("/check-eligibility", getEligibleSchemes);

// Admin routes
router.get("/admin/all", protect, admin, getAllSchemesAdmin);
router.post("/create", protect, admin, createScheme);
router.put("/update/:id", protect, admin, updateScheme);
router.patch("/toggle/:id", protect, admin, toggleSchemeStatus);
router.post("/analyze-pdf", protect, admin, upload.single("pdf"), analyzePDF);

module.exports = router;
