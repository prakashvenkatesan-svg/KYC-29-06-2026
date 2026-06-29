const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

/* ---------------- CONFIG ---------------- */
const CONFIG = {
  url: process.env.CVL_KRA_URL || "https://www.cvlkra.com/PanInquiry.asmx",

  username: process.env.CVL_USERNAME,
  password: process.env.CVL_PASSWORD,
  passKey: process.env.CVL_PASSKEY,

  posCode: process.env.CVL_POSCODE,
  appPosCode: process.env.CVL_APP_POS_CODE,
  rtaCode: process.env.CVL_RTA_CODE,

  kraCode: process.env.CVL_KRA_CODE || "CVLKRA",
  fetchType: process.env.CVL_FETCH_TYPE || "E",
};

/* ---------------- SOAP CALL ---------------- */
async function callSoap(action, body) {
  try {
    const { data } = await axios.post(CONFIG.url, body, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `https://www.cvlkra.com/${action}`,
      },
      timeout: 60000,
    });

    return data;
  } catch (err) {
    console.error("SOAP ERROR:", err.message);
    throw err;
  }
}

/* ---------------- HELPERS ---------------- */
function getValue(obj, path) {
  return path.reduce((acc, key) => acc?.[key], obj);
}

function parseInnerXml(value) {
  if (typeof value === "string" && value.trim().startsWith("<")) {
    return parser.parse(value);
  }
  return value;
}

function formatDob(dob) {
  if (!dob) {
    throw new Error("DOB required");
  }

  //  Case 1: Already correct format DD/MM/YYYY
  if (typeof dob === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    return dob;
  }

  //  Case 2: Frontend sends YYYY-MM-DD (BEST CASE)
  if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const parts = dob.split("-");
    const yyyy = parts[0];
    const mm = parts[1];
    const dd = parts[2];

    // STRICT VALIDATION (IMPORTANT)
    if (parseInt(dd) > 31 || parseInt(mm) > 12) {
      throw new Error("Invalid DOB values");
    }

    return `${dd}/${mm}/${yyyy}`;
  }

  //  DO NOT rely on new Date() (causes wrong DOB)
  throw new Error("Invalid DOB format. Use YYYY-MM-DD");
}

/* ---------------- GET ENCRYPTED PASSWORD ---------------- */
async function getEncryptedPassword() {
  const body = `
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <GetPassword xmlns="https://www.cvlkra.com/">
        <username>${CONFIG.username}</username>
        <password>${CONFIG.password}</password>
        <PassKey>${CONFIG.passKey}</PassKey>
      </GetPassword>
    </soap:Body>
  </soap:Envelope>`;

  const xml = await callSoap("GetPassword", body);
  const json = parser.parse(xml);

  const result =
    getValue(json, [
      "soap:Envelope",
      "soap:Body",
      "GetPasswordResponse",
      "GetPasswordResult",
    ]) ||
    getValue(json, [
      "Envelope",
      "Body",
      "GetPasswordResponse",
      "GetPasswordResult",
    ]);

  if (!result) {
    console.error(" PASSWORD XML:", xml);
    throw new Error("Failed to get encrypted password");
  }

  return result;
}

/* ---------------- PAN STATUS ---------------- */
async function getPanStatusFromKRA(pan) {
  const encPass = await getEncryptedPassword();

  const body = `
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <GetPanStatus xmlns="https://www.cvlkra.com/">
        <panNo>${pan}</panNo>
        <userName>${CONFIG.username}</userName>
        <PosCode>${CONFIG.posCode}</PosCode>
        <password>${encPass}</password>
        <PassKey>${CONFIG.passKey}</PassKey>
      </GetPanStatus>
    </soap:Body>
  </soap:Envelope>`;

  const xml = await callSoap("GetPanStatus", body);
  const json = parser.parse(xml);

  const result =
    getValue(json, [
      "soap:Envelope",
      "soap:Body",
      "GetPanStatusResponse",
      "GetPanStatusResult",
    ]) ||
    getValue(json, [
      "Envelope",
      "Body",
      "GetPanStatusResponse",
      "GetPanStatusResult",
    ]);

  return result;
}

/* ---------------- FETCH FULL DETAILS ---------------- */
async function fetchPanDetailsFromKRA(pan, dob) {
  if (!pan) throw new Error("PAN required");
  if (!dob) throw new Error("DOB required");

  if (!CONFIG.appPosCode) throw new Error("APP_POS_CODE missing");
  if (!CONFIG.rtaCode) throw new Error("RTA_CODE missing");

  const encPass = await getEncryptedPassword();
  const formattedDob = formatDob(dob);

  console.log(" FORMATTED DOB:", formattedDob); // debug

  const inputXML = `
  <APP_REQ_ROOT>
    <APP_PAN_INQ>
      <APP_PAN_NO>${pan}</APP_PAN_NO>
      <APP_DOB>${formattedDob}</APP_DOB>
      <APP_DOB_INCORP>${formattedDob}</APP_DOB_INCORP>
      <APP_POS_CODE>${CONFIG.appPosCode}</APP_POS_CODE>
      <APP_RTA_CODE>${CONFIG.rtaCode}</APP_RTA_CODE>
      <APP_KRA_CODE>${CONFIG.kraCode}</APP_KRA_CODE>
      <FETCH_TYPE>${CONFIG.fetchType}</FETCH_TYPE>
    </APP_PAN_INQ>
  </APP_REQ_ROOT>`;

  console.log("APP_POS_CODE:", CONFIG.appPosCode);


  const body = `
  <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
      <SolicitPANDetailsFetchALLKRA xmlns="https://www.cvlkra.com/">
        <inputXML><![CDATA[${inputXML}]]></inputXML>
        <userName>${CONFIG.username}</userName>
        <PosCode>${CONFIG.posCode}</PosCode>
        <password>${encPass}</password>
        <PassKey>${CONFIG.passKey}</PassKey>
      </SolicitPANDetailsFetchALLKRA>
    </soap:Body>
  </soap:Envelope>`;

  const xml = await callSoap("SolicitPANDetailsFetchALLKRA", body);

  console.log(" RAW KRA RESPONSE:", xml);

  const json = parser.parse(xml);

  const result =
    getValue(json, [
      "soap:Envelope",
      "soap:Body",
      "SolicitPANDetailsFetchALLKRAResponse",
      "SolicitPANDetailsFetchALLKRAResult",
    ]) ||
    getValue(json, [
      "Envelope",
      "Body",
      "SolicitPANDetailsFetchALLKRAResponse",
      "SolicitPANDetailsFetchALLKRAResult",
    ]);

  if (!result) {
    throw new Error("No response from KRA");
  }

  const parsed = parseInnerXml(result);

  console.log(" PARSED RESULT:", JSON.stringify(parsed, null, 2));

  /* ---------------- ERROR HANDLING ---------------- */
  const errorCode = parsed?.ROOT?.KYC_DATA?.APP_ERROR_CODE;

  if (errorCode) {
    const errorMsg = parsed?.ROOT?.KYC_DATA?.APP_ERROR_DESC;
    throw new Error(`KRA ERROR: ${errorMsg}`);
  }

  /* ---------------- SUCCESS ---------------- */
  return parsed;
}

/* ---------------- EXPORT ---------------- */
module.exports = {
  getEncryptedPassword,
  getPanStatusFromKRA,
  fetchPanDetailsFromKRA,
};
