const {
  getApplicationById,
  getNomineeCount,
  createNominee,
  getNomineesByApplicationId,
  updateNomineeAllocation,
  deleteNomineeById,
} = require("../queries/nomineeQueries");

const MAX_NOMINEES = 10;

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPan = (pan) => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
};

const isValidMobile = (mobile) => {
  return /^[0-9]{10}$/.test(String(mobile || ""));
};

const isValidAadhaar = (aadhaar) => {
  return /^[0-9]{12}$/.test(String(aadhaar || ""));
};

const isValidProofType = (proofType) => {
  return proofType === "Aadhaar" || proofType === "PAN";
};

const getNomineeAllocation = (nominee) => {
  return nominee.nomineeAllocation ?? nominee.allocation_percentage ?? "";
};

const getProofType = (nominee) => {
  return nominee.nomineeProofType ?? nominee.document ?? "";
};

const validateNominee = (nominee, nomineeNumber) => {
  const nomineeName = String(nominee.nomineeName || "").trim();
  const dob = nominee.dob;
  const mobile = String(nominee.mobile || "").trim();
  const email = String(nominee.email || "").trim();
  const relation = String(nominee.relation || "").trim();
  const gender = String(nominee.gender || "").trim();
  const nomineeAddress = String(nominee.nomineeAddress || "").trim();

  const proofType = getProofType(nominee);

  const aadhaar = String(nominee.aadhaar || "")
    .replace(/\D/g, "")
    .trim();

  const pan = String(nominee.pan || "")
    .toUpperCase()
    .trim();

  const allocation = Number(getNomineeAllocation(nominee));

  if (
    !nomineeName ||
    !dob ||
    !mobile ||
    !email ||
    !relation ||
    !gender ||
    !proofType ||
    !nomineeAddress
  ) {
    return `All nominee fields are required for Nominee ${nomineeNumber}`;
  }

  if (!isValidMobile(mobile)) {
    return `Mobile number must be 10 digits for Nominee ${nomineeNumber}`;
  }

  if (!isValidEmail(email)) {
    return `Invalid email address for Nominee ${nomineeNumber}`;
  }

  if (!isValidProofType(proofType)) {
    return `Invalid nominee proof type for Nominee ${nomineeNumber}`;
  }

  if (proofType === "Aadhaar" && !isValidAadhaar(aadhaar)) {
    return `Aadhaar number must be 12 digits for Nominee ${nomineeNumber}`;
  }

  if (proofType === "PAN" && !isValidPan(pan)) {
    return `Invalid PAN number for Nominee ${nomineeNumber}`;
  }

  if (
    getNomineeAllocation(nominee) === "" ||
    Number.isNaN(allocation) ||
    allocation <= 0 ||
    allocation > 100
  ) {
    return `Nominee allocation must be between 1% and 100% for Nominee ${nomineeNumber}`;
  }

  return null;
};

/*
  Supports two payloads:

  Old single nominee:
  {
    application_id,
    nomineeName,
    dob,
    ...
  }

  New multiple nominee:
  {
    application_id,
    nominees: [{ ... }, { ... }],
    rightsAccepted: true
  }
*/
const saveNominee = async (req, res) => {
  try {
    const {
      application_id,
      nominees,
      rightsAccepted,
    } = req.body;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "application_id is required",
      });
    }

    const application = await getApplicationById(application_id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Supports old single nominee request and new nominees array request.
    const nomineeList = Array.isArray(nominees)
      ? nominees
      : [req.body];

    if (!nomineeList.length) {
      return res.status(400).json({
        success: false,
        message: "At least one nominee is required",
      });
    }

    if (nomineeList.length > MAX_NOMINEES) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_NOMINEES} nominees allowed`,
      });
    }

    // Rights acceptance is required only for the new multi nominee flow.
    if (Array.isArray(nominees) && !rightsAccepted) {
      return res.status(400).json({
        success: false,
        message: "Please accept rights and obligations",
      });
    }

    const existingNomineeCount = await getNomineeCount(application_id);

    if (existingNomineeCount + nomineeList.length > MAX_NOMINEES) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_NOMINEES} nominees allowed`,
      });
    }

    let totalAllocation = 0;

    // Validate every nominee before inserting anything.
    for (let index = 0; index < nomineeList.length; index += 1) {
      const nominee = nomineeList[index];

      const validationMessage = validateNominee(nominee, index + 1);

      if (validationMessage) {
        return res.status(400).json({
          success: false,
          message: validationMessage,
        });
      }

      totalAllocation += Number(getNomineeAllocation(nominee));
    }

    // For multi nominee flow, total must always be 100%.
    if (Array.isArray(nominees) && totalAllocation !== 100) {
      return res.status(400).json({
        success: false,
        message: `Total nominee allocation must be exactly 100%. Current total: ${totalAllocation}%`,
      });
    }

    const savedNominees = [];

    for (let index = 0; index < nomineeList.length; index += 1) {
      const nominee = nomineeList[index];

      const proofType = getProofType(nominee);

      const nomineeName = String(nominee.nomineeName || "").trim();
      const mobile = String(nominee.mobile || "").trim();
      const email = String(nominee.email || "").trim().toLowerCase();
      const nomineeAddress = String(nominee.nomineeAddress || "").trim();

      const aadhaar =
        proofType === "Aadhaar"
          ? String(nominee.aadhaar || "").replace(/\D/g, "")
          : null;

      const pan =
        proofType === "PAN"
          ? String(nominee.pan || "").toUpperCase().trim()
          : null;

      const allocation = Number(getNomineeAllocation(nominee));

      const savedNominee = await createNominee({
        application_id: Number(application_id),
        nominee_name: nomineeName,
        dob: nominee.dob,
        mobile,
        email,
        relation: nominee.relation,
        gender: nominee.gender,
        nominee_proof_type: proofType,
        aadhaar,
        pan,
        nominee_address: nomineeAddress,
        same_address: Boolean(nominee.sameAddress),
      });

      /*
        createNominee query must return the inserted row
        with either `id` or `nominee_id`.
      */
      const nomineeId = savedNominee?.id || savedNominee?.nominee_id;

      if (!nomineeId) {
        throw new Error(
          "createNominee must return inserted nominee id using RETURNING *",
        );
      }

      // Save percentage allocation after nominee row is created.
      await updateNomineeAllocation(nomineeId, allocation);

      savedNominees.push({
        ...savedNominee,
        allocation_percentage: allocation,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Nominee details saved successfully",
      nominee_count: savedNominees.length,
      data: savedNominees,
    });
  } catch (error) {
    console.error("Save nominee error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getNominees = async (req, res) => {
  try {
    const { application_id } = req.params;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "application_id is required",
      });
    }

    const nominees = await getNomineesByApplicationId(application_id);

    return res.status(200).json({
      success: true,
      data: nominees,
    });
  } catch (error) {
    console.error("Get nominees error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const saveAllocation = async (req, res) => {
  try {
    const { application_id, allocations } = req.body;

    if (
      !application_id ||
      !Array.isArray(allocations) ||
      allocations.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "application_id and allocations are required",
      });
    }

    const nominees = await getNomineesByApplicationId(application_id);

    if (!nominees.length) {
      return res.status(404).json({
        success: false,
        message: "No nominees found for this application",
      });
    }

    const nomineeIds = nominees.map((nominee) =>
      Number(nominee.id || nominee.nominee_id),
    );

    let totalAllocation = 0;

    for (const item of allocations) {
      const nomineeId = Number(item.nominee_id);
      const allocation = Number(item.allocation_percentage);

      if (
        !nomineeIds.includes(nomineeId) ||
        Number.isNaN(allocation) ||
        allocation <= 0 ||
        allocation > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid nominee allocation data",
        });
      }

      totalAllocation += allocation;
    }

    if (totalAllocation !== 100) {
      return res.status(400).json({
        success: false,
        message: "Total allocation percentage must be exactly 100",
      });
    }

    for (const item of allocations) {
      await updateNomineeAllocation(
        item.nominee_id,
        Number(item.allocation_percentage),
      );
    }

    const updatedNominees = await getNomineesByApplicationId(application_id);

    return res.status(200).json({
      success: true,
      message: "Allocation saved successfully",
      data: updatedNominees,
    });
  } catch (error) {
    console.error("Save allocation error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const deleteNominee = async (req, res) => {
  try {
    const { nominee_id } = req.params;

    if (!nominee_id) {
      return res.status(400).json({
        success: false,
        message: "nominee_id is required",
      });
    }

    const deleted = await deleteNomineeById(nominee_id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Nominee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Nominee deleted successfully",
      data: deleted,
    });
  } catch (error) {
    console.error("Delete nominee error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    }); 
  }
};

module.exports = {
  saveNominee,
  getNominees,
  saveAllocation,
  deleteNominee,
};