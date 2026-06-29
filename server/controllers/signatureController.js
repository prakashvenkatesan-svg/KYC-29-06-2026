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
const SIGNATURE_PUBLIC_PREFIX = "/uploads/signature";

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

let signatureUploadColumnsCache = null;

const getSignatureUploadColumns = async () => {
  if (signatureUploadColumnsCache) {
    return signatureUploadColumnsCache;
  }

  const result = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'signature_uploads'
    `,
  );

  signatureUploadColumnsCache = new Set(
    result.rows.map((row) => row.column_name),
  );

  return signatureUploadColumnsCache;
};

const hasColumn = (columns, columnName) => columns.has(columnName);

const getExistingSignatureSelectColumn = (columns) => {
  if (hasColumn(columns, "signature_file_path")) {
    return "signature_file_path";
  }

  if (hasColumn(columns, "file_path")) {
    return "file_path";
  }

  return null;
};

const buildSignatureMutationPayload = ({
  columns,
  applicationId,
  signatureMethod,
  signatureFilePath,
  originalFileName,
  mimeType,
  fileBuffer,
  storedFileName,
}) => {
  const values = {
    application_id: applicationId,
  };

  if (hasColumn(columns, "signature_method")) {
    values.signature_method = signatureMethod;
  }

  if (hasColumn(columns, "signature_file_path")) {
    values.signature_file_path = signatureFilePath;
  }

  if (hasColumn(columns, "original_file_name")) {
    values.original_file_name = originalFileName;
  }

  if (hasColumn(columns, "mime_type")) {
    values.mime_type = mimeType;
  }

  if (hasColumn(columns, "file_size")) {
    values.file_size = fileBuffer.length;
  }

  if (hasColumn(columns, "updated_at")) {
    values.updated_at = "__NOW__";
  }

  if (hasColumn(columns, "file_name")) {
    values.file_name = storedFileName;
  }

  if (hasColumn(columns, "file_type")) {
    values.file_type = mimeType;
  }

  if (hasColumn(columns, "file_path")) {
    values.file_path = signatureFilePath;
  }

  if (hasColumn(columns, "signature_file")) {
    values.signature_file = fileBuffer;
  }

  return values;
};

const buildUpdateQuery = (values) => {
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
      UPDATE public.signature_uploads
      SET ${assignments.join(", ")}
      WHERE application_id = $1
      RETURNING *
    `,
    values: params,
  };
};

const buildInsertQuery = (values, columns) => {
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
    hasColumn(columns, "application_id") &&
    !keys.includes("created_at") &&
    hasColumn(columns, "created_at")
  ) {
    keys.push("created_at");
    placeholders.push("NOW()");
  }

  return {
    text: `
      INSERT INTO public.signature_uploads (
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
      `${SIGNATURE_PUBLIC_PREFIX}/${selectedFolder}/${fileName}`;

    // Upload to S3 if configured (with error tolerance)
    await uploadToS3("clients" + signatureFilePath, fileBuffer, mimeType);

    const signatureUploadColumns = await getSignatureUploadColumns();
    const existingPathColumn = getExistingSignatureSelectColumn(
      signatureUploadColumns,
    );

    // Find existing signature path before updating it.
    const existingSignatureResult = existingPathColumn
      ? await pool.query(
          `
            SELECT ${existingPathColumn} AS signature_path
            FROM public.signature_uploads
            WHERE application_id = $1
            LIMIT 1
          `,
          [application_id],
        )
      : { rows: [] };

    const oldSignatureFilePath =
      existingSignatureResult.rows[0]?.signature_path || null;

    const mutationValues = buildSignatureMutationPayload({
      columns: signatureUploadColumns,
      applicationId: application_id,
      signatureMethod: signature_method,
      signatureFilePath,
      originalFileName,
      mimeType,
      fileBuffer,
      storedFileName: fileName,
    });

    // Update existing row first.
    const updateQuery = buildUpdateQuery(mutationValues);
    const updateResult = await pool.query(updateQuery.text, updateQuery.values);

    let savedSignature;

    // First time user uploads a signature: insert new row.
    if (updateResult.rows.length === 0) {
      const insertQuery = buildInsertQuery(
        mutationValues,
        signatureUploadColumns,
      );
      const insertResult = await pool.query(insertQuery.text, insertQuery.values);

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
        signature_method:
          savedSignature.signature_method || signature_method,
        signature_file_path:
          savedSignature.signature_file_path ||
          savedSignature.file_path ||
          signatureFilePath,
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
