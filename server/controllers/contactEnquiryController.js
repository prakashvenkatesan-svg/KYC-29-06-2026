const pool = require("../config/db");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const isValidPhoneNumber = (phoneNumber) =>
  /^[0-9+\-\s()]{7,20}$/.test(String(phoneNumber || "").trim());

const logDbError = (label, error) => {
  console.error(`${label} message:`, error.message);
  console.error(`${label} detail:`, error.detail || null);
  console.error(`${label} table:`, error.table || null);
  console.error(`${label} column:`, error.column || null);
  console.error(`${label} constraint:`, error.constraint || null);
  console.error(`${label} full error:`, error);
};

const sendContactEnquiryMail = async ({
  firstName,
  lastName,
  email,
  phoneNumber,
  message,
}) => {
  const recipient =
    process.env.CONTACT_ENQUIRY_TO_EMAIL ||
    process.env.MAIL_FROM ||
    process.env.SMTP_USER;

  if (!recipient) {
    throw new Error("Contact enquiry recipient email is not configured");
  }

  const safeMessage = String(message || "")
    .trim()
    .replace(/\n/g, "<br/>");
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: recipient,
    replyTo: email,
    subject: `New Contact Enquiry from ${fullName || "Website Visitor"}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>New Contact Us Enquiry</h2>
        <p><strong>First Name:</strong> ${firstName}</p>
        <p><strong>Last Name:</strong> ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone Number:</strong> ${phoneNumber}</p>
        <p><strong>Message:</strong><br/>${safeMessage}</p>
      </div>
    `,
  });
};

const createContactEnquiry = async (req, res) => {
  try {
    const firstName = String(req.body.first_name || "").trim();
    const lastName = String(req.body.last_name || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const phoneNumber = String(req.body.phone_number || "").trim();
    const message = String(req.body.message || "").trim();

    if (!firstName || !lastName || !email || !phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: "All enquiry fields are required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number",
      });
    }

    const insertResult = await pool.query(
      `
      INSERT INTO public.contact_enquiries
        (
          first_name,
          last_name,
          email,
          phone_number,
          message,
          created_at,
          updated_at
        )
      VALUES
        ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, created_at
      `,
      [firstName, lastName, email, phoneNumber, message],
    );

    let emailSent = true;
    let responseMessage = "Your enquiry has been submitted successfully";

    try {
      await sendContactEnquiryMail({
        firstName,
        lastName,
        email,
        phoneNumber,
        message,
      });
    } catch (mailError) {
      emailSent = false;
      responseMessage =
        "Your enquiry has been submitted successfully, but email notification could not be sent right now";
      console.error("Contact enquiry mail error:", mailError.message);
    }

    return res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        ...insertResult.rows[0],
        email_sent: emailSent,
      },
    });
  } catch (error) {
    logDbError("Create contact enquiry error", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit your enquiry right now",
      error: error.message,
    });
  }
};

module.exports = {
  createContactEnquiry,
};
