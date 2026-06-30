const normalizeLowerText = (value) => String(value || "").trim().toLowerCase();
const {
  formatStateDisplayName,
  resolveStateName,
} = require("./districtResolverService");

const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const normalizeProvider = (value) => normalizeLowerText(value);

const resolveVerifiedIdentitySource = (application) => {
  const digilocker = application.digilocker_details || {};
  const kra = application.kra_details || {};
  const identity =
    application.identity_details || application.identity_verifications || {};

  const identityProvider = normalizeProvider(identity.provider);
  const digilockerProvider = normalizeProvider(digilocker.provider);
  const hasKraData = Boolean(
    String(kra.app_name || "").trim() ||
      String(kra.app_cor_add1 || "").trim() ||
      String(kra.app_cor_city || "").trim() ||
      String(kra.app_cor_state || "").trim() ||
      String(kra.app_cor_pincd || "").trim(),
  );

  if (
    identityProvider === "digilocker" ||
    digilockerProvider === "digilocker"
  ) {
    return "digilocker";
  }

  if (
    identityProvider === "kra" ||
    identityProvider === "cvlkra"
  ) {
    return "kra";
  }

  if (hasKraData) {
    return "kra";
  }

  return "identity";
};

const normalizeGenderLabel = (value) => {
  const normalized = normalizeLowerText(value);

  if (normalized === "m" || normalized === "male") return "Male";
  if (normalized === "f" || normalized === "female") return "Female";
  if (normalized === "t" || normalized === "transgender") return "Transgender";

  return String(value || "").trim();
};

const getLastFourDigits = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? digits.slice(-4) : "";
};

const getMaskedAadhaarValue = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  const lastFourDigits = getLastFourDigits(rawValue);
  return lastFourDigits ? `xxxxxxxx${lastFourDigits}` : "";
};

const formatDateDisplay = (value) => {
  const raw = String(value || "").trim();

  if (!raw) return "";

  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(raw)) {
    return raw.replace(/\//g, "-");
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-");
    return `${day}-${month}-${year}`;
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

const formatDatePart = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatTimePart = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

const wrapText = (value, maxLength = 36) => {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const words = normalized.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length <= maxLength) {
      currentLine = nextLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const dedupeAddressParts = (values = []) => {
  const seen = new Set();

  return values.filter((value) => {
    const normalizedValue = String(value || "").trim();

    if (!normalizedValue) {
      return false;
    }

    const dedupeKey = normalizedValue.toUpperCase();
    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
};

const buildSecondaryAddressLine = (...values) =>
  dedupeAddressParts(
    values
      .flatMap((value) => String(value || "").split(","))
      .map((part) => part.trim())
      .filter(Boolean),
  ).join(", ");

const isSameAddressPart = (left, right) =>
  String(left || "").trim().toUpperCase() === String(right || "").trim().toUpperCase();

const resolveKraStateDisplayName = (...values) =>
  formatStateDisplayName(
    resolveStateName({
      stateCode: values.find((value) => /^\d{1,3}$/.test(String(value || "").trim())) || "",
      stateName: values.find((value) => /[A-Za-z]/.test(String(value || "").trim())) || "",
    }),
  );

const buildKraAddressText = (kra = {}, identity = {}) => {
  const correspondenceState = resolveKraStateDisplayName(
    kra.app_cor_state,
    kra.app_per_state,
    identity.state,
  );
  const correspondenceAddress = [
    kra.app_cor_add1,
    kra.app_cor_add2,
    kra.app_cor_add3,
    kra.app_cor_city,
    correspondenceState,
    kra.app_cor_pincd,
    kra.app_cor_ctry,
  ];
  const correspondenceAddressText = dedupeAddressParts(correspondenceAddress)
    .join(", ");

  if (correspondenceAddressText) {
    return correspondenceAddressText;
  }

  const permanentState = resolveKraStateDisplayName(
    kra.app_per_state,
    kra.app_cor_state,
    identity.state,
  );
  const permanentAddress = [
    kra.app_per_add1,
    kra.app_per_add2,
    kra.app_per_add3,
    kra.app_per_city,
    permanentState,
    kra.app_per_pincd,
    kra.app_per_ctry,
  ];
  const permanentAddressText = dedupeAddressParts(permanentAddress)
    .join(", ");

  if (permanentAddressText) {
    return permanentAddressText;
  }

  return [
    identity.address_1,
    identity.address_2,
    identity.state,
    identity.pincode,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
};

const buildKraAddressLines = (kra = {}, identity = {}) => {
  const correspondenceState = resolveKraStateDisplayName(
    kra.app_cor_state,
    kra.app_per_state,
    identity.state,
  );
  const correspondenceSecondaryLine = buildSecondaryAddressLine(
    kra.app_cor_add2,
    kra.app_cor_add3,
  );
  const correspondenceLines = [
    firstNonEmpty(kra.app_cor_add1),
    correspondenceSecondaryLine,
    dedupeAddressParts([
      isSameAddressPart(correspondenceSecondaryLine, kra.app_cor_city)
        ? ""
        : kra.app_cor_city,
      correspondenceState,
      kra.app_cor_pincd,
    ]).join(", "),
  ].filter((value) => String(value || "").trim() !== "");

  if (correspondenceLines.length > 0) {
    return correspondenceLines;
  }

  const permanentState = resolveKraStateDisplayName(
    kra.app_per_state,
    kra.app_cor_state,
    identity.state,
  );
  const permanentSecondaryLine = buildSecondaryAddressLine(
    kra.app_per_add2,
    kra.app_per_add3,
  );
  const permanentLines = [
    firstNonEmpty(kra.app_per_add1),
    permanentSecondaryLine,
    dedupeAddressParts([
      isSameAddressPart(permanentSecondaryLine, kra.app_per_city)
        ? ""
        : kra.app_per_city,
      permanentState,
      kra.app_per_pincd,
    ]).join(", "),
  ].filter((value) => String(value || "").trim() !== "");

  if (permanentLines.length > 0) {
    return permanentLines;
  }

  return [
    firstNonEmpty(identity.address_1),
    firstNonEmpty(identity.address_2),
    [identity.state, identity.pincode]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(", "),
  ].filter((value) => String(value || "").trim() !== "");
};

const getAddressSegments = (identity = {}) => {
  const addressLine1Parts = String(identity.address_1 || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const landmark =
    addressLine1Parts.length > 0
      ? addressLine1Parts[addressLine1Parts.length - 1]
      : "";

  const locality =
    addressLine1Parts.length > 1
      ? addressLine1Parts.slice(0, addressLine1Parts.length - 1).join(", ")
      : "";

  return {
    landmark,
    locality,
    cityDistrict: String(identity.address_2 || "").trim(),
    state: String(identity.state || "").trim(),
    pincode: String(identity.pincode || "").trim(),
  };
};

const buildDigiLockerSummaryFields = (application) => {
  const digilocker = application.digilocker_details || {};
  const identity =
    application.identity_details || application.identity_verifications || {};

  if (resolveVerifiedIdentitySource(application) !== "digilocker") {
    return {};
  }

  const addressSegments = getAddressSegments(identity);
  const generatedAt = firstNonEmpty(digilocker.updated_at, digilocker.created_at);

  return {
    "Document Type":
      "e-Aadhaar generated from DigiLocker verified Aadhaar XML",
    "Generation date": formatDatePart(generatedAt),
    "Download Date": formatDatePart(generatedAt),
    "Masked Aadhaar": getMaskedAadhaarValue(digilocker.aadhaar_number_masked),
    Name: String(digilocker.name || "").trim(),
    "Date of Birth": formatDateDisplay(digilocker.dob),
    Gender: normalizeGenderLabel(digilocker.gender),
    "C/O, S/O, D/O": String(digilocker.father_name || "").trim(),
    Address: "",
    Landmark: addressSegments.landmark,
    Locality: "",
    "City/District": addressSegments.cityDistrict,
    Pincode: addressSegments.pincode,
    State: addressSegments.state,
  };
};

const buildKraSummaryFields = (application) => {
  const digilocker = application.digilocker_details || {};
  const kra = application.kra_details || {};
  const identity =
    application.identity_details || application.identity_verifications || {};

  const hasAnyDigiLockerData = Boolean(
    String(digilocker.provider || "").trim() ||
      String(digilocker.name || "").trim() ||
      String(digilocker.aadhaar_number_masked || "").trim() ||
      String(digilocker.address || "").trim(),
  );

  if (
    resolveVerifiedIdentitySource(application) !== "kra" ||
    hasAnyDigiLockerData
  ) {
    return {};
  }

  const applicantName = firstNonEmpty(kra.app_name, identity.full_name);
  const gender = normalizeGenderLabel(
    firstNonEmpty(kra.app_gen, identity.gender),
  );
  const dob = formatDateDisplay(
    firstNonEmpty(kra.app_dob_incorp, identity.provider_dob, identity.dob),
  );
  const addressLines = buildKraAddressLines(kra, identity);
  const generatedOn = formatDateDisplay(new Date());

  return {
    NAME: String(applicantName || "").trim(),
    "DATE OF BIRTH": dob,
    GENDER: gender,
    ADDRESS: addressLines.join("\n"),
    "PROOF OF ADDRESS POA": "KRA",
    "PROOF OF IDENTITY POI": "PAN",
    "GENERATED ON": generatedOn,
  };
};

const buildDigiLockerSummaryAddressOverlays = (application) => {
  const digilocker = application.digilocker_details || {};

  if (resolveVerifiedIdentitySource(application) !== "digilocker") {
    return [];
  }

  const addressLines = wrapText(digilocker.address, 24).slice(0, 3);

  return addressLines.map((line, index) => ({
    pageIndex: 3,
    x: 205,
    y: 590 - index * 14,
    size: 8,
    text: line,
  }));
};

const buildDigiLockerSummaryImageOverlays = (application) => {
  const digilocker = application.digilocker_details || {};

  if (resolveVerifiedIdentitySource(application) !== "digilocker") {
    return [];
  }

  if (!String(digilocker.photo_base64 || "").trim()) {
    return [];
  }

  return [
    {
      kind: "fieldImage",
      fieldName: "Photo_af_image",
      imageBase64: String(digilocker.photo_base64 || "").trim(),
      padding: 2,
    },
  ];
};

const buildKraSummaryPageOverlays = ({
  pageIndex,
  applicantName,
  dob,
  gender,
  addressLines,
  generatedOn,
  includeHeaderFields = true,
  addressStartY = 235,
  poaY = 182,
  poiY = 126,
  generatedOnY = 70,
}) => [
  ...(includeHeaderFields
    ? [
        {
          pageIndex,
          x: 184,
          y: 541,
          size: 9,
          text: String(applicantName || "").trim(),
        },
        {
          pageIndex,
          x: 184,
          y: 484,
          size: 9,
          text: dob,
        },
        {
          pageIndex,
          x: 184,
          y: 429,
          size: 9,
          text: gender,
        },
      ]
    : []),
  ...addressLines.slice(0, 4).map((line, index) => ({
    pageIndex,
    x: 190,
    y: addressStartY - index * 20,
    size: 10,
    text: line,
  })),
  {
    pageIndex,
    x: 196,
    y: poaY,
    size: 10,
    text: "KRA",
  },
  {
    pageIndex,
    x: 196,
    y: poiY,
    size: 10,
    text: "PAN",
  },
  {
    pageIndex,
    x: 196,
    y: generatedOnY,
    size: 10,
    text: generatedOn,
  },
];

const buildKraSummaryOverlays = (application) => {
  const digilocker = application.digilocker_details || {};
  const kra = application.kra_details || {};
  const identity =
    application.identity_details || application.identity_verifications || {};

  const hasAnyDigiLockerData = Boolean(
    String(digilocker.provider || "").trim() ||
      String(digilocker.name || "").trim() ||
      String(digilocker.aadhaar_number_masked || "").trim() ||
      String(digilocker.address || "").trim(),
  );

  if (
    resolveVerifiedIdentitySource(application) !== "kra" ||
    hasAnyDigiLockerData
  ) {
    return [];
  }

  const applicantName = firstNonEmpty(kra.app_name, identity.full_name);
  const fatherName = firstNonEmpty(kra.app_f_name, identity.father_name);
  const gender = normalizeGenderLabel(firstNonEmpty(kra.app_gen, identity.gender));
  const dob = formatDateDisplay(firstNonEmpty(kra.app_dob_incorp, identity.provider_dob, identity.dob));
  const address = buildKraAddressText(kra, identity);
  const resolvedAddressLines = buildKraAddressLines(kra, identity);
  const addressLines =
    resolvedAddressLines.length > 0
      ? resolvedAddressLines
      : wrapText(address, 52);
  const generatedOn = formatDateDisplay(new Date());

  if (String(application.id || "") === "24") {
    console.log("KRA PDF debug application 24:", {
      resolvedSource: resolveVerifiedIdentitySource(application),
      identityAddress1: identity.address_1 || "",
      identityAddress2: identity.address_2 || "",
      identityState: identity.state || "",
      identityPincode: identity.pincode || "",
      kraCorAdd1: kra.app_cor_add1 || "",
      kraCorAdd2: kra.app_cor_add2 || "",
      kraCorAdd3: kra.app_cor_add3 || "",
      kraCorCity: kra.app_cor_city || "",
      kraCorState: kra.app_cor_state || "",
      kraCorPincode: kra.app_cor_pincd || "",
      finalAddress: address,
      finalAddressLines: addressLines,
    });
  }

  if (
    !applicantName &&
    !gender &&
    !dob &&
    !address &&
    !fatherName
  ) {
    return [];
  }

  return [
    
  ];
};

const getVerifiedIdentityDocumentFields = (application) => ({
  ...buildDigiLockerSummaryFields(application),
  ...buildKraSummaryFields(application),
});

const getVerifiedIdentityDocumentClearFields = (application) => {
  if (resolveVerifiedIdentitySource(application) === "digilocker") {
    return [];
  }

  return [
    "Document Type",
    "Generation date",
    "Download Date",
    "Masked Aadhaar",
    "Name",
    "Date of Birth",
    "Gender",
    "C/O, S/O, D/O",
    "Address",
    "Landmark",
    "Locality",
    "City/District",
    "Pincode",
    "State",
    "ADDRESS",
    "DATE OF BIRTH",
    "GENDER",
    "GENERATED ON",
    "PROOF OF ADDRESS POA",
    "PROOF OF IDENTITY POI",
  ];
};

const getVerifiedIdentityDocumentOverlays = (application) => [
  ...buildDigiLockerSummaryImageOverlays(application),
  ...buildDigiLockerSummaryAddressOverlays(application),
  ...buildKraSummaryOverlays(application),
];

module.exports = {
  getVerifiedIdentityDocumentClearFields,
  getVerifiedIdentityDocumentFields,
  getVerifiedIdentityDocumentOverlays,
};
