const express = require("express");

const router = express.Router();

// START SERIAL NUMBER
let serialNumber = 100001;

// GENERATE CLIENT CODE
function generateClientCode(panNumber) {
  // CHECK PAN
  if (!panNumber) {
    throw new Error("PAN number is required");
  }

  // CLEAN PAN
  const cleanPan = panNumber.trim().toUpperCase();

  // VALIDATE PAN FORMAT
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  if (!panRegex.test(cleanPan)) {
    throw new Error("Invalid PAN number format");
  }

  // GET 5TH CHARACTER
  const fifthChar = cleanPan[4];

  // CREATE CLIENT CODE
  const clientCode = `${fifthChar}${serialNumber}`;

  // INCREMENT SERIAL NUMBER
  serialNumber++;

  return clientCode;
}

// API
router.post("/generate-client-code", async (req, res) => {
  try {
    const { panNumber } = req.body;

    // VALIDATION
    if (!panNumber) {
      return res.status(400).json({
        success: false,
        message: "PAN number is required",
      });
    }

    // GENERATE CODE
    const clientCode = generateClientCode(panNumber);

    // RESPONSE
    res.status(200).json({
      success: true,
      message: "Client code generated successfully",

      clientCode,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
