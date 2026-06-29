const pool = require("../config/db");
const {
  getBseSourceByApplicationIdQuery,
  checkBseApplicationIdUniqueIndexQuery,
  upsertBseDataByApplicationIdQuery,
} = require("../queries/bseExportQueries");

const createHttpError = (message, statusCode, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const exportApplicationToBse = async (applicationId) => {
  const client = await pool.connect();

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
          AND table_name = 'bse_data'
      ) AS table_exists;
    `);

    if (!tableResult.rows[0]?.table_exists) {
      throw createHttpError(
        "public.bse_data does not exist. Run server/sql/010_create_bse_data.sql before using BSE export.",
        500,
      );
    }

    const uniqueIndexResult = await client.query(
      checkBseApplicationIdUniqueIndexQuery,
    );

    if (!uniqueIndexResult.rows[0]?.has_unique_application_id) {
      throw createHttpError(
        "public.bse_data.application_id is not backed by a unique constraint/index. Run server/sql/010_create_bse_data.sql before using BSE export.",
        500,
      );
    }

    const sourceResult = await client.query(getBseSourceByApplicationIdQuery, [
      applicationId,
    ]);
    const sourceRow = sourceResult.rows[0];

    if (!sourceRow) {
      throw createHttpError(
        "Source KYC data could not be assembled for the requested application_id",
        404,
      );
    }

    const mandatoryFields = [
      { key: "category", label: "BSE category" },
      { key: "client_code", label: "client code" },
      { key: "pan_no", label: "PAN number" },
      { key: "address1", label: "address line 1" },
      { key: "country", label: "country" },
      { key: "state", label: "state" },
      { key: "city", label: "city" },
      { key: "pincode", label: "pincode" },
      { key: "email", label: "email" },
      { key: "mobile_number", label: "mobile number" },
      { key: "bank_name1", label: "bank name" },
      { key: "account_no1", label: "bank account number" },
      { key: "bank_branch_ifsc_code1", label: "bank IFSC" },
      { key: "client_name", label: "client name" },
      { key: "date_of_birth", label: "date of birth" },
      { key: "beneficial_own_acnt_no1", label: "BOID / beneficial owner account number" },
      { key: "first_name", label: "first name" },
      { key: "depository_name1", label: "depository name" },
    ];

    const missingFields = mandatoryFields
      .filter(({ key }) => !String(sourceRow[key] || "").trim())
      .map(({ label }) => label);

    if (missingFields.length > 0) {
      throw createHttpError(
        "Mandatory BSE export data is missing",
        400,
        {
          application_id: applicationId,
          missing_fields: missingFields,
          hint: "Review server/docs/bse-export-mapping.md for BSE-only TODO fields and source mapping rules.",
        },
      );
    }

    const upsertResult = await client.query(upsertBseDataByApplicationIdQuery, [
      applicationId,
    ]);
    const bseRow = upsertResult.rows[0];

    if (!bseRow) {
      throw createHttpError("BSE upsert did not return a row", 500);
    }

    await client.query("COMMIT");

    return {
      id: Number(bseRow.id),
      application_id: Number(bseRow.application_id),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  exportApplicationToBse,
};
