const express = require("express");
const router = express.Router();

const upload = require("../middleware/pancardUpload");

const {
  uploadPanCard,
} = require("../controllers/panUploadController");

router.post(
  "/upload",
  upload.single("panCard"),
  uploadPanCard
);

module.exports = router;