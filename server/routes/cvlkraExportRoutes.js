const express = require("express");
const { postCvlkraExport } = require("../controllers/cvlkraExportController");

const router = express.Router();

router.post("/cvlkra/:application_id", postCvlkraExport);

module.exports = router;
