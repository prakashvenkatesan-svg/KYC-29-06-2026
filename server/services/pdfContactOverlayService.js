const getConsentMobileOverlay = (application) => {
  const mobileNumber = String(
    application?.contact_details?.mobile_number || "",
  ).trim();

  if (!mobileNumber) {
    return null;
  }

  return {
    pageIndex: 16,
    x: 118,
    y: 798,
    size: 10,
    text: mobileNumber,
  };
};

const getContactOverlays = (application) =>
  [getConsentMobileOverlay(application)].filter(Boolean);

module.exports = {
  getContactOverlays,
};
