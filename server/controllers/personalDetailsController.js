const {
  upsertPersonalDetails,
  getApplicationById,
} = require("../queries/personalDetailsQueries");

const {
  getPersonalDetailsPrefill,
} = require("../queries/personalDetailsPrefillQueries");

/*
  Allowed Standing Instruction values
*/
const YES_NO_OPTIONS = ["Yes", "No"];

const ACCOUNT_STATEMENT_OPTIONS = ["Daily", "Weekly", "Fortnightly", "Monthly"];

const ANNUAL_REPORT_OPTIONS = [
  "Physical",
  "Electronic",
  "Both Physical and Electronic",
];

const CONTRACT_NOTE_OPTIONS = ["Physical", "Electronic"];

/*
  Convert any input safely to trimmed string.
*/
const cleanValue = (value) => String(value || "").trim();

/*
  Backend validation for all mandatory Standing Instructions.
  Do not depend only on frontend validation.
*/
const validateStandingInstructions = (standingInstructions) => {
  const errors = {};

  if (
    !standingInstructions ||
    typeof standingInstructions !== "object" ||
    Array.isArray(standingInstructions)
  ) {
    return {
      standingInstructions: "Standing Instructions are required.",
    };
  }

  const depositoryCredit = cleanValue(standingInstructions.depositoryCredit);

  const pledgeInstructions = cleanValue(
    standingInstructions.pledgeInstructions,
  );

  const accountStatementRequirement = cleanValue(
    standingInstructions.accountStatementRequirement,
  );

  const electronicTransactionStatement = cleanValue(
    standingInstructions.electronicTransactionStatement,
  );

  const shareEmailWithRta = cleanValue(standingInstructions.shareEmailWithRta);

  const annualReport = cleanValue(standingInstructions.annualReport);

  const dividendInterestEcs = cleanValue(
    standingInstructions.dividendInterestEcs,
  );

  const contractNote = cleanValue(standingInstructions.contractNote);

  const trustFacility = cleanValue(standingInstructions.trustFacility);

  const disAtAccountOpening = cleanValue(
    standingInstructions.disAtAccountOpening,
  );

  if (!YES_NO_OPTIONS.includes(depositoryCredit)) {
    errors.depositoryCredit = "Please select Yes or No for Depository Credit.";
  }

  if (!YES_NO_OPTIONS.includes(pledgeInstructions)) {
    errors.pledgeInstructions =
      "Please select Yes or No for Pledge Instructions.";
  }

  if (!ACCOUNT_STATEMENT_OPTIONS.includes(accountStatementRequirement)) {
    errors.accountStatementRequirement =
      "Please select a valid Account Statement Requirement.";
  }

  if (!YES_NO_OPTIONS.includes(electronicTransactionStatement)) {
    errors.electronicTransactionStatement =
      "Please select Yes or No for Electronic Transaction Statement.";
  }

  if (!YES_NO_OPTIONS.includes(shareEmailWithRta)) {
    errors.shareEmailWithRta =
      "Please select Yes or No for sharing email ID with RTA.";
  }

  if (!ANNUAL_REPORT_OPTIONS.includes(annualReport)) {
    errors.annualReport = "Please select a valid Annual Report preference.";
  }

  if (!YES_NO_OPTIONS.includes(dividendInterestEcs)) {
    errors.dividendInterestEcs =
      "Please select Yes or No for Dividend / Interest through ECS.";
  }

  if (!CONTRACT_NOTE_OPTIONS.includes(contractNote)) {
    errors.contractNote = "Please select a valid Contract Note preference.";
  }

  if (!YES_NO_OPTIONS.includes(trustFacility)) {
    errors.trustFacility = "Please select Yes or No for TRUST Facility.";
  }

  if (!YES_NO_OPTIONS.includes(disAtAccountOpening)) {
    errors.disAtAccountOpening =
      "Please select Yes or No for DIS at Account Opening.";
  }

  return errors;
};

/*
  POST /api/personal-details/save
*/
const savePersonalDetails = async (req, res) => {
  try {
    const {
      application_id,

      fatherName,
      motherName,
      gender,
      maritalStatus,
      education,
      annualIncome,
      tradingExperience,
      politicallyExposed,
      occupation,
      citizenOfIndia,
      netWorth,
      runningAccountAuthorization,
      countryOfBirth,
      ddpi,
      aadhaarAddress,
      incomeDeclarationAccepted,
      rightsAccepted,

      // New Standing Instruction fields from frontend
      standingInstructions,
      standing_instruction_completed,
    } = req.body;

    const parsedApplicationId = Number(application_id);

    if (
      !application_id ||
      !Number.isInteger(parsedApplicationId) ||
      parsedApplicationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid application_id is required.",
      });
    }

    /*
      Existing personal details validation
    */
    if (
      !cleanValue(fatherName) ||
      !cleanValue(motherName) ||
      !cleanValue(gender) ||
      !cleanValue(occupation)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Father name, mother name, gender and occupation are required.",
      });
    }

    if (incomeDeclarationAccepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Please accept the income declaration.",
      });
    }

    if (rightsAccepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Please accept Rights and Obligations.",
      });
    }

    /*
      Standing Instruction popup must have been submitted.
    */
    if (standing_instruction_completed !== true) {
      return res.status(400).json({
        success: false,
        message:
          "Please complete and submit all Standing Instructions before continuing.",
      });
    }

    /*
      Validate all 10 Standing Instruction values.
    */
    const standingErrors = validateStandingInstructions(standingInstructions);

    if (Object.keys(standingErrors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please complete all mandatory Standing Instructions.",
        errors: standingErrors,
      });
    }

    /*
      Confirm application exists before saving details.
    */
    const application = await getApplicationById(parsedApplicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    /*
      Save normal Personal Details + Standing Instructions.
      Your upsertPersonalDetails query must accept all below fields.
    */
    const savedData = await upsertPersonalDetails({
      application_id: parsedApplicationId,

      father_name: cleanValue(fatherName),
      mother_name: cleanValue(motherName),
      gender: cleanValue(gender),
      marital_status: cleanValue(maritalStatus),
      education: cleanValue(education),
      annual_income: cleanValue(annualIncome),
      trading_experience: cleanValue(tradingExperience),
      politically_exposed: cleanValue(politicallyExposed),
      occupation: cleanValue(occupation),
      citizen_of_india: cleanValue(citizenOfIndia),
      net_worth: cleanValue(netWorth),
      running_account_authorization: cleanValue(runningAccountAuthorization),
      country_of_birth: cleanValue(countryOfBirth),
      ddpi: cleanValue(ddpi) || "No",
      aadhaar_address: cleanValue(aadhaarAddress),
      income_declaration_accepted: true,
      rights_accepted: true,

      /*
        Standing Instructions database columns
      */
      depository_credit_instruction: cleanValue(
        standingInstructions.depositoryCredit,
      ),

      pledge_instruction: cleanValue(standingInstructions.pledgeInstructions),

      account_statement_requirement: cleanValue(
        standingInstructions.accountStatementRequirement,
      ),

      electronic_transaction_statement: cleanValue(
        standingInstructions.electronicTransactionStatement,
      ),

      share_email_with_rta: cleanValue(standingInstructions.shareEmailWithRta),

      annual_report_preference: cleanValue(standingInstructions.annualReport),

      dividend_interest_ecs: cleanValue(
        standingInstructions.dividendInterestEcs,
      ),

      contract_note_preference: cleanValue(standingInstructions.contractNote),

      trust_facility_instruction: cleanValue(
        standingInstructions.trustFacility,
      ),

      dis_at_account_opening: cleanValue(
        standingInstructions.disAtAccountOpening,
      ),

      standing_instruction_completed: true,
    });

    return res.status(200).json({
      success: true,
      message: "Personal details and Standing Instructions saved successfully.",
      data: savedData,
    });
  } catch (error) {
    console.error("Personal details save error:", error);

    const lowerCaseErrorMessage = String(error?.message || "").toLowerCase();

    const isAadhaarAddressTooLong =
      error?.code === "22001" &&
      lowerCaseErrorMessage.includes("aadhaar_address");

    return res.status(500).json({
      success: false,
      message: isAadhaarAddressTooLong
        ? "Aadhaar address field is too short in the database. Run server/sql/005_alter_personal_details_aadhaar_address_to_text.sql and retry."
        : "Internal server error.",
      error: error.message,
    });
  }
};

/*
  GET /api/personal-details/prefill/:application_id
*/
const getPersonalDetailsPrefillController = async (req, res) => {
  try {
    const { application_id } = req.params;

    const parsedApplicationId = Number(application_id);

    if (
      !application_id ||
      !Number.isInteger(parsedApplicationId) ||
      parsedApplicationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid application_id is required.",
      });
    }

    const prefillData = await getPersonalDetailsPrefill(parsedApplicationId);

    if (!prefillData) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: prefillData,
    });
  } catch (error) {
    console.error("Personal details prefill error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

module.exports = {
  savePersonalDetails,
  getPersonalDetailsPrefillController,
};
