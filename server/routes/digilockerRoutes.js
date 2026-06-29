const express = require("express");

const router = express.Router();

const {
  startDigilockerController,
  getDigilockerDetails,
  getAadhaarData,
} = require("../controllers/digilockerController");

router.post("/start", startDigilockerController);

router.get("/status/:id", getDigilockerDetails);

router.get("/aadhaar/:id", getAadhaarData);

module.exports = router;
