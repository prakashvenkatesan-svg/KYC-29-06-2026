const fs = require("fs");
const multer = require("multer");
const path = require("path");

const isLambda = !!process.env.AWS_EXECUTION_ENV;
const uploadDir = isLambda 
  ? "/tmp/uploads/compliance" 
  : path.join(__dirname, "..", "uploads", "compliance");
const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeExtension = path.extname(file.originalname || "").toLowerCase();
    const baseName = path
      .basename(file.originalname || "document", safeExtension)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);

    cb(null, `${Date.now()}_${baseName || "document"}${safeExtension}`);
  },
});

module.exports = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Only PDF, JPG, JPEG, and PNG files are allowed"));
      return;
    }

    cb(null, true);
  },
});
