const getAdminMetricsQuery = `
  SELECT
    COUNT(*)::int AS total_applications,
    COUNT(*) FILTER (WHERE application_status = 'in_progress')::int AS in_progress_applications,
    COUNT(*) FILTER (WHERE application_status = 'submitted')::int AS submitted_applications,
    COUNT(*) FILTER (WHERE application_status = 'verified')::int AS verified_applications,
    COUNT(*) FILTER (WHERE application_status = 'completed')::int AS completed_applications,
    COUNT(*) FILTER (WHERE application_status = 'rejected')::int AS rejected_applications,
    COUNT(*) FILTER (WHERE application_status = 'hold')::int AS hold_applications,
    COUNT(*) FILTER (WHERE review_status = 'pending')::int AS pending_reviews,
    COUNT(*) FILTER (WHERE review_status = 'under_review')::int AS under_review_applications,
    COUNT(*) FILTER (WHERE review_status = 'approved')::int AS approved_reviews,
    COUNT(*) FILTER (WHERE review_status = 'rejected')::int AS rejected_reviews
  FROM public.kyc_applications;
`;

const getApplicationsListBaseQuery = `
  SELECT
    ka.id,
    ka.application_number,
    ka.current_step,
    ka.kyc_status,
    ka.is_completed,
    ka.application_status,
    ka.review_status,
    ka.assigned_rm_id,
    ka.assigned_admin_id,
    ka.client_code,
    ka.boid,
    ka.trading_enabled,
    ka.created_at,
    ka.updated_at,
    cd.mobile_number,
    cd.email,
    rm.name AS assigned_rm_name,
    rm.email AS assigned_rm_email
  FROM public.kyc_applications ka
  LEFT JOIN public.contact_details cd
    ON cd.application_id = ka.id
  LEFT JOIN public.admin_users rm
    ON rm.id = ka.assigned_rm_id
`;

const getAdminUsersListBaseQuery = `
  SELECT
    au.id,
    au.name,
    au.email,
    au.role,
    au.is_active,
    au.created_at,
    au.updated_at,
    COUNT(*) FILTER (WHERE ka.assigned_rm_id = au.id)::int AS assigned_application_count
  FROM public.admin_users au
  LEFT JOIN public.kyc_applications ka
    ON ka.assigned_rm_id = au.id
`;

const getRmDashboardMetricsQuery = `
  SELECT
    au.id,
    au.name,
    au.email,
    au.role,
    COUNT(ka.*)::int AS total_assigned_applications,
    COUNT(*) FILTER (WHERE ka.application_status = 'in_progress')::int AS in_progress_applications,
    COUNT(*) FILTER (WHERE ka.review_status = 'pending')::int AS pending_reviews,
    COUNT(*) FILTER (WHERE ka.review_status = 'under_review')::int AS under_review_applications,
    COUNT(*) FILTER (WHERE ka.review_status = 'approved')::int AS approved_reviews,
    COUNT(*) FILTER (WHERE ka.application_status = 'completed')::int AS completed_applications,
    COUNT(*) FILTER (WHERE ka.application_status = 'rejected')::int AS rejected_applications
  FROM public.admin_users au
  LEFT JOIN public.kyc_applications ka
    ON ka.assigned_rm_id = au.id
  WHERE au.id = $1
  GROUP BY au.id, au.name, au.email, au.role;
`;

const getApplicationDetailQuery = `
  SELECT row_to_json(application_payload) AS application
  FROM (
    SELECT
      ka.*,
      (
        SELECT row_to_json(contact_row)
        FROM (
          SELECT *
          FROM public.contact_details
          WHERE application_id = ka.id
          LIMIT 1
        ) AS contact_row
      ) AS contact_details,
      (
        SELECT row_to_json(personal_row)
        FROM (
          SELECT *
          FROM public.personal_details
          WHERE application_id = ka.id
          LIMIT 1
        ) AS personal_row
      ) AS personal_details,
      (
        SELECT row_to_json(bank_row)
        FROM (
          SELECT *
          FROM public.bank_details
          WHERE application_id = ka.id
          LIMIT 1
        ) AS bank_row
      ) AS bank_details,
      (
        SELECT row_to_json(identity_row)
        FROM (
          SELECT *
          FROM public.identity_verifications
          WHERE application_id = ka.id
          LIMIT 1
        ) AS identity_row
      ) AS identity_verifications,
      (
        SELECT row_to_json(digilocker_row)
        FROM (
          SELECT *
          FROM public.digilocker_details
          WHERE application_id = ka.id::text
          ORDER BY created_at DESC NULLS LAST
          LIMIT 1
        ) AS digilocker_row
      ) AS digilocker_details,
      (
        SELECT row_to_json(kra_row)
        FROM (
          SELECT *
          FROM public.cvlkra_data
          WHERE application_id = ka.id
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 1
        ) AS kra_row
      ) AS kra_details,
      (
        SELECT row_to_json(applicant_photo_row)
        FROM (
          SELECT *
          FROM public.applicant_photo_uploads
          WHERE application_id = ka.id
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
          LIMIT 1
        ) AS applicant_photo_row
      ) AS applicant_photo_details,
      (
        SELECT row_to_json(pan_card_row)
        FROM (
          SELECT *
          FROM public.pan_card_upload
          WHERE application_id = ka.id
          ORDER BY id DESC
          LIMIT 1
        ) AS pan_card_row
      ) AS pan_card_upload_details,
      (
        SELECT row_to_json(signature_row)
        FROM (
          SELECT *
          FROM public.signature_uploads
          WHERE application_id = ka.id
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
          LIMIT 1
        ) AS signature_row
      ) AS signature_upload_details,
      (
        SELECT COALESCE(json_agg(nominee_row ORDER BY nominee_row.id), '[]'::json)
        FROM (
          SELECT *
          FROM public.nominee_details
          WHERE application_id = ka.id
        ) AS nominee_row
      ) AS nominee_details,
      (
        SELECT COALESCE(json_agg(process_row ORDER BY process_row.id), '[]'::json)
        FROM (
          SELECT *
          FROM public.kyc_process
          WHERE application_id = ka.id
        ) AS process_row
      ) AS kyc_process,
      '[]'::json AS review_notes,
      '[]'::json AS status_history,
      NULL::json AS assignment
    FROM public.kyc_applications ka
    WHERE ka.id = $1
  ) AS application_payload;
`;

const getApplicationStatusQuery = `
  SELECT
    id,
    application_status,
    review_status
  FROM public.kyc_applications
  WHERE id = $1
  LIMIT 1;
`;

const updateApplicationStatusQuery = `
  UPDATE public.kyc_applications
  SET
    application_status = $1,
    review_status = COALESCE($2, review_status),
    rejection_reason = $3,
    last_reviewed_at = NOW(),
    last_reviewed_by = $4,
    updated_at = NOW()
  WHERE id = $5
  RETURNING *;
`;

const createApplicationStatusHistoryQuery = `
  INSERT INTO public.application_status_history (
    application_id,
    old_status,
    new_status,
    changed_by,
    reason,
    created_at
  )
  VALUES ($1, $2, $3, $4, $5, NOW())
  RETURNING *;
`;

const createApplicationReviewNoteQuery = `
  INSERT INTO public.application_review_notes (
    application_id,
    admin_user_id,
    note_type,
    note,
    created_at
  )
  VALUES ($1, $2, $3, $4, NOW())
  RETURNING *;
`;

const getApplicationLogsQuery = `
  SELECT
    ash.id,
    'status_change' AS log_type,
    ash.old_status,
    ash.new_status,
    ash.reason,
    ash.created_at,
    au.name AS actor_name,
    au.email AS actor_email
  FROM public.application_status_history ash
  LEFT JOIN public.admin_users au
    ON au.id = ash.changed_by
  WHERE ash.application_id = $1

  UNION ALL

  SELECT
    arn.id,
    'review_note' AS log_type,
    NULL AS old_status,
    NULL AS new_status,
    CONCAT('[', COALESCE(arn.note_type, 'general'), '] ', arn.note) AS reason,
    arn.created_at,
    au.name AS actor_name,
    au.email AS actor_email
  FROM public.application_review_notes arn
  LEFT JOIN public.admin_users au
    ON au.id = arn.admin_user_id
  WHERE arn.application_id = $1

  ORDER BY created_at DESC;
`;

const getAdminUserByEmailQuery = `
  SELECT
    id,
    name,
    email,
    password_hash,
    role,
    is_active
  FROM public.admin_users
  WHERE LOWER(email) = LOWER($1)
  LIMIT 1;
`;

module.exports = {
  getAdminMetricsQuery,
  getApplicationsListBaseQuery,
  getAdminUsersListBaseQuery,
  getRmDashboardMetricsQuery,
  getApplicationDetailQuery,
  getApplicationStatusQuery,
  updateApplicationStatusQuery,
  createApplicationStatusHistoryQuery,
  createApplicationReviewNoteQuery,
  getApplicationLogsQuery,
  getAdminUserByEmailQuery,
};
