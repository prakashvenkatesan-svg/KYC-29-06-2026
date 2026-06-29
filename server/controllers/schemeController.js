const db = require("../config/db");

const ALLOWED_SCHEMES = new Set(["lifeTime", "annualCare"]);

const saveSchemeSelection = async (req, res) => {
  try {
    const applicationId = Number(req.body?.application_id);
    const selectedScheme = String(req.body?.selectedScheme || "").trim();

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "application_id is required",
      });
    }

    if (!ALLOWED_SCHEMES.has(selectedScheme)) {
      return res.status(400).json({
        success: false,
        message: "selectedScheme must be lifeTime or annualCare",
      });
    }

    const result = await db.query(
      `
      UPDATE public.kyc_applications
      SET
        selected_scheme = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, application_number, selected_scheme
      `,
      [applicationId, selectedScheme],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Scheme selection saved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Save scheme selection error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  saveSchemeSelection,
};
