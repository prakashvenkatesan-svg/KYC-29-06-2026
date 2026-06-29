const express = require("express");
const router = express.Router();
const {
  verifyPan,
  saveKraDetails,
  saveIdentityDetails,
} = require("../controllers/panController");

router.post("/verify-pan", verifyPan);

router.post("/save-kra-details", saveKraDetails);

router.post("/save-details", saveIdentityDetails);

module.exports = router;
