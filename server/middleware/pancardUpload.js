const fs = require("fs");
const path = require("path");
const os = require("os");
const multer = require("multer");

const uploadPath = path.join(os.tmpdir(), "uploads", "pancardimage");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

console.log("PAN card upload temp path:", uploadPath);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const safeFileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, safeFileName);
  }
});

const upload = multer({ storage });

module.exports = upload;