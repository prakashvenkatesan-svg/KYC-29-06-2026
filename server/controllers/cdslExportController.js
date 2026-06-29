const { exportApplicationToCdsl } = require("../services/cdslExportService");

const postCdslExport = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application_id is required",
      });
    }

    const exportedRow = await exportApplicationToCdsl(applicationId, req.body || {});

    return res.status(200).json({
      success: true,
      message: "CDSL export upsert completed successfully",
      application_id: exportedRow.application_id,
      cdsl_row_id: exportedRow.id,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to export CDSL data right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

module.exports = {
  postCdslExport,
};
