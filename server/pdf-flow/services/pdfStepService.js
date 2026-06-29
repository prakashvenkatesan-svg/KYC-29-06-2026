const fs = require("fs");
const path = require("path");

const { buildPdfFieldPayload } = require("../constants/pdfFieldMap");
const { fetchApplicationForPdf } = require("../queries/pdfApplicationQuery");
const { fillPdfTemplate } = require("./pdfTemplateFillService");
const { ensureApplicationBoid } = require("../../services/boidAllocationService");

const DEFAULT_TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "..",
  "templates",
  "account_opening_form.pdf",
);

const DEFAULT_OUTPUT_DIR = path.join(
  __dirname,
  "..",
  "..",
  "generated-pdfs",
);

const resolveConfiguredPath = (configuredValue, fallbackPath) => {
  if (!configuredValue) {
    return fallbackPath;
  }

  if (path.isAbsolute(configuredValue)) {
    return configuredValue;
  }

  return path.join(__dirname, "..", "..", configuredValue);
};

const getTemplatePath = () =>
  {
    const configuredPath = resolveConfiguredPath(
      process.env.ACCOUNT_OPENING_FORM_TEMPLATE_PATH,
      DEFAULT_TEMPLATE_PATH,
    );

    const candidates = [
      configuredPath,
      String(configuredPath || "").replace(
        "account_opening_form-v2.pdf",
        "account_opening_form_v2.pdf",
      ),
      String(configuredPath || "").replace(
        "account_opening_form_v2.pdf",
        "account_opening_form-v2.pdf",
      ),
      path.join(__dirname, "..", "..", "templates", "account_opening_form_v2.pdf"),
      path.join(__dirname, "..", "..", "templates", "account_opening_form.pdf"),
    ].filter(Boolean);

    return candidates.find((candidate) => fs.existsSync(candidate)) || configuredPath;
  };

const getOutputDir = () =>
  resolveConfiguredPath(
    process.env.ACCOUNT_OPENING_PDF_OUTPUT_DIR,
    DEFAULT_OUTPUT_DIR,
  );

const buildOutputFileName = (applicationId, isTestIncomplete) => {
  const fileToken = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `account_opening_${applicationId}${isTestIncomplete ? "_TEST" : ""}_${fileToken}.pdf`;
};

const prepareApplicationPdf = async (applicationId) => {
  await ensureApplicationBoid(applicationId);

  const application = await fetchApplicationForPdf(applicationId);

  if (!application) {
    const error = new Error("Application not found");
    error.code = "APPLICATION_NOT_FOUND";
    throw error;
  }

  const payload = buildPdfFieldPayload(application);

  if (process.env.NODE_ENV === "production" && payload.missingFields.length > 0) {
    const error = new Error(
      `Missing required PDF fields: ${payload.missingFields.join(", ")}`,
    );
    error.code = "MISSING_REQUIRED_FIELDS";
    error.missingFields = payload.missingFields;
    throw error;
  }

  const fileName = buildOutputFileName(application.id, payload.isTestIncomplete);
  const outputPath = path.join(getOutputDir(), fileName);

  const pdfMetadata = await fillPdfTemplate({
    templatePath: getTemplatePath(),
    outputPath,
    payload,
  });

  return {
    application,
    outputPath,
    fileName,
    pageCount: pdfMetadata.pageCount,
    isTestIncomplete: payload.isTestIncomplete,
    missingFields: payload.missingFields,
  };
};

module.exports = {
  prepareApplicationPdf,
};
