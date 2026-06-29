const {
  upsertPersonalDetails,
  getApplicationById,
} = require("../queries/personalDetailsQueries");
const {
  getPersonalDetailsPrefill,
} = require("../queries/personalDetailsPrefillQueries");

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
    } = req.body;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "application_id is required",
      });
    }

    if (!fatherName || !motherName || !gender || !occupation) {
      return res.status(400).json({
        success: false,
        message: "Father name, mother name, gender and occupation are required",
      });
    }

    if (!incomeDeclarationAccepted || !rightsAccepted) {
      return res.status(400).json({
        success: false,
        message: "Please accept required declarations",
      });
    }

    const application = await getApplicationById(application_id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const savedData = await upsertPersonalDetails({
      application_id,
      father_name: fatherName,
      mother_name: motherName,
      gender,
      marital_status: maritalStatus,
      education,
      annual_income: annualIncome,
      trading_experience: tradingExperience,
      politically_exposed: politicallyExposed,
      occupation,
      citizen_of_india: citizenOfIndia,
      net_worth: netWorth,
      running_account_authorization: runningAccountAuthorization,
      country_of_birth: countryOfBirth,
      ddpi,
      aadhaar_address: aadhaarAddress,
      income_declaration_accepted: incomeDeclarationAccepted,
      rights_accepted: rightsAccepted,
    });

    return res.status(200).json({
      success: true,
      message: "Personal details saved successfully",
      data: savedData,
    });
  } catch (error) {
    console.error("Personal details save error:", error);

    const isAadhaarAddressTooLong =
      error?.code === "22001" &&
      String(error?.message || "").toLowerCase().includes("aadhaar_address");

    return res.status(500).json({
      success: false,
      message: isAadhaarAddressTooLong
        ? "Aadhaar address field is too short in the database. Run server/sql/005_alter_personal_details_aadhaar_address_to_text.sql and retry."
        : "Internal server error",
      error: error.message,
    });
  }
};

const getPersonalDetailsPrefillController = async (req, res) => {
  try {
    const { application_id } = req.params;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "application_id is required",
      });
    }

    const prefillData = await getPersonalDetailsPrefill(application_id);

    if (!prefillData) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
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
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  savePersonalDetails,
  getPersonalDetailsPrefillController,
};
