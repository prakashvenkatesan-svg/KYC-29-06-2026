const pool = require("../config/db");

const DATESTYLE_QUERY = "SET datestyle TO ISO, DMY";

if (!pool.__aionionDateStyleConfigured) {
  pool.__aionionDateStyleConfigured = true;

  pool.on("connect", (client) => {
    client.query(DATESTYLE_QUERY).catch((error) => {
      console.error("Failed to apply Postgres datestyle:", error.message);
    });
  });
}

const warmUpDateStyle = async () => {
  const client = await pool.connect();

  try {
    await client.query(DATESTYLE_QUERY);
  } finally {
    client.release();
  }
};

module.exports = {
  warmUpDateStyle,
};
