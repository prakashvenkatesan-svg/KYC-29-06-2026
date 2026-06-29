const express = require("express");
const { postNsdlExport } = require("../controllers/nsdlExportController");

const router = express.Router();

router.post("/nsdl/:application_id", postNsdlExport);

module.exports = router;
