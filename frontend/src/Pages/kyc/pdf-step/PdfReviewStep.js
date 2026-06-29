import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import KycStepper from "../../../Components/kyc/KycStepper";
import {
  getPdfStepDocument,
  getPdfStepMetadata,
} from "../../../services/pdfStepApi";

const buildConfirmationKey = (applicationId) =>
  `pdf_step_confirmed_${applicationId}`;

const PdfReviewStep = () => {
  const navigate = useNavigate();
  const applicationId = localStorage.getItem("application_id");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const loadMetadata = async () => {
    if (!applicationId) {
      setMessage("Application ID not found. Please resume the application again.");
      return;
    }

    try {
      const data = await getPdfStepMetadata(applicationId);
      if (Array.isArray(data?.missing_fields) && data.missing_fields.length > 0) {
        setMissingFields(data.missing_fields);
        setMessage(
          "Preview PDF is ready. Some production fields are still missing, so this copy should be used only for localhost/UAT review.",
        );
        return;
      }

      setMissingFields([]);
      setMessage("Application PDF is ready for review.");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to prepare the application PDF right now.",
      );
    }
  };

  const getPdfBlobResult = async () => {
    if (!applicationId) {
      setMessage("Application ID not found. Please resume the application again.");
      return null;
    }

    try {
      setLoading(true);
      // getPdfStepDocument now returns { blob, fileName, warnings } directly
      const result = await getPdfStepDocument(applicationId);

      if (!result?.blob) {
        setMessage("PDF content was empty. Please try again.");
        return null;
      }

      if (Array.isArray(result.warnings) && result.warnings.length > 0) {
        setMessage(
          "Preview PDF is ready. Some production fields are still missing, so this copy should be used only for localhost/UAT review.",
        );
      } else {
        setMessage("Application PDF prepared successfully.");
      }

      return { blob: result.blob, fileName: result.fileName };
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to prepare the application PDF right now.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const previewPdf = async () => {
    const pdfResult = await getPdfBlobResult();
    if (!pdfResult) {
      return;
    }

    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }

    const nextPreviewUrl = window.URL.createObjectURL(pdfResult.blob);
    setPreviewUrl(nextPreviewUrl);
  };

  const downloadPdf = async () => {
    const pdfResult = await getPdfBlobResult();
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
  };

  const handleContinue = () => {
    if (!applicationId) {
      setMessage("Application ID not found. Please resume the application again.");
      return;
    }

    localStorage.setItem(buildConfirmationKey(applicationId), "true");
    navigate("/esign/start");
  };

  useEffect(() => {
    loadMetadata();
    previewPdf();
  }, []);

  return (
    <div className='container'>
      <KycStepper
        currentStep='complete'
        completedSteps={["contact", "identify", "personal", "scheme"]}
      />

      <div className=''>
        <p>
          Review your generated application PDF below before continuing to the
          eSign step.
        </p>

        {message ? (
          <p className='mt-3' style={{ color: "#264095" }}>
            {message}
          </p>
        ) : null}

        {missingFields.length > 0 ? (
          <p className='mt-2' style={{ color: "#264095" }}>
            Missing fields: {missingFields.join(", ")}
          </p>
        ) : null}

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
            {previewUrl ? (
              <iframe
                title='Application PDF Preview'
                src={previewUrl}
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
                {loading
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
          disabled={loading || !applicationId}
        >
          {loading ? "Preparing PDF..." : "Refresh PDF Preview"}
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
          disabled={loading || !applicationId}
        >
          {loading ? "Preparing PDF..." : "Download PDF"}
        </button>

        <button
          type='button'
          className='submit-btn'
          style={{ marginTop: "16px" }}
          onClick={handleContinue}
          disabled={loading || !applicationId}
        >
          Continue to eSign
        </button>
      </div>
    </div>
  );
};

export default PdfReviewStep;
