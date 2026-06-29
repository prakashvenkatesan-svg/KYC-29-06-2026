const express = require("express");

const {
  selectDdpiForApplication,
  getDdpiDetails,
  cancelDdpi,
} = require("../controllers/ddpiController");

const router = express.Router();

router.post("/select", selectDdpiForApplication);
router.get("/applications/:application_id", getDdpiDetails);
router.post("/applications/:application_id/cancel", cancelDdpi);

module.exports = router;
