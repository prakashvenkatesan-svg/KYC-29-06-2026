const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const quoteIdentifier = (identifier, label) => {
  const normalized = String(identifier || "").trim();

  if (!IDENTIFIER_REGEX.test(normalized)) {
    throw new Error(`Invalid ${label} identifier: ${normalized || "empty"}`);
  }

  return `"${normalized}"`;
};

const buildMasterBoidQueryConfig = ({
  tableName,
  valueColumn,
  statusColumn,
  assignedAtColumn,
  applicationIdColumn,
}) => ({
  quotedTableName: quoteIdentifier(tableName, "MASTER_BOID_TABLE"),
  quotedValueColumn: quoteIdentifier(
    valueColumn,
    "MASTER_BOID_VALUE_COLUMN",
  ),
  quotedStatusColumn: quoteIdentifier(
    statusColumn,
    "MASTER_BOID_STATUS_COLUMN",
  ),
  quotedAssignedAtColumn: quoteIdentifier(
    assignedAtColumn,
    "MASTER_BOID_ASSIGNED_AT_COLUMN",
  ),
  quotedApplicationIdColumn: quoteIdentifier(
    applicationIdColumn,
    "MASTER_BOID_APPLICATION_ID_COLUMN",
  ),
});

const getApplicationBoidQuery = `
  SELECT boid
  FROM public.kyc_applications
  WHERE id = $1
  LIMIT 1
`;

const getAssignBoidToApplicationQuery = `
  UPDATE public.kyc_applications
  SET boid = $1,
      updated_at = NOW()
  WHERE id = $2
    AND (boid IS NULL OR BTRIM(boid) = '')
  RETURNING boid
`;

const getSelectNextAvailableBoidQuery = (config) => `
  SELECT
    ${config.quotedValueColumn} AS boid
  FROM ${config.quotedTableName}
  WHERE UPPER(COALESCE(${config.quotedStatusColumn}, '')) = $1
  ORDER BY ${config.quotedValueColumn} ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
`;

const getMarkBoidAssignedQuery = (config) => `
  UPDATE ${config.quotedTableName}
  SET ${config.quotedStatusColumn} = $1,
      ${config.quotedAssignedAtColumn} = NOW(),
      ${config.quotedApplicationIdColumn} = $2
  WHERE ${config.quotedValueColumn} = $3
    AND UPPER(COALESCE(${config.quotedStatusColumn}, '')) = $4
`;

const getReleaseAllocatedBoidQuery = (config) => `
  UPDATE ${config.quotedTableName}
  SET ${config.quotedStatusColumn} = $1,
      ${config.quotedAssignedAtColumn} = NULL,
      ${config.quotedApplicationIdColumn} = NULL
  WHERE ${config.quotedValueColumn} = $2
    AND ${config.quotedApplicationIdColumn} = $3
`;

const getMarkBoidUsedQuery = (config) => `
  UPDATE ${config.quotedTableName}
  SET ${config.quotedStatusColumn} = $1
  WHERE ${config.quotedValueColumn} = $2
    AND ${config.quotedApplicationIdColumn} = $3
`;

module.exports = {
  buildMasterBoidQueryConfig,
  getApplicationBoidQuery,
  getAssignBoidToApplicationQuery,
  getSelectNextAvailableBoidQuery,
  getMarkBoidAssignedQuery,
  getReleaseAllocatedBoidQuery,
  getMarkBoidUsedQuery,
};
