const masterPool = require("../config/masterDb");

const DEFAULT_COUNTRY_CODE = "101";
const DISTRICT_FALLBACK_SEPARATOR = ",";
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

const CVLKRA_STATE_CODE_TO_NAME = {
  "001": "JAMMU AND KASHMIR",
  "002": "HIMACHAL PRADESH",
  "003": "PUNJAB",
  "004": "CHANDIGARH",
  "005": "UTTARAKHAND",
  "006": "HARYANA",
  "007": "DELHI",
  "008": "RAJASTHAN",
  "009": "UTTAR PRADESH",
  "010": "BIHAR",
  "011": "SIKKIM",
  "012": "ARUNACHAL PRADESH",
  "013": "NAGALAND",
  "014": "MANIPUR",
  "015": "MIZORAM",
  "016": "TRIPURA",
  "017": "MEGHALAYA",
  "018": "ASSAM",
  "019": "WEST BENGAL",
  "020": "JHARKHAND",
  "021": "ODISHA",
  "022": "CHHATTISGARH",
  "023": "MADHYA PRADESH",
  "024": "GUJARAT",
  "025": "DAMAN AND DIU",
  "026": "DADRA AND NAGAR HAVELI AND DAMAN AND DIU",
  "027": "MAHARASHTRA",
  "029": "KARNATAKA",
  "030": "GOA",
  "031": "LAKSHADWEEP",
  "032": "KERALA",
  "033": "TAMIL NADU",
  "034": "PUDUCHERRY",
  "035": "ANDAMAN AND NICOBAR ISLANDS",
  "036": "TELANGANA",
  "037": "ANDHRA PRADESH",
  "038": "LADAKH",
};

const normalizeOptionalString = (value) => String(value || "").trim();

const normalizeStateName = (value) =>
  normalizeOptionalString(value).replace(/\s+/g, " ").toUpperCase();

const formatStateDisplayName = (value) =>
  normalizeOptionalString(value)
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const resolveStateName = ({ stateCode = "", stateName = "" } = {}) => {
  const normalizedStateName = normalizeStateName(stateName);

  if (normalizedStateName) {
    return normalizedStateName;
  }

  const rawStateCode = normalizeOptionalString(stateCode);
  const normalizedStateCode = rawStateCode ? rawStateCode.padStart(3, "0") : "";
  return CVLKRA_STATE_CODE_TO_NAME[normalizedStateCode] || "";
};

const parseDistrictFallbackEntries = (rawValue = "") =>
  String(rawValue || "")
    .split(DISTRICT_FALLBACK_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean);

const getDistrictFallbackMap = () =>
  parseDistrictFallbackEntries(
    process.env.DISTRICT_FALLBACKS || process.env.PDF_DISTRICT_FALLBACKS || "",
  ).reduce((accumulator, entry) => {
    const [rawKey, ...districtParts] = entry.split(":");
    const lookupKey = normalizeStateName(rawKey).replace(/\|/g, ":");
    const district = normalizeOptionalString(districtParts.join(":"));

    if (lookupKey && district) {
      accumulator[lookupKey] = district;
    }

    return accumulator;
  }, {});

const parseConfiguredQualifiedName = (rawValue = "") => {
  const normalized = normalizeOptionalString(rawValue);

  if (!normalized) {
    return null;
  }

  const [schemaName = "public", tableName = ""] = normalized.includes(".")
    ? normalized.split(".", 2)
    : ["public", normalized];

  if (!IDENTIFIER_PATTERN.test(schemaName) || !IDENTIFIER_PATTERN.test(tableName)) {
    return null;
  }

  return {
    schemaName,
    tableName,
  };
};

const quoteIdentifier = (identifier) => {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(`Unsafe SQL identifier configured: ${identifier}`);
  }

  return `"${identifier}"`;
};

const getDistrictMasterConfig = () => {
  const qualifiedTableName = parseConfiguredQualifiedName(
    process.env.DISTRICT_MASTER_TABLE || process.env.PDF_DISTRICT_MASTER_TABLE || "",
  );

  if (!qualifiedTableName) {
    return null;
  }

  const districtColumn = normalizeOptionalString(
    process.env.DISTRICT_MASTER_DISTRICT_COLUMN || "district",
  );
  const pincodeColumn = normalizeOptionalString(
    process.env.DISTRICT_MASTER_PINCODE_COLUMN || "pincode",
  );
  const cityColumn = normalizeOptionalString(
    process.env.DISTRICT_MASTER_CITY_COLUMN || "city",
  );
  const stateNameColumn = normalizeOptionalString(
    process.env.DISTRICT_MASTER_STATE_NAME_COLUMN || "state_name",
  );
  const stateCodeColumn = normalizeOptionalString(
    process.env.DISTRICT_MASTER_STATE_CODE_COLUMN || "state_code",
  );

  const configuredColumns = [
    districtColumn,
    pincodeColumn,
    cityColumn,
    stateNameColumn,
    stateCodeColumn,
  ].filter(Boolean);

  if (!configuredColumns.every((identifier) => IDENTIFIER_PATTERN.test(identifier))) {
    return null;
  }

  return {
    ...qualifiedTableName,
    districtColumn,
    pincodeColumn,
    cityColumn,
    stateNameColumn,
    stateCodeColumn,
  };
};

const buildLookupKeys = ({ pincode = "", city = "", stateCode = "", stateName = "" } = {}) => {
  const normalizedPincode = normalizeOptionalString(pincode);
  const normalizedCity = normalizeStateName(city);
  const normalizedStateName = resolveStateName({ stateCode, stateName });

  return [
    normalizedPincode && normalizedStateName
      ? `${normalizedPincode}:${normalizedStateName}`
      : "",
    normalizedPincode,
    normalizedCity && normalizedStateName
      ? `${normalizedCity}:${normalizedStateName}`
      : "",
  ].filter(Boolean);
};

const resolveDistrictBase = ({
  district = "",
  countryCode = DEFAULT_COUNTRY_CODE,
} = {}) => {
  const normalizedDistrict = normalizeOptionalString(district);

  if (normalizedDistrict) {
    return {
      district: normalizedDistrict,
      source: "input",
    };
  }

  if (
    normalizeOptionalString(countryCode) &&
    normalizeOptionalString(countryCode) !== DEFAULT_COUNTRY_CODE
  ) {
    return {
      district: "",
      source: "unsupported_country",
    };
  }

  return null;
};

const resolveDistrictFromFallbackMap = ({
  pincode = "",
  city = "",
  stateCode = "",
  stateName = "",
} = {}) => {
  const districtFallbackMap = getDistrictFallbackMap();
  const lookupKeys = buildLookupKeys({ pincode, city, stateCode, stateName });

  for (const lookupKey of lookupKeys) {
    const mappedDistrict = districtFallbackMap[lookupKey];

    if (mappedDistrict) {
      return {
        district: mappedDistrict,
        source: "fallback_map",
      };
    }
  }

  return {
    district: "",
    source: "unresolved",
  };
};

const resolveDistrictFromMaster = async ({
  pincode = "",
  city = "",
  stateCode = "",
  stateName = "",
} = {}) => {
  const config = getDistrictMasterConfig();
  const normalizedPincode = normalizeOptionalString(pincode);
  const normalizedCity = normalizeStateName(city);
  const normalizedStateName = resolveStateName({ stateCode, stateName });
  const rawStateCode = normalizeOptionalString(stateCode);
  const normalizedStateCode = rawStateCode ? rawStateCode.padStart(3, "0") : "";

  if (!config || !normalizedPincode) {
    return {
      district: "",
      source: config ? "master_missing_lookup_keys" : "master_unconfigured",
    };
  }

  const values = [normalizedPincode];
  const whereClauses = [
    `NULLIF(BTRIM(${quoteIdentifier(config.pincodeColumn)}::text), '') = $1`,
  ];
  const orderClauses = [];

  if (config.cityColumn && normalizedCity) {
    values.push(normalizedCity);
    orderClauses.push(
      `CASE WHEN UPPER(NULLIF(BTRIM(${quoteIdentifier(config.cityColumn)}::text), '')) = $${values.length} THEN 0 ELSE 1 END`,
    );
  }

  if (config.stateNameColumn && normalizedStateName) {
    values.push(normalizedStateName);
    whereClauses.push(
      `UPPER(NULLIF(BTRIM(${quoteIdentifier(config.stateNameColumn)}::text), '')) = $${values.length}`,
    );
  } else if (config.stateCodeColumn && normalizedStateCode) {
    values.push(normalizedStateCode);
    whereClauses.push(
      `LPAD(NULLIF(BTRIM(${quoteIdentifier(config.stateCodeColumn)}::text), ''), 3, '0') = $${values.length}`,
    );
  }

  const query = `
    SELECT
      NULLIF(BTRIM(${quoteIdentifier(config.districtColumn)}::text), '') AS district
    FROM ${quoteIdentifier(config.schemaName)}.${quoteIdentifier(config.tableName)}
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY ${orderClauses.length > 0 ? `${orderClauses.join(", ")}, ` : ""}${quoteIdentifier(config.districtColumn)} ASC
    LIMIT 1
  `;

  try {
    const result = await masterPool.query(query, values);
    const district = normalizeOptionalString(result.rows[0]?.district);

    if (!district) {
      return {
        district: "",
        source: "master_unresolved",
      };
    }

    return {
      district,
      source: "master_table",
    };
  } catch (error) {
    console.error("DISTRICT MASTER LOOKUP ERROR:", error.message);

    return {
      district: "",
      source: "master_error",
    };
  }
};

const resolveDistrict = ({
  district = "",
  pincode = "",
  city = "",
  stateCode = "",
  stateName = "",
  countryCode = DEFAULT_COUNTRY_CODE,
} = {}) => {
  const baseResolution = resolveDistrictBase({
    district,
    countryCode,
  });

  if (baseResolution) {
    return baseResolution;
  }

  return resolveDistrictFromFallbackMap({
    pincode,
    city,
    stateCode,
    stateName,
  });
};

const resolveDistrictAsync = async ({
  district = "",
  pincode = "",
  city = "",
  stateCode = "",
  stateName = "",
  countryCode = DEFAULT_COUNTRY_CODE,
} = {}) => {
  const baseResolution = resolveDistrictBase({
    district,
    countryCode,
  });

  if (baseResolution) {
    return baseResolution;
  }

  const masterResolution = await resolveDistrictFromMaster({
    pincode,
    city,
    stateCode,
    stateName,
  });

  if (masterResolution.district) {
    return masterResolution;
  }

  return resolveDistrictFromFallbackMap({
    pincode,
    city,
    stateCode,
    stateName,
  });
};

module.exports = {
  formatStateDisplayName,
  resolveDistrict,
  resolveDistrictAsync,
  resolveStateName,
};
