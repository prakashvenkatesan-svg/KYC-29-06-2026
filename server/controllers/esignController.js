const fs = require("fs/promises");

const pool = require("../config/db");
const { getApplicationDetailQuery } = require("../queries/adminQueries");
const {
  startEsignForApplication,
  fetchEsignStatus,
  downloadSignedEsignDocument,
} = require("../services/esignService");
const { markStampPaperUsedAfterEsign } = require("../services/ddpiService");
const { markAllocatedBoidUsed } = require("../services/boidAllocationService");
const {
  sendCompletionEmailIfNeeded,
} = require("../services/customerNotificationService");

const fetchApplicationDetail = async (applicationId) => {
  const result = await pool.query(getApplicationDetailQuery, [applicationId]);
  return result.rows[0]?.application || null;
};

const normalizeProviderMessage = (payload) =>
  String(
    payload?.message ||
      payload?.error?.detail ||
      payload?.error?.message ||
      payload?.statusMessage ||
      payload?.status_message ||
      payload?.remarks ||
      "",
  ).trim();

const triggerCompletionEmail = async (applicationId) => {
  try {
    const emailResult = await sendCompletionEmailIfNeeded({ applicationId });
    console.info("Completion email result:", {
      applicationId,
      ...emailResult,
    });
  } catch (error) {
    console.error(
      `Completion email failed for application ${applicationId}:`,
      error.message,
    );
  }
};

const updateEsignRecord = async (applicationId, updates) => {
  const columns = [];
  const values = [];

  Object.entries(updates).forEach(([key, value]) => {
    values.push(value);
    columns.push(`${key} = $${values.length}`);
  });

  values.push(applicationId);

  const query = `
    UPDATE public.kyc_applications
    SET ${columns.join(", ")},
        updated_at = NOW()
    WHERE id = $${values.length}
    RETURNING id, application_number, current_step, kyc_status, is_completed,
              esign_document_id, esign_request_id, esign_status, esign_signed_pdf_path
  `;

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const ensureSignedDocumentForApplication = async (applicationId, application) => {
  if (!application.esign_request_id) {
    const error = new Error("No eSign request exists yet for this application");
    error.code = "ESIGN_REQUEST_NOT_FOUND";
    throw error;
  }

  if (application.esign_signed_pdf_path) {
    try {
      await fs.access(application.esign_signed_pdf_path);
      return {
        signedDocumentPath: application.esign_signed_pdf_path,
        statusResult: null,
      };
    } catch (error) {
      // Local file is missing. Try to fetch from S3 first!
      const path = require("path");
      const fileName = path.basename(application.esign_signed_pdf_path);
      const s3Key = `clients/uploads/signed-pdfs/${fileName}`;
      try {
        const { downloadFromS3 } = require("../utils/s3Upload");
        const s3Buffer = await downloadFromS3(s3Key);
        if (s3Buffer) {
          await fs.mkdir(path.dirname(application.esign_signed_pdf_path), { recursive: true });
          await fs.writeFile(application.esign_signed_pdf_path, s3Buffer);
          console.info(`[eSign] Restored signed PDF from S3: ${s3Key}`);
          return {
            signedDocumentPath: application.esign_signed_pdf_path,
            statusResult: null,
          };
        }
      } catch (s3Error) {
        console.warn(`[eSign] Failed to restore signed PDF from S3:`, s3Error.message);
      }
    }
  }

  const statusResult = await fetchEsignStatus(application.esign_request_id);

  if (statusResult.rawStatus !== "sign_complete") {
    const error = new Error("Signed PDF is not available until Setu marks the request sign_complete");
    error.code = "ESIGN_NOT_COMPLETED";
    error.providerPayload = statusResult.providerPayload;
    error.rawStatus = statusResult.rawStatus;
    throw error;
  }

  const signedDocument = await downloadSignedEsignDocument({
    applicationId,
    requestId: application.esign_request_id,
  });

  await updateEsignRecord(applicationId, {
    esign_status: "completed",
    esign_document_id:
      statusResult.documentId || application.esign_document_id || "",
    esign_last_provider_message: normalizeProviderMessage(
      statusResult.providerPayload,
    ),
    esign_signed_pdf_path: signedDocument.outputPath,
    current_step: "esign",
    kyc_status: "completed",
    is_completed: true,
    esign_signed_at: new Date(),
  });
  try {
    await markStampPaperUsedAfterEsign(applicationId);
    await markAllocatedBoidUsed(applicationId, application.boid);
    await triggerCompletionEmail(applicationId);
  } catch (sideEffectError) {
    console.error("Failed to execute post-esign side effects (ensureSignedDocument):", sideEffectError.message);
  }

  return {
    signedDocumentPath: signedDocument.outputPath,
    statusResult,
  };
};

const startEsign = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

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

    const result = await startEsignForApplication(application);

    const savedRecord = await updateEsignRecord(applicationId, {
      current_step: "esign",
      kyc_status: "in_progress",
      esign_document_id: result.documentId || "",
      esign_request_id: result.requestId,
      esign_status: "pending",
      esign_redirect_url: result.redirectUrl,
      esign_last_provider_message: normalizeProviderMessage(result.requestPayload),
    });

    return res.status(200).json({
      success: true,
      message: "eSign request created successfully",
      data: {
        application_id: applicationId,
        esign_document_id: result.documentId || "",
        esign_request_id: result.requestId,
        esign_status: savedRecord?.esign_status || "pending",
        signer_url: result.signingUrl,
        signing_url: result.signingUrl,
        redirect_url: result.redirectUrl,
      },
    });
  } catch (error) {
    console.error("Start eSign error:", error.message);
    console.error("Start eSign provider payload:", error.providerPayload || null);
    console.error("Start eSign request body:", error.requestBody || null);

    if (error.code === "ESIGN_CONFIG_MISSING") {
      return res.status(503).json({
        success: false,
        message:
          "eSign is not configured yet. Add Setu eSign credentials in the backend environment first.",
        missing_config: error.missingConfig || [],
      });
    }

    if (error.code === "TEMPLATE_NOT_FOUND") {
      return res.status(500).json({
        success: false,
        message: "PDF template file not found for eSign generation",
      });
    }

    if (error.code === "ESIGN_REQUIRED_FIELDS_MISSING") {
      return res.status(400).json({
        success: false,
        message: "Required eSign fields are missing for this application",
        missing_fields: error.missingFields || [],
      });
    }

    const providerDetail =
      error.providerPayload?.error?.detail ||
      error.providerPayload?.message ||
      error.providerPayload?.detail ||
      "";

    return res.status(500).json({
      success: false,
      message:
        providerDetail ||
        "Unable to start the eSign request right now",
      error: error.message,
      provider_stage: error.stage || null,
      provider_status: error.httpStatus || null,
      provider_payload: error.providerPayload || null,
      request_body_debug:
        process.env.NODE_ENV === "production" ? null : error.requestBody || null,
    });
  }
};

const getEsignStatus = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

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

    if (!application.esign_request_id) {
      return res.status(400).json({
        success: false,
        message: "No eSign request exists yet for this application",
      });
    }

    const statusResult = await fetchEsignStatus(application.esign_request_id);
    console.info("eSign status result:", {
      applicationId,
      requestId: application.esign_request_id,
      rawStatus: statusResult.rawStatus,
      normalizedStatus: statusResult.normalizedStatus,
      providerPayload: statusResult.providerPayload,
    });
    let signedDocumentPath = application.esign_signed_pdf_path || "";

    if (
      statusResult.rawStatus === "sign_complete" &&
      !signedDocumentPath
    ) {
      try {
        const signedDocument = await downloadSignedEsignDocument({
          applicationId,
          requestId: application.esign_request_id,
        });
        signedDocumentPath = signedDocument.outputPath;
      } catch (downloadError) {
        console.error(
          "eSign signed document download error:",
          downloadError.message,
        );
      }
    }

    const updates = {
      esign_status: statusResult.normalizedStatus,
      esign_document_id:
        statusResult.documentId || application.esign_document_id || "",
      esign_last_provider_message: normalizeProviderMessage(
        statusResult.providerPayload,
      ),
      esign_signed_pdf_path:
        signedDocumentPath || application.esign_signed_pdf_path,
    };

    if (statusResult.rawStatus === "sign_complete") {
      updates.current_step = "esign";
      updates.kyc_status = "completed";
      updates.is_completed = true;
      updates.esign_signed_at = new Date();
    }

    const savedRecord = await updateEsignRecord(applicationId, updates);

    if (statusResult.rawStatus === "sign_complete") {
      try {
        await markStampPaperUsedAfterEsign(applicationId);
        await markAllocatedBoidUsed(applicationId, application.boid);
        await triggerCompletionEmail(applicationId);
      } catch (sideEffectError) {
        console.error("Failed to execute post-esign side effects:", sideEffectError.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: "eSign status fetched successfully",
      data: {
        application_id: applicationId,
        esign_request_id: application.esign_request_id,
        esign_status: savedRecord?.esign_status || statusResult.normalizedStatus,
        provider_status: statusResult.rawStatus,
        signed_pdf_path:
          savedRecord?.esign_signed_pdf_path || signedDocumentPath || "",
        signed_pdf_download_url:
          statusResult.rawStatus === "sign_complete"
            ? `/api/esign/applications/${applicationId}/signed-pdf`
            : "",
        provider_response: statusResult.providerPayload,
      },
    });
  } catch (error) {
    console.error("Get eSign status error:", error.message);
    console.error("Get eSign status provider payload:", error.providerPayload || null);
    console.error("Get eSign status stage:", error.stage || null);
    console.error("Get eSign status httpStatus:", error.httpStatus || null);

    if (error.code === "ESIGN_CONFIG_MISSING") {
      return res.status(503).json({
        success: false,
        message:
          "eSign is not configured yet. Add Setu eSign credentials in the backend environment first.",
        missing_config: error.missingConfig || [],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to fetch the eSign status right now",
      error: error.message,
      provider_stage: error.stage || null,
      provider_status: error.httpStatus || null,
      provider_payload: error.providerPayload || null,
    });
  }
};

const downloadSignedPdf = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

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

    const { signedDocumentPath } = await ensureSignedDocumentForApplication(
      applicationId,
      application,
    );

    return res.download(
      signedDocumentPath,
      `account_opening_signed_${application.application_number || applicationId}.pdf`,
    );
  } catch (error) {
    console.error("Download signed PDF error:", error.message);
    console.error("Download signed PDF provider payload:", error.providerPayload || null);

    if (error.code === "ESIGN_REQUEST_NOT_FOUND") {
      return res.status(400).json({
        success: false,
        message: "No eSign request exists yet for this application",
      });
    }

    if (error.code === "ESIGN_NOT_COMPLETED") {
      return res.status(409).json({
        success: false,
        message:
          "Signed PDF is not available yet because Setu has not marked the request sign_complete.",
        provider_status: error.rawStatus || "",
        provider_payload: error.providerPayload || null,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to download the signed PDF right now",
      error: error.message,
      provider_stage: error.stage || null,
      provider_status: error.httpStatus || null,
      provider_payload: error.providerPayload || null,
    });
  }
};

module.exports = {
  startEsign,
  getEsignStatus,
  downloadSignedPdf,
};
