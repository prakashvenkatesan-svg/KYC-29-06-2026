const axios = require("axios");

const verifyPanWithIncomeTax = async (pan) => {
  try {
    const response = await axios.post(
      "https://dg.setu.co/api/verify/pan",
      {
        pan,
        consent: "Y",
        reason: "PAN verification for account opening",
      },
      {
        headers: {
          "Content-Type": "application/json",

          "x-client-id": process.env.INCOME_TAX_CLIENT_ID,

          "x-client-secret": process.env.INCOME_TAX_CLIENT_SECRET,

          "x-product-instance-id": process.env.INCOME_TAX_PRODUCT_ID,
        },

        timeout: 15000,
      },
    );

    const data = response.data;

    console.log("INCOME TAX PAN RESPONSE:", JSON.stringify(data, null, 2));

    // ✅ PAN VALIDATION
    const isValid = data?.verification === "SUCCESS";

    return {
      success: true,

      valid: isValid,

      incomeTaxVerified: isValid,

      goIncomeTaxPage: isValid,

      data,
    };
  } catch (error) {
    console.error(
      "INCOME TAX PAN ERROR:",
      error.response?.data || error.message,
    );

    return {
      success: false,

      valid: false,

      incomeTaxVerified: false,

      goIncomeTaxPage: false,

      error: error.response?.data || error.message,
    };
  }
};

module.exports = {
  verifyPanWithIncomeTax,
};
