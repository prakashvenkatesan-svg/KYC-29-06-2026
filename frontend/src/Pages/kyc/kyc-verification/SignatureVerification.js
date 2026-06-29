import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import KycStepper from "../../../Components/kyc/KycStepper";
import api from "../../../services/api";

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 30;
const PROVIDER_PENDING_STATUSES = new Set([
  "sign_in_progress",
  "sign_pending",
  "sign_initiated",
  "pending",
  "in_progress",
]);

const buildPendingProviderMessage = (providerStatus) =>
  `The eSign provider has not finalized this request yet${providerStatus ? ` (${providerStatus})` : ""}. Please wait 30-60 seconds, then use Check Status again. If the OTP page showed "transaction not allowed", this usually means the provider or ESP has not completed the transaction on their side yet.`;

const SignatureVerification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pdfMessage, setPdfMessage] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [esignStatus, setEsignStatus] = useState("");
  const [providerStatus, setProviderStatus] = useState("");
  const [signedPdfUrl, setSignedPdfUrl] = useState("");
  const [ddpiDetails, setDdpiDetails] = useState(null);
  const [ddpiLoading, setDdpiLoading] = useState(false);
  const [applicationId, setApplicationId] = useState(
    () =>
      searchParams.get("application_id") ||
      localStorage.getItem("application_id") ||
      "",
  );
  const hasReturnFromEsign = searchParams.get("esign_return") === "1";
  const isCompleted = esignStatus === "completed" && Boolean(signedPdfUrl);
  const isCheckingReturnedEsign = hasReturnFromEsign && !isCompleted;
  const assetBaseUrl = useMemo(
    () => String(api.defaults.baseURL || "").replace(/\/api\/?$/, ""),
    [],
  );

  useEffect(() => {
    const nextApplicationId =
      searchParams.get("application_id") ||
      localStorage.getItem("application_id") ||
      "";

    setApplicationId(nextApplicationId);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  useEffect(() => {
    if (!applicationId) {
      return;
    }

    let cancelled = false;

    const loadDdpiDetails = async () => {
      try {
        setDdpiLoading(true);
        const response = await api.get(`/ddpi/applications/${applicationId}`);
        if (!cancelled) {
          setDdpiDetails(response.data?.data || null);
        }
      } catch (error) {
        if (!cancelled) {
          setDdpiDetails(null);
        }
      } finally {
        if (!cancelled) {
          setDdpiLoading(false);
        }
      }
    };

    loadDdpiDetails();

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  useEffect(() => {
    if (!applicationId || !hasReturnFromEsign) {
      return undefined;
    }

    let pollAttempts = 0;
    let pollTimer = null;
    let stopped = false;

    const stopPolling = () => {
      stopped = true;
      if (pollTimer) {
        window.clearTimeout(pollTimer);
      }
    };

    const checkEsignStatus = async () => {
      try {
        setStatusLoading(true);
        if (pollAttempts === 0) {
          setMessage("Checking eSign status...");
        }

        const response = await api.get(
          `/esign/applications/${applicationId}/status`,
        );
        const data = response.data?.data || {};
        const nextEsignStatus = data.esign_status || "";
        const nextProviderStatus = data.provider_status || "";

        setEsignStatus(nextEsignStatus);
        setProviderStatus(nextProviderStatus);

        if (nextProviderStatus === "sign_complete") {
          localStorage.setItem("esign_completed", "true");
          setSignedPdfUrl(
            `${api.defaults.baseURL}/esign/applications/${applicationId}/signed-pdf`,
          );
          setMessage(
            "eSign completed successfully. Download the signed PDF or continue.",
          );
          stopPolling();
          return;
        }

        if (nextEsignStatus === "pending") {
          pollAttempts += 1;
          setMessage(buildPendingProviderMessage(nextProviderStatus));

          if (pollAttempts < MAX_POLL_ATTEMPTS && !stopped) {
            pollTimer = window.setTimeout(checkEsignStatus, POLL_INTERVAL_MS);
            return;
          }

          setMessage(buildPendingProviderMessage(nextProviderStatus));
          stopPolling();
          return;
        }

        setMessage(
          data.provider_response?.message ||
            "eSign is not completed yet. Please retry after signing.",
        );
        stopPolling();
      } catch (error) {
        setMessage(
          error.response?.data?.message ||
            "Unable to check the eSign status right now.",
        );
        stopPolling();
      } finally {
        setStatusLoading(false);
      }
    };

    checkEsignStatus();

    return () => {
      stopPolling();
    };
  }, [applicationId, hasReturnFromEsign]);

  const getPdfResponse = async () => {
    if (!applicationId) {
      setPdfMessage(
        "Application ID not found. Please resume the application again.",
      );
      return null;
    }

    try {
      setPdfLoading(true);
      setPdfMessage("");

      // Fetch binary PDF directly with responseType: "blob"
      const response = await api.get(
        `/contact/applications/${applicationId}/pdf`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const fileName = `account_opening_${applicationId}.pdf`;

      return { blob, fileName };
    } catch (error) {
      let errorMessage = "Unable to generate the PDF preview right now.";
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);
          errorMessage = parsed.message || errorMessage;
        } catch (e) {
          // ignore error parsing
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      setPdfMessage(errorMessage);
      return null;
    } finally {
      setPdfLoading(false);
    }
  };

  const previewPdf = async () => {
    const pdfResult = await getPdfResponse();
    if (!pdfResult) {
      return;
    }

    const previewUrl = window.URL.createObjectURL(pdfResult.blob);

    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
    }

    setPdfPreviewUrl(previewUrl);
    setPdfMessage(
      "Review the full PDF below, then confirm and proceed to eSign.",
    );
  };

  const downloadPdf = async () => {
    const pdfResult = await getPdfResponse();
    if (!pdfResult) {
      return;
    }

    const downloadUrl = window.URL.createObjectURL(pdfResult.blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = pdfResult.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    setPdfMessage((prev) =>
      prev && prev.includes("localhost/UAT")
        ? prev
        : "PDF downloaded successfully.",
    );
  };

  const handleStartEsign = async () => {
    try {
      setLoading(true);
      setMessage("");
      setSignedPdfUrl("");
      setEsignStatus("");
      setProviderStatus("");

      if (!applicationId) {
        setMessage(
          "Application ID not found. Please resume the application again.",
        );
        return;
      }

      const response = await api.post(
        `/esign/applications/${applicationId}/start`,
      );
      const signerUrl =
        response.data?.data?.signer_url ||
        response.data?.data?.signing_url ||
        "";

      if (signerUrl) {
        window.location.assign(signerUrl);
        return;
      }

      setMessage(
        "eSign request was created, but no signer URL was returned. Please check the backend provider response.",
      );
    } catch (error) {
      const errorData = error.response?.data || {};
      const apiMessage = errorData?.message || "";
      const providerDetail =
        errorData?.provider_payload?.error?.detail ||
        errorData?.provider_payload?.message ||
        "";

      setMessage(
        apiMessage ||
          providerDetail ||
          "Unable to start the eSign flow right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!applicationId) {
      setMessage(
        "Application ID not found. Please resume the application again.",
      );
      return;
    }

    try {
      setStatusLoading(true);
      setMessage("Refreshing eSign status...");

      const response = await api.get(
        `/esign/applications/${applicationId}/status`,
      );
      const data = response.data?.data || {};
      const nextEsignStatus = data.esign_status || "";
      const nextProviderStatus = data.provider_status || "";

      setEsignStatus(nextEsignStatus);
      setProviderStatus(nextProviderStatus);

      if (nextProviderStatus === "sign_complete") {
        localStorage.setItem("esign_completed", "true");
        setSignedPdfUrl(
          `${api.defaults.baseURL}/esign/applications/${applicationId}/signed-pdf`,
        );
        setMessage(
          "eSign completed successfully. Download the signed PDF or continue.",
        );
        return;
      }

      if (
        nextEsignStatus === "pending" ||
        PROVIDER_PENDING_STATUSES.has(nextProviderStatus)
      ) {
        setMessage(buildPendingProviderMessage(nextProviderStatus));
        return;
      }

      setMessage(
        data.provider_response?.message ||
          "eSign is still pending. Please finish signing and check again.",
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to check the eSign status right now.",
      );
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (!applicationId || hasReturnFromEsign || isCompleted) {
      return;
    }

    previewPdf();
  }, [applicationId, hasReturnFromEsign, isCompleted]);

  return (
    <div className='container'>
      <KycStepper
        currentStep='complete'
        completedSteps={["contact", "identify", "personal", "scheme"]}
      />

      <div className=''>
        <p>
          Review your generated application PDF below, then proceed to the final
          eSign step to complete onboarding.
        </p>

        {ddpiDetails?.ddpi_selected ? (
          <div
            style={{
              marginTop: "24px",
              border: "1px solid #d7defe",
              borderRadius: "20px",
              background: "#f8faff",
              padding: "20px",
            }}
          >
            <h4 style={{ color: "#264095", marginBottom: "8px" }}>
              DDPI Stamp Paper Review
            </h4>
            <p style={{ marginBottom: "8px" }}>
              <strong>Stamp paper assigned successfully.</strong>
            </p>
            {ddpiDetails.stamp_number ? (
              <p style={{ marginBottom: "12px" }}>
                Stamp Number: <strong>{ddpiDetails.stamp_number}</strong>
              </p>
            ) : null}
            <p style={{ marginBottom: "16px" }}>
              This stamp paper will be attached to your DDPI document for
              eSign.
            </p>
            {ddpiLoading ? (
              <p style={{ color: "#264095", marginBottom: 0 }}>
                Loading assigned stamp paper...
              </p>
            ) : ddpiDetails.image_url ? (
              <img
                src={`${assetBaseUrl}${ddpiDetails.image_url}`}
                alt={ddpiDetails.stamp_number || "Assigned stamp paper"}
                style={{
                  width: "100%",
                  maxWidth: "480px",
                  borderRadius: "12px",
                  border: "1px solid #d7defe",
                  background: "#fff",
                }}
              />
            ) : (
              <p style={{ color: "#264095", marginBottom: 0 }}>
                Stamp paper is assigned, but no preview image is available yet.
              </p>
            )}
          </div>
        ) : null}

        {pdfMessage ? (
          <p className='mt-3' style={{ color: "#264095" }}>
            {pdfMessage}
          </p>
        ) : null}

        {message ? (
          <p className='mt-3' style={{ color: "#264095" }}>
            {message}
          </p>
        ) : null}

        {providerStatus ? (
          <p className='mt-2' style={{ color: "#264095" }}>
            Setu status: <strong>{providerStatus}</strong>
          </p>
        ) : null}

        {!isCompleted && !hasReturnFromEsign ? (
          <>
            <div
              style={{
                marginTop: "24px",
                border: "1px solid #d7defe",
                borderRadius: "20px",
                background: "#f8faff",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #d7defe",
                  color: "#264095",
                  fontWeight: 600,
                }}
              >
                Application PDF Review
              </div>

              <div
                style={{
                  height: "70vh",
                  minHeight: "540px",
                  background: "#eef3ff",
                }}
              >
                {pdfPreviewUrl ? (
                  <iframe
                    title='Application PDF Preview'
                    src={pdfPreviewUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "0",
                      background: "#fff",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#264095",
                      padding: "24px",
                      textAlign: "center",
                    }}
                  >
                    {pdfLoading
                      ? "Preparing PDF preview..."
                      : "PDF preview will appear here."}
                  </div>
                )}
              </div>
            </div>

            <button
              type='button'
              className='submit-btn'
              style={{
                marginTop: "16px",
                background: "#fff",
                color: "#264095",
                border: "1px solid #264095",
              }}
              onClick={previewPdf}
              disabled={
                pdfLoading || loading || statusLoading || !applicationId
              }
            >
              {pdfLoading ? "Preparing PDF..." : "Refresh PDF Preview"}
            </button>

            <button
              type='button'
              className='submit-btn'
              style={{
                marginTop: "16px",
                background: "#fff",
                color: "#264095",
                border: "1px solid #264095",
              }}
              onClick={downloadPdf}
              disabled={
                pdfLoading || loading || statusLoading || !applicationId
              }
            >
              {pdfLoading ? "Preparing PDF..." : "Download PDF"}
            </button>

            <button
              type='button'
              className='submit-btn'
              style={{
                marginTop: "16px",
              }}
              onClick={handleStartEsign}
              disabled={loading || statusLoading || pdfLoading}
            >
              {loading ? "Preparing eSign..." : "Confirm and Proceed to eSign"}
            </button>

            <button
              type='button'
              className='submit-btn'
              style={{
                marginTop: "16px",
                background: "#fff",
                color: "#264095",
                border: "1px solid #264095",
              }}
              onClick={handleCheckStatus}
              disabled={
                loading || statusLoading || pdfLoading || !applicationId
              }
            >
              {statusLoading ? "Checking Status..." : "Check Status"}
            </button>
          </>
        ) : null}

        {isCheckingReturnedEsign ? (
          <>
            <div
              style={{
                marginTop: "24px",
                border: "1px solid #d7defe",
                borderRadius: "20px",
                background: "#f8faff",
                padding: "28px 24px",
                color: "#264095",
                textAlign: "center",
              }}
            >
              {statusLoading
                ? "Checking eSign completion status..."
                : "Waiting for the latest eSign status update from Setu."}
            </div>

            <button
              type='button'
              className='submit-btn'
              style={{
                marginTop: "16px",
                background: "#fff",
                color: "#264095",
                border: "1px solid #264095",
              }}
              onClick={handleCheckStatus}
              disabled={
                loading || statusLoading || pdfLoading || !applicationId
              }
            >
              {statusLoading ? "Checking Status..." : "Check Status"}
            </button>
          </>
        ) : isCompleted ? (
          <>
            <a
              href={signedPdfUrl}
              className='submit-btn'
              style={{
                display: "inline-block",
                marginTop: "16px",
                textDecoration: "none",
                textAlign: "center",
              }}
              target='_blank'
              rel='noreferrer'
            >
              Download Signed PDF
            </a>

            <button
              type='button'
              className='submit-btn'
              style={{ marginTop: "16px" }}
              onClick={() => navigate("/kyc-complete")}
            >
              Continue to KYC Complete
            </button>
          </>
        ) : null}

        <button
          type='button'
          className='submit-btn'
          style={{
            marginTop: "16px",
            background: "#fff",
            color: "#264095",
            border: "1px solid #264095",
          }}
          onClick={() => navigate("/photoverify")}
          disabled={loading || statusLoading || pdfLoading}
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default SignatureVerification;
