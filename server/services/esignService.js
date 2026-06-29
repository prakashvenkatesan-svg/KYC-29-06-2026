const axios = require("axios");
const fs = require("fs/promises");
const path = require("path");

const { prepareApplicationPdf } = require("../pdf-flow/services/pdfStepService");

const DEFAULT_ESIGN_BASE_URL =
  process.env.SETU_BASE_URL ||
  process.env.ESIGN_BASE_URL ||
  "https://dg-sandbox.setu.co";
const FIRST_HOLDER_SIGNATURE_HEIGHT = 60;
const FIRST_HOLDER_SIGNATURE_WIDTH = 180;

const buildUrl = (explicitValue, fallbackPath) => {
  if (explicitValue) {
    return explicitValue;
  }

  return new URL(fallbackPath, DEFAULT_ESIGN_BASE_URL).toString();
};

const sanitizeFileToken = (value) =>
  String(value || "document")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "document";

const parseConfiguredOnPages = (value) => {
  const parsed = String(value || "1")
    .split(",")
    .map((page) => page.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : ["1"];
};

const resolveSignatureOnPages = (configuredPages, pageCount) => {
  const normalizedPageCount = Number(pageCount) || 0;

  const resolvedPages = configuredPages
    .map((page) => {
      const normalized = String(page || "").trim().toLowerCase();

      if (
        ["last", "final", "last-page", "final-page"].includes(normalized)
      ) {
        return normalizedPageCount > 0 ? String(normalizedPageCount) : "1";
      }

      return String(page || "").trim();
    })
    .filter(Boolean);

  return resolvedPages.length > 0 ? resolvedPages : ["1"];
};

const resolveFirstHolderSignatureHeight = (configuredHeight) => {
  const normalizedHeight = Number(configuredHeight) || FIRST_HOLDER_SIGNATURE_HEIGHT;
  return Math.min(normalizedHeight, FIRST_HOLDER_SIGNATURE_HEIGHT);
};

const resolveFirstHolderSignatureWidth = (configuredWidth) => {
  const normalizedWidth = Number(configuredWidth) || FIRST_HOLDER_SIGNATURE_WIDTH;
  return Math.min(normalizedWidth, FIRST_HOLDER_SIGNATURE_WIDTH);
};

const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const normalizeIndianMobileIdentifier = (value) => {
  const digits = String(value || "").replace(/\D+/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(-10)}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  if (digits.length > 12) {
    return `91${digits.slice(-10)}`;
  }

  return digits;
};

const logEsignDebug = (label, payload) => {
  console.info(`[eSign] ${label}:`, payload);
};

const isUsableLocation = (value) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return false;
  }

  if (/^\d+$/.test(normalized)) {
    return false;
  }

  return /[a-zA-Z]/.test(normalized);
};

const getEsignConfig = () => {
  const config = {
    clientId:
      process.env.SETU_CLIENT_ID || process.env.ESIGN_CLIENT_ID || "",
    clientSecret:
      process.env.SETU_CLIENT_SECRET || process.env.ESIGN_CLIENT_SECRET || "",
    productId:
      process.env.SETU_PRODUCT_INSTANCE_ID || process.env.ESIGN_PRODUCT_ID || "",
    documentUploadUrl: `${DEFAULT_ESIGN_BASE_URL.replace(/\/$/, "")}/api/documents`,
    signatureRequestUrl: `${DEFAULT_ESIGN_BASE_URL.replace(/\/$/, "")}/api/signature`,
    signatureStatusUrlTemplate: `${DEFAULT_ESIGN_BASE_URL.replace(/\/$/, "")}/api/signature/{id}`,
    signatureDownloadUrlTemplate: `${DEFAULT_ESIGN_BASE_URL.replace(/\/$/, "")}/api/signature/{id}/download/`,
    reason:
      process.env.SETU_ESIGN_REASON ||
      process.env.ESIGN_REASON ||
      "Application signing",
    geoCoordinate:
      process.env.SETU_ESIGN_GEO_COORDINATE ||
      process.env.ESIGN_GEO_COORDINATE ||
      "12.9716,77.5946",
    defaultLocation:
      process.env.SETU_ESIGN_LOCATION ||
      process.env.ESIGN_LOCATION ||
      "Bengaluru, Karnataka",
    signerNo: Number(
      process.env.SETU_ESIGN_SIGNER_NO ||
        process.env.ESIGN_SIGNER_NO ||
        "1",
    ),
    signaturePosition:
      process.env.SETU_ESIGN_SIGNATURE_POSITION ||
      process.env.ESIGN_SIGNATURE_POSITION ||
      "bottom-left",
    signatureOnPages: parseConfiguredOnPages(
      process.env.SETU_ESIGN_SIGNATURE_ON_PAGES ||
        process.env.ESIGN_SIGNATURE_ON_PAGES ||
        "last",
    ),
    signatureHeight: Number(
      process.env.SETU_ESIGN_SIGNATURE_HEIGHT ||
        process.env.ESIGN_SIGNATURE_HEIGHT ||
        "90",
    ),
    signatureWidth: Number(
      process.env.SETU_ESIGN_SIGNATURE_WIDTH ||
        process.env.ESIGN_SIGNATURE_WIDTH ||
        "240",
    ),
  };

  const missing = [];

  if (!config.clientId) missing.push("SETU_CLIENT_ID");
  if (!config.clientSecret) missing.push("SETU_CLIENT_SECRET");
  if (!config.productId) missing.push("SETU_PRODUCT_INSTANCE_ID");

  if (missing.length > 0) {
    const error = new Error(
      `Missing eSign configuration: ${missing.join(", ")}`,
    );
    error.code = "ESIGN_CONFIG_MISSING";
    error.missingConfig = missing;
    throw error;
  }

  return config;
};

const buildEsignHeaders = (config, extraHeaders = {}) => ({
  "x-client-id": config.clientId,
  "x-client-secret": config.clientSecret,
  "x-product-instance-id": config.productId,
  ...extraHeaders,
});

const wrapAxiosError = (error, fallbackCode, fallbackMessage, stage) => {
  if (error?.response) {
    logEsignDebug(`${stage || "provider_error"} provider error response`, {
      httpStatus: error.response.status,
      payload: error.response.data || null,
    });

    const wrappedError = new Error(
      error.response.data?.message || error.message || fallbackMessage,
    );
    wrappedError.code = fallbackCode;
    wrappedError.httpStatus = error.response.status;
    wrappedError.providerPayload = error.response.data || null;
    wrappedError.stage = stage || null;
    return wrappedError;
  }

  if (stage) {
    error.stage = stage;
  }
  return error;
};

const resolveRequestId = (payload) =>
  payload?.id ||
  payload?.requestId ||
  payload?.signatureRequestId ||
  payload?.signature_request_id ||
  "";

const buildRedirectUrl = (applicationId) => {
  const explicitRedirectUrl = process.env.ESIGN_REDIRECT_URL || "";

  if (explicitRedirectUrl) {
    const redirectUrl = new URL(explicitRedirectUrl);
    redirectUrl.searchParams.set("application_id", String(applicationId));
    redirectUrl.searchParams.set("esign_return", "1");
    return redirectUrl.toString();
  }

  const frontendBaseUrl =
    process.env.FRONTEND_BASE_URL ||
    process.env.REACT_APP_SITE_URL ||
    "https://main.d1nw5j5nzx2oue.amplifyapp.com";

  const redirectUrl = new URL("/esign", frontendBaseUrl);
  redirectUrl.searchParams.set("application_id", String(applicationId));
  redirectUrl.searchParams.set("esign_return", "1");
  return redirectUrl.toString();
};

const resolveDocumentId = (payload) =>
  payload?.documentId ||
  payload?.document_id ||
  payload?.id ||
  payload?.document?.id ||
  payload?.signedDocumentId ||
  payload?.signed_document_id ||
  "";

const resolveSigningUrl = (payload) =>
  payload?.signers?.[0]?.url ||
  payload?.url ||
  payload?.redirectUrl ||
  payload?.redirect_url ||
  payload?.signUrl ||
  payload?.sign_url ||
  payload?.esignUrl ||
  payload?.esign_url ||
  "";

const resolveDownloadUrl = (payload) =>
  payload?.downloadUrl ||
  payload?.download_url ||
  payload?.url ||
  "";

const getRawEsignStatus = (payload) =>
  String(
    payload?.status ||
      payload?.state ||
      payload?.requestStatus ||
      payload?.request_status ||
      payload?.signStatus ||
      payload?.sign_status ||
      "",
  )
    .trim()
    .toLowerCase();

const normalizeEsignStatus = (payload) => {
  const rawStatus = getRawEsignStatus(payload);

  if (
    [
      "completed",
      "signed",
      "success",
      "approved",
      "done",
      "sign_complete",
    ].includes(rawStatus)
  ) {
    return "completed";
  }

  if (
    [
      "pending",
      "requested",
      "created",
      "in_progress",
      "in-progress",
      "sign_initiated",
      "sign_pending",
      "sign_in_progress",
    ].includes(rawStatus)
  ) {
    return "pending";
  }

  if (
    ["failed", "declined", "rejected", "expired", "cancelled"].includes(
      rawStatus,
    )
  ) {
    return "failed";
  }

  return rawStatus || "unknown";
};

const buildSignerPayload = (application, config, pdfResult) => {
  const contact = application.contact_details || {};
  const personal = application.personal_details || {};
  const identity = application.identity_verifications || {};
  const signatureOnPages = resolveSignatureOnPages(
    config.signatureOnPages,
    pdfResult?.pageCount,
  );

  const applicantName =
    application.applicant_name ||
    identity.full_name ||
    personal.full_name ||
    [personal.first_name, personal.middle_name, personal.last_name]
      .filter(Boolean)
      .join(" ") ||
    "";

  const birthDateValue =
    application.date_of_birth || identity.dob || personal.dob || "";
  const birthYearMatch = String(birthDateValue).match(/\d{4}/)?.[0] || "";
  const rawIdentifier = String(
    firstNonEmpty(
      application.applicant_mobile,
      contact.mobile_number,
      personal.mobile_number,
    ),
  );
  const normalizedIdentifier = normalizeIndianMobileIdentifier(rawIdentifier);

  const locationCandidates = [
    [personal.city, personal.state].filter(Boolean).join(" "),
    personal.city,
    personal.state,
    personal.country_of_birth,
    config.defaultLocation,
  ];
  const location =
    locationCandidates.find((value) => isUsableLocation(value)) ||
    config.defaultLocation;

  const missingFields = [];

  if (!normalizedIdentifier) missingFields.push("signers.identifier");
  if (!config.reason) missingFields.push("reason");
  if (!config.geoCoordinate) missingFields.push("signers.geoCoordinate");
  if (!location) missingFields.push("signers.location");

  if (!applicantName) missingFields.push("signers.displayName");
  if (!birthYearMatch) missingFields.push("signers.birthYear");

  if (missingFields.length > 0) {
    const error = new Error(
      `Missing required eSign fields: ${missingFields.join(", ")}`,
    );
    error.code = "ESIGN_REQUIRED_FIELDS_MISSING";
    error.missingFields = missingFields;
    throw error;
  }

  const signerPayload = {
    identifier: normalizedIdentifier,
    displayName: applicantName,
    birthYear: birthYearMatch,
    geoCoordinate: config.geoCoordinate,
    location,
    signerNo: config.signerNo,
    signature: {
      onPages: signatureOnPages,
      position: config.signaturePosition,
      // Keep the visible Setu stamp inside the SOLE/FIRST HOLDER cell only.
      height: resolveFirstHolderSignatureHeight(config.signatureHeight),
      width: resolveFirstHolderSignatureWidth(config.signatureWidth),
    },
  };

  logEsignDebug("Resolved Setu signature placement", {
    applicationId: application.id,
    pageCount: pdfResult?.pageCount || null,
    onPages: signerPayload.signature.onPages,
    position: signerPayload.signature.position,
    width: signerPayload.signature.width,
    height: signerPayload.signature.height,
  });

  return [signerPayload];
};

const uploadDocument = async (config, pdfResult, application) => {
  const pdfBytes = await fs.readFile(pdfResult.outputPath);
  const form = new FormData();
  const documentName = `${
    application.application_number || `application_${application.id}`
  }_esign_document`;

  form.append(
    "document",
    new Blob([pdfBytes], { type: "application/pdf" }),
    pdfResult.fileName,
  );
  form.append("name", documentName);

  let response;

  try {
    response = await axios.post(config.documentUploadUrl, form, {
      headers: buildEsignHeaders(config),
      maxBodyLength: Infinity,
    });
  } catch (error) {
    const wrappedError = wrapAxiosError(
      error,
      "ESIGN_DOCUMENT_UPLOAD_FAILED",
      "eSign document upload failed",
      "document_upload",
    );
    wrappedError.requestBody = {
      name: documentName,
      fileName: pdfResult.fileName,
      contentType: "application/pdf",
    };
    throw wrappedError;
  }

  const documentId = resolveDocumentId(response.data);

  if (!documentId) {
    const error = new Error("eSign document upload did not return a document id");
    error.code = "ESIGN_DOCUMENT_UPLOAD_FAILED";
    error.providerPayload = response.data;
    error.stage = "document_upload";
    throw error;
  }

  logEsignDebug("SETU upload response documentId", documentId);

  return {
    documentId,
    providerPayload: response.data,
  };
};

const createSignatureRequest = async (
  config,
  application,
  documentId,
  signers,
) => {
  const payload = {
    documentId,
    redirectUrl: buildRedirectUrl(application.id),
    reason: config.reason,
    signers,
  };

  logEsignDebug("SETU signature payload", payload);

  let response;

  try {
    response = await axios.post(config.signatureRequestUrl, payload, {
      headers: buildEsignHeaders(config, {
        "Content-Type": "application/json",
      }),
    });
  } catch (error) {
    const wrappedError = wrapAxiosError(
      error,
      "ESIGN_SIGNATURE_REQUEST_FAILED",
      "eSign signature request failed",
      "signature_request",
    );
    wrappedError.requestBody = payload;
    throw wrappedError;
  }

  const requestId = resolveRequestId(response.data);
  const signingUrl = resolveSigningUrl(response.data);

  if (!requestId) {
    const error = new Error(
      "eSign signature request did not return a request id",
    );
    error.code = "ESIGN_SIGNATURE_REQUEST_FAILED";
    error.providerPayload = response.data;
    error.stage = "signature_request";
    throw error;
  }

  return {
    requestId,
    signingUrl,
    redirectUrl: payload.redirectUrl,
    providerPayload: response.data,
    requestPayload: payload,
  };
};

const startEsignForApplication = async (application) => {
  const config = getEsignConfig();
  const pdfResult = await prepareApplicationPdf(application.id);
  const pdfApplication = pdfResult.application || application;
  const signers = buildSignerPayload(pdfApplication, config, pdfResult);
  const uploadResult = await uploadDocument(config, pdfResult, pdfApplication);
  const signatureRequest = await createSignatureRequest(
    config,
    pdfApplication,
    uploadResult.documentId,
    signers,
  );

  return {
    pdfResult,
    documentId: uploadResult.documentId,
    requestId: signatureRequest.requestId,
    signingUrl: signatureRequest.signingUrl,
    redirectUrl: signatureRequest.redirectUrl,
    uploadPayload: uploadResult.providerPayload,
    requestPayload: signatureRequest.providerPayload,
    requestBody: signatureRequest.requestPayload,
  };
};

const buildTemplateUrl = (template, requestId) =>
  template.replace("{id}", encodeURIComponent(String(requestId)));

const fetchEsignStatus = async (requestId) => {
  const config = getEsignConfig();
  let response;

  try {
    response = await axios.get(
      buildTemplateUrl(config.signatureStatusUrlTemplate, requestId),
      {
        headers: buildEsignHeaders(config),
      },
    );
  } catch (error) {
    throw wrapAxiosError(
      error,
      "ESIGN_STATUS_FAILED",
      "eSign status lookup failed",
      "signature_status",
    );
  }

  return {
    providerPayload: response.data,
    rawStatus: getRawEsignStatus(response.data),
    normalizedStatus: normalizeEsignStatus(response.data),
    documentId: resolveDocumentId(response.data),
  };
};

const fetchSignedDocumentDownloadInfo = async (requestId) => {
  const config = getEsignConfig();
  let response;

  try {
    response = await axios.get(
      buildTemplateUrl(config.signatureDownloadUrlTemplate, requestId),
      {
        headers: buildEsignHeaders(config),
      },
    );
  } catch (error) {
    throw wrapAxiosError(
      error,
      "ESIGN_SIGNED_DOCUMENT_FAILED",
      "Signed eSign document download link fetch failed",
      "signed_document_download",
    );
  }

  const downloadUrl = resolveDownloadUrl(response.data);

  if (!downloadUrl) {
    const error = new Error(
      "Signed eSign document download URL was not returned by Setu",
    );
    error.code = "ESIGN_SIGNED_DOCUMENT_FAILED";
    error.providerPayload = response.data;
    error.stage = "signed_document_download";
    throw error;
  }

  return {
    downloadUrl,
    providerPayload: response.data,
  };
};

const downloadSignedEsignDocument = async ({ applicationId, requestId }) => {
  const { downloadUrl, providerPayload } =
    await fetchSignedDocumentDownloadInfo(requestId);

  let fileResponse;

  try {
    fileResponse = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
    });
  } catch (error) {
    throw wrapAxiosError(
      error,
      "ESIGN_SIGNED_DOCUMENT_FAILED",
      "Signed eSign document file download failed",
      "signed_document_download_file",
    );
  }

  const isLambda = !!process.env.AWS_EXECUTION_ENV;
  const outputDir = isLambda
    ? "/tmp/generated-pdfs/signed"
    : path.join(__dirname, "..", "generated-pdfs", "signed");
  const fileName = `account_opening_signed_${sanitizeFileToken(applicationId)}.pdf`;
  const outputPath = path.join(outputDir, fileName);

  await fs.mkdir(outputDir, { recursive: true });
  const fileBuffer = Buffer.from(fileResponse.data);
  await fs.writeFile(outputPath, fileBuffer);

  // Upload signed PDF to S3
  try {
    const { uploadToS3 } = require("../utils/s3Upload");
    const s3Key = `clients/uploads/signed-pdfs/${fileName}`;
    await uploadToS3(s3Key, fileBuffer, "application/pdf");
    console.info(`[eSign] Signed PDF successfully uploaded to S3: ${s3Key}`);
  } catch (s3Error) {
    console.error("[eSign] Failed to upload signed PDF to S3:", s3Error.message);
  }

  return {
    outputPath,
    fileName,
    downloadUrl,
    providerPayload,
  };
};

module.exports = {
  startEsignForApplication,
  fetchEsignStatus,
  downloadSignedEsignDocument,
};
