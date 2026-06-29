const axios = require("axios");
const pool = require("../config/db"); // ekyc_db
const masterPool = require("../config/masterDb"); // master_data

const {
  upsertBankDetails,
  getApplicationById,
  updateBankVerificationStatus,
  saveReversePennyTransaction,
  getTransactionStatus,
} = require("../queries/bankDetailsQueries");

const validateIFSC = (ifsc) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);

const getBankByIFSC = async (req, res) => {
  try {
    const ifscCode = String(req.params.ifscCode || "")
      .trim()
      .toUpperCase();

    if (!validateIFSC(ifscCode)) {
      return res.status(400).json({
        success: false,
        message: "Enter valid IFSC code",
      });
    }

    const bankResult = await masterPool.query(
      `
      SELECT 
        bank_name,
        branch_name,
        address AS bank_address
      FROM bank_master
      WHERE UPPER(ifsc_code) = $1
      LIMIT 1
      `,
      [ifscCode],
    );

    if (bankResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid IFSC Code",
      });
    }

    return res.status(200).json({
      success: true,
      data: bankResult.rows[0],
    });
  } catch (error) {
    console.error("GET BANK BY IFSC ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bank details",
    });
  }
};

const saveBankDetails = async (req, res) => {
  try {
    let {
      application_id,
      accountNumber,
      confirmAccountNumber,
      ifscCode,
      accountType,
    } = req.body;

    if (
      !application_id ||
      !accountNumber ||
      !confirmAccountNumber ||
      !ifscCode ||
      !accountType
    ) {
      return res.status(400).json({
        success: false,
        message: "All bank fields are required",
      });
    }

    if (accountNumber !== confirmAccountNumber) {
      return res.status(400).json({
        success: false,
        message: "Account numbers do not match",
      });
    }

    // Fetch from master_data
    const bankResult = await masterPool.query(
      `
      SELECT
        bank_name,
        branch_name,
        address
      FROM bank_master
      WHERE ifsc_code = $1
      `,
      [ifscCode.toUpperCase()],
    );

    if (bankResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invalid IFSC Code",
      });
    }

    const bankData = bankResult.rows[0];

    const savedData = await upsertBankDetails({
      application_id,
      account_number: accountNumber,
      confirm_account_number: confirmAccountNumber,
      ifsc_code: ifscCode.toUpperCase(),
      account_type: accountType,

      bank_name: bankData.bank_name,
      branch_name: bankData.branch_name,
      bank_address: bankData.address,
    });

    return res.status(200).json({
      success: true,
      message: "Bank details saved successfully",

      data: {
        ...savedData,
        bank_name: bankData.bank_name,
        branch_name: bankData.branch_name,
        bank_address: bankData.address,
      },
    });
  } catch (error) {
    console.error("SAVE BANK DETAILS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const verifyBankAccount = async (req, res) => {
  try {
    const { accountNumber, ifscCode } = req.body;

    /* =========================
         VALIDATION
      ========================= */

    if (!accountNumber || !ifscCode) {
      return res.status(400).json({
        success: false,

        message: "Account number and IFSC required",
      });
    }

    /* =========================
         SETU PENNY DROP API
      ========================= */

    const response = await axios.post(
      "https://dg.setu.co/api/verify/ban",

      {
        accountNumber,

        ifsc: ifscCode,

        consent: "Y",

        reason: "Bank verification",
      },

      {
        headers: {
          "Content-Type": "application/json",

          "x-client-id": process.env.PENNY_DROP_CLIENT_ID,

          "x-client-secret": process.env.PENNY_DROP_CLIENT_SECRET,

          "x-product-instance-id": process.env.PENNY_DROP_PRODUCT_INSTANCE_ID,
        },
      },
    );

    console.log("PENNY DROP RESPONSE:", response.data);

    /* =========================
         CHECK VERIFICATION
      ========================= */

    const verified = response.data.verification === "success";

    return res.status(200).json({
      success: verified,

      verified,

      message: response.data.message,

      data: {
        verificationId: response.data.id,

        accountHolderName: response.data.data?.name,

        verifiedAt: response.data.data?.verifiedAt,

        transactionReference: response.data.data?.transactionReference,

        verification: response.data.verification,

        code: response.data.code,
      },
    });
  } catch (error) {
    console.log("PENNY DROP ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,

      verified: false,

      message: error.response?.data?.message || "Bank verification failed",
    });
  }
};

const createReversePennyDrop = async (req, res) => {
  try {
    const { application_id } = req.body;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "Application ID required",
      });
    }

    /* CALL SETU API */

    const response = await axios.post(
      "https://dg-sandbox.setu.co/api/verify/ban/reverse",

      {
        additionalData: {
          applicationId: String(application_id),
        },
      },

      {
        headers: {
          "Content-Type": "application/json",

          "x-client-id": process.env.REVERSE_PENNY_CLIENT_ID,

          "x-client-secret": process.env.REVERSE_PENNY_CLIENT_SECRET,

          "x-product-instance-id":
            process.env.REVERSE_PENNY_PRODUCT_INSTANCE_ID,
        },
      },
    );

    console.log("SETU RESPONSE:", response.data);

    /* SAVE TRANSACTION */

    await saveReversePennyTransaction({
      application_id,

      transaction_id: response.data.id,

      status: response.data.status,
    });

    return res.status(200).json({
      success: true,

      data: {
        transactionId: response.data.id,

        status: response.data.status,

        shortUrl: response.data.shortUrl,

        upiLink: response.data.upiLink,

        validUpto: response.data.validUpto,
      },
    });
  } catch (error) {
    console.log(
      "REVERSE PENNY DROP ERROR:",
      error.response?.data || error.message,
    );

    return res.status(500).json({
      success: false,

      message: error.response?.data || "Reverse Penny Drop failed",
    });
  }
};

const reversePennyWebhook = async (req, res) => {
  try {
    console.log("WEBHOOK RESPONSE:", req.body);

    const paymentData = req.body;

    const transactionId = paymentData.transactionId;

    if (paymentData.status === "SUCCESS") {
      await updateBankVerificationStatus({
        transaction_id: transactionId,
        verification_status: "VERIFIED",
        bank_verified: true,
      });
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.log("WEBHOOK ERROR:", error);

    return res.status(500).send("FAILED");
  }
};

const checkReversePennyStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const response = await axios.get(
      `https://dg-sandbox.setu.co/api/verify/ban/reverse/${transactionId}`,

      {
        headers: {
          "x-client-id": process.env.REVERSE_PENNY_CLIENT_ID,

          "x-client-secret": process.env.REVERSE_PENNY_CLIENT_SECRET,

          "x-product-instance-id":
            process.env.REVERSE_PENNY_PRODUCT_INSTANCE_ID,
        },
      },
    );

    console.log("STATUS RESPONSE:", response.data);

    const verified = response.data.status === "SUCCESS";

    if (verified) {
      await updateReversePennyStatus(transactionId, "SUCCESS");
    }

    return res.status(200).json({
      success: true,

      verified,

      data: response.data,
    });
  } catch (error) {
    console.log("STATUS CHECK ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to check payment status",
    });
  }
};

module.exports = {
  getBankByIFSC,
  saveBankDetails,
  verifyBankAccount,
  createReversePennyDrop,
  reversePennyWebhook,
  checkReversePennyStatus,
};
