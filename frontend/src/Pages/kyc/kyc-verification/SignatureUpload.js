import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import KycStepper from "../../../Components/kyc/KycStepper";
import signatureupload from "../../../assets/signatureupload.png";
import { getApiBaseUrl } from "../../../services/api";


const SignatureUpload = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("upload");

  const [file, setFile] = useState(null);
  const [signatureImage, setSignatureImage] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [capturedPreview, setCapturedPreview] = useState("");

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const [isMobileOrTablet, setIsMobileOrTablet] = useState(
    window.innerWidth <= 1024,
  );

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const cameraCanvasRef = useRef(null);

  const isDrawing = useRef(false);
  const cameraStreamRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobileOrTablet = window.innerWidth <= 1024;

      setIsMobileOrTablet(mobileOrTablet);

      if (!mobileOrTablet && activeTab === "capture") {
        setActiveTab("upload");
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [activeTab]);

  useEffect(() => {
    return () => {
      stopCamera();

      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [capturedPreview]);

  useEffect(() => {
    if (activeTab !== "capture") {
      stopCamera();
    }
  }, [activeTab]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setError("");
  };

  // ==========================
  // Upload Signature File
  // ==========================
  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only JPG, JPEG, PNG and PDF files are allowed.");
      setFile(null);
      return;
    }

    const maxSize = 2 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setError("File size must be less than 2 MB.");
      setFile(null);
      return;
    }

    setError("");
    setFile(selectedFile);

    // Remove other signature methods when file is selected
    setSignatureImage(null);
    setCapturedPhoto(null);

    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview("");
    }
  };

  // ==========================
  // Signature Pad
  // ==========================
  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const clientX = event.touches
      ? event.touches[0].clientX
      : event.clientX;

    const clientY = event.touches
      ? event.touches[0].clientY
      : event.clientY;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();

    const canvas = canvasRef.current;

    if (!canvas) return;

    isDrawing.current = true;

    const context = canvas.getContext("2d");
    const { x, y } = getCoordinates(event);

    context.beginPath();
    context.moveTo(x, y);

    // Remove other selections once user starts drawing
    setFile(null);
    setCapturedPhoto(null);

    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview("");
    }
  };

  const draw = (event) => {
    if (!isDrawing.current) return;

    event.preventDefault();

    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");
    const { x, y } = getCoordinates(event);

    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#101010";

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;

    isDrawing.current = false;

    const canvas = canvasRef.current;

    if (canvas) {
      setSignatureImage(canvas.toDataURL("image/png"));
      setError("");
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);

    setSignatureImage(null);
    setError("");
  };

  // ==========================
  // Camera Functions
  // ==========================
  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  const openCamera = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not supported in this browser.");
        return;
      }

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (cameraError) {
      console.error(cameraError);

      if (cameraError.name === "NotAllowedError") {
        setError("Camera permission was denied. Please allow camera access.");
      } else {
        setError("Unable to open camera. Please try again.");
      }
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const captureCanvas = cameraCanvasRef.current;

    if (!video || !captureCanvas || !video.videoWidth) {
      setError("Camera is not ready. Please wait and try again.");
      return;
    }

    const context = captureCanvas.getContext("2d");

    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;

    context.drawImage(
      video,
      0,
      0,
      captureCanvas.width,
      captureCanvas.height,
    );

    captureCanvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture photo. Please try again.");
          return;
        }

        const photoFile = new File(
          [blob],
          `signature-photo-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          },
        );

        if (capturedPreview) {
          URL.revokeObjectURL(capturedPreview);
        }

        setCapturedPhoto(photoFile);
        setCapturedPreview(URL.createObjectURL(blob));

        setFile(null);
        setSignatureImage(null);
        setError("");

        stopCamera();
      },
      "image/jpeg",
      0.9,
    );
  };

  const retakePhoto = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }

    setCapturedPhoto(null);
    setCapturedPreview("");
    openCamera();
  };

  // ==========================
  // Upload To Backend
  // ==========================
  const handleUpload = async () => {
  try {
    const applicationId = localStorage.getItem("application_id");

    if (!applicationId) {
      setError("Application ID is missing. Please restart the KYC process.");
      return;
    }

    if (activeTab === "upload" && !file) {
      setError("Please upload a signature file.");
      return;
    }

    if (activeTab === "draw" && !signatureImage) {
      setError("Please draw your signature.");
      return;
    }

    if (activeTab === "capture" && !capturedPhoto) {
      setError("Please capture your signature photo.");
      return;
    }

    setError("");
    setUploading(true);

    const formData = new FormData();

    const signatureMethodMap = {
      upload: "upload_signature",
      draw: "signature_pad",
      capture: "capture_photo",
    };

    formData.append("application_id", applicationId);

    // DB stores which method user selected
    formData.append(
      "signature_method",
      signatureMethodMap[activeTab],
    );

    if (activeTab === "draw") {
      formData.append("signature_base64", signatureImage);
    } else if (activeTab === "capture") {
      formData.append("signature", capturedPhoto);
    } else {
      formData.append("signature", file);
    }

    const response = await axios.post(
      `${getApiBaseUrl()}/signature/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (response.data.success) {
      navigate("/schemedetail");
    } else {
      setError(response.data.message || "Failed to upload signature.");
    }
  } catch (uploadError) {
    console.error(uploadError);

    setError(
      uploadError.response?.data?.message ||
        "Failed to upload signature. Please try again.",
    );
  } finally {
    setUploading(false);
  }
};

  return (
    <div className="container">
      <KycStepper
        currentStep="complete"
        completedSteps={["contact", "identify", "personal", "scheme"]}
      />

      <div className="row signature-upload-row">
        <div className="col-lg-6 upload-signature">
          <img
            src={signatureupload}
            alt="Signature upload illustration"
            className="signatureuploadimg"
          />
        </div>

        <div className="col-lg-6">
          <div className="esign-card signature-main-card">
            <h4 className="signature-page-title">Signature Upload</h4>

            <p className="signature-page-subtitle">
              Choose one method to submit your signature.
            </p>

            {error && <div className="signature-error-box">{error}</div>}

            {/* Top Three Tabs */}
            <div className="signature-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={`signature-tab ${
                  activeTab === "upload" ? "active" : ""
                }`}
                onClick={() => handleTabChange("upload")}
              >
                Upload Signature
              </button>

              <button
                type="button"
                role="tab"
                className={`signature-tab ${
                  activeTab === "draw" ? "active" : ""
                }`}
                onClick={() => handleTabChange("draw")}
              >
                Signature Pad
              </button>

              {/* Only visible in Mobile and Tablet */}
              {isMobileOrTablet && (
                <button
                  type="button"
                  role="tab"
                  className={`signature-tab ${
                    activeTab === "capture" ? "active" : ""
                  }`}
                  onClick={() => handleTabChange("capture")}
                >
                  Capture Photo
                </button>
              )}
            </div>

            <div className="signature-tab-content">
              {/* Upload Signature */}
              {activeTab === "upload" && (
                <div className="signature-upload-content">
                  <input
                    type="file"
                    id="signatureFile"
                    accept=".jpg,.jpeg,.png,.pdf"
                    hidden
                    onChange={handleFileChange}
                  />

                  <label
                    htmlFor="signatureFile"
                    className="signature-file-upload-box"
                  >
                    <div className="upload-file-icon">↑</div>

                    <p>Choose a Signature File</p>

                    <small>JPG, JPEG, PNG or PDF up to 2 MB</small>

                    <span className="browse-file-btn">Browse File</span>
                  </label>

                  {file && (
                    <div className="selected-file-box">
                      <span className="selected-file-name">{file.name}</span>

                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={() => setFile(null)}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Signature Pad */}
              {activeTab === "draw" && (
                <div className="signature-pad-content">
                  <div className="signature-pad-heading-row">
                    <label>Draw Your Signature</label>

                    <button
                      type="button"
                      className="clear-signature-btn"
                      onClick={clearSignature}
                    >
                      Clear
                    </button>
                  </div>

                  <div className="signature-canvas-wrapper">
                    <canvas
                      ref={canvasRef}
                      width={700}
                      height={220}
                      className="signature-canvas"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>

                  <p className="signature-pad-note">
                    Use your finger or mouse to sign inside the box.
                  </p>
                </div>
              )}

              {/* Capture Photo - Mobile and Tablet Only */}
              {activeTab === "capture" && isMobileOrTablet && (
                <div className="signature-camera-content">
                  {!cameraActive && !capturedPreview && (
                    <div className="camera-start-box">
                      <div className="camera-icon">⌕</div>

                      <h5>Capture Signature Photo</h5>

                      <p>
                        Place your signature paper in good lighting and capture
                        a clear photo.
                      </p>

                      <button
                        type="button"
                        className="camera-action-btn"
                        onClick={openCamera}
                      >
                        Open Camera
                      </button>
                    </div>
                  )}

                  {cameraActive && (
                    <div className="camera-preview-wrapper">
                      <video
                        ref={videoRef}
                        className="camera-video"
                        autoPlay
                        playsInline
                        muted
                      />

                      <div className="camera-buttons-row">
                        <button
                          type="button"
                          className="camera-cancel-btn"
                          onClick={stopCamera}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          className="camera-capture-btn"
                          onClick={capturePhoto}
                        >
                          Capture Photo
                        </button>
                      </div>
                    </div>
                  )}

                  {capturedPreview && !cameraActive && (
                    <div className="captured-image-wrapper">
                      <img
                        src={capturedPreview}
                        alt="Captured signature"
                        className="captured-signature-image"
                      />

                      <button
                        type="button"
                        className="retake-photo-btn"
                        onClick={retakePhoto}
                      >
                        Retake Photo
                      </button>
                    </div>
                  )}

                  <canvas ref={cameraCanvasRef} hidden />
                </div>
              )}
            </div>

            <button
              type="button"
              className="upload-btn signature-submit-btn"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureUpload;
