const express = require("express");
const router = express.Router();

const {
  savePersonalDetails,
  getPersonalDetailsPrefillController,
} = require("../controllers/personalDetailsController");

router.post("/save", savePersonalDetails);
router.get("/prefill/:application_id", getPersonalDetailsPrefillController);

module.exports = router;
