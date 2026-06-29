const crypto = require("crypto");
const pool = require("../config/db");

const generateHash = async (req, res) => {
  try {
    const {
      application_id,
      txnid,
      amount,
      firstname,
      email,
      phone,
      productinfo,
    } = req.body;

    // SAVE PAYMENT IN DB
    await pool.query(
      `
      INSERT INTO payments_details (
        application_id,
        txnid,
        amount,
        firstname,
        email,
        phone,
        payment_status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [application_id, txnid, amount, firstname, email, phone, "pending"],
    );

    // PAYU HASH
    const key = process.env.PAYU_KEY;
    const salt = process.env.PAYU_SALT;

    const apiGatewayBase = process.env.API_GATEWAY_URL || "https://57yp657i65.execute-api.ap-south-1.amazonaws.com/staging";
    const surl = `${apiGatewayBase}/api/payment/success`;
    const furl = `${apiGatewayBase}/api/payment/failure`;

    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;

    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    res.json({
      key,
      txnid,
      amount,
      firstname,
      email,
      phone,
      productinfo,
      surl,
      furl,
      service_provider: "payu_paisa",
      hash,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const paymentSuccess = async (req, res) => {
  try {
    const { txnid, amount, mode, status, mihpayid } = req.body;

    // UPDATE PAYMENT
    await pool.query(
      `
      UPDATE payments_details
      SET
        payment_status = $1,
        payment_method = $2
      WHERE txnid = $3
      `,
      [status, mode, txnid],
    );

    const frontendBase = process.env.FRONTEND_BASE_URL || "https://main.d1nw5j5nzx2oue.amplifyapp.com";
    return res.redirect(`${frontendBase}/payment-completed`);
  } catch (error) {
    console.log(error);

    res.send("Payment Update Failed");
  }
};

const paymentFailure = async (req, res) => {
  try {
    const { txnid } = req.body;

    await pool.query(
      `
      UPDATE payments_details
      SET payment_status = 'failed'
      WHERE txnid = $1
      `,
      [txnid],
    );

    res.send("Payment Failed");
  } catch (error) {
    console.log(error);

    res.send("Failure Update Error");
  }
};

module.exports = {
  generateHash,
  paymentSuccess,
  paymentFailure,
};
