const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// developer
const { warmUpDateStyle } = require("./bootstrap/configurePostgresDateStyle");

const pdfStepRoutes = require("./pdf-flow/routes/pdfStepRoutes");

const contactRoutes = require("./routes/contactRoutes");

const panRoutes = require("./routes/panRoutes");

const panCheckRoutes = require("./routes/panCheckRoutes");

const digilockerRoutes = require("./routes/digilockerRoutes");

const bankDetailsRoutes = require("./routes/bankDetailsRoutes");

const personalDetailsRoutes = require("./routes/personalDetailsRoutes");

const nomineeRoutes = require("./routes/nomineeRoutes");

const paymentRoutes = require("./routes/paymentRoutes");

const photoRoutes = require("./routes/photoRoutes");

const clientCodeRoutes = require("./routes/clientCodeRoutes");

const signatureRoutes = require("./routes/signatureRoutes");

const panUploadRoutes = require("./routes/panUploadRoutes");

const esignRoutes = require("./routes/esignRoutes");

const ddpiRoutes = require("./routes/ddpiRoutes");
const nseExportRoutes = require("./routes/nseExportRoutes");
const bseExportRoutes = require("./routes/bseExportRoutes");
const nsdlExportRoutes = require("./routes/nsdlExportRoutes");
const mfExportRoutes = require("./routes/mfExportRoutes");
const cdslExportRoutes = require("./routes/cdslExportRoutes");
const schemeRoutes = require("./routes/schemeRoutes");

const app = express();

// developer

warmUpDateStyle().catch((error) => {
  console.error("Unable to warm up Postgres datestyle:", error.message);
});

// Middlewares
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://main.d1nw5j5nzx2oue.amplifyapp.com");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Api-Key, X-Amz-Date, X-Amz-Security-Token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");

  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }

  next();
});

app.use(
  express.json({
    limit: "50mb",
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
  }),
);

app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.originalUrl);

  const stage = process.env.API_STAGE || "staging";
  if (req.url === `/${stage}` || req.url.startsWith(`/${stage}/`)) {
    req.url = req.url.replace(`/${stage}`, "") || "/";
  }

  console.log("Normalized request:", req.method, req.url);
  next();
});

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
// developer
app.use("/api/contact", pdfStepRoutes);

app.use("/api/contact", contactRoutes);

app.use("/api/identify", panRoutes);

app.use("/api", panCheckRoutes);

app.use("/api/digilocker", digilockerRoutes);

app.use("/api/bank-details", bankDetailsRoutes);

app.use("/api/personal-details", personalDetailsRoutes);

app.use("/api/nominees", nomineeRoutes);

app.use("/api/payment", paymentRoutes);

app.use("/api/photo", photoRoutes);

app.use("/api/client", clientCodeRoutes);

app.use("/api/signature", signatureRoutes);

app.use("/api/pancard", panUploadRoutes);

app.use("/api/esign", esignRoutes);

app.use("/api/ddpi", ddpiRoutes);

app.use("/api/scheme", schemeRoutes);

app.use("/api/export", nseExportRoutes);
app.use("/api/export", bseExportRoutes);
app.use("/api/export", nsdlExportRoutes);
app.use("/api/export", mfExportRoutes);
app.use("/api/export", cdslExportRoutes);

app.get("/", (req, res) => {
  res.send("KYC API Server Running");
});

app.use((err, req, res, next) => {
  console.error("Unhandled API error:", err);

  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://main.d1nw5j5nzx2oue.amplifyapp.com",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  return res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

module.exports = app;
