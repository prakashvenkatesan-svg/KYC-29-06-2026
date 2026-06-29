const pool = require("../config/db");
const {
  getCvlkraSourceByApplicationIdQuery,
  checkCvlkraApplicationIdUniqueIndexQuery,
  upsertCvlkraDataByApplicationIdQuery,
} = require("../queries/cvlkraExportQueries");

const createHttpError = (message, statusCode, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const normalizeOptionalString = (value) => {
  const normalized = String(value || "").trim();
  return normalized || "";
};

const exportApplicationToCvlkra = async (applicationId, options = {}) => {
  const client = await pool.connect();

  const overrides = {
    ...options,
    company_code:
      normalizeOptionalString(options.company_code) ||
      normalizeOptionalString(process.env.CVL_POSCODE),
    app_pos_code:
      normalizeOptionalString(options.app_pos_code) ||
      normalizeOptionalString(process.env.CVL_POSCODE),
    app_kra_code:
      normalizeOptionalString(options.app_kra_code) ||
      normalizeOptionalString(process.env.CVL_KRA_CODE) ||
      "CVLKRA",
  };

  try {
    await client.query("BEGIN");

    const applicationResult = await client.query(
      "SELECT id FROM public.kyc_applications WHERE id = $1 LIMIT 1",
      [applicationId],
    );

    if (applicationResult.rows.length === 0) {
      throw createHttpError("Application not found in public.kyc_applications", 404);
    }

    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'cvlkra_data'
      ) AS table_exists;
    `);

    if (!tableResult.rows[0]?.table_exists) {
      throw createHttpError(
        "public.cvlkra_data does not exist. Run server/sql/027_create_cvlkra_data.sql and server/sql/028_add_unique_cvlkra_data_application_id.sql before using CVLKRA export.",
        500,
      );
    }

    const uniqueIndexResult = await client.query(
      checkCvlkraApplicationIdUniqueIndexQuery,
    );

    if (!uniqueIndexResult.rows[0]?.has_unique_application_id) {
      throw createHttpError(
        "public.cvlkra_data.application_id is not backed by a unique constraint/index. Run server/sql/028_add_unique_cvlkra_data_application_id.sql before using CVLKRA export.",
        500,
      );
    }

    const sourceResult = await client.query(getCvlkraSourceByApplicationIdQuery, [
      applicationId,
      JSON.stringify(overrides),
    ]);
    const sourceRow = sourceResult.rows[0];

    if (!sourceRow) {
      throw createHttpError(
        "Source KYC data could not be assembled for the requested application_id",
        404,
      );
    }

    const mandatoryFields = [
      { key: "company_code", label: "company code" },
      { key: "batch_date", label: "batch date" },
      { key: "app_pos_code", label: "POS code" },
      { key: "app_type", label: "application type" },
      { key: "app_date", label: "application date" },
      { key: "app_pan_no", label: "PAN number" },
      { key: "app_pan_copy", label: "PAN copy flag" },
      { key: "app_exmt", label: "PAN exemption flag" },
      { key: "app_ipv_flag", label: "IPV flag" },
      { key: "app_ipv_date", label: "IPV date" },
      { key: "app_gen", label: "gender" },
      { key: "app_name", label: "applicant name" },
      { key: "app_dob_incorp", label: "date of birth" },
      { key: "app_nationality", label: "nationality code" },
      { key: "app_res_status", label: "residential status" },
      { key: "app_cor_add1", label: "correspondence address line 1" },
      { key: "app_cor_city", label: "correspondence city" },
      { key: "app_cor_pincd", label: "correspondence pincode" },
      { key: "app_cor_state", label: "correspondence state code" },
      { key: "app_cor_ctry", label: "correspondence country code" },
      { key: "app_mob_no", label: "mobile number" },
      { key: "app_email", label: "email" },
      { key: "app_per_add_flag", label: "permanent-address-same flag" },
      { key: "app_per_add1", label: "permanent address line 1" },
      { key: "app_per_city", label: "permanent city" },
      { key: "app_per_pincd", label: "permanent pincode" },
      { key: "app_per_state", label: "permanent state code" },
      { key: "app_per_ctry", label: "permanent country code" },
      { key: "app_kyc_mode", label: "KYC mode" },
      { key: "app_kra_code", label: "KRA code" },
    ];

    const missingFields = mandatoryFields
      .filter(({ key }) => !String(sourceRow[key] || "").trim())
      .map(({ label }) => label);

    if (missingFields.length > 0) {
      throw createHttpError("Mandatory CVLKRA export data is missing", 400, {
        application_id: applicationId,
        missing_fields: missingFields,
        hint:
          "Supply CVLKRA-only overrides in the POST body for unresolved coded fields such as app_income, app_occ, app_mar_status, app_doc_proof, app_cor_add_proof, app_per_add_proof, app_updtflg, or app_ver_no when your business team confirms the exact CVLKRA mapping.",
      });
    }

    const upsertResult = await client.query(upsertCvlkraDataByApplicationIdQuery, [
      applicationId,
      JSON.stringify(overrides),
    ]);
    const cvlkraRow = upsertResult.rows[0];

    if (!cvlkraRow) {
      throw createHttpError("CVLKRA upsert did not return a row", 500);
    }

    await client.query("COMMIT");

    return {
      id: Number(cvlkraRow.id),
      application_id: Number(cvlkraRow.application_id),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  exportApplicationToCvlkra,
};
