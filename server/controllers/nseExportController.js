const { exportApplicationToNse } = require("../services/nseExportService");

const postNseExport = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application_id is required",
      });
    }

    const exportedRow = await exportApplicationToNse(applicationId);

    return res.status(200).json({
      success: true,
      message: "NSE export upsert completed successfully",
      application_id: exportedRow.application_id,
      nse_row_id: exportedRow.id,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to export NSE data right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

module.exports = {
  postNseExport,
};
