const pool = require("../config/db");
const fsp = require("fs/promises");
const {
  getAdminMetricsQuery,
  getApplicationsListBaseQuery,
  getAdminUsersListBaseQuery,
  getRmDashboardMetricsQuery,
  getApplicationDetailQuery,
  getApplicationStatusQuery,
  updateApplicationStatusQuery,
  createApplicationStatusHistoryQuery,
  createApplicationReviewNoteQuery,
  getApplicationLogsQuery,
  getRmUserByIdQuery,
  updateApplicationAssignedRmQuery,
  upsertApplicationAssignmentQuery,
  deleteApplicationAssignmentQuery,
} = require("../queries/adminQueries");
const {
  generateAccountOpeningPdf,
} = require("../services/accountOpeningPdfService");

const ALLOWED_APPLICATION_STATUSES = new Set([
  "in_progress",
  "submitted",
  "verified",
  "completed",
  "rejected",
  "hold",
]);

const ALLOWED_REVIEW_STATUSES = new Set([
  "pending",
  "under_review",
  "approved",
  "rejected",
]);

const ALLOWED_NOTE_TYPES = new Set(["general", "maker", "checker"]);
const ALLOWED_USER_ROLES = new Set(["admin", "maker", "checker", "rm"]);

const logDbError = (label, error) => {
  console.error(`${label} message:`, error.message);
  console.error(`${label} detail:`, error.detail || null);
  console.error(`${label} table:`, error.table || null);
  console.error(`${label} column:`, error.column || null);
  console.error(`${label} constraint:`, error.constraint || null);
  console.error(`${label} full error:`, error);
};

const safeRollback = async (client) => {
  try {
    if (client) {
      await client.query("ROLLBACK");
    }
  } catch (rollbackError) {
    console.error("Rollback error:", rollbackError.message);
  }
};

const fetchApplicationDetail = async (applicationId) => {
  const result = await pool.query(getApplicationDetailQuery, [applicationId]);
  return result.rows[0]?.application || null;
};

const getMetrics = async (req, res) => {
  try {
    const result = await pool.query(getAdminMetricsQuery);

    return res.status(200).json({
      success: true,
      message: "Admin metrics fetched successfully",
      data: result.rows[0] || {},
    });
  } catch (error) {
    logDbError("Get admin metrics error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching admin metrics",
      error: error.message,
    });
  }
};

const getApplications = async (req, res) => {
  try {
    const {
      q = "",
      application_status,
      review_status,
      current_step,
      assigned_rm_id,
      assignment_state,
      limit = "20",
      offset = "0",
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
    const enforcedAssignedRmId =
      req.adminUser?.role === "rm" ? Number(req.adminUser.id) : null;

    const conditions = [];
    const params = [];

    if (q.trim()) {
      params.push(`%${q.trim()}%`);
      const idx = params.length;
      conditions.push(`
        (
          ka.application_number ILIKE $${idx}
          OR cd.mobile_number ILIKE $${idx}
          OR cd.email ILIKE $${idx}
        )
      `);
    }

    if (application_status) {
      params.push(application_status);
      conditions.push(`ka.application_status = $${params.length}`);
    }

    if (review_status) {
      params.push(review_status);
      conditions.push(`ka.review_status = $${params.length}`);
    }

    if (current_step) {
      params.push(current_step);
      conditions.push(`ka.current_step = $${params.length}`);
    }

    if (enforcedAssignedRmId) {
      params.push(enforcedAssignedRmId);
      conditions.push(`ka.assigned_rm_id = $${params.length}`);
    } else if (assigned_rm_id) {
      params.push(Number(assigned_rm_id));
      conditions.push(`ka.assigned_rm_id = $${params.length}`);
    }

    if (!enforcedAssignedRmId && assignment_state === "assigned") {
      conditions.push("ka.assigned_rm_id IS NOT NULL");
    }

    if (!enforcedAssignedRmId && assignment_state === "unassigned") {
      conditions.push("ka.assigned_rm_id IS NULL");
    }

    let query = getApplicationsListBaseQuery;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    params.push(parsedLimit, parsedOffset);
    query += ` ORDER BY ka.updated_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      message: "Applications fetched successfully",
      data: result.rows,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        count: result.rows.length,
      },
    });
  } catch (error) {
    logDbError("Get applications error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching applications",
      error: error.message,
    });
  }
};

const assignRelationshipManager = async (req, res) => {
  let client;

  try {
    if (req.adminUser?.role === "rm") {
      return res.status(403).json({
        success: false,
        message: "RM users cannot change application assignments",
      });
    }

    const applicationId = Number(req.params.id);
    const assignedRmIdRaw = req.body?.assigned_rm_id;
    const assignedRmId =
      assignedRmIdRaw === null ||
      assignedRmIdRaw === "" ||
      typeof assignedRmIdRaw === "undefined"
        ? null
        : Number(assignedRmIdRaw);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    if (assignedRmIdRaw !== null && assignedRmIdRaw !== "" && Number.isNaN(assignedRmId)) {
      return res.status(400).json({
        success: false,
        message: "assigned_rm_id must be a valid RM user id or null",
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const applicationResult = await client.query(getApplicationStatusQuery, [applicationId]);

    if (applicationResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    let assignedRm = null;

    if (assignedRmId) {
      const rmResult = await client.query(getRmUserByIdQuery, [assignedRmId]);

      if (rmResult.rows.length === 0) {
        await safeRollback(client);
        return res.status(400).json({
          success: false,
          message: "Selected RM user is invalid or inactive",
        });
      }

      assignedRm = rmResult.rows[0];
    }

    await client.query(updateApplicationAssignedRmQuery, [assignedRmId, applicationId]);

    if (assignedRmId) {
      await client.query(upsertApplicationAssignmentQuery, [applicationId, assignedRmId]);
    } else {
      await client.query(deleteApplicationAssignmentQuery, [applicationId]);
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: assignedRmId
        ? "Relationship manager assigned successfully"
        : "Relationship manager assignment removed successfully",
      data: {
        application_id: applicationId,
        assigned_rm_id: assignedRmId,
        assigned_rm_name: assignedRm?.name || null,
        assigned_rm_email: assignedRm?.email || null,
      },
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Assign RM error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while assigning relationship manager",
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

const getUsers = async (req, res) => {
  try {
    const { q = "", role = "", is_active = "" } = req.query;

    const params = [];
    const conditions = [];
    let query = getAdminUsersListBaseQuery;

    if (q.trim()) {
      params.push(`%${q.trim()}%`);
      const idx = params.length;
      conditions.push(`(
        au.name ILIKE $${idx}
        OR au.email ILIKE $${idx}
      )`);
    }

    if (role && ALLOWED_USER_ROLES.has(role)) {
      params.push(role);
      conditions.push(`au.role = $${params.length}`);
    }

    if (is_active === "true" || is_active === "false") {
      params.push(is_active === "true");
      conditions.push(`au.is_active = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += `
      GROUP BY au.id, au.name, au.email, au.role, au.is_active, au.created_at, au.updated_at
      ORDER BY au.created_at DESC
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    logDbError("Get users error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: error.message,
    });
  }
};

const getRmDashboard = async (req, res) => {
  try {
    const requestedRmId = req.query.rm_id ? Number(req.query.rm_id) : null;
    const rmId =
      requestedRmId || (req.adminUser?.role === "rm" ? Number(req.adminUser.id) : null);

    const rmUsersPromise = pool.query(`
      SELECT id, name, email, role
      FROM public.admin_users
      WHERE role = 'rm' AND is_active = TRUE
      ORDER BY name ASC
    `);

    const rmMetricsPromise = rmId
      ? pool.query(getRmDashboardMetricsQuery, [rmId])
      : Promise.resolve({ rows: [] });

    const rmApplicationsPromise = rmId
      ? pool.query(
          `
            ${getApplicationsListBaseQuery}
            WHERE ka.assigned_rm_id = $1
            ORDER BY ka.updated_at DESC
            LIMIT 50
          `,
          [rmId],
        )
      : pool.query(
          `
            ${getApplicationsListBaseQuery}
            WHERE ka.assigned_rm_id IS NOT NULL
            ORDER BY ka.updated_at DESC
            LIMIT 50
          `,
        );

    const [rmMetricsResult, rmApplicationsResult, rmUsersResult] = await Promise.all([
      rmMetricsPromise,
      rmApplicationsPromise,
      rmUsersPromise,
    ]);

    const selectedRm = rmMetricsResult.rows[0] || null;

    return res.status(200).json({
      success: true,
      message: "RM dashboard data fetched successfully",
      data: {
        selected_rm: selectedRm,
        rm_users: rmUsersResult.rows,
        applications: rmApplicationsResult.rows,
      },
    });
  } catch (error) {
    logDbError("Get RM dashboard error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching RM dashboard",
      error: error.message,
    });
  }
};

const getApplicationById = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    const application = await fetchApplicationDetail(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Application details fetched successfully",
      data: application,
    });
  } catch (error) {
    logDbError("Get application detail error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching application details",
      error: error.message,
    });
  }
};

const downloadApplicationPdf = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    const application = await fetchApplicationDetail(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const pdfResult = await generateAccountOpeningPdf(application);

    const pdfBuffer = await fsp.readFile(pdfResult.outputPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${pdfResult.fileName}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (error) {
    logDbError("Download application PDF error", error);

    if (error.code === "MISSING_REQUIRED_FIELDS") {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing for final PDF generation",
        missing_fields: error.missingFields || [],
      });
    }

    if (error.code === "TEMPLATE_NOT_FOUND") {
      return res.status(500).json({
        success: false,
        message: "PDF template file not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while generating application PDF",
      error: error.message,
    });
  }
};

const updateApplicationStatus = async (req, res) => {
  let client;

  try {
    const applicationId = Number(req.params.id);
    const {
      application_status,
      review_status = null,
      reason = null,
      changed_by = null,
    } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    if (!application_status || !ALLOWED_APPLICATION_STATUSES.has(application_status)) {
      return res.status(400).json({
        success: false,
        message: "A valid application_status is required",
      });
    }

    if (review_status && !ALLOWED_REVIEW_STATUSES.has(review_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review_status value",
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const currentStatusResult = await client.query(getApplicationStatusQuery, [
      applicationId,
    ]);

    if (currentStatusResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const currentStatus = currentStatusResult.rows[0];

    const updateResult = await client.query(updateApplicationStatusQuery, [
      application_status,
      review_status,
      reason,
      changed_by,
      applicationId,
    ]);

    await client.query(createApplicationStatusHistoryQuery, [
      applicationId,
      currentStatus.application_status,
      application_status,
      changed_by,
      reason,
    ]);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: updateResult.rows[0],
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Update application status error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating application status",
      error: error.message,
    });
  } finally {
    if (client) client.release();
  }
};

const createReviewNote = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    const { admin_user_id = null, note, note_type = "general" } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    if (!note || !String(note).trim()) {
      return res.status(400).json({
        success: false,
        message: "Note is required",
      });
    }

    if (!ALLOWED_NOTE_TYPES.has(note_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid note_type value",
      });
    }

    const result = await pool.query(createApplicationReviewNoteQuery, [
      applicationId,
      admin_user_id,
      note_type,
      String(note).trim(),
    ]);

    return res.status(201).json({
      success: true,
      message: "Review note added successfully",
      data: result.rows[0],
    });
  } catch (error) {
    logDbError("Create review note error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while adding review note",
      error: error.message,
    });
  }
};

const getApplicationLogs = async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    const result = await pool.query(getApplicationLogsQuery, [applicationId]);

    return res.status(200).json({
      success: true,
      message: "Application logs fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    logDbError("Get application logs error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching application logs",
      error: error.message,
    });
  }
};

module.exports = {
  getMetrics,
  getApplications,
  getUsers,
  getRmDashboard,
  getApplicationById,
  downloadApplicationPdf,
  updateApplicationStatus,
  createReviewNote,
  getApplicationLogs,
  assignRelationshipManager,
};
