const express = require("express");
const {
  getExportDetailsByApplicationId,
  postExportAllByApplicationId,
} = require("../controllers/exportDetailsController");

const router = express.Router();

router.get("/all/:application_id", getExportDetailsByApplicationId);
router.post("/all/:application_id", postExportAllByApplicationId);

module.exports = router;
