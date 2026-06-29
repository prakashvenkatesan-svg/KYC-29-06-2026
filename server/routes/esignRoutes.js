const express = require("express");

const {
  startEsign,
  getEsignStatus,
  downloadSignedPdf,
} = require("../controllers/esignController");

const router = express.Router();

router.post("/applications/:application_id/start", startEsign);
router.get("/applications/:application_id/status", getEsignStatus);
router.get("/applications/:application_id/signed-pdf", downloadSignedPdf);

module.exports = router;
