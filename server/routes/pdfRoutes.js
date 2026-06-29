const express = require("express");

const router = express.Router();

const { generatePdf } = require("../controllers/pdfController");

router.get("/generate-pdf/:application_id", generatePdf);

module.exports = router;
