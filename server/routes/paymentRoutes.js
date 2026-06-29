const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const {
  generateHash,
  paymentSuccess,
  paymentFailure,
} = require("../controllers/paymentController");
// GENERATE HAS

router.post("/generate-hash", generateHash);

router.post("/success", paymentSuccess);

router.post("/failure", paymentFailure);

module.exports = router;
