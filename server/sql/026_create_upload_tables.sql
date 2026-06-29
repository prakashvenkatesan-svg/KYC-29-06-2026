CREATE TABLE IF NOT EXISTS public.pan_card_upload (
    id SERIAL PRIMARY KEY,
    application_id INT,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.signature_uploads (
    id SERIAL PRIMARY KEY,
    application_id INT UNIQUE,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_path TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
