const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyDocument } = require('../controllers/docController');
const { protect } = require('../utils/authMiddleware');

// Use Memory Storage for temporary processing (no need to save to disk/cloud for verification only)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (PDFs can be large)
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only Images and PDFs are allowed!'), false);
        }
    }
});

// Route: POST /api/documents/verify
router.post('/verify', protect, upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), verifyDocument);

module.exports = router;
