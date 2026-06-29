const fs = require("fs/promises");
const path = require("path");
const { savePanCard } = require("../queries/panUploadQueries");
const { uploadToS3 } = require("../utils/s3Upload");

const uploadPanCard = async (req, res) => {
  try {
    const { application_id } = req.body;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "Application ID required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PAN card file required",
      });
    }

    // Read the file buffer since multer diskStorage was used
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(req.file.path);
    } catch (readError) {
      console.error("Failed to read temp PAN file:", readError.message);
    }

    if (fileBuffer) {
      const s3Key = `clients/uploads/pancardimage/${req.file.filename}`;
      // Upload to S3 (with error tolerance)
      await uploadToS3(s3Key, fileBuffer, req.file.mimetype);
    }

    const result = await savePanCard({
      application_id,
      file_name: req.file.filename,
      file_type: req.file.mimetype,
      file_path: req.file.path,
    });

    return res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};

module.exports = { uploadPanCard };