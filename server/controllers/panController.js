const {
  getPanStatusFromKRA,
  fetchPanDetailsFromKRA,
} = require("../services/cvlKraService");

const pool = require("../config/db");
const masterPool = require("../config/masterDb");

const { checkPanExistsInTechExcel } = require("../services/techExcelService");

const { verifyPanWithIncomeTax } = require("../services/incomeTaxPanService");

const { startDigilocker } = require("../services/startDigilocker");

const {
  insertPanVerification,
  updateKraDetails,
  insertKraDetails,
  savePanVerification,
  saveDigilockerDetails,
  upsertDigilockerIdentityDetails,
} = require("../queries/panQueries");

/* FORMAT DOB */
function formatDobForKra(dob) {
  if (!dob) return "";

  // YYYY-MM-DD → DD/MM/YYYY
  if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const [yyyy, mm, dd] = dob.split("-");

    return `${dd}/${mm}/${yyyy}`;
  }

  // already DD/MM/YYYY
  if (typeof dob === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    return dob;
  }

  return dob;
}

/* GENDER */
function getGenderText(code) {
  switch (code) {
    case "M":
      return "Male";

    case "F":
      return "Female";

    case "T":
      return "Transgender";

    default:
      return "";
  }
}

/* STATE */
function getStateName(code) {
  const stateMap = {
    33: "Tamil Nadu",
    36: "Telangana",
    29: "Karnataka",
    27: "Maharashtra",
    7: "Delhi",
  };

  return stateMap[Number(code)] || String(code || "");
}

function normalizeAadhaarValue(value) {
  const normalized = String(value || "").trim();

  if (!normalized || /^X+$/i.test(normalized.replace(/\s+/g, ""))) {
    return null;
  }

  return normalized;
}

function generateApplicationNumber() {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `KYC${Date.now()}${randomPart}`;
}

const ensurePanApplicationId = async (applicationId) => {
  if (applicationId) {
    return Number(applicationId);
  }

  const applicationResult = await pool.query(
    `
    INSERT INTO public.kyc_applications
      (
        application_number,
        current_step,
        kyc_status,
        is_completed,
        created_at,
        updated_at
      )
    VALUES
      ($1, 'pan_details', 'in_progress', false, NOW(), NOW())
    RETURNING id
    `,
    [generateApplicationNumber()],
  );

  return applicationResult.rows[0]?.id || null;
};

/* CHECK EXISTING PAN IN MASTER DATA */
const checkExistingPanDetails = async (panNumber) => {
  try {
    const result = await masterPool.query(
      `
      SELECT
        existed_pan_number,
        existed_client_code
      FROM existing_pan_details
      WHERE UPPER(existed_pan_number) = UPPER($1)
      LIMIT 1
      `,
      [panNumber],
    );

    return result.rows[0] || null;
  } catch (error) {
    console.log("CHECK EXISTING PAN ERROR:", error);
    throw error;
  }
};

/* VERIFY PAN */
const verifyPan = async (req, res) => {
  try {
    console.log("VERIFY PAN API HIT");
    console.log("REQUEST BODY:", req.body);

    // const { pan_number, dob } = req.body;
    const { application_id, pan_number, dob } = req.body;
    const effectiveApplicationId = await ensurePanApplicationId(application_id);

    /* VALIDATION */
    if (!pan_number) {
      return res.status(400).json({
        success: false,

        message: "PAN number is required",
      });
    }

    if (!dob) {
      return res.status(400).json({
        success: false,

        message: "DOB is required",
      });
    }

    /* CLEAN PAN */
    const cleanPan = String(pan_number)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    const formattedDob = formatDobForKra(dob);

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(cleanPan)) {
      return res.status(400).json({
        success: false,

        message: "Invalid PAN format",
      });
    }

    console.log("CLEAN PAN:", cleanPan);
    console.log("FORMATTED DOB:", formattedDob);

    /* SAVE PAN + DOB IN DB */
    await insertPanVerification(effectiveApplicationId, cleanPan, formattedDob);
    console.log("PAN + DOB SAVED");

    /*Check database*/
    /* STEP 1 - EXISTING PAN DETAILS */

    const existingPan = await checkExistingPanDetails(cleanPan);

    console.log("EXISTING PAN RESULT:", existingPan);

    if (existingPan) {
      return res.status(200).json({
        success: true,

        accountExists: true,

        isKraRegistered: false,

        incomeTaxVerified: false,

        digilockerVerified: false,

        goIncomeTaxPage: false,

        goDigilocker: false,

        application_id: effectiveApplicationId,

        source: "EXISTING_PAN_DETAILS",

        clientCode: existingPan.existed_client_code,

        message:
          "You already have an account with Aionion Capital. Please contact your RM.",
      });
    }

    /* STEP 1 - TECH EXCEL */
    const techExcelResult = await checkPanExistsInTechExcel(cleanPan);
    console.log("TECH EXCEL RESULT:", JSON.stringify(techExcelResult, null, 2));

    // ACCOUNT EXISTS
    if (techExcelResult?.success && techExcelResult?.exists === true) {
      return res.status(200).json({
        success: true,

        accountExists: true,

        isKraRegistered: false,

        incomeTaxVerified: false,

        digilockerVerified: false,

        goIncomeTaxPage: false,

        goDigilocker: false,

        application_id: effectiveApplicationId,

        source: "TECHEXCEL",

        message: "You already have an account",

        data: techExcelResult.data || null,
      });
    }

    /* STEP 2 - KRA CHECK */
    const panStatusResponse = await getPanStatusFromKRA(cleanPan);

    console.log(
      "PAN STATUS RESPONSE:",
      JSON.stringify(panStatusResponse, null, 2),
    );

    const fetchResponse = await fetchPanDetailsFromKRA(cleanPan, formattedDob);

    console.log("KRA FETCH RESPONSE:", JSON.stringify(fetchResponse, null, 2));

    const root = fetchResponse?.ROOT || {};

    const kycData = root?.KYC_DATA || {};

    /* IMPORTANT FIX */
    // VALID ONLY IF PAN + NAME EXISTS

    const isKraRegistered = Boolean(kycData.APP_PAN_NO && kycData.APP_NAME);

    console.log("IS KRA REGISTERED:", isKraRegistered);

    /* STEP 3 - IF KRA EXISTS */
    if (isKraRegistered) {
      const formattedData = {
        pan: kycData.APP_PAN_NO || "",

        email: kycData.APP_EMAIL || "",

        mobile: String(kycData.APP_MOB_NO || ""),

        father_name: kycData.APP_F_NAME || "",

        gender: getGenderText(kycData.APP_GEN),

        dob: kycData.APP_DOB_DT || formattedDob,

        name: kycData.APP_NAME || "",

        address_1: kycData.APP_PER_ADD1 || "",

        address_2: kycData.APP_PER_ADD2 || "",

        state: getStateName(kycData.APP_PER_STATE),

        pincode: String(kycData.APP_PER_PINCD || ""),

        aadhaar_number: normalizeAadhaarValue(kycData.APP_CORR_AADHAR_NO),

        kra_name: kycData.APP_KRA_INFO || "",

        kra_status: kycData.APP_STATUS || "",
      };

      return res.status(200).json({
        success: true,

        accountExists: false,

        isKraRegistered: true,

        incomeTaxVerified: false,

        digilockerVerified: false,

        goIncomeTaxPage: false,

        goDigilocker: false,

        application_id: effectiveApplicationId,

        source: "KRA",

        message: "KRA data fetched successfully",

        data: formattedData,
      });
    }

    /* STEP 4 - INCOME TAX VERIFY */
    const incomeTaxResult = await verifyPanWithIncomeTax(cleanPan);
    console.log("INCOME TAX RESULT:", JSON.stringify(incomeTaxResult, null, 2));

    /* INVALID PAN */
    if (!incomeTaxResult?.success || !incomeTaxResult?.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN according to Income Tax Department",
      });
    }

    return res.status(200).json({
      success: true,

      accountExists: false,

      isKraRegistered: false,

      incomeTaxVerified: true,

      goIncomeTaxPage: true,

      application_id: effectiveApplicationId,

      source: "INCOME_TAX",

      message: "PAN verified successfully",

      data: incomeTaxResult.data || null,
    });
  } catch (error) {
    console.error("VERIFY PAN ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,

      message: error.message || "Internal server error",
    });
  }
};

const saveKraDetails = async (req, res) => {
  try {
    console.log("SAVE KRA BODY:", req.body);

    const {
      application_id,
      email,
      mobile,
      gender,
      dob,
      name,
      address_1,
      address_2,
      state,
      pincode,
      aadhaar_number,
      kra_name,
      kra_status,
      pan,
    } = req.body;
    const normalizedAadhaarNumber = normalizeAadhaarValue(aadhaar_number);

    // =========================
    // VALIDATION
    // =========================

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    // =========================
    // CHECK EXISTING RECORD
    // =========================

    const existingRecord = await pool.query(
      `
      SELECT id
      FROM public.identity_verifications
      WHERE application_id = $1
      `,
      [application_id],
    );

    // =========================
    // UPDATE EXISTING
    // =========================

    if (existingRecord.rows.length > 0) {
      await pool.query(
        `
        UPDATE public.identity_verifications
        SET
          pan_number = $1,
          dob = $2,
          full_name = $3,
          kra_email = $4,
          kra_mobile = $5,
          gender = $6,
          address_1 = $7,
          address_2 = $8,
          state = $9,
          pincode = $10,
          aadhaar_number = $11,
          provider = $12,
          provider_ref = $13,
          provider_dob = $14,
          updated_at = NOW()
        WHERE application_id = $15
        `,
        [
          pan,
          dob,
          name,
          email,
          mobile,
          gender,
          address_1,
          address_2,
          state,
          pincode,
          normalizedAadhaarNumber,
          kra_name,
          kra_status,
          dob,
          application_id,
        ],
      );
    } else {
      // =========================
      // INSERT NEW RECORD
      // =========================

      await pool.query(
        `
        INSERT INTO public.identity_verifications
        (
          application_id,
          pan_number,
          dob,
          full_name,
          kra_email,
          kra_mobile,
          gender,
          address_1,
          address_2,
          state,
          pincode,
          normalizedAadhaarNumber,
          provider,
          provider_ref,
          provider_dob,
          created_at,
          updated_at
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,NOW(),NOW()
        )
        `,
        [
          application_id,
          pan,
          dob,
          name,
          email,
          mobile,
          gender,
          address_1,
          address_2,
          state,
          pincode,
          aadhaar_number,
          kra_status,
          dob,
        ],
      );
    }

    // =========================
    // SUCCESS RESPONSE
    // =========================

    return res.status(200).json({
      success: true,
      message: "KRA details stored successfully",
    });
  } catch (error) {
    console.log("SAVE KRA ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to store KRA details",
      error: error.message,
    });
  }
};

const saveIdentityDetails = async (req, res) => {
  try {
    let result;

    // DIGILOCKER SAVE
    if (req.body.provider === "digilocker") {
      result = await saveDigilockerDetails(req.body);
      const hasStructuredDigilockerDetails = [
        req.body.name,
        req.body.gender,
        req.body.address_1,
        req.body.address_2,
        req.body.state,
        req.body.pincode,
        req.body.dob,
      ].some((value) => String(value || "").trim() !== "");

      if (hasStructuredDigilockerDetails) {
        await upsertDigilockerIdentityDetails(req.body);
      }
    } else if (req.body.provider === "income_tax") {
      result = await savePanVerification(req.body);
    }

    // PAN SAVE
    else {
      result = await savePanVerification(req.body);
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.log(
      "SAVE IDENTITY DETAILS ERROR:",
      error.message,
      error.detail || "",
    );

    res.status(500).json({
      success: false,
      message: "Failed to save details",
    });
  }
};

module.exports = {
  verifyPan,
  saveKraDetails,
  saveIdentityDetails,
};
