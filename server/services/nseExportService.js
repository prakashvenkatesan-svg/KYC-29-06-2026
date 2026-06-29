const pool = require("../config/db");
const {
  getNseSourceByApplicationIdQuery,
  checkNseApplicationIdUniqueIndexQuery,
  upsertNseDataByApplicationIdQuery,
} = require("../queries/nseExportQueries");

const createHttpError = (message, statusCode, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const normalizeString = (value) => {
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
};

const exportApplicationToNse = async (applicationId) => {
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

    const uniqueIndexResult = await client.query(
      checkNseApplicationIdUniqueIndexQuery,
    );

    if (!uniqueIndexResult.rows[0]?.has_unique_application_id) {
      throw createHttpError(
        "public.nse_data.application_id is not backed by a unique constraint/index. Run server/sql/007_add_unique_nse_data_application_id.sql before using NSE export.",
        500,
      );
    }

    const sourceResult = await client.query(getNseSourceByApplicationIdQuery, [
      applicationId,
    ]);
    const sourceRow = sourceResult.rows[0];

    if (!sourceRow) {
      throw createHttpError(
        "Source KYC data could not be assembled for the requested application_id",
        404,
      );
    }

    const upsertResult = await client.query(upsertNseDataByApplicationIdQuery, [
      applicationId,
    ]);
    const nseRow = upsertResult.rows[0];

    if (!nseRow) {
      throw createHttpError("NSE upsert did not return a row", 500);
    }

    await client.query("COMMIT");

    return {
      id: Number(nseRow.id),
      application_id: Number(nseRow.application_id),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  exportApplicationToNse,
};
