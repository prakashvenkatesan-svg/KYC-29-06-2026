const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const { uploadToS3 } = require("../utils/s3Upload");

const router = express.Router();

const MIME_EXTENSION_MAP = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

router.post("/upload", async (req, res) => {
  try {
    const { image, application_id: applicationIdRaw } = req.body;
    const applicationId = Number(applicationIdRaw);

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "No image provided",
      });
    }

    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format",
      });
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];
    const extension = MIME_EXTENSION_MAP[mimeType];

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Unsupported image type",
      });
    }

    if (!base64Data || !base64Data.trim()) {
      return res.status(400).json({
        success: false,
        message: "Captured image is empty",
      });
    }

    const imageBuffer = Buffer.from(base64Data, "base64");

    if (!imageBuffer.length) {
      return res.status(400).json({
        success: false,
        message: "Captured image is empty",
      });
    }

    // Create project-root uploads/photos folder if not exists
    const isLambda = !!process.env.AWS_EXECUTION_ENV;
    const uploadDir = isLambda 
      ? "/tmp/uploads/photos" 
      : path.join(__dirname, "../../uploads/photos");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `photo_${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, fileName);
    const relativeFilePath = `/uploads/photos/${fileName}`;

    fs.writeFileSync(filePath, imageBuffer);

    // Upload to S3 if configured (with error tolerance)
    await uploadToS3("clients" + relativeFilePath, imageBuffer, mimeType);

    await pool.query(
      `
        INSERT INTO public.applicant_photo_uploads (
          application_id,
          file_name,
          file_type,
          file_path,
          photo_base64
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (application_id)
        DO UPDATE SET
          file_name = EXCLUDED.file_name,
          file_type = EXCLUDED.file_type,
          file_path = EXCLUDED.file_path,
          photo_base64 = EXCLUDED.photo_base64,
          updated_at = NOW()
      `,
      [applicationId, fileName, mimeType, relativeFilePath, image],
    );

    res.json({
      success: true,
      fileName,
      path: relativeFilePath,
    });
  } catch (error) {
    console.error("PHOTO UPLOAD ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
});

module.exports = router;
