const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

const DEFAULT_TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "templates",
  "account_opening_form.pdf",
);

const resolveTemplatePath = () => {
  const configuredPath = process.argv[2];

  if (!configuredPath) {
    return DEFAULT_TEMPLATE_PATH;
  }

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(process.cwd(), configuredPath);
};

const main = async () => {
  const templatePath = resolveTemplatePath();

  if (!fs.existsSync(templatePath)) {
    throw new Error(`PDF template not found: ${templatePath}`);
  }

  const pdfBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();

  const records = [];

  for (const field of form.getFields()) {
    const widgets = field.acroField.getWidgets
      ? field.acroField.getWidgets()
      : [];

    if (widgets.length === 0) {
      records.push({
        page: "unknown",
        name: field.getName(),
        x: "",
        y: "",
        width: "",
        height: "",
      });
      continue;
    }

    for (const widget of widgets) {
      const rect = widget.getRectangle();
      const pageRef = widget.P();
      const pageIndex = pages.findIndex((page) => page.ref === pageRef);

      records.push({
        page: pageIndex >= 0 ? pageIndex + 1 : "unknown",
        name: field.getName(),
        x: Number(rect.x).toFixed(2),
        y: Number(rect.y).toFixed(2),
        width: Number(rect.width).toFixed(2),
        height: Number(rect.height).toFixed(2),
      });
    }
  }

  records
    .sort((left, right) => {
      if (left.page === right.page) {
        return String(left.name).localeCompare(String(right.name));
      }

      return Number(left.page) - Number(right.page);
    })
    .forEach((record) => {
      console.log(
        [
          `page=${record.page}`,
          `name=${record.name}`,
          `x=${record.x}`,
          `y=${record.y}`,
          `w=${record.width}`,
          `h=${record.height}`,
        ].join(" | "),
      );
    });
};

main().catch((error) => {
  console.error("Failed to inspect PDF fields:", error.message);
  process.exit(1);
});
