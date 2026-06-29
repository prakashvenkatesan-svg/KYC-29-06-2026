const pool = require("../config/db");
const {
  getNsdlSourceByApplicationIdQuery,
  checkNsdlApplicationIdUniqueIndexQuery,
  upsertNsdlDataByApplicationIdQuery,
} = require("../queries/nsdlExportQueries");

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

const exportApplicationToNsdl = async (applicationId, options = {}) => {
  const client = await pool.connect();

  const dpid = normalizeOptionalString(process.env.NSDL_DPID);
  const channelId = normalizeOptionalString(process.env.NSDL_CHANNEL_ID);
  const signatureHex = normalizeOptionalString(options.sgn);
  const panVerifyFlag = normalizeOptionalString(
    options.pan_verify_flag || process.env.NSDL_PAN_VERIFY_FLAG,
  );
  const shortName = normalizeOptionalString(options.short_name);

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
          AND table_name = 'nsdl_data'
      ) AS table_exists;
    `);

    if (!tableResult.rows[0]?.table_exists) {
      throw createHttpError(
        "public.nsdl_data does not exist. Run server/sql/012_create_nsdl_data.sql and server/sql/013_add_unique_nsdl_data_application_id.sql before using NSDL export.",
        500,
      );
    }

    const uniqueIndexResult = await client.query(
      checkNsdlApplicationIdUniqueIndexQuery,
    );

    if (!uniqueIndexResult.rows[0]?.has_unique_application_id) {
      throw createHttpError(
        "public.nsdl_data.application_id is not backed by a unique constraint/index. Run server/sql/013_add_unique_nsdl_data_application_id.sql before using NSDL export.",
        500,
      );
    }

    const sourceResult = await client.query(getNsdlSourceByApplicationIdQuery, [
      applicationId,
      dpid,
      channelId,
      signatureHex,
      panVerifyFlag,
      shortName,
    ]);
    const sourceRow = sourceResult.rows[0];

    if (!sourceRow) {
      throw createHttpError(
        "Source KYC data could not be assembled for the requested application_id",
        404,
      );
    }

    const mandatoryFields = [
      { key: "cntrlsctiesdpstryptcpt", label: "NSDL DPID" },
      { key: "chnlid", label: "NSDL channel id" },
      { key: "sgn", label: "client signature hex" },
      { key: "sgntrsz", label: "signature size" },
      { key: "prdnb", label: "product number / client type" },
      { key: "bnfcrysubtp", label: "beneficiary subtype" },
      { key: "bnfcryshrtnm", label: "beneficiary short name" },
      { key: "bnfcryacctctgy", label: "beneficiary account category" },
      { key: "ocptn", label: "occupation code" },
      { key: "adrprefflg", label: "address preference flag" },
      { key: "corad_adr1", label: "correspondence address line 1" },
      { key: "corad_adr2", label: "correspondence address line 2" },
      { key: "corad_adr3", label: "correspondence address line 3" },
      { key: "corad_adr4orcity", label: "correspondence city" },
      { key: "corad_ctry", label: "correspondence country" },
      { key: "corad_pstcd", label: "correspondence pincode" },
      { key: "corad_ctrysubdvsncd", label: "correspondence state code" },
      { key: "grssanlincmrg", label: "gross annual income range" },
      { key: "bnfcrytaxddctnsts", label: "beneficiary tax deduction status" },
      { key: "bnfcrybkacctnb", label: "beneficiary bank account number" },
      { key: "bkaccttp", label: "bank account type" },
      { key: "bnfcrybknm", label: "beneficiary bank name" },
      { key: "inifsc", label: "bank IFSC" },
      { key: "holder_purpse", label: "holder purpose" },
      { key: "holder_frstnm", label: "holder full name" },
      { key: "holder_birthdt", label: "holder birth date" },
      { key: "holder_gndr", label: "holder gender" },
      { key: "holder_pan", label: "holder PAN" },
      { key: "holder_panvrfyflg", label: "holder PAN verification flag" },
      { key: "holder_smsfclty", label: "SMS facility flag" },
      { key: "holder_prmryisdcd", label: "mobile ISD code" },
      { key: "holder_mobnb", label: "holder mobile number" },
      { key: "holder_fmlyflgformobnbof", label: "family flag for mobile" },
      { key: "holder_emailadr", label: "holder email" },
      { key: "holder_fmlyflgforemailadr", label: "family flag for email" },
    ];

    const missingFields = mandatoryFields
      .filter(({ key }) => !String(sourceRow[key] || "").trim())
      .map(({ label }) => label);

    if (missingFields.length > 0) {
      throw createHttpError("Mandatory NSDL export data is missing", 400, {
        application_id: applicationId,
        missing_fields: missingFields,
        hint:
          "Provide NSDL-only overrides such as sgn, pan_verify_flag, or short_name in the POST body when they are not stored in current KYC tables.",
      });
    }

    const upsertResult = await client.query(upsertNsdlDataByApplicationIdQuery, [
      applicationId,
      dpid,
      channelId,
      signatureHex,
      panVerifyFlag,
      shortName,
    ]);
    const nsdlRow = upsertResult.rows[0];

    if (!nsdlRow) {
      throw createHttpError("NSDL upsert did not return a row", 500);
    }

    await client.query("COMMIT");

    return {
      id: Number(nsdlRow.id),
      application_id: Number(nsdlRow.application_id),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  exportApplicationToNsdl,
};
