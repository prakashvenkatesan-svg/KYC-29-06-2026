const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { PDFDocument, PDFName, StandardFonts } = require("pdf-lib");

const DEFAULT_FILLED_FONT_SIZE = Number(
  process.env.ACCOUNT_OPENING_FILLED_FONT_SIZE || "7",
);

const getImageBytesFromBase64 = (value) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const base64Payload = normalized.startsWith("data:")
    ? normalized.split(",").slice(1).join(",")
    : normalized;

  if (!base64Payload) {
    return null;
  }

  return Buffer.from(base64Payload, "base64");
};

const getImageBytesFromPath = async (value) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  const candidatePaths =
    normalized.startsWith("/uploads/") || normalized.startsWith("uploads/")
      ? [
          path.join(
            __dirname,
            "..",
            "..",
            "..",
            normalized.replace(/^\/+/, ""),
          ),
          path.join(
            __dirname,
            "..",
            "..",
            normalized.replace(/^\/+/, ""),
          ),
          path.join(
            __dirname,
            "..",
            "..",
            normalized
              .replace(/^\/+/, "")
              .replace(/^uploads\/signatures\//, "uploads/signature/")
              .replace(/^uploads\/signature\//, "uploads/signature/"),
          ),
        ]
      : [normalized];

  const absolutePath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!absolutePath) {
    // Helper to extract S3 key
    const cleanNormalized = normalized.replace(/\\/g, "/");
    const uploadsIndex = cleanNormalized.indexOf("uploads/");
    const s3Key = uploadsIndex >= 0 ? "clients/" + cleanNormalized.substring(uploadsIndex) : "clients/uploads/other/" + path.basename(cleanNormalized);

    try {
      const { downloadFromS3 } = require("../../utils/s3Upload");
      console.log(`[PDF] File not found locally. Attempting S3 download: "${s3Key}"...`);
      const s3Buffer = await downloadFromS3(s3Key);
      
      if (s3Buffer) {
        return s3Buffer;
      }
      
      // Retry with alternative signature path if needed
      if (s3Key.includes("uploads/signatures/")) {
        const altKey = s3Key.replace("uploads/signatures/", "uploads/signature/");
        console.log(`[PDF] Retrying S3 with key: "${altKey}"...`);
        const altBuffer = await downloadFromS3(altKey);
        if (altBuffer) return altBuffer;
      } else if (s3Key.includes("uploads/signature/")) {
        const altKey = s3Key.replace("uploads/signature/", "uploads/signatures/");
        console.log(`[PDF] Retrying S3 with key: "${altKey}"...`);
        const altBuffer = await downloadFromS3(altKey);
        if (altBuffer) return altBuffer;
      }
    } catch (s3Error) {
      console.warn("[PDF] S3 download error:", s3Error.message);
    }
    
    return null;
  }

  return fsp.readFile(absolutePath);
};

const embedImage = async (pdfDoc, { imageBase64, imagePath }) => {
  const imageBytes =
    (await getImageBytesFromPath(imagePath)) ||
    getImageBytesFromBase64(imageBase64);

  if (!imageBytes?.length) {
    return null;
  }

  if (
    imageBytes[0] === 0x89 &&
    imageBytes[1] === 0x50 &&
    imageBytes[2] === 0x4e &&
    imageBytes[3] === 0x47
  ) {
    return pdfDoc.embedPng(imageBytes);
  }

  if (imageBytes[0] === 0xff && imageBytes[1] === 0xd8) {
    return pdfDoc.embedJpg(imageBytes);
  }

  try {
    return await pdfDoc.embedJpg(imageBytes);
  } catch (jpgError) {
    return pdfDoc.embedPng(imageBytes);
  }
};

const getFieldWidgetRects = (pdfDoc, form, fieldName) => {
  let field;
  try {
    field = form.getField(fieldName);
  } catch (error) {
    return [];
  }

  const pages = pdfDoc.getPages();
  const widgets = field.acroField.getWidgets ? field.acroField.getWidgets() : [];

  return widgets
    .map((widget) => {
      const rect = widget.getRectangle();
      const pageRef = widget.P();
      const pageIndex = pages.findIndex((page) => page.ref === pageRef);

      if (pageIndex < 0) {
        return null;
      }

      return {
        pageIndex,
        x: Number(rect.x || 0),
        y: Number(rect.y || 0),
        width: Number(rect.width || 0),
        height: Number(rect.height || 0),
      };
    })
    .filter(Boolean);
};

const drawPdfOverlay = (pdfDoc, overlay, textFont) => {
  if (!overlay || !overlay.text) {
    if (!["check", "fieldImage", "image"].includes(overlay?.kind)) {
      return;
    }
  }

  if (["fieldImage", "image"].includes(overlay.kind)) {
    return;
  }

  const page = pdfDoc.getPages()[overlay.pageIndex];

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

const drawFieldImageOverlay = async (pdfDoc, form, overlay) => {
  if (!overlay || !["fieldImage", "image"].includes(overlay.kind)) {
    return [];
  }

  const embeddedImage = await embedImage(pdfDoc, overlay);

  if (!embeddedImage) {
    return [];
  }

  const padding = Number(overlay.padding || 0);
  if (overlay.kind === "image") {
    const width = Number(overlay.width || 0);
    const height = Number(overlay.height || 0);

    if (!width || !height) {
      return [];
    }

    const targetWidth = width - padding * 2;
    const targetHeight = height - padding * 2;
    const scale = Math.min(
      targetWidth / embeddedImage.width,
      targetHeight / embeddedImage.height,
    );
    const drawWidth = embeddedImage.width * scale;
    const drawHeight = embeddedImage.height * scale;

    return [
      {
        pageIndex: Number(overlay.pageIndex || 0),
        image: embeddedImage,
        x: Number(overlay.x || 0) + padding + (targetWidth - drawWidth) / 2,
        y: Number(overlay.y || 0) + padding + (targetHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      },
    ];
  }

  if (!overlay.fieldName) {
    return [];
  }

  const rects = getFieldWidgetRects(pdfDoc, form, overlay.fieldName);
  const drawJobs = [];

  for (const rect of rects) {
    if (rect.width <= padding * 2 || rect.height <= padding * 2) {
      continue;
    }

    const targetWidth = rect.width - padding * 2;
    const targetHeight = rect.height - padding * 2;
    const scale = Math.min(
      targetWidth / embeddedImage.width,
      targetHeight / embeddedImage.height,
    );
    const drawWidth = embeddedImage.width * scale;
    const drawHeight = embeddedImage.height * scale;

    drawJobs.push({
      pageIndex: rect.pageIndex,
      image: embeddedImage,
      x: rect.x + padding + (targetWidth - drawWidth) / 2,
      y: rect.y + padding + (targetHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return drawJobs;
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
  if (value === undefined || value === null || String(value).trim() === "") {
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
      const isMissingDefaultAppearance = String(error.message || "").includes(
        "No /DA",
      );

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
      const isMissingDefaultAppearance = String(error.message || "").includes(
        "No /DA",
      );

      if (!isMissingDefaultAppearance) {
        throw error;
      }
    }

    if (textFont) {
      field.updateAppearances(textFont);
    }
  }
};

const fillPdfTemplate = async ({ templatePath, outputPath, payload }) => {
  if (!fs.existsSync(templatePath)) {
    const error = new Error("Account opening PDF template not found");
    error.code = "TEMPLATE_NOT_FOUND";
    throw error;
  }

  const pdfBytes = await fsp.readFile(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const fieldName of payload.clearFields || []) {
    clearPdfFieldValue(form, fieldName);
  }

  for (const [fieldName, value] of Object.entries(payload.fields || {})) {
    setPdfFieldValue(pdfDoc, form, fieldName, value, textFont);
  }

  for (const [fieldName, shouldCheck] of Object.entries(
    payload.checkboxes || {},
  )) {
    if (!shouldCheck) {
      continue;
    }

    setPdfFieldValue(pdfDoc, form, fieldName, "checked", textFont);
  }

  const fieldImageDrawJobs = [];
  for (const overlay of payload.overlays || []) {
    if (overlay?.kind === "fieldImage" || overlay?.kind === "image") {
      fieldImageDrawJobs.push(...(await drawFieldImageOverlay(pdfDoc, form, overlay)));
    }
  }

  normalizeAllTextFieldAppearances(form, textFont);
  form.flatten();

  for (const job of fieldImageDrawJobs) {
    const page = pdfDoc.getPages()[job.pageIndex];

    if (!page) {
      continue;
    }

    page.drawImage(job.image, {
      x: job.x,
      y: job.y,
      width: job.width,
      height: job.height,
    });
  }

  for (const overlay of payload.overlays || []) {
    if (overlay?.kind === "fieldImage" || overlay?.kind === "image") {
      continue;
    }

    drawPdfOverlay(pdfDoc, overlay, textFont);
  }

  const outputBytes = await pdfDoc.save();
  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await fsp.writeFile(outputPath, outputBytes);

  return {
    outputPath,
    pageCount: pdfDoc.getPageCount(),
  };
};

module.exports = {
  fillPdfTemplate,
};
