const express = require("express");
const {
  postBseExport,
  postBulkBseExport,
} = require("../controllers/bseExportController");

const router = express.Router();

router.post("/bse-all", postBulkBseExport);
router.post("/bse/:application_id", postBseExport);

module.exports = router;
