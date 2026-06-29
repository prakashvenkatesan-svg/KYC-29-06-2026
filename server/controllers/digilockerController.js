const { startDigilocker } = require("../services/startDigilocker");
const axios = require("axios");

const startDigilockerController = async (req, res) => {
  try {
    const result = await startDigilocker();

    if (!result?.success) {
      return res.status(400).json({
        success: false,
        message: "Unable to start DigiLocker",
      });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getDigilockerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("DIGILOCKER FETCH ID:", id);

    const response = await axios.get(
      `https://dg.setu.co/api/digilocker/${id}/status`,
      {
        headers: {
          "x-client-id": process.env.DIGILOCKER_CLIENT_ID,
          "x-client-secret": process.env.DIGILOCKER_CLIENT_SECRET,
          "x-product-instance-id": process.env.DIGILOCKER_PRODUCT_ID,
        },
      },
    );

    return res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch DigiLocker details",
    });
  }
};

const getAadhaarData = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(
      `https://dg.setu.co/api/digilocker/${id}/aadhaar`,
      {
        headers: {
          "x-client-id": process.env.DIGILOCKER_CLIENT_ID,
          "x-client-secret": process.env.DIGILOCKER_CLIENT_SECRET,
          "x-product-instance-id": process.env.DIGILOCKER_PRODUCT_ID,
        },
      },
    );

    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.response?.data || error.message,
    });
  }
};

module.exports = {
  startDigilockerController,
  getDigilockerDetails,
  getAadhaarData,
};
