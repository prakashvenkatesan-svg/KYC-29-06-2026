const pool = require("../config/db");
const { ensureApplicationBoid } = require("./boidAllocationService");
const { exportApplicationToBse } = require("./bseExportService");

const resolveApplicationId = async ({ applicationId, email, panNumber }) => {
  const normalizedApplicationId = Number(applicationId);

  if (Number.isInteger(normalizedApplicationId) && normalizedApplicationId > 0) {
    return normalizedApplicationId;
  }

  const result = await pool.query(
    `
      SELECT ka.id
      FROM public.kyc_applications ka
      LEFT JOIN public.contact_details cd
        ON cd.application_id = ka.id
      LEFT JOIN public.identity_verifications iv
        ON iv.application_id = ka.id
      LEFT JOIN public.pan_verifications pv
        ON pv.application_id = ka.id::text
      WHERE (
        NULLIF(BTRIM($1), '') IS NOT NULL
        AND UPPER(BTRIM(COALESCE(cd.email, ''))) = UPPER(BTRIM($1))
      )
      OR (
        NULLIF(BTRIM($2), '') IS NOT NULL
        AND UPPER(
          BTRIM(
            COALESCE(
              iv.pan_number,
              pv.pan_number,
              ka.pan_number,
              ''
            )
          )
        ) = UPPER(BTRIM($2))
      )
      ORDER BY ka.updated_at DESC NULLS LAST, ka.created_at DESC NULLS LAST, ka.id DESC
      LIMIT 1
    `,
    [String(email || "").trim(), String(panNumber || "").trim()],
  );

  return Number(result.rows[0]?.id || 0) || null;
};

const runPostClientCodeAutomations = async ({
  applicationId,
  email,
  panNumber,
}) => {
  const resolvedApplicationId = await resolveApplicationId({
    applicationId,
    email,
    panNumber,
  });

  if (!resolvedApplicationId) {
    return {
      attempted: false,
      success: false,
      message:
        "Application could not be resolved from the supplied email/PAN, so automatic BSE export was skipped.",
    };
  }

  try {
    const boid = await ensureApplicationBoid(resolvedApplicationId);
    const exportedRow = await exportApplicationToBse(resolvedApplicationId);

    return {
      attempted: true,
      success: true,
      application_id: resolvedApplicationId,
      boid,
      bse_row_id: exportedRow.id,
    };
  } catch (autoExportError) {
    return {
      attempted: true,
      success: false,
      application_id: resolvedApplicationId,
      message:
        autoExportError.message || "Automatic BSE export could not be completed.",
      ...(autoExportError.details ? { details: autoExportError.details } : {}),
    };
  }
};

module.exports = {
  resolveApplicationId,
  runPostClientCodeAutomations,
};
