const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendClientCodeMail(toEmail, clientName, clientCode) {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Your Client Code Generated Successfully",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome to Aionion Capital</h2>
        <p>Dear ${clientName || "Client"},</p>
        <p>Your client code has been generated successfully.</p>
        <p><strong>Client Code:</strong> ${clientCode}</p>
        <p>Please keep this client code safe for future reference.</p>
        <p>Regards,<br/>Aionion Capital Team</p>
      </div>
    `,
  };

  return await transporter.sendMail(mailOptions);
}

async function sendKycCompletionMail({
  toEmail,
  clientName,
  clientCode,
  applicationNumber,
  hasStampPaper,
  attachments = [],
}) {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Your Aionion Capital account opening documents",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Aionion Capital Account Opening Completed</h2>
        <p>Dear ${clientName || "Client"},</p>
        <p>Welcome to the Aionion Family. Your KYC has been completed successfully. You are now ready to begin your financial freedom investment journey with us.
</p>
        <p>Happy investing!!!</p>
        <p><strong>Client Code:</strong> ${clientCode || "-"}</p>
        <p>The signed account opening PDF is attached with this email.</p>
        ${
          hasStampPaper
            ? "<p>Your assigned DDPI stamp paper is also attached.</p>"
            : ""
        }
        <p>Regards,<br/>Aionion Capital Team</p>
      </div>
    `,
    attachments,
  };

  return await transporter.sendMail(mailOptions);
}

module.exports = {
  createTransporter,
  sendClientCodeMail,
  sendKycCompletionMail,
};
