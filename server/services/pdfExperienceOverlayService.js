const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const getExperienceOverlay = (application) => {
  const experience = firstNonEmpty(
    application?.personal_details?.trading_experience,
  );

  if (!experience) {
    return null;
  }

  return {
    // Template visible page 6 "3. EXPERIENCE" row
    pageIndex: 11,
    x: 432,
    y: 490,
    size: 10,
    text: String(experience).trim(),
  };
};

const getExperienceOverlays = (application) =>
  [getExperienceOverlay(application)].filter(Boolean);

module.exports = {
  getExperienceOverlays,
};
