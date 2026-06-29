const nodemailer = require("nodemailer");

const sendMail = async (email, clientCode) => {
  try {
    // CHECK ENV VALUES
    console.log("SMTP_HOST:", process.env.SMTP_HOST);

    console.log("SMTP_PORT:", process.env.SMTP_PORT);

    console.log("SMTP_USER:", process.env.SMTP_USER);

    console.log("SMTP_PASS:", process.env.SMTP_PASS);

    console.log("MAIL_FROM:", process.env.MAIL_FROM);

    console.log("CLIENT EMAIL:", email);

    console.log("CLIENT CODE:", clientCode);

    // TRANSPORT
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,

      port: Number(process.env.SMTP_PORT),

      secure: false,

      auth: {
        user: process.env.SMTP_USER,

        pass: process.env.SMTP_PASS,
      },

      tls: {
        rejectUnauthorized: false,
      },
    });

    // VERIFY SMTP
    transporter.verify(function (error, success) {
      if (error) {
        console.log("SMTP VERIFY ERROR:");

        console.log(error);
      } else {
        console.log("SMTP SERVER READY");
      }
    });

    // MAIL DATA
    const mailOptions = {
      from: process.env.MAIL_FROM,

      to: email,

      subject: "Client Code Generated Successfully",

      html: `
        <h2>
          Welcome to Aionion Capital
        </h2>

        <h3>
          Client Code:
          ${clientCode}
        </h3>
      `,
    };

    console.log("SENDING MAIL...");

    // SEND MAIL
    const info = await transporter.sendMail(mailOptions);

    console.log("MAIL SENT SUCCESSFULLY");

    console.log("MAIL RESPONSE:", info.response);

    return true;
  } catch (error) {
    console.log("MAIL ERROR FULL:");

    console.log(error);

    if (error.response) {
      console.log("ERROR RESPONSE:");

      console.log(error.response);
    }

    throw error;
  }
};

module.exports = sendMail;
