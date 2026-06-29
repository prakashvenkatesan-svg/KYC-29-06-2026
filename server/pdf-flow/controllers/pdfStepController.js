const { prepareApplicationPdf } = require("../services/pdfStepService");

const setWarningHeaders = (res, pdfResult) => {
  if (pdfResult.isTestIncomplete) {
    res.setHeader(
      "X-PDF-Warnings",
      `TEST_INCOMPLETE:${pdfResult.missingFields.join(",")}`,
    );
  }
};

const handlePdfError = (res, error) => {
  if (error.code === "APPLICATION_NOT_FOUND") {
    return res.status(404).json({
      success: false,
      message: "Application not found",
    });
  }

  if (error.code === "MISSING_REQUIRED_FIELDS") {
    return res.status(400).json({
      success: false,
      message: "Required fields are missing for final PDF generation",
      missing_fields: error.missingFields || [],
    });
  }

  if (error.code === "TEMPLATE_NOT_FOUND") {
    return res.status(500).json({
      success: false,
      message: "PDF template file not found",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Unable to prepare the application PDF right now",
    error: error.message,
  });
};

const getPreparedPdf = async (req, res) => {
  try {
    const { application_id: applicationId } = req.params;
    const pdfResult = await prepareApplicationPdf(applicationId);

    setWarningHeaders(res, pdfResult);

    return res.download(pdfResult.outputPath, pdfResult.fileName);
  } catch (error) {
    console.error("PDF step download error:", error.message);
    return handlePdfError(res, error);
  }
};

const getPreparedPdfMetadata = async (req, res) => {
  try {
    const { application_id: applicationId } = req.params;
    const pdfResult = await prepareApplicationPdf(applicationId);

    return res.status(200).json({
      success: true,
      data: {
        application_id: Number(applicationId),
        file_name: pdfResult.fileName,
        page_count: pdfResult.pageCount,
        is_test_incomplete: pdfResult.isTestIncomplete,
        missing_fields: pdfResult.missingFields,
      },
    });
  } catch (error) {
    console.error("PDF step metadata error:", error.message);
    return handlePdfError(res, error);
  }
};

module.exports = {
  getPreparedPdf,
  getPreparedPdfMetadata,
};
