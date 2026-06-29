"use strict";

const serverlessExpress = require("@vendia/serverless-express");
const app = require("./app");

exports.handler = serverlessExpress({
  app,
  binarySettings: {
    contentTypes: ["application/pdf", "application/octet-stream"]
  }
});
