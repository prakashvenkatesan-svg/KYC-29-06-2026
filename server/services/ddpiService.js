const pool = require("../config/db");
const {
  lockApplicationForDdpiQuery,
  getAvailableStampPaperForAssignmentQuery,
  getStampPaperByIdForUpdateQuery,
  reserveStampPaperQuery,
  releaseStampPaperQuery,
  markStampPaperUsedQuery,
  updateApplicationDdpiQuery,
  getApplicationDdpiDetailsQuery,
} = require("../queries/ddpiQueries");

const DDPI_STATUSES = {
  NOT_SELECTED: "NOT_SELECTED",
  STAMP_ASSIGNED: "STAMP_ASSIGNED",
  SIGNED: "SIGNED",
};

const buildStampImageUrl = (imagePath = "") => {
  if (!imagePath) {
    return "";
  }

  const normalizedPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `/${normalizedPath}`;
};

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getExecutor = (client) => client || pool;

const mapDdpiDetail = (row) => {
  if (!row) {
    return null;
  }

  return {
    application_id: Number(row.application_id),
    ddpi_selected: row.ddpi_selected === true,
    ddpi_status: row.ddpi_status || DDPI_STATUSES.NOT_SELECTED,
    stamp_paper_id: row.stamp_paper_id ? Number(row.stamp_paper_id) : null,
    stamp_number: row.stamp_number || "",
    image_name: row.image_name || "",
    image_path: row.image_path || "",
    image_url: buildStampImageUrl(row.image_path),
    stamp_status: row.stamp_status || "",
    assigned_at: row.assigned_at || null,
    used_at: row.used_at || null,
  };
};

const fetchApplicationDdpiDetails = async (applicationId, client) => {
  const executor = getExecutor(client);
  const result = await executor.query(getApplicationDdpiDetailsQuery, [
    applicationId,
  ]);

  return mapDdpiDetail(result.rows[0] || null);
};

const releaseReservedStamp = async (applicationId, client) => {
  const executor = getExecutor(client);
  const applicationResult = await executor.query(lockApplicationForDdpiQuery, [
    applicationId,
  ]);

  if (applicationResult.rows.length === 0) {
    throw createHttpError("Application not found", 404);
  }

  const application = applicationResult.rows[0];

  if (application.ddpi_status === DDPI_STATUSES.SIGNED) {
    throw createHttpError(
      "DDPI is already signed for this application and cannot be cancelled.",
      409,
    );
  }

  if (application.stamp_paper_id) {
    const stampResult = await executor.query(getStampPaperByIdForUpdateQuery, [
      application.stamp_paper_id,
    ]);
    const stamp = stampResult.rows[0];

    if (stamp && stamp.status === "RESERVED") {
      await executor.query(releaseStampPaperQuery, [application.stamp_paper_id]);
    }
  }

  await executor.query(updateApplicationDdpiQuery, [
    false,
    DDPI_STATUSES.NOT_SELECTED,
    null,
    applicationId,
  ]);

  return fetchApplicationDdpiDetails(applicationId, client);
};

const selectDdpi = async ({ applicationId, ddpiSelected, client }) => {
  if (!ddpiSelected) {
    return releaseReservedStamp(applicationId, client);
  }

  const executor = getExecutor(client);
  const applicationResult = await executor.query(lockApplicationForDdpiQuery, [
    applicationId,
  ]);

  if (applicationResult.rows.length === 0) {
    throw createHttpError("Application not found", 404);
  }

  const application = applicationResult.rows[0];

  if (application.stamp_paper_id) {
    const existingStampResult = await executor.query(
      getStampPaperByIdForUpdateQuery,
      [application.stamp_paper_id],
    );
    const existingStamp = existingStampResult.rows[0];

    if (existingStamp && ["RESERVED", "USED"].includes(existingStamp.status)) {
      const nextStatus =
        existingStamp.status === "USED"
          ? DDPI_STATUSES.SIGNED
          : DDPI_STATUSES.STAMP_ASSIGNED;

      await executor.query(updateApplicationDdpiQuery, [
        true,
        nextStatus,
        existingStamp.id,
        applicationId,
      ]);

      return fetchApplicationDdpiDetails(applicationId, client);
    }
  }

  const availableStampResult = await executor.query(
    getAvailableStampPaperForAssignmentQuery,
  );

  if (availableStampResult.rows.length === 0) {
    throw createHttpError(
      "Stamp paper not available. Please contact admin.",
      409,
    );
  }

  const stampPaper = availableStampResult.rows[0];

  await executor.query(reserveStampPaperQuery, [applicationId, stampPaper.id]);
  await executor.query(updateApplicationDdpiQuery, [
    true,
    DDPI_STATUSES.STAMP_ASSIGNED,
    stampPaper.id,
    applicationId,
  ]);

  return fetchApplicationDdpiDetails(applicationId, client);
};

const markStampPaperUsedAfterEsign = async (applicationId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const applicationResult = await client.query(lockApplicationForDdpiQuery, [
      applicationId,
    ]);

    if (applicationResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const application = applicationResult.rows[0];

    if (!application.ddpi_selected || !application.stamp_paper_id) {
      await client.query("COMMIT");
      return null;
    }

    const stampResult = await client.query(getStampPaperByIdForUpdateQuery, [
      application.stamp_paper_id,
    ]);
    const stampPaper = stampResult.rows[0];

    if (!stampPaper) {
      await client.query("ROLLBACK");
      throw createHttpError("Assigned stamp paper record not found", 422);
    }

    if (stampPaper.status !== "USED") {
      await client.query(markStampPaperUsedQuery, [stampPaper.id]);
    }

    await client.query(updateApplicationDdpiQuery, [
      true,
      DDPI_STATUSES.SIGNED,
      stampPaper.id,
      applicationId,
    ]);

    await client.query("COMMIT");

    return fetchApplicationDdpiDetails(applicationId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  DDPI_STATUSES,
  fetchApplicationDdpiDetails,
  releaseReservedStamp,
  selectDdpi,
  markStampPaperUsedAfterEsign,
};
