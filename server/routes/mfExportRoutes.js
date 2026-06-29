const express = require("express");
const { postMfExport } = require("../controllers/mfExportController");

const router = express.Router();

router.post("/mf/:application_id", postMfExport);

module.exports = router;
