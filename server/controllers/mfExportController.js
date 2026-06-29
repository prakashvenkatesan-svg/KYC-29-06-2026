const { exportApplicationToMf } = require("../services/mfExportService");

const postMfExport = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application_id is required",
      });
    }

    const exportedRow = await exportApplicationToMf(applicationId, {
      div_pay_mode: req.body?.div_pay_mode,
      communication_mode: req.body?.communication_mode,
      paperless_flag: req.body?.paperless_flag,
      mobile_declaration_flag: req.body?.mobile_declaration_flag,
      email_declaration_flag: req.body?.email_declaration_flag,
    });

    return res.status(200).json({
      success: true,
      message: "MF export upsert completed successfully",
      application_id: exportedRow.application_id,
      mf_row_id: exportedRow.id,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to export MF data right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

module.exports = {
  postMfExport,
};
