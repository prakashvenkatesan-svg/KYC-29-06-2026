const createKycApplicationQuery = `
  INSERT INTO kyc_applications (
    application_number,
    current_step,
    kyc_status,
    is_completed,
    created_at,
    updated_at
  )
  VALUES ($1, 'contact_details', 'in_progress', false, NOW(), NOW())
  RETURNING *;
`;

const createContactDetailsQuery = `
  INSERT INTO contact_details (
    application_id,
    mobile_number,
    dependency_type,
    terms_accepted,
    mobile_verified,
    email_verified,
    created_at,
    updated_at
  )
  VALUES ($1, $2, $3, $4, false, false, NOW(), NOW())
  RETURNING *;
`;

const getContactByMobileQuery = `
  SELECT * FROM contact_details
  WHERE mobile_number = $1
  LIMIT 1;
`;

const getContactByApplicationIdQuery = `
  SELECT * FROM contact_details
  WHERE application_id = $1
  LIMIT 1;
`;

const updateContactMobileQuery = `
  UPDATE contact_details
  SET mobile_number = $1,
      dependency_type = $2,
      terms_accepted = $3,
      mobile_verified = false,
      updated_at = NOW()
  WHERE application_id = $4
  RETURNING *;
`;

const updateContactEmailQuery = `
  UPDATE contact_details
  SET email = $1,
      terms_accepted = $2,
      email_verified = false,
      updated_at = NOW()
  WHERE application_id = $3
  RETURNING *;
`;

const markMobileVerifiedQuery = `
  UPDATE contact_details
  SET mobile_verified = true,
      updated_at = NOW()
  WHERE application_id = $1
  RETURNING *;
`;

const markEmailVerifiedQuery = `
  UPDATE contact_details
  SET email_verified = true,
      updated_at = NOW()
  WHERE application_id = $1
  RETURNING *;
`;

const createMobileOtpSessionQuery = `
  INSERT INTO otp_sessions (
    application_id,
    mobile_number,
    otp_hash,
    expires_at,
    attempts,
    is_used,
    created_at
  )
  VALUES ($1, $2, $3, $4, 0, false, NOW())
  RETURNING *;
`;

const getLatestActiveMobileOtpQuery = `
  SELECT * FROM otp_sessions
  WHERE application_id = $1
    AND mobile_number = $2
    AND is_used = false
  ORDER BY created_at DESC
  LIMIT 1;
`;

const expireOldMobileOtpsQuery = `
  UPDATE otp_sessions
  SET is_used = true
  WHERE application_id = $1
    AND is_used = false;
`;

const incrementMobileOtpAttemptsQuery = `
  UPDATE otp_sessions
  SET attempts = attempts + 1
  WHERE id = $1;
`;

const markMobileOtpUsedQuery = `
  UPDATE otp_sessions
  SET is_used = true
  WHERE id = $1;
`;

const createEmailOtpSessionQuery = `
  INSERT INTO email_otp_sessions (
    application_id,
    email,
    otp_hash,
    expires_at,
    attempts,
    is_used,
    created_at
  )
  VALUES ($1, $2, $3, $4, 0, false, NOW())
  RETURNING *;
`;

const getLatestActiveEmailOtpQuery = `
  SELECT * FROM email_otp_sessions
  WHERE application_id = $1
    AND email = $2
    AND is_used = false
  ORDER BY created_at DESC
  LIMIT 1;
`;

const expireOldEmailOtpsQuery = `
  UPDATE email_otp_sessions
  SET is_used = true
  WHERE application_id = $1
    AND is_used = false;
`;

const incrementEmailOtpAttemptsQuery = `
  UPDATE email_otp_sessions
  SET attempts = attempts + 1
  WHERE id = $1;
`;

const markEmailOtpUsedQuery = `
  UPDATE email_otp_sessions
  SET is_used = true
  WHERE id = $1;
`;

const createKycProcessQuery = `
  INSERT INTO kyc_process (
    application_id,
    step_name,
    step_status,
    remarks,
    created_at,
    updated_at
  )
  VALUES ($1, 'contact_details', 'in_progress', $2, NOW(), NOW())
  RETURNING *;
`;

const markContactStepCompletedQuery = `
  UPDATE kyc_process
  SET step_status = 'completed',
      remarks = 'Mobile and email verified',
      updated_at = NOW()
  WHERE application_id = $1
    AND step_name = 'contact_details'
  RETURNING *;
`;

const moveApplicationToPanStepQuery = `
  UPDATE kyc_applications
  SET current_step = 'pan_details',
      updated_at = NOW()
  WHERE id = $1
  RETURNING *;
`;

module.exports = {
  createKycApplicationQuery,
  createContactDetailsQuery,
  getContactByMobileQuery,
  getContactByApplicationIdQuery,
  updateContactMobileQuery,
  updateContactEmailQuery,
  markMobileVerifiedQuery,
  markEmailVerifiedQuery,
  createMobileOtpSessionQuery,
  getLatestActiveMobileOtpQuery,
  expireOldMobileOtpsQuery,
  incrementMobileOtpAttemptsQuery,
  markMobileOtpUsedQuery,
  createEmailOtpSessionQuery,
  getLatestActiveEmailOtpQuery,
  expireOldEmailOtpsQuery,
  incrementEmailOtpAttemptsQuery,
  markEmailOtpUsedQuery,
  createKycProcessQuery,
  markContactStepCompletedQuery,
  moveApplicationToPanStepQuery,
};
