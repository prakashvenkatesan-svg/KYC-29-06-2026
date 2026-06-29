const fs = require("fs/promises");
const path = require("path");

const pool = require("../config/db");
const { getApplicationDetailQuery } = require("../queries/adminQueries");
const { fetchApplicationDdpiDetails } = require("./ddpiService");
const { sendKycCompletionMail } = require("./mailService");

const COMPLETION_EMAIL_LOCK_NAMESPACE = 250625;
const PROJECT_ROOT = path.join(__dirname, "..", "..");

const resolveAbsolutePath = (inputPath = "") => {
  const normalizedPath = String(inputPath || "").trim();

  if (!normalizedPath) {
    return "";
  }

  if (path.isAbsolute(normalizedPath)) {
    return normalizedPath;
  }

  return path.join(PROJECT_ROOT, normalizedPath.replace(/^[/\\]+/, ""));
};

const ensureReadableFile = async (inputPath = "") => {
  const absolutePath = resolveAbsolutePath(inputPath);

  if (!absolutePath) {
    return "";
  }

  await fs.access(absolutePath);
  return absolutePath;
};

const fetchApplicationDetail = async (applicationId) => {
  const result = await pool.query(getApplicationDetailQuery, [applicationId]);
  return result.rows[0]?.application || null;
};

const fetchFallbackClientCode = async (application) => {
  const email = String(application?.contact_details?.email || "").trim();
  const panNumber = String(
    application?.identity_verifications?.pan_number ||
      application?.pan_number ||
      "",
  )
    .trim()
    .toUpperCase();

  if (!email && !panNumber) {
    return "";
  }

  const result = await pool.query(
    `
      SELECT client_code
      FROM public.client_codes
      WHERE ($1 <> '' AND LOWER(email) = LOWER($1))
         OR ($2 <> '' AND UPPER(pan_number) = $2)
      ORDER BY created_at DESC NULLS LAST, id DESC
      LIMIT 1
    `,
    [email, panNumber],
  );

  return String(result.rows[0]?.client_code || "").trim();
};

const updateCompletionEmailStatus = async (applicationId, updates) => {
  const assignments = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    values.push(value);
    assignments.push(`${key} = $${values.length}`);
  });

  if (assignments.length === 0) {
    return;
  }

  values.push(applicationId);

  await pool.query(
    `
      UPDATE public.kyc_applications
      SET ${assignments.join(", ")},
          updated_at = NOW()
      WHERE id = $${values.length}
    `,
    values,
  );
};

const sendCompletionEmailIfNeeded = async ({ applicationId }) => {
  let lockAcquired = false;

  try {
    const lockResult = await pool.query(
      "SELECT pg_try_advisory_lock($1, $2) AS locked",
      [COMPLETION_EMAIL_LOCK_NAMESPACE, Number(applicationId)],
    );
    lockAcquired = lockResult.rows[0]?.locked === true;

    if (!lockAcquired) {
      return {
        success: false,
        skipped: true,
        reason: "completion_email_locked",
      };
    }

    const sentStatusResult = await pool.query(
      `
        SELECT completion_email_sent
        FROM public.kyc_applications
        WHERE id = $1
        LIMIT 1
      `,
      [applicationId],
    );

    if (sentStatusResult.rows[0]?.completion_email_sent === true) {
      return {
        success: true,
        skipped: true,
        reason: "completion_email_already_sent",
      };
    }

    const application = await fetchApplicationDetail(applicationId);

    if (!application) {
      throw new Error("Application not found for completion email");
    }

    const toEmail = String(application.contact_details?.email || "").trim();

    if (!toEmail) {
      await updateCompletionEmailStatus(applicationId, {
        completion_email_error: "Customer email is missing",
      });
      return {
        success: false,
        skipped: true,
        reason: "completion_email_missing_recipient",
      };
    }

    const signedPdfPath = await ensureReadableFile(
      application.esign_signed_pdf_path,
    );

    const resolvedClientCode =
      String(application.client_code || "").trim() ||
      (await fetchFallbackClientCode(application));

    const attachments = [
      {
        filename: `account_opening_signed_${application.application_number || applicationId}.pdf`,
        path: signedPdfPath,
      },
    ];

    const ddpiDetails = await fetchApplicationDdpiDetails(applicationId);

    if (ddpiDetails?.ddpi_selected && ddpiDetails?.image_path) {
      try {
        const stampPaperPath = await ensureReadableFile(ddpiDetails.image_path);
        attachments.push({
          filename:
            ddpiDetails.image_name ||
            `stamp_paper_${ddpiDetails.stamp_number || applicationId}${path.extname(
              stampPaperPath,
            )}`,
          path: stampPaperPath,
        });
      } catch (stampError) {
        console.warn(
          `Completion email stamp paper attachment skipped for application ${applicationId}:`,
          stampError.message,
        );
      }
    }

    await sendKycCompletionMail({
      toEmail,
      clientName:
        application.personal_details?.full_name ||
        application.digilocker_details?.name ||
        application.kra_details?.app_name ||
        "Client",
      clientCode: resolvedClientCode,
      applicationNumber: application.application_number || "",
      hasStampPaper: attachments.length > 1,
      attachments,
    });

    await updateCompletionEmailStatus(applicationId, {
      completion_email_sent: true,
      completion_email_sent_at: new Date(),
      completion_email_error: null,
    });

    return {
      success: true,
      skipped: false,
    };
  } catch (error) {
    await updateCompletionEmailStatus(applicationId, {
      completion_email_error: error.message,
    });
    throw error;
  } finally {
    if (lockAcquired) {
      await pool.query("SELECT pg_advisory_unlock($1, $2)", [
        COMPLETION_EMAIL_LOCK_NAMESPACE,
        Number(applicationId),
      ]);
    }
  }
};

module.exports = {
  sendCompletionEmailIfNeeded,
};
