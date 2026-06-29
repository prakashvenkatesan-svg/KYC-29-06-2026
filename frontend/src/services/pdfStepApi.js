import api from "./api";

/**
 * Decode a base64 string to a Blob safely.
 */
const base64ToBlob = (base64, mimeType = "application/pdf") => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

/**
 * Fetch PDF for the given application as a decoded Blob.
 * The server returns base64-encoded JSON to avoid API Gateway binary corruption.
 * Returns { blob, fileName, warnings } or throws on error.
 */
export const getPdfStepDocument = async (applicationId) => {
  const response = await api.get(
    `/contact/applications/${applicationId}/pdf`,
    {
      responseType: "blob",
    }
  );
  const blob = new Blob([response.data], { type: "application/pdf" });
  const fileName = `account_opening_${applicationId}.pdf`;
  return { blob, fileName, warnings: [] };
};

/**
 * Fetch PDF metadata (page count, missing fields, etc.)
 * without downloading the full binary.
 */
export const getPdfStepMetadata = async (applicationId) => {
  const response = await api.get(
    `/contact/applications/${applicationId}/prepare`,
  );
  return response.data?.data || response.data;
};
