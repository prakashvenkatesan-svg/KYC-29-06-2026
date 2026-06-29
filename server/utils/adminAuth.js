const crypto = require("crypto");

const TOKEN_TTL_SECONDS = Number(process.env.ADMIN_TOKEN_TTL_SECONDS || 28800);

const getAdminTokenSecret = () =>
  process.env.ADMIN_TOKEN_SECRET || "aionion-admin-secret-change-me";

const base64UrlEncode = (value) =>
  Buffer.from(typeof value === "string" ? value : JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = 4 - (normalized.length % 4 || 4);
  const padded = normalized + "=".repeat(padding === 4 ? 0 : padding);
  return Buffer.from(padded, "base64").toString("utf8");
};

const signTokenPayload = (payload) =>
  crypto
    .createHmac("sha256", getAdminTokenSecret())
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createAdminToken = (user) => {
  const payload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(payload);
  const signature = signTokenPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
};

const parseAdminToken = (token) => {
  if (!token || !token.includes(".")) {
    throw new Error("Invalid token format");
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = signTokenPayload(encodedPayload);

  if (signature !== expectedSignature) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
};

const verifyAdminToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Admin authorization token is required",
      });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const payload = parseAdminToken(token);

    req.adminUser = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin token",
      error: error.message,
    });
  }
};

module.exports = {
  createAdminToken,
  parseAdminToken,
  verifyAdminToken,
};
