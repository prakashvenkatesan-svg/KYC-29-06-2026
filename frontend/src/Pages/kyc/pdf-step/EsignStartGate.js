import React from "react";
import { Navigate } from "react-router-dom";

import SignatureVerification from "../kyc-verification/SignatureVerification";

const buildConfirmationKey = (applicationId) =>
  `pdf_step_confirmed_${applicationId}`;

const EsignStartGate = () => {
  const applicationId = localStorage.getItem("application_id");

  if (!applicationId) {
    return <SignatureVerification />;
  }

  const isConfirmed =
    localStorage.getItem(buildConfirmationKey(applicationId)) === "true";

  if (!isConfirmed) {
    return <Navigate to='/esign' replace />;
  }

  return <SignatureVerification />;
};

export default EsignStartGate;
