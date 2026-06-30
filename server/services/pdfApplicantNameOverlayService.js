const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const getApplicantIdentityNameOverlay = (application) => {
  const applicantName = firstNonEmpty(
    application?.kra_details?.app_name,
    application?.identity_details?.full_name,
    application?.identity_verifications?.full_name,
    application?.personal_details?.full_name,
    application?.contact_details?.full_name,
  );

  if (!applicantName) {
    return null;
  }

  return {
    // Page 1 "Name* (same as ID proof)" visible text line
    pageIndex: 0,
    x: 145,
    y: 620,
    size: 10,
    text: String(applicantName).trim().toUpperCase(),
  };
};

const getApplicantFatherNameOverlay = (application) => {
  const fatherName = firstNonEmpty(
    application?.kra_details?.app_f_name,
    application?.personal_details?.father_name,
    application?.identity_details?.father_name,
    application?.identity_verifications?.father_name,
    application?.digilocker_details?.father_name,
  );

  if (!fatherName) {
    return null;
  }

  return {
    // Page 1 "Fathers/Spouse's Name*" visible text line
    pageIndex: 0,
    x: 145,
    y: 579,
    size: 10,
    text: String(fatherName).trim().toUpperCase(),
  };
};

const getApplicantNameOverlays = (application) =>
  [
    getApplicantIdentityNameOverlay(application),
    getApplicantFatherNameOverlay(application),
  ].filter(Boolean);

module.exports = {
  getApplicantNameOverlays,
};
