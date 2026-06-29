const path = require("path");

const RESIDENT_INDIVIDUAL_CHECK_OVERLAY = {
  kind: "check",
  pageIndex: 4,
  x: 149.236,
  y: 787.418,
  width: 8.437,
  height: 8.437,
  thickness: 1.2,
};

const V3_RESIDENT_INDIVIDUAL_CHECK_OVERLAY = {
  kind: "check",
  pageIndex: 0,
  x: 152.1,
  y: 486.0,
  width: 10.2,
  height: 9.2,
  thickness: 1.7,
};

const isTemplateV3 = () =>
  path
    .basename(
      String(
        process.env.ACCOUNT_OPENING_FORM_TEMPLATE_PATH ||
          "account_opening_form_v2.pdf",
      ).trim(),
    )
    .toLowerCase() === "account_opening_form_v3.pdf";

const getDefaultSelectionOverlays = () =>
  isTemplateV3()
    ? []
    : [RESIDENT_INDIVIDUAL_CHECK_OVERLAY];

module.exports = {
  getDefaultSelectionOverlays,
};
