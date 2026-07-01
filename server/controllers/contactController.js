const pool = require("../config/db");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const axios = require("axios");
const fsp = require("fs/promises");

const {
  generateAccountOpeningPdf,
} = require("../services/accountOpeningPdfService");

const {
  getApplicationDetailQuery,
} = require("../queries/adminQueries");

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
const MAX_OTP_ATTEMPTS = Number(process.env.MAX_OTP_ATTEMPTS || 3);

const EMAIL_OTP_EXPIRY_SECONDS = Number(
  process.env.EMAIL_OTP_EXPIRY_SECONDS || 300,
);
const EMAIL_MAX_OTP_ATTEMPTS = Number(process.env.EMAIL_MAX_OTP_ATTEMPTS || 3);

// -----------------------------
// HELPERS
// -----------------------------
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const generateApplicationNumber = () => {
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `KYC${Date.now()}${randomPart}`;
};

const isValidMobile = (mobile) => /^[0-9]{10}$/.test(String(mobile || ""));
const isValidOtp = (otp) => /^[0-9]{6}$/.test(String(otp || ""));
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const safeRollback = async (client) => {
  try {
    if (client) {
      await client.query("ROLLBACK");
    }
  } catch (rollbackError) {
    console.error("Rollback error:", rollbackError.message);
  }
};

const logDbError = (label, error) => {
  console.error(`${label} message:`, error.message);
  console.error(`${label} detail:`, error.detail || null);
  console.error(`${label} table:`, error.table || null);
  console.error(`${label} column:`, error.column || null);
  console.error(`${label} constraint:`, error.constraint || null);
  console.error(`${label} full error:`, error);
};

// -----------------------------
// SMS COUNTRY CONFIG
// -----------------------------
const sendOtpToMobile = async (mobileNumber, otp) => {
  try {
    if (!process.env.OTP_API_URL || !process.env.OTP_AUTH_KEY || !process.env.OTP_AUTH_TOKEN) {
      const error = new Error("SMS OTP provider configuration is incomplete");
      error.providerPayload = {
        hasOtpApiUrl: Boolean(process.env.OTP_API_URL),
        hasOtpAuthKey: Boolean(process.env.OTP_AUTH_KEY),
        hasOtpAuthToken: Boolean(process.env.OTP_AUTH_TOKEN),
      };
      throw error;
    }

    const authString = `${process.env.OTP_AUTH_KEY}:${process.env.OTP_AUTH_TOKEN}`;
    const encodedAuth = Buffer.from(authString).toString("base64");

    const payload = {
      Text: `Dear customer, the one time password for Your KYC is: ${otp}. Please use this code to complete your KYC process. - AIONION.`,
      Number: `91${mobileNumber}`,
      SenderId: process.env.OTP_SENDER_ID || "AIOCAP",
      TemplateId: process.env.OTP_TEMPLATE_ID || "1707173503759308156",
    };

    const response = await axios.post(process.env.OTP_API_URL, payload, {
      headers: {
        Authorization: `Basic ${encodedAuth}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    console.log("SMSCountry OTP sent:", {
      mobile: payload.Number,
      senderId: payload.SenderId,
      templateId: payload.TemplateId,
    });

    return response.data;
  } catch (error) {
    const providerPayload = error.response?.data || error.providerPayload || null;
    const providerStatus = error.response?.status || null;
    console.error(
      "SMSCountry OTP send error:",
      providerPayload || error.message,
    );
    const nextError = new Error("Failed to send mobile OTP");
    nextError.providerPayload = providerPayload;
    nextError.httpStatus = providerStatus;
    throw nextError;
  }
};

// -----------------------------
// SMTP CONFIG
// -----------------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpToEmail = async (email, otp) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Your Email OTP for eKYC",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Email Verification</h2>
          <p>Your OTP for eKYC verification is:</p>
          <h1 style="letter-spacing: 4px;">${otp}</h1>
          <p>This OTP is valid for ${Math.floor(
            EMAIL_OTP_EXPIRY_SECONDS / 60,
          )} minutes.</p>
          <p>Please do not share this OTP with anyone.</p>
        </div>
      `,
    });

    console.log("SMTP email OTP sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("SMTP email send error:", error.message);
    throw new Error("Failed to send email OTP");
  }
};

// -----------------------------
// 1) START CONTACT REGISTRATION
// -----------------------------
const createNumberRegistration = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { mobile_number, terms_accepted } = req.body;

    if (!mobile_number) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    if (!isValidMobile(mobile_number)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    if (terms_accepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Please accept Terms & Conditions",
      });
    }
    console.log("STEP 1: validation passed");

    await client.query("BEGIN");
    console.log("STEP 2: transaction started");

    const existingContactResult = await client.query(
      `
      SELECT
        cd.*,
        ka.id AS application_id,
        ka.application_number,
        ka.current_step,
        ka.kyc_status,
        ka.is_completed
      FROM public.contact_details cd
      INNER JOIN public.kyc_applications ka
        ON ka.id = cd.application_id
      WHERE cd.mobile_number = $1
      ORDER BY
        CASE
          WHEN ka.is_completed = true OR ka.kyc_status = 'completed' THEN 1
          ELSE 0
        END,
        ka.updated_at DESC,
        ka.id DESC
      LIMIT 1
      `,
      [mobile_number],
    );
    console.log("STEP 3: checked existing contact");

    let applicationId;
    let applicationNumber;
    let contactRow;
    let currentStep;
    let kycStatus;

    if (existingContactResult.rows.length > 0) {
      const existing = existingContactResult.rows[0];

      if (existing.is_completed || existing.kyc_status === "completed") {
        await safeRollback(client);
        return res.status(409).json({
          success: false,
          message: "KYC already completed for this mobile number",
        });
      }

      applicationId = existing.application_id;
      applicationNumber = existing.application_number;
      currentStep = existing.current_step;
      kycStatus = existing.kyc_status;

const updatedContact = await client.query(
  `
  UPDATE public.contact_details
  SET 
      terms_accepted = $2,
      updated_at = NOW()
  WHERE application_id = $1
  RETURNING *
  `,
  [applicationId, terms_accepted],
);

      contactRow = updatedContact.rows[0];
    } else {
      const applicationResult = await client.query(
        `
        INSERT INTO public.kyc_applications
          (
            application_number,
            current_step,
            kyc_status,
            is_completed,
            created_at,
            updated_at
          )
        VALUES
          ($1, 'contact_details', 'in_progress', false, NOW(), NOW())
        RETURNING *
        `,
        [generateApplicationNumber()],
      );
      console.log("STEP 4: inserted application");

      const application = applicationResult.rows[0];
      applicationId = application.id;
      applicationNumber = application.application_number;
      currentStep = application.current_step;
      kycStatus = application.kyc_status;

      const contactResult = await client.query(
        `
        INSERT INTO public.contact_details
          (
            application_id,
            mobile_number,
            terms_accepted,
            mobile_verified,
            email_verified,
            created_at,
            updated_at
          )
        VALUES
          ($1, $2, $3, false, false, NOW(), NOW())
        RETURNING *
        
        `,
        [applicationId, mobile_number, terms_accepted],
      );
      console.log("STEP 5: inserted contact_details");

      contactRow = contactResult.rows[0];

      await client.query(
        `
        INSERT INTO public.kyc_process
          (
            application_id,
            step_name,
            step_status,
            remarks,
            created_at,
            updated_at
          )
        VALUES
          ($1, 'contact_details', 'in_progress', 'Contact step started', NOW(), NOW())
        `,
        [applicationId],
      );
    }
    console.log("STEP 6: inserted kyc_process");

    await client.query(
      `
      UPDATE public.otp_sessions
      SET is_used = true
      WHERE application_id = $1
        AND is_used = false
      `,
      [applicationId],
    );
    console.log("STEP 8: inserted otp_sessions");

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await client.query(
      `
      INSERT INTO public.otp_sessions
        (
          application_id,
          mobile_number,
          otp_hash,
          expires_at,
          attempts,
          is_used,
          created_at
        )
      VALUES
        ($1, $2, $3, $4, 0, false, NOW())
      `,
      [applicationId, mobile_number, otpHash, expiresAt],
    );

    await sendOtpToMobile(mobile_number, otp);
    console.log("STEP 9: OTP sent to mobile");

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Mobile OTP sent successfully",
      data: {
        application_id: applicationId,
        application_number: applicationNumber,
        mobile_number: contactRow.mobile_number,
        mobile_verified: contactRow.mobile_verified,
        email_verified: contactRow.email_verified,
        current_step: currentStep,
        kyc_status: kycStatus,
      },
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Create/send mobile OTP error", error);

    return res.status(500).json({
      success: false,
      message:
        error.providerPayload?.Message ||
        error.providerPayload?.message ||
        error.providerPayload?.error_description ||
        error.providerPayload?.error ||
        "Server error while sending mobile OTP",
      error: error.message,
      provider_status: error.httpStatus || null,
      provider_payload: error.providerPayload || null,
      table: error.table || null,
      column: error.column || null,
      detail: error.detail || null,
    });
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// 2) VERIFY MOBILE OTP
// -----------------------------
const verifyMobileOtp = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { application_id, mobile_number, otp } = req.body;

    if (!application_id || !mobile_number || !otp) {
      return res.status(400).json({
        success: false,
        message: "Application ID, mobile number, and OTP are required",
      });
    }

    if (!isValidMobile(mobile_number)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    if (!isValidOtp(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits",
      });
    }

    await client.query("BEGIN");

    const contactResult = await client.query(
      `
      SELECT * FROM public.contact_details
      WHERE application_id = $1
        AND mobile_number = $2
      LIMIT 1
      `,
      [application_id, mobile_number],
    );

    if (contactResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({
        success: false,
        message: "Contact details not found",
      });
    }

    const otpResult = await client.query(
      `
      SELECT * FROM public.otp_sessions
      WHERE application_id = $1
        AND mobile_number = $2
        AND is_used = false
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [application_id, mobile_number],
    );

    if (otpResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(400).json({
        success: false,
        message: "No active OTP found. Please resend OTP",
      });
    }

    const otpSession = otpResult.rows[0];

    if (new Date() > new Date(otpSession.expires_at)) {
      await safeRollback(client);
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please resend OTP",
      });
    }

    if (otpSession.attempts >= MAX_OTP_ATTEMPTS) {
      await safeRollback(client);
      return res.status(429).json({
        success: false,
        message: "Maximum OTP attempts exceeded. Please resend OTP",
      });
    }

    const enteredOtpHash = hashOtp(otp);

    if (enteredOtpHash !== otpSession.otp_hash) {
      await client.query(
        `
        UPDATE public.otp_sessions
        SET attempts = attempts + 1
        WHERE id = $1
        `,
        [otpSession.id],
      );

      await client.query("COMMIT");

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    await client.query(
      `
      UPDATE public.otp_sessions
      SET is_used = true
      WHERE id = $1
      `,
      [otpSession.id],
    );

    await client.query(
      `
      UPDATE public.contact_details
      SET mobile_verified = true,
          updated_at = NOW()
      WHERE application_id = $1
      `,
      [application_id],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Mobile OTP verified successfully",
      data: {
        application_id,
        mobile_verified: true,
        next_step: "email_registration",
      },
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Verify mobile OTP error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while verifying mobile OTP",
      error: error.message,
      table: error.table || null,
      column: error.column || null,
      detail: error.detail || null,
    });
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// 3) RESEND MOBILE OTP
// -----------------------------
const resendMobileOtp = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { application_id, mobile_number } = req.body;

    if (!application_id || !mobile_number) {
      return res.status(400).json({
        success: false,
        message: "Application ID and mobile number are required",
      });
    }

    if (!isValidMobile(mobile_number)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    await client.query("BEGIN");

    const contactResult = await client.query(
      `
      SELECT * FROM public.contact_details
      WHERE application_id = $1
        AND mobile_number = $2
      LIMIT 1
      `,
      [application_id, mobile_number],
    );

    if (contactResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({
        success: false,
        message: "Contact details not found",
      });
    }

    const contact = contactResult.rows[0];

    if (contact.mobile_verified) {
      await safeRollback(client);
      return res.status(400).json({
        success: false,
        message: "Mobile number already verified",
      });
    }

    await client.query(
      `
      UPDATE public.otp_sessions
      SET is_used = true
      WHERE application_id = $1
        AND is_used = false
      `,
      [application_id],
    );

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await client.query(
      `
      INSERT INTO public.otp_sessions
        (
          application_id,
          mobile_number,
          otp_hash,
          expires_at,
          attempts,
          is_used,
          created_at
        )
      VALUES
        ($1, $2, $3, $4, 0, false, NOW())
      `,
      [application_id, mobile_number, otpHash, expiresAt],
    );

    await sendOtpToMobile(mobile_number, otp);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Mobile OTP resent successfully",
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Resend mobile OTP error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while resending mobile OTP",
      error: error.message,
      table: error.table || null,
      column: error.column || null,
      detail: error.detail || null,
    });
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// 4) UPDATE MOBILE NUMBER
// -----------------------------
const updateMobileNumber = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { application_id } = req.params;
    const { mobile_number, terms_accepted } = req.body;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    if (!mobile_number) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    if (!isValidMobile(mobile_number)) {
      return res.status(400).json({
        success: false,
        message: "Mobile number must be 10 digits",
      });
    }

    if (terms_accepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Please accept Terms & Conditions",
      });
    }

    await client.query("BEGIN");

    const existingContact = await client.query(
      `
      SELECT * FROM public.contact_details
      WHERE mobile_number = $1
        AND application_id <> $2
      LIMIT 1
      `,
      [mobile_number, application_id],
    );

    if (existingContact.rows.length > 0) {
      const appCheck = await client.query(
        `
        SELECT * FROM public.kyc_applications
        WHERE id = $1
        LIMIT 1
        `,
        [existingContact.rows[0].application_id],
      );

      if (
        appCheck.rows.length > 0 &&
        (appCheck.rows[0].kyc_status === "completed" ||
          appCheck.rows[0].is_completed)
      ) {
        await safeRollback(client);
        return res.status(409).json({
          success: false,
          message:
            "Another completed KYC already exists with this mobile number",
        });
      }
    }

    const updateResult = await client.query(
      `
      UPDATE public.contact_details
      SET mobile_number = $1,
          terms_accepted = $2,
          mobile_verified = false,
          updated_at = NOW()
      WHERE application_id = $3
      RETURNING *
      `,
      [mobile_number, terms_accepted, application_id],
    );

    if (updateResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({
        success: false,
        message: "Contact details not found",
      });
    }

    await client.query(
      `
      UPDATE public.otp_sessions
      SET is_used = true
      WHERE application_id = $1
        AND is_used = false
      `,
      [application_id],
    );

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await client.query(
      `
      INSERT INTO public.otp_sessions
        (
          application_id,
          mobile_number,
          otp_hash,
          expires_at,
          attempts,
          is_used,
          created_at
        )
      VALUES
        ($1, $2, $3, $4, 0, false, NOW())
      `,
      [application_id, mobile_number, otpHash, expiresAt],
    );

    await sendOtpToMobile(mobile_number, otp);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Mobile number updated and OTP sent successfully",
      data: updateResult.rows[0],
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Update mobile number error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating mobile number",
      error: error.message,
      table: error.table || null,
      column: error.column || null,
      detail: error.detail || null,
    });
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// 5) CREATE EMAIL REGISTRATION / SEND EMAIL OTP
// -----------------------------
const createEmailRegistration = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { application_id, email, terms_accepted } = req.body;

    if (!application_id || !email) {
      return res.status(400).json({
        success: false,
        message: "Application ID and email are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (terms_accepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Please accept Terms & Conditions",
      });
    }

    await client.query("BEGIN");

    const contactResult = await client.query(
      `
      SELECT * FROM public.contact_details
      WHERE application_id = $1
      LIMIT 1
      `,
      [application_id],
    );

    if (contactResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({
        success: false,
        message: "Contact details not found",
      });
    }

    if (!contactResult.rows[0].mobile_verified) {
      await safeRollback(client);
      return res.status(400).json({
        success: false,
        message: "Please verify mobile number first",
      });
    }

    const updatedContact = await client.query(
      `
      UPDATE public.contact_details
      SET email = $1,
          email_verified = false,
          terms_accepted = $2,
          updated_at = NOW()
      WHERE application_id = $3
      RETURNING *
      `,
      [email, terms_accepted, application_id],
    );

    await client.query(
      `
      UPDATE public.email_otp_sessions
      SET is_used = true
      WHERE application_id = $1
        AND is_used = false
      `,
      [application_id],
    );

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_SECONDS * 1000);

    await client.query(
      `
      INSERT INTO public.email_otp_sessions
        (
          application_id,
          email,
          otp_hash,
          expires_at,
          attempts,
          is_used,
          created_at
        )
      VALUES
        ($1, $2, $3, $4, 0, false, NOW())
      `,
      [application_id, email, otpHash, expiresAt],
    );

    await sendOtpToEmail(email, otp);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Email OTP sent successfully",
      data: {
        application_id,
        email: updatedContact.rows[0].email,
      },
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Create/send email OTP error", error);

    console.error("Create/send mobile OTP error message:", error.message);
    console.error("Create/send mobile OTP error detail:", error.detail);
    console.error("Create/send mobile OTP error table:", error.table);
    console.error("Create/send mobile OTP error column:", error.column);
    console.error("Create/send mobile OTP error constraint:", error.constraint);
    console.error("Create/send mobile OTP full error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while sending email OTP",
      error: error.message,
      table: error.table || null,
      column: error.column || null,
      detail: error.detail || null,
    });
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// 6) VERIFY EMAIL OTP
// -----------------------------
const verifyEmailOtp = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { application_id, email, otp } = req.body;

    if (!application_id || !email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Application ID, email and OTP are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    if (!isValidOtp(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be 6 digits",
      });
    }

    await client.query("BEGIN");

    const otpResult = await client.query(
      `
      SELECT * FROM public.email_otp_sessions
      WHERE application_id = $1
        AND email = $2
        AND is_used = false
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [application_id, email],
    );

    if (otpResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(400).json({
        success: false,
        message: "No active email OTP found. Please resend OTP",
      });
    }

    const otpSession = otpResult.rows[0];

    if (new Date() > new Date(otpSession.expires_at)) {
      await safeRollback(client);
      return res.status(400).json({
        success: false,
        message: "Email OTP expired. Please resend OTP",
      });
    }

    if (otpSession.attempts >= EMAIL_MAX_OTP_ATTEMPTS) {
      await safeRollback(client);
      return res.status(429).json({
        success: false,
        message: "Maximum attempts exceeded. Please resend OTP",
      });
    }

    const enteredOtpHash = hashOtp(otp);

    if (enteredOtpHash !== otpSession.otp_hash) {
      await client.query(
        `
        UPDATE public.email_otp_sessions
        SET attempts = attempts + 1
        WHERE id = $1
        `,
        [otpSession.id],
      );

      await client.query("COMMIT");

      return res.status(400).json({
        success: false,
        message: "Invalid email OTP",
      });
    }

    await client.query(
      `
      UPDATE public.email_otp_sessions
      SET is_used = true
      WHERE id = $1
      `,
      [otpSession.id],
    );

    await client.query(
      `
      UPDATE public.contact_details
      SET email_verified = true,
          updated_at = NOW()
      WHERE application_id = $1
      `,
      [application_id],
    );

    await client.query(
      `
      UPDATE public.kyc_process
      SET step_status = 'completed',
          remarks = 'Mobile and email verified',
          updated_at = NOW()
      WHERE application_id = $1
        AND step_name = 'contact_details'
      `,
      [application_id],
    );

    await client.query(
      `
      UPDATE public.kyc_applications
      SET current_step = 'pan_details',
          updated_at = NOW()
      WHERE id = $1
      `,
      [application_id],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        application_id,
        email_verified: true,
        contact_step_completed: true,
        next_step: "pan_details",
      },
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Verify email OTP error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while verifying email OTP",
      error: error.message,
      table: error.table || null,
      column: error.column || null,
      detail: error.detail || null,
    });
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// 7) RESEND EMAIL OTP
// -----------------------------
const resendEmailOtp = async (req, res) => {
  let client;

  try {
    client = await pool.connect();

    const { application_id, email } = req.body;

    if (!application_id || !email) {
      return res.status(400).json({
        success: false,
        message: "Application ID and email are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    await client.query("BEGIN");

    const contactResult = await client.query(
      `
      SELECT * FROM public.contact_details
      WHERE application_id = $1
        AND email = $2
      LIMIT 1
      `,
      [application_id, email],
    );

    if (contactResult.rows.length === 0) {
      await safeRollback(client);
      return res.status(404).json({
        success: false,
        message: "Contact details with email not found",
      });
    }

    if (contactResult.rows[0].email_verified) {
      await safeRollback(client);
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    await client.query(
      `
      UPDATE public.email_otp_sessions
      SET is_used = true
      WHERE application_id = $1
        AND is_used = false
      `,
      [application_id],
    );

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + EMAIL_OTP_EXPIRY_SECONDS * 1000);

    await client.query(
      `
      INSERT INTO public.email_otp_sessions
        (
          application_id,
          email,
          otp_hash,
          expires_at,
          attempts,
          is_used,
          created_at
        )
      VALUES
        ($1, $2, $3, $4, 0, false, NOW())
      `,
      [application_id, email, otpHash, expiresAt],
    );

    await sendOtpToEmail(email, otp);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Email OTP resent successfully",
    });
  } catch (error) {
    await safeRollback(client);
    logDbError("Resend email OTP error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while resending email OTP",
      error: error.message,
      table: error.table || null,
      column: error.column || null,
      detail: error.detail || null,
    });
  } finally {
    if (client) client.release();
  }
};

// -----------------------------
// 10) PUBLIC APPLICATION PDF DOWNLOAD
// -----------------------------
const downloadApplicationPdf = async (req, res) => {
  try {
    const { application_id } = req.params;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    const result = await pool.query(getApplicationDetailQuery, [
      application_id,
    ]);
    const application = result.rows[0]?.application || null;

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const pdfResult = await generateAccountOpeningPdf(application);

    const pdfBuffer = await fsp.readFile(pdfResult.outputPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${pdfResult.fileName}"`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (error) {
    console.error("Public application PDF error:", error.message);

    if (error.code === "MISSING_REQUIRED_FIELDS") {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing for final PDF generation",
        missing_fields: error.missingFields || [],
      });
    }

    if (error.code === "TEMPLATE_NOT_FOUND") {
      return res.status(500).json({
        success: false,
        message: "PDF template file not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to generate the application PDF right now",
      error: error.message,
    });
  }
};

// -----------------------------
// 11) RESET TEST APPLICATION
// -----------------------------
const resetTestApplication = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        message: "Test application reset is not available in production",
      });
    }

    const { application_id } = req.params;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM public.kyc_applications
      WHERE id = $1
      RETURNING id, application_number
      `,
      [application_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Test application reset successfully",
      data: result.rows[0],
    });
  } catch (error) {
    logDbError("Reset test application error", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset the test application right now",
      error: error.message,
      table: error.table || null,
      column: error.column || null,
      detail: error.detail || null,
    });
  }
};

module.exports = {
  createNumberRegistration,
  verifyMobileOtp,
  resendMobileOtp,
  updateMobileNumber,
  createEmailRegistration,
  verifyEmailOtp,
  resendEmailOtp,
  downloadApplicationPdf,
  resetTestApplication,
};
