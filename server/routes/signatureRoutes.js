const express = require("express");

const {
  upload,
  uploadSignature,
} = require("../controllers/signatureController");

const router = express.Router();

router.post(
  "/upload",
  (req, res, next) => {
    upload.single("signature")(req, res, (error) => {
      if (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size must be less than 2 MB.",
          });
        }

        return res.status(400).json({
          success: false,
          message: error.message || "Invalid signature file.",
        });
      }

      next();
    });
  },
  uploadSignature,
);

module.exports = router;