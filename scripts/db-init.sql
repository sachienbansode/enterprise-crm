-- Step 2: Create all tables + load seed data (21 tables, 639 rows)
-- pgAdmin: Query Tool on the "niytri_crm" database, connected as root_admin -> run (F5)
-- Source: scripts/db-init.sql minus psql-only restrict lines, 28 truncated ai_chat_logs rows, and the broken ai_config row (API key removed; set it in Admin -> AI Settings)

-- ==================================================================
-- NIYTRI CRM — Full Database Initialisation
-- Generated: 2026-03-22T09:50:10Z
-- Source: UAT / Development  |  Tables: 21  |  Rows: 639
-- ==================================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_chat_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    user_name character varying(255),
    user_role character varying(100),
    user_verticals text[],
    query text NOT NULL,
    response text,
    sql_query text,
    provider character varying(50),
    model character varying(100),
    latency_ms integer,
    raw_request jsonb,
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(50) DEFAULT 'openai'::character varying,
    model character varying(100) DEFAULT 'gpt-4o'::character varying,
    api_key text,
    endpoint_url text,
    temperature numeric(3,2) DEFAULT 0.7,
    max_tokens integer DEFAULT 1024,
    system_prompt text,
    enabled boolean DEFAULT false,
    updated_by character varying(255),
    updated_at timestamp with time zone DEFAULT now(),
    table_access jsonb DEFAULT '["clients", "service_requests", "users", "leads", "deals"]'::jsonb,
    bot_prompts jsonb DEFAULT '{}'::jsonb,
    vertical_access_strict boolean DEFAULT true
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    user_id uuid,
    user_name character varying(255),
    action character varying(200) NOT NULL,
    details text,
    old_value jsonb,
    new_value jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_access_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    requester_id uuid,
    requester_name character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    request_type character varying(50) DEFAULT 'pii'::character varying,
    reason text,
    review_comment text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_verticals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_verticals (
    client_id uuid NOT NULL,
    vertical character varying(50) NOT NULL,
    activated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT client_verticals_vertical_check CHECK (((vertical)::text = ANY ((ARRAY['retail'::character varying, 'corporate'::character varying, 'ib'::character varying, 'aif'::character varying, 'ie'::character varying])::text[])))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_code character varying(20) NOT NULL,
    name character varying(500) NOT NULL,
    type character varying(20) NOT NULL,
    category character varying(100) NOT NULL,
    pan character varying(20),
    mobile character varying(20),
    email character varying(255),
    address text,
    date_of_birth date,
    date_of_incorporation date,
    rm_id uuid,
    status character varying(20) DEFAULT 'Active'::character varying,
    kyc_status character varying(20) DEFAULT 'Pending'::character varying,
    risk_profile character varying(20),
    fatca_status character varying(20) DEFAULT 'Pending'::character varying,
    demat_account character varying(50),
    dp_id character varying(20),
    ckyc_id character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_id uuid,
    CONSTRAINT clients_fatca_status_check CHECK (((fatca_status)::text = ANY ((ARRAY['Compliant'::character varying, 'Non-Compliant'::character varying, 'Pending'::character varying, 'N/A'::character varying])::text[]))),
    CONSTRAINT clients_kyc_status_check CHECK (((kyc_status)::text = ANY ((ARRAY['Verified'::character varying, 'Pending'::character varying, 'Expired'::character varying])::text[]))),
    CONSTRAINT clients_risk_profile_check CHECK (((risk_profile)::text = ANY ((ARRAY['Low'::character varying, 'Moderate'::character varying, 'High'::character varying, 'Ultra-High'::character varying])::text[]))),
    CONSTRAINT clients_status_check CHECK (((status)::text = ANY ((ARRAY['Active'::character varying, 'Dormant'::character varying, 'Suspended'::character varying, 'Closed'::character varying])::text[]))),
    CONSTRAINT clients_type_check CHECK (((type)::text = ANY ((ARRAY['Individual'::character varying, 'Non-Individual'::character varying])::text[])))
);


--
-- Name: deals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_code character varying(20) NOT NULL,
    name character varying(500) NOT NULL,
    vertical character varying(50) NOT NULL,
    type character varying(100),
    value character varying(100),
    stage character varying(100),
    client_id uuid,
    rm_id uuid,
    deal_date date,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: document_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version character varying(20) NOT NULL,
    s3_key character varying(500) NOT NULL,
    size_bytes integer,
    uploaded_by uuid,
    uploader_name character varying(255),
    note text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doc_code character varying(30) NOT NULL,
    name character varying(500) NOT NULL,
    type character varying(100),
    client_id uuid,
    sr_id uuid,
    vertical character varying(50),
    status character varying(50) DEFAULT 'Pending'::character varying,
    current_version character varying(20) DEFAULT 'v1.0'::character varying,
    s3_bucket character varying(200),
    s3_key character varying(500),
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lead_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vertical character varying(100) NOT NULL,
    entity_type character varying(20) DEFAULT 'lead'::character varying NOT NULL,
    stage_order integer DEFAULT 0 NOT NULL,
    stage_id character varying(100) NOT NULL,
    stage_label character varying(200) NOT NULL,
    stage_color character varying(50) DEFAULT 'bg-blue-500'::character varying,
    is_won boolean DEFAULT false,
    is_lost boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_code character varying(20) NOT NULL,
    name character varying(500) NOT NULL,
    vertical character varying(50) NOT NULL,
    stage character varying(100) NOT NULL,
    priority character varying(20) DEFAULT 'Medium'::character varying,
    value_estimate character varying(100),
    source character varying(100),
    assigned_rm_id uuid,
    client_id uuid,
    status character varying(20) DEFAULT 'Active'::character varying,
    opened_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT leads_priority_check CHECK (((priority)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying, 'Critical'::character varying])::text[])))
);


--
-- Name: m365_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.m365_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id character varying(255),
    client_id character varying(255),
    client_secret text,
    redirect_uri text,
    allowed_domain character varying(255) DEFAULT 'niytri.com'::character varying,
    sso_enabled boolean DEFAULT false,
    require_mfa boolean DEFAULT true,
    session_hours integer DEFAULT 8,
    updated_by character varying(255),
    updated_at timestamp with time zone DEFAULT now(),
    sender_email character varying(255) DEFAULT 'admin@niytri.com'::character varying,
    smtp_enabled boolean DEFAULT false,
    smtp_host character varying(255) DEFAULT 'smtp.office365.com'::character varying,
    smtp_port integer DEFAULT 587,
    smtp_user character varying(255) DEFAULT 'admin@niytri.com'::character varying,
    smtp_password text,
    smtp_from_name character varying(255) DEFAULT 'NIYTRI CRM'::character varying,
    smtp_tls boolean DEFAULT true,
    max_meeting_attachment_mb integer DEFAULT 5,
    prefer_smtp boolean DEFAULT false NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    body text,
    entity_type character varying(50),
    entity_id uuid,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: service_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sr_code character varying(20) NOT NULL,
    subject character varying(500) NOT NULL,
    description text,
    category character varying(200) NOT NULL,
    subcategory character varying(200),
    channel character varying(50) DEFAULT 'Portal'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'Medium'::character varying,
    status character varying(50) DEFAULT 'Open'::character varying,
    sla_deadline timestamp with time zone,
    sla_status character varying(20) DEFAULT 'ok'::character varying,
    client_id uuid,
    vertical character varying(50),
    created_by uuid,
    assigned_to uuid,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolution_notes text,
    CONSTRAINT service_requests_priority_check CHECK (((priority)::text = ANY ((ARRAY['Low'::character varying, 'Medium'::character varying, 'High'::character varying, 'Critical'::character varying])::text[]))),
    CONSTRAINT service_requests_sla_status_check CHECK (((sla_status)::text = ANY ((ARRAY['ok'::character varying, 'warning'::character varying, 'breached'::character varying])::text[])))
);


--
-- Name: sla_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sla_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category character varying(200) NOT NULL,
    tat_hours integer DEFAULT 24 NOT NULL,
    warning_percent integer DEFAULT 80 NOT NULL,
    l1_owner character varying(200),
    l2_after_hours numeric(5,1),
    l2_owner character varying(200),
    l3_after_hours numeric(5,1),
    l3_owner character varying(200),
    auto_close_hours integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sr_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sr_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sr_id uuid NOT NULL,
    sender_id uuid,
    sender_name character varying(255),
    from_type character varying(10),
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sr_messages_from_type_check CHECK (((from_type)::text = ANY ((ARRAY['agent'::character varying, 'client'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: user_role_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_role_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_by character varying(255),
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_name character varying(100) NOT NULL,
    vertical character varying(100),
    description text,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    auth_required character varying(10) DEFAULT 'any'::character varying,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    ip_address character varying(64),
    user_agent text,
    auth_method character varying(10) DEFAULT 'app'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '08:00:00'::interval) NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    auth_type character varying(10) DEFAULT 'app'::character varying NOT NULL,
    role character varying(100) NOT NULL,
    vertical character varying(100),
    status character varying(20) DEFAULT 'Active'::character varying,
    mfa_enabled boolean DEFAULT false,
    otp_secret character varying(100),
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    mobile character varying(20),
    location character varying(100),
    CONSTRAINT users_auth_type_check CHECK (((auth_type)::text = ANY ((ARRAY['app'::character varying, 'm365'::character varying])::text[]))),
    CONSTRAINT users_status_check CHECK (((status)::text = ANY ((ARRAY['Active'::character varying, 'Inactive'::character varying])::text[])))
);


--
-- Name: verticals_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verticals_config (
    id integer NOT NULL,
    vertical_id character varying(50) NOT NULL,
    label character varying(200) NOT NULL,
    short_name character varying(20) NOT NULL,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: verticals_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.verticals_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: verticals_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.verticals_config_id_seq OWNED BY public.verticals_config.id;


--
-- Name: verticals_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verticals_config ALTER COLUMN id SET DEFAULT nextval('public.verticals_config_id_seq'::regclass);


--
-- Name: ai_chat_logs ai_chat_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_logs
    ADD CONSTRAINT ai_chat_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_config ai_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_config
    ADD CONSTRAINT ai_config_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: client_access_requests client_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_access_requests
    ADD CONSTRAINT client_access_requests_pkey PRIMARY KEY (id);


--
-- Name: client_verticals client_verticals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_verticals
    ADD CONSTRAINT client_verticals_pkey PRIMARY KEY (client_id, vertical);


--
-- Name: clients clients_client_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_client_code_key UNIQUE (client_code);


--
-- Name: clients clients_pan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pan_key UNIQUE (pan);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: deals deals_deal_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_deal_code_key UNIQUE (deal_code);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: document_versions document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_pkey PRIMARY KEY (id);


--
-- Name: documents documents_doc_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_doc_code_key UNIQUE (doc_code);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: lead_workflows lead_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_workflows
    ADD CONSTRAINT lead_workflows_pkey PRIMARY KEY (id);


--
-- Name: lead_workflows lead_workflows_vertical_entity_type_stage_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_workflows
    ADD CONSTRAINT lead_workflows_vertical_entity_type_stage_id_key UNIQUE (vertical, entity_type, stage_id);


--
-- Name: leads leads_lead_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_lead_code_key UNIQUE (lead_code);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: m365_config m365_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.m365_config
    ADD CONSTRAINT m365_config_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: service_requests service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);


--
-- Name: service_requests service_requests_sr_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_sr_code_key UNIQUE (sr_code);


--
-- Name: sla_config sla_config_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_config
    ADD CONSTRAINT sla_config_category_key UNIQUE (category);


--
-- Name: sla_config sla_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sla_config
    ADD CONSTRAINT sla_config_pkey PRIMARY KEY (id);


--
-- Name: sr_messages sr_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sr_messages
    ADD CONSTRAINT sr_messages_pkey PRIMARY KEY (id);


--
-- Name: user_role_mapping user_role_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_mapping
    ADD CONSTRAINT user_role_mapping_pkey PRIMARY KEY (id);


--
-- Name: user_role_mapping user_role_mapping_user_id_role_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_mapping
    ADD CONSTRAINT user_role_mapping_user_id_role_id_key UNIQUE (user_id, role_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_name_key UNIQUE (role_name);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_token_key UNIQUE (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verticals_config verticals_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verticals_config
    ADD CONSTRAINT verticals_config_pkey PRIMARY KEY (id);


--
-- Name: verticals_config verticals_config_vertical_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verticals_config
    ADD CONSTRAINT verticals_config_vertical_id_key UNIQUE (vertical_id);


--
-- Name: idx_ai_chat_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_logs_created ON public.ai_chat_logs USING btree (created_at DESC);


--
-- Name: idx_ai_chat_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_chat_logs_user ON public.ai_chat_logs USING btree (user_name);


--
-- Name: idx_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_car_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_client ON public.client_access_requests USING btree (client_id);


--
-- Name: idx_car_requester; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_car_requester ON public.client_access_requests USING btree (requester_id);


--
-- Name: idx_clients_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_code ON public.clients USING btree (client_code);


--
-- Name: idx_clients_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_email ON public.clients USING btree (email);


--
-- Name: idx_clients_mobile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_mobile ON public.clients USING btree (mobile);


--
-- Name: idx_clients_pan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_pan ON public.clients USING btree (pan);


--
-- Name: idx_clients_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_search ON public.clients USING gin (to_tsvector('english'::regconfig, (((((((name)::text || ' '::text) || (COALESCE(pan, ''::character varying))::text) || ' '::text) || (COALESCE(email, ''::character varying))::text) || ' '::text) || (COALESCE(mobile, ''::character varying))::text)));


--
-- Name: idx_clients_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_status ON public.clients USING btree (status);


--
-- Name: idx_docver_doc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_docver_doc ON public.document_versions USING btree (document_id);


--
-- Name: idx_leads_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_stage ON public.leads USING btree (stage);


--
-- Name: idx_leads_vertical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_vertical ON public.leads USING btree (vertical);


--
-- Name: idx_notif_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_user ON public.notifications USING btree (user_id, read, created_at DESC);


--
-- Name: idx_role_mapping_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_mapping_user ON public.user_role_mapping USING btree (user_id);


--
-- Name: idx_sr_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sr_category ON public.service_requests USING btree (category);


--
-- Name: idx_sr_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sr_client ON public.service_requests USING btree (client_id);


--
-- Name: idx_sr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sr_status ON public.service_requests USING btree (status);


--
-- Name: idx_user_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_token ON public.user_sessions USING btree (token);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: client_access_requests client_access_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_access_requests
    ADD CONSTRAINT client_access_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: client_access_requests client_access_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_access_requests
    ADD CONSTRAINT client_access_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id);


--
-- Name: client_access_requests client_access_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_access_requests
    ADD CONSTRAINT client_access_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: client_verticals client_verticals_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_verticals
    ADD CONSTRAINT client_verticals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: clients clients_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: clients clients_rm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_rm_id_fkey FOREIGN KEY (rm_id) REFERENCES public.users(id);


--
-- Name: deals deals_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: deals deals_rm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_rm_id_fkey FOREIGN KEY (rm_id) REFERENCES public.users(id);


--
-- Name: document_versions document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_versions document_versions_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_versions
    ADD CONSTRAINT document_versions_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: documents documents_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: documents documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: documents documents_sr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_sr_id_fkey FOREIGN KEY (sr_id) REFERENCES public.service_requests(id);


--
-- Name: leads leads_assigned_rm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_rm_id_fkey FOREIGN KEY (assigned_rm_id) REFERENCES public.users(id);


--
-- Name: leads leads_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: service_requests service_requests_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: service_requests service_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: service_requests service_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_requests
    ADD CONSTRAINT service_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sr_messages sr_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sr_messages
    ADD CONSTRAINT sr_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: sr_messages sr_messages_sr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sr_messages
    ADD CONSTRAINT sr_messages_sr_id_fkey FOREIGN KEY (sr_id) REFERENCES public.service_requests(id) ON DELETE CASCADE;


--
-- Name: user_role_mapping user_role_mapping_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_mapping
    ADD CONSTRAINT user_role_mapping_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.user_roles(id) ON DELETE CASCADE;


--
-- Name: user_role_mapping user_role_mapping_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_mapping
    ADD CONSTRAINT user_role_mapping_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--



-- ==================================================================
-- DATA SEED
-- ==================================================================

SET search_path = public;
SET session_replication_role = 'replica';

TRUNCATE TABLE
  ai_chat_logs, audit_logs, notifications, sr_messages,
  document_versions, client_access_requests, user_role_mapping, user_sessions,
  client_verticals, documents, service_requests, deals, leads,
  clients, users, user_roles, lead_workflows,
  sla_config, ai_config, m365_config, verticals_config CASCADE;

INSERT INTO public.ai_chat_logs VALUES ('c6a28e24-90a0-4e78-b9c7-abbe0f088f5f', NULL, 'test', 'Super Admin', '{"Retail Broking"}', 'Show me all clients in Retail Broking vertical', 'I wasn''t able to retrieve that data right now. The query could not be completed — please try rephrasing your question or ask something different.', 'SELECT c.id, c.client_code, c.name, c.category, c.status, c.kyc_status, c.risk_profile, c.city, c.state, c.created_at FROM clients c JOIN client_verticals cv ON c.id = cv.client_id WHERE cv.vertical = ''retail'' LIMIT 50', 'openai', 'gpt-4o', 1152, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (serial PK), client_code (varchar), name, category (Individual|Corporate|HNI|UHNI|Institutional),\n  status (Active|Inactive|Suspended), kyc_status (Verified|Pending|Rejected|Expired), risk_profile (Low|Moderate|Aggressive),\n  mobile, email, city, state, pan_number, dob, created_at\n\n\nTABLE: client_verticals\n  id, client_id (FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie'')\n  JOIN: clients c JOIN client_verticals cv ON c.id = cv.client_id\n\n\nTABLE: leads\n  id, lead_code, client_id (nullable), name, email, mobile, source, vertical\n  (full names: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (New|Contacted|Qualified|Proposal|Negotiation|Won|Lost), value (numeric),\n  assigned_to, created_at, expected_close\n\n\nTABLE: deals\n  id, deal_code, client_id, title, vertical (same full names as leads), stage\n  (Discovery|Proposal|Negotiation|DD|Signed|Closed Won|Closed Lost), value (numeric),\n  assigned_to, probability, close_date, created_at\n\n\nTABLE: service_requests\n  id, sr_code, client_id, subject, category, vertical, status (Open|In Progress|Escalated|Resolved|Closed),\n  priority (Low|Medium|High|Critical), sla_status (ok|at_risk|breached), created_at, resolved_at,\n  assigned_to, description\n\n\nTABLE: documents\n  id, client_id, name, type, vertical, status (Active|Expired|Pending), expiry_date, file_path, uploaded_at\n\n\nTABLE: users\n  id, name, email, role, vertical, status, auth_type, last_login\n\n\nTABLE: audit_logs\n  id, entity_type, entity_id, user_name, action, details, created_at\n\nVERTICAL CODE MAPPING: client_verticals uses short codes (retail, corporate, ib, aif, ie)\n  leads/deals/service_requests use full names (Retail Broking, Corporate Broking, Investment Banking, AIF, Institutional Equities)\n\nUSER ACCESS:\n- Name: test, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "Show me all clients in Retail Broking vertical"}]}', '{"sql": "SELECT c.id, c.client_code, c.name, c.category, c.status, c.kyc_status, c.risk_profile, c.city, c.state, c.created_at FROM clients c JOIN client_verticals cv ON c.id = cv.client_id WHERE cv.vertical = ''retail'' LIMIT 50", "step1": "{\"sql\": \"SELECT c.id, c.client_code, c.name, c.category, c.status, c.kyc_status, c.risk_profile, c.city, c.state, c.created_at FROM clients c JOIN client_verticals cv ON c.id = cv.client_id WHERE cv.vertical = ''retail'' LIMIT 50\"}", "dbError": "column c.city does not exist"}', '2026-03-22 06:55:45.723866+00');
INSERT INTO public.ai_chat_logs VALUES ('ba6cafae-3410-441f-801c-e11b2fa69209', NULL, 'test', 'Super Admin', '{"Retail Broking"}', 'Show me all clients in Retail Broking vertical', 'I wasn''t able to retrieve that data right now. The query could not be completed — please try rephrasing your question or ask something different.', 'SELECT c.id, c.client_code, c.name, c.category, c.status, c.kyc_status, c.risk_profile, c.city, c.state, c.created_at FROM clients c JOIN client_verticals cv ON c.id = cv.client_id WHERE cv.vertical = ''retail'' LIMIT 50', 'openai', 'gpt-4o', 974, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (serial PK), client_code (varchar), name, category (Individual|Corporate|HNI|UHNI|Institutional),\n  status (Active|Inactive|Suspended), kyc_status (Verified|Pending|Rejected|Expired), risk_profile (Low|Moderate|Aggressive),\n  mobile, email, city, state, pan_number, dob, created_at\n\n\nTABLE: client_verticals\n  id, client_id (FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie'')\n  JOIN: clients c JOIN client_verticals cv ON c.id = cv.client_id\n\n\nTABLE: leads\n  id, lead_code, client_id (nullable), name, email, mobile, source, vertical\n  (full names: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (New|Contacted|Qualified|Proposal|Negotiation|Won|Lost), value (numeric),\n  assigned_to, created_at, expected_close\n\n\nTABLE: deals\n  id, deal_code, client_id, title, vertical (same full names as leads), stage\n  (Discovery|Proposal|Negotiation|DD|Signed|Closed Won|Closed Lost), value (numeric),\n  assigned_to, probability, close_date, created_at\n\n\nTABLE: service_requests\n  id, sr_code, client_id, subject, category, vertical, status (Open|In Progress|Escalated|Resolved|Closed),\n  priority (Low|Medium|High|Critical), sla_status (ok|at_risk|breached), created_at, resolved_at,\n  assigned_to, description\n\n\nTABLE: documents\n  id, client_id, name, type, vertical, status (Active|Expired|Pending), expiry_date, file_path, uploaded_at\n\n\nTABLE: users\n  id, name, email, role, vertical, status, auth_type, last_login\n\n\nTABLE: audit_logs\n  id, entity_type, entity_id, user_name, action, details, created_at\n\nVERTICAL CODE MAPPING: client_verticals uses short codes (retail, corporate, ib, aif, ie)\n  leads/deals/service_requests use full names (Retail Broking, Corporate Broking, Investment Banking, AIF, Institutional Equities)\n\nUSER ACCESS:\n- Name: test, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "Show me all clients in Retail Broking vertical"}]}', '{"sql": "SELECT c.id, c.client_code, c.name, c.category, c.status, c.kyc_status, c.risk_profile, c.city, c.state, c.created_at FROM clients c JOIN client_verticals cv ON c.id = cv.client_id WHERE cv.vertical = ''retail'' LIMIT 50", "step1": "{\"sql\": \"SELECT c.id, c.client_code, c.name, c.category, c.status, c.kyc_status, c.risk_profile, c.city, c.state, c.created_at FROM clients c JOIN client_verticals cv ON c.id = cv.client_id WHERE cv.vertical = ''retail'' LIMIT 50\"}", "dbError": "column c.city does not exist"}', '2026-03-22 06:55:51.748742+00');
INSERT INTO public.ai_chat_logs VALUES ('d7af8f0c-92db-43a7-a011-ac79df173264', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'Super Admin', '{"Retail Broking","Corporate Broking",AIF,"Investment Banking","Institutional Equities"}', 'show me details about sbi mutual fund, also show contact number', 'I wasn''t able to retrieve that data right now. The query could not be completed — please try rephrasing your question or ask something different.', 'SELECT client_code, name, category, status, kyc_status, risk_profile, CONCAT(''***'', RIGHT(mobile, 4)) AS mobile, CONCAT(SUBSTR(email, 1, 2), ''***@***'') AS email, city, state, pan_number, dob, created_at FROM clients WHERE name ILIKE ''%SBI Mutual Fund%'' LIMIT 50', 'openai', 'gpt-4o', 1289, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (serial PK), client_code (varchar), name, category (Individual|Corporate|HNI|UHNI|Institutional),\n  status (Active|Inactive|Suspended), kyc_status (Verified|Pending|Rejected|Expired), risk_profile (Low|Moderate|Aggressive),\n  mobile, email, city, state, pan_number, dob, created_at\n\n\nTABLE: client_verticals\n  id, client_id (FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie'')\n  JOIN: clients c JOIN client_verticals cv ON c.id = cv.client_id\n\n\nTABLE: leads\n  id, lead_code, client_id (nullable), name, email, mobile, source, vertical\n  (full names: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (New|Contacted|Qualified|Proposal|Negotiation|Won|Lost), value (numeric),\n  assigned_to, created_at, expected_close\n\n\nTABLE: deals\n  id, deal_code, client_id, title, vertical (same full names as leads), stage\n  (Discovery|Proposal|Negotiation|DD|Signed|Closed Won|Closed Lost), value (numeric),\n  assigned_to, probability, close_date, created_at\n\n\nTABLE: service_requests\n  id, sr_code, client_id, subject, category, vertical, status (Open|In Progress|Escalated|Resolved|Closed),\n  priority (Low|Medium|High|Critical), sla_status (ok|at_risk|breached), created_at, resolved_at,\n  assigned_to, description\n\n\nTABLE: documents\n  id, client_id, name, type, vertical, status (Active|Expired|Pending), expiry_date, file_path, uploaded_at\n\n\nTABLE: users\n  id, name, email, role, vertical, status, auth_type, last_login\n\n\nTABLE: audit_logs\n  id, entity_type, entity_id, user_name, action, details, created_at\n\nVERTICAL CODE MAPPING: client_verticals uses short codes (retail, corporate, ib, aif, ie)\n  leads/deals/service_requests use full names (Retail Broking, Corporate Broking, Investment Banking, AIF, Institutional Equities)\n\nUSER ACCESS:\n- Name: Bhushan Niytri, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "show me details about sbi mutual fund, also show contact number"}]}', '{"sql": "SELECT client_code, name, category, status, kyc_status, risk_profile, CONCAT(''***'', RIGHT(mobile, 4)) AS mobile, CONCAT(SUBSTR(email, 1, 2), ''***@***'') AS email, city, state, pan_number, dob, created_at FROM clients WHERE name ILIKE ''%SBI Mutual Fund%'' LIMIT 50", "step1": "{\"sql\": \"SELECT client_code, name, category, status, kyc_status, risk_profile, CONCAT(''***'', RIGHT(mobile, 4)) AS mobile, CONCAT(SUBSTR(email, 1, 2), ''***@***'') AS email, city, state, pan_number, dob, created_at FROM clients WHERE name ILIKE ''%SBI Mutual Fund%'' LIMIT 50\"}", "dbError": "column \"city\" does not exist"}', '2026-03-22 06:57:03.463845+00');
INSERT INTO public.ai_chat_logs VALUES ('ee3919e9-7751-45f6-984d-c2bf97f65fa1', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'Super Admin', '{"Retail Broking","Corporate Broking",AIF,"Investment Banking","Institutional Equities"}', 'what is the issue', 'I''m unable to provide specific details or contact numbers for clients due to privacy and data protection policies. If you need general information or summaries that don''t involve sensitive details, feel free to ask!', NULL, 'openai', 'gpt-4o', 1102, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (serial PK), client_code (varchar), name, category (Individual|Corporate|HNI|UHNI|Institutional),\n  status (Active|Inactive|Suspended), kyc_status (Verified|Pending|Rejected|Expired), risk_profile (Low|Moderate|Aggressive),\n  mobile, email, city, state, pan_number, dob, created_at\n\n\nTABLE: client_verticals\n  id, client_id (FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie'')\n  JOIN: clients c JOIN client_verticals cv ON c.id = cv.client_id\n\n\nTABLE: leads\n  id, lead_code, client_id (nullable), name, email, mobile, source, vertical\n  (full names: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (New|Contacted|Qualified|Proposal|Negotiation|Won|Lost), value (numeric),\n  assigned_to, created_at, expected_close\n\n\nTABLE: deals\n  id, deal_code, client_id, title, vertical (same full names as leads), stage\n  (Discovery|Proposal|Negotiation|DD|Signed|Closed Won|Closed Lost), value (numeric),\n  assigned_to, probability, close_date, created_at\n\n\nTABLE: service_requests\n  id, sr_code, client_id, subject, category, vertical, status (Open|In Progress|Escalated|Resolved|Closed),\n  priority (Low|Medium|High|Critical), sla_status (ok|at_risk|breached), created_at, resolved_at,\n  assigned_to, description\n\n\nTABLE: documents\n  id, client_id, name, type, vertical, status (Active|Expired|Pending), expiry_date, file_path, uploaded_at\n\n\nTABLE: users\n  id, name, email, role, vertical, status, auth_type, last_login\n\n\nTABLE: audit_logs\n  id, entity_type, entity_id, user_name, action, details, created_at\n\nVERTICAL CODE MAPPING: client_verticals uses short codes (retail, corporate, ib, aif, ie)\n  leads/deals/service_requests use full names (Retail Broking, Corporate Broking, Investment Banking, AIF, Institutional Equities)\n\nUSER ACCESS:\n- Name: Bhushan Niytri, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "show me details about sbi mutual fund, also show contact number"}, {"role": "assistant", "content": "I wasn''t able to retrieve that data right now. The query could not be completed — please try rephrasing your question or ask something different."}, {"role": "user", "content": "what is the issue"}]}', '{"step1": "I''m unable to provide specific details or contact numbers for clients due to privacy and data protection policies. If you need general information or summaries that don''t involve sensitive details, feel free to ask!"}', '2026-03-22 06:57:18.088918+00');
INSERT INTO public.ai_chat_logs VALUES ('aee40f4b-e57e-4607-bbec-7e0cdc164dd8', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'Super Admin', '{"Retail Broking","Corporate Broking",AIF,"Investment Banking","Institutional Equities"}', 'no', 'If you are experiencing an issue, please provide more context or specify the data you are looking for, and I''ll be glad to assist you further.', NULL, 'openai', 'gpt-4o', 1118, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (uuid PK), client_code (varchar), name (varchar),\n  type (varchar: ''Individual''|''Non-Individual''),\n  category (varchar), pan (varchar), mobile (varchar), email (varchar),\n  address (text), date_of_birth (date), date_of_incorporation (date),\n  rm_id (uuid FK→users.id), owner_id (uuid FK→users.id),\n  status (varchar: ''Active''|''Dormant''|''Suspended''|''Closed''),\n  kyc_status (varchar: ''Verified''|''Pending''|''Expired''),\n  risk_profile (varchar: ''Low''|''Moderate''|''High''|''Ultra-High''),\n  fatca_status (varchar: ''Compliant''|''Non-Compliant''|''Pending''|''N/A''),\n  demat_account (varchar), dp_id (varchar), ckyc_id (varchar),\n  created_at (timestamptz), updated_at (timestamptz)\n  NOTE: There is NO city or state column — use address instead. pan_number does NOT exist — use pan.\n\n\nTABLE: client_verticals\n  client_id (uuid FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie''), activated_at (timestamptz)\n  JOIN clients c: JOIN client_verticals cv ON c.id = cv.client_id\n  VERTICAL CODE MAPPING: ''retail''=Retail Broking, ''corporate''=Corporate Broking, ''ib''=Investment Banking, ''aif''=AIF, ''ie''=Institutional Equities\n\n\nTABLE: leads\n  id (uuid PK), lead_code (varchar), name (varchar),\n  vertical (varchar: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (varchar — free text, e.g. ''active'',''qualified'',''identified'',''interest'',''pitch'',''closure'', etc.),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  value_estimate (varchar — textual estimate, NOT numeric),\n  source (varchar), assigned_rm_id (uuid FK→users.id), client_id (uuid FK→clients.id),\n  status (varchar: ''Active''|''Inactive''), opened_at (timestamptz), closed_at (timestamptz),\n  notes (text), created_at (timestamptz)\n  NOTE: No email, mobile, assigned_to, or value columns — use assigned_rm_id and value_estimate.\n\n\nTABLE: deals\n  id (uuid PK), deal_code (varchar), name (varchar),\n  vertical (varchar: same full names as leads),\n  type (varchar), value (varchar — textual, NOT numeric), stage (varchar — free text),\n  client_id (uuid FK→clients.id), rm_id (uuid FK→users.id),\n  deal_date (date), notes (text), created_at (timestamptz)\n  NOTE: No title, assigned_to, probability, or close_date columns — use name, rm_id, deal_date.\n\n\nTABLE: service_requests\n  id (uuid PK), sr_code (varchar), subject (varchar), description (text),\n  category (varchar), subcategory (varchar), channel (varchar: ''Email''|''Phone''|''Chat''|''Portal''|''WhatsApp''|''Branch''),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  status (varchar: ''Open''|''In Progress''|''Escalated''|''Resolved''|''Closed''),\n  sla_deadline (timestamptz), sla_status (varchar: ''ok''|''warning''|''breached''),\n  client_id (uuid FK→clients.id), vertical (varchar),\n  created_by (uuid FK→users.id), assigned_to (uuid FK→users.id),\n  resolved_at (timestamptz), closed_at (timestamptz), resolution_notes (text),\n  created_at (timestamptz)\n  NOTE: sla_status uses ''warning'' NOT ''at_risk''.\n\n\nTABLE: documents\n  id (uuid PK), doc_code (varchar), name (varchar), type (varchar),\n  client_id (uuid FK→clients.id), sr_id (uuid FK→service_requests.id),\n  vertical (varchar), status (varchar: ''Pending''|''Active''|''Expired''),\n  current_version (varchar), created_by (uuid FK→users.id), created_at (timestamptz)\n  NOTE: No file_path, expiry_date, or uploaded_at columns.\n\n\nTABLE: users\n  id (uuid PK), name (varchar), email (varchar), role (varchar), vertical (varchar),\n  status (varchar: ''Active''|''Inactive''), auth_type (varchar: ''app''|''m365''),\n  last_login (timestamptz), created_at (timestamptz)\n\n\nTABLE: audit_logs\n  id (uuid PK), entity_type (varchar), entity_id (uuid), user_id (uuid FK→users.id),\n  user_name (varchar), action (varchar), details (text),\n  old_value (jsonb), new_value (jsonb), ip_address (inet), created_at (timestamptz)\n\nUSER ACCESS:\n- Name: Bhushan Niytri, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "what is the issue"}, {"role": "assistant", "content": "I''m unable to provide specific details or contact numbers for clients due to privacy and data protection policies. If you need general information or summaries that don''t involve sensitive details, feel free to ask!"}, {"role": "user", "content": "I am an admin and you may display masked data"}, {"role": "assistant", "content": "I apologize for any inconvenience. Allow me to retrieve the relevant information for you.\n\n{\"sql\": \"SELECT name, category, SUBSTRING(mobile, 1, 3) || ''****'' || SUBSTRING(mobile, 8, 3) AS mobile, SUBSTRING(email, 1, 1) || ''****'' || SUBSTRING(email, POSITION(''@'' IN email)-1, LENGTH(email)) AS email, address, status, kyc_status, risk_profile FROM clients WHERE name ILIKE ''%SBI Mutual Fund%'' LIMIT 50\"}"}, {"role": "user", "content": "can not see any information"}, {"role": "assistant", "content": "I apologize for the inconvenience. Let me try again.\n\n{\"sql\": \"SELECT name, category, ''***-***-'' || SUBSTRING(mobile, 7, 4) AS masked_mobile, LEFT(email, 1) || ''***'' || SUBSTRING(email, POSITION(''@'' IN email) - 1, LENGTH(email)) AS masked_email, address, status, kyc_status, risk_profile FROM clients WHERE name ILIKE ''%SBI Mutual Fund%'' LIMIT 50\"}"}, {"role": "user", "content": "no"}]}', '{"step1": "{\"answer\": \"If you are experiencing an issue, please provide more context or specify the data you are looking for, and I''ll be glad to assist you further.\"}"}', '2026-03-22 06:58:18.100855+00');
INSERT INTO public.ai_chat_logs VALUES ('ad7997fa-219a-4ff7-a269-3a3430b551b7', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'Super Admin', '{"Retail Broking","Corporate Broking",AIF,"Investment Banking","Institutional Equities"}', 'please include contact number', 'I''m unable to provide contact numbers due to privacy and data protection guidelines. If you need to get in touch with any specific client or deal representative, please refer to the internal directory or contact your compliance officer for assistance. Is there anything else you would like to know?', NULL, 'openai', 'gpt-4o', 1087, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (uuid PK), client_code (varchar), name (varchar),\n  type (varchar: ''Individual''|''Non-Individual''),\n  category (varchar), pan (varchar), mobile (varchar), email (varchar),\n  address (text), date_of_birth (date), date_of_incorporation (date),\n  rm_id (uuid FK→users.id), owner_id (uuid FK→users.id),\n  status (varchar: ''Active''|''Dormant''|''Suspended''|''Closed''),\n  kyc_status (varchar: ''Verified''|''Pending''|''Expired''),\n  risk_profile (varchar: ''Low''|''Moderate''|''High''|''Ultra-High''),\n  fatca_status (varchar: ''Compliant''|''Non-Compliant''|''Pending''|''N/A''),\n  demat_account (varchar), dp_id (varchar), ckyc_id (varchar),\n  created_at (timestamptz), updated_at (timestamptz)\n  NOTE: There is NO city or state column — use address instead. pan_number does NOT exist — use pan.\n\n\nTABLE: client_verticals\n  client_id (uuid FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie''), activated_at (timestamptz)\n  JOIN clients c: JOIN client_verticals cv ON c.id = cv.client_id\n  VERTICAL CODE MAPPING: ''retail''=Retail Broking, ''corporate''=Corporate Broking, ''ib''=Investment Banking, ''aif''=AIF, ''ie''=Institutional Equities\n\n\nTABLE: leads\n  id (uuid PK), lead_code (varchar), name (varchar),\n  vertical (varchar: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (varchar — free text, e.g. ''active'',''qualified'',''identified'',''interest'',''pitch'',''closure'', etc.),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  value_estimate (varchar — textual estimate, NOT numeric),\n  source (varchar), assigned_rm_id (uuid FK→users.id), client_id (uuid FK→clients.id),\n  status (varchar: ''Active''|''Inactive''), opened_at (timestamptz), closed_at (timestamptz),\n  notes (text), created_at (timestamptz)\n  NOTE: No email, mobile, assigned_to, or value columns — use assigned_rm_id and value_estimate.\n\n\nTABLE: deals\n  id (uuid PK), deal_code (varchar), name (varchar),\n  vertical (varchar: same full names as leads),\n  type (varchar), value (varchar — textual, NOT numeric), stage (varchar — free text),\n  client_id (uuid FK→clients.id), rm_id (uuid FK→users.id),\n  deal_date (date), notes (text), created_at (timestamptz)\n  NOTE: No title, assigned_to, probability, or close_date columns — use name, rm_id, deal_date.\n\n\nTABLE: service_requests\n  id (uuid PK), sr_code (varchar), subject (varchar), description (text),\n  category (varchar), subcategory (varchar), channel (varchar: ''Email''|''Phone''|''Chat''|''Portal''|''WhatsApp''|''Branch''),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  status (varchar: ''Open''|''In Progress''|''Escalated''|''Resolved''|''Closed''),\n  sla_deadline (timestamptz), sla_status (varchar: ''ok''|''warning''|''breached''),\n  client_id (uuid FK→clients.id), vertical (varchar),\n  created_by (uuid FK→users.id), assigned_to (uuid FK→users.id),\n  resolved_at (timestamptz), closed_at (timestamptz), resolution_notes (text),\n  created_at (timestamptz)\n  NOTE: sla_status uses ''warning'' NOT ''at_risk''.\n\n\nTABLE: documents\n  id (uuid PK), doc_code (varchar), name (varchar), type (varchar),\n  client_id (uuid FK→clients.id), sr_id (uuid FK→service_requests.id),\n  vertical (varchar), status (varchar: ''Pending''|''Active''|''Expired''),\n  current_version (varchar), created_by (uuid FK→users.id), created_at (timestamptz)\n  NOTE: No file_path, expiry_date, or uploaded_at columns.\n\n\nTABLE: users\n  id (uuid PK), name (varchar), email (varchar), role (varchar), vertical (varchar),\n  status (varchar: ''Active''|''Inactive''), auth_type (varchar: ''app''|''m365''),\n  last_login (timestamptz), created_at (timestamptz)\n\n\nTABLE: audit_logs\n  id (uuid PK), entity_type (varchar), entity_id (uuid), user_id (uuid FK→users.id),\n  user_name (varchar), action (varchar), details (text),\n  old_value (jsonb), new_value (jsonb), ip_address (inet), created_at (timestamptz)\n\nUSER ACCESS:\n- Name: Bhushan Niytri, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "no"}, {"role": "assistant", "content": "If you are experiencing an issue, please provide more context or specify the data you are looking for, and I''ll be glad to assist you further."}, {"role": "user", "content": "show me latest deals"}, {"role": "assistant", "content": "Here is a summary of the latest deals:\n\n### Retail Broking\n- **Ajay Choudhary — SIP Setup**  \n  - **Type:** SIP Setup  \n  - **Value:** ₹50K/month  \n  - **Stage:** Active  \n  - **Date:** March 12, 2026  \n\n- **Pradeep Kumar — IPO**  \n  - **Type:** IPO Application  \n  - **Value:** ₹10L allotted  \n  - **Stage:** Allotted  \n  - **Date:** March 18, 2026  \n\n- **Asha Mehta — Margin**  \n  - **Type:** Margin Trading  \n  - **Value:** ₹18L limit  \n  - **Stage:** Active  \n  - **Date:** March 5, 2026  \n\n- **HNI Basket NIFTY50**  \n  - **Type:** Equity Advisory  \n  - **Value:** ₹2.2Cr AUM  \n  - **Stage:** Active  \n  - **Date:** March 1, 2026  \n\n### Corporate Broking\n- **Bajaj Holdings Block Deal**  \n  - **Type:** Block Deal  \n  - **Value:** ₹142Cr  \n  - **Stage:** Executed  \n  - **Date:** March 15, 2026  \n\n- **Adani Clearing March**  \n  - **Type:** Clearing  \n  - **Value:** ₹318Cr  \n  - **Stage:** Settled  \n  - **Date:** March 20, 2026  \n\n- **JSW Steel Bulk Order**  \n  - **Type:** Bulk Deal  \n  - **Value:** ₹85Cr  \n  - **Stage:** In Progress  \n  - **Date:** March 21, 2026  \n\n### Investment Banking\n- **Tata Sons — M&A Advisory**  \n  - **Type:** M&A  \n  - **Value:** ₹4,800Cr  \n  - **Stage:** Due Diligence  \n  - **Date:** January 15, 2026  \n\n- **HDFC Life QIP**  \n  - **Type:** ECM  \n  - **Value:** ₹1,200Cr  \n  - **Stage:** Mandate Signed  \n  - **Date:** February 1, 2026  \n\n- **Reliance Infra Restructuring**  \n  - **Type:** Debt Restructuring  \n  - **Value:** ₹6,500Cr  \n  - **Stage:** Mandate Letter  \n  - **Date:** January 28, 2026  \n\n### AIF (Alternative Investment Fund)\n- **NIYTRI Growth Cat III — Series 2**  \n  - **Type:** Fund Raise  \n  - **Value:** ₹400Cr  \n  - **Stage:** Active  \n  - **Date:** January 1, 2026  \n\n- **Patel Trust — Cat II Subscription**  \n  - **Type:** Subscription  \n  - **Value:** ₹50Cr  \n  - **Stage:** Called  \n  - **Date:** February 15, 2026  \n\n### Institutional Equities\n- **Fidelity — Q1 Allocation**  \n  - **Type:** Block  \n  - **Value:** ₹280Cr  \n  - **Stage:** Executed  \n  - **Date:** March 15, 2026  \n\n- **GIC Singapore — Q1 Deal**  \n  - **Type:** Block  \n  - **Value:** ₹320Cr  \n  - **Stage:** Executed  \n  - **Date:** March 10, 2026  \n\n- **UTI MF — Monthly Flow**  \n  - **Type:** Volume  \n  - **Value:** ₹120Cr  \n  - **Stage:** Active  \n  - **Date:** March 21, 2026  \n\nThese are just a selection from the complete list of recent deals. If you need more details on any specific category or transaction, please let me know."}, {"role": "user", "content": "in a table format please"}, {"role": "assistant", "content": "Here is a summary of the latest deals:\n\n| **Deal Code** | **Name**                               | **Vertical**              | **Type**            | **Value**   | **Stage**        | **Date**       |\n|---------------|----------------------------------------|---------------------------|---------------------|-------------|------------------|---------------|\n| CB-D008       | L&T Block Deal — April                 | Corporate Broking         | Block Deal          | ₹175Cr      | Pending          | April 1, 2026 |\n| IE-D009       | Fidelity — Q2 Preview                  | Institutional Equities    | Block               | ₹350Cr      | In Discussion    | April 1, 2026 |\n| CB-D007       | HDFC Life Block — March QE            | Corporate Broking         | Block Deal          | ₹100Cr      | Pending          | March 31, 2026|\n| IE-D005       | Norges Bank — ESG Portfolio           | Institutional Equities    | Block               | ₹220Cr      | Pending          | March 25, 2026|\n| CB-D004       | Hero MotoCorp Block                   | Corporate Broking         | Block Deal          | ₹45Cr       | Pending          | March 22, 2026|\n| IE-D007       | Temasek — India Opportunity           | Institutional Equities    | Block               | ₹300Cr      | In Progress      | March 22, 2026|\n| IE-D003       | UTI MF — Monthly Flow                 | Institutional Equities    | Volume              | ₹120Cr      | Active           | March 21, 2026|\n| CB-D003       | JSW Steel Bulk Order                  | Corporate Broking         | Bulk Deal           | ₹85Cr       | In Progress      | March 21, 2026|\n| CB-D009       | JSW Q1 Bulk — Continuation            | Corporate Broking         | Bulk Deal           | ₹60Cr       | In Progress      | March 21, 2026|\n| IE-D006       | HDFC AMC — Monthly Volume             | Institutional Equities    | Volume              | ₹95Cr       | Active           | March 21, 2026|\n| RB-D005       | Girish Nair — MF Switch               | Retail Broking            | MF Portfolio        | ₹35L AUM    | Executed         | March 20, 2026|\n| RB-D013       | Ravi Pillai — IPO                     | Retail Broking            | IPO Application     | ₹15L        | Applied          | March 20, 2026|\n| AIF-D005      | Ramesh Agarwal AIF                    | AIF                       | Subscription        | ₹10Cr       | Suitability      | March 20, 2026|\n| CB-D002       | Adani Clearing March                  | Corporate Broking         | Clearing            | ₹318Cr      | Settled          | March 20, 2026|\n| AIF-D008      | Pinky Agarwal — Cat I                 | AIF                       | Subscription        | ₹3Cr        | Suitability      | March 20, 2026|\n| RB-D009       | Ashok Verma — Tax Harvesting          | Retail Broking            | Portfolio Review    | ₹95L AUM    | Completed        | March 19, 2026|\n| IB-D008       | Birla — Rights Issue                  | Investment Banking        | ECM                 | ₹1,500Cr    | Pitch            | March 18, 2026|\n| RB-D002       | Pradeep Kumar — IPO                   | Retail Broking            | IPO Application     | ₹10L allotted | Allotted       | March 18, 2026|\n| IE-D004       | ICICI Prudential — Q1 Buy             | Institutional Equities    | Block               | ₹180Cr      | Executed         | March 18, 2026|\n| CB-D006       | ICICI Securities Volume               | Corporate Broking         | Bulk Deal           | ₹60Cr       | Executed         | March 17, 2026|\n\nThese are the top 20 deals from the latest list. If you need more information on any specific deal or further details, please let me know!"}, {"role": "user", "content": "please include contact number"}]}', '{"step1": "I''m unable to provide contact numbers due to privacy and data protection guidelines. If you need to get in touch with any specific client or deal representative, please refer to the internal directory or contact your compliance officer for assistance. Is there anything else you would like to know?"}', '2026-03-22 07:00:04.222573+00');
INSERT INTO public.ai_chat_logs VALUES ('e06b0739-7bc6-4df1-9fae-0ff357b324d9', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'Super Admin', '{"Retail Broking","Corporate Broking",AIF,"Investment Banking","Institutional Equities"}', 'show masked contact', 'I''m unable to provide contact numbers in any format, including masked, due to privacy and data protection guidelines. If you need to get in touch with any specific client or deal representative, please refer to the internal directory or contact your compliance officer for assistance. Is there anything else you would like to know?', NULL, 'openai', 'gpt-4o', 977, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (uuid PK), client_code (varchar), name (varchar),\n  type (varchar: ''Individual''|''Non-Individual''),\n  category (varchar), pan (varchar), mobile (varchar), email (varchar),\n  address (text), date_of_birth (date), date_of_incorporation (date),\n  rm_id (uuid FK→users.id), owner_id (uuid FK→users.id),\n  status (varchar: ''Active''|''Dormant''|''Suspended''|''Closed''),\n  kyc_status (varchar: ''Verified''|''Pending''|''Expired''),\n  risk_profile (varchar: ''Low''|''Moderate''|''High''|''Ultra-High''),\n  fatca_status (varchar: ''Compliant''|''Non-Compliant''|''Pending''|''N/A''),\n  demat_account (varchar), dp_id (varchar), ckyc_id (varchar),\n  created_at (timestamptz), updated_at (timestamptz)\n  NOTE: There is NO city or state column — use address instead. pan_number does NOT exist — use pan.\n\n\nTABLE: client_verticals\n  client_id (uuid FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie''), activated_at (timestamptz)\n  JOIN clients c: JOIN client_verticals cv ON c.id = cv.client_id\n  VERTICAL CODE MAPPING: ''retail''=Retail Broking, ''corporate''=Corporate Broking, ''ib''=Investment Banking, ''aif''=AIF, ''ie''=Institutional Equities\n\n\nTABLE: leads\n  id (uuid PK), lead_code (varchar), name (varchar),\n  vertical (varchar: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (varchar — free text, e.g. ''active'',''qualified'',''identified'',''interest'',''pitch'',''closure'', etc.),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  value_estimate (varchar — textual estimate, NOT numeric),\n  source (varchar), assigned_rm_id (uuid FK→users.id), client_id (uuid FK→clients.id),\n  status (varchar: ''Active''|''Inactive''), opened_at (timestamptz), closed_at (timestamptz),\n  notes (text), created_at (timestamptz)\n  NOTE: No email, mobile, assigned_to, or value columns — use assigned_rm_id and value_estimate.\n\n\nTABLE: deals\n  id (uuid PK), deal_code (varchar), name (varchar),\n  vertical (varchar: same full names as leads),\n  type (varchar), value (varchar — textual, NOT numeric), stage (varchar — free text),\n  client_id (uuid FK→clients.id), rm_id (uuid FK→users.id),\n  deal_date (date), notes (text), created_at (timestamptz)\n  NOTE: No title, assigned_to, probability, or close_date columns — use name, rm_id, deal_date.\n\n\nTABLE: service_requests\n  id (uuid PK), sr_code (varchar), subject (varchar), description (text),\n  category (varchar), subcategory (varchar), channel (varchar: ''Email''|''Phone''|''Chat''|''Portal''|''WhatsApp''|''Branch''),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  status (varchar: ''Open''|''In Progress''|''Escalated''|''Resolved''|''Closed''),\n  sla_deadline (timestamptz), sla_status (varchar: ''ok''|''warning''|''breached''),\n  client_id (uuid FK→clients.id), vertical (varchar),\n  created_by (uuid FK→users.id), assigned_to (uuid FK→users.id),\n  resolved_at (timestamptz), closed_at (timestamptz), resolution_notes (text),\n  created_at (timestamptz)\n  NOTE: sla_status uses ''warning'' NOT ''at_risk''.\n\n\nTABLE: documents\n  id (uuid PK), doc_code (varchar), name (varchar), type (varchar),\n  client_id (uuid FK→clients.id), sr_id (uuid FK→service_requests.id),\n  vertical (varchar), status (varchar: ''Pending''|''Active''|''Expired''),\n  current_version (varchar), created_by (uuid FK→users.id), created_at (timestamptz)\n  NOTE: No file_path, expiry_date, or uploaded_at columns.\n\n\nTABLE: users\n  id (uuid PK), name (varchar), email (varchar), role (varchar), vertical (varchar),\n  status (varchar: ''Active''|''Inactive''), auth_type (varchar: ''app''|''m365''),\n  last_login (timestamptz), created_at (timestamptz)\n\n\nTABLE: audit_logs\n  id (uuid PK), entity_type (varchar), entity_id (uuid), user_id (uuid FK→users.id),\n  user_name (varchar), action (varchar), details (text),\n  old_value (jsonb), new_value (jsonb), ip_address (inet), created_at (timestamptz)\n\nUSER ACCESS:\n- Name: Bhushan Niytri, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "show me latest deals"}, {"role": "assistant", "content": "Here is a summary of the latest deals:\n\n### Retail Broking\n- **Ajay Choudhary — SIP Setup**  \n  - **Type:** SIP Setup  \n  - **Value:** ₹50K/month  \n  - **Stage:** Active  \n  - **Date:** March 12, 2026  \n\n- **Pradeep Kumar — IPO**  \n  - **Type:** IPO Application  \n  - **Value:** ₹10L allotted  \n  - **Stage:** Allotted  \n  - **Date:** March 18, 2026  \n\n- **Asha Mehta — Margin**  \n  - **Type:** Margin Trading  \n  - **Value:** ₹18L limit  \n  - **Stage:** Active  \n  - **Date:** March 5, 2026  \n\n- **HNI Basket NIFTY50**  \n  - **Type:** Equity Advisory  \n  - **Value:** ₹2.2Cr AUM  \n  - **Stage:** Active  \n  - **Date:** March 1, 2026  \n\n### Corporate Broking\n- **Bajaj Holdings Block Deal**  \n  - **Type:** Block Deal  \n  - **Value:** ₹142Cr  \n  - **Stage:** Executed  \n  - **Date:** March 15, 2026  \n\n- **Adani Clearing March**  \n  - **Type:** Clearing  \n  - **Value:** ₹318Cr  \n  - **Stage:** Settled  \n  - **Date:** March 20, 2026  \n\n- **JSW Steel Bulk Order**  \n  - **Type:** Bulk Deal  \n  - **Value:** ₹85Cr  \n  - **Stage:** In Progress  \n  - **Date:** March 21, 2026  \n\n### Investment Banking\n- **Tata Sons — M&A Advisory**  \n  - **Type:** M&A  \n  - **Value:** ₹4,800Cr  \n  - **Stage:** Due Diligence  \n  - **Date:** January 15, 2026  \n\n- **HDFC Life QIP**  \n  - **Type:** ECM  \n  - **Value:** ₹1,200Cr  \n  - **Stage:** Mandate Signed  \n  - **Date:** February 1, 2026  \n\n- **Reliance Infra Restructuring**  \n  - **Type:** Debt Restructuring  \n  - **Value:** ₹6,500Cr  \n  - **Stage:** Mandate Letter  \n  - **Date:** January 28, 2026  \n\n### AIF (Alternative Investment Fund)\n- **NIYTRI Growth Cat III — Series 2**  \n  - **Type:** Fund Raise  \n  - **Value:** ₹400Cr  \n  - **Stage:** Active  \n  - **Date:** January 1, 2026  \n\n- **Patel Trust — Cat II Subscription**  \n  - **Type:** Subscription  \n  - **Value:** ₹50Cr  \n  - **Stage:** Called  \n  - **Date:** February 15, 2026  \n\n### Institutional Equities\n- **Fidelity — Q1 Allocation**  \n  - **Type:** Block  \n  - **Value:** ₹280Cr  \n  - **Stage:** Executed  \n  - **Date:** March 15, 2026  \n\n- **GIC Singapore — Q1 Deal**  \n  - **Type:** Block  \n  - **Value:** ₹320Cr  \n  - **Stage:** Executed  \n  - **Date:** March 10, 2026  \n\n- **UTI MF — Monthly Flow**  \n  - **Type:** Volume  \n  - **Value:** ₹120Cr  \n  - **Stage:** Active  \n  - **Date:** March 21, 2026  \n\nThese are just a selection from the complete list of recent deals. If you need more details on any specific category or transaction, please let me know."}, {"role": "user", "content": "in a table format please"}, {"role": "assistant", "content": "Here is a summary of the latest deals:\n\n| **Deal Code** | **Name**                               | **Vertical**              | **Type**            | **Value**   | **Stage**        | **Date**       |\n|---------------|----------------------------------------|---------------------------|---------------------|-------------|------------------|---------------|\n| CB-D008       | L&T Block Deal — April                 | Corporate Broking         | Block Deal          | ₹175Cr      | Pending          | April 1, 2026 |\n| IE-D009       | Fidelity — Q2 Preview                  | Institutional Equities    | Block               | ₹350Cr      | In Discussion    | April 1, 2026 |\n| CB-D007       | HDFC Life Block — March QE            | Corporate Broking         | Block Deal          | ₹100Cr      | Pending          | March 31, 2026|\n| IE-D005       | Norges Bank — ESG Portfolio           | Institutional Equities    | Block               | ₹220Cr      | Pending          | March 25, 2026|\n| CB-D004       | Hero MotoCorp Block                   | Corporate Broking         | Block Deal          | ₹45Cr       | Pending          | March 22, 2026|\n| IE-D007       | Temasek — India Opportunity           | Institutional Equities    | Block               | ₹300Cr      | In Progress      | March 22, 2026|\n| IE-D003       | UTI MF — Monthly Flow                 | Institutional Equities    | Volume              | ₹120Cr      | Active           | March 21, 2026|\n| CB-D003       | JSW Steel Bulk Order                  | Corporate Broking         | Bulk Deal           | ₹85Cr       | In Progress      | March 21, 2026|\n| CB-D009       | JSW Q1 Bulk — Continuation            | Corporate Broking         | Bulk Deal           | ₹60Cr       | In Progress      | March 21, 2026|\n| IE-D006       | HDFC AMC — Monthly Volume             | Institutional Equities    | Volume              | ₹95Cr       | Active           | March 21, 2026|\n| RB-D005       | Girish Nair — MF Switch               | Retail Broking            | MF Portfolio        | ₹35L AUM    | Executed         | March 20, 2026|\n| RB-D013       | Ravi Pillai — IPO                     | Retail Broking            | IPO Application     | ₹15L        | Applied          | March 20, 2026|\n| AIF-D005      | Ramesh Agarwal AIF                    | AIF                       | Subscription        | ₹10Cr       | Suitability      | March 20, 2026|\n| CB-D002       | Adani Clearing March                  | Corporate Broking         | Clearing            | ₹318Cr      | Settled          | March 20, 2026|\n| AIF-D008      | Pinky Agarwal — Cat I                 | AIF                       | Subscription        | ₹3Cr        | Suitability      | March 20, 2026|\n| RB-D009       | Ashok Verma — Tax Harvesting          | Retail Broking            | Portfolio Review    | ₹95L AUM    | Completed        | March 19, 2026|\n| IB-D008       | Birla — Rights Issue                  | Investment Banking        | ECM                 | ₹1,500Cr    | Pitch            | March 18, 2026|\n| RB-D002       | Pradeep Kumar — IPO                   | Retail Broking            | IPO Application     | ₹10L allotted | Allotted       | March 18, 2026|\n| IE-D004       | ICICI Prudential — Q1 Buy             | Institutional Equities    | Block               | ₹180Cr      | Executed         | March 18, 2026|\n| CB-D006       | ICICI Securities Volume               | Corporate Broking         | Bulk Deal           | ₹60Cr       | Executed         | March 17, 2026|\n\nThese are the top 20 deals from the latest list. If you need more information on any specific deal or further details, please let me know!"}, {"role": "user", "content": "please include contact number"}, {"role": "assistant", "content": "I''m unable to provide contact numbers due to privacy and data protection guidelines. If you need to get in touch with any specific client or deal representative, please refer to the internal directory or contact your compliance officer for assistance. Is there anything else you would like to know?"}, {"role": "user", "content": "show masked contact"}]}', '{"step1": "I''m unable to provide contact numbers in any format, including masked, due to privacy and data protection guidelines. If you need to get in touch with any specific client or deal representative, please refer to the internal directory or contact your compliance officer for assistance. Is there anything else you would like to know?"}', '2026-03-22 07:00:13.966113+00');
INSERT INTO public.ai_chat_logs VALUES ('54fc99a9-6bfe-4b0d-99cb-5bdf4df59355', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'Super Admin', '{"Retail Broking","Corporate Broking",AIF,"Investment Banking","Institutional Equities"}', 'noted, how the deals are at future dates', 'The data I provided earlier was fictional and not based on any actual database or real-world information. If you have specific queries related to actual deals in your CRM, please let me know, and I can assist you with a relevant SQL query to retrieve that data.', NULL, 'openai', 'gpt-4o', 1313, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (uuid PK), client_code (varchar), name (varchar),\n  type (varchar: ''Individual''|''Non-Individual''),\n  category (varchar), pan (varchar), mobile (varchar), email (varchar),\n  address (text), date_of_birth (date), date_of_incorporation (date),\n  rm_id (uuid FK→users.id), owner_id (uuid FK→users.id),\n  status (varchar: ''Active''|''Dormant''|''Suspended''|''Closed''),\n  kyc_status (varchar: ''Verified''|''Pending''|''Expired''),\n  risk_profile (varchar: ''Low''|''Moderate''|''High''|''Ultra-High''),\n  fatca_status (varchar: ''Compliant''|''Non-Compliant''|''Pending''|''N/A''),\n  demat_account (varchar), dp_id (varchar), ckyc_id (varchar),\n  created_at (timestamptz), updated_at (timestamptz)\n  NOTE: There is NO city or state column — use address instead. pan_number does NOT exist — use pan.\n\n\nTABLE: client_verticals\n  client_id (uuid FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie''), activated_at (timestamptz)\n  JOIN clients c: JOIN client_verticals cv ON c.id = cv.client_id\n  VERTICAL CODE MAPPING: ''retail''=Retail Broking, ''corporate''=Corporate Broking, ''ib''=Investment Banking, ''aif''=AIF, ''ie''=Institutional Equities\n\n\nTABLE: leads\n  id (uuid PK), lead_code (varchar), name (varchar),\n  vertical (varchar: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (varchar — free text, e.g. ''active'',''qualified'',''identified'',''interest'',''pitch'',''closure'', etc.),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  value_estimate (varchar — textual estimate, NOT numeric),\n  source (varchar), assigned_rm_id (uuid FK→users.id), client_id (uuid FK→clients.id),\n  status (varchar: ''Active''|''Inactive''), opened_at (timestamptz), closed_at (timestamptz),\n  notes (text), created_at (timestamptz)\n  NOTE: No email, mobile, assigned_to, or value columns — use assigned_rm_id and value_estimate.\n\n\nTABLE: deals\n  id (uuid PK), deal_code (varchar), name (varchar),\n  vertical (varchar: same full names as leads),\n  type (varchar), value (varchar — textual, NOT numeric), stage (varchar — free text),\n  client_id (uuid FK→clients.id), rm_id (uuid FK→users.id),\n  deal_date (date), notes (text), created_at (timestamptz)\n  NOTE: No title, assigned_to, probability, or close_date columns — use name, rm_id, deal_date.\n\n\nTABLE: service_requests\n  id (uuid PK), sr_code (varchar), subject (varchar), description (text),\n  category (varchar), subcategory (varchar), channel (varchar: ''Email''|''Phone''|''Chat''|''Portal''|''WhatsApp''|''Branch''),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  status (varchar: ''Open''|''In Progress''|''Escalated''|''Resolved''|''Closed''),\n  sla_deadline (timestamptz), sla_status (varchar: ''ok''|''warning''|''breached''),\n  client_id (uuid FK→clients.id), vertical (varchar),\n  created_by (uuid FK→users.id), assigned_to (uuid FK→users.id),\n  resolved_at (timestamptz), closed_at (timestamptz), resolution_notes (text),\n  created_at (timestamptz)\n  NOTE: sla_status uses ''warning'' NOT ''at_risk''.\n\n\nTABLE: documents\n  id (uuid PK), doc_code (varchar), name (varchar), type (varchar),\n  client_id (uuid FK→clients.id), sr_id (uuid FK→service_requests.id),\n  vertical (varchar), status (varchar: ''Pending''|''Active''|''Expired''),\n  current_version (varchar), created_by (uuid FK→users.id), created_at (timestamptz)\n  NOTE: No file_path, expiry_date, or uploaded_at columns.\n\n\nTABLE: users\n  id (uuid PK), name (varchar), email (varchar), role (varchar), vertical (varchar),\n  status (varchar: ''Active''|''Inactive''), auth_type (varchar: ''app''|''m365''),\n  last_login (timestamptz), created_at (timestamptz)\n\n\nTABLE: audit_logs\n  id (uuid PK), entity_type (varchar), entity_id (uuid), user_id (uuid FK→users.id),\n  user_name (varchar), action (varchar), details (text),\n  old_value (jsonb), new_value (jsonb), ip_address (inet), created_at (timestamptz)\n\nUSER ACCESS:\n- Name: Bhushan Niytri, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "in a table format please"}, {"role": "assistant", "content": "Here is a summary of the latest deals:\n\n| **Deal Code** | **Name**                               | **Vertical**              | **Type**            | **Value**   | **Stage**        | **Date**       |\n|---------------|----------------------------------------|---------------------------|---------------------|-------------|------------------|---------------|\n| CB-D008       | L&T Block Deal — April                 | Corporate Broking         | Block Deal          | ₹175Cr      | Pending          | April 1, 2026 |\n| IE-D009       | Fidelity — Q2 Preview                  | Institutional Equities    | Block               | ₹350Cr      | In Discussion    | April 1, 2026 |\n| CB-D007       | HDFC Life Block — March QE            | Corporate Broking         | Block Deal          | ₹100Cr      | Pending          | March 31, 2026|\n| IE-D005       | Norges Bank — ESG Portfolio           | Institutional Equities    | Block               | ₹220Cr      | Pending          | March 25, 2026|\n| CB-D004       | Hero MotoCorp Block                   | Corporate Broking         | Block Deal          | ₹45Cr       | Pending          | March 22, 2026|\n| IE-D007       | Temasek — India Opportunity           | Institutional Equities    | Block               | ₹300Cr      | In Progress      | March 22, 2026|\n| IE-D003       | UTI MF — Monthly Flow                 | Institutional Equities    | Volume              | ₹120Cr      | Active           | March 21, 2026|\n| CB-D003       | JSW Steel Bulk Order                  | Corporate Broking         | Bulk Deal           | ₹85Cr       | In Progress      | March 21, 2026|\n| CB-D009       | JSW Q1 Bulk — Continuation            | Corporate Broking         | Bulk Deal           | ₹60Cr       | In Progress      | March 21, 2026|\n| IE-D006       | HDFC AMC — Monthly Volume             | Institutional Equities    | Volume              | ₹95Cr       | Active           | March 21, 2026|\n| RB-D005       | Girish Nair — MF Switch               | Retail Broking            | MF Portfolio        | ₹35L AUM    | Executed         | March 20, 2026|\n| RB-D013       | Ravi Pillai — IPO                     | Retail Broking            | IPO Application     | ₹15L        | Applied          | March 20, 2026|\n| AIF-D005      | Ramesh Agarwal AIF                    | AIF                       | Subscription        | ₹10Cr       | Suitability      | March 20, 2026|\n| CB-D002       | Adani Clearing March                  | Corporate Broking         | Clearing            | ₹318Cr      | Settled          | March 20, 2026|\n| AIF-D008      | Pinky Agarwal — Cat I                 | AIF                       | Subscription        | ₹3Cr        | Suitability      | March 20, 2026|\n| RB-D009       | Ashok Verma — Tax Harvesting          | Retail Broking            | Portfolio Review    | ₹95L AUM    | Completed        | March 19, 2026|\n| IB-D008       | Birla — Rights Issue                  | Investment Banking        | ECM                 | ₹1,500Cr    | Pitch            | March 18, 2026|\n| RB-D002       | Pradeep Kumar — IPO                   | Retail Broking            | IPO Application     | ₹10L allotted | Allotted       | March 18, 2026|\n| IE-D004       | ICICI Prudential — Q1 Buy             | Institutional Equities    | Block               | ₹180Cr      | Executed         | March 18, 2026|\n| CB-D006       | ICICI Securities Volume               | Corporate Broking         | Bulk Deal           | ₹60Cr       | Executed         | March 17, 2026|\n\nThese are the top 20 deals from the latest list. If you need more information on any specific deal or further details, please let me know!"}, {"role": "user", "content": "please include contact number"}, {"role": "assistant", "content": "I''m unable to provide contact numbers due to privacy and data protection guidelines. If you need to get in touch with any specific client or deal representative, please refer to the internal directory or contact your compliance officer for assistance. Is there anything else you would like to know?"}, {"role": "user", "content": "show masked contact"}, {"role": "assistant", "content": "I''m unable to provide contact numbers in any format, including masked, due to privacy and data protection guidelines. If you need to get in touch with any specific client or deal representative, please refer to the internal directory or contact your compliance officer for assistance. Is there anything else you would like to know?"}, {"role": "user", "content": "noted, how the deals are at future dates"}]}', '{"step1": "The data I provided earlier was fictional and not based on any actual database or real-world information. If you have specific queries related to actual deals in your CRM, please let me know, and I can assist you with a relevant SQL query to retrieve that data."}', '2026-03-22 07:00:32.280317+00');
INSERT INTO public.ai_chat_logs VALUES ('a161792a-7ddf-4cf3-ba1b-3cee828fff95', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'Super Admin', '{"Retail Broking","Corporate Broking",AIF,"Investment Banking","Institutional Equities"}', 'how can you help, what all database access you have', 'I am a NIYTRI CRM AI Assistant, here to help you with queries related to clients, leads, deals, service requests, documents, and users within the CRM database. I have full access to all CRM data across all verticals, and can assist with generating reports, retrieving specific data, and answering questions based on the CRM data context provided. If you have any specific questions or need data insights, feel free to ask!', NULL, 'openai', 'gpt-4o', 1693, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (uuid PK), client_code (varchar), name (varchar),\n  type (varchar: ''Individual''|''Non-Individual''),\n  category (varchar), pan (varchar), mobile (varchar), email (varchar),\n  address (text), date_of_birth (date), date_of_incorporation (date),\n  rm_id (uuid FK→users.id), owner_id (uuid FK→users.id),\n  status (varchar: ''Active''|''Dormant''|''Suspended''|''Closed''),\n  kyc_status (varchar: ''Verified''|''Pending''|''Expired''),\n  risk_profile (varchar: ''Low''|''Moderate''|''High''|''Ultra-High''),\n  fatca_status (varchar: ''Compliant''|''Non-Compliant''|''Pending''|''N/A''),\n  demat_account (varchar), dp_id (varchar), ckyc_id (varchar),\n  created_at (timestamptz), updated_at (timestamptz)\n  NOTE: There is NO city or state column — use address instead. pan_number does NOT exist — use pan.\n\n\nTABLE: client_verticals\n  client_id (uuid FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie''), activated_at (timestamptz)\n  JOIN clients c: JOIN client_verticals cv ON c.id = cv.client_id\n  VERTICAL CODE MAPPING: ''retail''=Retail Broking, ''corporate''=Corporate Broking, ''ib''=Investment Banking, ''aif''=AIF, ''ie''=Institutional Equities\n\n\nTABLE: leads\n  id (uuid PK), lead_code (varchar), name (varchar),\n  vertical (varchar: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (varchar — free text, e.g. ''active'',''qualified'',''identified'',''interest'',''pitch'',''closure'', etc.),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  value_estimate (varchar — textual estimate, NOT numeric),\n  source (varchar), assigned_rm_id (uuid FK→users.id), client_id (uuid FK→clients.id),\n  status (varchar: ''Active''|''Inactive''), opened_at (timestamptz), closed_at (timestamptz),\n  notes (text), created_at (timestamptz)\n  NOTE: No email, mobile, assigned_to, or value columns — use assigned_rm_id and value_estimate.\n\n\nTABLE: deals\n  id (uuid PK), deal_code (varchar), name (varchar),\n  vertical (varchar: same full names as leads),\n  type (varchar), value (varchar — textual, NOT numeric), stage (varchar — free text),\n  client_id (uuid FK→clients.id), rm_id (uuid FK→users.id),\n  deal_date (date), notes (text), created_at (timestamptz)\n  NOTE: No title, assigned_to, probability, or close_date columns — use name, rm_id, deal_date.\n\n\nTABLE: service_requests\n  id (uuid PK), sr_code (varchar), subject (varchar), description (text),\n  category (varchar), subcategory (varchar), channel (varchar: ''Email''|''Phone''|''Chat''|''Portal''|''WhatsApp''|''Branch''),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  status (varchar: ''Open''|''In Progress''|''Escalated''|''Resolved''|''Closed''),\n  sla_deadline (timestamptz), sla_status (varchar: ''ok''|''warning''|''breached''),\n  client_id (uuid FK→clients.id), vertical (varchar),\n  created_by (uuid FK→users.id), assigned_to (uuid FK→users.id),\n  resolved_at (timestamptz), closed_at (timestamptz), resolution_notes (text),\n  created_at (timestamptz)\n  NOTE: sla_status uses ''warning'' NOT ''at_risk''.\n\n\nTABLE: documents\n  id (uuid PK), doc_code (varchar), name (varchar), type (varchar),\n  client_id (uuid FK→clients.id), sr_id (uuid FK→service_requests.id),\n  vertical (varchar), status (varchar: ''Pending''|''Active''|''Expired''),\n  current_version (varchar), created_by (uuid FK→users.id), created_at (timestamptz)\n  NOTE: No file_path, expiry_date, or uploaded_at columns.\n\n\nTABLE: users\n  id (uuid PK), name (varchar), email (varchar), role (varchar), vertical (varchar),\n  status (varchar: ''Active''|''Inactive''), auth_type (varchar: ''app''|''m365''),\n  last_login (timestamptz), created_at (timestamptz)\n\n\nTABLE: audit_logs\n  id (uuid PK), entity_type (varchar), entity_id (uuid), user_id (uuid FK→users.id),\n  user_name (varchar), action (varchar), details (text),\n  old_value (jsonb), new_value (jsonb), ip_address (inet), created_at (timestamptz)\n\nUSER ACCESS:\n- Name: Bhushan Niytri, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- AI Bot should not show any data outside the application database and documents, no internet data or fictional data at all\n- Table format response is preferred.\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nSTRICT RULES:\n1. When the user asks a data question, respond ONLY with valid JSON: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE.\n4. Add LIMIT 50 to all queries unless the user explicitly asks for all records.\n5. If the question requires NO database lookup (e.g. greeting, explanation, help), respond with: {\"answer\": \"<markdown response>\"}\n6. Return ONLY raw JSON — no code fences, no markdown wrapper, no explanation outside the JSON.\n7. CRITICAL: NEVER invent, assume, or hallucinate data. Only use what the query returns.\n8. NEVER reference tables, column names, SQL syntax, or technical details in your final responses to the user.\n9. Use ONLY the exact column names defined in the schema above. Do NOT guess column names.", "messages": [{"role": "user", "content": "how can you help, what all database access you have"}]}', '{"step1": "{\"answer\": \"I am a NIYTRI CRM AI Assistant, here to help you with queries related to clients, leads, deals, service requests, documents, and users within the CRM database. I have full access to all CRM data across all verticals, and can assist with generating reports, retrieving specific data, and answering questions based on the CRM data context provided. If you have any specific questions or need data insights, feel free to ask!\"}"}', '2026-03-22 09:02:51.478826+00');
INSERT INTO public.ai_chat_logs VALUES ('46c3e6cf-3c0c-4026-83f8-d4c92dcf1ad3', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'Super Admin', '{"Retail Broking","Corporate Broking",AIF,"Investment Banking","Institutional Equities"}', 'contact number please', 'I''m sorry, but I cannot provide contact numbers or any other personally identifiable information. If you have any further questions or need assistance, please let me know!', NULL, 'openai', 'gpt-4o', 1207, '{"system": "You are the NIYTRI CRM SQL Agent — an expert at querying PostgreSQL databases for financial services data.\n\nDATABASE SCHEMA (only these tables are available):\nTABLE: clients\n  id (uuid PK), client_code (varchar), name (varchar),\n  type (varchar: ''Individual''|''Non-Individual''),\n  category (varchar), pan (varchar), mobile (varchar), email (varchar),\n  address (text), date_of_birth (date), date_of_incorporation (date),\n  rm_id (uuid FK→users.id), owner_id (uuid FK→users.id),\n  status (varchar: ''Active''|''Dormant''|''Suspended''|''Closed''),\n  kyc_status (varchar: ''Verified''|''Pending''|''Expired''),\n  risk_profile (varchar: ''Low''|''Moderate''|''High''|''Ultra-High''),\n  fatca_status (varchar: ''Compliant''|''Non-Compliant''|''Pending''|''N/A''),\n  demat_account (varchar), dp_id (varchar), ckyc_id (varchar),\n  created_at (timestamptz), updated_at (timestamptz)\n  NOTE: There is NO city or state column — use address instead. pan_number does NOT exist — use pan.\n\n\nTABLE: client_verticals\n  client_id (uuid FK→clients.id), vertical (varchar: ''retail''|''corporate''|''ib''|''aif''|''ie''), activated_at (timestamptz)\n  JOIN clients c: JOIN client_verticals cv ON c.id = cv.client_id\n  VERTICAL CODE MAPPING: ''retail''=Retail Broking, ''corporate''=Corporate Broking, ''ib''=Investment Banking, ''aif''=AIF, ''ie''=Institutional Equities\n\n\nTABLE: leads\n  id (uuid PK), lead_code (varchar), name (varchar),\n  vertical (varchar: ''Retail Broking''|''Corporate Broking''|''Investment Banking''|''AIF''|''Institutional Equities''),\n  stage (varchar — free text, e.g. ''active'',''qualified'',''identified'',''interest'',''pitch'',''closure'', etc.),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  value_estimate (varchar — textual estimate, NOT numeric),\n  source (varchar), assigned_rm_id (uuid FK→users.id), client_id (uuid FK→clients.id),\n  status (varchar: ''Active''|''Inactive''), opened_at (timestamptz), closed_at (timestamptz),\n  notes (text), created_at (timestamptz)\n  NOTE: No email, mobile, assigned_to, or value columns — use assigned_rm_id and value_estimate.\n\n\nTABLE: deals\n  id (uuid PK), deal_code (varchar), name (varchar),\n  vertical (varchar: same full names as leads),\n  type (varchar), value (varchar — textual, NOT numeric), stage (varchar — free text),\n  client_id (uuid FK→clients.id), rm_id (uuid FK→users.id),\n  deal_date (date), notes (text), created_at (timestamptz)\n  NOTE: No title, assigned_to, probability, or close_date columns — use name, rm_id, deal_date.\n\n\nTABLE: service_requests\n  id (uuid PK), sr_code (varchar), subject (varchar), description (text),\n  category (varchar), subcategory (varchar), channel (varchar: ''Email''|''Phone''|''Chat''|''Portal''|''WhatsApp''|''Branch''),\n  priority (varchar: ''Low''|''Medium''|''High''|''Critical''),\n  status (varchar: ''Open''|''In Progress''|''Escalated''|''Resolved''|''Closed''),\n  sla_deadline (timestamptz), sla_status (varchar: ''ok''|''warning''|''breached''),\n  client_id (uuid FK→clients.id), vertical (varchar),\n  created_by (uuid FK→users.id), assigned_to (uuid FK→users.id),\n  resolved_at (timestamptz), closed_at (timestamptz), resolution_notes (text),\n  created_at (timestamptz)\n  NOTE: sla_status uses ''warning'' NOT ''at_risk''.\n\n\nTABLE: documents\n  id (uuid PK), doc_code (varchar), name (varchar), type (varchar),\n  client_id (uuid FK→clients.id), sr_id (uuid FK→service_requests.id),\n  vertical (varchar), status (varchar: ''Pending''|''Active''|''Expired''),\n  current_version (varchar), created_by (uuid FK→users.id), created_at (timestamptz)\n  NOTE: No file_path, expiry_date, or uploaded_at columns.\n\n\nTABLE: users\n  id (uuid PK), name (varchar), email (varchar), role (varchar), vertical (varchar),\n  status (varchar: ''Active''|''Inactive''), auth_type (varchar: ''app''|''m365''),\n  last_login (timestamptz), created_at (timestamptz)\n\n\nTABLE: audit_logs\n  id (uuid PK), entity_type (varchar), entity_id (uuid), user_id (uuid FK→users.id),\n  user_name (varchar), action (varchar), details (text),\n  old_value (jsonb), new_value (jsonb), ip_address (inet), created_at (timestamptz)\n\nUSER ACCESS:\n- Name: Bhushan Niytri, Role: Super Admin\n- Verticals: ALL\n- SQL filter for clients: WHERE TRUE\n- SQL filter for leads/deals/SRs: WHERE TRUE\n\nCUSTOM INSTRUCTIONS: You are a NIYTRI CRM AI Assistant — an intelligent services assistant for the enterprise CRM.\n\nGuidelines:\n- Answer ONLY based on the CRM data context provided to you\n- AI Bot should not show any data outside the application database and documents, no internet data or fictional data at all\n- RESPECT role-based access: if the user''s role doesn''t have access to a vertical or data table, politely deny and explain why\n- Be concise, accurate, and actionable\n- Format responses with bullet points and bold for key figures\n- Do not show output as is, use proper table format and bullet points wherever applicable, do not use emojis\n- Never fabricate data — if data isn''t in context, say \"Data not available in CRM\"\n- Mask PII data for users and customers/clients in responses, do not uncover even if it is asked by user.\n- For compliance-sensitive queries, always recommend verification with the compliance officer\n- display accuracy % along with color code, more than 90% should be green and display source in generic fashion, do not disclose actual query and table name anywhere.\nsimilar\n\nROLE-SPECIFIC INSTRUCTIONS: You have full access to all CRM data across all verticals. You can answer questions about any client, deal, SR, or lead.\n\nINSTRUCTIONS:\n1. When the user asks a data question, respond ONLY with a valid JSON block: {\"sql\": \"<SELECT query>\"}\n2. ALWAYS apply the access filters from USER ACCESS section in your WHERE clause.\n3. Only generate SELECT queries. NEVER use INSERT, UPDATE, DELETE, DROP, CREATE.\n4. Limit results: add LIMIT 50 unless user asks for all records.\n5. If the question can be answered without a database query, respond with: {\"answer\": \"<your response in markdown>\"}\n6. Return ONLY raw JSON, no code fences, no markdown, no explanation.", "messages": [{"role": "user", "content": "show me all in table format"}, {"role": "assistant", "content": "### KYC Expiry Alert\n\nBelow is the list of clients with an expired KYC status:\n\n| **Name**        | **Date of Birth** | **KYC Status** | **Last Updated** |\n|-----------------|-------------------|----------------|------------------|\n| Kavita Singh    | June 20, 1988     | Expired        | March 21, 2026   |\n\nPlease ensure that the KYC information is updated for the client listed above."}, {"role": "user", "content": "which vertical"}, {"role": "assistant", "content": "### KYC Expiry Alert\n\nBelow is the list of clients with an expired KYC status:\n\n| **Name**        | **Date of Birth** | **KYC Status** | **Vertical** | **Last Updated** |\n|-----------------|-------------------|----------------|--------------|------------------|\n| Kavita Singh    | June 20, 1988     | Expired        | Retail       | March 21, 2026   |\n\nPlease ensure that the KYC information is updated for the client listed above, particularly within the Retail vertical."}, {"role": "user", "content": "who is the owner of this contact"}, {"role": "assistant", "content": "### KYC Expiry Alert\n\nBelow is the list of clients with an expired KYC status:\n\n| **Name**        | **Date of Birth** | **KYC Status** | **Vertical** | **Last Updated** | **Owner**         |\n|-----------------|-------------------|----------------|--------------|------------------|-------------------|\n| Kavita Singh    | June 20, 1988     | Expired        | Retail       | March 21, 2026   | Bhushan Niytri    |\n\nPlease ensure that the KYC information is updated for the client listed above, with the owner being Bhushan Niytri, particularly within the Retail vertical."}, {"role": "user", "content": "contact number please"}]}', '{"step1": "{\"answer\": \"I''m sorry, but I cannot provide contact numbers or any other personally identifiable information. If you have any further questions or need assistance, please let me know!\"}"}', '2026-03-22 07:04:38.984463+00');
INSERT INTO public.ai_config (id, provider, model, api_key, enabled) VALUES ('8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', 'openai', 'gpt-4o', NULL, false);
INSERT INTO public.users VALUES ('442ef00e-75a0-4617-bd74-6a9e919bab6c', 'Amit Sharma', 'amit@niytri.com', NULL, 'm365', 'AIF Admin', 'AIF', 'Active', true, NULL, NULL, '2026-03-21 19:29:30.153831+00', '2026-03-21 19:29:30.153831+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000002', 'Anjali Kumar', 'anjali.kumar@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'RM', 'Retail Broking', 'Active', false, NULL, NULL, '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000003', 'Sonia Gupta', 'sonia.gupta@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'Senior RM', 'Corporate Broking', 'Active', false, NULL, NULL, '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000004', 'Vikram Nair', 'vikram.nair@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'RM', 'Corporate Broking', 'Active', false, NULL, NULL, '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('dc8bda71-7158-46aa-b355-19e1bb90cf34', 'Bhushan Niytri', 'bhushan@niytri.com', NULL, 'm365', 'Super Admin', 'All', 'Active', true, NULL, '2026-03-22 08:59:03.086438+00', '2026-03-21 19:29:26.25152+00', '2026-03-21 19:29:26.25152+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000006', 'Meera Krishnan', 'meera.krishnan@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'RM', 'AIF', 'Active', false, NULL, NULL, '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000007', 'Deepak Mehta', 'deepak.mehta@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'Senior RM', 'Institutional Equities', 'Active', false, NULL, NULL, '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000008', 'Ritu Agarwal', 'ritu.agarwal@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'CS Executive', 'All', 'Active', false, NULL, NULL, '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000009', 'Kiran Patil', 'kiran.patil@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'CS Head', 'All', 'Active', false, NULL, NULL, '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000010', 'Arun Mishra', 'arun.mishra@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'Compliance Officer', 'All', 'Active', false, NULL, NULL, '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000005', 'Arjun Rao', 'arjun.rao@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'Senior RM', 'Investment Banking', 'Active', false, NULL, '2026-03-22 04:13:16.485925+00', '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.users VALUES ('aaaa0001-0000-0000-0000-000000000001', 'Priya Sharma', 'priya.sharma@niytri.com', 'badb68ff1da8fe4e8046da5154732bf4b07185633ea16d03b26eb1650cdfb834', 'app', 'Senior RM', 'Retail Broking', 'Active', false, NULL, '2026-03-22 06:47:17.546794+00', '2026-03-21 21:14:15.897183+00', '2026-03-21 21:14:15.897183+00', NULL, NULL);
INSERT INTO public.audit_logs VALUES ('5ef3a73c-22ba-4ef1-9888-b232ff382ea8', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: openai, Model: gpt-4o, Enabled: false', NULL, NULL, NULL, '2026-03-21 20:46:12.810501+00');
INSERT INTO public.audit_logs VALUES ('f626bdc2-201a-4ce7-8eed-d0b97feaa295', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: openai, Model: gpt-4o, Enabled: false', NULL, NULL, NULL, '2026-03-21 20:47:21.63387+00');
INSERT INTO public.audit_logs VALUES ('c5635635-c421-4d33-a0cc-d9d89f56f7bc', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: openai, Model: gpt-4o, Enabled: false', NULL, NULL, NULL, '2026-03-21 20:49:37.499433+00');
INSERT INTO public.audit_logs VALUES ('af187d71-3897-496f-a4f4-e65bc06df7cd', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-21 20:52:37.368016+00');
INSERT INTO public.audit_logs VALUES ('9e38c3a0-d26a-4790-9c54-70216abc3645', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'admin@niytri.com', 'AI Config Updated', 'Provider: openai, Model: gpt-4o, Enabled: false', NULL, NULL, NULL, '2026-03-21 20:53:15.416251+00');
INSERT INTO public.audit_logs VALUES ('dd189bbb-3085-4726-83e2-6fe90a9d5b44', 'ai_chat', '2ee3b79a-e56f-4ec4-bdc2-891c27a98200', NULL, 'Bhushan Niytri', 'AI Chat', 'Retail Broking MTD summary', NULL, NULL, NULL, '2026-03-21 21:00:11.996571+00');
INSERT INTO public.audit_logs VALUES ('aa844529-fa82-4a43-97c1-a5b2f9078503', 'ai_chat', '4755554b-9a76-4027-a069-7efcf28db646', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-21 21:00:18.85464+00');
INSERT INTO public.audit_logs VALUES ('fd770284-d1bc-4ec7-8547-3b8320478948', 'ai_chat', 'c79a8a55-1b0e-4026-ad52-2f5a3c679a59', NULL, 'Bhushan Niytri', 'AI Chat', 'how many users are there', NULL, NULL, NULL, '2026-03-21 21:00:36.525624+00');
INSERT INTO public.audit_logs VALUES ('db32e312-39a0-45d4-a384-374b57a5a48c', 'ai_chat', 'd34bbbd6-cc57-4aee-8296-b7e491b4ec2d', NULL, 'Test', 'AI Chat', 'hello', NULL, NULL, NULL, '2026-03-21 21:00:36.806593+00');
INSERT INTO public.audit_logs VALUES ('40a9d26e-cf38-4697-a4b6-ba6e5431ad47', 'ai_chat', '8915e386-a1f0-49b8-a821-6946910a7469', NULL, 'Bhushan Niytri', 'AI Chat', 'what can you answer', NULL, NULL, NULL, '2026-03-21 21:00:56.254714+00');
INSERT INTO public.audit_logs VALUES ('be64e92f-534d-42a3-9bbd-8b37f81cdf45', 'ai_chat', 'cdd72f6f-1f94-4d6b-92b9-2d7fa4e00e3e', NULL, 'Bhushan Niytri', 'AI Chat', 'show any 1 for Details on clients within your accessible verticals', NULL, NULL, NULL, '2026-03-21 21:01:13.241047+00');
INSERT INTO public.audit_logs VALUES ('80745c78-cb54-4135-9a7f-6e4e6ff55715', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: undefined, Model: undefined, Enabled: undefined', NULL, NULL, NULL, '2026-03-21 21:03:16.800022+00');
INSERT INTO public.audit_logs VALUES ('b673ec45-bce6-44cf-a4d0-e952e344027c', 'ai_chat', '1c9ca39c-e02a-49d3-acde-34bdf10890c0', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-21 21:03:35.470724+00');
INSERT INTO public.audit_logs VALUES ('ec81a196-15a9-4cce-abd2-43b1290290bb', 'ai_chat', '356ef7cd-8eae-4479-a708-066454bfaee5', NULL, 'Bhushan Niytri', 'AI Chat', 'show me SLA details', NULL, NULL, NULL, '2026-03-21 21:03:45.727691+00');
INSERT INTO public.audit_logs VALUES ('f81b15c0-93e1-4f45-ab32-4d7097dbff6e', 'ai_chat', 'aa5383f1-8d24-48fe-afca-81eb79f31c80', NULL, 'Test User', 'AI Chat', 'show me client list', NULL, NULL, NULL, '2026-03-21 21:04:46.077502+00');
INSERT INTO public.audit_logs VALUES ('8775ea55-9918-4b78-98ed-31301d2dc229', 'ai_chat', 'b0d5ebf4-c927-4a5d-a66b-7aaa5dd2e480', NULL, 'Test', 'AI Chat', 'hello', NULL, NULL, NULL, '2026-03-21 21:05:29.363724+00');
INSERT INTO public.audit_logs VALUES ('234fe206-13b5-48fc-a4a8-110ec1fb86aa', 'ai_chat', 'd0675b53-3138-4e30-b270-1e1cd4005563', NULL, 'Test User', 'AI Chat', 'Show me all clients with pending KYC', NULL, NULL, NULL, '2026-03-21 21:08:44.274821+00');
INSERT INTO public.audit_logs VALUES ('5f9c5a14-43c5-4a2e-abac-da7545bdd1b5', 'ai_chat', '7b38d0ac-c0a6-4cbb-835c-25ac7c997a4c', NULL, 'Rahul Verma', 'AI Chat', 'Show me all service requests with SLA breaches', NULL, NULL, NULL, '2026-03-21 21:08:52.025686+00');
INSERT INTO public.audit_logs VALUES ('c92e3946-e20a-4fc2-b77f-5cca8964a5b2', 'ai_chat', 'e5767260-b8e7-44ca-a480-287924abe2a3', NULL, 'Rahul Verma', 'AI Chat', 'Show me all service requests with SLA breaches', NULL, NULL, NULL, '2026-03-21 21:08:56.166371+00');
INSERT INTO public.audit_logs VALUES ('e4eb6211-a7bb-4257-aa95-00183cbad5fe', 'ai_chat', '3e484df8-5c7c-42c3-9d5f-568f76185551', NULL, 'Bhushan Niytri', 'AI Chat', 'Which clients have KYC pending and which SRs are SLA breached?', NULL, NULL, NULL, '2026-03-21 21:09:29.893347+00');
INSERT INTO public.audit_logs VALUES ('7953ed55-9f58-440e-9901-67f4b79a6d3e', 'ai_chat', '0e583fc9-d332-4dc0-9870-340a226068ab', NULL, 'Bhushan Niytri', 'AI Chat', 'AIF AUM and investor count', NULL, NULL, NULL, '2026-03-21 21:12:35.479077+00');
INSERT INTO public.audit_logs VALUES ('b1cd0d28-f7b8-4f13-a110-869ee1a6947d', 'ai_chat', 'aa982132-e0a8-40de-9a58-3c6dee0749d2', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-21 21:12:40.078101+00');
INSERT INTO public.audit_logs VALUES ('a8d6e017-d054-4e2e-8522-b6ff26d54444', 'ai_chat', '3277f5ad-1655-4b6f-8256-45add1ca8b8b', NULL, 'Bhushan Niytri', 'AI Chat', 'when was ths created', NULL, NULL, NULL, '2026-03-21 21:13:11.23738+00');
INSERT INTO public.audit_logs VALUES ('60d2695a-7f79-41b6-b01d-dd3cc3e108ca', 'ai_chat', '0f854bdb-e604-4570-a1d0-3f1f5472088d', NULL, 'Bhushan Niytri', 'AI Chat', 'KYC expiry alerts', NULL, NULL, NULL, '2026-03-21 21:13:20.733363+00');
INSERT INTO public.audit_logs VALUES ('4fe5e445-e00e-4dbb-a402-355d818a0c46', 'ai_chat', '6cc05d53-33f7-464c-a737-4eb6bd64a9a6', NULL, 'Bhushan Niytri', 'AI Chat', 'Top deals by value', NULL, NULL, NULL, '2026-03-21 21:13:24.18741+00');
INSERT INTO public.audit_logs VALUES ('ab03191a-b1c2-49c4-adfd-7d03b6518b50', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-21 21:15:20.661263+00');
INSERT INTO public.audit_logs VALUES ('5be7daae-5c58-473b-a269-2918a0c105ac', 'ai_chat', 'a6679add-137e-4002-911e-c8794f367ed2', NULL, 'Bhushan Niytri', 'AI Chat', 'Retail Broking MTD summary', NULL, NULL, NULL, '2026-03-21 21:16:14.094662+00');
INSERT INTO public.audit_logs VALUES ('6949fde1-40c9-4219-9669-0096f69c7db8', 'ai_chat', 'd6d3de26-fc3c-45c0-92b4-df730f22f145', NULL, 'Bhushan Niytri', 'AI Chat', 'Top deals by value', NULL, NULL, NULL, '2026-03-21 21:16:40.065834+00');
INSERT INTO public.audit_logs VALUES ('93387433-b0f5-4ea5-99e4-e63cf1ac3990', 'ai_chat', '46b7ac7c-a367-44f5-ba43-2795fabd19dd', NULL, 'Bhushan Niytri', 'AI Chat', 'AIF AUM and investor count', NULL, NULL, NULL, '2026-03-21 21:16:52.231973+00');
INSERT INTO public.audit_logs VALUES ('3d6323c6-95bc-4248-92c2-39312fb093db', 'ai_chat', '2262913b-e6cd-4a27-a128-1c58d4f8e57e', NULL, 'Bhushan Niytri', 'AI Chat', 'Top deals by value', NULL, NULL, NULL, '2026-03-21 21:19:46.307019+00');
INSERT INTO public.audit_logs VALUES ('1481cf6e-c93d-4b1b-8ff0-0200ac619261', 'ai_chat', '7b7d4a4c-c76a-419e-bb9b-8a67b5f3cad6', NULL, 'Bhushan Niytri', 'AI Chat', 'Top deals by value', NULL, NULL, NULL, '2026-03-21 21:19:51.863767+00');
INSERT INTO public.audit_logs VALUES ('098a649a-5c44-4ab9-bf9b-266d779deb53', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-21 21:21:51.481264+00');
INSERT INTO public.audit_logs VALUES ('22236816-66db-428b-9332-1af4a39ff17f', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-21 21:23:38.978616+00');
INSERT INTO public.audit_logs VALUES ('49f58095-3004-442e-9ffa-e6bba25f342d', 'ai_chat', 'ec68db25-3446-4b97-8728-5dc4bbddc351', NULL, 'Bhushan Niytri', 'AI Chat', 'Top deals by value', NULL, NULL, NULL, '2026-03-21 21:24:41.062079+00');
INSERT INTO public.audit_logs VALUES ('829adb55-ac0d-4279-9dc4-e7e632d29096', 'ai_chat', 'f4742b63-2006-45ab-a3d8-c4c8a26f6485', NULL, 'Bhushan Niytri', 'AI Chat', 'AIF AUM and investor count', NULL, NULL, NULL, '2026-03-21 21:24:52.586704+00');
INSERT INTO public.audit_logs VALUES ('5a919f75-20c9-46e6-a7b6-843009ec3bb4', 'ai_chat', '85e54f81-334c-45e6-8e00-2c16d1adf409', NULL, 'Bhushan Niytri', 'AI Chat', 'Retail Broking MTD summary', NULL, NULL, NULL, '2026-03-21 21:24:57.80083+00');
INSERT INTO public.audit_logs VALUES ('55adb84a-f9ac-45a7-b9d0-d38d2f64626d', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-21 21:29:11.758913+00');
INSERT INTO public.audit_logs VALUES ('38119e96-9405-4d5b-b469-6d69756b2fdf', 'ai_chat', '991861a0-b72e-4bc8-98c4-df7608f9e80b', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-21 21:30:12.397637+00');
INSERT INTO public.audit_logs VALUES ('ed9723ec-b27b-4645-9153-18d9ccccac48', 'ai_chat', 'df96d670-e51c-4b23-82d7-8e9b0ed52fb4', NULL, 'Bhushan Niytri', 'AI Chat', 'only one?', NULL, NULL, NULL, '2026-03-21 21:30:26.322205+00');
INSERT INTO public.audit_logs VALUES ('d2d9daa0-6c6c-4d6e-8996-0af5898e78fd', 'ai_chat', '9c5d8a00-451d-4eda-88d8-e1a71f2e6c7f', NULL, 'Bhushan Niytri', 'AI Chat', 'only 3?', NULL, NULL, NULL, '2026-03-21 21:30:43.589252+00');
INSERT INTO public.audit_logs VALUES ('bac874c9-a28b-42c4-b2b1-4c5b3bdbde8b', 'ai_chat', 'cabb5cd6-3951-4268-9ee4-c7b82a3e0794', NULL, 'Bhushan Niytri', 'AI Chat', 'please show created time as well', NULL, NULL, NULL, '2026-03-21 21:30:58.216245+00');
INSERT INTO public.audit_logs VALUES ('6eb3b979-97ea-4139-b53a-30493443c3f2', 'ai_chat', '475fe3cb-aaa0-4d3e-87ff-eb65ac68bebf', NULL, 'Bhushan Niytri', 'AI Chat', 'Top deals by value', NULL, NULL, NULL, '2026-03-21 21:31:10.860645+00');
INSERT INTO public.audit_logs VALUES ('bd95d048-6bd4-4a05-bf71-646fe0b76fcc', 'service_request', 'ffe44c79-bbf9-4be8-9b0e-22d2199d8fb5', NULL, 'System', 'SR Created', 'Via Phone channel. SR code: SR-5855. SLA deadline: 2026-03-22T01:37:47.399Z', NULL, NULL, NULL, '2026-03-21 21:37:47.431127+00');
INSERT INTO public.audit_logs VALUES ('6e46dfe8-1718-4e75-91cd-03d528c8f10a', 'service_request', 'dc5fa787-372d-43fc-b588-916e99364944', NULL, 'Bhushan Niytri', 'Status Changed', '', '{"status": "In Progress"}', '{"status": "Resolved"}', NULL, '2026-03-21 21:39:17.847341+00');
INSERT INTO public.audit_logs VALUES ('069d6290-36e1-4683-a083-a824e3371272', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-21 21:40:59.303144+00');
INSERT INTO public.audit_logs VALUES ('6d465720-a8f7-422b-a021-afb5687ef998', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-22 03:47:37.73242+00');
INSERT INTO public.audit_logs VALUES ('503b3878-70bd-4950-a3a9-6f40caa60f35', 'ai_chat', '57d2ca42-57e2-4bd8-8037-bc1df5b99f4e', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-22 03:52:54.646338+00');
INSERT INTO public.audit_logs VALUES ('25c15dd1-5ac4-4441-b051-ed0babb34c1b', 'ai_chat', '652af0bf-1b72-4bc9-91cd-70db78d6883d', NULL, 'Bhushan Niytri', 'AI Chat', 'Sho me all, only sr number', NULL, NULL, NULL, '2026-03-22 03:53:14.191883+00');
INSERT INTO public.audit_logs VALUES ('3de3ce98-e66a-47c7-9e84-afd0c80b2ff4', 'ai_chat', 'c501af63-fd2b-41be-a7a7-4aad699f68cb', NULL, 'Bhushan Niytri', 'AI Chat', 'And client name too', NULL, NULL, NULL, '2026-03-22 03:53:26.705591+00');
INSERT INTO public.audit_logs VALUES ('303da92c-6e3d-4209-87e7-550b84237899', 'ai_chat', '57c9b489-11ee-4c46-aa73-4c8d9c181129', NULL, 'Bhushan Niytri', 'AI Chat', 'They must be having client or customer name', NULL, NULL, NULL, '2026-03-22 03:53:54.055875+00');
INSERT INTO public.audit_logs VALUES ('6fed2e45-9ffb-4483-8746-43a54319fffd', 'ai_chat', '4ef43687-4a49-4857-ad90-21722069825f', NULL, 'Bhushan Niytri', 'AI Chat', 'What are the fields available ', NULL, NULL, NULL, '2026-03-22 03:54:46.737567+00');
INSERT INTO public.audit_logs VALUES ('14c850a7-ba60-4892-9e6c-a2a4164f4029', 'ai_chat', '46cf8d88-6720-4e76-a0dd-091d0af42180', NULL, 'Bhushan Niytri', 'AI Chat', 'Client code is there', NULL, NULL, NULL, '2026-03-22 03:55:01.861606+00');
INSERT INTO public.audit_logs VALUES ('cd3adb96-4f01-44d4-b4f7-0b63690ae988', 'ai_chat', '99f37066-f569-4e72-9e47-5543d1d4fdfd', NULL, 'Bhushan Niytri', 'AI Chat', 'Please show me sr number and client code', NULL, NULL, NULL, '2026-03-22 03:55:32.373768+00');
INSERT INTO public.audit_logs VALUES ('43dc635d-fabf-44e9-b658-2a41f7de3b1c', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-22 03:55:54.627732+00');
INSERT INTO public.audit_logs VALUES ('7e5ffe14-fd98-4c8e-ad0a-26f8c9deeeee', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-22 03:56:05.545603+00');
INSERT INTO public.audit_logs VALUES ('005e5d07-b488-4469-9b38-fb109d2611ab', 'user', 'aaaa0001-0000-0000-0000-000000000005', NULL, 'Arjun Rao', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 04:13:16.490575+00');
INSERT INTO public.audit_logs VALUES ('85f47772-f86e-4d01-8c14-359c94500d36', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-22 04:16:15.600085+00');
INSERT INTO public.audit_logs VALUES ('b41c07c6-1191-4f13-b037-836f57af21b2', 'ai_chat', '5017b27c-e337-412c-a865-5b6342f27db6', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-22 04:19:15.905124+00');
INSERT INTO public.audit_logs VALUES ('6e29e09b-9e8a-4a4e-a8ec-c532ef9775c1', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: undefined, Model: undefined, Enabled: undefined', NULL, NULL, NULL, '2026-03-22 04:26:04.802845+00');
INSERT INTO public.audit_logs VALUES ('c5bdfe30-bd90-4cef-889a-c78c56127405', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-22 04:29:42.984203+00');
INSERT INTO public.audit_logs VALUES ('2c947c01-53ff-475f-a4a4-2eede8ebc314', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-22 04:30:33.554788+00');
INSERT INTO public.audit_logs VALUES ('bc30f04f-a619-4781-903a-9e7507c2d198', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-22 04:30:53.120734+00');
INSERT INTO public.audit_logs VALUES ('dd77155a-43e9-4fb7-8120-65821080c999', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'Microsoft 365 SSO authenticated via Azure AD.', NULL, NULL, NULL, '2026-03-22 04:33:51.744932+00');
INSERT INTO public.audit_logs VALUES ('84b6238a-bbbe-4953-9ffa-732bbac9e31c', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'test@niytri.com', 'AI Config Updated', 'Provider: undefined, Model: undefined, Enabled: false, Tables: ["clients","leads","deals"], StrictVertical: false', NULL, NULL, NULL, '2026-03-22 04:40:53.307275+00');
INSERT INTO public.audit_logs VALUES ('2295c44d-3fdb-4df0-b9d1-420cce706f63', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'system@niytri.com', 'AI Config Updated', 'Provider: undefined, Model: undefined, Enabled: undefined, Tables: ["clients","service_requests","leads","deals","users","audit_logs"], StrictVertical: true', NULL, NULL, NULL, '2026-03-22 04:41:16.775849+00');
INSERT INTO public.audit_logs VALUES ('12fe6bc0-41a3-4f5d-8f95-1582e49618f5', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 04:44:44.93397+00');
INSERT INTO public.audit_logs VALUES ('8eb60d7b-cb6e-468b-a8cc-84c167fb1478', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 04:44:51.480023+00');
INSERT INTO public.audit_logs VALUES ('88f51caa-6396-402e-bfee-9432c7ecef7b', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: undefined, Model: undefined, Enabled: undefined, Tables: ["clients","service_requests","leads","deals","users","audit_logs","sla_config","documents"], StrictVertical: true', NULL, NULL, NULL, '2026-03-22 04:45:18.986337+00');
INSERT INTO public.audit_logs VALUES ('805621d8-93fe-494a-a8c2-62aa63d38734', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'admin@niytri.com', 'AI Config Updated', 'Provider: openai, Model: gpt-4o, Enabled: true, Tables: undefined, StrictVertical: undefined', NULL, NULL, NULL, '2026-03-22 04:46:44.31323+00');
INSERT INTO public.audit_logs VALUES ('839cc058-63a0-4cce-b92b-7ea197d9f194', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 04:47:58.042786+00');
INSERT INTO public.audit_logs VALUES ('e3871c6d-db54-4804-933f-be7cd8eddec7', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 04:48:04.018123+00');
INSERT INTO public.audit_logs VALUES ('62b385b8-637f-44af-8666-b4b78d7ad990', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 05:30:01.117466+00');
INSERT INTO public.audit_logs VALUES ('51bb69b6-0f50-45c4-ad20-820ac1258c0a', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 05:30:10.360886+00');
INSERT INTO public.audit_logs VALUES ('de0c85d7-89bb-4272-9897-3638c28d43eb', 'ai_chat', '21f23bed-f7a4-467c-b0d5-1fc419f0c3f3', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-22 05:31:03.347219+00');
INSERT INTO public.audit_logs VALUES ('83ed2017-ec9e-42b7-93b3-156de86bde20', 'user', 'aaaa0001-0000-0000-0000-000000000001', NULL, 'Priya Sharma', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 05:33:29.203372+00');
INSERT INTO public.audit_logs VALUES ('25b8439d-a008-47cb-826f-20b0893d03dc', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 05:34:36.420883+00');
INSERT INTO public.audit_logs VALUES ('18728079-30ac-4bdb-8b57-8458c64a4d80', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 05:34:41.762625+00');
INSERT INTO public.audit_logs VALUES ('52abd29b-3ee3-4a25-85ad-e996ef5b71d2', 'service_request', '32a9e233-b6be-46b7-9a12-16c4a1c990f0', NULL, 'System', 'SR Updated', 'Status: Escalated → Closed', '{"status": "Escalated", "priority": "Critical"}', '{"status": "Closed"}', NULL, '2026-03-22 05:36:30.529421+00');
INSERT INTO public.audit_logs VALUES ('01b9cf85-4fa8-4146-9260-1103160a6761', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 05:38:41.961778+00');
INSERT INTO public.audit_logs VALUES ('18548e5f-998c-4537-b98f-104bf53bc380', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 05:38:47.002314+00');
INSERT INTO public.audit_logs VALUES ('5307ccca-d5e3-48ee-97b6-4d96c6419312', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 05:50:15.677046+00');
INSERT INTO public.audit_logs VALUES ('456a5a61-f8b5-49b8-874b-26cc75789d41', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 05:50:21.384292+00');
INSERT INTO public.audit_logs VALUES ('032691bb-72d7-439f-9f73-9e99033d217c', 'user', 'aaaa0001-0000-0000-0000-000000000001', NULL, 'Priya Sharma', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 05:54:47.76029+00');
INSERT INTO public.audit_logs VALUES ('0f090fd2-ac81-47ea-9fc0-09c0abeecfbf', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 05:55:19.821415+00');
INSERT INTO public.audit_logs VALUES ('cfcd65aa-aee5-4ed1-905e-e069c2ada7a8', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 05:55:33.0603+00');
INSERT INTO public.audit_logs VALUES ('3ab20d98-0f3d-4569-80c6-135d5c90e957', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:00:54.275606+00');
INSERT INTO public.audit_logs VALUES ('65047e59-bb7a-4bbe-ac1d-2a6086ea8a40', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:01:05.702119+00');
INSERT INTO public.audit_logs VALUES ('7be6b865-20f8-49e2-b451-72af7d638f87', 'ai_chat', '6083284a-eb3e-4f6b-a7e6-29d4b02536ff', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-22 06:03:29.158305+00');
INSERT INTO public.audit_logs VALUES ('81b88102-bb52-4ed1-ab1c-3564c18200d0', 'ai_chat', '7b92dd8c-015a-454e-a5bf-51a2912c6a74', NULL, 'Bhushan Niytri', 'AI Chat', 'what are users available with admin access', NULL, NULL, NULL, '2026-03-22 06:06:10.620664+00');
INSERT INTO public.audit_logs VALUES ('30503625-541a-49d4-a18a-a026f748b8a0', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:06:30.683264+00');
INSERT INTO public.audit_logs VALUES ('40ede80c-a1f5-434b-931c-ee25c724a1d9', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:07:19.687051+00');
INSERT INTO public.audit_logs VALUES ('9bc68f37-f15a-4823-a1a4-b2e825d1a863', 'ai_chat', '65e98d4c-dc84-40a5-b9dc-90e02f8dae7c', NULL, 'Bhushan Niytri', 'AI Chat', 'Retail Broking MTD summary', NULL, NULL, NULL, '2026-03-22 06:07:34.606901+00');
INSERT INTO public.audit_logs VALUES ('ae3868b7-9ea1-4505-9b49-88328cbc0106', 'ai_chat', '9152ee5c-44bd-4a26-8c45-f26afea738bc', NULL, 'Bhushan Niytri', 'AI Chat', 'AIF AUM and investor count', NULL, NULL, NULL, '2026-03-22 06:07:58.529173+00');
INSERT INTO public.audit_logs VALUES ('d91a4041-6cfe-4eab-94fb-e46b0f20df17', 'ai_chat', 'c9837938-7537-4e16-9f6a-b8680f22c927', NULL, 'Bhushan Niytri', 'AI Chat', 'Show all SLA breached SRs', NULL, NULL, NULL, '2026-03-22 06:08:14.021358+00');
INSERT INTO public.audit_logs VALUES ('cc4f52a6-3cc8-4ed5-bda1-0cc2a214cb36', 'ai_chat', 'ce6414c9-113d-4db8-9f7a-ede1037368a9', NULL, 'Bhushan Niytri', 'AI Chat', 'Top deals by value', NULL, NULL, NULL, '2026-03-22 06:08:39.628708+00');
INSERT INTO public.audit_logs VALUES ('ff75adef-d164-4dc1-af05-48401b4c08f3', 'ai_chat', '4c2b93fa-e77f-4f85-ba06-73507d5f15e8', NULL, 'Bhushan Niytri', 'AI Chat', 'KYC expiry alerts', NULL, NULL, NULL, '2026-03-22 06:08:53.936048+00');
INSERT INTO public.audit_logs VALUES ('2a567555-1e3a-47d1-a519-4a6cd28eba20', 'ai_chat', 'ba1b8edb-d91c-4671-a892-ca771cf2ac8b', NULL, 'Bhushan Niytri', 'AI Chat', 'show me all users with admin roles', NULL, NULL, NULL, '2026-03-22 06:10:34.933841+00');
INSERT INTO public.audit_logs VALUES ('f655a3f6-7952-476e-b933-7435cc569cc9', 'ai_chat', '0e43542b-a67a-4d8f-8083-b44cfa49d178', NULL, 'Bhushan Niytri', 'AI Chat', 'show me all super admins', NULL, NULL, NULL, '2026-03-22 06:10:54.82078+00');
INSERT INTO public.audit_logs VALUES ('77d34204-03cd-4733-a844-6ecdeeadeebc', 'user', 'aaaa0001-0000-0000-0000-000000000001', NULL, 'Priya Sharma', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:11:37.881995+00');
INSERT INTO public.audit_logs VALUES ('ae5a5123-1c25-40e5-abf8-5c0e51512ad7', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:21:10.205053+00');
INSERT INTO public.audit_logs VALUES ('89a3fb2e-8e84-4912-8b22-1a3b68ef1134', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:21:27.834903+00');
INSERT INTO public.audit_logs VALUES ('273cd929-6c5e-4378-aedd-83a8226113a8', 'user', 'aaaa0001-0000-0000-0000-000000000001', NULL, 'Priya Sharma', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:36:00.619628+00');
INSERT INTO public.audit_logs VALUES ('096aa278-adc4-4ac3-b9e2-c0dbfecc5269', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:36:15.83026+00');
INSERT INTO public.audit_logs VALUES ('85d2ec75-cbda-4653-826f-43d8e830dff7', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:36:26.878245+00');
INSERT INTO public.audit_logs VALUES ('047c9c99-1c5c-48e2-b37a-659d8832ed75', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:37:18.849977+00');
INSERT INTO public.audit_logs VALUES ('86cfdfe1-36e3-48b3-a5bf-318dd14eb6b5', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:37:27.733963+00');
INSERT INTO public.audit_logs VALUES ('e48f241a-5f9c-4250-8807-95fcb86334f3', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:39:17.231619+00');
INSERT INTO public.audit_logs VALUES ('1f425a3f-123e-44cd-bdd7-2ae873fbe702', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:39:26.109219+00');
INSERT INTO public.audit_logs VALUES ('e1096e64-d683-42d8-81d3-5e3ac9c44522', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:41:21.339578+00');
INSERT INTO public.audit_logs VALUES ('4a1ad03e-53f7-417d-9b86-fb7b587c23cd', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:41:29.48911+00');
INSERT INTO public.audit_logs VALUES ('8ca72749-82eb-45d7-a9a8-6debea3fba46', 'user', 'aaaa0001-0000-0000-0000-000000000001', NULL, 'Priya Sharma', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:44:57.141023+00');
INSERT INTO public.audit_logs VALUES ('9df279c4-88d6-4d92-bc5c-8b5f65bcd36e', 'user', 'aaaa0001-0000-0000-0000-000000000001', NULL, 'Priya Sharma', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:45:19.113862+00');
INSERT INTO public.audit_logs VALUES ('b579e383-2314-4d53-a6ed-089a84a90571', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:47:15.788147+00');
INSERT INTO public.audit_logs VALUES ('0f61f421-1968-409f-b577-77d98de6fca3', 'user', 'aaaa0001-0000-0000-0000-000000000001', NULL, 'Priya Sharma', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:47:17.551114+00');
INSERT INTO public.audit_logs VALUES ('6c43a151-c5b7-4b51-94f2-7e3bc894dd62', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:47:23.849133+00');
INSERT INTO public.audit_logs VALUES ('a07222cf-2792-4b1d-b416-f2d7c67d8fdd', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:49:28.988711+00');
INSERT INTO public.audit_logs VALUES ('6c2b6af2-39c7-4d40-89ad-631615862a71', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:49:37.91361+00');
INSERT INTO public.audit_logs VALUES ('1c8fa0d4-ffe2-4ad9-a5e1-a5a68df53fda', 'ai_chat', '7c21c55c-368a-426d-957a-9558680845f8', NULL, 'Bhushan Niytri', 'AI Chat', 'Retail Broking MTD summary', NULL, NULL, NULL, '2026-03-22 06:49:55.708498+00');
INSERT INTO public.audit_logs VALUES ('92a8ca30-f90e-4be6-8706-bff2619fc236', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: undefined, Model: undefined, Enabled: undefined, Tables: ["clients","service_requests","leads","deals","users","audit_logs","sla_config","documents"], StrictVertical: true', NULL, NULL, NULL, '2026-03-22 06:51:17.458877+00');
INSERT INTO public.audit_logs VALUES ('fe9335ad-9c60-4938-afb1-92229bebc453', 'ai_chat', '2fac16ba-b262-4de9-a377-c2d2c8d71731', NULL, 'Bhushan Niytri', 'AI Chat', 'Retail Broking MTD summary', NULL, NULL, NULL, '2026-03-22 06:51:26.878487+00');
INSERT INTO public.audit_logs VALUES ('0b81792c-7e20-4bce-aa41-ca75fe5f44b9', 'ai_chat', 'f12b757d-42d6-4dde-a4b9-2c3ffe8cd670', NULL, 'test', 'AI Chat', 'Show me all clients in Retail Broking vertical', NULL, NULL, NULL, '2026-03-22 06:55:45.757142+00');
INSERT INTO public.audit_logs VALUES ('e4eb5eaf-3dd0-4c3d-9b6d-e0b8ca7d8b8d', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 06:55:50.039541+00');
INSERT INTO public.audit_logs VALUES ('8b4c6da9-5fdf-49c8-b786-249bc5cddbc2', 'ai_chat', '17d168b3-d01f-49c3-8246-295f3fca1b8c', NULL, 'test', 'AI Chat', 'Show me all clients in Retail Broking vertical', NULL, NULL, NULL, '2026-03-22 06:55:51.753424+00');
INSERT INTO public.audit_logs VALUES ('286bb407-ff15-4980-ab05-bcc9161d0613', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 06:56:00.07298+00');
INSERT INTO public.audit_logs VALUES ('233b126a-6579-468c-9ebf-baee45d51b19', 'ai_chat', 'cd28a32a-d41d-4c96-bc38-918818875200', NULL, 'Bhushan Niytri', 'AI Chat', 'show me details about sbi mutual fund, also show contact number', NULL, NULL, NULL, '2026-03-22 06:57:03.494988+00');
INSERT INTO public.audit_logs VALUES ('98a5f590-8231-4550-b7c9-0549425c2a95', 'ai_chat', '909499a4-5fb3-42fa-91a0-2d860b47d4d4', NULL, 'Bhushan Niytri', 'AI Chat', 'what is the issue', NULL, NULL, NULL, '2026-03-22 06:57:18.092978+00');
INSERT INTO public.audit_logs VALUES ('b5320967-276e-41ce-ae81-5557609478fc', 'ai_chat', '1be28013-2b54-4cc1-9053-401b4ae66ed7', NULL, 'Bhushan Niytri', 'AI Chat', 'I am an admin and you may display masked data', NULL, NULL, NULL, '2026-03-22 06:57:38.597484+00');
INSERT INTO public.audit_logs VALUES ('2b42f695-dd5d-4d69-a743-ab19abf670d6', 'ai_chat', '2b0da4b2-2a51-4067-8bbc-0072eaf66de3', NULL, 'test', 'AI Chat', 'Show me all clients in Retail Broking vertical', NULL, NULL, NULL, '2026-03-22 06:57:44.675751+00');
INSERT INTO public.audit_logs VALUES ('391aa028-9100-4e7e-b4c0-1298519344c6', 'ai_chat', '44adcd3a-82c2-4d30-aa48-59ce655d2ca1', NULL, 'test', 'AI Chat', 'How many open service requests are there and what are their priorities?', NULL, NULL, NULL, '2026-03-22 06:57:53.030987+00');
INSERT INTO public.audit_logs VALUES ('b4bd4f3f-a3c6-4765-be25-2760182b7a4c', 'ai_chat', '1f2ed14c-7594-4457-baf1-edd6650b064c', NULL, 'Bhushan Niytri', 'AI Chat', 'can not see any information', NULL, NULL, NULL, '2026-03-22 06:58:07.452054+00');
INSERT INTO public.audit_logs VALUES ('8f90c93f-3889-4a2f-9f17-2d44617ab1b0', 'ai_chat', 'fd4114f5-9649-4492-b04d-b1d142697ade', NULL, 'Bhushan Niytri', 'AI Chat', 'no', NULL, NULL, NULL, '2026-03-22 06:58:18.112326+00');
INSERT INTO public.audit_logs VALUES ('6bb00c3a-cb88-48e5-bde2-0795af52ec77', 'ai_chat', '06492545-2dc9-457f-90af-19fb79701ee2', NULL, 'Bhushan Niytri', 'AI Chat', 'show me latest deals', NULL, NULL, NULL, '2026-03-22 06:58:46.947686+00');
INSERT INTO public.audit_logs VALUES ('60dc3ad9-3b88-4f9c-a2e2-5b9f80fb1f2c', 'ai_chat', 'd24da3d3-67e3-4b34-87b6-f4a233419391', NULL, 'Bhushan Niytri', 'AI Chat', 'in a table format please', NULL, NULL, NULL, '2026-03-22 06:59:02.650143+00');
INSERT INTO public.audit_logs VALUES ('d439d99f-c71c-4ff2-ac20-d9a3614dbb9b', 'ai_chat', '09617df3-693f-4d72-a3bc-d80b92a2061a', NULL, 'Bhushan Niytri', 'AI Chat', 'please include contact number', NULL, NULL, NULL, '2026-03-22 07:00:04.227258+00');
INSERT INTO public.audit_logs VALUES ('69ad117e-e541-4e0d-96f3-f7038106840c', 'ai_chat', 'd7073979-bed3-4c1d-842f-989ca9e3ccad', NULL, 'Bhushan Niytri', 'AI Chat', 'show masked contact', NULL, NULL, NULL, '2026-03-22 07:00:13.971645+00');
INSERT INTO public.audit_logs VALUES ('130be8dd-42be-4e44-9bb5-6a807b5d9000', 'ai_chat', 'd71d3a6a-34fb-4956-a7cf-716d83806bfb', NULL, 'Bhushan Niytri', 'AI Chat', 'noted, how the deals are at future dates', NULL, NULL, NULL, '2026-03-22 07:00:32.284244+00');
INSERT INTO public.audit_logs VALUES ('5e8c613c-da21-4b00-99ce-ae3603d71374', 'ai_chat', '6cb08f99-9569-41be-bcc0-1d3197c40b27', NULL, 'Bhushan Niytri', 'AI Chat', 'yes actual CRM only', NULL, NULL, NULL, '2026-03-22 07:01:02.835633+00');
INSERT INTO public.audit_logs VALUES ('87f7f1dc-5d0f-43a6-a924-ec65d9da8257', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: undefined, Model: undefined, Enabled: undefined, Tables: ["clients","service_requests","leads","deals","users","audit_logs","sla_config","documents"], StrictVertical: true', NULL, NULL, NULL, '2026-03-22 07:03:18.923914+00');
INSERT INTO public.audit_logs VALUES ('b20d89d4-c1d0-4bad-90c1-5739f0d64ce2', 'ai_chat', '97f975f0-938f-4456-871a-240282c1d85b', NULL, 'Bhushan Niytri', 'AI Chat', 'KYC expiry alerts', NULL, NULL, NULL, '2026-03-22 07:03:35.016348+00');
INSERT INTO public.audit_logs VALUES ('835aa07a-ddc7-440a-b4fc-b18838bb1103', 'ai_chat', 'f38e25e2-c5ac-4add-8b8d-5b99640bafb4', NULL, 'Bhushan Niytri', 'AI Chat', 'show me all in table format', NULL, NULL, NULL, '2026-03-22 07:03:49.504342+00');
INSERT INTO public.audit_logs VALUES ('510c6a88-5a36-4d31-afbc-4f5bf9218ed2', 'ai_chat', '6aec3a62-271d-43e0-8e26-179dda24c222', NULL, 'Bhushan Niytri', 'AI Chat', 'which vertical', NULL, NULL, NULL, '2026-03-22 07:04:04.546022+00');
INSERT INTO public.audit_logs VALUES ('1f8220b6-ebdc-47cb-ba33-dccde962f009', 'ai_chat', 'ecc02c49-ab61-4950-b377-609b034a8f33', NULL, 'Bhushan Niytri', 'AI Chat', 'who is the owner of this contact', NULL, NULL, NULL, '2026-03-22 07:04:20.36769+00');
INSERT INTO public.audit_logs VALUES ('91a338b1-8dc2-4a7d-9388-b56e6049d0d8', 'ai_chat', '9d731b0a-9e61-448f-9831-db4217685684', NULL, 'Bhushan Niytri', 'AI Chat', 'contact number please', NULL, NULL, NULL, '2026-03-22 07:04:38.990075+00');
INSERT INTO public.audit_logs VALUES ('94e56875-043e-464a-a0e3-a7c8fd094598', 'ai_config', '8f1b3420-4fff-4aa5-b9a1-ca99bcbb91f2', NULL, 'bhushan@niytri.com', 'AI Config Updated', 'Provider: undefined, Model: undefined, Enabled: undefined, Tables: ["clients","service_requests","leads","deals","users","audit_logs","sla_config","documents"], StrictVertical: true', NULL, NULL, NULL, '2026-03-22 07:05:51.585182+00');
INSERT INTO public.audit_logs VALUES ('0655c9d3-226b-40b3-a4e0-6626c8eb9ca6', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 07:36:13.66808+00');
INSERT INTO public.audit_logs VALUES ('c199da16-5634-44d9-9c12-a3aec3f44c20', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 07:36:22.482342+00');
INSERT INTO public.audit_logs VALUES ('97df1987-9a7a-4ea5-81b8-0b0dabd2a4c6', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 08:07:56.509609+00');
INSERT INTO public.audit_logs VALUES ('e3cacc87-8c33-4ba8-a747-13a002218d2d', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 08:08:05.456128+00');
INSERT INTO public.audit_logs VALUES ('a914c8f3-b412-45e4-8d3a-3a2efcdd6b4c', 'client', '7fe5cecc-40b7-4af1-aa5c-ae27d6468fd0', NULL, 'bhushan@niytri.com', 'Teams Meeting Scheduled', 'Meeting: Meeting with Girish Nair on 22/3/2026 (placeholder)', NULL, NULL, NULL, '2026-03-22 08:09:39.283521+00');
INSERT INTO public.audit_logs VALUES ('9e8fdca7-b60b-459e-9d5e-12c505db1974', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 08:21:09.22401+00');
INSERT INTO public.audit_logs VALUES ('dd4d148b-c466-49e9-a7d4-97f40add2156', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 08:21:17.419971+00');
INSERT INTO public.audit_logs VALUES ('427bf584-3141-4c8d-b6b9-4edf9e00f6ee', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 08:38:04.655578+00');
INSERT INTO public.audit_logs VALUES ('56214690-cfba-4889-9a21-5eaa8be8ba19', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 08:38:14.660877+00');
INSERT INTO public.audit_logs VALUES ('daa6e8de-0372-48f6-9900-fbba4e3817ee', 'service_request', '8d9def6e-504d-4c43-8606-00a378bc3288', NULL, 'System', 'SR Created', 'Via Email channel. SR code: SR-5911. SLA deadline: 2026-03-23T08:41:11.156Z', NULL, NULL, NULL, '2026-03-22 08:41:11.188572+00');
INSERT INTO public.audit_logs VALUES ('d76feeac-e619-4a7f-8d77-2e773954e8b4', 'client', '7fe5cecc-40b7-4af1-aa5c-ae27d6468fd0', NULL, 'bhushan@niytri.com', 'Teams Meeting Scheduled', 'Meeting: Meeting with Girish Nair on 22/3/2026 — invites sent | Attachment: Enterprise_CRM_BRD (1).docx', NULL, NULL, NULL, '2026-03-22 08:43:05.741125+00');
INSERT INTO public.audit_logs VALUES ('263259c8-cba8-442f-b40b-b12ab96294f6', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 08:55:45.792952+00');
INSERT INTO public.audit_logs VALUES ('8d525803-374f-42ed-80cd-9bac09c0749e', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 08:55:53.92005+00');
INSERT INTO public.audit_logs VALUES ('405dffe9-d310-4fba-a6f6-af3b94ec6d16', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'MFA Required', 'M365 SSO success. Email OTP sent for MFA verification.', NULL, NULL, NULL, '2026-03-22 08:58:44.478298+00');
INSERT INTO public.audit_logs VALUES ('5e46de71-2b96-477d-be5e-1d83b86f6f24', 'user', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, 'Bhushan Niytri', 'Login', 'OTP verified. Session started.', NULL, NULL, NULL, '2026-03-22 08:59:03.09049+00');
INSERT INTO public.audit_logs VALUES ('3702fc0e-2223-4a48-9692-7596dd6d48d8', 'ai_chat', 'c0d2ad7d-89b3-4a82-860d-9839ac6eff46', NULL, 'Bhushan Niytri', 'AI Chat', 'how can you help, what all database access you have', NULL, NULL, NULL, '2026-03-22 09:02:51.486487+00');
INSERT INTO public.audit_logs VALUES ('75ed9099-56f7-4432-8b3c-6e7ee4beafb4', 'ai_chat', 'ad4a0772-c1dc-49de-b78d-a4214094fcf1', NULL, 'Bhushan Niytri', 'AI Chat', 'give me summary of everything', NULL, NULL, NULL, '2026-03-22 09:03:22.947228+00');
INSERT INTO public.audit_logs VALUES ('1b0cdd01-d8b7-4421-ba33-4a5e30e9fefb', 'ai_chat', 'b5c29194-6a36-4648-b9fb-c1c6901f3f07', NULL, 'Bhushan Niytri', 'AI Chat', 'more details please, share few good analysis', NULL, NULL, NULL, '2026-03-22 09:03:45.370289+00');
INSERT INTO public.audit_logs VALUES ('bcd34431-791b-43fd-ab6f-2d3d105c537d', 'ai_chat', '295ff473-f476-4955-91f5-4dd3d0215d8b', NULL, 'Bhushan Niytri', 'AI Chat', 'who is the bad performer in terms of service requests and why you think so', NULL, NULL, NULL, '2026-03-22 09:04:24.574472+00');
INSERT INTO public.audit_logs VALUES ('91548cbf-73a3-4fb7-82e1-58802601a2db', 'ai_chat', 'fedda5be-ec23-4345-9cbf-1351a1cb5597', NULL, 'Bhushan Niytri', 'AI Chat', 'who is that guy', NULL, NULL, NULL, '2026-03-22 09:05:07.752701+00');
INSERT INTO public.audit_logs VALUES ('71de9a06-93c5-4486-a968-dd6a10dd93bc', 'ai_chat', 'f8a4829e-f430-4716-a6d2-edfd373b58e2', NULL, 'Bhushan Niytri', 'AI Chat', 'who is the good guy and bad guy give me both name', NULL, NULL, NULL, '2026-03-22 09:05:40.910513+00');
INSERT INTO public.clients VALUES ('e5d68f57-e44e-43e3-b5dc-90731333a93a', 'NIT-RB-001', 'Rajesh Kumar Sharma', 'Individual', 'Retail Broking', 'ABCDE1234F', '9876543210', 'rajesh.sharma@gmail.com', NULL, NULL, NULL, NULL, 'Active', 'Verified', 'Moderate', 'Compliant', '1201800000123456', NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('13a515e7-f87a-40d6-a103-aef8342f97ef', 'NIT-RB-002', 'Priya Mehta', 'Individual', 'Retail Broking', 'FGHIJ5678K', '9123456780', 'priya.mehta@gmail.com', NULL, NULL, NULL, NULL, 'Active', 'Verified', 'High', 'Compliant', '1201800000234567', NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('8e358b1b-b5ac-4174-aebc-0651ac08dd3f', 'NIT-CB-001', 'Tata Technologies Ltd', 'Non-Individual', 'Corporate Broking', 'TTATL1234C', '02222334455', 'trading@tatatechnologies.com', NULL, NULL, NULL, NULL, 'Active', 'Verified', 'Low', 'Compliant', '1201800000345678', NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('926aa45f-294b-4b4d-84d9-1e91399443ff', 'NIT-IB-001', 'Greenfield Infrastructure Pvt Ltd', 'Non-Individual', 'Investment Banking', 'GFIP1234G', '02244556677', 'cfo@greenfield.in', NULL, NULL, NULL, NULL, 'Active', 'Verified', 'Moderate', 'Compliant', NULL, NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('31a0d2e1-4da0-4f4d-8122-3d7327ecddcf', 'NIT-AIF-001', 'Horizon Family Office', 'Non-Individual', 'AIF', 'HFOP1234H', '9000001111', 'investments@horizonfo.com', NULL, NULL, NULL, NULL, 'Active', 'Verified', 'High', 'Compliant', '1201800000456789', NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('21a69019-7642-4c91-bba9-ec97980a6a1e', 'NIT-AIF-002', 'Bharat Growth Fund', 'Non-Individual', 'AIF', 'BGFP2345B', '02233445566', 'admin@bharatgrowth.com', NULL, NULL, NULL, NULL, 'Active', 'Pending', 'Moderate', 'Pending', NULL, NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('b64d924f-7daf-47b4-b18e-89d95da65a28', 'NIT-IE-001', 'Nippon Life Insurance Asset Mgmt', 'Non-Individual', 'Institutional Equities', 'NLAM5678N', '02255667788', 'desk@nliamf.com', NULL, NULL, NULL, NULL, 'Active', 'Verified', 'Low', 'Compliant', '1201800000567890', NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('49b7c5ce-b0fe-452a-8e26-45501f1c2e31', 'NIT-RB-003', 'Anita Desai', 'Individual', 'Retail Broking', 'LMNOP9012L', '8800001234', 'anita.desai@yahoo.com', NULL, NULL, NULL, NULL, 'Active', 'Pending', 'Low', 'Pending', '1201800000678901', NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('f736d318-ebab-4649-8ba9-86abd82a4d01', 'NIT-CB-002', 'Mahindra Finance Ltd', 'Non-Individual', 'Corporate Broking', 'MFLP3456M', '02266778899', 'treasury@mahindrafinance.com', NULL, NULL, NULL, NULL, 'Active', 'Verified', 'Moderate', 'Compliant', '1201800000789012', NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('7b80f063-d923-4102-9db5-11038f6ebbc6', 'NIT-IB-002', 'SolarEdge Power Pvt Ltd', 'Non-Individual', 'Investment Banking', 'SEPP4567S', '08044556677', 'ipo@solaredge.in', NULL, NULL, NULL, NULL, 'Dormant', 'Pending', 'High', 'Pending', NULL, NULL, NULL, '2026-03-21 21:07:06.162933+00', '2026-03-21 21:07:06.162933+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('02960a68-f838-4c70-a20e-f162d6587fd3', 'NIYT-I-001001', 'Ramesh Kumar Agarwal', 'Individual', 'UHNI', 'AAAPR1234C', '9876543210', 'ramesh.agarwal@gmail.com', '23 Pedder Road, Mumbai 400026', '1965-08-15', NULL, 'aaaa0001-0000-0000-0000-000000000001', 'Active', 'Verified', 'High', 'Compliant', '1201800012345678', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('ffb2315f-da3c-4ead-8412-8d3da1622edb', 'NIYT-I-001002', 'Sunita Mehta', 'Individual', 'HNI', 'BBBPS5678D', '9123456789', 'sunita.m@gmail.com', '14 Golf Links, New Delhi 110003', '1978-02-22', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Verified', 'Moderate', 'Compliant', '1302340023456789', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('34b07185-5b74-483f-a3e1-6a3a195b62f9', 'NIYT-I-001003', 'Dr. Venkat Krishnan', 'Individual', 'UHNI', 'CCCPK9012E', '9988765432', 'dr.venkat@email.com', '8 Boat Club Road, Chennai 600028', '1960-03-03', NULL, 'aaaa0001-0000-0000-0000-000000000006', 'Active', 'Verified', 'Ultra-High', 'Compliant', '1401230034567890', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('97b65aff-ca7c-4e9b-b9ac-6b499947d83e', 'NIYT-I-001004', 'Ajay Choudhary', 'Individual', 'Mass Affluent', 'DDDPJ2345F', '8765432109', 'ajay.c@email.com', 'Plot 5, Aundh, Pune 411007', '1985-07-10', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Verified', 'Moderate', 'Compliant', '1205650045678901', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('c404cf93-5608-4947-b2bd-562057db12f9', 'NIYT-I-001005', 'Pradeep Kumar Jain', 'Individual', 'Mass Affluent', 'EEEPL6789G', '7654321098', 'pradeep.k@gmail.com', '22 Sector 14, Faridabad 121007', '1990-09-28', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Pending', 'Low', 'Pending', '1204720056789012', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('7fe5cecc-40b7-4af1-aa5c-ae27d6468fd0', 'NIYT-I-001006', 'Girish Nair', 'Individual', 'Retail', 'FFFPN3456H', '6543210987', 'girish.n@email.com', '7 MG Road, Kochi 682016', '1992-12-05', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Verified', 'Low', 'Compliant', '1302340067890123', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('6f55e12a-b270-4adb-a940-86b44d10695b', 'NIYT-I-001007', 'Asha Mehta', 'Individual', 'HNI', 'RRRPA8901T', '9012345678', 'asha.m@email.com', '19 Napean Sea Road, Mumbai 400006', '1975-01-14', NULL, 'aaaa0001-0000-0000-0000-000000000001', 'Active', 'Verified', 'Moderate', 'Compliant', '1302340089012345', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('44b5a32c-3922-4fb7-88ab-049dd99591c6', 'NIYT-I-001008', 'Kavita Singh', 'Individual', 'Retail', 'SSSPS9012U', '8901234567', 'kavita.s@gmail.com', 'Flat 4B, Civil Lines, Kanpur 208001', '1988-06-20', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Dormant', 'Expired', 'Low', 'Pending', '1204720090123456', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('d1accb26-e8cb-4ceb-9cd6-d74649ce3fdc', 'NIYT-I-001009', 'Suresh Rathi', 'Individual', 'Mass Affluent', 'TUUPR5678A', '9500012345', 'suresh.rathi@gmail.com', '12 Satellite Road, Ahmedabad 380015', '1980-04-11', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Verified', 'Moderate', 'Compliant', '1201800000111222', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'NIYT-I-001010', 'Neeta Desai', 'Individual', 'Retail', 'UVVPS6789B', '9400023456', 'neeta.desai@gmail.com', '3 Residency Road, Bangalore 560025', '1993-08-22', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Pending', 'Low', 'Pending', '1302340000112233', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('685937f0-3e0b-49c1-9be9-a8eba03fb3b3', 'NIYT-I-001011', 'Ravi Pillai', 'Individual', 'Mass Affluent', 'VWWPL7890C', '9300034567', 'ravi.pillai@email.com', 'Flat 12, Sea Queen Apts, Kochi 682001', '1982-02-28', NULL, 'aaaa0001-0000-0000-0000-000000000001', 'Active', 'Verified', 'Moderate', 'Compliant', '1205650000223344', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'NIYT-I-001012', 'Shalini Rao', 'Individual', 'HNI', 'WXXPL8901D', '9200045678', 'shalini.rao@email.com', '22 Race Course Rd, Coimbatore 641018', '1977-11-15', NULL, 'aaaa0001-0000-0000-0000-000000000001', 'Active', 'Verified', 'High', 'Compliant', '1401230000334455', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('67c900b4-eefd-4bbd-84c0-6b4950fc5287', 'NIYT-I-001013', 'Mohit Sharma', 'Individual', 'Mass Affluent', 'XYYPM9012E', '9100056789', 'mohit.sharma@gmail.com', '15 New Area, Lucknow 226001', '1987-06-30', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Pending', 'Moderate', 'Pending', '1204720000445566', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('40b03ab0-3316-417b-8cce-684f8e11ebb4', 'NIYT-I-001014', 'Pooja Iyer', 'Individual', 'Retail', 'YZZPI0123F', '9000067890', 'pooja.iyer@gmail.com', '9 T Nagar, Chennai 600017', '1995-03-17', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Verified', 'Low', 'Compliant', '1302340000556677', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('6d5c0cf2-033d-4744-ac55-6724ba8c3ada', 'NIYT-I-001015', 'Rajan Pillai', 'Individual', 'HNI', 'ZAABP1234G', '8900078901', 'rajan.pillai@email.com', 'Sea Shore Bungalow, Varkala, Kerala 695141', '1973-09-05', NULL, 'aaaa0001-0000-0000-0000-000000000001', 'Active', 'Verified', 'High', 'Compliant', '1201800000667788', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('b9d07fca-77a2-42cd-bcb8-ef5ff124b829', 'NIYT-C-002001', 'Bajaj Holdings Ltd', 'Non-Individual', 'Corporate', 'GGGPB7890I', '2244445555', 'treasury@bajaj.com', 'Bajaj Auto Complex, Akurdi, Pune 411035', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000003', 'Active', 'Verified', 'High', 'Compliant', '1201070012345001', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('c96cd467-53b3-4d2a-80de-bf9cd0fa743a', 'NIYT-C-002002', 'Adani Enterprises Ltd', 'Non-Individual', 'Corporate', 'HHHPA8901J', '7925556666', 'equity@adani.com', 'Adani Corporate House, Shantigram, Ahmedabad 382421', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000004', 'Active', 'Verified', 'High', 'Compliant', '1203070023456002', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('7473fd33-2dfd-4246-8945-cfee0701df78', 'NIYT-C-002003', 'JSW Steel Ltd', 'Non-Individual', 'Corporate', 'IIIPJ9012K', '2242861000', 'treasury@jsw.com', 'JSW Centre, Bandra Kurla Complex, Mumbai 400051', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000003', 'Active', 'Verified', 'Moderate', 'Compliant', '1204230034567003', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('5e94cbb3-d7ac-488c-84fb-418c87258579', 'NIYT-C-002004', 'Reliance Industries Ltd', 'Non-Individual', 'Strategic', 'JJJPR0123L', '2244770000', 'investor.rel@ril.com', 'Maker Chambers IV, Nariman Point, Mumbai 400021', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000005', 'Active', 'Verified', 'High', 'Compliant', NULL, NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('e1aaf267-33c3-4a46-9680-74b361ebedc5', 'NIYT-C-002005', 'Tata Sons Pvt Ltd', 'Non-Individual', 'Strategic', 'KKKPT1234M', '2266658282', 'bd@tata.com', 'Bombay House, 24 Homi Mody Street, Mumbai 400001', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000005', 'Active', 'Verified', 'Moderate', 'Compliant', NULL, NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'NIYT-C-002006', 'Maharashtra State Pension Fund', 'Non-Individual', 'Institutional', 'TTTPM0123V', '2222889900', 'equity@mpf.gov.in', 'Pension Fund House, Nariman Point, Mumbai 400021', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000005', 'Active', 'Verified', 'Low', 'N/A', '1201070034567004', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('a01d1843-1b34-4f9a-8775-214be2239a15', 'NIYT-C-002007', 'HDFC Life Insurance', 'Non-Individual', 'Corporate', 'HHHPL1122H', '2243581234', 'equity@hdfclife.com', 'Lodha Excelus, Apollo Mills, NM Joshi Marg, Mumbai 400011', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'Moderate', 'Compliant', '1201070045678005', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('7d2f6783-f5f0-45e9-bb15-34e503794961', 'NIYT-C-002008', 'ICICI Securities Ltd', 'Non-Individual', 'Corporate', 'IIIPS2233I', '2226106099', 'trading@icicisecurities.com', 'ICICI Centre, Hiranandani, Mumbai 400076', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000004', 'Active', 'Verified', 'Moderate', 'Compliant', '1201070056789006', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('92e65ba6-08d9-45a5-9d1d-2e3889ec82ca', 'NIYT-C-002009', 'Hero MotoCorp Ltd', 'Non-Individual', 'Corporate', 'HHHPM3344J', '1144714444', 'treasury@heromotocorp.com', '34 Community Centre, Basant Lok, Vasant Vihar, New Delhi 110057', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000003', 'Active', 'Verified', 'Moderate', 'Compliant', '1203070067890007', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('09623c83-c60b-4f87-82bb-93814a760928', 'NIYT-C-002010', 'L&T Finance Ltd', 'Non-Individual', 'Corporate', 'LLLPF4455K', '2266315555', 'treasury@ltfinance.com', 'L&T Financial Centre, Bandra Kurla Complex, Mumbai 400051', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000003', 'Active', 'Verified', 'Moderate', 'Compliant', '1204230078901008', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('cfdf7e3d-ab88-4a0d-af9b-de69e9da6f63', 'NIYT-T-003001', 'Patel Enterprises Trust', 'Non-Individual', 'Trust', 'LLLPT2345N', '9801234567', 'kiran@patelgroup.com', 'Patel House, Navrangpura, Ahmedabad 380009', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000006', 'Active', 'Verified', 'Ultra-High', 'Compliant', '1402010045678001', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'NIYT-T-003002', 'Nair Family Office Trust', 'Non-Individual', 'Family Office', 'MMMPN3456O', '9702345678', 'suresh@nairgroup.com', 'Nair Tower, MG Road, Thrissur 680001', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000006', 'Active', 'Verified', 'Ultra-High', 'Compliant', '1402010056789002', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'NIYT-T-003003', 'Birla Family Office', 'Non-Individual', 'Family Office', 'BBBPF5567P', '9601234567', 'office@birlafamily.com', 'Birla House, 9/1 R N Mukherjee Road, Kolkata 700001', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000006', 'Active', 'Verified', 'High', 'Compliant', '1201800000778899', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'NIYT-F-004001', 'Fidelity International', 'Non-Individual', 'FPI', 'NNNPF4567P', '441207831000', 'emma.w@fidelity.com', 'Cannon Place, 78 Cannon Street, London EC4N 6AG', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'High', 'Compliant', '1203230067890001', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('6646a80f-d3ae-48a0-a338-362fce7f1bec', 'NIYT-F-004002', 'GIC Private Limited', 'Non-Individual', 'Sovereign Fund', 'OOOPG5678Q', '6568898888', 'rajan.l@gic.gov.sg', '168 Robinson Road #37-01, Capital Tower, Singapore 068912', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'High', 'Compliant', '1203230078901002', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('db7135a2-bca9-47a5-b080-a1e3860da557', 'NIYT-F-004003', 'Norges Bank Investment Mgmt', 'Non-Individual', 'Sovereign Fund', 'NNNPN6789R', '4722316111', 'india@nbim.no', 'Bankplassen 2, Oslo, Norway 0107', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'Low', 'Compliant', '1203230089012003', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('f1a9a070-936b-4b96-9a92-03a6e1b65943', 'NIYT-F-004004', 'Temasek Holdings', 'Non-Individual', 'Sovereign Fund', 'TTTPH7890S', '6563088888', 'india@temasek.com.sg', '60B Orchard Road #06-18, Tower 2, Singapore 238891', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'Moderate', 'Compliant', '1203230090123004', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('a12bff99-1e25-49a8-81fb-756db65655ca', 'NIYT-M-005001', 'UTI Mutual Fund', 'Non-Individual', 'Domestic MF', 'PPPPMU6789R', '2266786678', 'equity@utimf.com', 'UTI Tower, GN Block, BKC, Mumbai 400051', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'Moderate', 'N/A', '1201180012345001', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('b16a5cca-1751-4d64-a113-02e9a3b32033', 'NIYT-M-005002', 'ICICI Prudential MF', 'Non-Individual', 'Domestic MF', 'QQQPI7890S', '2226525000', 'equity@icicipru.com', 'One BKC, 13th Floor, Mumbai 400051', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'Moderate', 'N/A', '1201180023456002', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('e159e454-5dec-466e-bfed-f9adf3fc2532', 'NIYT-M-005003', 'HDFC Asset Management', 'Non-Individual', 'Domestic MF', 'HHHPAM8901T', '2266312254', 'equity@hdfcamc.com', 'HDFC House, 2nd Floor, H T Parekh Marg, Mumbai 400020', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'Moderate', 'N/A', '1201180034567003', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('a26fcba3-a072-48f4-8b04-a3de29ac3753', 'NIYT-I-001016', 'Ananya Krishnan', 'Individual', 'HNI', 'AAAPK2345V', '8800189012', 'ananya.krishnan@gmail.com', '18 Alwarpet, Chennai 600018', '1983-12-01', NULL, 'aaaa0001-0000-0000-0000-000000000001', 'Active', 'Verified', 'High', 'Compliant', '1201800000889900', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('d271e297-fbb8-4d46-ad23-e59f097f0e67', 'NIYT-I-001017', 'Deepa Menon', 'Individual', 'Mass Affluent', 'BBBPM3456W', '8700290123', 'deepa.menon@email.com', 'Flat 3A, Vyttila, Kochi 682019', '1991-07-18', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Pending', 'Moderate', 'Pending', '1302340000990011', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('7151fd93-a144-4c5a-94f4-1ad7fb2bef82', 'NIYT-I-001018', 'Vinod Shetty', 'Individual', 'Mass Affluent', 'CCCPV4567X', '8600301234', 'vinod.shetty@gmail.com', '42 Mangaladevi, Mangalore 575003', '1984-09-25', NULL, 'aaaa0001-0000-0000-0000-000000000002', 'Active', 'Verified', 'Moderate', 'Compliant', '1205650001001122', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('d3c386f6-c5ff-4bd0-b3c4-d674374c0a53', 'NIYT-I-001019', 'Ashok Verma', 'Individual', 'Mass Affluent', 'DDDPV5678Y', '8500412345', 'ashok.verma@gmail.com', '15 Civil Lines, Allahabad 211001', '1979-03-12', NULL, 'aaaa0001-0000-0000-0000-000000000001', 'Active', 'Verified', 'Moderate', 'Compliant', '1204720001112233', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('5984f8c2-7d5f-425a-823b-60452871472a', 'NIYT-I-001020', 'Pinky Agarwal', 'Individual', 'HNI', 'EEEPA6789Z', '8400523456', 'pinky.agarwal@email.com', '12 Bhulabhai Desai Marg, Mumbai 400036', '1974-11-08', NULL, 'aaaa0001-0000-0000-0000-000000000001', 'Active', 'Verified', 'High', 'Compliant', '1201800001223344', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-21 21:15:30.022766+00', 'dc8bda71-7158-46aa-b355-19e1bb90cf34');
INSERT INTO public.clients VALUES ('0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'NIYT-M-005004', 'SBI Mutual Fund', 'Non-Individual', 'Domestic MF', 'SSSPSB9012U', '2222024455', 'equity@sbimf.com', '9th Floor, Crescenzo, BKC, Mumbai 400051', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000007', 'Active', 'Verified', 'Low', 'N/A', '1201180045678004', NULL, NULL, '2026-03-21 21:15:30.022766+00', '2026-03-22 08:05:23.225061+00', 'aaaa0001-0000-0000-0000-000000000003');
INSERT INTO public.client_verticals VALUES ('e5d68f57-e44e-43e3-b5dc-90731333a93a', 'retail', '2026-03-21 21:07:42.262858+00');
INSERT INTO public.client_verticals VALUES ('13a515e7-f87a-40d6-a103-aef8342f97ef', 'retail', '2026-03-21 21:07:42.262858+00');
INSERT INTO public.client_verticals VALUES ('49b7c5ce-b0fe-452a-8e26-45501f1c2e31', 'retail', '2026-03-21 21:07:42.262858+00');
INSERT INTO public.client_verticals VALUES ('8e358b1b-b5ac-4174-aebc-0651ac08dd3f', 'corporate', '2026-03-21 21:07:42.270869+00');
INSERT INTO public.client_verticals VALUES ('f736d318-ebab-4649-8ba9-86abd82a4d01', 'corporate', '2026-03-21 21:07:42.270869+00');
INSERT INTO public.client_verticals VALUES ('926aa45f-294b-4b4d-84d9-1e91399443ff', 'ib', '2026-03-21 21:07:42.275275+00');
INSERT INTO public.client_verticals VALUES ('7b80f063-d923-4102-9db5-11038f6ebbc6', 'ib', '2026-03-21 21:07:42.275275+00');
INSERT INTO public.client_verticals VALUES ('31a0d2e1-4da0-4f4d-8122-3d7327ecddcf', 'aif', '2026-03-21 21:07:42.277583+00');
INSERT INTO public.client_verticals VALUES ('21a69019-7642-4c91-bba9-ec97980a6a1e', 'aif', '2026-03-21 21:07:42.277583+00');
INSERT INTO public.client_verticals VALUES ('b64d924f-7daf-47b4-b18e-89d95da65a28', 'ie', '2026-03-21 21:07:42.28039+00');
INSERT INTO public.client_verticals VALUES ('02960a68-f838-4c70-a20e-f162d6587fd3', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('ffb2315f-da3c-4ead-8412-8d3da1622edb', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('97b65aff-ca7c-4e9b-b9ac-6b499947d83e', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('c404cf93-5608-4947-b2bd-562057db12f9', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('7fe5cecc-40b7-4af1-aa5c-ae27d6468fd0', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('6f55e12a-b270-4adb-a940-86b44d10695b', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('44b5a32c-3922-4fb7-88ab-049dd99591c6', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('d1accb26-e8cb-4ceb-9cd6-d74649ce3fdc', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('685937f0-3e0b-49c1-9be9-a8eba03fb3b3', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('67c900b4-eefd-4bbd-84c0-6b4950fc5287', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('40b03ab0-3316-417b-8cce-684f8e11ebb4', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('6d5c0cf2-033d-4744-ac55-6724ba8c3ada', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('a26fcba3-a072-48f4-8b04-a3de29ac3753', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('d271e297-fbb8-4d46-ad23-e59f097f0e67', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('7151fd93-a144-4c5a-94f4-1ad7fb2bef82', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('d3c386f6-c5ff-4bd0-b3c4-d674374c0a53', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('5984f8c2-7d5f-425a-823b-60452871472a', 'retail', '2026-03-21 21:15:46.305587+00');
INSERT INTO public.client_verticals VALUES ('02960a68-f838-4c70-a20e-f162d6587fd3', 'aif', '2026-03-21 21:15:46.312015+00');
INSERT INTO public.client_verticals VALUES ('34b07185-5b74-483f-a3e1-6a3a195b62f9', 'aif', '2026-03-21 21:15:46.312015+00');
INSERT INTO public.client_verticals VALUES ('14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'aif', '2026-03-21 21:15:46.312015+00');
INSERT INTO public.client_verticals VALUES ('cfdf7e3d-ab88-4a0d-af9b-de69e9da6f63', 'aif', '2026-03-21 21:15:46.312015+00');
INSERT INTO public.client_verticals VALUES ('0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'aif', '2026-03-21 21:15:46.312015+00');
INSERT INTO public.client_verticals VALUES ('266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'aif', '2026-03-21 21:15:46.312015+00');
INSERT INTO public.client_verticals VALUES ('b9d07fca-77a2-42cd-bcb8-ef5ff124b829', 'corporate', '2026-03-21 21:15:46.315681+00');
INSERT INTO public.client_verticals VALUES ('c96cd467-53b3-4d2a-80de-bf9cd0fa743a', 'corporate', '2026-03-21 21:15:46.315681+00');
INSERT INTO public.client_verticals VALUES ('7473fd33-2dfd-4246-8945-cfee0701df78', 'corporate', '2026-03-21 21:15:46.315681+00');
INSERT INTO public.client_verticals VALUES ('a01d1843-1b34-4f9a-8775-214be2239a15', 'corporate', '2026-03-21 21:15:46.315681+00');
INSERT INTO public.client_verticals VALUES ('7d2f6783-f5f0-45e9-bb15-34e503794961', 'corporate', '2026-03-21 21:15:46.315681+00');
INSERT INTO public.client_verticals VALUES ('92e65ba6-08d9-45a5-9d1d-2e3889ec82ca', 'corporate', '2026-03-21 21:15:46.315681+00');
INSERT INTO public.client_verticals VALUES ('09623c83-c60b-4f87-82bb-93814a760928', 'corporate', '2026-03-21 21:15:46.315681+00');
INSERT INTO public.client_verticals VALUES ('5e94cbb3-d7ac-488c-84fb-418c87258579', 'ib', '2026-03-21 21:15:46.319496+00');
INSERT INTO public.client_verticals VALUES ('e1aaf267-33c3-4a46-9680-74b361ebedc5', 'ib', '2026-03-21 21:15:46.319496+00');
INSERT INTO public.client_verticals VALUES ('14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'ib', '2026-03-21 21:15:46.319496+00');
INSERT INTO public.client_verticals VALUES ('14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('a01d1843-1b34-4f9a-8775-214be2239a15', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('6646a80f-d3ae-48a0-a338-362fce7f1bec', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('db7135a2-bca9-47a5-b080-a1e3860da557', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('f1a9a070-936b-4b96-9a92-03a6e1b65943', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('a12bff99-1e25-49a8-81fb-756db65655ca', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('b16a5cca-1751-4d64-a113-02e9a3b32033', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('e159e454-5dec-466e-bfed-f9adf3fc2532', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.client_verticals VALUES ('0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'ie', '2026-03-21 21:15:46.322253+00');
INSERT INTO public.deals VALUES ('050435a9-b6bd-4907-aa8e-98d02ee11f3e', 'RB-D001', 'Ajay Choudhary — SIP Setup', 'Retail Broking', 'SIP Setup', '₹50K/mo', 'Active', '97b65aff-ca7c-4e9b-b9ac-6b499947d83e', 'aaaa0001-0000-0000-0000-000000000002', '2026-03-12', 'Monthly SIP into NIFTY50 ETF', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('45efddde-cf1e-44aa-bb40-1b5d73af9314', 'RB-D002', 'Pradeep Kumar — IPO', 'Retail Broking', 'IPO Application', '₹10L allotted', 'Allotted', 'c404cf93-5608-4947-b2bd-562057db12f9', 'aaaa0001-0000-0000-0000-000000000002', '2026-03-18', 'Allotted in Techno Power IPO', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('3d682dd2-6ff8-4c78-b29f-050aa2ef2c1b', 'RB-D003', 'Asha Mehta — Margin', 'Retail Broking', 'Margin Trading', '₹18L limit', 'Active', '6f55e12a-b270-4adb-a940-86b44d10695b', 'aaaa0001-0000-0000-0000-000000000001', '2026-03-05', '4x margin on blue-chip equities', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('569e571b-3e0c-4c50-ad93-1d694cf0c227', 'RB-D004', 'HNI Basket NIFTY50', 'Retail Broking', 'Equity Advisory', '₹2.2Cr AUM', 'Active', '02960a68-f838-4c70-a20e-f162d6587fd3', 'aaaa0001-0000-0000-0000-000000000001', '2026-03-01', 'Advisory basket for UHNI clients', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('ae5a804d-5cd2-4832-9a72-28742d9865ed', 'RB-D005', 'Girish Nair — MF Switch', 'Retail Broking', 'MF Portfolio', '₹35L AUM', 'Executed', '7fe5cecc-40b7-4af1-aa5c-ae27d6468fd0', 'aaaa0001-0000-0000-0000-000000000002', '2026-03-20', 'Switched from debt to equity MFs', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('59e60971-f1f4-4184-8ba6-68e8971e3b67', 'RB-D006', 'Sunita Mehta — Equity Basket', 'Retail Broking', 'Equity Portfolio', '₹1.8Cr', 'Active', 'ffb2315f-da3c-4ead-8412-8d3da1622edb', 'aaaa0001-0000-0000-0000-000000000002', '2026-02-28', 'Large-cap equity basket', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('cb8c4cde-a516-4ff4-870e-4f3d9611eeae', 'RB-D007', 'Ananya Krishnan — HNI AMS', 'Retail Broking', 'Advisory Service', '₹1.5Cr AUM', 'Active', 'a26fcba3-a072-48f4-8b04-a3de29ac3753', 'aaaa0001-0000-0000-0000-000000000001', '2026-03-15', 'Annual advisory mandate', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('ca0f9c3c-bdbe-488f-a45b-7cee2ef4d02a', 'RB-D008', 'Ramesh Agarwal — Derivatives', 'Retail Broking', 'F&O Trading', '₹5Cr turnover', 'Active', '02960a68-f838-4c70-a20e-f162d6587fd3', 'aaaa0001-0000-0000-0000-000000000001', '2026-03-10', 'Nifty options strategy', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('96af3e3c-09a2-4c89-b412-bb874de0c098', 'RB-D009', 'Ashok Verma — Tax Harvesting', 'Retail Broking', 'Portfolio Review', '₹95L AUM', 'Completed', 'd3c386f6-c5ff-4bd0-b3c4-d674374c0a53', 'aaaa0001-0000-0000-0000-000000000001', '2026-03-19', 'End-of-year tax loss harvesting', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('a396bb48-c62c-438d-a4f6-2dad16865c00', 'RB-D010', 'Rajan Pillai — Debt MF', 'Retail Broking', 'MF Portfolio', '₹72L', 'Active', '6d5c0cf2-033d-4744-ac55-6724ba8c3ada', 'aaaa0001-0000-0000-0000-000000000001', '2026-02-15', 'Debt allocation for FY exit', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('733e3f34-989b-484d-8e66-1479dacdd0f3', 'CB-D001', 'Bajaj Holdings Block Deal', 'Corporate Broking', 'Block Deal', '₹142Cr', 'Executed', 'b9d07fca-77a2-42cd-bcb8-ef5ff124b829', 'aaaa0001-0000-0000-0000-000000000003', '2026-03-15', '3.2M shares HDFC Bank @ ₹1,425', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('fa7a7394-ace7-4fb4-99b2-0fbbd65d3654', 'CB-D002', 'Adani Clearing March', 'Corporate Broking', 'Clearing', '₹318Cr', 'Settled', 'c96cd467-53b3-4d2a-80de-bf9cd0fa743a', 'aaaa0001-0000-0000-0000-000000000004', '2026-03-20', 'March quarter settlement', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('20726299-33ee-4f9e-ad32-67028c971052', 'CB-D003', 'JSW Steel Bulk Order', 'Corporate Broking', 'Bulk Deal', '₹85Cr', 'In Progress', '7473fd33-2dfd-4246-8945-cfee0701df78', 'aaaa0001-0000-0000-0000-000000000003', '2026-03-21', 'Bulk purchase via Block window', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('62e06403-95cc-4d0b-ad88-62f80da1a6ac', 'CB-D004', 'Hero MotoCorp Block', 'Corporate Broking', 'Block Deal', '₹45Cr', 'Pending', '92e65ba6-08d9-45a5-9d1d-2e3889ec82ca', 'aaaa0001-0000-0000-0000-000000000004', '2026-03-22', 'Pre-open block window buy', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('b4c271f6-c59a-49a9-be2a-d487163691d2', 'CB-D005', 'L&T Finance Margin Pledge', 'Corporate Broking', 'Margin', '₹200Cr', 'Active', '09623c83-c60b-4f87-82bb-93814a760928', 'aaaa0001-0000-0000-0000-000000000003', '2026-03-08', 'Pledge of L&T Finance shares', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('e4453aa0-2d26-4f7d-992d-ccf937114ec1', 'CB-D006', 'ICICI Securities Volume', 'Corporate Broking', 'Bulk Deal', '₹60Cr', 'Executed', '7d2f6783-f5f0-45e9-bb15-34e503794961', 'aaaa0001-0000-0000-0000-000000000004', '2026-03-17', 'Quarterly volume trade', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('ab45e232-4679-4626-9541-c04fef2c5c0e', 'CB-D007', 'HDFC Life Block — March QE', 'Corporate Broking', 'Block Deal', '₹100Cr', 'Pending', 'a01d1843-1b34-4f9a-8775-214be2239a15', 'aaaa0001-0000-0000-0000-000000000003', '2026-03-31', 'End-of-quarter block', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('9bf9b8b2-464e-4239-b967-d3342989eca7', 'IB-D001', 'Tata Sons — M&A Advisory', 'Investment Banking', 'M&A', '₹4,800Cr', 'Due Diligence', 'e1aaf267-33c3-4a46-9680-74b361ebedc5', 'aaaa0001-0000-0000-0000-000000000005', '2026-01-15', 'Project Titan — acquisition target', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('67f2c99f-23c6-4c80-8458-83de9861658b', 'IB-D002', 'HDFC Life QIP', 'Investment Banking', 'ECM', '₹1,200Cr', 'Mandate Signed', 'a01d1843-1b34-4f9a-8775-214be2239a15', 'aaaa0001-0000-0000-0000-000000000005', '2026-02-01', 'QIP at 5% discount to market', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('413bd51a-a12c-40f5-9a8c-9841d28c0a01', 'IB-D003', 'Reliance Infra Restructuring', 'Investment Banking', 'Debt Restructuring', '₹6,500Cr', 'Mandate Letter', '5e94cbb3-d7ac-488c-84fb-418c87258579', 'aaaa0001-0000-0000-0000-000000000005', '2026-01-28', 'Project Aurora — debt reorg', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('7e7e54a4-0761-4039-8e55-562b4d998077', 'IB-D004', 'Godrej Properties NCD', 'Investment Banking', 'DCM', '₹500Cr', 'Documentation', NULL, 'aaaa0001-0000-0000-0000-000000000005', '2026-03-01', 'Listed NCD with 3Y tenor', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('e9179214-9ee9-4c09-aa3a-4649ff495dbd', 'IB-D005', 'Vedanta M&A Target', 'Investment Banking', 'M&A', '₹12,000Cr', 'Near Closure', NULL, 'aaaa0001-0000-0000-0000-000000000005', '2025-12-15', 'Project Vedanta — final bids', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('5675b5d2-c7b2-4af3-9051-2304ffb11351', 'IB-D006', 'Maharashtra Pension Fund IPO', 'Investment Banking', 'ECM', '₹2,000Cr', 'Mandate', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'aaaa0001-0000-0000-0000-000000000005', '2026-03-10', 'Govt infrastructure IPO advisory', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('8b7d9efe-9da0-4abe-8582-174a75f1485f', 'AIF-D001', 'NIYTRI Growth Cat III — Series 2', 'AIF', 'Fund Raise', '₹400Cr', 'Active', NULL, 'aaaa0001-0000-0000-0000-000000000006', '2026-01-01', 'Cat III long-short equity strategy', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('ad1213cf-63d2-484a-99b8-5ae5d63a85bc', 'AIF-D002', 'Patel Trust — Cat II Subscription', 'AIF', 'Subscription', '₹50Cr', 'Called', 'cfdf7e3d-ab88-4a0d-af9b-de69e9da6f63', 'aaaa0001-0000-0000-0000-000000000006', '2026-02-15', 'Cat II real assets commitment', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('b80d8e96-a7ae-41c4-b827-ba30d3c76b23', 'AIF-D003', 'Nair Family — Cat III Commitment', 'AIF', 'Subscription', '₹15Cr', 'Committed', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'aaaa0001-0000-0000-0000-000000000006', '2026-03-01', 'Cat III growth fund commitment', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('255c89b5-187b-47e0-828a-8047198a170e', 'AIF-D004', 'Maharashtra Pension — Cat II', 'AIF', 'Subscription', '₹100Cr', 'Capital Called', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'aaaa0001-0000-0000-0000-000000000006', '2025-12-01', 'Infra debt fund — ₹50Cr first call', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('e9e4af1c-0897-49eb-9be0-56c0f9768496', 'AIF-D005', 'Ramesh Agarwal AIF', 'AIF', 'Subscription', '₹10Cr', 'Suitability', '02960a68-f838-4c70-a20e-f162d6587fd3', 'aaaa0001-0000-0000-0000-000000000006', '2026-03-20', 'Cat I Angel fund consideration', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('0cde1c2f-5091-49e3-bf88-fdf2a1c9dcfc', 'AIF-D006', 'Birla Family — Cat III', 'AIF', 'Subscription', '₹30Cr', 'KYC', '266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'aaaa0001-0000-0000-0000-000000000006', '2026-03-15', 'Cat III growth fund new investor', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('57c9145b-a0f1-4524-a7b7-997dfa4531d0', 'IE-D001', 'Fidelity — Q1 Allocation', 'Institutional Equities', 'Block', '₹280Cr', 'Executed', '5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-15', 'Q1 2026 equity portfolio build', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('c34c7de2-68fb-4415-ac41-ce5b8bda59ba', 'IE-D002', 'GIC Singapore — Q1 Deal', 'Institutional Equities', 'Block', '₹320Cr', 'Executed', '6646a80f-d3ae-48a0-a338-362fce7f1bec', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-10', 'Sector rotation — IT to BFSI', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('7cfd7710-62c8-45e5-8495-ca3758e1e9f6', 'IE-D003', 'UTI MF — Monthly Flow', 'Institutional Equities', 'Volume', '₹120Cr', 'Active', 'a12bff99-1e25-49a8-81fb-756db65655ca', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-21', 'Recurring monthly brokerage deal', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('f72af58f-2367-4f65-ab90-452882adbf7c', 'IE-D004', 'ICICI Prudential — Q1 Buy', 'Institutional Equities', 'Block', '₹180Cr', 'Executed', 'b16a5cca-1751-4d64-a113-02e9a3b32033', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-18', 'Largecap buy mandate execution', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('19b3528a-dae4-48bf-8c1b-1fa50952f6b6', 'IE-D005', 'Norges Bank — ESG Portfolio', 'Institutional Equities', 'Block', '₹220Cr', 'Pending', 'db7135a2-bca9-47a5-b080-a1e3860da557', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-25', 'ESG-screened equity basket', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('c5a3f935-8884-491c-bf66-3bb55b7dc25c', 'IE-D006', 'HDFC AMC — Monthly Volume', 'Institutional Equities', 'Volume', '₹95Cr', 'Active', 'e159e454-5dec-466e-bfed-f9adf3fc2532', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-21', 'Regular monthly brokerage volume', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('6ecd2465-0ab6-4bd4-9f73-7fe7dadcd5c5', 'IE-D007', 'Temasek — India Opportunity', 'Institutional Equities', 'Block', '₹300Cr', 'In Progress', 'f1a9a070-936b-4b96-9a92-03a6e1b65943', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-22', 'Midcap + smallcap allocation', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('42fbe9fd-53ac-4c6b-9c14-3612a2b35211', 'IE-D008', 'SBI MF — Q1 Mandate', 'Institutional Equities', 'Volume', '₹250Cr', 'Active', '0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-01', 'Quarterly brokerage mandate', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('ab735d18-79ef-453f-a437-4a0805e76eaf', 'RB-D011', 'Vinod Shetty — Equity', 'Retail Broking', 'Equity Portfolio', '₹42L', 'Active', '7151fd93-a144-4c5a-94f4-1ad7fb2bef82', 'aaaa0001-0000-0000-0000-000000000002', '2026-03-05', 'Growth equity portfolio', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('817f473a-9b13-417a-959b-868aa6fe417d', 'RB-D012', 'Shalini Rao — AMS', 'Retail Broking', 'Advisory Service', '₹1.2Cr', 'Active', '1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'aaaa0001-0000-0000-0000-000000000001', '2026-02-20', 'Advisory management service', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('edbb8f2f-c5ba-44cd-870d-6113ce8a511a', 'CB-D008', 'L&T Block Deal — April', 'Corporate Broking', 'Block Deal', '₹175Cr', 'Pending', '09623c83-c60b-4f87-82bb-93814a760928', 'aaaa0001-0000-0000-0000-000000000003', '2026-04-01', 'Scheduled April block', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('f8d05fed-10b0-4e55-9478-c9dcf4f91c36', 'IB-D007', 'Sun Pharma PE Deal', 'Investment Banking', 'PE', '₹900Cr', 'DD', NULL, 'aaaa0001-0000-0000-0000-000000000005', '2026-02-10', 'Private equity buyout advisory', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('8c1e761e-b0aa-4621-8500-3e56a69eca99', 'AIF-D007', 'Venkat Krishnan — Cat III', 'AIF', 'Subscription', '₹5Cr', 'KYC', '34b07185-5b74-483f-a3e1-6a3a195b62f9', 'aaaa0001-0000-0000-0000-000000000006', '2026-03-14', 'UHNI Cat III subscription', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('fc05496b-a70d-4bdc-b343-52c07ad1ce4b', 'AIF-D008', 'Pinky Agarwal — Cat I', 'AIF', 'Subscription', '₹3Cr', 'Suitability', '5984f8c2-7d5f-425a-823b-60452871472a', 'aaaa0001-0000-0000-0000-000000000006', '2026-03-20', 'Cat I startup fund consideration', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('fb77eb8b-2368-470c-8bb6-23aef8cbd125', 'IE-D009', 'Fidelity — Q2 Preview', 'Institutional Equities', 'Block', '₹350Cr', 'In Discussion', '5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'aaaa0001-0000-0000-0000-000000000007', '2026-04-01', 'Preview for Q2 allocation', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('6a973e37-15f2-412c-b2dd-18f954e785eb', 'RB-D013', 'Ravi Pillai — IPO', 'Retail Broking', 'IPO Application', '₹15L', 'Applied', '685937f0-3e0b-49c1-9be9-a8eba03fb3b3', 'aaaa0001-0000-0000-0000-000000000001', '2026-03-20', 'Applied in latest IPO window', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('55f29927-bfb1-4ce0-850c-e85ae9e10800', 'RB-D014', 'Pooja Iyer — SIP', 'Retail Broking', 'SIP Setup', '₹10K/mo', 'Active', '40b03ab0-3316-417b-8cce-684f8e11ebb4', 'aaaa0001-0000-0000-0000-000000000002', '2026-03-16', 'First SIP for retail client', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('6651f160-03fb-4573-baee-d4c3417dc3e5', 'CB-D009', 'JSW Q1 Bulk — Continuation', 'Corporate Broking', 'Bulk Deal', '₹60Cr', 'In Progress', '7473fd33-2dfd-4246-8945-cfee0701df78', 'aaaa0001-0000-0000-0000-000000000003', '2026-03-21', 'Q1 bulk continuation order', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('0078ee1d-e6b2-423a-b257-41bd8bb3fd34', 'IB-D008', 'Birla — Rights Issue', 'Investment Banking', 'ECM', '₹1,500Cr', 'Pitch', NULL, 'aaaa0001-0000-0000-0000-000000000005', '2026-03-18', 'Rights issue advisory pitch', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('a61a25f8-5c31-4a23-9e26-9380167075b9', 'AIF-D009', 'NIYTRI Cat I — First Close', 'AIF', 'Fund Raise', '₹120Cr', 'First Close', NULL, 'aaaa0001-0000-0000-0000-000000000006', '2026-03-10', 'Cat I startup fund first close', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('bdfbe6d3-1cad-4372-a249-0ab4d600585c', 'IE-D010', 'UTI MF — Smallcap Mandate', 'Institutional Equities', 'Volume', '₹80Cr', 'Active', 'a12bff99-1e25-49a8-81fb-756db65655ca', 'aaaa0001-0000-0000-0000-000000000007', '2026-03-12', 'Smallcap volume execution', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.deals VALUES ('6cb17a09-f7fa-44fb-9366-ab4576f489f0', 'RB-D015', 'Pinky Agarwal — Wealth Plan', 'Retail Broking', 'Equity Advisory', '₹2.8Cr', 'Active', '5984f8c2-7d5f-425a-823b-60452871472a', 'aaaa0001-0000-0000-0000-000000000001', '2026-03-08', 'HNI wealth planning mandate', '2026-03-21 21:17:29.060763+00', '2026-03-21 21:17:29.060763+00');
INSERT INTO public.service_requests VALUES ('74be1296-5ce5-4305-a37f-545d310bed37', 'SR-2026-0001', 'KYC document verification pending for account', 'Client has raised a formal request regarding kyc update. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'KYC Update', 'Verification', 'Phone', 'Medium', 'Open', '2026-02-01 06:23:14.308456+00', 'ok', '09623c83-c60b-4f87-82bb-93814a760928', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-01-19 02:59:41.204551+00', '2026-03-16 16:36:16.234933+00', NULL);
INSERT INTO public.service_requests VALUES ('7236e336-74c5-43ae-9614-e8ba5743675f', 'SR-2026-0002', 'Dividend not credited for Q3 2025', 'Client has raised a formal request regarding trade dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Trade Dispute', 'Processing', 'Chat', 'High', 'Open', '2026-02-24 21:36:23.192632+00', 'ok', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-23 12:16:23.255542+00', '2026-03-20 10:01:07.209612+00', NULL);
INSERT INTO public.service_requests VALUES ('0e0d1a85-15e2-4546-83e3-b02b43de3962', 'SR-2026-0003', 'Demat account transfer request - CDSL to NSDL', 'Client has raised a formal request regarding margin call. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Margin Call', 'Advisory', 'Portal', 'Critical', 'Open', '2026-01-11 22:56:03.132047+00', 'ok', '0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'AIF', NULL, NULL, NULL, NULL, '2026-02-09 11:20:29.058267+00', '2026-03-14 07:32:19.52104+00', NULL);
INSERT INTO public.service_requests VALUES ('fd5c770e-b09a-4e5e-9972-1f92ac420559', 'SR-2026-0004', 'Corporate action - rights issue subscription query', 'Client has raised a formal request regarding dividend query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Dividend Query', 'System Error', 'WhatsApp', 'Low', 'Open', '2026-02-05 17:20:09.148817+00', 'ok', '13a515e7-f87a-40d6-a103-aef8342f97ef', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-03-16 19:27:13.968669+00', '2026-03-18 11:51:17.95087+00', NULL);
INSERT INTO public.service_requests VALUES ('00c5c44e-fbe1-4b12-8413-90e87a99657c', 'SR-2026-0005', 'Trade settlement discrepancy in F&O segment', 'Client has raised a formal request regarding demat transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Demat Transfer', 'Process Query', 'Branch', 'Medium', 'Open', '2026-01-23 22:21:14.683493+00', 'warning', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-03-13 05:21:36.559912+00', '2026-03-20 15:28:28.646049+00', NULL);
INSERT INTO public.service_requests VALUES ('d62f833c-bce3-4014-8bdc-177d89c0f99f', 'SR-2026-0006', 'Account statement required for income tax filing', 'Client has raised a formal request regarding corporate action. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Corporate Action', 'Escalation', 'Email', 'High', 'Open', '2026-01-06 06:34:04.125847+00', 'ok', '1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-02-19 22:21:15.097514+00', '2026-03-14 15:07:16.118518+00', NULL);
INSERT INTO public.service_requests VALUES ('4d68d2ef-b8f3-4cb3-9cbe-1361c1e778cc', 'SR-2026-0007', 'Nominee update request for all linked accounts', 'Client has raised a formal request regarding technical issue. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Technical Issue', 'Documentation', 'Phone', 'Critical', 'Open', '2026-01-22 13:16:46.707006+00', 'ok', '21a69019-7642-4c91-bba9-ec97980a6a1e', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-02-20 05:16:16.520596+00', '2026-03-16 02:38:49.409671+00', NULL);
INSERT INTO public.service_requests VALUES ('29475426-1e3f-4c78-95e0-7d0dc97c01b0', 'SR-2026-0008', 'DP charges query - excess deduction this quarter', 'Client has raised a formal request regarding compliance query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Compliance Query', 'Verification', 'Chat', 'Low', 'Open', '2026-03-19 14:36:32.05256+00', 'ok', '266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'AIF', NULL, NULL, NULL, NULL, '2026-02-20 17:59:10.116077+00', '2026-03-13 03:17:06.437597+00', NULL);
INSERT INTO public.service_requests VALUES ('56cdd153-9cee-4be3-b406-9f46bae58284', 'SR-2026-0009', 'Portfolio holding mismatch across segments', 'Client has raised a formal request regarding settlement dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Settlement Dispute', 'Processing', 'Portal', 'Medium', 'Open', '2026-03-06 00:40:58.989562+00', 'ok', '2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-01-09 12:39:45.663443+00', '2026-03-13 18:32:39.420908+00', NULL);
INSERT INTO public.service_requests VALUES ('f1bd17f2-03c9-48b6-a459-e64eb28d2dea', 'SR-2026-0010', 'NSDL/CDSL reconciliation issue for HNI client', 'Client has raised a formal request regarding fund transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Fund Transfer', 'Advisory', 'WhatsApp', 'High', 'Open', '2026-01-15 14:06:15.600543+00', 'warning', '31a0d2e1-4da0-4f4d-8122-3d7327ecddcf', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-01-30 00:12:27.58526+00', '2026-03-14 07:56:13.957572+00', NULL);
INSERT INTO public.service_requests VALUES ('af2bdc67-8d06-4da0-8aa2-e6bb33565690', 'SR-2026-0011', 'Margin pledge request for F&O position', 'Client has raised a formal request regarding pledge request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Pledge Request', 'System Error', 'Branch', 'Critical', 'Open', '2026-01-11 14:57:25.503708+00', 'ok', '34b07185-5b74-483f-a3e1-6a3a195b62f9', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-03-10 00:21:39.757531+00', '2026-03-13 06:48:03.044443+00', NULL);
INSERT INTO public.service_requests VALUES ('52452bd5-ae4d-4b8a-aef2-a196c83b14e2', 'SR-2026-0012', 'SIP cancellation not processed by system', 'Client has raised a formal request regarding account closure. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Closure', 'Process Query', 'Email', 'Low', 'Open', '2026-02-28 16:06:36.346395+00', 'ok', '40b03ab0-3316-417b-8cce-684f8e11ebb4', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-03-21 20:02:27.735813+00', '2026-03-12 12:42:41.525264+00', NULL);
INSERT INTO public.service_requests VALUES ('ff357080-a2c4-430b-860f-e5eab9b5c7c1', 'SR-2026-0013', 'Bonus shares not reflected in demat account', 'Client has raised a formal request regarding statement request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Statement Request', 'Escalation', 'Phone', 'Medium', 'Open', '2026-02-02 08:12:42.003291+00', 'ok', '44b5a32c-3922-4fb7-88ab-049dd99591c6', 'AIF', NULL, NULL, NULL, NULL, '2026-01-31 16:36:34.151536+00', '2026-03-18 20:22:47.41157+00', NULL);
INSERT INTO public.service_requests VALUES ('f46cf8aa-120c-4ba5-b864-6feb92d2f440', 'SR-2026-0014', 'Fund transfer to linked bank account pending', 'Client has raised a formal request regarding nominee change. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Nominee Change', 'Documentation', 'Chat', 'High', 'Open', '2026-01-07 16:20:33.581819+00', 'ok', '49b7c5ce-b0fe-452a-8e26-45501f1c2e31', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-03-02 04:46:14.327476+00', '2026-03-16 10:30:37.284229+00', NULL);
INSERT INTO public.service_requests VALUES ('e21f9188-10b1-4cd1-913f-97816510446a', 'SR-2026-0015', 'Trading password reset required urgently', 'Client has raised a formal request regarding account opening. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Opening', 'Verification', 'Portal', 'Critical', 'Open', '2026-01-30 01:06:49.349635+00', 'warning', '5984f8c2-7d5f-425a-823b-60452871472a', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-02-24 12:11:05.199919+00', '2026-03-15 01:55:18.12935+00', NULL);
INSERT INTO public.service_requests VALUES ('ca8fa837-f078-44bc-b5a8-43749fce2f4d', 'SR-2026-0016', 'Mobile number update request for 2FA', 'Client has raised a formal request regarding kyc update. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'KYC Update', 'Processing', 'WhatsApp', 'Low', 'Open', '2026-02-24 14:59:43.082268+00', 'ok', '5e94cbb3-d7ac-488c-84fb-418c87258579', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-01-14 19:31:18.339237+00', '2026-03-16 19:45:09.125541+00', NULL);
INSERT INTO public.service_requests VALUES ('7b9e93ce-6ebb-4a04-b051-a8d15b525a22', 'SR-2026-0017', 'Annual maintenance charge dispute', 'Client has raised a formal request regarding trade dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Trade Dispute', 'Advisory', 'Branch', 'Medium', 'Open', '2026-01-17 21:15:07.845769+00', 'ok', '5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-19 18:45:10.395096+00', '2026-03-15 23:40:43.60238+00', NULL);
INSERT INTO public.service_requests VALUES ('a8b1f2c3-1ee7-4c8a-8451-9480b5f03c53', 'SR-2026-0018', 'Power of attorney documentation query', 'Client has raised a formal request regarding margin call. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Margin Call', 'System Error', 'Email', 'High', 'Open', '2026-03-15 17:20:37.395911+00', 'ok', '6646a80f-d3ae-48a0-a338-362fce7f1bec', 'AIF', NULL, NULL, NULL, NULL, '2026-02-01 06:15:45.362646+00', '2026-03-13 01:21:39.810433+00', NULL);
INSERT INTO public.service_requests VALUES ('1a05a4ec-b9a4-4235-929c-29f5b7160070', 'SR-2026-0019', 'Off-market transfer request for shares', 'Client has raised a formal request regarding dividend query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Dividend Query', 'Process Query', 'Phone', 'Critical', 'Open', '2026-03-11 21:04:41.737547+00', 'ok', '67c900b4-eefd-4bbd-84c0-6b4950fc5287', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-01-03 23:34:12.198647+00', '2026-03-13 01:19:38.15958+00', NULL);
INSERT INTO public.service_requests VALUES ('0c8b81c0-e6ad-4fc1-b9e8-cb3f8e71c351', 'SR-2026-0020', 'Buy order rejection due to circuit limit', 'Client has raised a formal request regarding demat transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Demat Transfer', 'Escalation', 'Chat', 'Low', 'Open', '2026-01-21 23:44:22.192785+00', 'warning', '02960a68-f838-4c70-a20e-f162d6587fd3', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-02-16 16:04:19.089335+00', '2026-03-20 12:19:43.153654+00', NULL);
INSERT INTO public.service_requests VALUES ('e44c2a3d-21ea-4cfb-87ee-fe40a7e5c63b', 'SR-2026-0021', 'Mutual fund switch confirmation pending', 'Client has raised a formal request regarding corporate action. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Corporate Action', 'Documentation', 'Portal', 'Medium', 'Open', '2026-02-27 19:02:25.038014+00', 'ok', '09623c83-c60b-4f87-82bb-93814a760928', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-03-03 16:32:23.769382+00', '2026-03-19 23:52:13.997273+00', NULL);
INSERT INTO public.service_requests VALUES ('9412a2a4-9f4c-4bf0-be94-510f92925845', 'SR-2026-0022', 'Systematic withdrawal plan setup required', 'Client has raised a formal request regarding technical issue. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Technical Issue', 'Verification', 'WhatsApp', 'High', 'Open', '2026-02-14 21:47:30.605215+00', 'ok', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-02-10 11:36:38.175296+00', '2026-03-13 12:53:00.956656+00', NULL);
INSERT INTO public.service_requests VALUES ('170cc05f-f8a3-4457-831c-9c71938f463e', 'SR-2026-0023', 'Capital gains statement required for AY 2025-26', 'Client has raised a formal request regarding compliance query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Compliance Query', 'Processing', 'Branch', 'Critical', 'Open', '2026-02-15 08:14:27.778821+00', 'ok', '0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'AIF', NULL, NULL, NULL, NULL, '2026-02-19 13:42:12.916916+00', '2026-03-12 07:44:58.173316+00', NULL);
INSERT INTO public.service_requests VALUES ('e7f74177-223b-494a-8a3b-3078df7a1703', 'SR-2026-0024', 'Brokerage plan upgrade to HNI tier', 'Client has raised a formal request regarding settlement dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Settlement Dispute', 'Advisory', 'Email', 'Low', 'Open', '2026-02-27 22:44:41.492829+00', 'ok', '13a515e7-f87a-40d6-a103-aef8342f97ef', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-02-19 16:00:06.276163+00', '2026-03-18 09:19:58.581252+00', NULL);
INSERT INTO public.service_requests VALUES ('b31d09c0-5dfc-42bb-9021-1b635ff405e4', 'SR-2026-0025', 'Account reactivation after dormancy', 'Client has raised a formal request regarding fund transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Fund Transfer', 'System Error', 'Phone', 'Medium', 'Open', '2026-03-10 19:40:43.514679+00', 'warning', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-01-28 19:54:38.544933+00', '2026-03-21 04:52:56.607708+00', NULL);
INSERT INTO public.service_requests VALUES ('5ba76f84-f943-4613-a6f0-fba4d1359265', 'SR-2026-0026', 'TDS refund on dividend income', 'Client has raised a formal request regarding pledge request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Pledge Request', 'Process Query', 'Chat', 'High', 'Open', '2026-02-18 07:11:07.302854+00', 'ok', '1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-01-01 11:51:20.697629+00', '2026-03-16 07:28:22.999874+00', NULL);
INSERT INTO public.service_requests VALUES ('4d153462-df88-4de7-88d6-cc5bac1d6918', 'SR-2026-0027', 'Corporate bond interest payment query', 'Client has raised a formal request regarding account closure. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Closure', 'Escalation', 'Portal', 'Critical', 'Open', '2026-01-14 21:09:11.462823+00', 'ok', '21a69019-7642-4c91-bba9-ec97980a6a1e', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-09 12:06:27.467716+00', '2026-03-12 21:07:28.000686+00', NULL);
INSERT INTO public.service_requests VALUES ('ef94b475-4e5e-433e-a7d6-da62f4330606', 'SR-2026-0028', 'IPO allotment status check required', 'Client has raised a formal request regarding statement request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Statement Request', 'Documentation', 'WhatsApp', 'Low', 'Open', '2026-03-28 01:26:53.758328+00', 'ok', '266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'AIF', NULL, NULL, NULL, NULL, '2026-01-18 03:24:40.074666+00', '2026-03-17 16:34:17.508322+00', NULL);
INSERT INTO public.service_requests VALUES ('8dce039a-05cd-4fbf-94a0-46d381a9c6a4', 'SR-2026-0029', 'Pledged shares release request', 'Client has raised a formal request regarding nominee change. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Nominee Change', 'Verification', 'Branch', 'Medium', 'Open', '2026-01-25 21:19:43.504154+00', 'ok', '2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-02-20 06:46:00.394827+00', '2026-03-16 13:21:02.138708+00', NULL);
INSERT INTO public.service_requests VALUES ('d085c503-a395-4257-8ec9-ddc0a2da9cde', 'SR-2026-0030', 'Unable to place order - margin insufficient', 'Client has raised a formal request regarding account opening. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Opening', 'Processing', 'Email', 'High', 'Open', '2026-02-03 08:21:28.444622+00', 'warning', '31a0d2e1-4da0-4f4d-8122-3d7327ecddcf', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-03-13 05:26:52.181495+00', '2026-03-20 17:52:55.788166+00', NULL);
INSERT INTO public.service_requests VALUES ('11032ded-81e9-48d5-8415-7198ce1965e8', 'SR-2026-0031', 'KYC document verification pending for account', 'Client has raised a formal request regarding kyc update. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'KYC Update', 'Advisory', 'Phone', 'Critical', 'Open', '2026-01-31 08:13:45.927569+00', 'ok', '34b07185-5b74-483f-a3e1-6a3a195b62f9', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-01-08 06:39:06.64519+00', '2026-03-21 09:04:12.160084+00', NULL);
INSERT INTO public.service_requests VALUES ('54a94e77-908e-4fd5-87fc-99563f79934a', 'SR-2026-0032', 'Dividend not credited for Q3 2025', 'Client has raised a formal request regarding trade dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Trade Dispute', 'System Error', 'Chat', 'Low', 'Open', '2026-01-23 21:19:05.549369+00', 'ok', '40b03ab0-3316-417b-8cce-684f8e11ebb4', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-27 23:49:25.80718+00', '2026-03-14 02:38:32.506635+00', NULL);
INSERT INTO public.service_requests VALUES ('c09ac5da-86fa-4f38-ab55-640d356433ff', 'SR-2026-0033', 'Demat account transfer request - CDSL to NSDL', 'Client has raised a formal request regarding margin call. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Margin Call', 'Process Query', 'Portal', 'Medium', 'Open', '2026-03-10 00:12:40.467575+00', 'ok', '44b5a32c-3922-4fb7-88ab-049dd99591c6', 'AIF', NULL, NULL, NULL, NULL, '2026-03-11 08:03:58.846062+00', '2026-03-14 05:36:54.048635+00', NULL);
INSERT INTO public.service_requests VALUES ('05a113f7-3dd7-4c17-a3e5-e1b86f5e8792', 'SR-2026-0034', 'Corporate action - rights issue subscription query', 'Client has raised a formal request regarding dividend query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Dividend Query', 'Escalation', 'WhatsApp', 'High', 'In Progress', '2026-03-14 19:56:47.85403+00', 'ok', '49b7c5ce-b0fe-452a-8e26-45501f1c2e31', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-03-05 18:08:23.403128+00', '2026-03-20 18:03:09.958541+00', NULL);
INSERT INTO public.service_requests VALUES ('fa3d728b-b21e-4174-8a19-7dda49917805', 'SR-2026-0035', 'Trade settlement discrepancy in F&O segment', 'Client has raised a formal request regarding demat transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Demat Transfer', 'Documentation', 'Branch', 'Critical', 'In Progress', '2026-02-07 09:22:30.279559+00', 'ok', '5984f8c2-7d5f-425a-823b-60452871472a', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-01-12 16:26:02.448971+00', '2026-03-17 04:08:55.967408+00', NULL);
INSERT INTO public.service_requests VALUES ('53321a84-3d7a-4795-9840-d6cac1aaf86c', 'SR-2026-0036', 'Account statement required for income tax filing', 'Client has raised a formal request regarding corporate action. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Corporate Action', 'Verification', 'Email', 'Low', 'In Progress', '2026-02-25 21:12:02.461293+00', 'ok', '5e94cbb3-d7ac-488c-84fb-418c87258579', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-03-17 08:57:09.173+00', '2026-03-12 17:50:41.365632+00', NULL);
INSERT INTO public.service_requests VALUES ('6bfd7d7b-d298-4c6b-a625-47dcb078435b', 'SR-2026-0037', 'Nominee update request for all linked accounts', 'Client has raised a formal request regarding technical issue. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Technical Issue', 'Processing', 'Phone', 'Medium', 'In Progress', '2026-02-02 07:33:58.132105+00', 'ok', '5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-02-08 01:50:16.219304+00', '2026-03-14 16:26:32.564429+00', NULL);
INSERT INTO public.service_requests VALUES ('79790aa5-93d7-4f11-abe8-88b453774e14', 'SR-2026-0038', 'DP charges query - excess deduction this quarter', 'Client has raised a formal request regarding compliance query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Compliance Query', 'Advisory', 'Chat', 'High', 'In Progress', '2026-02-27 02:54:41.068489+00', 'ok', '6646a80f-d3ae-48a0-a338-362fce7f1bec', 'AIF', NULL, NULL, NULL, NULL, '2026-01-18 17:03:26.53175+00', '2026-03-18 13:53:32.325905+00', NULL);
INSERT INTO public.service_requests VALUES ('2cf1bdb5-5832-4e14-8406-9637949585e3', 'SR-2026-0039', 'Portfolio holding mismatch across segments', 'Client has raised a formal request regarding settlement dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Settlement Dispute', 'System Error', 'Portal', 'Critical', 'In Progress', '2026-02-19 05:19:42.886551+00', 'ok', '67c900b4-eefd-4bbd-84c0-6b4950fc5287', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-02-28 21:45:27.606684+00', '2026-03-12 06:23:41.337831+00', NULL);
INSERT INTO public.service_requests VALUES ('1913c699-406a-46a5-a8f0-b66294215115', 'SR-2026-0040', 'NSDL/CDSL reconciliation issue for HNI client', 'Client has raised a formal request regarding fund transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Fund Transfer', 'Process Query', 'WhatsApp', 'Low', 'In Progress', '2026-03-01 03:56:10.628568+00', 'ok', '02960a68-f838-4c70-a20e-f162d6587fd3', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-01-28 17:54:34.910201+00', '2026-03-13 22:42:20.73535+00', NULL);
INSERT INTO public.service_requests VALUES ('f3d97f10-d9c3-4cb7-806a-71bfe89e2df5', 'SR-2026-0041', 'Margin pledge request for F&O position', 'Client has raised a formal request regarding pledge request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Pledge Request', 'Escalation', 'Branch', 'Medium', 'In Progress', '2026-01-28 21:07:03.418934+00', 'ok', '09623c83-c60b-4f87-82bb-93814a760928', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-03-12 22:55:31.259215+00', '2026-03-15 09:36:22.980691+00', NULL);
INSERT INTO public.service_requests VALUES ('292e7dd9-d1f7-4ee0-9141-6fc4b62973f3', 'SR-2026-0042', 'SIP cancellation not processed by system', 'Client has raised a formal request regarding account closure. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Closure', 'Documentation', 'Email', 'High', 'In Progress', '2026-01-18 05:23:08.848916+00', 'ok', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-04 00:55:44.127396+00', '2026-03-15 02:35:44.20681+00', NULL);
INSERT INTO public.service_requests VALUES ('3ad346cf-10ca-435b-8de5-9bc96d04d83e', 'SR-2026-0043', 'Bonus shares not reflected in demat account', 'Client has raised a formal request regarding statement request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Statement Request', 'Verification', 'Phone', 'Critical', 'In Progress', '2026-02-11 06:10:29.83062+00', 'ok', '0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'AIF', NULL, NULL, NULL, NULL, '2026-03-09 18:18:29.931785+00', '2026-03-20 23:41:04.168194+00', NULL);
INSERT INTO public.service_requests VALUES ('80b2e4c8-0514-475d-8675-03655fe5c8cf', 'SR-2026-0044', 'Fund transfer to linked bank account pending', 'Client has raised a formal request regarding nominee change. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Nominee Change', 'Processing', 'Chat', 'Low', 'In Progress', '2026-01-27 22:39:20.196967+00', 'ok', '13a515e7-f87a-40d6-a103-aef8342f97ef', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-02-09 21:17:37.465509+00', '2026-03-13 18:10:29.714662+00', NULL);
INSERT INTO public.service_requests VALUES ('1ce8b3bd-27c1-464c-a7b4-75e8102fbecc', 'SR-2026-0045', 'Trading password reset required urgently', 'Client has raised a formal request regarding account opening. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Opening', 'Advisory', 'Portal', 'Medium', 'In Progress', '2026-03-05 20:40:23.124094+00', 'ok', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-03-17 22:39:11.26445+00', '2026-03-12 14:55:20.900096+00', NULL);
INSERT INTO public.service_requests VALUES ('c374d7d7-bd79-405b-b5a2-d46b06a751ab', 'SR-2026-0046', 'Mobile number update request for 2FA', 'Client has raised a formal request regarding kyc update. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'KYC Update', 'System Error', 'WhatsApp', 'High', 'In Progress', '2026-02-12 10:48:28.599178+00', 'ok', '1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-02-06 18:00:51.277291+00', '2026-03-16 05:05:41.526379+00', NULL);
INSERT INTO public.service_requests VALUES ('744ed92a-265c-4950-bac1-06adb9131092', 'SR-2026-0047', 'Annual maintenance charge dispute', 'Client has raised a formal request regarding trade dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Trade Dispute', 'Process Query', 'Branch', 'Critical', 'In Progress', '2026-02-16 15:16:39.754917+00', 'ok', '21a69019-7642-4c91-bba9-ec97980a6a1e', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-14 17:11:05.699118+00', '2026-03-14 00:27:47.830081+00', NULL);
INSERT INTO public.service_requests VALUES ('6fae8fae-f50d-46f2-853f-cb948a24fafd', 'SR-2026-0048', 'Power of attorney documentation query', 'Client has raised a formal request regarding margin call. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Margin Call', 'Escalation', 'Email', 'Low', 'In Progress', '2026-03-21 21:34:24.206106+00', 'ok', '266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'AIF', NULL, NULL, NULL, NULL, '2026-01-01 20:33:57.347576+00', '2026-03-22 04:31:05.538846+00', NULL);
INSERT INTO public.service_requests VALUES ('f4766dd6-e527-4170-8710-4c8ceb54a76b', 'SR-2026-0049', 'Off-market transfer request for shares', 'Client has raised a formal request regarding dividend query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Dividend Query', 'Documentation', 'Phone', 'Medium', 'In Progress', '2026-02-21 03:08:44.954848+00', 'ok', '2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-03-20 18:34:33.149448+00', '2026-03-20 19:43:41.149259+00', NULL);
INSERT INTO public.service_requests VALUES ('c779cea8-c344-43af-81b8-c115afb054dc', 'SR-2026-0050', 'Buy order rejection due to circuit limit', 'Client has raised a formal request regarding demat transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Demat Transfer', 'Verification', 'Chat', 'High', 'In Progress', '2026-02-25 15:46:26.684718+00', 'ok', '31a0d2e1-4da0-4f4d-8122-3d7327ecddcf', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-02-12 22:30:24.766906+00', '2026-03-22 00:41:54.762133+00', NULL);
INSERT INTO public.service_requests VALUES ('98f80a98-d7ad-4d49-a980-2fb762367de1', 'SR-2026-0051', 'Mutual fund switch confirmation pending', 'Client has raised a formal request regarding corporate action. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Corporate Action', 'Processing', 'Portal', 'Critical', 'In Progress', '2026-01-25 08:44:44.410877+00', 'ok', '34b07185-5b74-483f-a3e1-6a3a195b62f9', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-03-16 06:08:42.233474+00', '2026-03-18 09:24:04.444502+00', NULL);
INSERT INTO public.service_requests VALUES ('721a30f6-c16e-49b2-8e3f-e3086fa65b4e', 'SR-2026-0052', 'Systematic withdrawal plan setup required', 'Client has raised a formal request regarding technical issue. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Technical Issue', 'Advisory', 'WhatsApp', 'Low', 'In Progress', '2026-02-12 23:06:50.913529+00', 'ok', '40b03ab0-3316-417b-8cce-684f8e11ebb4', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-12 21:09:08.930213+00', '2026-03-20 18:59:43.362018+00', NULL);
INSERT INTO public.service_requests VALUES ('467c530b-78de-4a8e-a4e3-b60e19a60246', 'SR-2026-0053', 'Capital gains statement required for AY 2025-26', 'Client has raised a formal request regarding compliance query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Compliance Query', 'System Error', 'Branch', 'Medium', 'In Progress', '2026-02-04 05:24:41.216881+00', 'ok', '44b5a32c-3922-4fb7-88ab-049dd99591c6', 'AIF', NULL, NULL, NULL, NULL, '2026-03-01 20:08:44.996671+00', '2026-03-14 12:36:41.966759+00', NULL);
INSERT INTO public.service_requests VALUES ('191eb4dd-d08f-4fb8-9c2f-319ff9d55c86', 'SR-2026-0054', 'Brokerage plan upgrade to HNI tier', 'Client has raised a formal request regarding settlement dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Settlement Dispute', 'Process Query', 'Email', 'High', 'In Progress', '2026-03-17 14:43:01.442031+00', 'ok', '49b7c5ce-b0fe-452a-8e26-45501f1c2e31', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-01-20 22:34:48.338069+00', '2026-03-17 23:07:23.382451+00', NULL);
INSERT INTO public.service_requests VALUES ('cbda9128-1a27-4daf-9513-69a8e089fe9a', 'SR-2026-0055', 'Account reactivation after dormancy', 'Client has raised a formal request regarding fund transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Fund Transfer', 'Escalation', 'Phone', 'Critical', 'In Progress', '2026-01-06 01:41:29.815298+00', 'ok', '5984f8c2-7d5f-425a-823b-60452871472a', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-02-19 06:41:05.037867+00', '2026-03-17 11:01:32.291819+00', NULL);
INSERT INTO public.service_requests VALUES ('c1cbb6db-5334-4895-9202-64adafd438aa', 'SR-2026-0056', 'TDS refund on dividend income', 'Client has raised a formal request regarding pledge request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Pledge Request', 'Documentation', 'Chat', 'Low', 'In Progress', '2026-03-04 00:48:08.349802+00', 'ok', '5e94cbb3-d7ac-488c-84fb-418c87258579', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-02-21 21:20:56.120841+00', '2026-03-15 22:30:12.996086+00', NULL);
INSERT INTO public.service_requests VALUES ('fcea2ca2-72a6-4ce9-bd11-fb4df39bf1aa', 'SR-2026-0057', 'Corporate bond interest payment query', 'Client has raised a formal request regarding account closure. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Closure', 'Verification', 'Portal', 'Medium', 'In Progress', '2026-01-29 05:39:32.679299+00', 'ok', '5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-05 18:02:57.95698+00', '2026-03-15 04:19:40.302852+00', NULL);
INSERT INTO public.service_requests VALUES ('ed788e5d-0585-4e69-990e-eee1ad72fe46', 'SR-2026-0058', 'IPO allotment status check required', 'Client has raised a formal request regarding statement request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Statement Request', 'Processing', 'WhatsApp', 'High', 'In Progress', '2026-01-20 01:37:47.503355+00', 'ok', '6646a80f-d3ae-48a0-a338-362fce7f1bec', 'AIF', NULL, NULL, NULL, NULL, '2026-02-22 19:04:08.474374+00', '2026-03-19 15:27:57.567583+00', NULL);
INSERT INTO public.service_requests VALUES ('51e60d45-e98c-4d08-a9f5-f8dd71c9199f', 'SR-2026-0059', 'Pledged shares release request', 'Client has raised a formal request regarding nominee change. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Nominee Change', 'Advisory', 'Branch', 'Critical', 'Escalated', '2026-02-21 02:14:59.728154+00', 'breached', '67c900b4-eefd-4bbd-84c0-6b4950fc5287', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-01-03 16:46:34.554517+00', '2026-03-16 04:32:21.984894+00', NULL);
INSERT INTO public.service_requests VALUES ('d56bf011-1a3f-4951-ac13-4faac3eb9956', 'SR-2026-0060', 'Unable to place order - margin insufficient', 'Client has raised a formal request regarding account opening. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Opening', 'System Error', 'Email', 'Low', 'Escalated', '2026-02-01 05:51:48.658895+00', 'breached', '02960a68-f838-4c70-a20e-f162d6587fd3', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-03-05 06:25:07.580126+00', '2026-03-19 18:13:11.262275+00', NULL);
INSERT INTO public.service_requests VALUES ('c4790f25-18b3-488e-902e-44ffdc778923', 'SR-2026-0061', 'KYC document verification pending for account', 'Client has raised a formal request regarding kyc update. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'KYC Update', 'Process Query', 'Phone', 'Medium', 'Escalated', '2026-03-13 20:23:33.044124+00', 'breached', '09623c83-c60b-4f87-82bb-93814a760928', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-02-02 21:52:21.216019+00', '2026-03-18 10:03:25.506838+00', NULL);
INSERT INTO public.service_requests VALUES ('17f37246-9d74-4813-b0fe-2afb8c0b0556', 'SR-2026-0062', 'Dividend not credited for Q3 2025', 'Client has raised a formal request regarding trade dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Trade Dispute', 'Escalation', 'Chat', 'High', 'Escalated', '2026-03-04 09:06:52.887881+00', 'breached', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-01-11 18:27:13.416409+00', '2026-03-20 15:25:15.122657+00', NULL);
INSERT INTO public.service_requests VALUES ('af6966d2-57b4-4d9a-bf20-1a8b7ddcaf61', 'SR-2026-0063', 'Demat account transfer request - CDSL to NSDL', 'Client has raised a formal request regarding margin call. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Margin Call', 'Documentation', 'Portal', 'Critical', 'Escalated', '2026-03-24 01:43:34.682878+00', 'breached', '0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'AIF', NULL, NULL, NULL, NULL, '2026-01-29 01:23:54.216901+00', '2026-03-15 05:28:39.185885+00', NULL);
INSERT INTO public.service_requests VALUES ('2e8434f6-8058-47c4-90ff-5d7e489bcf14', 'SR-2026-0064', 'Corporate action - rights issue subscription query', 'Client has raised a formal request regarding dividend query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Dividend Query', 'Verification', 'WhatsApp', 'Low', 'Escalated', '2026-01-30 05:11:19.570225+00', 'breached', '13a515e7-f87a-40d6-a103-aef8342f97ef', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-03-20 05:33:22.189004+00', '2026-03-21 15:26:21.798323+00', NULL);
INSERT INTO public.service_requests VALUES ('31ac49f7-b69c-4cae-b024-c5b3bca05881', 'SR-2026-0065', 'Trade settlement discrepancy in F&O segment', 'Client has raised a formal request regarding demat transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Demat Transfer', 'Processing', 'Branch', 'Medium', 'Escalated', '2026-01-27 10:17:22.528402+00', 'breached', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-01-22 10:45:17.078971+00', '2026-03-16 16:26:39.341543+00', NULL);
INSERT INTO public.service_requests VALUES ('84217475-62cd-4a73-973b-e367746e123f', 'SR-2026-0066', 'Account statement required for income tax filing', 'Client has raised a formal request regarding corporate action. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Corporate Action', 'Advisory', 'Email', 'High', 'Escalated', '2026-03-17 11:52:48.835223+00', 'breached', '1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'Corporate Broking', NULL, NULL, NULL, NULL, '2026-01-28 17:52:07.793852+00', '2026-03-13 05:54:57.337015+00', NULL);
INSERT INTO public.service_requests VALUES ('1eef21c2-f571-4857-bff4-c1d4d25ce2dd', 'SR-2026-0067', 'Nominee update request for all linked accounts', 'Client has raised a formal request regarding technical issue. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Technical Issue', 'System Error', 'Phone', 'Critical', 'Escalated', '2026-01-09 19:51:23.852435+00', 'breached', '21a69019-7642-4c91-bba9-ec97980a6a1e', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-02-08 18:37:56.610111+00', '2026-03-15 07:53:51.446418+00', NULL);
INSERT INTO public.service_requests VALUES ('fe8c851f-bf16-47b4-8857-d71b492a270e', 'SR-2026-0068', 'DP charges query - excess deduction this quarter', 'Client has raised a formal request regarding compliance query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Compliance Query', 'Process Query', 'Chat', 'Low', 'Escalated', '2026-01-15 16:28:01.813706+00', 'breached', '266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'AIF', NULL, NULL, NULL, NULL, '2026-02-22 15:16:17.691651+00', '2026-03-21 15:40:46.978403+00', NULL);
INSERT INTO public.service_requests VALUES ('799994a1-f1fc-43e0-8e8c-ee8e4ef2b666', 'SR-2026-0069', 'Portfolio holding mismatch across segments', 'Client has raised a formal request regarding settlement dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Settlement Dispute', 'Escalation', 'Portal', 'Medium', 'Escalated', '2026-03-08 03:49:14.663879+00', 'breached', '2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'Institutional Equities', NULL, NULL, NULL, NULL, '2026-02-11 03:34:31.105308+00', '2026-03-14 00:40:25.392881+00', NULL);
INSERT INTO public.service_requests VALUES ('91dcc5db-69be-4b1c-967a-f0e50468bde5', 'SR-2026-0070', 'NSDL/CDSL reconciliation issue for HNI client', 'Client has raised a formal request regarding fund transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Fund Transfer', 'Documentation', 'WhatsApp', 'High', 'Escalated', '2026-02-16 01:55:45.804981+00', 'breached', '31a0d2e1-4da0-4f4d-8122-3d7327ecddcf', 'Retail Broking', NULL, NULL, NULL, NULL, '2026-02-14 01:44:06.075464+00', '2026-03-14 13:46:29.391628+00', NULL);
INSERT INTO public.service_requests VALUES ('d5ffd36c-c611-44d8-b0d2-28a2a83dc6aa', 'SR-2026-0072', 'SIP cancellation not processed by system', 'Client has raised a formal request regarding account closure. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Closure', 'Processing', 'Email', 'Low', 'Escalated', '2026-02-26 00:50:08.699859+00', 'breached', '40b03ab0-3316-417b-8cce-684f8e11ebb4', 'Investment Banking', NULL, NULL, NULL, NULL, '2026-03-11 10:58:15.870112+00', '2026-03-17 17:33:04.919217+00', NULL);
INSERT INTO public.service_requests VALUES ('1d5f2bd1-2510-4882-94f1-76c802668f4c', 'SR-2026-0073', 'Bonus shares not reflected in demat account', 'Client has raised a formal request regarding statement request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Statement Request', 'Advisory', 'Phone', 'Medium', 'Escalated', '2026-01-13 21:48:32.243942+00', 'breached', '44b5a32c-3922-4fb7-88ab-049dd99591c6', 'AIF', NULL, NULL, NULL, NULL, '2026-02-03 21:49:32.77974+00', '2026-03-14 21:55:23.412874+00', NULL);
INSERT INTO public.service_requests VALUES ('3b27011f-378a-43a0-ab07-04170160d3cd', 'SR-2026-0074', 'Fund transfer to linked bank account pending', 'Client has raised a formal request regarding nominee change. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Nominee Change', 'System Error', 'Chat', 'High', 'Resolved', '2026-03-14 20:27:33.519682+00', 'ok', '49b7c5ce-b0fe-452a-8e26-45501f1c2e31', 'Institutional Equities', NULL, NULL, '2026-03-07 22:13:08.691354+00', NULL, '2026-03-11 00:25:04.360768+00', '2026-03-22 02:18:15.736248+00', NULL);
INSERT INTO public.service_requests VALUES ('d8306ba4-0f04-4a74-9274-4b4d6e6d9764', 'SR-2026-0075', 'Trading password reset required urgently', 'Client has raised a formal request regarding account opening. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Opening', 'Process Query', 'Portal', 'Critical', 'Resolved', '2026-02-24 18:21:23.312471+00', 'ok', '5984f8c2-7d5f-425a-823b-60452871472a', 'Retail Broking', NULL, NULL, '2026-03-15 18:14:54.225724+00', NULL, '2026-01-21 15:29:41.724082+00', '2026-03-14 21:20:12.477396+00', NULL);
INSERT INTO public.service_requests VALUES ('94777ba6-51f1-4ffe-98ca-1a3b4e826e13', 'SR-2026-0076', 'Mobile number update request for 2FA', 'Client has raised a formal request regarding kyc update. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'KYC Update', 'Escalation', 'WhatsApp', 'Low', 'Resolved', '2026-02-25 10:20:47.554412+00', 'ok', '5e94cbb3-d7ac-488c-84fb-418c87258579', 'Corporate Broking', NULL, NULL, '2026-03-19 07:04:01.165072+00', NULL, '2026-02-24 05:13:07.65361+00', '2026-03-14 21:21:22.120115+00', NULL);
INSERT INTO public.service_requests VALUES ('a4865721-249b-4092-a748-55eb3b66317c', 'SR-2026-0077', 'Annual maintenance charge dispute', 'Client has raised a formal request regarding trade dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Trade Dispute', 'Documentation', 'Branch', 'Medium', 'Resolved', '2026-01-07 04:08:48.688896+00', 'ok', '5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'Investment Banking', NULL, NULL, '2026-03-08 18:42:41.575519+00', NULL, '2026-03-05 16:37:37.758314+00', '2026-03-16 21:48:32.44215+00', NULL);
INSERT INTO public.service_requests VALUES ('7e5f5218-1884-4941-9230-342ad6f518c9', 'SR-2026-0078', 'Power of attorney documentation query', 'Client has raised a formal request regarding margin call. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Margin Call', 'Verification', 'Email', 'High', 'Resolved', '2026-01-25 02:10:19.600457+00', 'ok', '6646a80f-d3ae-48a0-a338-362fce7f1bec', 'AIF', NULL, NULL, '2026-03-03 20:54:59.105192+00', NULL, '2026-03-22 04:56:14.333152+00', '2026-03-19 08:34:12.674449+00', NULL);
INSERT INTO public.service_requests VALUES ('509c8b44-ec6c-46be-be63-f0f34d41193f', 'SR-2026-0079', 'Off-market transfer request for shares', 'Client has raised a formal request regarding dividend query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Dividend Query', 'Processing', 'Phone', 'Critical', 'Resolved', '2026-01-30 06:57:06.211717+00', 'ok', '67c900b4-eefd-4bbd-84c0-6b4950fc5287', 'Institutional Equities', NULL, NULL, '2026-03-16 13:31:23.071599+00', NULL, '2026-02-05 21:34:48.393125+00', '2026-03-14 01:02:50.75682+00', NULL);
INSERT INTO public.service_requests VALUES ('f983cca4-83e7-4254-a283-6427e81dd9f2', 'SR-2026-0080', 'Buy order rejection due to circuit limit', 'Client has raised a formal request regarding demat transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Demat Transfer', 'Advisory', 'Chat', 'Low', 'Resolved', '2026-03-19 22:15:18.917584+00', 'ok', '02960a68-f838-4c70-a20e-f162d6587fd3', 'Retail Broking', NULL, NULL, '2026-03-18 19:43:02.950739+00', NULL, '2026-01-12 05:30:44.537954+00', '2026-03-21 21:42:57.603047+00', NULL);
INSERT INTO public.service_requests VALUES ('797cdb67-8be1-4624-a548-9e8beeb8c47c', 'SR-2026-0081', 'Mutual fund switch confirmation pending', 'Client has raised a formal request regarding corporate action. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Corporate Action', 'System Error', 'Portal', 'Medium', 'Resolved', '2026-02-21 00:46:21.830972+00', 'ok', '09623c83-c60b-4f87-82bb-93814a760928', 'Corporate Broking', NULL, NULL, '2026-03-18 21:29:20.969628+00', NULL, '2026-01-22 06:42:18.971376+00', '2026-03-18 22:49:45.834451+00', NULL);
INSERT INTO public.service_requests VALUES ('813a3dfe-8fc4-4db4-a6e2-afca206ba014', 'SR-2026-0082', 'Systematic withdrawal plan setup required', 'Client has raised a formal request regarding technical issue. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Technical Issue', 'Process Query', 'WhatsApp', 'High', 'Resolved', '2026-01-21 14:14:22.66599+00', 'ok', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'Investment Banking', NULL, NULL, '2026-03-08 20:49:39.308799+00', NULL, '2026-01-15 21:05:18.568925+00', '2026-03-13 06:22:51.327974+00', NULL);
INSERT INTO public.service_requests VALUES ('4a748eed-a578-4b75-9136-babb4e2577dc', 'SR-2026-0083', 'Capital gains statement required for AY 2025-26', 'Client has raised a formal request regarding compliance query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Compliance Query', 'Escalation', 'Branch', 'Critical', 'Resolved', '2026-02-28 15:04:23.020544+00', 'ok', '0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'AIF', NULL, NULL, '2026-03-05 00:10:40.101783+00', NULL, '2026-01-24 23:28:37.549511+00', '2026-03-13 00:30:34.65444+00', NULL);
INSERT INTO public.service_requests VALUES ('6602fcfc-80e9-4205-bc60-3c0e3297b8f6', 'SR-2026-0084', 'Brokerage plan upgrade to HNI tier', 'Client has raised a formal request regarding settlement dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Settlement Dispute', 'Documentation', 'Email', 'Low', 'Resolved', '2026-01-08 00:25:06.709296+00', 'ok', '13a515e7-f87a-40d6-a103-aef8342f97ef', 'Institutional Equities', NULL, NULL, '2026-03-20 12:11:00.442481+00', NULL, '2026-02-14 08:47:00.647298+00', '2026-03-17 13:43:16.497963+00', NULL);
INSERT INTO public.service_requests VALUES ('6ef133e3-1c37-4e2a-9027-b32ca3950554', 'SR-2026-0085', 'Account reactivation after dormancy', 'Client has raised a formal request regarding fund transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Fund Transfer', 'Verification', 'Phone', 'Medium', 'Resolved', '2026-03-19 03:09:20.443219+00', 'ok', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'Retail Broking', NULL, NULL, '2026-03-19 11:30:16.600133+00', NULL, '2026-02-23 22:39:23.036936+00', '2026-03-21 04:18:13.744679+00', NULL);
INSERT INTO public.service_requests VALUES ('8e9628c4-a673-4569-9712-31826e703b78', 'SR-2026-0086', 'TDS refund on dividend income', 'Client has raised a formal request regarding pledge request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Pledge Request', 'Processing', 'Chat', 'High', 'Resolved', '2026-01-24 16:30:38.861905+00', 'ok', '1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'Corporate Broking', NULL, NULL, '2026-03-08 01:00:39.769735+00', NULL, '2026-03-08 03:20:47.429012+00', '2026-03-18 23:16:14.028108+00', NULL);
INSERT INTO public.service_requests VALUES ('e61b2d0b-1edf-4fae-b0e7-d3628db32e9c', 'SR-2026-0087', 'Corporate bond interest payment query', 'Client has raised a formal request regarding account closure. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Closure', 'Advisory', 'Portal', 'Critical', 'Resolved', '2026-03-04 16:51:52.631886+00', 'ok', '21a69019-7642-4c91-bba9-ec97980a6a1e', 'Investment Banking', NULL, NULL, '2026-03-16 08:07:01.315173+00', NULL, '2026-02-11 03:47:45.940384+00', '2026-03-21 20:42:01.743797+00', NULL);
INSERT INTO public.service_requests VALUES ('ff40153c-2b0a-4648-ad60-ba44c635242d', 'SR-2026-0088', 'IPO allotment status check required', 'Client has raised a formal request regarding statement request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Statement Request', 'System Error', 'WhatsApp', 'Low', 'Resolved', '2026-03-15 03:37:59.396248+00', 'ok', '266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'AIF', NULL, NULL, '2026-03-02 20:39:49.707408+00', NULL, '2026-01-12 21:59:25.839116+00', '2026-03-15 10:51:15.256631+00', NULL);
INSERT INTO public.service_requests VALUES ('f34bfd1d-39f2-4861-8ddf-699eb0893440', 'SR-2026-0089', 'Pledged shares release request', 'Client has raised a formal request regarding nominee change. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Nominee Change', 'Process Query', 'Branch', 'Medium', 'Closed', '2026-01-06 11:11:52.030455+00', 'ok', '2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'Institutional Equities', NULL, NULL, '2026-03-10 20:14:25.01827+00', NULL, '2026-01-30 22:06:28.455158+00', '2026-03-19 10:15:47.50712+00', NULL);
INSERT INTO public.service_requests VALUES ('bcb7a970-70e4-405b-a0c1-76d9b18fe10a', 'SR-2026-0090', 'Unable to place order - margin insufficient', 'Client has raised a formal request regarding account opening. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Opening', 'Escalation', 'Email', 'High', 'Closed', '2026-02-24 03:19:21.937423+00', 'ok', '31a0d2e1-4da0-4f4d-8122-3d7327ecddcf', 'Retail Broking', NULL, NULL, '2026-03-17 09:10:07.383614+00', NULL, '2026-02-18 00:10:50.478938+00', '2026-03-15 14:49:21.22924+00', NULL);
INSERT INTO public.service_requests VALUES ('93bfb94e-9c33-4ef1-8bf3-a15f256fecec', 'SR-2026-0091', 'KYC document verification pending for account', 'Client has raised a formal request regarding kyc update. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'KYC Update', 'Documentation', 'Phone', 'Critical', 'Closed', '2026-02-24 08:26:29.968634+00', 'ok', '34b07185-5b74-483f-a3e1-6a3a195b62f9', 'Corporate Broking', NULL, NULL, '2026-03-17 20:45:03.205247+00', NULL, '2026-03-21 15:20:52.332976+00', '2026-03-21 06:46:49.596936+00', NULL);
INSERT INTO public.service_requests VALUES ('93949f8d-3917-401d-80ca-b8e52544f8f1', 'SR-2026-0092', 'Dividend not credited for Q3 2025', 'Client has raised a formal request regarding trade dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Trade Dispute', 'Verification', 'Chat', 'Low', 'Closed', '2026-01-19 08:55:58.827105+00', 'ok', '40b03ab0-3316-417b-8cce-684f8e11ebb4', 'Investment Banking', NULL, NULL, '2026-03-11 11:04:57.404759+00', NULL, '2026-03-04 20:17:30.925137+00', '2026-03-15 08:48:06.977098+00', NULL);
INSERT INTO public.service_requests VALUES ('827487e6-7878-44e7-9415-28799009b8cb', 'SR-2026-0093', 'Demat account transfer request - CDSL to NSDL', 'Client has raised a formal request regarding margin call. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Margin Call', 'Processing', 'Portal', 'Medium', 'Closed', '2026-03-03 14:33:13.725071+00', 'ok', '44b5a32c-3922-4fb7-88ab-049dd99591c6', 'AIF', NULL, NULL, '2026-03-04 04:56:28.279162+00', NULL, '2026-02-27 20:46:20.856669+00', '2026-03-13 20:07:31.011578+00', NULL);
INSERT INTO public.service_requests VALUES ('fedf6cbb-0803-4779-82b7-5376bf8a5734', 'SR-2026-0094', 'Corporate action - rights issue subscription query', 'Client has raised a formal request regarding dividend query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Dividend Query', 'Advisory', 'WhatsApp', 'High', 'Closed', '2026-03-22 09:38:06.674995+00', 'ok', '49b7c5ce-b0fe-452a-8e26-45501f1c2e31', 'Institutional Equities', NULL, NULL, '2026-03-07 15:23:24.939636+00', NULL, '2026-01-02 14:39:52.802801+00', '2026-03-14 09:56:56.276848+00', NULL);
INSERT INTO public.service_requests VALUES ('05d66205-d5c9-4378-a597-fcdc5ddf9fbe', 'SR-2026-0095', 'Trade settlement discrepancy in F&O segment', 'Client has raised a formal request regarding demat transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Demat Transfer', 'System Error', 'Branch', 'Critical', 'Closed', '2026-02-12 19:57:37.183627+00', 'ok', '5984f8c2-7d5f-425a-823b-60452871472a', 'Retail Broking', NULL, NULL, '2026-03-03 01:02:02.046914+00', NULL, '2026-03-11 15:25:34.565638+00', '2026-03-21 14:42:38.350462+00', NULL);
INSERT INTO public.service_requests VALUES ('841cf6ff-73bb-49e2-99b5-e261dd0039e1', 'SR-2026-0096', 'Account statement required for income tax filing', 'Client has raised a formal request regarding corporate action. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Corporate Action', 'Process Query', 'Email', 'Low', 'Closed', '2026-03-02 22:01:32.990813+00', 'ok', '5e94cbb3-d7ac-488c-84fb-418c87258579', 'Corporate Broking', NULL, NULL, '2026-03-02 18:06:38.115384+00', NULL, '2026-03-20 21:50:50.141147+00', '2026-03-18 01:32:23.612425+00', NULL);
INSERT INTO public.service_requests VALUES ('c8b56f62-6dad-41c3-b4aa-5834c9ba6be4', 'SR-2026-0097', 'Nominee update request for all linked accounts', 'Client has raised a formal request regarding technical issue. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Technical Issue', 'Escalation', 'Phone', 'Medium', 'Closed', '2026-01-18 02:03:21.115182+00', 'ok', '5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'Investment Banking', NULL, NULL, '2026-03-04 13:28:33.037869+00', NULL, '2026-02-12 17:42:03.866659+00', '2026-03-20 10:45:33.642001+00', NULL);
INSERT INTO public.service_requests VALUES ('795f3907-c7a0-48a6-9b0b-9db0512282ed', 'SR-2026-0098', 'DP charges query - excess deduction this quarter', 'Client has raised a formal request regarding compliance query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Compliance Query', 'Documentation', 'Chat', 'High', 'Closed', '2026-01-09 00:35:05.0111+00', 'ok', '6646a80f-d3ae-48a0-a338-362fce7f1bec', 'AIF', NULL, NULL, '2026-03-15 01:17:28.534931+00', NULL, '2026-03-13 23:50:04.157396+00', '2026-03-13 16:58:24.668104+00', NULL);
INSERT INTO public.service_requests VALUES ('450217cc-0992-4c68-b394-e76534cef6de', 'SR-2026-0099', 'Portfolio holding mismatch across segments', 'Client has raised a formal request regarding settlement dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Settlement Dispute', 'Verification', 'Portal', 'Critical', 'Closed', '2026-02-10 08:45:20.214987+00', 'ok', '67c900b4-eefd-4bbd-84c0-6b4950fc5287', 'Institutional Equities', NULL, NULL, '2026-03-02 13:17:49.149283+00', NULL, '2026-03-10 01:30:35.381617+00', '2026-03-19 15:25:20.17088+00', NULL);
INSERT INTO public.service_requests VALUES ('c3d12c8b-c05a-4d34-ad5e-7ede04bfa0d8', 'SR-2026-0100', 'NSDL/CDSL reconciliation issue for HNI client', 'Client has raised a formal request regarding fund transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Fund Transfer', 'Processing', 'WhatsApp', 'Low', 'Closed', '2026-01-08 14:45:49.090199+00', 'ok', '02960a68-f838-4c70-a20e-f162d6587fd3', 'Retail Broking', NULL, NULL, '2026-03-20 18:44:10.724653+00', NULL, '2026-03-06 08:18:35.094307+00', '2026-03-13 17:09:40.418885+00', NULL);
INSERT INTO public.service_requests VALUES ('8c5d730e-b2e0-4ac2-85fc-bd8607e391ba', 'SR-2026-0101', 'Margin pledge request for F&O position', 'Client has raised a formal request regarding pledge request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Pledge Request', 'Advisory', 'Branch', 'Medium', 'Closed', '2026-02-12 13:28:57.037342+00', 'ok', '09623c83-c60b-4f87-82bb-93814a760928', 'Corporate Broking', NULL, NULL, '2026-03-18 23:36:56.813398+00', NULL, '2026-01-03 06:11:30.204059+00', '2026-03-16 18:27:15.728948+00', NULL);
INSERT INTO public.service_requests VALUES ('8fa3f4cc-d4e8-438c-ac3c-400f8b766490', 'SR-2026-0102', 'SIP cancellation not processed by system', 'Client has raised a formal request regarding account closure. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Closure', 'System Error', 'Email', 'High', 'Closed', '2026-03-19 15:42:13.848231+00', 'ok', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'Investment Banking', NULL, NULL, '2026-03-10 23:49:00.917002+00', NULL, '2026-03-03 19:02:55.867895+00', '2026-03-12 19:06:24.296203+00', NULL);
INSERT INTO public.service_requests VALUES ('ea061963-4a05-4d48-b009-79ba8d158046', 'SR-2026-0103', 'Bonus shares not reflected in demat account', 'Client has raised a formal request regarding statement request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Statement Request', 'Process Query', 'Phone', 'Critical', 'Closed', '2026-02-09 03:25:29.881209+00', 'ok', '0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'AIF', NULL, NULL, '2026-03-07 05:44:36.625249+00', NULL, '2026-01-01 11:56:39.285439+00', '2026-03-13 22:07:27.791326+00', NULL);
INSERT INTO public.service_requests VALUES ('aed15a84-8ae5-4c55-a929-65afabebd30f', 'SR-2026-0104', 'Fund transfer to linked bank account pending', 'Client has raised a formal request regarding nominee change. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Nominee Change', 'Escalation', 'Chat', 'Low', 'Closed', '2026-01-25 16:08:53.513434+00', 'ok', '13a515e7-f87a-40d6-a103-aef8342f97ef', 'Institutional Equities', NULL, NULL, '2026-03-10 21:11:18.971627+00', NULL, '2026-02-14 23:56:32.484322+00', '2026-03-12 15:39:51.712683+00', NULL);
INSERT INTO public.service_requests VALUES ('b3ef34df-c09a-413a-9fce-87211d60cb04', 'SR-2026-0105', 'Trading password reset required urgently', 'Client has raised a formal request regarding account opening. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Account Opening', 'Documentation', 'Portal', 'Medium', 'Closed', '2026-02-27 04:08:27.649679+00', 'ok', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'Retail Broking', NULL, NULL, '2026-03-14 00:01:20.163512+00', NULL, '2026-03-01 01:45:01.619142+00', '2026-03-20 06:50:10.680309+00', NULL);
INSERT INTO public.service_requests VALUES ('38ca44e3-2068-4726-981f-459f710f3ed3', 'SR-2026-0106', 'Mobile number update request for 2FA', 'Client has raised a formal request regarding kyc update. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'KYC Update', 'Verification', 'WhatsApp', 'High', 'Closed', '2026-02-10 19:04:13.655774+00', 'ok', '1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'Corporate Broking', NULL, NULL, '2026-03-20 00:07:33.092664+00', NULL, '2026-02-12 21:47:58.485912+00', '2026-03-19 13:15:25.808768+00', NULL);
INSERT INTO public.service_requests VALUES ('94cffc9c-cd8a-486c-92e8-5c63a8c971f6', 'SR-2026-0107', 'Annual maintenance charge dispute', 'Client has raised a formal request regarding trade dispute. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Trade Dispute', 'Processing', 'Branch', 'Critical', 'Closed', '2026-02-01 20:08:02.489651+00', 'ok', '21a69019-7642-4c91-bba9-ec97980a6a1e', 'Investment Banking', NULL, NULL, '2026-03-13 00:58:24.379921+00', NULL, '2026-03-10 04:50:38.432705+00', '2026-03-15 02:06:55.089678+00', NULL);
INSERT INTO public.service_requests VALUES ('951381f0-abd7-44c4-b047-d566cd7bd403', 'SR-2026-0108', 'Power of attorney documentation query', 'Client has raised a formal request regarding margin call. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Margin Call', 'Advisory', 'Email', 'Low', 'Closed', '2026-02-05 05:40:49.272098+00', 'ok', '266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'AIF', NULL, NULL, '2026-03-02 22:51:17.294588+00', NULL, '2026-02-21 17:13:15.591061+00', '2026-03-13 11:24:03.59286+00', NULL);
INSERT INTO public.service_requests VALUES ('7cd5bab2-2f26-433f-bb17-2f4d0b3d3f73', 'SR-2026-0109', 'Off-market transfer request for shares', 'Client has raised a formal request regarding dividend query. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Dividend Query', 'System Error', 'Phone', 'Medium', 'Closed', '2026-02-19 13:06:16.209854+00', 'ok', '2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'Institutional Equities', NULL, NULL, '2026-03-10 06:17:04.035039+00', NULL, '2026-02-14 09:59:31.178093+00', '2026-03-19 04:02:43.377077+00', NULL);
INSERT INTO public.service_requests VALUES ('88f20583-f043-4c7b-849a-7f90d2e5629b', 'SR-2026-0110', 'Buy order rejection due to circuit limit', 'Client has raised a formal request regarding demat transfer. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Demat Transfer', 'Process Query', 'Chat', 'High', 'Closed', '2026-01-31 16:18:02.316783+00', 'ok', '31a0d2e1-4da0-4f4d-8122-3d7327ecddcf', 'Retail Broking', NULL, NULL, '2026-03-04 08:29:53.950921+00', NULL, '2026-02-04 20:16:20.600623+00', '2026-03-16 22:08:02.347945+00', NULL);
INSERT INTO public.service_requests VALUES ('32a9e233-b6be-46b7-9a12-16c4a1c990f0', 'SR-2026-0071', 'Margin pledge request for F&O position', 'Client has raised a formal request regarding pledge request. This requires immediate attention within SLA timelines. Compliance verification and documentation may be needed. The client relationship team has been notified.', 'Pledge Request', 'Verification', 'Branch', 'Critical', 'Closed', '2026-02-28 07:01:51.580938+00', 'breached', '34b07185-5b74-483f-a3e1-6a3a195b62f9', 'Corporate Broking', NULL, NULL, NULL, '2026-03-22 05:36:30.496667+00', '2026-03-10 04:50:29.100685+00', '2026-03-22 05:36:30.496667+00', NULL);
INSERT INTO public.service_requests VALUES ('8d9def6e-504d-4c43-8606-00a378bc3288', 'SR-5911', 'test SR', 'test SR1', 'Account Issues', 'Account Closure Request', 'Email', 'High', 'Open', '2026-03-23 08:41:11.156+00', 'ok', '2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'Retail Broking', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', 'dc8bda71-7158-46aa-b355-19e1bb90cf34', NULL, NULL, '2026-03-22 08:41:11.157655+00', '2026-03-22 08:41:11.157655+00', NULL);
INSERT INTO public.documents VALUES ('9e9d299f-0ecb-4974-b36a-a04bb856946d', 'DOC-0016', 'TDS_Certificate_Ramesh_FY26.pdf', 'TDS Certificate', '02960a68-f838-4c70-a20e-f162d6587fd3', NULL, 'Retail Broking', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('31cfef09-c3c0-40f2-9a9a-11ce3c2c71e0', 'DOC-0001', 'Settlement_Record_ORD289712.pdf', 'Settlement Record', 'c96cd467-53b3-4d2a-80de-bf9cd0fa743a', NULL, 'Institutional Equities', 'Active', 'v1.1', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('379b767f-3898-49e8-a2ae-4c0f3fe3a04c', 'DOC-0017', 'NAV_Reconciliation_DrVenkat.xlsx', 'Reconciliation', '34b07185-5b74-483f-a3e1-6a3a195b62f9', NULL, 'AIF', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('a45a3be1-98df-46be-b91d-84a35885ff81', 'DOC-0002', 'Cancelled_Cheque_ICICI.pdf', 'Bank Document', '7fe5cecc-40b7-4af1-aa5c-ae27d6468fd0', NULL, 'Retail Broking', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('15f6ad1d-af51-472d-a047-0792fbfed2e5', 'DOC-0003', 'KYC_Renewal_Kavita_Singh.pdf', 'KYC Document', '44b5a32c-3922-4fb7-88ab-049dd99591c6', NULL, 'Retail Broking', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('101afd70-e2d7-4887-ae50-5cdb6f6f8df0', 'DOC-0004', 'FATCA_Form_Maharashtra_Pension.pdf', 'FATCA Certificate', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', NULL, 'AIF', 'Pending', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('c8485825-5ce4-4ce3-83c0-12e19b80476e', 'DOC-0005', 'PMLA_AuditDoc_JSW_Steel.pdf', 'Compliance Document', '7473fd33-2dfd-4246-8945-cfee0701df78', NULL, 'Corporate Broking', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('550359ef-5b6b-4155-96eb-145017dc4344', 'DOC-0019', 'Regulatory_Intimation_JSW.pdf', 'Compliance Document', '7473fd33-2dfd-4246-8945-cfee0701df78', NULL, 'Corporate Broking', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('e41a40fd-155d-47e5-b569-767ea566fc6e', 'DOC-0006', 'Information_Memorandum_RIL.pdf', 'Information Memo', '5e94cbb3-d7ac-488c-84fb-418c87258579', NULL, 'Investment Banking', 'Active', 'v2.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('02d5d47c-68b1-4cbe-ba7d-c4ade49b320c', 'DOC-0007', 'Brokerage_Dispute_Ramesh_Mar18.xlsx', 'Billing Statement', '02960a68-f838-4c70-a20e-f162d6587fd3', NULL, 'Retail Broking', 'Pending', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('74f0fdbb-e5ba-49c4-b93a-5cda98e9b488', 'DOC-0018', 'Risk_Profile_Asha_Mehta.pdf', 'KYC Document', '6f55e12a-b270-4adb-a940-86b44d10695b', NULL, 'Retail Broking', 'Pending', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('202f4883-84a2-4176-b135-4170e9029429', 'DOC-0008', 'AML_Compliance_Patel_Trust.pdf', 'AML Document', 'cfdf7e3d-ab88-4a0d-af9b-de69e9da6f63', NULL, 'AIF', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('c0f85756-40b5-4da4-b510-0943c0c5a971', 'DOC-0009', 'Account_Freeze_Notice_RIL.pdf', 'Legal Notice', '5e94cbb3-d7ac-488c-84fb-418c87258579', NULL, 'Investment Banking', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('44376836-a1c1-4400-8b18-1958ae769107', 'DOC-0010', 'PL_Report_Nair_Family_FY26.pdf', 'P&L Report', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', NULL, 'AIF', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('911e0977-cd54-4863-af03-f52b1202272e', 'DOC-0011', 'Wrong_Trade_Report_JSW_Mar20.pdf', 'Trade Report', '7473fd33-2dfd-4246-8945-cfee0701df78', NULL, 'Corporate Broking', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('2392f729-72dc-410b-8d1e-6cc060cd585f', 'DOC-0012', 'SEBI_ShowCause_TataSons.pdf', 'Regulatory Notice', 'e1aaf267-33c3-4a46-9680-74b361ebedc5', NULL, 'Investment Banking', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('4d13329f-ce51-4405-b65e-b0ef54d0d85e', 'DOC-0013', 'Block_Deal_Confirmation_HDFC.pdf', 'Trade Confirmation', 'a01d1843-1b34-4f9a-8775-214be2239a15', NULL, 'Institutional Equities', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('d7467a7b-8aa0-412f-a59c-489643f57d64', 'DOC-0014', 'Compliance_Cert_GIC.pdf', 'Compliance Document', '6646a80f-d3ae-48a0-a338-362fce7f1bec', NULL, 'Institutional Equities', 'Active', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('ce19f9b9-88ce-4fb2-8a70-f67336061204', 'DOC-0015', 'PoA_Hero_MotoCorp_Updated.pdf', 'Power of Attorney', '92e65ba6-08d9-45a5-9d1d-2e3889ec82ca', NULL, 'Corporate Broking', 'Pending', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.documents VALUES ('bba43c74-215f-4f03-8cd7-d327fc8e811a', 'DOC-0020', 'Bonus_Shares_LT_Finance.pdf', 'Corporate Action', '09623c83-c60b-4f87-82bb-93814a760928', NULL, 'Corporate Broking', 'Pending', 'v1.0', NULL, NULL, 'aaaa0001-0000-0000-0000-000000000008', '2026-03-21 21:19:55.815476+00', '2026-03-21 21:19:55.815476+00');
INSERT INTO public.lead_workflows VALUES ('7ffb45a3-3e4d-446b-b8e4-1290317dd3f1', 'Retail Broking', 'lead', 1, 'prospect', 'Prospect', 'bg-slate-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('01bd641d-eafa-4441-89ee-58784d8fe6a4', 'Retail Broking', 'lead', 2, 'contacted', 'Contacted', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('10c473b3-c8da-4208-8855-32e4eb1aa8b8', 'Retail Broking', 'lead', 3, 'demo', 'Demo Done', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('d0eb94e4-a13c-4eab-8a00-0ce7e23e7969', 'Retail Broking', 'lead', 4, 'account_opening', 'Account Opening', 'bg-violet-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('0ff6fdd4-e476-4c70-9aa5-23414cbcd493', 'Retail Broking', 'lead', 5, 'activated', 'Activated', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('468465a9-de3e-4235-8b77-43abc40960cc', 'Retail Broking', 'lead', 6, 'lost', 'Lost', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('e0cebe24-b20f-421b-83e7-f84fda729993', 'Retail Broking', 'deal', 1, 'active', 'Active', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('a6f4e1e3-8622-442e-8a0b-d62e4cee953a', 'Retail Broking', 'deal', 2, 'executing', 'Executing', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('d97972fe-40a8-476d-897a-454fdb9fbeb1', 'Retail Broking', 'deal', 3, 'executed', 'Executed', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('732f0d9d-af09-4fad-a118-56710e49bc40', 'Retail Broking', 'deal', 4, 'settled', 'Settled', 'bg-green-600', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('397ccb87-23ad-4943-a5b6-53ca14bf8f99', 'Retail Broking', 'deal', 5, 'cancelled', 'Cancelled', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('1de6868c-0ce9-4628-bfc8-0a90c596cfad', 'Corporate Broking', 'lead', 1, 'identified', 'Identified', 'bg-slate-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('6ab62f70-777b-4cdb-8394-4867340a6e03', 'Corporate Broking', 'lead', 2, 'pitch_scheduled', 'Pitch Scheduled', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('de81fa30-3c48-41b2-8521-2fb27e4772fe', 'Corporate Broking', 'lead', 3, 'proposal_sent', 'Proposal Sent', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('a2f6cfc2-717d-48ca-846d-37e13bb7455f', 'Corporate Broking', 'lead', 4, 'negotiation', 'Negotiation', 'bg-amber-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('6184e372-8851-472b-ba28-acbac0ea5ecc', 'Corporate Broking', 'lead', 5, 'mandate_won', 'Mandate Won', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('cada94eb-0006-49bb-bd6a-2d15c42d9bdd', 'Corporate Broking', 'lead', 6, 'lost', 'Lost', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('b69296de-1196-4e33-b40b-af45d5709218', 'Corporate Broking', 'deal', 1, 'term_sheet', 'Term Sheet', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('f4bc0ada-2166-418c-a5b4-4329aa318a2f', 'Corporate Broking', 'deal', 2, 'due_diligence', 'Due Diligence', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('da44894d-91a4-45a8-b830-6c69b763241d', 'Corporate Broking', 'deal', 3, 'mandate_signed', 'Mandate Signed', 'bg-violet-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('717e4906-2d43-4e23-8cd1-cfe31c856b7d', 'Corporate Broking', 'deal', 4, 'executing', 'Executing', 'bg-amber-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('d4fcb7a6-dfff-4bda-8bbb-044dfa2acf73', 'Corporate Broking', 'deal', 5, 'closed_won', 'Closed Won', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('bdb12291-bfb5-4fd7-ac86-6a339c009719', 'Corporate Broking', 'deal', 6, 'closed_lost', 'Closed Lost', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('79a251dd-ebec-4375-b18a-891cda835a87', 'Investment Banking', 'lead', 1, 'target_identified', 'Target Identified', 'bg-slate-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('92c9c845-2f6e-489f-9032-a68857928fb7', 'Investment Banking', 'lead', 2, 'initial_meeting', 'Initial Meeting', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('2ebc2c64-919f-4a6a-b9a3-f5d23b350e8b', 'Investment Banking', 'lead', 3, 'nda_signed', 'NDA Signed', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('f2e9903a-c03d-477f-b321-413dac97b5f9', 'Investment Banking', 'lead', 4, 'mandate_discussion', 'Mandate Discussion', 'bg-violet-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('f8a0f220-777c-4ae5-859b-a243f3849f03', 'Investment Banking', 'lead', 5, 'mandate_won', 'Mandate Won', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('0f035962-3e38-4ec3-9791-ff2b89f3b688', 'Investment Banking', 'lead', 6, 'no_mandate', 'No Mandate', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('e8dac105-e666-4dc3-b018-e0f1609a8d32', 'Investment Banking', 'deal', 1, 'mandate_signed', 'Mandate Signed', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('1a88d0e0-50a4-4a3a-b397-7a72ab239f40', 'Investment Banking', 'deal', 2, 'due_diligence', 'Due Diligence', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('fd604942-a5b7-4cb0-b173-e0c05007d36c', 'Investment Banking', 'deal', 3, 'marketing', 'Marketing/Roadshow', 'bg-violet-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('30ee5daf-5b73-4fd8-a613-82523715c10d', 'Investment Banking', 'deal', 4, 'transaction_execution', 'Transaction Execution', 'bg-amber-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('216ff699-72c0-43c1-80c3-2155c38b6d4d', 'Investment Banking', 'deal', 5, 'completed', 'Completed', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('74c8ae0e-2fbf-4eeb-8b49-d7b76558e46f', 'Investment Banking', 'deal', 6, 'aborted', 'Aborted', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('729a3476-764a-42ef-a1cb-dcd64efd05d8', 'AIF', 'lead', 1, 'prospect', 'Prospect', 'bg-slate-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('e5f285d8-c3a4-4a22-9d75-d685f8d10427', 'AIF', 'lead', 2, 'presentation', 'Presentation', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('b5fcd65a-4fe6-480e-8fab-04e7dd43ad18', 'AIF', 'lead', 3, 'due_diligence', 'Due Diligence', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('96358b0c-0604-44ec-8d7d-35879ec7cf8b', 'AIF', 'lead', 4, 'commitment', 'Commitment Received', 'bg-violet-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('d6b4b6f8-1021-4e89-bed4-35e622ad446c', 'AIF', 'lead', 5, 'invested', 'Invested', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('32efec33-4eeb-4a35-8711-63ebd07e893c', 'AIF', 'lead', 6, 'declined', 'Declined', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('cdb25daa-eab0-46f2-8855-5c1a213050f8', 'AIF', 'deal', 1, 'fundraising', 'Fundraising', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('52a49850-051b-4dc5-b4b7-d6b2754e60e5', 'AIF', 'deal', 2, 'commitment_received', 'Commitment Received', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('a84f6444-161e-4d2f-9163-cb5aa1c8e2dd', 'AIF', 'deal', 3, 'capital_call', 'Capital Call', 'bg-violet-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('12bcbefd-f98e-4bbc-add6-08b3f06d8ec5', 'AIF', 'deal', 4, 'invested', 'Invested', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('b196821f-befe-412c-936b-b9c9aa00a69d', 'AIF', 'deal', 5, 'exited', 'Exited', 'bg-teal-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('42405ba0-19b7-44eb-999c-a9313d722e48', 'AIF', 'deal', 6, 'cancelled', 'Cancelled', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('25f8c56d-5c7f-40c8-a8ae-bf195498ca30', 'Institutional Equities', 'lead', 1, 'prospect', 'Prospect', 'bg-slate-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('d542528f-b1fe-4518-a663-3896f52029a4', 'Institutional Equities', 'lead', 2, 'coverage_initiated', 'Coverage Initiated', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('6fac9ba1-0cbb-4dbc-aae6-dd700ac7f5ae', 'Institutional Equities', 'lead', 3, 'research_shared', 'Research Shared', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('9b40cda1-84bf-4a5c-a888-eebfe4a23b8c', 'Institutional Equities', 'lead', 4, 'first_trade', 'First Trade', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('e86d95cc-c37b-4158-b26a-319355897092', 'Institutional Equities', 'lead', 5, 'dormant', 'Dormant', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('9f6f7139-61d4-47df-912b-3f9b7cd567d6', 'Institutional Equities', 'deal', 1, 'active', 'Active', 'bg-blue-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('48391f39-4c2a-4fc4-807e-15f3260a8fdf', 'Institutional Equities', 'deal', 2, 'block_deal', 'Block Deal', 'bg-indigo-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('00429590-1380-4b0a-9e4c-aaebbbfc2f56', 'Institutional Equities', 'deal', 3, 'bulk_deal', 'Bulk Deal', 'bg-violet-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('a05a99f0-c9a3-482e-9e8f-adb41362ca96', 'Institutional Equities', 'deal', 4, 'completed', 'Completed', 'bg-emerald-500', true, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('b2105990-c13c-428c-a1c6-17161fda85bf', 'Institutional Equities', 'deal', 5, 'partially_executed', 'Partially Executed', 'bg-amber-500', false, false, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.lead_workflows VALUES ('d9af7840-1ce7-4e39-a32e-6abc8342fd45', 'Institutional Equities', 'deal', 6, 'cancelled', 'Cancelled', 'bg-red-500', false, true, true, '2026-03-22 05:13:03.528575+00');
INSERT INTO public.leads VALUES ('2663f05f-0f13-4f45-a25e-e40efedc4b99', 'RB-1021', 'Suresh Rathi', 'Retail Broking', 'interest', 'Medium', '₹15L AUM', 'Walk-in', 'aaaa0001-0000-0000-0000-000000000002', 'd1accb26-e8cb-4ceb-9cd6-d74649ce3fdc', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('7c99110a-3607-46dc-999a-88a0fd34e376', 'RB-1022', 'Neeta Desai', 'Retail Broking', 'kyc', 'Low', '₹8L AUM', 'App', 'aaaa0001-0000-0000-0000-000000000002', '2da0f983-2439-4f7b-930f-1f90ee6b22a1', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('f074a0c1-46bc-4213-83d1-3fa25667e3af', 'RB-1023', 'Ajay Choudhary', 'Retail Broking', 'kyc', 'High', '₹45L AUM', 'Referral', 'aaaa0001-0000-0000-0000-000000000002', '97b65aff-ca7c-4e9b-b9ac-6b499947d83e', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('f0704702-63bb-4824-a6af-a11c742d4255', 'RB-1024', 'Kavita Singh', 'Retail Broking', 'docs', 'Medium', '₹22L AUM', 'Campaign', 'aaaa0001-0000-0000-0000-000000000002', '44b5a32c-3922-4fb7-88ab-049dd99591c6', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('5d3d50d1-a232-40d7-a41b-f33b8e43610f', 'RB-1025', 'Pradeep Kumar', 'Retail Broking', 'opening', 'High', '₹60L AUM', 'Referral', 'aaaa0001-0000-0000-0000-000000000002', 'c404cf93-5608-4947-b2bd-562057db12f9', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('33702601-2350-4ce9-b076-b21c8e50f12d', 'RB-1026', 'Asha Mehta', 'Retail Broking', 'demat', 'High', '₹35L AUM', 'Branch', 'aaaa0001-0000-0000-0000-000000000001', '6f55e12a-b270-4adb-a940-86b44d10695b', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('78c9e0ac-ace8-42cb-8294-d740c21b87c4', 'RB-1027', 'Girish Nair', 'Retail Broking', 'traded', 'Medium', '₹12L AUM', 'App', 'aaaa0001-0000-0000-0000-000000000002', '7fe5cecc-40b7-4af1-aa5c-ae27d6468fd0', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('4b3b2a42-dfcc-4297-8126-7926aabf32be', 'RB-1028', 'Ravi Pillai', 'Retail Broking', 'interest', 'Low', '₹28L AUM', 'Campaign', 'aaaa0001-0000-0000-0000-000000000001', '685937f0-3e0b-49c1-9be9-a8eba03fb3b3', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('66f373f0-8cb3-457c-a943-7fa78dae872d', 'RB-1029', 'Shalini Rao', 'Retail Broking', 'kyc', 'High', '₹55L AUM', 'Referral', 'aaaa0001-0000-0000-0000-000000000001', '1a3dd2bc-7d1f-4c6e-bfde-7df8c028b7bc', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('c44a1558-4668-428e-9f30-44c8eaca8b97', 'RB-1030', 'Mohit Sharma', 'Retail Broking', 'docs', 'Medium', '₹18L AUM', 'Walk-in', 'aaaa0001-0000-0000-0000-000000000002', '67c900b4-eefd-4bbd-84c0-6b4950fc5287', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('88ce02d2-b138-457b-b4a7-6b38adc7fbb5', 'RB-1031', 'Pooja Iyer', 'Retail Broking', 'opening', 'Low', '₹9L AUM', 'App', 'aaaa0001-0000-0000-0000-000000000002', '40b03ab0-3316-417b-8cce-684f8e11ebb4', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('f8732466-7e03-4c63-ad32-0368408401df', 'RB-1032', 'Rajan Pillai', 'Retail Broking', 'demat', 'High', '₹72L AUM', 'Referral', 'aaaa0001-0000-0000-0000-000000000001', '6d5c0cf2-033d-4744-ac55-6724ba8c3ada', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('0454ac30-b5b0-4c1b-8d7f-23c2ae42c031', 'RB-1033', 'Ashok Verma', 'Retail Broking', 'traded', 'Medium', '₹31L AUM', 'Branch', 'aaaa0001-0000-0000-0000-000000000001', 'd3c386f6-c5ff-4bd0-b3c4-d674374c0a53', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('1e1fcfb2-6d48-493d-b7ef-538a6bfa6716', 'RB-1034', 'Deepa Menon', 'Retail Broking', 'interest', 'Low', '₹14L AUM', 'Campaign', 'aaaa0001-0000-0000-0000-000000000002', 'd271e297-fbb8-4d46-ad23-e59f097f0e67', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('e38f889d-8476-4324-916b-77ebf144831b', 'RB-1035', 'Vinod Shetty', 'Retail Broking', 'kyc', 'Medium', '₹42L AUM', 'App', 'aaaa0001-0000-0000-0000-000000000002', '7151fd93-a144-4c5a-94f4-1ad7fb2bef82', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('babf75bb-dcb8-4bb3-9e3a-4c4005eb339d', 'RB-1036', 'Ananya Krishnan', 'Retail Broking', 'docs', 'High', '₹88L AUM', 'Referral', 'aaaa0001-0000-0000-0000-000000000001', 'a26fcba3-a072-48f4-8b04-a3de29ac3753', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('42774a55-b136-4dda-aec6-eabc7fb3ef15', 'CB-0821', 'L&T Finance Ltd', 'Corporate Broking', 'identified', 'High', '₹200Cr block', 'BD', 'aaaa0001-0000-0000-0000-000000000003', '09623c83-c60b-4f87-82bb-93814a760928', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('d7c276cf-b395-4511-8ac4-abde38aa3281', 'CB-0822', 'JSW Steel Ltd', 'Corporate Broking', 'qualified', 'High', '₹85Cr bulk', 'Conference', 'aaaa0001-0000-0000-0000-000000000003', '7473fd33-2dfd-4246-8945-cfee0701df78', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('9b8e297b-d64d-444f-b97b-a8c2898af99c', 'CB-0823', 'Bajaj Holdings', 'Corporate Broking', 'credit', 'Critical', '₹150Cr clearing', 'Referral', 'aaaa0001-0000-0000-0000-000000000003', 'b9d07fca-77a2-42cd-bcb8-ef5ff124b829', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('1bc04ce7-f537-4889-9348-ddacfb268439', 'CB-0824', 'Hero MotoCorp', 'Corporate Broking', 'legal', 'Medium', '₹45Cr block', 'BD', 'aaaa0001-0000-0000-0000-000000000004', '92e65ba6-08d9-45a5-9d1d-2e3889ec82ca', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('4ca758c2-eaa9-417d-95e4-6f732b07123e', 'CB-0825', 'Adani Enterprises', 'Corporate Broking', 'live', 'Critical', '₹320Cr clearing', 'Inbound', 'aaaa0001-0000-0000-0000-000000000004', 'c96cd467-53b3-4d2a-80de-bf9cd0fa743a', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('c2653c49-a354-453f-9508-b2185c830a23', 'CB-0826', 'Tata Motors', 'Corporate Broking', 'identified', 'High', '₹180Cr bulk', 'BD', 'aaaa0001-0000-0000-0000-000000000003', 'e1aaf267-33c3-4a46-9680-74b361ebedc5', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('a3adc271-319b-43f8-af98-cf89ce09cfa0', 'CB-0827', 'Mahindra Finance', 'Corporate Broking', 'qualified', 'Medium', '₹90Cr block', 'Conference', 'aaaa0001-0000-0000-0000-000000000004', '09623c83-c60b-4f87-82bb-93814a760928', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('089c7f54-acfb-47ee-90e8-f3c872809fc5', 'IB-3041', 'Tata Sons — M&A', 'Investment Banking', 'pitch', 'High', '₹4,800Cr deal', 'Referral', 'aaaa0001-0000-0000-0000-000000000005', 'e1aaf267-33c3-4a46-9680-74b361ebedc5', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('1b2e633d-2cfd-42e5-a58a-65ae8dc140c7', 'IB-3042', 'HDFC Life — QIP', 'Investment Banking', 'nda', 'Critical', '₹1,200Cr ECM', 'Inbound', 'aaaa0001-0000-0000-0000-000000000005', 'a01d1843-1b34-4f9a-8775-214be2239a15', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('9c3739b4-73b7-4c44-b23f-d670a98ba4f8', 'IB-3043', 'Reliance Infra — Restr.', 'Investment Banking', 'mandate', 'Critical', '₹6,500Cr', 'BD', 'aaaa0001-0000-0000-0000-000000000005', '5e94cbb3-d7ac-488c-84fb-418c87258579', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('5feeb607-f972-4617-9e35-80fde8db0c9d', 'IB-3044', 'Sun Pharma — PE', 'Investment Banking', 'dd', 'High', '₹900Cr PE', 'Network', 'aaaa0001-0000-0000-0000-000000000005', NULL, 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('f9085d68-eb15-422b-9dde-58a29c5a4282', 'IB-3045', 'Godrej Properties — NCD', 'Investment Banking', 'docs', 'High', '₹500Cr DCM', 'Repeat', 'aaaa0001-0000-0000-0000-000000000005', NULL, 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('ea6af389-189b-4903-bbe1-d1ed05568f84', 'IB-3046', 'Vedanta — M&A Target', 'Investment Banking', 'closure', 'Critical', '₹12,000Cr', 'Referral', 'aaaa0001-0000-0000-0000-000000000005', NULL, 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('6dacd58e-e4e1-4c90-b0af-09864befb479', 'AIF-0441', 'Ramesh Agarwal Family', 'AIF', 'identified', 'High', '₹10Cr', 'RM Network', 'aaaa0001-0000-0000-0000-000000000006', '02960a68-f838-4c70-a20e-f162d6587fd3', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('e9b45c61-1f8b-4812-900b-c5d8447c7620', 'AIF-0442', 'Sinha Family Office', 'AIF', 'suitability', 'High', '₹25Cr', 'Referral', 'aaaa0001-0000-0000-0000-000000000006', NULL, 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('db7c0ce5-4158-416e-a65c-2df37541547f', 'AIF-0443', 'Dr. Venkat Krishnan', 'AIF', 'kyc', 'Medium', '₹5Cr', 'Conference', 'aaaa0001-0000-0000-0000-000000000006', '34b07185-5b74-483f-a3e1-6a3a195b62f9', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('5777e606-2cfc-488b-88d9-e68b90e334e9', 'AIF-0444', 'Patel Enterprises Trust', 'AIF', 'subscription', 'Critical', '₹50Cr Cat II', 'BD', 'aaaa0001-0000-0000-0000-000000000006', 'cfdf7e3d-ab88-4a0d-af9b-de69e9da6f63', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('70caa327-23de-4f7c-adbc-bd2a8a3bfab2', 'AIF-0445', 'Nair Family Office', 'AIF', 'commitment', 'High', '₹15Cr Cat III', 'Referral', 'aaaa0001-0000-0000-0000-000000000006', '0d261bcb-96b1-456f-9212-6bf3a00cae7d', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('e4719106-16e1-4077-aa1b-2d719271d4cc', 'AIF-0446', 'Maharashtra Pension Fund', 'AIF', 'called', 'Critical', '₹100Cr Cat II', 'Tender', 'aaaa0001-0000-0000-0000-000000000006', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('114b12b5-972e-44f8-806b-518ac89097a3', 'IE-0211', 'GIC Singapore', 'Institutional Equities', 'identified', 'High', '₹800Cr AUM', 'IR', 'aaaa0001-0000-0000-0000-000000000007', '6646a80f-d3ae-48a0-a338-362fce7f1bec', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('8410cea0-ca95-46ae-ad22-b36f0ee26a26', 'IE-0212', 'UTI Mutual Fund', 'Institutional Equities', 'regulatory', 'High', '₹250Cr brok', 'Conference', 'aaaa0001-0000-0000-0000-000000000007', 'a12bff99-1e25-49a8-81fb-756db65655ca', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('2d904979-a0c5-4ed6-81ca-d8ad97f7c14c', 'IE-0213', 'LIC of India', 'Institutional Equities', 'research', 'Critical', '₹1,200Cr', 'BD', 'aaaa0001-0000-0000-0000-000000000007', NULL, 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('66843715-9e78-4ff7-959a-9c80e6919713', 'IE-0214', 'ICICI Prudential MF', 'Institutional Equities', 'trade', 'High', '₹400Cr brok', 'Repeat', 'aaaa0001-0000-0000-0000-000000000007', 'b16a5cca-1751-4d64-a113-02e9a3b32033', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('300f9dc9-08ea-4d33-b197-56c1e95f6543', 'IE-0215', 'Fidelity International', 'Institutional Equities', 'active', 'High', '₹600Cr FII', 'Global IR', 'aaaa0001-0000-0000-0000-000000000007', '5fee0ed4-b9d7-43d2-826b-e2f3ea039ea0', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('93451b9d-d001-4fd3-b200-7d731d0437e4', 'IE-0216', 'Norges Bank', 'Institutional Equities', 'active', 'Medium', '₹450Cr', 'Global IR', 'aaaa0001-0000-0000-0000-000000000007', 'db7135a2-bca9-47a5-b080-a1e3860da557', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('7210d3cf-1d8d-4f7f-b823-0df4f369b29a', 'AIF-0447', 'Birla Family Office', 'AIF', 'suitability', 'High', '₹30Cr Cat III', 'Referral', 'aaaa0001-0000-0000-0000-000000000006', '266a3ae6-ebbd-49ea-b219-e0116e5c0af4', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('14134f8a-991c-4639-9178-97027a5e1117', 'AIF-0448', 'Pinky Agarwal — Cat I', 'AIF', 'identified', 'Medium', '₹3Cr Cat I', 'RM Network', 'aaaa0001-0000-0000-0000-000000000006', '5984f8c2-7d5f-425a-823b-60452871472a', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('84cb23cf-761d-42e6-b93a-a54dabfa44d2', 'CB-0828', 'ICICI Securities', 'Corporate Broking', 'qualified', 'Medium', '₹60Cr block', 'Inbound', 'aaaa0001-0000-0000-0000-000000000004', '7d2f6783-f5f0-45e9-bb15-34e503794961', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('b752a7af-729a-4068-ace0-ae305f59b009', 'RB-1037', 'Sunita Mehta — IPO', 'Retail Broking', 'opening', 'High', '₹40L AUM', 'Branch', 'aaaa0001-0000-0000-0000-000000000002', 'ffb2315f-da3c-4ead-8412-8d3da1622edb', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('fc74c54c-aefb-473c-9b78-1e7a79dc7086', 'RB-1038', 'Ramesh Agarwal — Equity', 'Retail Broking', 'traded', 'High', '₹150L AUM', 'Referral', 'aaaa0001-0000-0000-0000-000000000001', '02960a68-f838-4c70-a20e-f162d6587fd3', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('4a23fcfe-0559-4401-808c-bf58a016a967', 'IE-0217', 'Temasek Holdings', 'Institutional Equities', 'trade', 'High', '₹300Cr', 'Global IR', 'aaaa0001-0000-0000-0000-000000000007', 'f1a9a070-936b-4b96-9a92-03a6e1b65943', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('3d704b50-eba0-4049-b28c-ea8814e0ace0', 'IE-0218', 'SBI Mutual Fund', 'Institutional Equities', 'regulatory', 'Medium', '₹500Cr', 'Conference', 'aaaa0001-0000-0000-0000-000000000007', '0f1b1bb8-eac4-41f6-9c2e-25756d470403', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('364ef972-b36f-4c40-9015-5f77314ddb6b', 'CB-0829', 'HDFC Life — Block', 'Corporate Broking', 'credit', 'High', '₹100Cr block', 'Inbound', 'aaaa0001-0000-0000-0000-000000000003', 'a01d1843-1b34-4f9a-8775-214be2239a15', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.leads VALUES ('7c27e327-8062-426e-b0ed-2dcfc39e4180', 'IB-3047', 'Maharashtra Pension IPO', 'Investment Banking', 'nda', 'High', '₹2,000Cr', 'BD', 'aaaa0001-0000-0000-0000-000000000005', '14f52247-2d00-43b5-a8e1-40fa8b8b29cd', 'Active', '2026-03-21 21:16:32.010023+00', NULL, NULL, '2026-03-21 21:16:32.010023+00', '2026-03-21 21:16:32.010023+00');
INSERT INTO public.m365_config VALUES ('030a6830-f28f-4d35-ba82-50bef060f626', '88188a79-0848-40b7-9865-34d7681e0359', '06e6f168-9bd5-4af6-b696-40b0c800610f', NULL, 'https://450160ff-bccf-40d4-a872-18b0a0037582-00-2gmbey5lrffbp.worf.replit.dev/api/auth/m365/callback', 'niytri.com', true, true, 1, 'admin@niytri.com', '2026-03-22 08:31:00.544547+00', 'admin@niytri.com', false, 'smtp.office365.com', 587, 'admin@niytri.com', NULL, 'NIYTRI CRM', true, 5, false);
INSERT INTO public.sla_config VALUES ('573f30bd-f3ba-4bd6-bea0-f32fd90f0e3a', 'Account Issues', 24, 80, 'CS Team', 12.0, 'CS Head', 20.0, 'Business Head', 48, '2026-03-21 19:25:06.690373+00', '2026-03-21 19:25:06.690373+00');
INSERT INTO public.sla_config VALUES ('edb0118c-dee2-4fbc-8c4e-e6973cab1da9', 'Trade Issues', 4, 75, 'CS Team', 2.0, 'Dealer / Ops', 3.0, 'Compliance Officer', 24, '2026-03-21 19:25:06.696739+00', '2026-03-21 19:25:06.696739+00');
INSERT INTO public.sla_config VALUES ('d8698355-d06d-4d6d-b1e7-6a754bf7ab9a', 'KYC / Documentation', 48, 85, 'KYC Team', 24.0, 'Compliance Officer', 40.0, 'Business Head', 72, '2026-03-21 19:25:06.699143+00', '2026-03-21 19:25:06.699143+00');
INSERT INTO public.sla_config VALUES ('81e87794-e77a-4201-b6f8-13ef09510a35', 'Billing & Charges', 24, 80, 'Finance Team', 12.0, 'CS Head', 20.0, 'Business Head', 48, '2026-03-21 19:25:06.701785+00', '2026-03-21 19:25:06.701785+00');
INSERT INTO public.sla_config VALUES ('6092b33d-6693-4b14-9eea-195b12f9386c', 'Technical Issues', 4, 70, 'Tech Support', 2.0, 'Tech Lead', 3.0, 'CTO', 24, '2026-03-21 19:25:06.704821+00', '2026-03-21 19:25:06.704821+00');
INSERT INTO public.sla_config VALUES ('1f902388-9bd5-454e-b057-6ee367fa795e', 'Compliance', 2, 90, 'Compliance Officer', 1.0, 'Risk Head', 1.5, 'MD / CEO', 12, '2026-03-21 19:25:06.707421+00', '2026-03-21 19:25:06.707421+00');
INSERT INTO public.sla_config VALUES ('4aa2ab71-d8e1-4e93-b8ef-4cd7d60f001a', 'Reporting', 24, 80, 'CS Team', 12.0, 'Ops Team', 20.0, 'CS Head', 48, '2026-03-21 19:25:06.710776+00', '2026-03-21 19:25:06.710776+00');
INSERT INTO public.user_roles VALUES ('6d70430a-f574-400f-8b05-84641e728fe9', 'Super Admin', 'All', 'Full access to all verticals, admin, and configuration', '{"AI": true, "Admin": true, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('fe5e4a34-77ea-4088-ad06-a3363b1ee007', 'AIF Admin', 'AIF', 'Full admin within AIF vertical', '{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('bf0dc04e-0da9-4fe1-873a-74a20a48d484', 'Retail Admin', 'Retail Broking', 'Full admin within Retail Broking vertical', '{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('c054b0a8-7990-4bd9-91b1-13a44cf10c57', 'Corporate Admin', 'Corporate Broking', 'Full admin within Corporate Broking vertical', '{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('78b8b278-2133-49cc-ad4e-f212462f1cc3', 'IB Admin', 'Investment Banking', 'Full admin within Investment Banking vertical', '{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('6c72385f-355f-4854-a099-1ff6e1cb58d2', 'IE Admin', 'Institutional Equities', 'Full admin within Institutional Equities vertical', '{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('7918e290-5e1a-4e36-8654-2315822467f0', 'Business Head', 'Assigned', 'Read-only overview of assigned verticals', '{"AI": false, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": false}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('c1045e05-3fef-47c0-8188-c474a8b31f76', 'Senior RM', 'Assigned', 'Full RM access for assigned vertical', '{"AI": false, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": false, "ServiceRequests": false}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('65ef6d4b-6e4b-47f3-bc0c-c58fc9e36a22', 'Junior RM', 'Assigned', 'Limited RM access to own records', '{"AI": false, "Admin": false, "Deals": false, "Leads": true, "Clients": true, "Reports": false, "Dashboard": true, "Compliance": false, "ServiceRequests": false}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('9d9e41b1-55d5-46c1-bcae-2f10d8009a23', 'Compliance Officer', 'All', 'Read-only compliance view across all verticals', '{"AI": false, "Admin": false, "Deals": true, "Leads": false, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": false}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('9fb7b850-a17f-4864-a453-f942afa66d99', 'Research Analyst', 'Institutional Equities', 'IE research coverage and client data', '{"AI": false, "Admin": false, "Deals": true, "Leads": false, "Clients": false, "Reports": true, "Dashboard": true, "Compliance": false, "ServiceRequests": false}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('3d4d9541-5716-4f1d-9dee-650e2a92016f', 'Dealer', 'Assigned', 'Execution-only access', '{"AI": false, "Admin": false, "Deals": true, "Leads": false, "Clients": false, "Reports": false, "Dashboard": true, "Compliance": false, "ServiceRequests": false}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('346d9e97-6569-4135-8169-b2ad70b01781', 'CS Head', 'All', 'Customer service management across all verticals', '{"AI": false, "Admin": false, "Deals": false, "Leads": false, "Clients": true, "Reports": false, "Dashboard": false, "Compliance": false, "ServiceRequests": true}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.user_roles VALUES ('41d92475-94ef-435a-a992-b0c745550de8', 'CS Agent', 'All', 'Frontline customer service agent', '{"AI": false, "Admin": false, "Deals": false, "Leads": false, "Clients": true, "Reports": false, "Dashboard": false, "Compliance": false, "ServiceRequests": true}', 'any', true, '2026-03-21 20:03:01.816961+00');
INSERT INTO public.verticals_config VALUES (1, 'Retail', 'Retail Broking', 'RB', true, 1, '2026-03-22 06:44:08.2069');
INSERT INTO public.verticals_config VALUES (2, 'Corporate', 'Corporate Broking', 'CB', true, 2, '2026-03-22 06:38:33.743651');
INSERT INTO public.verticals_config VALUES (3, 'IB', 'Investment Banking', 'IB', true, 3, '2026-03-22 06:38:33.743651');
INSERT INTO public.verticals_config VALUES (4, 'AIF', 'AIF', 'AIF', true, 4, '2026-03-22 06:38:33.743651');
INSERT INTO public.verticals_config VALUES (5, 'IE', 'Institutional Equities', 'IE', true, 5, '2026-03-22 06:38:33.743651');

SET session_replication_role = 'origin';
