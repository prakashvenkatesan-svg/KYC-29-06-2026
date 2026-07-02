import React, { useRef, useState, useEffect } from "react";

import Webcam from "react-webcam";
import * as faceapi from "face-api.js";

import { useNavigate } from "react-router-dom";

import KycStepper from "../../../Components/kyc/KycStepper";
import api from "../../../services/api";

const PhotoVerification = () => {
  const webcamRef = useRef(null);

  const navigate = useNavigate();

  const [cameraOpen, setCameraOpen] = useState(false);

  const [capturedImage, setCapturedImage] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const openCamera = () => {
    setCameraOpen(true);
    setCapturedImage(null);
    setError("");
  };
  useEffect(() => {
  const loadModels = async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  };

  loadModels();
}, []);


  // CAPTURE PHOTO
  const capturePhoto = async () => {
  const imageSrc = webcamRef.current?.getScreenshot();

  if (!imageSrc) {
    setError("Unable to capture photo");
    return;
  }

  const img = new Image();

  img.src = imageSrc;

  await new Promise((resolve) => {
    img.onload = resolve;
  });

  const detections = await faceapi.detectAllFaces(
    img,
    new faceapi.TinyFaceDetectorOptions()
  );

  if (detections.length === 0) {
    setError("No human face detected.");
    return;
  }

  if (detections.length > 1) {
    setError("Multiple faces detected. Please ensure only one person is visible.");
    return;
  }

  setCapturedImage(imageSrc);
  setCameraOpen(false);
  setError("");
};

  const cancelPhoto = () => {
    setCameraOpen(false);
    setCapturedImage(null);
    setError("");
  };

  const handleContinue = async () => {
    try {
      if (!capturedImage) {
        setError("Please capture a photo first");
        return;
      }

      const applicationId = Number(localStorage.getItem("application_id"));

      if (!applicationId) {
        setError("Application ID is missing. Please restart the KYC flow.");
        return;
      }

      setLoading(true);
      setError("");

      await api.post("/photo/upload", {
        image: capturedImage,
        application_id: applicationId,
      });

      navigate("/uploadsignature");
    } catch (error) {
      console.log("PHOTO UPLOAD ERROR:", error.response?.data || error.message);

      setError(error.response?.data?.message || "Photo upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container '>
      <KycStepper
        currentStep='complete'
        completedSteps={["contact", "identify", "personal", "scheme"]}
      />

      <div className='row'>
        {/* LEFT COLUMN */}
        <div className='col-lg-6 d-flex justify-content-center'>
          <div className='face-card'>
            <h5>For KYC verification Please take Live Photo </h5>
            <div className='scan-box'>
              <div className='corner top-left'></div>
              <div className='corner top-right'></div>
              <div className='corner bottom-left'></div>
              <div className='corner bottom-right'></div>

              <div className='user-icon'>
                <div className='head'></div>
                <div className='body'></div>
              </div>
            </div>

            <div className='Instruction-card'>
              <ul>
                <li>
                  Face Forward and make sure your face is clearly visible.
                </li>
                <li>Remove your glasses, if necessary.</li>
              </ul>
            </div>

            {/* OPEN CAMERA BUTTON */}
            {!cameraOpen && !capturedImage && (
              <div className='d-flex justify-content-center mt-3'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={openCamera}
                >
                  Open Camera
                </button>
              </div>
            )}
          </div>
        </div>

        <div className='col-lg-6 d-flex justify-content-center'>
          {(cameraOpen || capturedImage || error) && (
            <div className='face-result-card'>
              {/* CAMERA VIEW */}
              {cameraOpen && !capturedImage && (
                <>
                  <div className='mt-4'>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat='image/jpeg'
                      width={400}
                      height={300}
                      mirrored={true}
                      videoConstraints={{
                        width: 400,
                        height: 300,
                        facingMode: "user",
                      }}
                      onUserMedia={() => {
                        console.log("Camera opened");
                      }}
                      onUserMediaError={(error) => {
                        console.log("Camera error:", error);
                        setError("Unable to access camera");
                      }}
                    />
                  </div>

                  {/* CAPTURE / CANCEL ONLY WHEN CAMERA OPEN */}
                  <div className='d-flex justify-content-center gap-3 mt-3'>
                    <button
                      type='button'
                      className='btn btn-success'
                      onClick={capturePhoto}
                    >
                      Capture
                    </button>

                    <button
                      type='button'
                      className='btn btn-secondary'
                      onClick={cancelPhoto}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {/* PREVIEW AFTER CAPTURE */}
              {capturedImage && !cameraOpen && (
                <div className='mt-4 text-center'>
                  <img src={capturedImage} alt='Captured' width='300' />

                  <div className='mt-3 d-flex justify-content-center gap-3'>
                    <button
                      type='button'
                      className='btn btn-secondary'
                      onClick={cancelPhoto}
                    >
                      Retake
                    </button>

                    <button
                      type='button'
                      className='btn btn-success'
                      onClick={handleContinue}
                      disabled={loading}
                    >
                      {loading ? "Uploading..." : "Continue"}
                    </button>
                  </div>
                </div>
              )}

              {/* ERROR */}
              {error && <p className='text-danger mt-3'>{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoVerification;
