// controllers/panCheckController.js
const axios = require("axios");

const checkPanInTechexcel = async (req, res) => {
  try {
    const { pan } = req.body;

    if (!pan) {
      return res.status(400).json({
        success: false,
        message: "PAN number is required",
      });
    }

    const cleanPan = pan.toUpperCase().trim();

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(cleanPan)) {
      return res.status(400).json({
        success: false,
        message: "Invalid PAN format",
      });
    }

    const techexcelResponse = await axios.post(
      process.env.TECHEXCEL_PAN_CHECK_URL,
      {
        pan: cleanPan,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TECHEXCEL_TOKEN}`,
        },
        timeout: 15000,
      },
    );

    const data = techexcelResponse.data;

    // Adjust this condition based on actual TechExcel response
    const panExists =
      data?.exists === true ||
      data?.status === "FOUND" ||
      data?.message === "PAN already exists";

    if (panExists) {
      return res.status(200).json({
        success: true,
        exists: true,
        message: "You already have an account in Aionion Capital",
        data,
      });
    }

    return res.status(200).json({
      success: true,
      exists: false,
      message: "PAN not found, continue account opening",
      data,
    });
  } catch (error) {
    console.error(
      "TechExcel PAN check error:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to check PAN in TechExcel",
      error: error.response?.data || error.message,
    });
  }
};

module.exports = { checkPanInTechexcel };
