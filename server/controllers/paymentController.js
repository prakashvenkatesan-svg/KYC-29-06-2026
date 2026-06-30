const crypto = require("crypto");
const pool = require("../config/db");

const resolveBackendBaseUrl = (req) => {
  if (process.env.PAYMENT_API_BASE_URL) {
    return process.env.PAYMENT_API_BASE_URL;
  }

  if (process.env.API_GATEWAY_URL) {
    return process.env.API_GATEWAY_URL;
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const protocol =
    forwardedProto ||
    (req.secure ? "https" : "http");
  const host = req.get("host") || "localhost:5000";

  return `${protocol}://${host}`;
};

const resolveFrontendBaseUrl = () => {
  if (process.env.PAYMENT_FRONTEND_BASE_URL) {
    return process.env.PAYMENT_FRONTEND_BASE_URL;
  }

  if (process.env.FRONTEND_BASE_URL) {
    return process.env.FRONTEND_BASE_URL;
  }

  if (process.env.REACT_APP_SITE_URL) {
    return process.env.REACT_APP_SITE_URL;
  }

  return "http://localhost:3000";
};

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

    const backendBaseUrl = resolveBackendBaseUrl(req);
    const surl = `${backendBaseUrl}/api/payment/success`;
    const furl = `${backendBaseUrl}/api/payment/failure`;

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

    const frontendBase = resolveFrontendBaseUrl();
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
