const { exportApplicationToNsdl } = require("../services/nsdlExportService");

const postNsdlExport = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application_id is required",
      });
    }

    const exportedRow = await exportApplicationToNsdl(applicationId, {
      sgn: req.body?.sgn,
      pan_verify_flag: req.body?.pan_verify_flag,
      short_name: req.body?.short_name,
    });

    return res.status(200).json({
      success: true,
      message: "NSDL export upsert completed successfully",
      application_id: exportedRow.application_id,
      nsdl_row_id: exportedRow.id,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to export NSDL data right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

module.exports = {
  postNsdlExport,
};
