const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const BANK_IFSC_OVERLAY_TARGETS = [
  {
    // Page 11 (visible bank section) primary IFSC box
    pageIndex: 10,
    x: 389,
    y: 691,
    size: 9,
  },
  {
    // Page 11 optional bank section IFSC box
    pageIndex: 10,
    x: 391,
    y: 572,
    size: 9,
  },
];

const getBankIfscOverlays = (application) => {
  const ifscCode = firstNonEmpty(
    application?.bank_details?.ifsc_code,
    application?.bank_details?.ifsc,
  );

  if (!ifscCode) {
    return [];
  }

  return BANK_IFSC_OVERLAY_TARGETS.map((target) => ({
    ...target,
    text: String(ifscCode).trim(),
  }));
};

module.exports = {
  getBankIfscOverlays,
};
