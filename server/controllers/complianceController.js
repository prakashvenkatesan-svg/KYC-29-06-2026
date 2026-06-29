const pool = require("../config/db");
const {
  getApplicationById,
  listComplianceDocumentsQuery,
  insertComplianceDocumentQuery,
  getComplianceDocumentByIdQuery,
  updateComplianceDocumentReviewQuery,
} = require("../queries/complianceQueries");

const ALLOWED_DOCUMENT_TYPES = new Set([
  "pan_copy",
  "aadhaar_copy",
  "bank_proof",
  "income_proof",
  "signature_proof",
  "photo_proof",
  "ipv_proof",
  "compliance_note",
  "additional_document",
  "replacement_document",
  "exception_document",
]);

const ALLOWED_REVIEW_STATUSES = new Set([
  "pending",
  "uploaded",
  "under_review",
  "approved",
  "rejected",
]);

const buildPublicCompliancePath = (fileName) => `/uploads/compliance/${fileName}`;

const getComplianceDocuments = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    const application = await getApplicationById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const result = await pool.query(listComplianceDocumentsQuery, [applicationId]);

    return res.status(200).json({
      success: true,
      message: "Compliance documents fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Get compliance documents error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching compliance documents",
      error: error.message,
    });
  }
};

const uploadComplianceDocument = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    const { document_type, uploaded_by_type = "admin" } = req.body || {};

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(String(document_type || "").trim())) {
      return res.status(400).json({
        success: false,
        message: "A valid document type is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Compliance file is required",
      });
    }

    const application = await getApplicationById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const result = await pool.query(insertComplianceDocumentQuery, [
      applicationId,
      String(document_type).trim(),
      uploaded_by_type === "user" ? "user" : "admin",
      req.adminUser?.id ? Number(req.adminUser.id) : null,
      req.file.filename,
      req.file.originalname,
      buildPublicCompliancePath(req.file.filename),
      req.file.mimetype,
      Number(req.file.size) || 0,
    ]);

    return res.status(201).json({
      success: true,
      message: "Compliance document uploaded successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Upload compliance document error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while uploading compliance document",
    });
  }
};

const updateComplianceDocumentReview = async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    const { review_status, review_remark = null } = req.body || {};

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: "Valid compliance document ID is required",
      });
    }

    if (!ALLOWED_REVIEW_STATUSES.has(String(review_status || "").trim())) {
      return res.status(400).json({
        success: false,
        message: "A valid review status is required",
      });
    }

    const documentResult = await pool.query(getComplianceDocumentByIdQuery, [documentId]);

    if (documentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Compliance document not found",
      });
    }

    const result = await pool.query(updateComplianceDocumentReviewQuery, [
      String(review_status).trim(),
      review_remark ? String(review_remark).trim() : null,
      req.adminUser?.id ? Number(req.adminUser.id) : null,
      documentId,
    ]);

    return res.status(200).json({
      success: true,
      message: "Compliance document review updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Update compliance document review error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating compliance review",
      error: error.message,
    });
  }
};

module.exports = {
  getComplianceDocuments,
  uploadComplianceDocument,
  updateComplianceDocumentReview,
};
