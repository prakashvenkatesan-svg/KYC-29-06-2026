const { Pool } = require("pg");
const path = require("path");
const EventEmitter = require("events");
const { getDbSecret } = require("../utils/secrets");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

class PoolWrapper extends EventEmitter {
  constructor() {
    super();
    this.realPool = null;
    this.initPromise = null;
  }

  async initialize() {
    if (this.realPool) return this.realPool;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      let config = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      };

      const isLambda = !!process.env.AWS_EXECUTION_ENV;

      if (isLambda) {
        try {
          console.log("Fetching DB credentials from Secrets Manager...");
          const secret = await getDbSecret();
          config = {
            host: secret.host,
            port: secret.port,
            user: secret.username,
            password: secret.password,
            database: secret.capital_database,
          };
          console.log("DB credentials successfully fetched from Secrets Manager.");
        } catch (err) {
          console.error("Failed to fetch DB credentials from Secrets Manager, falling back to env vars:", err.message);
        }
      }

      const useSSL = config.host && config.host !== "localhost" && config.host !== "127.0.0.1";

      this.realPool = new Pool({
        ...config,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      });

      // Transfer existing event listeners to the real pool
      const events = this.eventNames();
      for (const event of events) {
        const listeners = this.listeners(event);
        for (const listener of listeners) {
          this.realPool.on(event, listener);
        }
      }

      // Proxy future event registrations to the real pool
      this.on = (event, listener) => {
        this.realPool.on(event, listener);
        return this;
      };
      this.removeListener = (event, listener) => {
        this.realPool.removeListener(event, listener);
        return this;
      };

      return this.realPool;
    })();

    return this.initPromise;
  }

  async query(...args) {
    const pool = await this.initialize();
    return pool.query(...args);
  }

  async connect(...args) {
    const pool = await this.initialize();
    return pool.connect(...args);
  }

  async end(...args) {
    const pool = await this.initialize();
    return pool.end(...args);
  }
}

const poolWrapper = new PoolWrapper();
module.exports = poolWrapper;
