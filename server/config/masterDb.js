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
        user: process.env.MASTER_DB_USER,
        host: process.env.MASTER_DB_HOST,
        database: process.env.MASTER_DB_NAME,
        password: process.env.MASTER_DB_PASSWORD,
        port: process.env.MASTER_DB_PORT,
      };

      const isLambda = !!process.env.AWS_EXECUTION_ENV;

      if (isLambda) {
        try {
          console.log("Fetching Master DB credentials from Secrets Manager...");
          const secret = await getDbSecret();
          config = {
            host: secret.host,
            port: secret.port,
            user: secret.username,
            password: secret.password,
            database: secret.master_database,
          };
          console.log("Master DB credentials successfully fetched from Secrets Manager.");
        } catch (err) {
          console.error("Failed to fetch Master DB credentials from Secrets Manager, falling back to env vars:", err.message);
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

const masterPoolWrapper = new PoolWrapper();
module.exports = masterPoolWrapper;
