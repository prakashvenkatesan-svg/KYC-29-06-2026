const pool = require("../config/db");
const fs = require("fs/promises");
const path = require("path");
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

let signatureUploadColumnsCache = null;

const getSignatureUploadColumns = async (client) => {
  if (signatureUploadColumnsCache) {
    return signatureUploadColumnsCache;
  }

  const result = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'signature_uploads'
    `,
  );

  signatureUploadColumnsCache = new Set(
    result.rows.map((row) => row.column_name),
  );

  return signatureUploadColumnsCache;
};

const buildSignatureSelectQuery = (columns) => {
  const selectFields = ["application_id"];

  if (columns.has("file_path")) {
    selectFields.push("file_path");
  }

  if (columns.has("signature_file_path")) {
    selectFields.push("signature_file_path");
  }

  if (columns.has("signature_file")) {
    selectFields.push("signature_file");
  }

  if (columns.has("updated_at")) {
    selectFields.push("updated_at");
  }

  if (columns.has("created_at")) {
    selectFields.push("created_at");
  }

  return `
    SELECT ${selectFields.join(", ")}
    FROM public.signature_uploads
    WHERE application_id = $1
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    LIMIT 1
  `;
};

const ensureHexPrefix = (hexValue) => {
  const normalized = normalizeOptionalString(hexValue);

  if (!normalized) {
    return "";
  }

  return normalized.startsWith("0x") ? normalized : `0x${normalized}`;
};

const toHexFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return "";
  }

  return ensureHexPrefix(buffer.toString("hex"));
};

const resolveSignatureAbsolutePath = (signaturePath) => {
  const normalizedPath = normalizeOptionalString(signaturePath);

  if (!normalizedPath) {
    return [];
  }

  if (path.isAbsolute(normalizedPath)) {
    return [normalizedPath];
  }

  const normalizedRelativePath = normalizedPath.replace(/^\//, "");
  const candidatePaths = new Set([
    path.resolve(
      __dirname,
      "..",
      normalizedRelativePath,
    ),
  ]);

  if (normalizedRelativePath.includes("uploads/signatures/")) {
    candidatePaths.add(
      path.resolve(
        __dirname,
        "..",
        normalizedRelativePath.replace("uploads/signatures/", "uploads/signature/"),
      ),
    );
  }

  if (normalizedRelativePath.includes("uploads/signature/")) {
    candidatePaths.add(
      path.resolve(
        __dirname,
        "..",
        normalizedRelativePath.replace("uploads/signature/", "uploads/signatures/"),
      ),
    );
  }

  return [...candidatePaths];
};

const loadSignatureHexFromFilePath = async (signaturePath) => {
  const candidatePaths = resolveSignatureAbsolutePath(signaturePath);

  for (const candidatePath of candidatePaths) {
    try {
      const fileBuffer = await fs.readFile(candidatePath);
      return toHexFromBuffer(fileBuffer);
    } catch (error) {
      // Try the next compatible storage path.
    }
  }

  return "";
};

const loadSignatureHexFromStorage = async (client, applicationId) => {
  const columns = await getSignatureUploadColumns(client);

  if (columns.size === 0) {
    return "";
  }

  const result = await client.query(buildSignatureSelectQuery(columns), [
    applicationId,
  ]);
  const signatureRow = result.rows[0];

  if (!signatureRow) {
    return "";
  }

  const signatureBlobHex = toHexFromBuffer(signatureRow.signature_file);

  if (signatureBlobHex) {
    return signatureBlobHex;
  }

  const storedPath =
    normalizeOptionalString(signatureRow.signature_file_path) ||
    normalizeOptionalString(signatureRow.file_path);

  if (!storedPath) {
    return "";
  }

  return loadSignatureHexFromFilePath(storedPath);
};

const exportApplicationToNsdl = async (applicationId, options = {}) => {
  const client = await pool.connect();

  const dpid = normalizeOptionalString(process.env.NSDL_DPID);
  const channelId = normalizeOptionalString(process.env.NSDL_CHANNEL_ID);
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

    const signatureHex =
      normalizeOptionalString(options.sgn) ||
      (await loadSignatureHexFromStorage(client, applicationId));

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
