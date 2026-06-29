const crypto = require("crypto");

const pool = require("../config/db");
const { getAdminUserByEmailQuery } = require("../queries/adminQueries");
const { createAdminToken } = require("../utils/adminAuth");

const hashAdminPassword = (password) =>
  crypto.createHash("sha256").update(String(password)).digest("hex");

const logDbError = (label, error) => {
  console.error(`${label} message:`, error.message);
  console.error(`${label} detail:`, error.detail || null);
  console.error(`${label} table:`, error.table || null);
  console.error(`${label} column:`, error.column || null);
  console.error(`${label} constraint:`, error.constraint || null);
  console.error(`${label} full error:`, error);
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await pool.query(getAdminUserByEmailQuery, [
      String(email).trim().toLowerCase(),
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const adminUser = result.rows[0];

    if (!adminUser.is_active) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive",
      });
    }

    const incomingHash = hashAdminPassword(password);

    if (incomingHash !== adminUser.password_hash) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const token = createAdminToken({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name,
    });

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        token,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      },
    });
  } catch (error) {
    logDbError("Admin login error", error);

    return res.status(500).json({
      success: false,
      message: "Server error while logging in",
      error: error.message,
    });
  }
};

const getAdminProfile = async (req, res) =>
  res.status(200).json({
    success: true,
    message: "Admin profile fetched successfully",
    data: {
      id: req.adminUser.id,
      name: req.adminUser.name,
      email: req.adminUser.email,
      role: req.adminUser.role,
      exp: req.adminUser.exp,
    },
  });

module.exports = {
  loginAdmin,
  getAdminProfile,
};
