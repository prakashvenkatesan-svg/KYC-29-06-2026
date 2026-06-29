const express = require("express");

const {
  getPreparedPdf,
  getPreparedPdfMetadata,
} = require("../controllers/pdfStepController");

const router = express.Router();

router.get("/applications/:application_id/pdf", getPreparedPdf);
router.get("/applications/:application_id/prepare", getPreparedPdfMetadata);
router.get("/applications/:application_id/document", getPreparedPdf);

module.exports = router;
