const express = require("express");
const router = express.Router();
const { loginAdmin, registerAdmin, getAllUsers, getAllAdmins } = require("../controllers/adminController");

router.post("/login", loginAdmin);
router.post("/register", registerAdmin);
router.get("/users", getAllUsers);
router.get("/all-admins", getAllAdmins);

module.exports = router;
