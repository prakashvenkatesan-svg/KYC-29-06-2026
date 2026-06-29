const express = require("express");
const router = express.Router();

const {
  getBankByIFSC,
  saveBankDetails,
  verifyBankAccount,
  createReversePennyDrop,
  reversePennyWebhook,
  checkReversePennyStatus,
} = require("../controllers/bankDetailsController");

router.get("/ifsc/:ifscCode", getBankByIFSC);

router.post("/save", saveBankDetails);

router.post("/verify-bank", verifyBankAccount);

router.post("/reverse-penny-drop", createReversePennyDrop);

router.post("/reverse-penny-webhook", reversePennyWebhook);

router.get("/payment-status/:transactionId", checkReversePennyStatus);

module.exports = router;
