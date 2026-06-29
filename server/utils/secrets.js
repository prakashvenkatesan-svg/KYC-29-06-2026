const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

let cachedDbSecret = null;

const getDbSecret = async () => {
  if (cachedDbSecret) {
    return cachedDbSecret;
  }

  const secretName = process.env.DB_SECRET_NAME || "aionion/kyc/staging/db";
  const region = process.env.AWS_REGION || "ap-south-1";

  const client = new SecretsManagerClient({ region });

  try {
    console.log(`Fetching secret "${secretName}" from region "${region}"...`);
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );

    if (response.SecretString) {
      cachedDbSecret = JSON.parse(response.SecretString);
      return cachedDbSecret;
    }
    throw new Error("SecretString is empty");
  } catch (error) {
    console.error("Error fetching secret from Secrets Manager:", error.message);
    throw error;
  }
};

module.exports = {
  getDbSecret,
};
