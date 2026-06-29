const normalizeOccupation = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const OCCUPATION_TO_PDF_VALUE = {
  "private sector": "/0",
  "public sector": "/1",
  agriculturist: "/2",
  "government service": "/3",
  professional: "/4",
  business: "/5",
  retired: "/6",
  salaried: "/6",
  student: "/7",
  other: "/8",
};

const getOccupationPdfValue = (occupation) => {
  const normalizedOccupation = normalizeOccupation(occupation);

  if (!normalizedOccupation) {
    return "";
  }

  return OCCUPATION_TO_PDF_VALUE[normalizedOccupation] || "/8";
};

module.exports = {
  getOccupationPdfValue,
};
