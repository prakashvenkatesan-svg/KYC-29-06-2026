const express = require("express");
const router = express.Router();
const {
  generateClientCodeAfterPayment,
} = require("../controllers/clientCodeController");

router.post("/generate-client-code", generateClientCodeAfterPayment);

module.exports = router;
