const pool = require("../config/db");
const {
  getExportDetailsByApplicationIdQuery,
} = require("../queries/exportDetailsQueries");
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

const fetchExportDetailsByApplicationId = async (applicationId) => {
  const result = await pool.query(getExportDetailsByApplicationIdQuery, [
    applicationId,
  ]);
  const row = result.rows[0];

  if (!row) {
    throw createHttpError("Application not found in public.kyc_applications", 404);
  }

  return {
    application_id: Number(row.application_id),
    nse_data: row.nse_data || null,
    bse_data: row.bse_data || null,
    nsdl_data: row.nsdl_data || null,
    cdsl_data: row.cdsl_data || null,
    mf_data: row.mf_data || null,
    cvlkra_data: row.cvlkra_data || null,
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
      run: () => exportApplicationToNsdl(applicationId, requestBody.nsdl || {}),
    },
    {
      key: "cdsl",
      run: () => exportApplicationToCdsl(applicationId, requestBody.cdsl || {}),
    },
    {
      key: "mf",
      run: () => exportApplicationToMf(applicationId, requestBody.mf || {}),
    },
    {
      key: "cvlkra",
      run: () =>
        exportApplicationToCvlkra(applicationId, requestBody.cvlkra || requestBody),
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

  return {
    ...exportDetails,
    export_results,
  };
};

module.exports = {
  fetchExportDetailsByApplicationId,
  exportAndFetchDetailsByApplicationId,
};
