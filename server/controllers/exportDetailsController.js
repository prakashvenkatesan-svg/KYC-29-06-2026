const {
  fetchExportDetailsByApplicationId,
  exportAndFetchDetailsByApplicationId,
} = require("../services/exportDetailsService");

const getExportDetailsByApplicationId = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application_id is required",
      });
    }

    const exportDetails = await fetchExportDetailsByApplicationId(applicationId);

    return res.status(200).json({
      success: true,
      message: "Export details fetched successfully",
      data: exportDetails,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch export details right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

const postExportAllByApplicationId = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application_id is required",
      });
    }

    const exportDetails = await exportAndFetchDetailsByApplicationId(
      applicationId,
      req.body || {},
    );

    const hasFailures = exportDetails.export_summary?.failed_count > 0;

    return res.status(200).json({
      success: true,
      message: hasFailures
        ? "Export jobs processed with partial failures"
        : "All export jobs processed successfully",
      data: exportDetails,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to process export details right now.",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};

module.exports = {
  getExportDetailsByApplicationId,
  postExportAllByApplicationId,
};
