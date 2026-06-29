const pool = require("../config/db");
const { exportApplicationToNse } = require("./nseExportService");
const { exportApplicationToBse } = require("./bseExportService");
const { exportApplicationToNsdl } = require("./nsdlExportService");
const { exportApplicationToCdsl } = require("./cdslExportService");
const { exportApplicationToMf } = require("./mfExportService");
const { exportApplicationToCvlkra } = require("./cvlkraExportService");

const createHttpError = (message, statusCode, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
};

const EXPORT_TABLES = {
  nse_data: "nse_data",
  bse_data: "bse_data",
  nsdl_data: "nsdl_data",
  cdsl_data: "cdsl_data",
  mf_data: "mf_data",
  cvlkra_data: "cvlkra_data",
};

const pickDefinedValues = (source = {}, keys = []) =>
  Object.fromEntries(
    keys
      .filter((key) => Object.prototype.hasOwnProperty.call(source, key))
      .map((key) => [key, source[key]]),
  );

const getNsdlOverrides = (requestBody = {}) => {
  const scopedOverrides =
    requestBody.nsdl && typeof requestBody.nsdl === "object" ? requestBody.nsdl : {};

  return {
    ...pickDefinedValues(requestBody, ["sgn", "pan_verify_flag", "short_name"]),
    ...pickDefinedValues(scopedOverrides, ["sgn", "pan_verify_flag", "short_name"]),
  };
};

const getCdslOverrides = (requestBody = {}) => {
  const scopedOverrides =
    requestBody.cdsl && typeof requestBody.cdsl === "object" ? requestBody.cdsl : {};

  return {
    ...pickDefinedValues(requestBody, [
      "dpid",
      "operator_id",
      "product_number",
      "annual_income_code",
      "bo_category",
      "bo_settlement_planning_flag",
      "bo_sub_status",
      "bo_statement_cycle_code",
      "dividend_bank_acct_type",
      "dividend_bank_code",
      "dividend_bank_ccy",
      "pan_verification_flag",
      "signature_file_flag",
      "beneficiary_tax_deduction_status",
      "nomination_opt_out",
      "uid_verification_flag",
      "poa_type_flag",
      "bo_fee_type",
      "nationality_code",
      "bonafide_flag",
      "email_statement_flag",
      "annual_report_flag",
      "bsda_flag",
      "communication_preference",
    ]),
    ...pickDefinedValues(scopedOverrides, [
      "dpid",
      "operator_id",
      "product_number",
      "annual_income_code",
      "bo_category",
      "bo_settlement_planning_flag",
      "bo_sub_status",
      "bo_statement_cycle_code",
      "dividend_bank_acct_type",
      "dividend_bank_code",
      "dividend_bank_ccy",
      "pan_verification_flag",
      "signature_file_flag",
      "beneficiary_tax_deduction_status",
      "nomination_opt_out",
      "uid_verification_flag",
      "poa_type_flag",
      "bo_fee_type",
      "nationality_code",
      "bonafide_flag",
      "email_statement_flag",
      "annual_report_flag",
      "bsda_flag",
      "communication_preference",
    ]),
  };
};

const getMfOverrides = (requestBody = {}) => {
  const scopedOverrides =
    requestBody.mf && typeof requestBody.mf === "object" ? requestBody.mf : {};

  return {
    ...pickDefinedValues(requestBody, [
      "div_pay_mode",
      "communication_mode",
      "paperless_flag",
      "mobile_declaration_flag",
      "email_declaration_flag",
    ]),
    ...pickDefinedValues(scopedOverrides, [
      "div_pay_mode",
      "communication_mode",
      "paperless_flag",
      "mobile_declaration_flag",
      "email_declaration_flag",
    ]),
  };
};

const getCvlkraOverrides = (requestBody = {}) => {
  const scopedOverrides =
    requestBody.cvlkra && typeof requestBody.cvlkra === "object"
      ? requestBody.cvlkra
      : {};

  return {
    ...requestBody,
    ...scopedOverrides,
  };
};

const buildExportSummary = (exportResults = {}) => {
  const entries = Object.entries(exportResults);
  const succeeded = entries
    .filter(([, result]) => result?.success)
    .map(([key]) => key);
  const failed = entries
    .filter(([, result]) => result && result.success === false)
    .map(([key]) => key);

  return {
    total: entries.length,
    succeeded_count: succeeded.length,
    failed_count: failed.length,
    succeeded,
    failed,
    is_partial_failure: failed.length > 0,
  };
};

const fetchLatestExportRow = async (applicationId, tableName) => {
  const query = `
    SELECT row_to_json(export_row) AS data
    FROM (
      SELECT *
      FROM public.${tableName}
      WHERE application_id = $1
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      LIMIT 1
    ) AS export_row;
  `;

  const result = await pool.query(query, [applicationId]);
  return result.rows[0]?.data || null;
};

const fetchExportDetailsByApplicationId = async (applicationId) => {
  const applicationResult = await pool.query(
    "SELECT id FROM public.kyc_applications WHERE id = $1 LIMIT 1",
    [applicationId],
  );

  if (applicationResult.rows.length === 0) {
    throw createHttpError("Application not found in public.kyc_applications", 404);
  }

  const tableExistenceResult = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [Object.values(EXPORT_TABLES)],
  );

  const existingTables = new Set(
    tableExistenceResult.rows.map((row) => row.table_name),
  );

  const exportEntries = await Promise.all(
    Object.entries(EXPORT_TABLES).map(async ([responseKey, tableName]) => {
      if (!existingTables.has(tableName)) {
        return [responseKey, null];
      }

      const latestRow = await fetchLatestExportRow(applicationId, tableName);
      return [responseKey, latestRow];
    }),
  );

  const exportData = Object.fromEntries(exportEntries);

  return {
    application_id: Number(applicationId),
    nse_data: exportData.nse_data,
    bse_data: exportData.bse_data,
    nsdl_data: exportData.nsdl_data,
    cdsl_data: exportData.cdsl_data,
    mf_data: exportData.mf_data,
    cvlkra_data: exportData.cvlkra_data,
  };
};

const exportAndFetchDetailsByApplicationId = async (applicationId, requestBody = {}) => {
  const applicationResult = await pool.query(
    "SELECT id FROM public.kyc_applications WHERE id = $1 LIMIT 1",
    [applicationId],
  );

  if (applicationResult.rows.length === 0) {
    throw createHttpError("Application not found in public.kyc_applications", 404);
  }

  const jobs = [
    {
      key: "nse",
      run: () => exportApplicationToNse(applicationId),
    },
    {
      key: "bse",
      run: () => exportApplicationToBse(applicationId),
    },
    {
      key: "nsdl",
      run: () => exportApplicationToNsdl(applicationId, getNsdlOverrides(requestBody)),
    },
    {
      key: "cdsl",
      run: () => exportApplicationToCdsl(applicationId, getCdslOverrides(requestBody)),
    },
    {
      key: "mf",
      run: () => exportApplicationToMf(applicationId, getMfOverrides(requestBody)),
    },
    {
      key: "cvlkra",
      run: () => exportApplicationToCvlkra(applicationId, getCvlkraOverrides(requestBody)),
    },
  ];

  const export_results = {};

  for (const job of jobs) {
    try {
      const row = await job.run();
      export_results[job.key] = {
        success: true,
        application_id: Number(row.application_id),
        row_id: Number(row.id),
      };
    } catch (error) {
      export_results[job.key] = {
        success: false,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      };
    }
  }

  const exportDetails = await fetchExportDetailsByApplicationId(applicationId);
  const export_summary = buildExportSummary(export_results);

  return {
    ...exportDetails,
    export_results,
    export_summary,
  };
};

module.exports = {
  fetchExportDetailsByApplicationId,
  exportAndFetchDetailsByApplicationId,
};
