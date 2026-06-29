const { exportApplicationToCvlkra } = require("../services/cvlkraExportService");

const postCvlkraExport = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application_id is required",
      });
    }

    const exportedRow = await exportApplicationToCvlkra(applicationId, req.body || {});

    return res.status(200).json({
      success: true,
      message: "CVLKRA export upsert completed successfully",
      application_id: exportedRow.application_id,
      cvlkra_row_id: exportedRow.id,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to export CVLKRA data right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

module.exports = {
  postCvlkraExport,
};
