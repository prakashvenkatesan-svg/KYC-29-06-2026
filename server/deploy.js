/**
 * deploy.js — uploads lambda-deploy.zip to S3 then updates Lambda function code.
 * Run: node deploy.js
 * Reads AWS credentials from environment variables:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN (if SSO)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { LambdaClient, UpdateFunctionCodeCommand, UpdateFunctionConfigurationCommand } = require("@aws-sdk/client-lambda");

const REGION = "ap-south-1";
const LAMBDA_FUNCTION_NAME = "aionion-kyc-staging-api";
const S3_BUCKET = "aionion-kyc-staging-documents";
const S3_KEY = "system/lambda-deploy.zip";
const ZIP_PATH = path.join(__dirname, "..", "lambda-deploy.zip");
const HANDLER = "lambda.handler";

async function deploy() {
  console.log("=== KYC Lambda Deployment ===\n");

  if (!fs.existsSync(ZIP_PATH)) {
    console.error("ERROR: lambda-deploy.zip not found at", ZIP_PATH);
    process.exit(1);
  }

  const zipBuffer = fs.readFileSync(ZIP_PATH);
  const zipSizeMB = (zipBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`ZIP: ${ZIP_PATH} (${zipSizeMB} MB)`);

  const s3 = new S3Client({ region: REGION });
  const lambda = new LambdaClient({ region: REGION });

  // 1. Upload to S3
  console.log(`\n[1/3] Uploading to S3: s3://${S3_BUCKET}/${S3_KEY} ...`);
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: S3_KEY,
    Body: zipBuffer,
    ContentType: "application/zip",
  }));
  console.log("      S3 upload complete.");

  // 2. Update Lambda function code from S3
  console.log(`\n[2/3] Updating Lambda function code: ${LAMBDA_FUNCTION_NAME} ...`);
  const codeResult = await lambda.send(new UpdateFunctionCodeCommand({
    FunctionName: LAMBDA_FUNCTION_NAME,
    S3Bucket: S3_BUCKET,
    S3Key: S3_KEY,
  }));
  console.log("      Code update initiated. State:", codeResult.State);

  // Wait for update to complete
  console.log("      Waiting for update to complete...");
  await new Promise(r => setTimeout(r, 8000));

  // 3. Update handler
  console.log(`\n[3/3] Setting handler to: ${HANDLER} ...`);
  await lambda.send(new UpdateFunctionConfigurationCommand({
    FunctionName: LAMBDA_FUNCTION_NAME,
    Handler: HANDLER,
    Runtime: "nodejs18.x",
  }));
  console.log("      Handler updated.");

  console.log("\n=== Deployment Complete! ===");
  console.log(`Lambda function '${LAMBDA_FUNCTION_NAME}' is now updated.`);
  console.log("Next: Check CloudWatch logs and test the API Gateway URL.");
  console.log(`API Gateway: https://57yp657i65.execute-api.ap-south-1.amazonaws.com/staging`);
}

deploy().catch((err) => {
  console.error("\n=== Deployment FAILED ===");
  console.error(err.message || err);
  if (err.message && err.message.includes("credential")) {
    console.error("\nPlease set AWS credentials:");
    console.error("  $env:AWS_ACCESS_KEY_ID='...'");
    console.error("  $env:AWS_SECRET_ACCESS_KEY='...'");
    console.error("  $env:AWS_SESSION_TOKEN='...'  # if using SSO/temp creds");
  }
  process.exit(1);
});
