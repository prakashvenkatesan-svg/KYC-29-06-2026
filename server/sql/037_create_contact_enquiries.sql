CREATE SEQUENCE IF NOT EXISTS public.contact_enquiries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.contact_enquiries (
    id BIGINT NOT NULL DEFAULT nextval('public.contact_enquiries_id_seq'),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT contact_enquiries_pkey PRIMARY KEY (id)
);

ALTER SEQUENCE public.contact_enquiries_id_seq
    OWNED BY public.contact_enquiries.id;
