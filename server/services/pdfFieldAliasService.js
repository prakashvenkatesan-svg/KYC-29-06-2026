const path = require("path");

const TEMPLATE_FILE_NAME = "account_opening_form_v2.pdf";

const getActiveTemplateFileName = () =>
  path.basename(
    String(
      process.env.ACCOUNT_OPENING_FORM_TEMPLATE_PATH || TEMPLATE_FILE_NAME,
    ).trim(),
  ).toLowerCase();

const isTemplateV3 = () => getActiveTemplateFileName() === "account_opening_form_v3.pdf";

const getApplicantPhotoFieldName = () =>
  isTemplateV3() ? "Client Photo_af_image" : "Photo";

const getApplicantSignatureFieldName = () =>
  isTemplateV3() ? "Client Signature_af_image" : "";

const parseOverlayBox = (rawValue) => {
  const [page, x, y, width, height] = String(rawValue || "")
    .split(",")
    .map((part) => part.trim());

  const pageIndex = Number(page) - 1;
  const xCoordinate = Number(x);
  const yCoordinate = Number(y);
  const overlayWidth = Number(width);
  const overlayHeight = Number(height);

  if (
    Number.isNaN(pageIndex) ||
    Number.isNaN(xCoordinate) ||
    Number.isNaN(yCoordinate) ||
    Number.isNaN(overlayWidth) ||
    Number.isNaN(overlayHeight)
  ) {
    return null;
  }

  return {
    kind: "image",
    pageIndex,
    x: xCoordinate,
    y: yCoordinate,
    width: overlayWidth,
    height: overlayHeight,
    padding: 2,
  };
};

const parsePanCardOverlayConfig = () =>
  parseOverlayBox(
    process.env.ACCOUNT_OPENING_PAN_CARD_OVERLAY || "3,120,610,320,180",
  );

const parseSignatureOverlayConfig = () => {
  const rawValue = String(
    process.env.ACCOUNT_OPENING_SIGNATURE_OVERLAY || "",
  ).trim();

  if (!rawValue) {
    return null;
  }

  return parseOverlayBox(rawValue);
};

const parseDeclarationSignatureOverlayConfig = () =>
  parseOverlayBox(
    process.env.ACCOUNT_OPENING_DECLARATION_SIGNATURE_OVERLAY ||
      "9,522,28,70,132",
  );

const getV3TopPanOverlay = (panNumber = "") => {
  if (!isTemplateV3() || !String(panNumber || "").trim()) {
    return null;
  }

  return {
    pageIndex: 0,
    x: 86,
    y: 642,
    size: 10,
    text: String(panNumber || "").trim().toUpperCase(),
  };
};

const getV3HolderPanOverlay = (panNumber = "") => {
  if (!isTemplateV3() || !String(panNumber || "").trim()) {
    return null;
  }

  return {
    pageIndex: 9,
    x: 120.09,
    y: 463.7,
    size: 9,
    text: String(panNumber || "").trim().toUpperCase(),
  };
};

const getV3HolderUidOverlay = (aadhaarValue = "") => {
  if (!isTemplateV3() || !String(aadhaarValue || "").trim()) {
    return null;
  }

  return {
    pageIndex: 9,
    x: 342.49,
    y: 464.4,
    size: 9,
    text: String(aadhaarValue || "").trim(),
  };
};

const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const splitValueAcrossFields = (value, fieldNames = [], options = {}) => {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  const preferredFieldIndex = Number(options.preferredFieldIndex);

  if (!normalized || fieldNames.length === 0) {
    return {};
  }

  if (
    fieldNames.length > 1 &&
    !Number.isNaN(preferredFieldIndex) &&
    preferredFieldIndex >= 0 &&
    preferredFieldIndex < fieldNames.length
  ) {
    return Object.fromEntries(
      fieldNames.map((fieldName, index) => [
        fieldName,
        index === preferredFieldIndex ? normalized : "",
      ]),
    );
  }

  const words = normalized.split(" ");
  const segments = new Array(fieldNames.length).fill("");

  if (words.length <= fieldNames.length) {
    words.forEach((word, index) => {
      segments[index] = word;
    });
  } else {
    const baseSize = Math.floor(words.length / fieldNames.length);
    const remainder = words.length % fieldNames.length;
    let cursor = 0;

    fieldNames.forEach((_, index) => {
      const partSize = baseSize + (index < remainder ? 1 : 0);
      segments[index] = words.slice(cursor, cursor + partSize).join(" ");
      cursor += partSize;
    });
  }

  return Object.fromEntries(
    fieldNames.map((fieldName, index) => [fieldName, segments[index] || ""]),
  );
};

const V3_REPEATED_FIELD_ALIASES = {
  applicant_name: [
    "NAME OF THE APPLICANT",
    "Client Name",
    "CLIENT NAME",
  ],
  father_name: [
    "2 A FATHERS/SPOUSE NAME",
    "FATHERS/SPOUSE NAME",
  ],
  dob: [
    "3 C DATE OF BIRTH",
    "Date of Birth",
    "DATE OF BIRTH",
    "FathersSpouses Name 2",
  ],
  gender_text: [
    "GENDER",
  ],
  pan_number: [
    "PAN NUMBER",
    "5 A PAN",
  ],
  aadhaar_masked: [
    "5 B AADHAAR NO",
  ],
  client_code: [
    "UCC",
    "Client UCC",
    "CLIENT ID",
    "CLIENT CODE UCC",
    "UCC ALLOCATED TO THE CLIENT",
  ],
  mobile: [
    "MOBILE NUMBER",
    "Mobile No",
    "Mobile Number",
  ],
  email: [
    "EMAIL",
    "EMAIL ID",
    "IF ECN SPECIFY YOUR EMAIL ID",
  ],
  correspondence_line_1: [
    "1 ADDRESS FOR CORRESPONDENCRESIDENCERow1",
    "Line 1",
    "Line 1 1",
  ],
  correspondence_line_2: [
    "1 ADDRESS FOR CORRESPONDENCRESIDENCERow2",
    "Line 2",
    "Line 1 2",
  ],
  city: [
    "CITY",
    "CITY1",
    "City/Town/Village",
    "City/Town/Village*",
    "City/Town/Village 1",
    "City/Town/Village* 1",
    "CityTownVillage 1",
    "TownVillage 1",
  ],
  district: [
    "DISTRICT",
    "DISTRICT1",
    "District",
    "District_2",
  ],
  state: [
    "STATE",
    "STATE1",
    "City/Town/Village 2",
    "City/Town/Village* 2",
    "CityTownVillage 2",
    "TownVillage 2",
  ],
  country: [
    "COUNTRY",
    "COUNTRY1",
    "Country",
    "Country_2",
  ],
  pincode: [
    "PIN CODE",
    "Pin Code",
    "PINCODE",
    "PIN CODE_2",
    "Pin Code_2",
    "PINCODE1",
  ],
};

const getRepeatedFieldAliases = () =>
  isTemplateV3() ? V3_REPEATED_FIELD_ALIASES : {};

const buildRepeatedFieldValues = (canonicalValues = {}) => {
  const repeatedFields = {};
  const aliasMap = getRepeatedFieldAliases();

  for (const [canonicalKey, fieldNames] of Object.entries(aliasMap)) {
    const value = firstNonEmpty(canonicalValues[canonicalKey]);

    if (String(value || "").trim() === "") {
      continue;
    }

    for (const fieldName of fieldNames) {
      repeatedFields[fieldName] = value;
    }
  }

  if (isTemplateV3()) {
    Object.assign(
      repeatedFields,
      splitValueAcrossFields(canonicalValues.applicant_name, [
        "1",
        "1_2",
        "1_3",
        "1_4",
      ], { preferredFieldIndex: 1 }),
    );

    Object.assign(
      repeatedFields,
      splitValueAcrossFields(canonicalValues.father_name, [
        "3",
        "3_2",
        "3_3",
      ], { preferredFieldIndex: 0 }),
    );

    const mobileNumber = firstNonEmpty(canonicalValues.mobile);
    if (mobileNumber) {
      repeatedFields["Mobile No"] = "";
      repeatedFields["1_9"] = mobileNumber;
      repeatedFields["TEL.NUMBER"] = "";
      repeatedFields["1-10"] = "";
    }

    const aadhaarMasked = firstNonEmpty(canonicalValues.aadhaar_masked);
    if (aadhaarMasked) {
      repeatedFields["1_5"] = aadhaarMasked;
      repeatedFields["2_5"] = "";
      repeatedFields["1_6"] = "";
      repeatedFields["2_6"] = "";
      repeatedFields["undefined_2"] = "";
      repeatedFields["any document notified by Central Government"] = "";
      repeatedFields["Identification Number"] = "";
    }
  }

  return repeatedFields;
};

const getTemplateCompatibilityOverlays = ({
  identityApplicantName = "",
  identityFatherName = "",
  panNumber = "",
  aadhaarValue = "",
  applicantPhotoBase64 = "",
  applicantPhotoPath = "",
  panCardImagePath = "",
  signatureImagePath = "",
} = {}) =>
  [
    isTemplateV3()
      ? null
      : {
          pageIndex: 8,
          x: 163,
          y: 761,
          size: 9,
          text: String(identityApplicantName || "").trim().toUpperCase(),
        },
    isTemplateV3()
      ? null
      : {
          pageIndex: 8,
          x: 174,
          y: 747,
          size: 9,
          text: String(identityFatherName || "").trim().toUpperCase(),
        },
    {
      pageIndex: 8,
      x: 78,
      y: 621,
      size: 8,
      text: isTemplateV3() ? "" : String(panNumber || "").trim().toUpperCase(),
    },
    {
      pageIndex: 8,
      x: 325,
      y: 622,
      size: 8,
      text: isTemplateV3() ? "" : String(aadhaarValue || "").trim(),
    },
    {
      kind: "fieldImage",
      fieldName: getApplicantPhotoFieldName(),
      imageBase64: String(applicantPhotoBase64 || "").trim(),
      imagePath: String(applicantPhotoPath || "").trim(),
      padding: 2,
    },
    isTemplateV3() && String(signatureImagePath || "").trim()
      ? {
          kind: "fieldImage",
          fieldName: getApplicantSignatureFieldName(),
          imagePath: String(signatureImagePath || "").trim(),
          padding: 2,
        }
      : null,
    isTemplateV3() &&
    String(signatureImagePath || "").trim() &&
    parseDeclarationSignatureOverlayConfig()
      ? {
          ...parseDeclarationSignatureOverlayConfig(),
          imagePath: String(signatureImagePath || "").trim(),
        }
      : null,
    String(panCardImagePath || "").trim() && parsePanCardOverlayConfig()
      ? {
          ...parsePanCardOverlayConfig(),
          imagePath: String(panCardImagePath || "").trim(),
        }
      : null,
    !isTemplateV3() &&
    String(signatureImagePath || "").trim() &&
    parseSignatureOverlayConfig()
        ? {
            ...parseSignatureOverlayConfig(),
            imagePath: String(signatureImagePath || "").trim(),
          }
        : null,
    getV3TopPanOverlay(panNumber),
    getV3HolderPanOverlay(panNumber),
    getV3HolderUidOverlay(aadhaarValue),
  ].filter(
    (overlay) =>
      overlay &&
      (overlay.kind === "image" ||
        overlay.kind === "fieldImage" ||
        overlay.kind === "check" ||
        overlay.text),
  );

module.exports = {
  TEMPLATE_FILE_NAME,
  buildRepeatedFieldValues,
  getTemplateCompatibilityOverlays,
};
