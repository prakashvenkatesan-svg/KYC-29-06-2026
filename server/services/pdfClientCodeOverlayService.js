const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const getUniqueClientCodeOverlay = (application) => {
  const clientCode = firstNonEmpty(
    application?.client_code_details?.client_code,
    application?.client_code,
  );

  if (!clientCode) {
    return null;
  }

  return {
    // Template visible page 7 "Unique Client Code No." fallback
    pageIndex: 12,
    x: 308,
    y: 303,
    size: 9,
    text: String(clientCode).trim(),
  };
};

const getDematUccOverlays = (application) => {
  const clientCode = firstNonEmpty(
    application?.client_code_details?.client_code,
    application?.client_code,
  );

  if (!clientCode) {
    return [];
  }

  return [
    {
      // Template visible page 4 additional KYC form UCC box
      pageIndex: 9,
      x: 410,
      y: 725,
      size: 9,
      text: String(clientCode).trim(),
    },
    {
      // Template visible page 9 nomination header UCC box
      pageIndex: 14,
      x: 237,
      y: 724,
      size: 9,
      text: String(clientCode).trim(),
    },
  ];
};

const getClientCodeOverlays = (application) =>
  [getUniqueClientCodeOverlay(application), ...getDematUccOverlays(application)].filter(Boolean);

module.exports = {
  getClientCodeOverlays,
};
