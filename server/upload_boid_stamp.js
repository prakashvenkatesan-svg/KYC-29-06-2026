require('dotenv').config();
const fs = require('fs');
const path = require('path');
const masterPool = require('./config/masterDb');
const { uploadToS3 } = require('./utils/s3Upload');

const BOID_FILE_PATH = path.join(__dirname, '../BOID and Stamp paper/BOID/08DPT1U.100800.930448');
const STAMP_PAPER_DIR = path.join(__dirname, '../BOID and Stamp paper/Stamp paper');
const S3_STAMP_FOLDER = 'stamp_papers';

const processBoids = async () => {
  console.log('--- Processing BOIDs ---');
  if (!fs.existsSync(BOID_FILE_PATH)) {
    console.error(`BOID file not found at ${BOID_FILE_PATH}`);
    return;
  }

  const content = fs.readFileSync(BOID_FILE_PATH, 'utf-8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);

  // Skip header and footer, only take lines that start with a 16-digit number
  const boidLines = lines.filter(line => /^\d{16}~/.test(line));

  if (boidLines.length === 0) {
    console.log('No valid BOIDs found in the file.');
    return;
  }

  const client = await masterPool.connect();
  try {
    await client.query('BEGIN');
    let insertedCount = 0;

    for (const line of boidLines) {
      const parts = line.split('~');
      const boidNumber = parts[0];

      // Check if BOID already exists
      const checkRes = await client.query('SELECT 1 FROM boid_master WHERE boid_number = $1', [boidNumber]);
      if (checkRes.rows.length === 0) {
        await client.query(
          `INSERT INTO boid_master (boid_number, status, application_id, assigned_at) 
           VALUES ($1, 'AVAILABLE', NULL, NULL)`,
          [boidNumber]
        );
        insertedCount++;
      } else {
        console.log(`BOID ${boidNumber} already exists in database, skipping.`);
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully inserted ${insertedCount} new BOIDs.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing BOIDs:', error);
  } finally {
    client.release();
  }
};

const processStampPapers = async () => {
  console.log('\n--- Processing Stamp Papers ---');
  if (!fs.existsSync(STAMP_PAPER_DIR)) {
    console.error(`Stamp paper directory not found at ${STAMP_PAPER_DIR}`);
    return;
  }

  const files = fs.readdirSync(STAMP_PAPER_DIR).filter(file => file.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.log('No PDF files found in Stamp paper directory.');
    return;
  }

  const client = await masterPool.connect();
  try {
    await client.query('BEGIN');
    let processedCount = 0;

    for (const filename of files) {
      const filePath = path.join(STAMP_PAPER_DIR, filename);
      const stampNumber = filename.replace(/\.pdf$/i, ''); // e.g., DF145607

      // Check if stamp paper already exists
      const checkRes = await client.query('SELECT 1 FROM stamp_paper_master WHERE stamp_number = $1', [stampNumber]);
      if (checkRes.rows.length > 0) {
        console.log(`Stamp paper ${stampNumber} already exists in database, skipping.`);
        continue;
      }

      // Assume file is uploaded to S3 manually by the user
      const s3Key = `${S3_STAMP_FOLDER}/${filename}`;

      // Insert into database
      await client.query(
        `INSERT INTO stamp_paper_master (stamp_number, image_name, image_path, status, assigned_application_id, assigned_at, used_at) 
         VALUES ($1, $2, $3, 'AVAILABLE', NULL, NULL, NULL)`,
        [stampNumber, filename, s3Key]
      );
      processedCount++;
    }

    await client.query('COMMIT');
    console.log(`Successfully uploaded and inserted ${processedCount} stamp papers.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing Stamp Papers:', error);
  } finally {
    client.release();
  }
};

const main = async () => {
  await processBoids();
  await processStampPapers();
  console.log('\nMigration complete.');
  process.exit(0);
};

main();
