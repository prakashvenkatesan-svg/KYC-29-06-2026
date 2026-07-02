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

let applicantPhotoColumnsCache = null;

const getApplicantPhotoColumns = async () => {
  if (applicantPhotoColumnsCache) {
    return applicantPhotoColumnsCache;
  }

  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'applicant_photo_uploads'
    `,
  );

  applicantPhotoColumnsCache = new Set(
    result.rows.map((row) => row.column_name),
  );

  return applicantPhotoColumnsCache;
};

const hasColumn = (columns, columnName) => columns.has(columnName);

const buildApplicantPhotoMutationPayload = ({
  columns,
  applicationId,
  fileName,
  mimeType,
  relativeFilePath,
  image,
}) => {
  const values = {
    application_id: applicationId,
  };

  if (hasColumn(columns, "file_name")) {
    values.file_name = fileName;
  }

  if (hasColumn(columns, "file_type")) {
    values.file_type = mimeType;
  }

  if (hasColumn(columns, "file_path")) {
    values.file_path = relativeFilePath;
  }

  if (hasColumn(columns, "photo_base64")) {
    values.photo_base64 = image;
  }

  if (hasColumn(columns, "updated_at")) {
    values.updated_at = "__NOW__";
  }

  return values;
};

const buildApplicantPhotoUpdateQuery = (values) => {
  const keys = Object.keys(values).filter((key) => key !== "application_id");
  const params = [values.application_id];

  const assignments = keys.map((key) => {
    const value = values[key];

    if (value === "__NOW__") {
      return `${key} = NOW()`;
    }

    params.push(value);
    return `${key} = $${params.length}`;
  });

  return {
    text: `
      UPDATE public.applicant_photo_uploads
      SET ${assignments.join(", ")}
      WHERE application_id = $1
      RETURNING *
    `,
    values: params,
  };
};

const buildApplicantPhotoInsertQuery = (values, columns) => {
  const keys = Object.keys(values);
  const params = [];

  const placeholders = keys.map((key) => {
    const value = values[key];

    if (value === "__NOW__") {
      return "NOW()";
    }

    params.push(value);
    return `$${params.length}`;
  });

  if (
    hasColumn(columns, "created_at") &&
    !keys.includes("created_at")
  ) {
    keys.push("created_at");
    placeholders.push("NOW()");
  }

  return {
    text: `
      INSERT INTO public.applicant_photo_uploads (
        ${keys.join(", ")}
      )
      VALUES (
        ${placeholders.join(", ")}
      )
      RETURNING *
    `,
    values: params,
  };
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

    // Create server/uploads/photos folder if not exists
    const isLambda = !!process.env.AWS_EXECUTION_ENV;
    const uploadDir = isLambda 
      ? "/tmp/uploads/photos" 
      : path.join(__dirname, "../uploads/photos");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `photo_${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, fileName);
    const relativeFilePath = `/uploads/photos/${fileName}`;

    fs.writeFileSync(filePath, imageBuffer);

    // Upload to S3 if configured (with error tolerance)
    await uploadToS3("clients" + relativeFilePath, imageBuffer, mimeType);

    const applicantPhotoColumns = await getApplicantPhotoColumns();
    const mutationValues = buildApplicantPhotoMutationPayload({
      columns: applicantPhotoColumns,
      applicationId,
      fileName,
      mimeType,
      relativeFilePath,
      image,
    });

    const updateQuery = buildApplicantPhotoUpdateQuery(mutationValues);
    const updateResult = await pool.query(updateQuery.text, updateQuery.values);

    if (updateResult.rows.length === 0) {
      const insertQuery = buildApplicantPhotoInsertQuery(
        mutationValues,
        applicantPhotoColumns,
      );
      await pool.query(insertQuery.text, insertQuery.values);
    }

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
