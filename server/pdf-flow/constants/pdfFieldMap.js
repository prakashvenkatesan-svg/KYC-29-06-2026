const {
  buildBoidPdfFields,
  getBoidOverlayConfigs,
} = require("../../services/pdfBoidFieldService");
const {
  getOccupationPdfValue,
} = require("../../services/pdfOccupationFieldService");
const {
  buildPdfAddressFields,
} = require("../../services/pdfAddressFieldService");
const {
  getDefaultSelectionOverlays,
} = require("../../services/pdfDefaultSelectionService");
const {
  getContactOverlays,
} = require("../../services/pdfContactOverlayService");
const {
  getClientCodeOverlays,
} = require("../../services/pdfClientCodeOverlayService");
const {
  getBankIfscOverlays,
} = require("../../services/pdfBankOverlayService");
const {
  getApplicantNameOverlays,
} = require("../../services/pdfApplicantNameOverlayService");
const {
  buildRepeatedFieldValues,
  getTemplateCompatibilityOverlays,
} = require("../../services/pdfFieldAliasService");
const {
  formatStateDisplayName,
  resolveStateName,
} = require("../../services/districtResolverService");
const {
  getVerifiedIdentityDocumentClearFields,
  getVerifiedIdentityDocumentFields,
  getVerifiedIdentityDocumentOverlays,
} = require("../../services/pdfVerifiedIdentityOverlayService");

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDob = (value) => formatDate(value).replace(/\//g, "-");

const splitAddress = (address) => {
  const normalized = String(address || "")
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    line1: normalized.slice(0, 2).join(", "),
    line2: normalized.slice(2).join(", "),
  };
};

const getKraValue = (kra = {}, key = "") =>
  firstNonEmpty(
    kra?.[key],
    kra?.[String(key || "").toUpperCase()],
  );

const hasKraAddressData = (kra = {}) =>
  Boolean(
    firstNonEmpty(
      getKraValue(kra, "app_cor_add1"),
      getKraValue(kra, "app_cor_add2"),
      getKraValue(kra, "app_cor_add3"),
      getKraValue(kra, "app_cor_city"),
      getKraValue(kra, "app_cor_pincd"),
      getKraValue(kra, "app_per_add1"),
      getKraValue(kra, "app_per_add2"),
      getKraValue(kra, "app_per_add3"),
      getKraValue(kra, "app_per_city"),
      getKraValue(kra, "app_per_pincd"),
    ),
  );

const resolveKraStateDisplayName = (kra = {}, fallbackStateName = "") =>
  formatStateDisplayName(
    resolveStateName({
      stateCode: firstNonEmpty(
        getKraValue(kra, "app_cor_state"),
        getKraValue(kra, "app_per_state"),
      ),
      stateName: fallbackStateName,
    }),
  );

const extractKraLocalityFromAddressLines = (kra = {}) => {
  const addressLines = [
    getKraValue(kra, "app_cor_add3"),
    getKraValue(kra, "app_cor_add2"),
    getKraValue(kra, "app_cor_add1"),
    getKraValue(kra, "app_per_add3"),
    getKraValue(kra, "app_per_add2"),
    getKraValue(kra, "app_per_add1"),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  for (const line of addressLines) {
    const normalizedLine = line
      .replace(/\b\d{6}\b/g, "")
      .replace(/\bIndia\b/gi, "")
      .replace(/\bTamil Nadu\b/gi, "")
      .replace(/\bKarnataka\b/gi, "")
      .replace(/\bAndhra Pradesh\b/gi, "")
      .replace(/\bTelangana\b/gi, "")
      .replace(/\bKerala\b/gi, "")
      .replace(/\bMaharashtra\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalizedLine) {
      continue;
    }

    if (/[a-zA-Z]/.test(normalizedLine)) {
      return normalizedLine;
    }
  }

  return "";
};

const extractSixDigitPin = (value) => {
  const match = String(value || "").match(/\b(\d{6})\b/);
  return match ? match[1] : "";
};

const getNomineeAddressParts = (nominee = {}, fallbackAddressFields = {}) => {
  const addressText = String(nominee.nominee_address || "").trim();
  const sameAddress = Boolean(nominee.same_address);

  if (sameAddress) {
    return {
      address: buildFullName(
        fallbackAddressFields["1 ADDRESS FOR CORRESPONDENCRESIDENCERow1"] ||
          fallbackAddressFields.address_line_1,
        fallbackAddressFields["1 ADDRESS FOR CORRESPONDENCRESIDENCERow2"] ||
          fallbackAddressFields.address_line_2,
      ).trim(),
      city: fallbackAddressFields.CITY || "",
      state: fallbackAddressFields.STATE || "",
      pin: fallbackAddressFields["PIN CODE"] || "",
    };
  }

  const parts = String(addressText)
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);

  const pin = extractSixDigitPin(addressText);
  const stateCandidate = parts.length >= 1 ? parts[parts.length - 1].replace(pin, "").trim() : "";
  const cityCandidate = parts.length >= 2 ? parts[parts.length - 2].replace(pin, "").trim() : "";

  return {
    address: addressText,
    city: cityCandidate,
    state: stateCandidate,
    pin,
  };
};

const buildNomineeColumnFields = (nominee = {}, index, fallbackAddressFields = {}, fallbackBoid = "") => {
  if (!nominee || !String(nominee.nominee_name || nominee.pan || nominee.aadhaar || nominee.nominee_address || nominee.mobile || nominee.email || "").trim()) {
    return {};
  }

  const suffix = String(index);
  const addressParts = getNomineeAddressParts(nominee, fallbackAddressFields);
  const nomineeFields = {
    [`PAN${suffix}`]: nominee.pan || "",
    [`Aadhaar  Mask first 8 digit number${suffix}`]: getMaskedAadhaarValue(nominee.aadhaar),
    [`Other proof of identity${suffix}`]: "",
    [`Demat Account ID${suffix}`]: String(fallbackBoid || ""),
    [`Address${suffix}`]: addressParts.address,
    [`City${suffix}`]: addressParts.city,
    [`State${suffix}`]: addressParts.state,
    [`Pin${suffix}`]: addressParts.pin,
    [`Mobile noTelephone No${suffix}`]: nominee.mobile || "",
    [`Email ID${suffix}`]: nominee.email || "",
  };

  return nomineeFields;
};

const buildNomineeColumnCheckboxes = (nominee = {}, index) => {
  if (!nominee) {
    return {};
  }

  const proofType = normalizeLowerText(nominee.nominee_proof_type);

  if (index === 1) {
    return {
      "PAN-NOMINEE ID": proofType === "pan",
      "AADHAAR-NOMINEE ID": proofType === "aadhaar",
      "OTHER-NOMINEE ID": proofType === "other",
      "DEMAT ACC-NOMINEE ID": proofType.includes("demat"),
    };
  }

  if (index === 2) {
    return {
      "PAN-NOMINEE ID2": proofType === "pan",
      "AADHAAR-NOMINEE ID2": proofType === "aadhaar",
      "DEMAT ACC-NOMINEE ID2": proofType.includes("demat"),
    };
  }

  if (index === 3) {
    return {
      "PAN-NOMINEE ID3": proofType === "pan",
      "AADHAAR-NOMINEE ID3": proofType === "aadhaar",
      "DEMAT ACC-NOMINEE ID3": proofType.includes("demat"),
    };
  }

  return {};
};

const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const toUpperText = (value) => String(value || "").trim().toUpperCase();

const buildFullName = (...values) =>
  values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

const normalizeProvider = (value) => String(value || "").trim().toLowerCase();

const resolveVerifiedIdentitySource = ({ identity = {}, digilocker = {}, kra = {} }) => {
  const identityProvider = normalizeProvider(identity.provider);
  const digilockerProvider = normalizeProvider(digilocker.provider);

  if (identityProvider === "digilocker" || digilockerProvider === "digilocker") {
    return "digilocker";
  }

  if (
    identityProvider === "cvlkra" ||
    identityProvider === "kra" ||
    String(kra.app_name || "").trim() !== ""
  ) {
    return "kra";
  }

  return "identity";
};

const mapGenderToPdfValue = (gender) => {
  const normalized = String(gender || "").trim().toLowerCase();
  if (normalized === "male") return "/2";
  if (normalized === "female") return "/1";
  if (["others", "other", "transgender"].includes(normalized)) return "/0";
  return "";
};

const mapMaritalStatusToPdfValue = (maritalStatus) => {
  const normalized = String(maritalStatus || "").trim().toLowerCase();
  if (normalized === "single") return "/0";
  if (normalized === "married") return "/1";
  return "";
};

const mapBankAccountTypeToPdfValue = (accountType) => {
  const normalized = String(accountType || "").trim().toLowerCase();
  if (["savings", "saving"].includes(normalized)) return "/0";
  if (normalized === "current") return "/1";
  if (["others", "other", "salary", "salary account"].includes(normalized)) return "/2";
  return "";
};

const parseNumericAmount = (value) => {
  const numeric = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
};

const resolveAnnualIncomeBandFromNetWorth = (netWorth = "", annualIncome = "") => {
  const normalizedAnnualIncome = String(annualIncome || "").trim().toLowerCase();
  const normalizedNetWorth = String(netWorth || "").trim().toLowerCase();

  if (normalizedAnnualIncome.includes("below 1")) return "below_1_lac";
  if (normalizedAnnualIncome.includes("1-5")) return "1_to_5_lacs";
  if (normalizedAnnualIncome.includes("5-10")) return "5_to_10_lacs";
  if (normalizedAnnualIncome.includes("10-25")) return "10_to_25_lacs";
  if (normalizedAnnualIncome.includes(">25") || normalizedAnnualIncome.includes("above 25")) {
    return "above_25_lacs";
  }

  if (normalizedNetWorth.includes("below 1")) return "below_1_lac";
  if (normalizedNetWorth.includes("1-5")) return "1_to_5_lacs";
  if (normalizedNetWorth.includes("5-10")) return "5_to_10_lacs";
  if (normalizedNetWorth.includes("10-25")) return "10_to_25_lacs";
  if (normalizedNetWorth.includes(">25") || normalizedNetWorth.includes("above 25")) {
    return "above_25_lacs";
  }

  const amounts = String(netWorth || "")
    .split(/-|to/i)
    .map((part) => parseNumericAmount(part))
    .filter((value) => value !== null);

  const comparisonValue =
    amounts.length > 1 ? Math.max(...amounts) : amounts.length === 1 ? amounts[0] : null;

  if (comparisonValue === null) {
    return "";
  }

  if (comparisonValue < 100000) return "below_1_lac";
  if (comparisonValue <= 500000) return "1_to_5_lacs";
  if (comparisonValue <= 1000000) return "5_to_10_lacs";
  if (comparisonValue <= 2500000) return "10_to_25_lacs";
  return "above_25_lacs";
};

const isSavingsAccountType = (accountType) =>
  ["savings", "saving"].includes(String(accountType || "").trim().toLowerCase());

const isCurrentAccountType = (accountType) =>
  String(accountType || "").trim().toLowerCase() === "current";

const isOtherAccountType = (accountType) =>
  ["others", "other", "salary", "salary account"].includes(
    String(accountType || "").trim().toLowerCase(),
  );

const getLastFourDigits = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? digits.slice(-4) : "";
};

const hasAadhaarLastFourDigits = (value) => /\d{4}/.test(String(value || "").trim());

const getMaskedAadhaarValue = (value) => {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  const lastFourDigits = getLastFourDigits(rawValue);
  return lastFourDigits ? `xxxxxxxx${lastFourDigits}` : "";
};

const resolvePdfAadhaarValue = (...values) =>
  values.find((value) => hasAadhaarLastFourDigits(value)) ||
  values.find((value) => String(value || "").trim() !== "") ||
  "";

const resolveSourceBasedAadhaarValue = ({
  verifiedIdentitySource,
  personal = {},
  application = {},
  identity = {},
  digilocker = {},
}) => {
  if (verifiedIdentitySource === "digilocker") {
    return resolvePdfAadhaarValue(
      digilocker.aadhaar_number_masked,
      personal.maskedNumber,
      personal.aadhaar_number,
      application.aadhaar_number,
      identity.aadhaar_number,
    );
  }

  if (verifiedIdentitySource === "kra") {
    return resolvePdfAadhaarValue(
      identity.aadhaar_number,
      personal.aadhaar_number,
      application.aadhaar_number,
      personal.maskedNumber,
    );
  }

  return resolvePdfAadhaarValue(
    personal.aadhaar_number,
    application.aadhaar_number,
    identity.aadhaar_number,
    digilocker.aadhaar_number_masked,
    personal.maskedNumber,
  );
};

const normalizeLowerText = (value) => String(value || "").trim().toLowerCase();

const isFemaleGender = (value) => ["female", "f"].includes(normalizeLowerText(value));
const isMaleGender = (value) => ["male", "m"].includes(normalizeLowerText(value));
const isOtherGender = (value) =>
  ["transgender", "others", "other", "t", "o"].includes(normalizeLowerText(value));

const normalizeGenderLabel = (value) => {
  if (isMaleGender(value)) return "Male";
  if (isFemaleGender(value)) return "Female";
  if (isOtherGender(value)) return "Transgender";
  return String(value || "").trim();
};

const normalizeOccupationText = (value) => String(value || "").trim().toLowerCase();

const matchesOccupation = (occupation, expectedValues = []) =>
  expectedValues.includes(normalizeOccupationText(occupation));

const DEFAULT_COUNTRY_VALUE = "India";
const resolveSelectedScheme = (value) =>
  String(value || "").trim() === "annualCare" ? "annualCare" : "lifeTime";

const buildNonDigilockerVerifiedIdentityFieldOverrides = (
  verifiedIdentitySource,
) => {
  if (verifiedIdentitySource === "digilocker") {
    return {};
  }

  return {
    "Document Type": "",
    "Generation date": "",
    "Download Date": "",
    "Masked Aadhaar": "",
    Name: "",
    "Date of Birth": "",
    Gender: "",
    "C/O, S/O, D/O": "",
    Address: "",
    Landmark: "",
    Locality: "",
    "City/District": "",
    Pincode: "",
    State: "",
  };
};

const buildClientCodeFieldOverrides = (clientCode = "") => ({
  // Keep only dedicated client-code PDF fields populated.
  "Client UCC": String(clientCode || "").trim(),
});

const buildPdfFieldPayload = (application) => {
  const contact = application.contact_details || {};
  const personal = application.personal_details || {};
  const identity =
    application.identity_details || application.identity_verifications || {};
  const digilocker = application.digilocker_details || {};
  const kra = application.kra_details || {};
  const applicantPhoto = application.applicant_photo_details || {};
  const panCardUpload = application.pan_card_upload_details || {};
  const signatureUpload = application.signature_upload_details || {};
  const panVerification = application.pan_verification_details || {};
  const bank = application.bank_details || {};
  const clientCodeDetails = application.client_code_details || {};
  const nominees = Array.isArray(application.nominee_details) ? application.nominee_details : [];
  const selectedScheme = resolveSelectedScheme(application.selected_scheme);
  const primaryNominee = nominees[0] || {};
  const hasNominee = nominees.some(
    (nominee) =>
      String(
        nominee?.nominee_name ||
          nominee?.pan ||
          nominee?.aadhaar ||
          nominee?.nominee_address ||
          nominee?.mobile ||
          nominee?.email ||
          "",
      ).trim() !== "",
  );
  const verifiedIdentitySource = resolveVerifiedIdentitySource({
    identity,
    digilocker,
    kra,
  });

  const applicantName =
    verifiedIdentitySource === "digilocker"
      ? firstNonEmpty(digilocker.name, kra.app_name, identity.full_name, personal.full_name, contact.full_name)
      : verifiedIdentitySource === "kra"
        ? firstNonEmpty(kra.app_name, identity.full_name, personal.full_name, contact.full_name, digilocker.name)
        : firstNonEmpty(identity.full_name, personal.full_name, contact.full_name, digilocker.name, kra.app_name);

  const fatherName =
    verifiedIdentitySource === "digilocker"
      ? firstNonEmpty(digilocker.father_name, kra.app_f_name, personal.father_name)
      : verifiedIdentitySource === "kra"
        ? firstNonEmpty(kra.app_f_name, personal.father_name, digilocker.father_name)
        : firstNonEmpty(personal.father_name, kra.app_f_name, digilocker.father_name);

  const applicantGender =
    verifiedIdentitySource === "digilocker"
      ? firstNonEmpty(digilocker.gender, kra.app_gen, personal.gender)
      : verifiedIdentitySource === "kra"
        ? firstNonEmpty(kra.app_gen, personal.gender, digilocker.gender)
        : firstNonEmpty(personal.gender, digilocker.gender, kra.app_gen);

  const dob =
    verifiedIdentitySource === "digilocker"
      ? firstNonEmpty(digilocker.dob, kra.app_dob_incorp, identity.provider_dob, identity.dob, personal.dob)
      : verifiedIdentitySource === "kra"
        ? firstNonEmpty(kra.app_dob_incorp, personal.dob, identity.dob, digilocker.dob)
        : firstNonEmpty(personal.dob, identity.dob, digilocker.dob, kra.app_dob_incorp);

  const correspondenceAddress = splitAddress(
    verifiedIdentitySource === "kra"
      ? firstNonEmpty(
          hasKraAddressData(kra)
            ? buildFullName(
                getKraValue(kra, "app_cor_add1"),
                getKraValue(kra, "app_cor_add2"),
                getKraValue(kra, "app_cor_add3"),
              )
            : "",
          hasKraAddressData(kra)
            ? buildFullName(
                getKraValue(kra, "app_per_add1"),
                getKraValue(kra, "app_per_add2"),
                getKraValue(kra, "app_per_add3"),
              )
            : "",
          buildFullName(identity.address_1, identity.address_2),
          personal.aadhaar_address,
          digilocker.address,
        )
      : personal.aadhaar_address || digilocker.address || "",
  );
  const permanentAddress = splitAddress(personal.permanent_address || personal.aadhaar_address || "");
  const addressFields = buildPdfAddressFields(application);

  const panNumber = firstNonEmpty(
    personal.pan_number,
    identity.pan_number,
    panVerification.pan_number,
    application.pan_number,
    contact.pan_number,
  );
  const aadhaarNumber = resolveSourceBasedAadhaarValue({
    verifiedIdentitySource,
    personal,
    application,
    identity,
    digilocker,
  });
  const clientCode = firstNonEmpty(
    clientCodeDetails.client_code,
    application.client_code,
  );
  const annualIncomeBand = resolveAnnualIncomeBandFromNetWorth(
    personal.net_worth,
    personal.annual_income,
  );

  const missingFields = [];
  if (!applicantName) missingFields.push("applicant_name");
  if (!panNumber) missingFields.push("pan_number");
  if (!dob) missingFields.push("dob");

  const resolvedCorrespondenceCity =
    verifiedIdentitySource === "kra"
      ? firstNonEmpty(
          getKraValue(kra, "app_cor_city"),
          getKraValue(kra, "app_per_city"),
          identity.address_2,
          extractKraLocalityFromAddressLines(kra),
          addressFields.CITY,
          addressFields.DISTRICT,
        )
      : addressFields.CITY;
  const resolvedCorrespondenceState =
    verifiedIdentitySource === "kra"
      ? firstNonEmpty(
          resolveKraStateDisplayName(kra, addressFields.STATE),
          addressFields.STATE,
        )
      : addressFields.STATE;
  const resolvedCorrespondenceDistrict =
    verifiedIdentitySource === "kra"
      ? firstNonEmpty(
          getKraValue(kra, "app_corr_district"),
          getKraValue(kra, "app_perm_district"),
          addressFields.DISTRICT,
          identity.address_2,
        )
      : addressFields.DISTRICT;
  const resolvedCorrespondencePincode =
    verifiedIdentitySource === "kra"
      ? firstNonEmpty(
          getKraValue(kra, "app_cor_pincd"),
          getKraValue(kra, "app_per_pincd"),
          addressFields["PIN CODE"],
        )
      : addressFields["PIN CODE"];

  const nomineeAddressFallback = {
    "1 ADDRESS FOR CORRESPONDENCRESIDENCERow1": correspondenceAddress.line1,
    "1 ADDRESS FOR CORRESPONDENCRESIDENCERow2": correspondenceAddress.line2,
    CITY: resolvedCorrespondenceCity,
    STATE: resolvedCorrespondenceState,
    DISTRICT: resolvedCorrespondenceDistrict,
    "PIN CODE": resolvedCorrespondencePincode,
  };
  const placeValue = firstNonEmpty(
    resolvedCorrespondenceCity,
    resolvedCorrespondenceState,
    personal.country_of_birth,
  );

  const fields = {
    DATE: formatDate(new Date()),
    "Client UCC": clientCode,
    "CLIENT ID": clientCode,
    "CLIENT CODE UCC": clientCode,
    "UCC ALLOCATED TO THE CLIENT": clientCode,
    "PAN NUMBER": panNumber,
    "5 A PAN": panNumber,
    pancard: panNumber,
    "5 B AADHAAR NO": getMaskedAadhaarValue(aadhaarNumber),
    aadhaar: getMaskedAadhaarValue(aadhaarNumber),
    "3 C DATE OF BIRTH": formatDob(dob),
    "2 A FATHERS/SPOUSE NAME": "",
    "2 B MOTHERS NAME": toUpperText(personal.mother_name),
    Gender:
      verifiedIdentitySource === "digilocker"
        ? mapGenderToPdfValue(applicantGender)
        : "",
    MarriedStatus: mapMaritalStatusToPdfValue(personal.marital_status),
    "1 ADDRESS FOR CORRESPONDENCRESIDENCERow1": correspondenceAddress.line1,
    "1 ADDRESS FOR CORRESPONDENCRESIDENCERow2": correspondenceAddress.line2,
    CITY: resolvedCorrespondenceCity,
    "City/District": resolvedCorrespondenceCity,
    "CityTownVillage 1": resolvedCorrespondenceCity,
    "TownVillage 1": resolvedCorrespondenceCity,
    DISTRICT: resolvedCorrespondenceDistrict,
    District: resolvedCorrespondenceDistrict,
    STATE: resolvedCorrespondenceState,
    State: resolvedCorrespondenceState,
    "CityTownVillage 2": resolvedCorrespondenceState,
    "TownVillage 2": resolvedCorrespondenceState,
    COUNTRY: DEFAULT_COUNTRY_VALUE,
    "PIN CODE": resolvedCorrespondencePincode,
    "Pin Code": resolvedCorrespondencePincode,
    Pincode: resolvedCorrespondencePincode,
    PINCODE: resolvedCorrespondencePincode,
    "4 PERMANENT ADDRESS OF RESIDENT APPLICANT IF DIFFERENT FROM ABOVE B1 OR OVERSEAS ADDRESS MANDATORY FOR NONRESIDENT APPLICANTRow1":
      permanentAddress.line1,
    "4 PERMANENT ADDRESS OF RESIDENT APPLICANT IF DIFFERENT FROM ABOVE B1 OR OVERSEAS ADDRESS MANDATORY FOR NONRESIDENT APPLICANTRow2":
      permanentAddress.line2,
    LANDMARK_2: addressFields.LANDMARK_2,
    LANDMARK1: addressFields.LANDMARK_2,
    CITY_2: addressFields.CITY_2,
    CITY1: addressFields.CITY_2,
    DISTRICT_2: resolvedCorrespondenceDistrict,
    DISTRICT1: resolvedCorrespondenceDistrict,
    STATE_2: addressFields.STATE_2,
    STATE1: addressFields.STATE_2,
    COUNTRY_2: DEFAULT_COUNTRY_VALUE,
    COUNTRY1: DEFAULT_COUNTRY_VALUE,
    "PIN CODE_2": addressFields["PIN CODE_2"],
    "Pin Code_2": addressFields["PIN CODE_2"],
    PINCODE1: addressFields["PIN CODE_2"],
    "ACCOUNT NO": bank.account_number || "",
    "BANK NAME": bank.bank_name || "",
    "BRANCH ADDRESS": bank.branch_address || bank.bank_address || "",
    "IFSC CODE": bank.ifsc_code || "",
    "MOBILE NUMBER": contact.mobile_number || "",
    "Mobile Number": contact.mobile_number || "",
    "Mobile No": contact.mobile_number || "",
    "TEL.NUMBER": contact.mobile_number || "",
    EMAIL: contact.email || "",
    "IF ECN SPECIFY YOUR EMAIL ID": contact.email || "",
    "TEL OFFICE": "",
    "TEL RESIDENCE": "",
    email: contact.email || "",
    new_email: contact.email || "",
    "Email ID Optional Fields": contact.email || "",
    client_name: toUpperText(applicantName),
    clientname: toUpperText(applicantName),
    applicantname: toUpperText(applicantName),
    "NAME OF THE APPLICANT": toUpperText(applicantName),
    "BENEFICIARY NAMECDSL": toUpperText(applicantName),
    Name: verifiedIdentitySource === "digilocker" ? toUpperText(applicantName) : "",
    NAME: toUpperText(applicantName),
    "Sole  First Holders Name": toUpperText(applicantName),
    "SOLEFIRST HOLDERS NAME": toUpperText(applicantName),
    "NAME OF THE SOLEFIRST HOLDER": toUpperText(applicantName),
    "SOLEFIRST HOLDER NAME": toUpperText(applicantName),
    "Second Holders Name": "",
    "SECOND HOLDERS NAME": "",
    "NAME OF THE SECOND HOLDER": "",
    "SECOND HOLDER NAME": "",
    "s Name": "",
    "THIRD HOLDERS NAME": "",
    "NAME OF THE THIRD HOLDER": "",
    "THIRD HOLDER NAME": "",
    "The mobile number is registered in the name of": contact.mobile_number || "",
    NAME_OF_THE_APPLICANT: toUpperText(applicantName),
    "Networth in Rs": personal.net_worth || "",
    "Networth n Rs": personal.net_worth || "",
    "TRADING EXPERIENCE": personal.trading_experience || "",
    PLACE: placeValue,
    Place: placeValue,
    place: placeValue,
    "FIRST HOLDER City and Country of Birth": [addressFields.CITY, DEFAULT_COUNTRY_VALUE].filter(Boolean).join(", "),
    wealth3: "/2",
    professional: getOccupationPdfValue(personal.occupation),
    "a/c type": mapBankAccountTypeToPdfValue(bank.account_type) || "/0",
    "IWe instruct the DP to receive each and every credit in myour account If not marked the default option would be Yes": "/Yes",
    "IWe would like to instruct the DP to accept all the pledge instructions in myour account without any other further instruction from myour end": "/Yes_2",
    Group1: "/4",
    Group3: "/1",
    Group4: "/0",
    electric: "/0",
    "annual income": "/0",
    "a/c openning": "/2",
    Group_Scheme: selectedScheme === "annualCare" ? "Scheme 2" : "Scheme 1",
    "DETAILS OF 2ND NOMINEENAME OF THE NOMINEES MRMS": primaryNominee.nominee_name || "",
    "1st nominee name": primaryNominee.nominee_name || "",
    Address: "",
    City: primaryNominee.city || "",
    State: "",
    Pin: primaryNominee.pin || "",
    "Email ID Optional Fields_3": primaryNominee.email || "",
    "Mobile noTelephone No Optional Fields_3": primaryNominee.mobile || "",
      "Date of birth mandatory if Nominee is a minor": formatDate(primaryNominee.dob),
      LANDMARK: addressFields.LANDMARK,
      ...buildBoidPdfFields(application),
      ...buildNomineeColumnFields(nominees[0], 1, nomineeAddressFallback, application.boid),
      ...buildNomineeColumnFields(nominees[1], 2, nomineeAddressFallback, application.boid),
      ...buildNomineeColumnFields(nominees[2], 3, nomineeAddressFallback, application.boid),
    };

  Object.assign(
    fields,
    getVerifiedIdentityDocumentFields(application),
  );

  Object.assign(
    fields,
    buildRepeatedFieldValues({
      applicant_name: toUpperText(applicantName),
      father_name: toUpperText(fatherName),
      dob: formatDob(dob),
      gender_text: normalizeGenderLabel(applicantGender),
      pan_number: panNumber,
      aadhaar_masked: getMaskedAadhaarValue(aadhaarNumber),
      mobile: contact.mobile_number || "",
        email: contact.email || "",
        client_code: clientCode,
      correspondence_line_1: correspondenceAddress.line1,
      correspondence_line_2: correspondenceAddress.line2,
      city: resolvedCorrespondenceCity,
      district: resolvedCorrespondenceDistrict,
      state: resolvedCorrespondenceState,
      country: DEFAULT_COUNTRY_VALUE,
      pincode: resolvedCorrespondencePincode,
    }),
  );

  Object.assign(
    fields,
    buildNonDigilockerVerifiedIdentityFieldOverrides(verifiedIdentitySource),
  );

  Object.assign(
    fields,
    buildClientCodeFieldOverrides(clientCode),
  );

    const checkboxes = {
      "NEW KYC": true,
      Normal: verifiedIdentitySource !== "digilocker",
      Digilocker: verifiedIdentitySource === "digilocker",
      "Residential/Business": true,
      "Residential/Business1": true,
      ORIGINAL: true,
      "UID Adhaar": Boolean(aadhaarNumber),
      "Aadhaar Card": true,
    Male: isMaleGender(applicantGender),
    Female: isFemaleGender(applicantGender),
    Transgender: isOtherGender(applicantGender),
    Single: normalizeLowerText(personal.marital_status) === "single",
    Married: normalizeLowerText(personal.marital_status) === "married",
      Indian: true,
      "Resident Individual": true,
      "INDIVIDUAL-STATUS": true,
      "INDIVIDUAL RES-SUB STATUS": true,
      RI: true,
      YES1: true,
      NO1: false,
        "YES-INT TRADING": true,
        "NO-INT TRADING": false,
        "I/WE MONTHLY": false,
        "I/WE QUARTERLY": true,
        "PVT-OCC": matchesOccupation(personal.occupation, ["private sector"]),
        "PUB-OCC": matchesOccupation(personal.occupation, ["public sector"]),
        "GOV SER-OCC": matchesOccupation(personal.occupation, ["government service"]),
        "BUSINESS-OCC": matchesOccupation(personal.occupation, ["business"]),
        "PROFESSIONAL-OCC": matchesOccupation(personal.occupation, ["professional"]),
        "AGRI-OCC": matchesOccupation(personal.occupation, ["agriculturist"]),
        "RET-OCC": matchesOccupation(personal.occupation, ["retired", "salaried"]),
        "HOUSEWIFE-OCC": matchesOccupation(personal.occupation, ["housewife"]),
        "STUDENT-OCC": matchesOccupation(personal.occupation, ["student"]),
        "OTHERS-OCC": matchesOccupation(personal.occupation, ["other", "others"]),
        "BELOW 1 LAC-GAID": annualIncomeBand === "below_1_lac",
        "1-5 LAC-GAID": annualIncomeBand === "1_to_5_lacs",
        "5-10 LAC-GAID": annualIncomeBand === "5_to_10_lacs",
        "10-25 LAC-GAID": annualIncomeBand === "10_to_25_lacs",
        ">25 LAC-GAID": annualIncomeBand === "above_25_lacs",
        SAVINGS: isSavingsAccountType(bank.account_type),
        CURRENT: isCurrentAccountType(bank.account_type),
        OTHERS: isOtherAccountType(bank.account_type),
        "SAVINGS-ACC": isSavingsAccountType(bank.account_type),
        "CURRENT-ACC": isCurrentAccountType(bank.account_type),
        "OTHERS-ACC": isOtherAccountType(bank.account_type),
        MALE: isMaleGender(applicantGender),
    FEMALE: isFemaleGender(applicantGender),
    Others: isOtherGender(applicantGender),
      INDIAN: true,
      SINGLE: normalizeLowerText(personal.marital_status) === "single",
      MARRIED: normalizeLowerText(personal.marital_status) === "married",
      "NAME-AMC/DP": hasNominee,
      "SCHEME 1-ACC CHARGES": selectedScheme === "lifeTime",
      "SCHEME 2-ACC CHARGES": selectedScheme === "annualCare",
      "YES/NO-AMC/DP": !hasNominee,
      ...buildNomineeColumnCheckboxes(nominees[0], 1),
      ...buildNomineeColumnCheckboxes(nominees[1], 2),
      ...buildNomineeColumnCheckboxes(nominees[2], 3),
    };

  return {
    fields,
    checkboxes,
    clearFields: [
      "2 A FATHERSSPOUSE NAME",
      "Place",
      "Photo",
      "5 A PAN 5 B AADHAAR NO",
      ...getVerifiedIdentityDocumentClearFields(application),
    ],
    overlays: [
      ...getTemplateCompatibilityOverlays({
        identityApplicantName: applicantName,
        identityFatherName: fatherName,
        panNumber,
        aadhaarValue: getMaskedAadhaarValue(aadhaarNumber),
        applicantGender,
        maritalStatus: personal.marital_status,
        applicantPhotoBase64: firstNonEmpty(applicantPhoto.photo_base64),
        applicantPhotoPath: firstNonEmpty(applicantPhoto.file_path),
        panCardImagePath: firstNonEmpty(panCardUpload.file_path),
        signatureImagePath: firstNonEmpty(signatureUpload.signature_file_path),
      }),
      ...getVerifiedIdentityDocumentOverlays(application),
      ...getContactOverlays(application),
      ...getClientCodeOverlays(application),
      ...getBoidOverlayConfigs(application),
      ...getApplicantNameOverlays(application),
      ...getBankIfscOverlays(application),
      ...getDefaultSelectionOverlays(),
    ],
    missingFields,
    isTestIncomplete: process.env.NODE_ENV !== "production" && missingFields.length > 0,
  };
};

module.exports = {
  buildPdfFieldPayload,
};
