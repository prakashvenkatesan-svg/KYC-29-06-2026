// const sendMail = require("../utils/mailSender");
const pool = require("../config/db");
const {
  runPostClientCodeAutomations,
} = require("../services/postClientCodeAutomationService");

// SERIAL NUMBER
let serialNumber = {};

// GENERATE CLIENT CODE
function generateClientCode(panNumber) {
  const cleanPan = panNumber.trim().toUpperCase();

  // GET 5TH CHARACTER
  const fifthChar = cleanPan[4];

  // CREATE CODE
  const clientCode = `${fifthChar}${serialNumber}`;

  serialNumber++;

  return clientCode;
}

// MAIN API
const generateClientCodeAfterPayment = async (req, res) => {
  try {
    const { email, panNumber, application_id } = req.body;

    // VALIDATION
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!panNumber) {
      return res.status(400).json({
        success: false,
        message: "PAN number is required",
      });
    }

    // GENERATE CLIENT CODE
    const clientCode = generateClientCode(panNumber);

    console.log("GENERATED CLIENT CODE:", clientCode);

    // SAVE TO POSTGRES
    const query = `
      INSERT INTO client_codes (
        email,
        pan_number,
        client_code,
        created_at
      )
      VALUES ($1, $2, $3, NOW())
      RETURNING *;
    `;

    const result = await pool.query(query, [
      email,
      panNumber,
      clientCode,
    ]);

    console.log("CLIENT CODE SAVED:", result.rows[0]);

    const autoExport = await runPostClientCodeAutomations({
      applicationId: application_id,
      email,
      panNumber,
    });

    // SEND EMAIL
    // await sendMail(email, clientCode);

    // console.log("MAIL SENT SUCCESSFULLY");

    return res.status(200).json({
      success: true,
      message: "Client code generated and mail sent successfully",
      clientCode,
      data: result.rows[0],
      auto_export: autoExport,
    });
  } catch (error) {
    console.error("ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

module.exports = {
  generateClientCodeAfterPayment,
};
