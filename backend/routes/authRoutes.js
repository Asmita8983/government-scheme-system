const express = require("express");
const router = express.Router();
const { register, login, updateProfile, uploadProfilePicture, getProfile, addSearchQuery, getApplicationHistory, sendOtp, verifyOtp, forgotPasswordSendOtp, forgotPasswordVerifyOtp, resetPassword } = require("../controllers/authController");
const { protect } = require("../utils/authMiddleware");
const multer = require("multer");
const path = require("path");

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'gov_scheme_profiles',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

router.post("/register", register);
router.post("/login", login);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/forgot-password/send-otp", forgotPasswordSendOtp);
router.post("/forgot-password/verify-otp", forgotPasswordVerifyOtp);
router.post("/reset-password", resetPassword);

router.get("/me", protect, getProfile);

router.put("/profile", protect, updateProfile);
router.post("/profile/upload", protect, upload.single('image'), uploadProfilePicture);
router.post("/search-history", protect, addSearchQuery);
router.get("/history", protect, getApplicationHistory);

module.exports = router;
