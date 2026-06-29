const pool = require("../config/db");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const pdfFieldConfig = require("../config/pdfFieldConfig");

const generatePdf = async (req, res) => {
  try {
    const { application_id } = req.params;
    console.log("APPLICATION PARAM:", application_id);

    // =====================================================
    // FETCH USER DATA
    // =====================================================

    const result = await pool.query(
      `
      SELECT
ka.id,
ka.client_code,
ka.current_status,
ka.kyc_status,

cd.mobile_number,
cd.email,
cd.mobile_verified,
cd.email_verified,
cd.terms_accepted,

iv.pan_number,
iv.dob,
iv.full_name,
iv.category,
iv.aadhaar_seeding_status,
iv.provider,
iv.provider_ref,
iv.kra_email,
iv.gender,
iv.address_line_1,
iv.address_line_2,
iv.state,
iv.pincode,
iv.provider_dob,

bd.account_number,
bd.confirm_account_number,
bd.ifsc_code,
bd.account_type,

pd.father_name,
pd.mother_name,
pd.gender AS personal_gender,
pd.marital_status,
pd.education,
pd.annual_income,
pd.trading_experience,
pd.politically_exposed,
pd.occupation,
pd.citizen_of_india,
pd.net_worth,
pd.running_account_authorization,
pd.country_of_birth,
pd.ddpi,
pd.income_declaration_accepted,
pd.rights_accepted,

nd.nominee_name,
nd.dob AS nominee_dob,
nd.mobile AS nominee_mobile,
nd.email AS nominee_email,
nd.relation,
nd.nominee_proof_type,
nd.aadhaar,
nd.pan AS nominee_pan,
nd.allocation_percentage,

pmd.txnid,
pmd.amount,
pmd.payment_method,
pmd.payment_status,
pmd.provider AS payment_provider,
pmd.firstname,
pmd.email AS payment_email,
pmd.phone

FROM kyc_applications ka

LEFT JOIN contact_details cd
ON ka.id = cd.application_id

LEFT JOIN identity_verifications iv
ON ka.id = iv.application_id

LEFT JOIN bank_details bd
ON ka.id = bd.application_id

LEFT JOIN personal_details pd
ON ka.id = pd.application_id

LEFT JOIN nominee_details nd
ON ka.id = nd.application_id

LEFT JOIN payments_details pmd
ON ka.id = pmd.application_id

WHERE ka.id = $1
      `,
      [application_id],
    );

    // =====================================================
    // NO DATA
    // =====================================================

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found",
      });
    }
    console.log("QUERY RESULT:", result.rows);
    console.log("ROWS COUNT:", result.rows.length);

    const userData = result.rows[0];

    // =====================================================
    // LOAD PDF
    // =====================================================

    const pdfPath = path.join(
      __dirname,
      "../templates/account_opening_form.pdf",
    );

    const existingPdfBytes = fs.readFileSync(pdfPath);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const form = pdfDoc.getForm();

    // =====================================================
    // PDF FIELD CONFIG
    // =====================================================

    Object.keys(pdfFieldConfig).forEach((key) => {
      try {
        const field = pdfFieldConfig[key];

        // ==========================================
        // TEXT FIELDS
        // ==========================================

        if (field.type === "text") {
          const value = userData[field.dbColumn];

          if (value !== undefined && value !== null) {
            form.getTextField(field.pdfField).setText(String(value));
          }
        }

        // ==========================================
        // RADIO FIELDS
        // ==========================================

        if (field.type === "radio") {
          const value = userData[field.dbColumn];

          if (value) {
            form.getRadioGroup(field.pdfField).select(String(value));
          }
        }

        // ==========================================
        // CHECKBOX FIELDS
        // ==========================================

        if (field.type === "checkbox") {
          // DEFAULT VALUE

          if (field.defaultValue === true) {
            form.getCheckBox(field.pdfField).check();
          }

          // DATABASE VALUE

          if (field.dbColumn) {
            const value = userData[field.dbColumn];

            if (value === true || value === "YES" || value === "yes") {
              form.getCheckBox(field.pdfField).check();
            }
          }
        }
      } catch (error) {
        console.log(`Error filling field: ${key}`, error.message);
      }
    });

    // =====================================================
    // SAVE PDF
    // =====================================================

    const pdfBytes = await pdfDoc.save();

    const isLambda = !!process.env.AWS_EXECUTION_ENV;
    const outputDir = isLambda
      ? "/tmp/generated"
      : path.join(__dirname, "../generated");

    // CREATE FOLDER IF NOT EXISTS

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    const outputPath = path.join(
      outputDir,
      `application_${application_id}.pdf`,
    );

    fs.writeFileSync(outputPath, pdfBytes);

    console.log("PDF GENERATED:", outputPath);

    // =====================================================
    // DOWNLOAD PDF
    // =====================================================

    return res.download(outputPath);
  } catch (error) {
    console.log("PDF ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "PDF generation failed",
      error: error.message,
    });
  }
};

module.exports = {
  generatePdf,
};
