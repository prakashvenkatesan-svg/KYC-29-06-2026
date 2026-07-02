const DEFAULT_OVERLAY_FONT_SIZE = Number(
  process.env.ACCOUNT_OPENING_FILLED_FONT_SIZE || "7",
);

const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const normalizeProvider = (value) => String(value || "").trim().toLowerCase();

const hasDigilockerData = (digilocker = {}) =>
  Boolean(
    String(digilocker.provider || "").trim() ||
      String(digilocker.name || "").trim() ||
      String(digilocker.aadhaar_number_masked || "").trim() ||
      String(digilocker.address || "").trim() ||
      String(digilocker.dob || "").trim() ||
      String(digilocker.gender || "").trim() ||
      String(digilocker.father_name || "").trim() ||
      String(digilocker.photo_base64 || "").trim(),
  );

const resolveVerifiedIdentitySource = (application = {}) => {
  const identityProvider = normalizeProvider(
    application?.identity_details?.provider || application?.identity_verifications?.provider,
  );
  const digilockerDetails = application?.digilocker_details || {};
  const digilockerProvider = normalizeProvider(digilockerDetails?.provider);

  if (
    identityProvider === "digilocker" ||
    digilockerProvider === "digilocker" ||
    hasDigilockerData(digilockerDetails)
  ) {
    return "digilocker";
  }

  if (String(application?.kra_details?.app_name || "").trim() !== "") {
    return "kra";
  }

  return "identity";
};

const getApplicantIdentityNameOverlay = (application) => {
  const verifiedIdentitySource = resolveVerifiedIdentitySource(application);
  const applicantName =
    verifiedIdentitySource === "digilocker"
      ? firstNonEmpty(
          application?.digilocker_details?.name,
          application?.kra_details?.app_name,
          application?.identity_details?.full_name,
          application?.identity_verifications?.full_name,
          application?.personal_details?.full_name,
          application?.contact_details?.full_name,
        )
      : verifiedIdentitySource === "kra"
        ? firstNonEmpty(
            application?.kra_details?.app_name,
            application?.identity_details?.full_name,
            application?.identity_verifications?.full_name,
            application?.personal_details?.full_name,
            application?.contact_details?.full_name,
            application?.digilocker_details?.name,
          )
        : firstNonEmpty(
            application?.identity_details?.full_name,
            application?.identity_verifications?.full_name,
            application?.personal_details?.full_name,
            application?.contact_details?.full_name,
            application?.digilocker_details?.name,
            application?.kra_details?.app_name,
          );

  if (!applicantName) {
    return null;
  }

  return {
    pageIndex: 0,
    x: 145,
    y: 620,
    size: DEFAULT_OVERLAY_FONT_SIZE,
    text: String(applicantName).trim(),
  };
};

const getApplicantFatherNameOverlay = (application) => {
  const verifiedIdentitySource = resolveVerifiedIdentitySource(application);
  const fatherName =
    verifiedIdentitySource === "digilocker"
      ? firstNonEmpty(
          application?.digilocker_details?.father_name,
          application?.kra_details?.app_f_name,
          application?.personal_details?.father_name,
          application?.identity_details?.father_name,
          application?.identity_verifications?.father_name,
        )
      : verifiedIdentitySource === "kra"
        ? firstNonEmpty(
            application?.kra_details?.app_f_name,
            application?.personal_details?.father_name,
            application?.digilocker_details?.father_name,
            application?.identity_details?.father_name,
            application?.identity_verifications?.father_name,
          )
        : firstNonEmpty(
            application?.personal_details?.father_name,
            application?.identity_details?.father_name,
            application?.identity_verifications?.father_name,
            application?.digilocker_details?.father_name,
            application?.kra_details?.app_f_name,
          );

  if (!fatherName) {
    return null;
  }

  return {
    pageIndex: 0,
    x: 145,
    y: 579,
    size: DEFAULT_OVERLAY_FONT_SIZE,
    text: String(fatherName).trim().toUpperCase(),
  };
};

const getApplicantNameOverlays = (application) =>
  [
    getApplicantIdentityNameOverlay(application),
    getApplicantFatherNameOverlay(application),
  ].filter(Boolean);

module.exports = {
  getApplicantIdentityNameOverlay,
  getApplicantNameOverlays,
};
