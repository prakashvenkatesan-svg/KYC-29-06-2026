const axios = require("axios");
const https = require("https");

const TECHEXCEL_API_URL = process.env.TECHEXCEL_API_URL;
const TECHEXCEL_TOKEN = process.env.TECHEXCEL_TOKEN;

async function checkPanExistsInTechExcel(panNumber) {
  try {
    const response = await axios.post(
      TECHEXCEL_API_URL,
      {
        Pan_no: panNumber,
      },
      {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // UAT only
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TECHEXCEL_TOKEN}`,
        },
        timeout: 30000,
      },
    );

    const data = response.data;

    console.log("TECHEXCEL RAW RESPONSE:", JSON.stringify(data, null, 2));

    const exists =
      data?.Success === "True" &&
      Array.isArray(data?.["Success Description"]) &&
      data["Success Description"].length > 0;

    console.log("TECHEXCEL EXISTS:", exists);

    return {
      success: true,
      exists,
      data,
    };
  } catch (error) {
    console.error(
      "TECHEXCEL API ERROR:",
      error.response?.data || error.message,
    );

    return {
      success: false,
      exists: false,
      data: null,
      error: error.response?.data || error.message,
    };
  }
}

module.exports = {
  checkPanExistsInTechExcel,
};
