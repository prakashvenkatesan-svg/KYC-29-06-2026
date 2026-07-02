const {
  exportApplicationToBse,
  exportAllApplicationsToBse,
} = require("../services/bseExportService");

const postBseExport = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application_id is required",
      });
    }

    const exportedRow = await exportApplicationToBse(applicationId);

    return res.status(200).json({
      success: true,
      message: "BSE export upsert completed successfully",
      application_id: exportedRow.application_id,
      bse_row_id: exportedRow.id,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to export BSE data right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

const postBulkBseExport = async (req, res) => {
  try {
    const exportSummary = await exportAllApplicationsToBse(req.body || {});

    return res.status(200).json({
      success: true,
      message: "Bulk BSE export processed successfully",
      data: exportSummary,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to process bulk BSE export right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

module.exports = {
  postBseExport,
  postBulkBseExport,
};
