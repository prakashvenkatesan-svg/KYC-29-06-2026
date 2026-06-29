const getClientCodeOverlay = (application) => {
  return null;
};

const getClientCodeOverlays = (application) =>
  [getClientCodeOverlay(application)].filter(Boolean);

module.exports = {
  getClientCodeOverlays,
};
