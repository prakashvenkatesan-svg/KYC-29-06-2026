const axios = require("axios");

const startDigilocker = async () => {
  try {
    const frontendBase = process.env.FRONTEND_BASE_URL || "http://localhost:3000";
    const response = await axios.post(
      `https://dg.setu.co/api/digilocker`,
      {
        redirectUrl: `${frontendBase}/digilocker-success`,
      },
      {
        headers: {
          "x-client-id": process.env.DIGILOCKER_CLIENT_ID,
          "x-client-secret": process.env.DIGILOCKER_CLIENT_SECRET,
          "x-product-instance-id": process.env.DIGILOCKER_PRODUCT_ID,
        },
      },
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log(error.response?.data || error.message);

    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
};

module.exports = {
  startDigilocker,
};
