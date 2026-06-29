import { PDFDocument } from "pdf-lib";
import fs from "fs";

const run = async () => {
  const pdfBytes = fs.readFileSync(
    "C:/Users/Admin/OneDrive/Desktop/ekyc-project/server/templates/account_opening_form.pdf",
  );
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const fields = form.getFields();

  fields.forEach((field) => {
    console.log("Field Name:", field.getName());
  });
};

run();
