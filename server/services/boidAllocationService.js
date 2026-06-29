const pool = require("../config/db");
const masterPool = require("../config/masterDb");
const {
  buildMasterBoidQueryConfig,
  getApplicationBoidQuery,
  getAssignBoidToApplicationQuery,
  getSelectNextAvailableBoidQuery,
  getMarkBoidAssignedQuery,
  getReleaseAllocatedBoidQuery,
  getMarkBoidUsedQuery,
} = require("../queries/boidAllocationQueries");

const DEFAULT_MASTER_BOID_TABLE = "boid_master";
const DEFAULT_MASTER_BOID_VALUE_COLUMN = "boid_number";
const DEFAULT_MASTER_BOID_STATUS_COLUMN = "status";
const DEFAULT_MASTER_BOID_AVAILABLE_VALUE = "AVAILABLE";
const DEFAULT_MASTER_BOID_ASSIGNED_VALUE = "ASSIGNED";
const DEFAULT_MASTER_BOID_USED_VALUE = "USED";
const DEFAULT_MASTER_BOID_ASSIGNED_AT_COLUMN = "assigned_at";
const DEFAULT_MASTER_BOID_APPLICATION_ID_COLUMN = "application_id";
const DEFAULT_BOID_REGEX = /^\d{16}$/;

const normalizeStatusValue = (value) => String(value || "").trim().toUpperCase();

const getMasterBoidConfig = () => {
  const tableName =
    process.env.MASTER_BOID_TABLE || DEFAULT_MASTER_BOID_TABLE;
  const valueColumn =
    process.env.MASTER_BOID_VALUE_COLUMN || DEFAULT_MASTER_BOID_VALUE_COLUMN;
  const statusColumn =
    process.env.MASTER_BOID_STATUS_COLUMN || DEFAULT_MASTER_BOID_STATUS_COLUMN;
  const availableValue =
    process.env.MASTER_BOID_AVAILABLE_VALUE ||
    DEFAULT_MASTER_BOID_AVAILABLE_VALUE;
  const assignedValue =
    process.env.MASTER_BOID_ASSIGNED_VALUE ||
    DEFAULT_MASTER_BOID_ASSIGNED_VALUE;
  const usedValue =
    process.env.MASTER_BOID_USED_VALUE || DEFAULT_MASTER_BOID_USED_VALUE;
  const assignedAtColumn =
    process.env.MASTER_BOID_ASSIGNED_AT_COLUMN ||
    DEFAULT_MASTER_BOID_ASSIGNED_AT_COLUMN;
  const applicationIdColumn =
    process.env.MASTER_BOID_APPLICATION_ID_COLUMN ||
    DEFAULT_MASTER_BOID_APPLICATION_ID_COLUMN;

  return {
    tableName,
    valueColumn,
    statusColumn,
    availableValue: normalizeStatusValue(availableValue),
    assignedValue: normalizeStatusValue(assignedValue),
    usedValue: normalizeStatusValue(usedValue),
    assignedAtColumn,
    applicationIdColumn,
    ...buildMasterBoidQueryConfig({
      tableName,
      valueColumn,
      statusColumn,
      assignedAtColumn,
      applicationIdColumn,
    }),
  };
};

const getBoidValidationRegex = () => {
  const configuredPattern = String(
    process.env.MASTER_BOID_VALIDATION_REGEX || "",
  ).trim();

  if (!configuredPattern) {
    return DEFAULT_BOID_REGEX;
  }

  return new RegExp(configuredPattern);
};

const normalizeBoid = (value) => String(value || "").trim();

const validateAllocatedBoid = (boid) => {
  const normalized = normalizeBoid(boid);
  const validationRegex = getBoidValidationRegex();

  if (!normalized) {
    const error = new Error("Allocated BOID is empty");
    error.code = "BOID_ALLOCATION_FAILED";
    throw error;
  }

  if (!validationRegex.test(normalized)) {
    const error = new Error(
      `Allocated BOID does not match expected format: ${normalized}`,
    );
    error.code = "BOID_INVALID_FORMAT";
    error.boid = normalized;
    throw error;
  }

  return normalized;
};

const fetchApplicationBoid = async (applicationId) => {
  const result = await pool.query(getApplicationBoidQuery, [applicationId]);

  return normalizeBoid(result.rows[0]?.boid);
};

const assignBoidToApplication = async (applicationId, boid) => {
  const result = await pool.query(getAssignBoidToApplicationQuery, [
    boid,
    applicationId,
  ]);

  if (result.rows[0]?.boid) {
    return normalizeBoid(result.rows[0].boid);
  }

  return fetchApplicationBoid(applicationId);
};

const allocateNextBoid = async (applicationId) => {
  const config = getMasterBoidConfig();
  const client = await masterPool.connect();

  try {
    await client.query("BEGIN");

    const selectResult = await client.query(
      getSelectNextAvailableBoidQuery(config),
      [config.availableValue],
    );

    if (selectResult.rows.length === 0) {
      const error = new Error("No BOID is available in master_data");
      error.code = "BOID_UNAVAILABLE";
      throw error;
    }

    const boid = validateAllocatedBoid(selectResult.rows[0].boid);

    const updateResult = await client.query(getMarkBoidAssignedQuery(config), [
      config.assignedValue,
      applicationId,
      boid,
      config.availableValue,
    ]);

    if (updateResult.rowCount !== 1) {
      const error = new Error("Failed to reserve BOID in master_data");
      error.code = "BOID_ALLOCATION_FAILED";
      throw error;
    }

    await client.query("COMMIT");
    return boid;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("BOID allocation rollback error:", rollbackError.message);
    }

    throw error;
  } finally {
    client.release();
  }
};

const releaseAllocatedBoid = async (applicationId, boid) => {
  const normalizedBoid = normalizeBoid(boid);

  if (!applicationId || !normalizedBoid) {
    return;
  }

  const config = getMasterBoidConfig();

  await masterPool.query(getReleaseAllocatedBoidQuery(config), [
    config.availableValue,
    normalizedBoid,
    applicationId,
  ]);
};

const ensureApplicationBoid = async (applicationId, existingBoid = "") => {
  const normalizedExistingBoid = normalizeBoid(existingBoid);

  if (normalizedExistingBoid) {
    return validateAllocatedBoid(normalizedExistingBoid);
  }

  const currentBoid = await fetchApplicationBoid(applicationId);

  if (currentBoid) {
    return validateAllocatedBoid(currentBoid);
  }

  let allocatedBoid = "";

  try {
    allocatedBoid = await allocateNextBoid(applicationId);
    const savedBoid = await assignBoidToApplication(applicationId, allocatedBoid);

    if (savedBoid && savedBoid !== allocatedBoid) {
      await releaseAllocatedBoid(applicationId, allocatedBoid);
      return validateAllocatedBoid(savedBoid);
    }

    return validateAllocatedBoid(savedBoid || allocatedBoid);
  } catch (error) {
    if (allocatedBoid) {
      try {
        await releaseAllocatedBoid(applicationId, allocatedBoid);
      } catch (releaseError) {
        console.error("BOID release compensation error:", releaseError.message);
      }
    }

    throw error;
  }
};

const markAllocatedBoidUsed = async (applicationId, boid) => {
  const normalizedBoid = normalizeBoid(boid);

  if (!applicationId || !normalizedBoid) {
    return;
  }

  const config = getMasterBoidConfig();

  await masterPool.query(getMarkBoidUsedQuery(config), [
    config.usedValue,
    normalizedBoid,
    applicationId,
  ]);
};

module.exports = {
  ensureApplicationBoid,
  markAllocatedBoidUsed,
};
