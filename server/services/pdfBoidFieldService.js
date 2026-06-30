const parseConfiguredFieldNames = (value) =>
  String(value || "")
    .split(",")
    .map((fieldName) => fieldName.trim())
    .filter(Boolean);

const getRepeatedBoidFieldNames = () => {
  const configuredFieldNames = parseConfiguredFieldNames(
    process.env.ACCOUNT_OPENING_BOID_REPEAT_FIELD_NAMES,
  );

  if (configuredFieldNames.length > 0) {
    return configuredFieldNames;
  }

  return [];
};

const parseCoordinateConfig = (value) => {
  const [page, x, y, size] = String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!page || !x || !y) {
    return null;
  }

  const pageIndex = Number(page) - 1;
  const xCoordinate = Number(x);
  const yCoordinate = Number(y);
  const fontSize = Number(size || 10);

  if (
    Number.isNaN(pageIndex) ||
    Number.isNaN(xCoordinate) ||
    Number.isNaN(yCoordinate) ||
    Number.isNaN(fontSize)
  ) {
    return null;
  }

  return {
    pageIndex,
    x: xCoordinate,
    y: yCoordinate,
    size: fontSize,
  };
};

const parseCoordinateConfigs = (value) =>
  String(value || "")
    .split("|")
    .map((part) => parseCoordinateConfig(part))
    .filter(Boolean);

const getDpIdFromBoid = (boid = "") => {
  const normalizedBoid = String(boid || "").replace(/\D/g, "");

  if (normalizedBoid.length < 8) {
    return "";
  }

  return normalizedBoid.slice(0, 8);
};

const getClientIdFromBoid = (boid = "") => {
  const normalizedBoid = String(boid || "").replace(/\D/g, "");

  if (normalizedBoid.length < 16) {
    return "";
  }

  return normalizedBoid.slice(-8);
};

const buildBoidPdfFields = (application) => {
  const boid = String(application?.boid || "").trim();
  const dpId = getDpIdFromBoid(boid);
  const clientId = getClientIdFromBoid(boid);

  const fieldNames = parseConfiguredFieldNames(
    process.env.ACCOUNT_OPENING_BOID_FIELD_NAMES,
  );
  const repeatedFieldNames = getRepeatedBoidFieldNames();
  const fields = [...new Set([...fieldNames, ...repeatedFieldNames])].reduce(
    (accumulator, fieldName) => {
      if (boid) {
        accumulator[fieldName] = boid;
      }
      return accumulator;
    },
    {},
  );

  if (boid) {
    fields.BOID = boid;
    fields["BENEFICIARY ACCOUNT NOCDSL"] = boid;
  }

  if (dpId) {
    fields["DP ID"] = dpId;
  }

  if (clientId) {
    fields["DP ID CLIENT ID"] = clientId;
  }

  return fields;
};

const getBoidOverlayConfigs = (application) => {
  const boid = String(application?.boid || "").trim();
  const dpId = getDpIdFromBoid(boid);
  const clientId = getClientIdFromBoid(boid);

  const configuredValue =
    process.env.ACCOUNT_OPENING_BOID_OVERLAYS ||
    process.env.ACCOUNT_OPENING_BOID_OVERLAY ||
    "";

  const configuredOverlays = parseCoordinateConfigs(configuredValue).map((overlay) => ({
    ...overlay,
    text: boid,
  }));

  const nominationOverlays = [];

  if (dpId) {
    nominationOverlays.push({
      // Template visible page 9 nomination header DP ID box
      pageIndex: 14,
      x: 365,
      y: 724,
      size: 9,
      text: dpId,
    });
  }

  if (clientId) {
    nominationOverlays.push({
      // Template visible page 9 nomination header Client ID box
      pageIndex: 14,
      x: 487,
      y: 724,
      size: 9,
      text: clientId,
    });
  }

  return [...configuredOverlays, ...nominationOverlays];
};

const getBoidOverlayConfig = (application) =>
  getBoidOverlayConfigs(application)[0] || null;

module.exports = {
  buildBoidPdfFields,
  getBoidOverlayConfigs,
  getBoidOverlayConfig,
};
