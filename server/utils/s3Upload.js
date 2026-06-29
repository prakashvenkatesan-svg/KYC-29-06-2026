const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

const region = process.env.AWS_REGION || "ap-south-1";
const bucketName = process.env.S3_BUCKET || "aionion-kyc-staging-documents";

let s3Client = null;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({ region });
  }
  return s3Client;
};

/**
 * Uploads a buffer to S3.
 * @param {string} key - S3 object key (path inside bucket)
 * @param {Buffer} buffer - File content buffer
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
const uploadToS3 = async (key, buffer, contentType) => {
  if (!bucketName) {
    console.warn("[S3] S3_BUCKET environment variable is not defined. Skipping S3 upload.");
    return false;
  }

  const cleanKey = String(key || "").replace(/^\/+/, "");
  if (!cleanKey) {
    console.error("[S3] S3 key is empty");
    return false;
  }

  try {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);
    console.log(`[S3] Successfully uploaded file to s3://${bucketName}/${cleanKey}`);
    return true;
  } catch (error) {
    console.error(`[S3] Failed to upload file to s3://${bucketName}/${cleanKey}:`, error.message);
    return false;
  }
};

/**
 * Downloads a file from S3.
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer|null>} - File buffer if successful, null otherwise
 */
const downloadFromS3 = async (key) => {
  if (!bucketName) {
    console.warn("[S3] S3_BUCKET environment variable is not defined. Skipping S3 download.");
    return null;
  }

  const cleanKey = String(key || "").replace(/^\/+/, "");
  if (!cleanKey) {
    return null;
  }

  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
    });

    const response = await client.send(command);
    
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (error) {
    console.warn(`[S3] Could not fetch s3://${bucketName}/${cleanKey}:`, error.message);
    return null;
  }
};

module.exports = {
  uploadToS3,
  downloadFromS3,
};
