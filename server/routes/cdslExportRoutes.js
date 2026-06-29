const express = require("express");
const { postCdslExport } = require("../controllers/cdslExportController");

const router = express.Router();

router.post("/cdsl/:application_id", postCdslExport);

module.exports = router;
