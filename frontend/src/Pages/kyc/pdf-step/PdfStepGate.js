import React from "react";
import { Navigate, useSearchParams } from "react-router-dom";

import PdfReviewStep from "./PdfReviewStep";
import SignatureVerification from "../kyc-verification/SignatureVerification";

const buildConfirmationKey = (applicationId) =>
  `pdf_step_confirmed_${applicationId}`;

const PdfStepGate = () => {
  const [searchParams] = useSearchParams();
  const applicationId =
    searchParams.get("application_id") || localStorage.getItem("application_id");
  const hasReturnFromEsign = searchParams.get("esign_return") === "1";
  const isConfirmed = applicationId
    ? localStorage.getItem(buildConfirmationKey(applicationId)) === "true"
    : false;

  if (hasReturnFromEsign) {
    return <SignatureVerification />;
  }

  if (isConfirmed) {
    return <Navigate to='/esign/start' replace />;
  }

  return <PdfReviewStep />;
};

export default PdfStepGate;
