const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { PDFDocument, PDFName, StandardFonts } = require("pdf-lib");
const { ensureApplicationBoid } = require("./boidAllocationService");
const {
  buildBoidPdfFields,
  getBoidOverlayConfigs,
  getBoidOverlayConfig,
} = require("./pdfBoidFieldService");
const {
  getOccupationPdfValue,
} = require("./pdfOccupationFieldService");
const {
  buildPdfAddressFields,
} = require("./pdfAddressFieldService");
const {
  getDefaultSelectionOverlays,
} = require("./pdfDefaultSelectionService");
const {
  getContactOverlays,
} = require("./pdfContactOverlayService");
const {
  getClientCodeOverlays,
} = require("./pdfClientCodeOverlayService");
const { buildPdfFieldPayload } = require("../pdf-flow/constants/pdfFieldMap");
const { fillPdfTemplate } = require("../pdf-flow/services/pdfTemplateFillService");

const _rawTemplatePath =
  process.env.ACCOUNT_OPENING_FORM_TEMPLATE_PATH ||
  "templates/account_opening_form_v3.pdf";

// Resolve relative paths to absolute (relative to server root = one dir above /services)
const DEFAULT_TEMPLATE_PATH = path.isAbsolute(_rawTemplatePath)
  ? _rawTemplatePath
  : path.join(__dirname, "..", _rawTemplatePath);

const isLambda = !!process.env.AWS_EXECUTION_ENV;
const DEFAULT_GENERATED_DIR = isLambda
  ? "/tmp/generated-pdfs"
  : path.join(__dirname, "..", "generated-pdfs");
const DEFAULT_FILLED_FONT_SIZE = Number(
  process.env.ACCOUNT_OPENING_FILLED_FONT_SIZE || "7",
);

const getExistingTemplatePath = (templatePath) => {
  const candidates = [
    templatePath,
    String(templatePath || "").replace("account_opening_form.pdf", "account_opening_form.pdf"),
    String(templatePath || "").replace("account_opening_form.pdf", "account_opening_form.pdf"),
    path.join(__dirname, "..", "templates", "account_opening_form.pdf"),
    path.join(__dirname, "..", "templates", "account_opening_form.pdf"),
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate)) || templatePath;
};

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const stringValue = String(value);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(stringValue)) {
      return stringValue;
    }
    return stringValue;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const splitAddress = (address) => {
  const normalized = String(address || "")
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    line1: normalized.slice(0, 2).join(", "),
    line2: normalized.slice(2).join(", "),
  };
};

const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const toUpperText = (value) => String(value || "").trim().toUpperCase();

const mapGenderToPdfValue = (gender) => {
  const normalized = String(gender || "").trim().toLowerCase();

  if (normalized === "male") return "/2";
  if (normalized === "female") return "/1";
  if (
    normalized === "others" ||
    normalized === "other" ||
    normalized === "transgender"
  ) {
    return "/0";
  }

  return "";
};

const mapMaritalStatusToPdfValue = (maritalStatus) => {
  const normalized = String(maritalStatus || "").trim().toLowerCase();

  if (normalized === "single") return "/0";
  if (normalized === "married") return "/1";

  return "";
};

const mapBankAccountTypeToPdfValue = (accountType) => {
  const normalized = String(accountType || "").trim().toLowerCase();

  if (normalized === "savings" || normalized === "saving") return "/0";
  if (normalized === "current") return "/1";
  if (
    normalized === "others" ||
    normalized === "other" ||
    normalized === "salary" ||
    normalized === "salary account"
  ) {
    return "/2";
  }

  return "";
};

const toPdfNameValue = (value) =>
  String(value || "")
    .trim()
    .replace(/^\//, "");

const setRawRadioGroupValue = (pdfDoc, field, rawValue) => {
  const selectedValue = toPdfNameValue(rawValue);

  if (!selectedValue) {
    return;
  }

  const acroField = field.acroField;
  const kids = acroField.normalizedEntries().Kids;

  acroField.dict.set(PDFName.of("V"), PDFName.of(selectedValue));
  acroField.dict.set(PDFName.of("DV"), PDFName.of(selectedValue));

  for (const ref of kids.array) {
    const kid = pdfDoc.context.lookup(ref);
    const appearances = kid.lookup(PDFName.of("AP"));
    const normalAppearances =
      appearances && appearances.lookup(PDFName.of("N"));

    let activeState = "Off";

    if (normalAppearances && typeof normalAppearances.keys === "function") {
      const keys = normalAppearances.keys().map((key) =>
        key.decodeText ? key.decodeText() : String(key),
      );

      if (keys.includes(selectedValue)) {
        activeState = selectedValue;
      }
    }

    kid.set(PDFName.of("AS"), PDFName.of(activeState));
  }
};

const setPdfFieldValue = (pdfDoc, form, fieldName, value, textFont) => {
  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return;
  }

  let field;
  try {
    field = form.getField(fieldName);
  } catch (error) {
    return;
  }

  const fieldType = field.constructor.name;

  if (fieldType === "PDFTextField") {
    field.setText(String(value));

    try {
      field.setFontSize(DEFAULT_FILLED_FONT_SIZE);
    } catch (error) {
      const isMissingDefaultAppearance =
        String(error.message || "").includes("No /DA");

      if (!isMissingDefaultAppearance) {
        throw error;
      }
    }

    if (textFont) {
      field.updateAppearances(textFont);
    }
    return;
  }

  if (fieldType === "PDFCheckBox") {
    field.check();
    return;
  }

  if (fieldType === "PDFRadioGroup") {
    setRawRadioGroupValue(pdfDoc, field, value);
  }
};

const clearPdfFieldValue = (form, fieldName) => {
  let field;
  try {
    field = form.getField(fieldName);
  } catch (error) {
    return;
  }

  if (field.constructor.name === "PDFTextField") {
    field.setText("");
  }
};

const normalizeAllTextFieldAppearances = (form, textFont) => {
  for (const field of form.getFields()) {
    if (field.constructor.name !== "PDFTextField") {
      continue;
    }

    try {
      field.setFontSize(DEFAULT_FILLED_FONT_SIZE);
    } catch (error) {
      const isMissingDefaultAppearance =
        String(error.message || "").includes("No /DA");

      if (!isMissingDefaultAppearance) {
        throw error;
      }
    }

    if (textFont) {
      field.updateAppearances(textFont);
    }
  }
};

const buildFieldPayload = (application) => buildPdfFieldPayload(application);

const drawPdfOverlay = (pdfDoc, overlay, textFont) => {
  if (!overlay || !overlay.text) {
    if (overlay?.kind !== "check") {
      return;
    }
  }

  const pages = pdfDoc.getPages();
  const page = pages[overlay.pageIndex];

  if (!page) {
    return;
  }

  if (overlay.kind === "check") {
    const x = Number(overlay.x || 0);
    const y = Number(overlay.y || 0);
    const width = Number(overlay.width || 8);
    const height = Number(overlay.height || 8);
    const thickness = Number(overlay.thickness || 1.2);

    page.drawLine({
      start: { x: x + width * 0.12, y: y + height * 0.45 },
      end: { x: x + width * 0.34, y: y + height * 0.16 },
      thickness,
    });
    page.drawLine({
      start: { x: x + width * 0.34, y: y + height * 0.16 },
      end: { x: x + width * 0.82, y: y + height * 0.78 },
      thickness,
    });
    return;
  }

  page.drawText(String(overlay.text), {
    x: overlay.x,
    y: overlay.y,
    size: overlay.size || DEFAULT_FILLED_FONT_SIZE,
    font: textFont,
  });
};

const fillPdfWithNode = async (templatePath, payload, outputPath) =>
  fillPdfTemplate({
    templatePath,
    outputPath,
    payload,
  });

const generateAccountOpeningPdf = async (application) => {
  let preparedApplication = application;

  if (application?.id) {
    const ensuredBoid = await ensureApplicationBoid(application.id, application.boid);

    if (ensuredBoid && ensuredBoid !== application.boid) {
      preparedApplication = {
        ...application,
        boid: ensuredBoid,
      };
    }
  }

  const templatePath = getExistingTemplatePath(DEFAULT_TEMPLATE_PATH);
  console.log("Account opening PDF template path:", templatePath);

  if (!fs.existsSync(templatePath)) {
    const error = new Error("Account opening PDF template not found");
    error.code = "TEMPLATE_NOT_FOUND";
    throw error;
  }

  const payload = buildFieldPayload(preparedApplication);

  if (
    process.env.NODE_ENV === "production" &&
    payload.missingFields.length > 0
  ) {
    const error = new Error(
      `Missing required PDF fields: ${payload.missingFields.join(", ")}`,
    );
    error.code = "MISSING_REQUIRED_FIELDS";
    error.missingFields = payload.missingFields;
    throw error;
  }

  const fileToken = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const outputFileName = `account_opening_${preparedApplication.id}${payload.isTestIncomplete ? "_TEST" : ""}_${fileToken}.pdf`;
  const outputPath = path.join(DEFAULT_GENERATED_DIR, outputFileName);

  await fsp.mkdir(DEFAULT_GENERATED_DIR, { recursive: true });

  let pdfMetadata;
  try {
    pdfMetadata = await fillPdfWithNode(templatePath, payload, outputPath);
  } catch (error) {
    const serviceError = new Error(
      error.stderr || error.message || "Failed to generate PDF",
    );
    serviceError.code = "PDF_GENERATION_FAILED";
    throw serviceError;
  }

  // Upload generated PDF to S3
  try {
    const { uploadToS3 } = require("../utils/s3Upload");
    const pdfBytes = fs.readFileSync(outputPath);
    await uploadToS3(`clients/uploads/unsigned-pdfs/${outputFileName}`, pdfBytes, "application/pdf");
    console.info(`[PDF] Uploaded generated unsigned PDF to S3: clients/uploads/unsigned-pdfs/${outputFileName}`);
  } catch (s3Error) {
    console.warn("[PDF] Failed to upload generated unsigned PDF to S3:", s3Error.message);
  }

  return {
    outputPath,
    fileName: outputFileName,
    pageCount: pdfMetadata?.pageCount || 0,
    isTestIncomplete: payload.isTestIncomplete,
    missingFields: payload.missingFields,
  };
};

module.exports = {
  generateAccountOpeningPdf,
};
