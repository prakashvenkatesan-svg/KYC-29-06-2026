const db = require("../config/db");
const {
  formatStateDisplayName,
  resolveStateName,
} = require("../services/districtResolverService");

const buildKraAddress = (row) =>
  [
    row?.address_1,
    row?.address_2,
    formatStateDisplayName(
      resolveStateName({
        stateCode: row?.kra_state_code,
        stateName: row?.state,
      }),
    ),
    row?.pincode,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");

const normalizeGender = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["m", "male"].includes(normalized)) return "Male";
  if (["f", "female"].includes(normalized)) return "Female";
  if (["t", "o", "other", "others", "transgender"].includes(normalized)) {
    return "Transgender";
  }

  return String(value || "").trim();
};

const getPersonalDetailsPrefill = async (applicationId) => {
  const query = `
    SELECT
      pd.aadhaar_address AS saved_aadhaar_address,
      pd.father_name AS saved_father_name,
      pd.gender AS saved_gender,
      dd.address AS digilocker_address,
      dd.father_name AS digilocker_father_name,
      dd.gender AS digilocker_gender,
      dd.provider AS digilocker_provider,
      cvl.app_f_name AS kra_father_name,
      cvl.app_gen AS kra_gender,
      COALESCE(cvl.app_per_state, cvl.app_cor_state) AS kra_state_code,
      iv.address_1,
      iv.address_2,
      COALESCE(NULLIF(BTRIM(iv.state), ''), NULLIF(BTRIM(cvl.app_per_state), ''), NULLIF(BTRIM(cvl.app_cor_state), '')) AS state,
      COALESCE(NULLIF(BTRIM(iv.pincode), ''), NULLIF(BTRIM(cvl.app_per_pincd), ''), NULLIF(BTRIM(cvl.app_cor_pincd), '')) AS pincode
    FROM public.kyc_applications ka
    LEFT JOIN public.personal_details pd
      ON pd.application_id = ka.id
    LEFT JOIN public.digilocker_details dd
      ON dd.application_id = ka.id::text
    LEFT JOIN public.cvlkra_data cvl
      ON cvl.application_id = ka.id
    LEFT JOIN public.identity_verifications iv
      ON iv.application_id = ka.id
    WHERE ka.id = $1
    LIMIT 1
  `;

  const result = await db.query(query, [applicationId]);
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const savedAddress = String(row.saved_aadhaar_address || "").trim();
  const savedFatherName = String(row.saved_father_name || "").trim();
  const savedGender = normalizeGender(row.saved_gender);
  const digilockerAddress = String(row.digilocker_address || "").trim();
  const digilockerFatherName = String(row.digilocker_father_name || "").trim();
  const digilockerGender = normalizeGender(row.digilocker_gender);
  const kraFatherName = String(row.kra_father_name || "").trim();
  const kraGender = normalizeGender(row.kra_gender);
  const kraAddress = buildKraAddress(row);

  if (savedAddress) {
    return {
      source: "PERSONAL_DETAILS",
      aadhaar_address: savedAddress,
      father_name: savedFatherName,
      gender: savedGender,
    };
  }

  if (digilockerAddress && String(row.digilocker_provider || "").trim().toLowerCase() === "digilocker") {
    return {
      source: "DIGILOCKER",
      aadhaar_address: digilockerAddress,
      father_name: digilockerFatherName,
      gender: digilockerGender,
    };
  }

  if (kraAddress) {
    return {
      source: "KRA",
      aadhaar_address: kraAddress,
      father_name: kraFatherName,
      gender: kraGender,
    };
  }

  return {
    source: "",
    aadhaar_address: "",
    father_name: savedFatherName || digilockerFatherName || kraFatherName || "",
    gender: savedGender || digilockerGender || kraGender || "",
  };
};

module.exports = {
  getPersonalDetailsPrefill,
};
