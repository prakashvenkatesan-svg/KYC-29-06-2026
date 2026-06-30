const firstNonEmpty = (...values) =>
  values.find((value) => String(value || "").trim() !== "") || "";

const { resolveDistrict } = require("./districtResolverService");

const splitAddress = (address) =>
  String(address || "")
    .split(/\r?\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);

const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAddressSegmentsBeforeState = (address = "", matchedState = "") => {
  const withoutPincode = String(address || "").replace(/\b\d{6}\b/g, "").trim();
  const withoutCountry = withoutPincode.replace(/\bIndia\b/gi, "").trim();
  const beforeState = matchedState
    ? withoutCountry.replace(new RegExp(`\\b${escapeRegex(matchedState)}\\b`, "i"), "").trim()
    : withoutCountry;

  return beforeState
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
};

const parseIndianAddressTail = (address) => {
  const normalized = String(address || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return {
      city: "",
      district: "",
      state: "",
      pincode: "",
    };
  }

  const pincodeMatch = normalized.match(/\b(\d{6})\b/);
  const pincode = pincodeMatch ? pincodeMatch[1] : "";

  const withoutPincode = normalized.replace(/\b\d{6}\b/g, "").trim();
  const withoutCountry = withoutPincode.replace(/\bIndia\b/i, "").trim();

  const matchedState = INDIAN_STATES_AND_UTS.find((state) =>
    new RegExp(`\\b${escapeRegex(state)}\\b`, "i").test(withoutCountry),
  );

  if (!matchedState) {
    return {
      city: "",
      district: "",
      state: "",
      pincode,
    };
  }

  const addressSegments = getAddressSegmentsBeforeState(normalized, matchedState);
  const tailToken = addressSegments.slice(-1)[0] || "";

  return {
    city: tailToken,
    district: tailToken,
    state: matchedState,
    pincode,
  };
};

const buildPdfAddressFields = (application) => {
  const personal = application?.personal_details || {};
  const identity = application?.identity_details || {};

  const aadhaarAddressParts = splitAddress(personal.aadhaar_address || "");
  const identityAddress1 = String(identity.address_1 || "").trim();
  const identityAddress2 = String(identity.address_2 || "").trim();
  const parsedAadhaarAddress = parseIndianAddressTail(personal.aadhaar_address);
  const resolvedDistrict = resolveDistrict({
    district: personal.district,
    pincode: firstNonEmpty(
      personal.pincode,
      identity.pincode,
      parsedAadhaarAddress.pincode,
    ),
    city: identityAddress2,
    stateName: firstNonEmpty(personal.state, identity.state),
  }).district;

  const district = firstNonEmpty(
    personal.district,
    resolvedDistrict,
    identityAddress2,
    parsedAadhaarAddress.district,
    aadhaarAddressParts[1],
  );
  const city = firstNonEmpty(
    personal.city,
    identityAddress2,
    parsedAadhaarAddress.city,
    district,
    identityAddress2,
  );
  const state = firstNonEmpty(
    personal.state,
    identity.state,
    parsedAadhaarAddress.state,
  );
  const pincode = firstNonEmpty(
    personal.pincode,
    identity.pincode,
    parsedAadhaarAddress.pincode,
  );

  return {
    LANDMARK: "",
    CITY: city,
    DISTRICT: district,
    STATE: state,
    "PIN CODE": pincode,
    LANDMARK_2: "",
    CITY_2: city,
    DISTRICT_2: district,
    STATE_2: state,
    "PIN CODE_2": pincode,
  };
};

module.exports = {
  buildPdfAddressFields,
};
