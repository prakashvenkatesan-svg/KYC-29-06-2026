const pool = require("../config/db");
const {
  fetchApplicationDdpiDetails,
  releaseReservedStamp,
  selectDdpi,
} = require("../services/ddpiService");

const selectDdpiForApplication = async (req, res) => {
  let client;

  try {
    const { application_id, ddpi_selected } = req.body;

    if (!application_id || typeof ddpi_selected !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "application_id and ddpi_selected are required",
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const data = await selectDdpi({
      applicationId: Number(application_id),
      ddpiSelected: ddpi_selected,
      client,
    });

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: ddpi_selected
        ? "DDPI selected and stamp paper assigned successfully"
        : "DDPI removed successfully",
      data,
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to update DDPI selection right now.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const getDdpiDetails = async (req, res) => {
  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    const data = await fetchApplicationDdpiDetails(applicationId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "DDPI details fetched successfully",
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch DDPI details right now.",
    });
  }
};

const cancelDdpi = async (req, res) => {
  let client;

  try {
    const applicationId = Number(req.params.application_id);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Valid application ID is required",
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const data = await releaseReservedStamp(applicationId, client);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "DDPI reservation cancelled successfully",
      data,
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to cancel DDPI right now.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  selectDdpiForApplication,
  getDdpiDetails,
  cancelDdpi,
};
