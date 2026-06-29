const express = require("express");
const { postNseExport } = require("../controllers/nseExportController");

const router = express.Router();

router.post("/nse/:application_id", postNseExport);

module.exports = router;
