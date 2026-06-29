const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");

// Change this import only if your DB connection file has another name/path.
const pool = require("../config/db");
const { uploadToS3 } = require("../utils/s3Upload");

const isLambda = !!process.env.AWS_EXECUTION_ENV;
const SIGNATURE_ROOT = isLambda
  ? "/tmp/uploads/signature"
  : path.join(
      __dirname,
      "..",
      "uploads",
      "signature",
    );

const folderByMethod = {
  upload_signature: "upload-signature",
  signature_pad: "signature-pad",
  capture_photo: "capture-photo",
};

const allowedMethods = Object.keys(folderByMethod);

const allowedUploadMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
];

const allowedCaptureMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
];

// Multer stores file temporarily in memory.
// Controller will save it into the correct selected folder.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

const getExtensionFromMimeType = (mimeType) => {
  const mimeExtensionMap = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "application/pdf": ".pdf",
  };

  return mimeExtensionMap[mimeType] || ".png";
};

const removeOldSignatureFile = async (signatureFilePath) => {
  if (!signatureFilePath) return;

  try {
    const uploadsRoot = path.resolve(SIGNATURE_ROOT);

    const oldAbsolutePath = path.resolve(
      __dirname,
      "..",
      signatureFilePath.replace(/^\//, ""),
    );

    // Security: delete only files inside uploads/signatures folder.
    if (!oldAbsolutePath.startsWith(uploadsRoot)) {
      return;
    }

    await fs.unlink(oldAbsolutePath);
  } catch (error) {
    // Old file may already be removed. No need to stop current upload.
    if (error.code !== "ENOENT") {
      console.error("Unable to delete old signature file:", error);
    }
  }
};

const uploadSignature = async (req, res) => {
  let newlyCreatedFilePath = "";

  try {
    const {
      application_id,
      signature_method,
      signature_base64,
    } = req.body;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "application_id is required.",
      });
    }

    if (!allowedMethods.includes(signature_method)) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature method.",
      });
    }

    const selectedFolder = folderByMethod[signature_method];

    const selectedFolderPath = path.join(
      SIGNATURE_ROOT,
      selectedFolder,
    );

    await fs.mkdir(selectedFolderPath, {
      recursive: true,
    });

    let fileBuffer;
    let originalFileName;
    let mimeType;
    let extension;

    // Signature Pad
    if (signature_method === "signature_pad") {
      if (!signature_base64) {
        return res.status(400).json({
          success: false,
          message: "Signature pad image is required.",
        });
      }

      const base64Match = signature_base64.match(
        /^data:(image\/png|image\/jpeg|image\/jpg);base64,(.+)$/,
      );

      if (!base64Match) {
        return res.status(400).json({
          success: false,
          message: "Invalid signature pad image format.",
        });
      }

      mimeType = base64Match[1] === "image/jpg"
        ? "image/jpeg"
        : base64Match[1];

      fileBuffer = Buffer.from(base64Match[2], "base64");
      extension = getExtensionFromMimeType(mimeType);

      originalFileName = `signature-pad-${application_id}${extension}`;
    } else {
      // Upload Signature or Capture Photo
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Signature file is required.",
        });
      }

      const allowedMimeTypes =
        signature_method === "capture_photo"
          ? allowedCaptureMimeTypes
          : allowedUploadMimeTypes;

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message:
            signature_method === "capture_photo"
              ? "Only JPG and PNG files are allowed for captured signature."
              : "Only JPG, JPEG, PNG and PDF files are allowed.",
        });
      }

      fileBuffer = req.file.buffer;
      mimeType = req.file.mimetype;

      extension =
        path.extname(req.file.originalname).toLowerCase() ||
        getExtensionFromMimeType(mimeType);

      originalFileName = req.file.originalname;
    }

    if (!fileBuffer || !fileBuffer.length) {
      return res.status(400).json({
        success: false,
        message: "Signature file is empty.",
      });
    }

    const fileName = `${application_id}_${Date.now()}${extension}`;

    newlyCreatedFilePath = path.join(selectedFolderPath, fileName);

    await fs.writeFile(newlyCreatedFilePath, fileBuffer);

    const signatureFilePath =
      `/uploads/signatures/${selectedFolder}/${fileName}`;

    // Upload to S3 if configured (with error tolerance)
    await uploadToS3("clients" + signatureFilePath, fileBuffer, mimeType);

    // Find existing signature path before updating it.
    const existingSignatureResult = await pool.query(
      `
        SELECT signature_file_path
        FROM public.signature_uploads
        WHERE application_id = $1
        LIMIT 1
      `,
      [application_id],
    );

    const oldSignatureFilePath =
      existingSignatureResult.rows[0]?.signature_file_path || null;

    // Update existing row first.
    const updateResult = await pool.query(
      `
        UPDATE public.signature_uploads
        SET
          signature_method = $2,
          signature_file_path = $3,
          original_file_name = $4,
          mime_type = $5,
          file_size = $6,
          updated_at = NOW()
        WHERE application_id = $1
        RETURNING *
      `,
      [
        application_id,
        signature_method,
        signatureFilePath,
        originalFileName,
        mimeType,
        fileBuffer.length,
      ],
    );

    let savedSignature;

    // First time user uploads a signature: insert new row.
    if (updateResult.rows.length === 0) {
      const insertResult = await pool.query(
        `
          INSERT INTO public.signature_uploads (
            application_id,
            signature_method,
            signature_file_path,
            original_file_name,
            mime_type,
            file_size,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING *
        `,
        [
          application_id,
          signature_method,
          signatureFilePath,
          originalFileName,
          mimeType,
          fileBuffer.length,
        ],
      );

      savedSignature = insertResult.rows[0];
    } else {
      savedSignature = updateResult.rows[0];
    }

    // Remove previous file after DB update succeeds.
    if (
      oldSignatureFilePath &&
      oldSignatureFilePath !== signatureFilePath
    ) {
      await removeOldSignatureFile(oldSignatureFilePath);
    }

    return res.status(200).json({
      success: true,
      message: "Signature uploaded successfully.",
      data: {
        application_id: savedSignature.application_id,
        signature_method: savedSignature.signature_method,
        signature_file_path: savedSignature.signature_file_path,
      },
    });
  } catch (error) {
    console.error("Signature upload error:", error);

    // If DB fails after new file is created, remove that newly created file.
    if (newlyCreatedFilePath) {
      try {
        await fs.unlink(newlyCreatedFilePath);
      } catch (deleteError) {
        console.error("New signature file cleanup failed:", deleteError);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to upload signature.",
    });
  }
};

module.exports = {
  upload,
  uploadSignature,
};