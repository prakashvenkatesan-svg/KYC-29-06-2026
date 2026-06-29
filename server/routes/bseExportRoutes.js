const express = require("express");
const { postBseExport } = require("../controllers/bseExportController");

const router = express.Router();

router.post("/bse/:application_id", postBseExport);

module.exports = router;
