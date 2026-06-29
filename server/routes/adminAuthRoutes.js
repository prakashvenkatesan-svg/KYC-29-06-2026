const express = require("express");

const {
  loginAdmin,
  getAdminProfile,
} = require("../controllers/adminAuthController");
const { verifyAdminToken } = require("../utils/adminAuth");

const router = express.Router();

router.post("/login", loginAdmin);
router.get("/me", verifyAdminToken, getAdminProfile);

module.exports = router;
