const express = require("express");
const router = express.Router();
const {
    loginAdmin,
    registerAdmin,
    getAllUsers,
    getAllAdmins,
    getAllApplications,
    updateApplicationStatus
} = require("../controllers/adminController");
const { protect, admin } = require("../utils/authMiddleware");

router.post("/login", loginAdmin);
router.post("/register", registerAdmin);
router.get("/users", getAllUsers);
router.get("/all-admins", getAllAdmins);
router.get("/applications", protect, admin, getAllApplications);
router.put("/applications/status", protect, admin, updateApplicationStatus);

module.exports = router;
