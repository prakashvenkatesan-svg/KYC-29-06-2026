const express = require("express");
const router = express.Router();

const {
  createNumberRegistration,
  verifyMobileOtp,
  resendMobileOtp,
  updateMobileNumber,
  createEmailRegistration,
  verifyEmailOtp,
  resendEmailOtp,
  downloadApplicationPdf,

  // getResumeStatus,
  // resetTestApplication,
  // createContactEnquiry,
} = require("../controllers/contactController");

router.post("/start", createNumberRegistration);
router.post("/verify-mobile-otp", verifyMobileOtp);
router.post("/resend-mobile-otp", resendMobileOtp);
router.put("/update-mobile/:application_id", updateMobileNumber);

router.post("/send-email-otp", createEmailRegistration);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/resend-email-otp", resendEmailOtp);
router.get("/applications/:application_id/pdf", downloadApplicationPdf);


// router.get("/resume/:application_id", getResumeStatus);
// router.delete("/applications/:application_id/test-reset", resetTestApplication);
// router.post("/enquiries", createContactEnquiry);

module.exports = router;
