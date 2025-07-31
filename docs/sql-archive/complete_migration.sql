--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

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

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: track_schedule_modification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_schedule_modification() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only track if dates changed
  IF (OLD.check_in IS DISTINCT FROM NEW.check_in OR 
      OLD.check_out IS DISTINCT FROM NEW.check_out) THEN
    
    -- Append to modification history
    NEW.modification_history = COALESCE(OLD.modification_history, '[]'::jsonb) || 
      jsonb_build_object(
        'timestamp', NOW(),
        'old_check_in', OLD.check_in,
        'old_check_out', OLD.check_out,
        'new_check_in', NEW.check_in,
        'new_check_out', NEW.check_out,
        'type', CASE 
          WHEN NEW.check_out > OLD.check_out THEN 'extension'
          WHEN NEW.check_out < OLD.check_out THEN 'reduction'
          ELSE 'modification'
        END
      );
    
    -- Mark as extended if checkout date increased
    IF NEW.check_out > OLD.check_out THEN
      NEW.is_extended = TRUE;
    END IF;
  END IF;
  
  -- Track cancellation timestamp
  IF OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
    NEW.cancelled_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    cleaner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: cleaners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleaners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    ics_url text,
    cleaning_fee numeric(10,2) DEFAULT 0,
    last_sync timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    timezone text DEFAULT 'America/New_York'::text,
    is_active_on_airbnb boolean DEFAULT true
);


--
-- Name: COLUMN listings.timezone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listings.timezone IS 'IANA timezone identifier for the listing location (e.g., America/New_York, Europe/London)';


--
-- Name: COLUMN listings.is_active_on_airbnb; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.listings.is_active_on_airbnb IS 'Whether this listing is currently active on Airbnb';


--
-- Name: schedule_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    cleaner_id uuid NOT NULL,
    booking_uid text,
    guest_name text,
    check_in date NOT NULL,
    check_out date NOT NULL,
    checkout_time time without time zone DEFAULT '11:00:00'::time without time zone,
    notes text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source text DEFAULT 'airbnb'::text,
    manual_rule_id uuid,
    is_completed boolean DEFAULT false,
    original_check_in date,
    original_check_out date,
    cancelled_at timestamp with time zone,
    modification_history jsonb DEFAULT '[]'::jsonb,
    is_extended boolean DEFAULT false,
    extension_notes text,
    previous_check_out date,
    extension_count integer DEFAULT 0,
    CONSTRAINT schedule_items_source_check CHECK ((source = ANY (ARRAY['airbnb'::text, 'manual'::text, 'manual_recurring'::text]))),
    CONSTRAINT schedule_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN schedule_items.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.source IS 'Source of the cleaning schedule: airbnb (from ICS), manual (one-time), or manual_recurring (from rule)';


--
-- Name: COLUMN schedule_items.manual_rule_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.manual_rule_id IS 'Reference to the manual schedule rule if this was generated from a recurring rule';


--
-- Name: COLUMN schedule_items.original_check_in; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.original_check_in IS 'Original check-in date when booking was first synced';


--
-- Name: COLUMN schedule_items.original_check_out; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.original_check_out IS 'Original check-out date when booking was first synced';


--
-- Name: COLUMN schedule_items.cancelled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.cancelled_at IS 'Timestamp when the booking was detected as cancelled';


--
-- Name: COLUMN schedule_items.modification_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.modification_history IS 'JSON array tracking all modifications to the booking';


--
-- Name: COLUMN schedule_items.is_extended; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.is_extended IS 'Flag indicating if the booking has been extended';


--
-- Name: COLUMN schedule_items.extension_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.extension_notes IS 'Notes about the extension';


--
-- Name: COLUMN schedule_items.previous_check_out; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.previous_check_out IS 'Previous check-out date before the most recent extension';


--
-- Name: COLUMN schedule_items.extension_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.schedule_items.extension_count IS 'Number of times this booking has been extended';


--
-- Name: cancelled_bookings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cancelled_bookings AS
 SELECT s.id,
    s.listing_id,
    s.cleaner_id,
    s.booking_uid,
    s.guest_name,
    s.check_in,
    s.check_out,
    s.checkout_time,
    s.notes,
    s.status,
    s.created_at,
    s.updated_at,
    s.source,
    s.manual_rule_id,
    s.is_completed,
    s.original_check_in,
    s.original_check_out,
    s.cancelled_at,
    s.modification_history,
    s.is_extended,
    s.extension_notes,
    l.name AS listing_name,
    l.timezone AS listing_timezone,
    c.name AS cleaner_name,
    c.phone AS cleaner_phone,
    c.email AS cleaner_email,
    EXTRACT(day FROM (s.cancelled_at - s.created_at)) AS days_before_cancellation
   FROM ((public.schedule_items s
     JOIN public.listings l ON ((s.listing_id = l.id)))
     JOIN public.cleaners c ON ((s.cleaner_id = c.id)))
  WHERE (s.status = 'cancelled'::text)
  ORDER BY s.cancelled_at DESC;


--
-- Name: cleaner_auth_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleaner_auth_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cleaner_id uuid NOT NULL,
    phone_number character varying(20) NOT NULL,
    code character varying(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cleaner_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleaner_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_item_id uuid NOT NULL,
    cleaner_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    cleanliness_rating character varying(10),
    notes text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT cleaner_feedback_cleanliness_rating_check CHECK (((cleanliness_rating)::text = ANY ((ARRAY['clean'::character varying, 'normal'::character varying, 'dirty'::character varying])::text[])))
);


--
-- Name: cleaner_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cleaner_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cleaner_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    device_info jsonb,
    expires_at timestamp with time zone NOT NULL,
    last_activity timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: extended_bookings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.extended_bookings AS
 SELECT s.id,
    s.listing_id,
    s.cleaner_id,
    s.booking_uid,
    s.guest_name,
    s.check_in,
    s.check_out,
    s.checkout_time,
    s.notes,
    s.status,
    s.created_at,
    s.updated_at,
    s.source,
    s.manual_rule_id,
    s.is_completed,
    s.original_check_in,
    s.original_check_out,
    s.cancelled_at,
    s.modification_history,
    s.is_extended,
    s.extension_notes,
    l.name AS listing_name,
    l.timezone AS listing_timezone,
    c.name AS cleaner_name,
    c.phone AS cleaner_phone,
    (s.check_out - s.original_check_out) AS extension_days
   FROM ((public.schedule_items s
     JOIN public.listings l ON ((s.listing_id = l.id)))
     JOIN public.cleaners c ON ((s.cleaner_id = c.id)))
  WHERE (s.is_extended = true)
  ORDER BY s.updated_at DESC;


--
-- Name: manual_schedule_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_schedule_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    cleaner_id uuid NOT NULL,
    schedule_type text NOT NULL,
    frequency text,
    days_of_week integer[],
    day_of_month integer,
    custom_interval_days integer,
    cleaning_time time without time zone DEFAULT '11:00:00'::time without time zone,
    start_date date NOT NULL,
    end_date date,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT manual_schedule_rules_custom_interval_days_check CHECK ((custom_interval_days > 0)),
    CONSTRAINT manual_schedule_rules_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 31))),
    CONSTRAINT manual_schedule_rules_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'custom'::text]))),
    CONSTRAINT manual_schedule_rules_schedule_type_check CHECK ((schedule_type = ANY (ARRAY['one_time'::text, 'recurring'::text]))),
    CONSTRAINT valid_custom_config CHECK (((frequency <> 'custom'::text) OR (custom_interval_days IS NOT NULL))),
    CONSTRAINT valid_monthly_config CHECK (((frequency <> 'monthly'::text) OR (day_of_month IS NOT NULL))),
    CONSTRAINT valid_recurring_config CHECK (((schedule_type = 'one_time'::text) OR (frequency IS NOT NULL))),
    CONSTRAINT valid_weekly_config CHECK (((frequency <> ALL (ARRAY['weekly'::text, 'biweekly'::text])) OR (days_of_week IS NOT NULL)))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_listing_id_cleaner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_listing_id_cleaner_id_key UNIQUE (listing_id, cleaner_id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: cleaner_auth_codes cleaner_auth_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_auth_codes
    ADD CONSTRAINT cleaner_auth_codes_pkey PRIMARY KEY (id);


--
-- Name: cleaner_feedback cleaner_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_feedback
    ADD CONSTRAINT cleaner_feedback_pkey PRIMARY KEY (id);


--
-- Name: cleaner_feedback cleaner_feedback_schedule_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_feedback
    ADD CONSTRAINT cleaner_feedback_schedule_item_id_key UNIQUE (schedule_item_id);


--
-- Name: cleaner_sessions cleaner_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_sessions
    ADD CONSTRAINT cleaner_sessions_pkey PRIMARY KEY (id);


--
-- Name: cleaner_sessions cleaner_sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_sessions
    ADD CONSTRAINT cleaner_sessions_token_key UNIQUE (token);


--
-- Name: cleaners cleaners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaners
    ADD CONSTRAINT cleaners_pkey PRIMARY KEY (id);


--
-- Name: listings listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_pkey PRIMARY KEY (id);


--
-- Name: manual_schedule_rules manual_schedule_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_schedule_rules
    ADD CONSTRAINT manual_schedule_rules_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: schedule_items schedule_items_booking_uid_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_items
    ADD CONSTRAINT schedule_items_booking_uid_unique UNIQUE (booking_uid);


--
-- Name: schedule_items schedule_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_items
    ADD CONSTRAINT schedule_items_pkey PRIMARY KEY (id);


--
-- Name: idx_assignments_cleaner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_cleaner_id ON public.assignments USING btree (cleaner_id);


--
-- Name: idx_assignments_listing_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_listing_id ON public.assignments USING btree (listing_id);


--
-- Name: idx_cleaners_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cleaners_user_id ON public.cleaners USING btree (user_id);


--
-- Name: idx_listings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_listings_user_id ON public.listings USING btree (user_id);


--
-- Name: idx_manual_schedule_rules_cleaner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manual_schedule_rules_cleaner_id ON public.manual_schedule_rules USING btree (cleaner_id);


--
-- Name: idx_manual_schedule_rules_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manual_schedule_rules_is_active ON public.manual_schedule_rules USING btree (is_active);


--
-- Name: idx_manual_schedule_rules_listing_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manual_schedule_rules_listing_id ON public.manual_schedule_rules USING btree (listing_id);


--
-- Name: idx_schedule_items_booking_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_items_booking_uid ON public.schedule_items USING btree (booking_uid);


--
-- Name: idx_schedule_items_cancelled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_items_cancelled_at ON public.schedule_items USING btree (cancelled_at);


--
-- Name: idx_schedule_items_check_out; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_items_check_out ON public.schedule_items USING btree (check_out);


--
-- Name: idx_schedule_items_cleaner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_items_cleaner_id ON public.schedule_items USING btree (cleaner_id);


--
-- Name: idx_schedule_items_is_extended; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_items_is_extended ON public.schedule_items USING btree (is_extended);


--
-- Name: idx_schedule_items_listing_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_items_listing_id ON public.schedule_items USING btree (listing_id);


--
-- Name: idx_schedule_items_manual_rule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_items_manual_rule_id ON public.schedule_items USING btree (manual_rule_id);


--
-- Name: idx_schedule_items_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_items_source ON public.schedule_items USING btree (source);


--
-- Name: assignments handle_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: cleaners handle_cleaners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_cleaners_updated_at BEFORE UPDATE ON public.cleaners FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: listings handle_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles handle_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: schedule_items handle_schedule_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_schedule_items_updated_at BEFORE UPDATE ON public.schedule_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: schedule_items track_schedule_modifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER track_schedule_modifications BEFORE UPDATE ON public.schedule_items FOR EACH ROW EXECUTE FUNCTION public.track_schedule_modification();


--
-- Name: assignments assignments_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: cleaner_auth_codes cleaner_auth_codes_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_auth_codes
    ADD CONSTRAINT cleaner_auth_codes_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id) ON DELETE CASCADE;


--
-- Name: cleaner_feedback cleaner_feedback_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_feedback
    ADD CONSTRAINT cleaner_feedback_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id) ON DELETE CASCADE;


--
-- Name: cleaner_feedback cleaner_feedback_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_feedback
    ADD CONSTRAINT cleaner_feedback_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: cleaner_feedback cleaner_feedback_schedule_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_feedback
    ADD CONSTRAINT cleaner_feedback_schedule_item_id_fkey FOREIGN KEY (schedule_item_id) REFERENCES public.schedule_items(id) ON DELETE CASCADE;


--
-- Name: cleaner_sessions cleaner_sessions_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaner_sessions
    ADD CONSTRAINT cleaner_sessions_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id) ON DELETE CASCADE;


--
-- Name: cleaners cleaners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cleaners
    ADD CONSTRAINT cleaners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: listings listings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.listings
    ADD CONSTRAINT listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: manual_schedule_rules manual_schedule_rules_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_schedule_rules
    ADD CONSTRAINT manual_schedule_rules_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id) ON DELETE CASCADE;


--
-- Name: manual_schedule_rules manual_schedule_rules_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_schedule_rules
    ADD CONSTRAINT manual_schedule_rules_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: schedule_items schedule_items_cleaner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_items
    ADD CONSTRAINT schedule_items_cleaner_id_fkey FOREIGN KEY (cleaner_id) REFERENCES public.cleaners(id) ON DELETE CASCADE;


--
-- Name: schedule_items schedule_items_listing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_items
    ADD CONSTRAINT schedule_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;


--
-- Name: schedule_items schedule_items_manual_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_items
    ADD CONSTRAINT schedule_items_manual_rule_id_fkey FOREIGN KEY (manual_rule_id) REFERENCES public.manual_schedule_rules(id) ON DELETE SET NULL;


--
-- Name: manual_schedule_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.manual_schedule_rules ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

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

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE auth.users DISABLE TRIGGER ALL;

COPY auth.users (id, email, raw_user_meta_data, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	test@example.com	{"name": "Test User"}	2025-07-15 18:19:14.261445+00	2025-07-15 18:19:14.261445+00
\.


ALTER TABLE auth.users ENABLE TRIGGER ALL;

--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.profiles DISABLE TRIGGER ALL;

COPY public.profiles (id, email, name, avatar_url, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	test@example.com	Test User	\N	2025-07-15 18:19:14.26203+00	2025-07-15 18:19:14.26203+00
\.


ALTER TABLE public.profiles ENABLE TRIGGER ALL;

--
-- Data for Name: cleaners; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cleaners DISABLE TRIGGER ALL;

COPY public.cleaners (id, user_id, name, phone, email, created_at, updated_at) FROM stdin;
696f311d-ec39-4693-a5cf-f8879594f54f	00000000-0000-0000-0000-000000000001	Jane	(626) 272-9875	janech22@aol.com	2025-07-15 20:18:38.549869+00	2025-07-15 20:18:38.549869+00
9064fba7-66f0-43f3-8e22-8208bda532e8	00000000-0000-0000-0000-000000000001	Yolanda	1 (626) 547-1778‬	\N	2025-07-16 17:43:07.993635+00	2025-07-16 17:43:07.993635+00
\.


ALTER TABLE public.cleaners ENABLE TRIGGER ALL;

--
-- Data for Name: listings; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.listings DISABLE TRIGGER ALL;

COPY public.listings (id, user_id, name, ics_url, cleaning_fee, last_sync, created_at, updated_at, timezone, is_active_on_airbnb) FROM stdin;
90ce9fd0-ebe1-4f90-b789-e27519e0d501	00000000-0000-0000-0000-000000000001	Azusa G - Dream Getaway	https://www.airbnb.com/calendar/ical/39372098.ics?s=6a5c20debaddf36f80ab9b352c9a24c4	0.00	2025-07-21 16:13:48.094202+00	2025-07-17 15:32:23.151708+00	2025-07-21 16:13:48.094202+00	America/Los_Angeles	t
0cd17327-d520-4879-b318-e57e94230cff	00000000-0000-0000-0000-000000000001	Glendora	https://www.airbnb.com/calendar/ical/618773814293972682.ics?s=7b748171df7c46d73d4e6ec5d6e03c9c	0.00	2025-07-21 16:13:49.630768+00	2025-07-16 18:09:17.531807+00	2025-07-21 16:13:49.630768+00	America/Los_Angeles	t
82db6332-26cc-4cd3-a64b-7c0e3fd79f50	00000000-0000-0000-0000-000000000001	Monrovia B	https://www.airbnb.com/calendar/ical/53051730.ics?s=271aa3800b53982d774eb8e2597544e3	0.00	2025-07-21 16:13:50.042329+00	2025-07-16 17:50:38.136876+00	2025-07-21 16:13:50.042329+00	America/Los_Angeles	t
495b382e-b4ad-4e0d-8218-4a352172bc79	00000000-0000-0000-0000-000000000001	Monrovia A	https://www.airbnb.com/calendar/ical/12811708.ics?s=d9d219fa078dc6cbe5e07f256d7907e9	0.00	2025-07-21 16:13:50.385904+00	2025-07-16 17:44:09.933876+00	2025-07-21 16:13:50.385904+00	America/New_York	t
786bc90f-214b-45ac-b3ad-df4c75ca71fa	00000000-0000-0000-0000-000000000001	L1	https://www.airbnb.com/calendar/ical/926967299638366475.ics?s=68292ebe60f236e866eeef767156fdc8	80.00	2025-07-21 16:13:50.716677+00	2025-07-15 23:25:06.874429+00	2025-07-21 16:13:50.716677+00	America/New_York	t
a60784bc-9413-48d3-a597-7cc09eaed658	00000000-0000-0000-0000-000000000001	L2	https://www.airbnb.com/calendar/ical/932881437285859521.ics?s=b9949abc6197a2ef4a6c49ed80d85031	70.00	2025-07-21 16:13:51.146679+00	2025-07-15 23:20:54.646522+00	2025-07-21 16:13:51.146679+00	America/New_York	t
e12dcb31-fd02-455b-b279-1a5fc926fdd6	00000000-0000-0000-0000-000000000001	Unit 3	https://www.airbnb.com/calendar/ical/28293048.ics?s=c780f02ed604dd9ea6793ca20bbdc26e	80.00	2025-07-21 16:13:51.559484+00	2025-07-15 22:19:14.51661+00	2025-07-21 16:13:51.559484+00	America/New_York	t
1b1b7786-cfdd-4c39-9b0d-319364e10359	00000000-0000-0000-0000-000000000001	Unit 2	https://www.airbnb.com/calendar/ical/25816262.ics?s=919186e0472081ff848a9f1ae050d3b6	100.00	2025-07-21 16:13:53.93728+00	2025-07-15 22:15:43.51352+00	2025-07-21 16:13:53.93728+00	America/New_York	t
3f1bff5a-d577-4151-a81a-4ed7829996e4	00000000-0000-0000-0000-000000000001	Unit A	\N	100.00	\N	2025-07-16 21:23:13.208092+00	2025-07-16 21:23:13.208092+00	America/Los_Angeles	f
6a61d45d-ecc3-414f-a019-41b567d0c5b8	00000000-0000-0000-0000-000000000001	Unit 4	\N	100.00	\N	2025-07-16 21:23:27.549776+00	2025-07-16 21:23:27.549776+00	America/Los_Angeles	f
4231f8b8-18e4-4534-878d-580c9903453e	00000000-0000-0000-0000-000000000001	Unit 1	https://www.airbnb.com/calendar/ical/21843308.ics?s=882e2ca8b429db5b1b126921788e5423	100.00	2025-07-21 16:13:54.391723+00	2025-07-15 21:49:42.07057+00	2025-07-21 16:13:54.391723+00	America/New_York	t
d52caf39-478e-4855-9c82-93c2f525a3f4	00000000-0000-0000-0000-000000000001	Unit C	https://www.airbnb.com/calendar/ical/635533805109458781.ics?s=899eb436f5a913f4d296287e5603a0ef	100.00	2025-07-21 16:13:54.706187+00	2025-07-15 21:39:56.107321+00	2025-07-21 16:13:54.706187+00	America/New_York	t
31fd82dc-c3d3-4844-814b-a28edc794cf5	00000000-0000-0000-0000-000000000001	Unit D	https://www.airbnb.com/calendar/ical/745840653702711751.ics?s=6e74debcb3780609c3027bf739606a4c	80.00	2025-07-21 16:13:55.271441+00	2025-07-15 19:46:59.842286+00	2025-07-21 16:13:55.271441+00	America/New_York	t
46fc3a26-1894-469d-a0e3-90f8e464b444	00000000-0000-0000-0000-000000000001	L3 - RV	https://www.airbnb.com/calendar/ical/1463160232188454530.ics?s=0e90ac2c6439fc707fd395be78b497d5	0.00	2025-07-21 16:13:45.659988+00	2025-07-17 19:12:30.697982+00	2025-07-21 16:13:45.659988+00	America/Los_Angeles	t
dea8aed7-2ad2-496e-bf8b-9512fe16b817	00000000-0000-0000-0000-000000000001	Azusa E - Sunrise Getaway	https://www.airbnb.com/calendar/ical/32428957.ics?s=6996ea10e0071a0c81e7eafc090bc3d0	0.00	2025-07-21 16:13:46.120041+00	2025-07-17 15:36:59.041794+00	2025-07-21 16:13:46.120041+00	America/Los_Angeles	t
2d936b8a-3ba3-42b3-af2f-bb71097b8007	00000000-0000-0000-0000-000000000001	Azusa H - HomeAway	https://www.airbnb.com/calendar/ical/43778662.ics?s=56e231a46fe706f94ec69b7cac293353	0.00	2025-07-21 16:13:46.551823+00	2025-07-17 15:34:46.874996+00	2025-07-21 16:13:46.551823+00	America/Los_Angeles	t
00f5296d-ed3a-49cb-8a96-f930bf554171	00000000-0000-0000-0000-000000000001	Azusa F - Getaway	https://www.airbnb.com/calendar/ical/43778556.ics?s=eba36d682385b13f4d21e5643b777f39	0.00	2025-07-21 16:13:47.176899+00	2025-07-17 15:33:11.531105+00	2025-07-21 16:13:47.176899+00	America/Los_Angeles	t
\.


ALTER TABLE public.listings ENABLE TRIGGER ALL;

--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.assignments DISABLE TRIGGER ALL;

COPY public.assignments (id, listing_id, cleaner_id, created_at, updated_at) FROM stdin;
beb39585-ea86-435c-aa17-845cdb965096	31fd82dc-c3d3-4844-814b-a28edc794cf5	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-15 21:37:05.30182+00	2025-07-15 21:37:05.30182+00
858e50f0-ce8c-4d4a-b0de-1339123ac35a	d52caf39-478e-4855-9c82-93c2f525a3f4	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-15 21:39:56.149958+00	2025-07-15 21:39:56.149958+00
dadee4c5-486a-46d4-85c0-2a7192332ce5	4231f8b8-18e4-4534-878d-580c9903453e	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-15 21:49:42.118459+00	2025-07-15 21:49:42.118459+00
802581e0-b73c-4954-918d-aedd57db19fb	1b1b7786-cfdd-4c39-9b0d-319364e10359	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-15 22:15:43.551826+00	2025-07-15 22:15:43.551826+00
40811a1b-6e02-4e06-a76c-03d7bc165c31	e12dcb31-fd02-455b-b279-1a5fc926fdd6	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-15 22:19:14.563254+00	2025-07-15 22:19:14.563254+00
e53d1c19-e41a-426d-a88c-5b07abfefa2e	a60784bc-9413-48d3-a597-7cc09eaed658	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-15 23:20:54.683085+00	2025-07-15 23:20:54.683085+00
19f1ee71-deaa-4703-a8e9-881791be05a7	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-15 23:25:06.91737+00	2025-07-15 23:25:06.91737+00
53fd1e42-9f09-40f1-8840-2ec31713ce69	495b382e-b4ad-4e0d-8218-4a352172bc79	9064fba7-66f0-43f3-8e22-8208bda532e8	2025-07-16 17:44:10.068223+00	2025-07-16 17:44:10.068223+00
ff920f63-26e9-4420-90fe-964002d8dddc	82db6332-26cc-4cd3-a64b-7c0e3fd79f50	9064fba7-66f0-43f3-8e22-8208bda532e8	2025-07-16 17:50:38.609873+00	2025-07-16 17:50:38.609873+00
76d1f794-0786-4978-9ad0-a05cc15be3a3	0cd17327-d520-4879-b318-e57e94230cff	9064fba7-66f0-43f3-8e22-8208bda532e8	2025-07-16 18:09:17.631451+00	2025-07-16 18:09:17.631451+00
eafb6e58-a523-49a2-abd3-527dc1142a70	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-16 21:23:13.296779+00	2025-07-16 21:23:13.296779+00
4f4fdb3c-6ee3-475d-bdbc-d6aa9a5d7bee	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-16 21:23:27.685914+00	2025-07-16 21:23:27.685914+00
45ced2f4-b36a-40fc-9d8d-bf62260216dc	90ce9fd0-ebe1-4f90-b789-e27519e0d501	9064fba7-66f0-43f3-8e22-8208bda532e8	2025-07-17 15:32:23.274034+00	2025-07-17 15:32:23.274034+00
65e1412e-ee76-4bbb-a50a-c415a783e01d	00f5296d-ed3a-49cb-8a96-f930bf554171	9064fba7-66f0-43f3-8e22-8208bda532e8	2025-07-17 15:33:11.598485+00	2025-07-17 15:33:11.598485+00
be073c48-444b-40d2-913a-419dc4c63c7d	2d936b8a-3ba3-42b3-af2f-bb71097b8007	9064fba7-66f0-43f3-8e22-8208bda532e8	2025-07-17 15:34:46.929582+00	2025-07-17 15:34:46.929582+00
ee0dbb04-f15f-4d4c-863d-8da1e2070332	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	2025-07-17 15:36:59.100884+00	2025-07-17 15:36:59.100884+00
98fbb26d-5e88-4f05-8f5a-9ed76d9d6e29	46fc3a26-1894-469d-a0e3-90f8e464b444	696f311d-ec39-4693-a5cf-f8879594f54f	2025-07-17 19:12:30.788334+00	2025-07-17 19:12:30.788334+00
\.


ALTER TABLE public.assignments ENABLE TRIGGER ALL;

--
-- Data for Name: cleaner_auth_codes; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cleaner_auth_codes DISABLE TRIGGER ALL;

COPY public.cleaner_auth_codes (id, cleaner_id, phone_number, code, expires_at, used_at, created_at) FROM stdin;
\.


ALTER TABLE public.cleaner_auth_codes ENABLE TRIGGER ALL;

--
-- Data for Name: manual_schedule_rules; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.manual_schedule_rules DISABLE TRIGGER ALL;

COPY public.manual_schedule_rules (id, listing_id, cleaner_id, schedule_type, frequency, days_of_week, day_of_month, custom_interval_days, cleaning_time, start_date, end_date, notes, is_active, created_at, updated_at) FROM stdin;
84849ffa-c851-4d65-a0b0-0269449e916c	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	recurring	monthly	\N	1	\N	10:00:00	2025-08-05	2026-04-30		t	2025-07-17 17:46:24.659879+00	2025-07-17 18:08:56.503648+00
e154c043-aac3-4494-b3b8-a6a3a48dc955	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	recurring	biweekly	{5}	\N	\N	11:00:00	2025-07-25	2025-12-31	Edited via test script	t	2025-07-17 17:45:31.588655+00	2025-07-17 17:59:09.993763+00
8f5fa749-0e60-46c0-acbf-16d2697570d5	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	monthly	\N	15	\N	11:00:00	2025-07-17	\N	Changed to monthly	f	2025-07-17 18:05:44.721499+00	2025-07-17 18:39:01.455555+00
db78caa0-6b1a-4d23-bf63-737ba357595e	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{2,4}	\N	\N	14:00:00	2025-07-17	\N	Second schedule	f	2025-07-17 17:33:14.858367+00	2025-07-17 18:39:01.546808+00
1d9670c4-da21-4240-b01a-e08c022d4cec	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{1,3,5}	\N	\N	10:00:00	2025-07-17	\N	First schedule	f	2025-07-17 17:33:14.394501+00	2025-07-17 18:39:01.615361+00
62587289-443b-4d68-be7f-d90f89e03f7b	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{2,4}	\N	\N	14:00:00	2025-07-17	\N	Second schedule	f	2025-07-17 17:30:15.015035+00	2025-07-17 18:39:01.670622+00
147a5bce-7aeb-49cb-a80c-bb55b7a96dc8	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{1,3,5}	\N	\N	10:00:00	2025-07-17	\N	First schedule	f	2025-07-17 17:30:14.58671+00	2025-07-17 18:39:01.739807+00
4504d465-b850-4fa8-975b-939d0119c5a0	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{1,3,5}	\N	\N	11:00:00	2025-07-17	\N	User test schedule	f	2025-07-17 17:21:20.516385+00	2025-07-17 18:39:01.7888+00
bb2e4659-2ce7-4efd-a352-67ca5d82a68f	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	custom	\N	\N	3	11:00:00	2025-07-17	\N	Test custom schedule	f	2025-07-17 17:14:34.453174+00	2025-07-17 18:39:01.837067+00
00c6f2c9-8920-4c65-a2d1-0be156dca238	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	monthly	\N	15	\N	11:00:00	2025-07-17	\N	Test monthly schedule	f	2025-07-17 17:14:34.168311+00	2025-07-17 18:39:01.891985+00
51fbd2b9-f948-434a-8369-a3d60a9a2331	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	biweekly	{2,4}	\N	\N	11:00:00	2025-07-17	\N	Test biweekly schedule	f	2025-07-17 17:14:33.875928+00	2025-07-17 18:39:01.930199+00
fba7f9f5-b8f8-4e57-a969-83c5d54e5d3b	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{1,3,5}	\N	\N	11:00:00	2025-07-17	\N	Test weekly schedule	f	2025-07-17 17:14:33.714423+00	2025-07-17 18:39:01.984627+00
6a38bbea-cbb5-4b95-bfc7-be2675143fcf	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	daily	\N	\N	\N	11:00:00	2025-07-17	\N	Test daily schedule	f	2025-07-17 17:14:33.453429+00	2025-07-17 18:39:02.076682+00
8208f8eb-fdb7-4383-84fd-3f5e5d2354f7	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{1,3,5}	\N	\N	11:00:00	2025-06-17	\N	Test schedule with past start date	f	2025-07-17 17:13:45.206807+00	2025-07-17 18:39:02.164777+00
dcdd0346-a202-4187-95ee-3c5a219d5720	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	recurring	biweekly	{}	\N	\N	13:00:00	2025-07-25	2025-12-31	\N	f	2025-07-17 17:11:42.157751+00	2025-07-17 18:39:02.262681+00
66585dc0-a376-4579-a394-96c9addc1f78	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{2,4}	\N	\N	14:00:00	2025-07-17	\N	Updated notes - changed days and time	f	2025-07-17 17:07:35.601133+00	2025-07-17 18:39:02.320422+00
13e15bf1-559f-4e1d-8b9c-2eb7bcb5b548	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{1,3,5}	\N	\N	10:00:00	2025-07-17	\N	Test schedule created by API test	f	2025-07-17 17:06:18.868443+00	2025-07-17 18:39:02.376012+00
948299cc-e600-4a48-9e87-8993adc25c09	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	recurring	weekly	{1,3,5}	\N	\N	10:00:00	2025-07-17	\N	Test schedule created by API test	f	2025-07-17 17:06:00.73004+00	2025-07-17 18:39:02.435346+00
4cd42d2b-1691-4dc5-b37c-f7de2c06452e	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	recurring	biweekly	{}	\N	\N	11:00:00	2025-07-25	2025-12-31	\N	f	2025-07-17 16:50:06.920864+00	2025-07-17 18:39:02.492577+00
79adaaaf-a17e-4f89-b538-1142440f62bc	d52caf39-478e-4855-9c82-93c2f525a3f4	696f311d-ec39-4693-a5cf-f8879594f54f	recurring	monthly	\N	15	\N	10:00:00	2025-08-14	2025-09-30	\N	t	2025-07-17 19:08:03.915924+00	2025-07-17 19:08:03.915924+00
82119fcd-1c5c-4ecd-919a-37bd0bcd4fc5	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	recurring	monthly	\N	11	\N	11:00:00	2025-08-10	\N	\N	t	2025-07-17 19:10:54.883323+00	2025-07-17 19:10:54.883323+00
\.


ALTER TABLE public.manual_schedule_rules ENABLE TRIGGER ALL;

--
-- Data for Name: schedule_items; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.schedule_items DISABLE TRIGGER ALL;

COPY public.schedule_items (id, listing_id, cleaner_id, booking_uid, guest_name, check_in, check_out, checkout_time, notes, status, created_at, updated_at, source, manual_rule_id, is_completed, original_check_in, original_check_out, cancelled_at, modification_history, is_extended, extension_notes, previous_check_out, extension_count) FROM stdin;
8fc9994d-17d1-4453-8762-ff6b93874af3	4231f8b8-18e4-4534-878d-580c9903453e	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-0bdaa38bb7a7a0c1fa8bcecc64ec7e13@airbnb.com	\N	2025-07-13	2025-08-02	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMD2TB83Y2\nPhone Number (Last 4 Digits): 1508	pending	2025-07-15 21:49:42.59603+00	2025-07-21 16:13:54.389529+00	airbnb	\N	f	2025-07-13	2025-08-02	\N	[]	f	\N	\N	0
9a544454-6a10-44b8-a0fa-882adc7582eb	d52caf39-478e-4855-9c82-93c2f525a3f4	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-d30fa086eaa56462c1aa31b64067e0c0@airbnb.com	\N	2025-07-11	2025-09-30	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMX8SHQCW4\nPhone Number (Last 4 Digits): 6858	pending	2025-07-15 21:47:27.072177+00	2025-07-21 16:13:54.705087+00	airbnb	\N	f	2025-07-11	2025-09-30	\N	[]	f	\N	\N	0
2155d965-64a8-4fac-9ff3-14f44941ca90	31fd82dc-c3d3-4844-814b-a28edc794cf5	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-b8dd39c8c9244b39efe639a8eaf3227c@airbnb.com	\N	2025-08-15	2025-08-20	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMCNTW29N4\nPhone Number (Last 4 Digits): 7806	pending	2025-07-21 02:01:06.704687+00	2025-07-21 16:13:55.266928+00	airbnb	\N	f	2025-08-15	2025-08-20	\N	[]	f	\N	\N	0
b86959f2-29d7-401a-82bc-ab795ca581ff	31fd82dc-c3d3-4844-814b-a28edc794cf5	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-721d120a22f2df1bc64edd15283591d7@airbnb.com	\N	2025-09-30	2025-10-18	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HME4H552Y4\nPhone Number (Last 4 Digits): 1793	pending	2025-07-21 02:01:06.706615+00	2025-07-21 16:13:55.268791+00	airbnb	\N	f	2025-09-30	2025-10-18	\N	[]	f	\N	\N	0
d3787e43-402b-4a37-abed-274cc3ef3404	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-07-25	2025-07-25	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.435113+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-07-25	2025-07-25	\N	[]	f	\N	\N	0
9f9a19fc-3e2f-4e4d-8e28-348038b3b50b	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-08-08	2025-08-08	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.436967+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-08-08	2025-08-08	\N	[]	f	\N	\N	0
085e9a57-1e8b-4d7d-9046-c5e48c76f819	46fc3a26-1894-469d-a0e3-90f8e464b444	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-1051e40c5f91b0c00256e003e977d5ed@airbnb.com	Guest	2025-07-16	2025-07-20	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMA4JKE8RX\nPhone Number (Last 4 Digits): 0220	completed	2025-07-17 19:12:33.790648+00	2025-07-21 15:47:22.625634+00	airbnb	\N	t	2025-07-16	2025-07-20	\N	[{"type": "completion", "timestamp": "2025-07-21T15:47:22.625634+00:00", "previous_status": "pending"}]	f	\N	\N	0
122a9513-58b5-40d5-a02d-9c1d70f7b86d	a60784bc-9413-48d3-a597-7cc09eaed658	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-f99763182d3cd166fa93740a5f464e4a@airbnb.com	Guest	2025-07-13	2025-07-16	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMT5T58FSQ\nPhone Number (Last 4 Digits): 0182	completed	2025-07-15 23:20:56.710974+00	2025-07-21 15:47:27.669958+00	airbnb	\N	t	2025-07-13	2025-07-16	\N	[{"type": "completion", "timestamp": "2025-07-21T15:47:27.669958+00:00", "previous_status": "pending"}]	f	\N	\N	0
453dd1a4-ed65-4aa9-ad24-bbfa699b2da2	82db6332-26cc-4cd3-a64b-7c0e3fd79f50	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-f0f475942307e9184843f7062b423e22@airbnb.com	\N	2025-08-10	2025-08-15	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMX5EAQFWT\nPhone Number (Last 4 Digits): 3984	pending	2025-07-17 15:37:14.92304+00	2025-07-21 16:13:50.041628+00	airbnb	\N	f	2025-08-10	2025-08-15	\N	[]	f	\N	\N	0
2b5f2e18-72c4-48d0-835d-64d41d6a8e3b	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-10-17	2025-10-17	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.439781+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-10-17	2025-10-17	\N	[]	f	\N	\N	0
1b2db22c-000f-44e4-af29-32a725b1333a	1b1b7786-cfdd-4c39-9b0d-319364e10359	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-77097387755a2fcbb3199f75c07e17df@airbnb.com	Guest	2025-07-11	2025-07-15	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMX5EPRFSW\nPhone Number (Last 4 Digits): 7343	completed	2025-07-15 22:15:44.155203+00	2025-07-21 15:47:28.890524+00	airbnb	\N	t	2025-07-11	2025-07-15	\N	[{"type": "completion", "timestamp": "2025-07-21T15:47:28.890524+00:00", "previous_status": "pending"}]	f	\N	\N	0
44a2176c-5491-43c5-9f8c-916039a22846	e12dcb31-fd02-455b-b279-1a5fc926fdd6	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-05a4f7096056811a0aecc327510088b9@airbnb.com	\N	2025-07-20	2025-07-23	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMW34TK4QC\nPhone Number (Last 4 Digits): 1593	pending	2025-07-15 22:19:15.056832+00	2025-07-21 16:13:51.555261+00	airbnb	\N	f	2025-07-20	2025-07-23	\N	[]	f	\N	\N	0
365e72d3-7c81-4d37-a7c3-a1f589256a19	e12dcb31-fd02-455b-b279-1a5fc926fdd6	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-fa9f912001b9229ded1f3fd5fe6efbfe@airbnb.com	\N	2025-07-24	2025-07-28	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMHRWSHXFE\nPhone Number (Last 4 Digits): 2622	pending	2025-07-15 22:19:15.057863+00	2025-07-21 16:13:51.556599+00	airbnb	\N	f	2025-07-24	2025-07-28	\N	[]	f	\N	\N	0
e5931bf6-b14d-453b-be89-579eaacb2a21	d52caf39-478e-4855-9c82-93c2f525a3f4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-15	2025-09-15	10:00:00	Manual cleaning	pending	2025-07-17 19:08:05.840442+00	2025-07-21 01:48:43.848589+00	manual_recurring	79adaaaf-a17e-4f89-b538-1142440f62bc	f	2025-09-15	2025-09-15	\N	[]	f	\N	\N	0
cee3c599-b4b5-44d2-ac90-877efacfc083	46fc3a26-1894-469d-a0e3-90f8e464b444	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-e2b38e6eacfef8297eb86a7668f03541@airbnb.com	Guest	2025-07-13	2025-07-16	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMN4Z5QT4B\nPhone Number (Last 4 Digits): 0220	completed	2025-07-17 19:12:33.786837+00	2025-07-21 15:47:22.625634+00	airbnb	\N	t	2025-07-13	2025-07-16	\N	[{"type": "completion", "timestamp": "2025-07-21T15:47:22.625634+00:00", "previous_status": "pending"}]	f	\N	\N	0
402746fe-388a-4029-99d8-377ade15d560	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-08-11	2025-08-11	11:00:00	Manual cleaning	pending	2025-07-17 19:10:57.698232+00	2025-07-21 01:48:43.848589+00	manual_recurring	82119fcd-1c5c-4ecd-919a-37bd0bcd4fc5	f	2025-08-11	2025-08-11	\N	[]	f	\N	\N	0
4dc620ec-863e-4682-9a0f-da23ca7fb429	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-11	2025-09-11	11:00:00	Manual cleaning	pending	2025-07-17 19:10:57.702396+00	2025-07-21 01:48:43.848589+00	manual_recurring	82119fcd-1c5c-4ecd-919a-37bd0bcd4fc5	f	2025-09-11	2025-09-11	\N	[]	f	\N	\N	0
a65eb252-4853-479e-b057-b35811ee800d	e12dcb31-fd02-455b-b279-1a5fc926fdd6	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-c4474348d3237ae51b16253dc47fda1c@airbnb.com	\N	2025-09-05	2025-09-08	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMYCHX3PKH\nPhone Number (Last 4 Digits): 6796	pending	2025-07-15 22:19:15.05874+00	2025-07-21 16:13:51.558887+00	airbnb	\N	f	2025-09-05	2025-09-08	\N	[]	f	\N	\N	0
34e0f378-82ac-420c-9e25-5fb56bc225d5	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-10-11	2025-10-11	11:00:00	Manual cleaning	pending	2025-07-17 19:10:57.704323+00	2025-07-21 01:48:43.848589+00	manual_recurring	82119fcd-1c5c-4ecd-919a-37bd0bcd4fc5	f	2025-10-11	2025-10-11	\N	[]	f	\N	\N	0
1760f8a3-da08-4bf1-b714-3a4b9219211a	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-08-22	2025-08-22	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.437543+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-08-22	2025-08-22	\N	[]	f	\N	\N	0
8469d037-a6dc-408c-aaf3-49c075257475	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-05	2025-09-05	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.438077+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-09-05	2025-09-05	\N	[]	f	\N	\N	0
44477498-11b7-476c-8b35-09fe097e0d29	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-19	2025-09-19	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.438619+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-09-19	2025-09-19	\N	[]	f	\N	\N	0
267fbce8-fbb4-47ac-9708-537e15f43127	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-10-03	2025-10-03	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.439085+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-10-03	2025-10-03	\N	[]	f	\N	\N	0
feef3397-7237-4e59-a271-74c522fc74a2	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-11-11	2025-11-11	11:00:00	Manual cleaning	pending	2025-07-17 19:10:57.705688+00	2025-07-21 01:48:43.848589+00	manual_recurring	82119fcd-1c5c-4ecd-919a-37bd0bcd4fc5	f	2025-11-11	2025-11-11	\N	[]	f	\N	\N	0
fc9bee9c-e083-4a7f-8bd7-fd7355a1db6f	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-12-11	2025-12-11	11:00:00	Manual cleaning	pending	2025-07-17 19:10:57.707724+00	2025-07-21 01:48:43.848589+00	manual_recurring	82119fcd-1c5c-4ecd-919a-37bd0bcd4fc5	f	2025-12-11	2025-12-11	\N	[]	f	\N	\N	0
e75b69c3-c44b-4fa5-8154-ae6e14fe91bd	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2026-01-11	2026-01-11	11:00:00	Manual cleaning	pending	2025-07-17 19:10:57.708588+00	2025-07-21 01:48:43.848589+00	manual_recurring	82119fcd-1c5c-4ecd-919a-37bd0bcd4fc5	f	2026-01-11	2026-01-11	\N	[]	f	\N	\N	0
463d838f-68af-436b-b148-1429ba60feba	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-10-31	2025-10-31	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.44023+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-10-31	2025-10-31	\N	[]	f	\N	\N	0
4ab1ceeb-a7cd-455f-9805-4e320af1c2f6	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-11-14	2025-11-14	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.440947+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-11-14	2025-11-14	\N	[]	f	\N	\N	0
1175a736-231f-4a61-83bf-08ed05161d23	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-11-28	2025-11-28	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.441564+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-11-28	2025-11-28	\N	[]	f	\N	\N	0
25eda436-7444-415a-aef7-0e5a9248d628	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-12-12	2025-12-12	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.442003+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-12-12	2025-12-12	\N	[]	f	\N	\N	0
888943dc-1a46-4b89-b0a7-5518578f089d	3f1bff5a-d577-4151-a81a-4ed7829996e4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-12-26	2025-12-26	11:00:00	Manual cleaning	pending	2025-07-17 17:45:33.443755+00	2025-07-21 01:48:43.848589+00	manual_recurring	e154c043-aac3-4494-b3b8-a6a3a48dc955	f	2025-12-26	2025-12-26	\N	[]	f	\N	\N	0
238da75f-dcb8-4e2f-9412-8a267b00f0e6	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-08-05	2025-08-05	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.347949+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-08-05	2025-08-05	\N	[]	f	\N	\N	0
a53c1ddb-d2b0-446b-9ee7-fdb4ba08d87b	31fd82dc-c3d3-4844-814b-a28edc794cf5	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-a5a38f1d0c63462939059333bb65fe40@airbnb.com	\N	2025-10-22	2025-10-30	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM5EFFHKWT\nPhone Number (Last 4 Digits): 0029	pending	2025-07-16 17:20:26.555364+00	2025-07-21 16:13:55.270164+00	airbnb	\N	f	2025-10-22	2025-10-30	\N	[]	f	\N	\N	0
46d22075-4e4b-4cad-bfa7-8877127a9ec3	90ce9fd0-ebe1-4f90-b789-e27519e0d501	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-6c9ec6bc777b7acdf654f85fa9e11c49@airbnb.com	\N	2024-11-28	2025-09-02	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMJDQC8XK9\nPhone Number (Last 4 Digits): 5634	pending	2025-07-17 15:32:26.150304+00	2025-07-21 16:13:48.091179+00	airbnb	\N	f	2024-11-28	2025-09-02	\N	[]	f	\N	\N	0
bb80e180-98ce-4c29-bb35-5deabfc8bb65	0cd17327-d520-4879-b318-e57e94230cff	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-dced18dab2017ece3e0a71a3752cbb7f@airbnb.com	\N	2025-06-25	2025-07-25	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HME5CRHWAB\nPhone Number (Last 4 Digits): 6215	pending	2025-07-16 18:09:20.238969+00	2025-07-21 16:13:49.62834+00	airbnb	\N	f	2025-06-25	2025-07-25	\N	[]	f	\N	\N	0
7ff412ad-b271-4cf9-b2ad-6ed176797a04	31fd82dc-c3d3-4844-814b-a28edc794cf5	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-bca6fef33c8aa7642f95ca940824e638@airbnb.com	Guest	2025-07-03	2025-07-16	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMAKDZFB4K\nPhone Number (Last 4 Digits): 8860	completed	2025-07-16 17:20:26.550854+00	2025-07-21 15:47:22.366991+00	airbnb	\N	t	2025-07-03	2025-07-16	\N	[{"type": "completion", "timestamp": "2025-07-21T15:47:22.366991+00:00", "previous_status": "pending"}]	f	\N	\N	0
9f67bc32-5103-4566-87fa-fbfb011b1356	786bc90f-214b-45ac-b3ad-df4c75ca71fa	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-6e94b2032c55fc12f13593e15ebcbb9a@airbnb.com	\N	2025-07-02	2026-02-28	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMPFJKS98D\nPhone Number (Last 4 Digits): 0722	pending	2025-07-15 23:25:07.355476+00	2025-07-21 16:13:50.715247+00	airbnb	\N	f	2025-07-02	2026-02-28	\N	[]	f	\N	\N	0
8e8b08f3-976a-4114-a9e6-640c09a10d67	a60784bc-9413-48d3-a597-7cc09eaed658	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-a3b068d8f53ef9a11e2d676c1d5f088f@airbnb.com	\N	2025-07-16	2025-07-25	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMC8XTJPT9\nPhone Number (Last 4 Digits): 5238	pending	2025-07-15 23:20:56.713521+00	2025-07-21 16:13:51.144301+00	airbnb	\N	f	2025-07-16	2025-07-25	\N	[]	f	\N	\N	0
463cde9b-afae-44a2-aa16-49ea8485ffc1	a60784bc-9413-48d3-a597-7cc09eaed658	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-be28d4cf30bd67c50f35af1565573f36@airbnb.com	\N	2025-07-30	2025-08-31	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMFTFWHKSF\nPhone Number (Last 4 Digits): 0261	pending	2025-07-15 23:20:56.714548+00	2025-07-21 16:13:51.145831+00	airbnb	\N	f	2025-07-30	2025-08-31	\N	[]	f	\N	\N	0
64c6e39b-11fe-4dce-a851-ad865c1470d5	1b1b7786-cfdd-4c39-9b0d-319364e10359	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-b5b1b4ae4d908a750c646daaa95a11a2@airbnb.com	\N	2025-07-17	2025-07-21	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMHRX5XM2D\nPhone Number (Last 4 Digits): 1828	pending	2025-07-15 22:15:44.160281+00	2025-07-21 16:13:53.928637+00	airbnb	\N	f	2025-07-17	2025-07-21	\N	[]	f	\N	\N	0
a01b2c9e-4027-48c9-ae7b-6fc8c1d0edc4	1b1b7786-cfdd-4c39-9b0d-319364e10359	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-fa2668f002fefd7af41aa7a5ec277d3d@airbnb.com	\N	2025-07-27	2025-08-03	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM9QZAFPHN\nPhone Number (Last 4 Digits): 3024	pending	2025-07-15 22:15:44.161072+00	2025-07-21 16:13:53.932167+00	airbnb	\N	f	2025-07-27	2025-08-03	\N	[]	f	\N	\N	0
c936d511-67a6-4b91-9476-75b744a66c7e	e12dcb31-fd02-455b-b279-1a5fc926fdd6	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-543328a9999552f84e904abe96c0272e@airbnb.com	Guest	2025-07-12	2025-07-16	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMJ8MHETRA\nPhone Number (Last 4 Digits): 6979	completed	2025-07-15 22:19:15.054834+00	2025-07-21 15:47:28.540839+00	airbnb	\N	t	2025-07-12	2025-07-16	\N	[{"type": "completion", "timestamp": "2025-07-21T15:47:28.540839+00:00", "previous_status": "pending"}]	f	\N	\N	0
b96e57ef-395b-472e-bd34-7a55e14a65df	1b1b7786-cfdd-4c39-9b0d-319364e10359	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-c62df1ecdbabb898bebfdcfe678fe9ed@airbnb.com	\N	2025-09-13	2025-09-24	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMRBJZPDZB\nPhone Number (Last 4 Digits): 0476	pending	2025-07-15 22:15:44.162552+00	2025-07-21 16:13:53.935825+00	airbnb	\N	f	2025-09-13	2025-09-24	\N	[]	f	\N	\N	0
38e7fd62-8542-42a4-804b-8cdd924484e8	4231f8b8-18e4-4534-878d-580c9903453e	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-fdeed4220c5cb1cf0ef54575492af295@airbnb.com	\N	2025-08-18	2025-10-18	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMJERW93JZ\nPhone Number (Last 4 Digits): 8277	pending	2025-07-15 21:49:42.598163+00	2025-07-21 16:13:54.390972+00	airbnb	\N	f	2025-08-18	2025-10-18	\N	[]	f	\N	\N	0
65d23cc1-f41e-4a76-889e-02889e6bfe61	31fd82dc-c3d3-4844-814b-a28edc794cf5	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-ecc227129a20531a865a525462773daa@airbnb.com	\N	2025-07-17	2025-07-21	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM2SYCWYBQ\nPhone Number (Last 4 Digits): 0476	pending	2025-07-16 17:20:26.552733+00	2025-07-21 16:13:55.259933+00	airbnb	\N	f	2025-07-17	2025-07-21	\N	[]	f	\N	\N	0
a07e5190-ded4-4e82-a6bb-c1b5a49d958e	2d936b8a-3ba3-42b3-af2f-bb71097b8007	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-03ce0dd8639d40be6eb8dde23403c1af@airbnb.com	\N	2025-06-14	2025-07-26	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM54ZZD9WS\nPhone Number (Last 4 Digits): 9908	pending	2025-07-17 15:34:47.372313+00	2025-07-21 16:13:46.550051+00	airbnb	\N	f	2025-06-14	2025-07-26	\N	[]	f	\N	\N	0
12b8700e-dde3-492b-81d1-2dfd76f80cc5	31fd82dc-c3d3-4844-814b-a28edc794cf5	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-71251400647d645e599e424884402f9d@airbnb.com	\N	2025-07-21	2025-07-31	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMHPEFRT5F\nPhone Number (Last 4 Digits): 9234	pending	2025-07-16 17:20:26.553869+00	2025-07-21 16:13:55.26263+00	airbnb	\N	f	2025-07-21	2025-07-31	\N	[]	f	\N	\N	0
abae8635-0c89-4a99-929a-6160b1e6722d	82db6332-26cc-4cd3-a64b-7c0e3fd79f50	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-5a27e723d1a570ed3db4649b7e142241@airbnb.com	\N	2025-07-27	2025-08-01	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMTK9TYKYM\nPhone Number (Last 4 Digits): 3984	pending	2025-07-17 15:37:14.908125+00	2025-07-21 16:13:50.040401+00	airbnb	\N	f	2025-07-27	2025-08-01	\N	[]	f	\N	\N	0
1b4fef19-9a42-4511-a283-61f397e4cd7a	31fd82dc-c3d3-4844-814b-a28edc794cf5	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-90ebf3cf7c68c1c5674920c7cdae2bd7@airbnb.com	\N	2025-07-31	2025-08-04	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMZ4YJR52Z\nPhone Number (Last 4 Digits): 5172	pending	2025-07-16 17:20:26.554551+00	2025-07-21 16:13:55.264994+00	airbnb	\N	f	2025-07-31	2025-08-04	\N	[]	f	\N	\N	0
e6ea69ea-9d1e-4c21-a747-96e1b2f239c2	1b1b7786-cfdd-4c39-9b0d-319364e10359	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-bf578f8968c097815d510aaa079de6c4@airbnb.com	\N	2025-08-30	2025-09-06	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMCPSRKBS8\nPhone Number (Last 4 Digits): 0676	pending	2025-07-15 22:15:44.161793+00	2025-07-21 16:13:53.934114+00	airbnb	\N	f	2025-08-30	2025-09-06	\N	[]	f	\N	\N	0
be4137b6-7073-4988-a75d-fe948654974e	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-08-12	2025-08-12	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.350218+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-08-12	2025-08-12	\N	[]	f	\N	\N	0
2005b428-e497-4a40-8efc-82a6baa19585	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-08-19	2025-08-19	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.35108+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-08-19	2025-08-19	\N	[]	f	\N	\N	0
38e7c651-7bd7-430a-bead-c284c5b7afe9	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-08-26	2025-08-26	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.351735+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-08-26	2025-08-26	\N	[]	f	\N	\N	0
0954ba65-695f-4d73-be90-08988407bbb5	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-02	2025-09-02	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.352254+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-09-02	2025-09-02	\N	[]	f	\N	\N	0
8d2ba380-c759-4803-9c4c-098de8faea19	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-09	2025-09-09	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.3527+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-09-09	2025-09-09	\N	[]	f	\N	\N	0
d19ed4d1-a8a7-4abc-9605-85359325b380	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-16	2025-09-16	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.353114+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-09-16	2025-09-16	\N	[]	f	\N	\N	0
5185580d-f136-4637-a1f8-2fbc44c7d9da	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-23	2025-09-23	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.353679+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-09-23	2025-09-23	\N	[]	f	\N	\N	0
0b16d1ef-09b4-4c1f-8718-1d7fcb9ae22e	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-09-30	2025-09-30	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.354065+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-09-30	2025-09-30	\N	[]	f	\N	\N	0
4afb2463-4825-41ec-ab9f-6b40cfd4dc89	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-10-07	2025-10-07	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.354391+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-10-07	2025-10-07	\N	[]	f	\N	\N	0
08da77ee-7887-4597-a614-dba6c0467933	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-10-14	2025-10-14	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.354787+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-10-14	2025-10-14	\N	[]	f	\N	\N	0
b7aaf056-c482-4511-9c40-b6ab18c286bf	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-10-21	2025-10-21	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.35513+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-10-21	2025-10-21	\N	[]	f	\N	\N	0
606ffd4d-81df-4d33-978d-3c4594368be4	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-10-28	2025-10-28	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.355454+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-10-28	2025-10-28	\N	[]	f	\N	\N	0
6b78c175-9297-4138-ab5a-468e34774ae9	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-11-04	2025-11-04	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.35579+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-11-04	2025-11-04	\N	[]	f	\N	\N	0
10f48385-a99d-46f4-83cc-7612928db9c0	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-11-11	2025-11-11	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.356172+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-11-11	2025-11-11	\N	[]	f	\N	\N	0
8f8b22dc-f6fb-44df-abd2-58f651f6226e	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-11-18	2025-11-18	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.35651+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-11-18	2025-11-18	\N	[]	f	\N	\N	0
7ef90309-7049-49e1-9ccc-7481e5eb5a34	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-11-25	2025-11-25	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.356923+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-11-25	2025-11-25	\N	[]	f	\N	\N	0
1171270d-a3e9-46c0-a580-b4688f5a7271	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-12-02	2025-12-02	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.357286+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-12-02	2025-12-02	\N	[]	f	\N	\N	0
fff521b6-8aaf-45f6-9d5e-183a5d4433c4	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-12-09	2025-12-09	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.357613+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-12-09	2025-12-09	\N	[]	f	\N	\N	0
91a97fea-268f-4f4a-8753-86625b223e0b	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-12-16	2025-12-16	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.357969+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-12-16	2025-12-16	\N	[]	f	\N	\N	0
d1327911-8b48-41bc-b400-1558fc8d3d37	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-12-23	2025-12-23	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.358318+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-12-23	2025-12-23	\N	[]	f	\N	\N	0
712017c5-08ac-4216-a7d1-8d341a481d2f	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-12-30	2025-12-30	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.358642+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2025-12-30	2025-12-30	\N	[]	f	\N	\N	0
e2f477f9-a7c1-4375-9126-61727be645d4	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2026-01-06	2026-01-06	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.359054+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2026-01-06	2026-01-06	\N	[]	f	\N	\N	0
ce76f491-be08-4830-b887-6bed81470fbc	6a61d45d-ecc3-414f-a019-41b567d0c5b8	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2026-01-13	2026-01-13	10:00:00	Manual cleaning	pending	2025-07-17 17:46:26.359416+00	2025-07-21 01:48:43.848589+00	manual_recurring	84849ffa-c851-4d65-a0b0-0269449e916c	f	2026-01-13	2026-01-13	\N	[]	f	\N	\N	0
b6ac0bf5-b0ee-42a7-ba43-e808efb33c6f	d52caf39-478e-4855-9c82-93c2f525a3f4	696f311d-ec39-4693-a5cf-f8879594f54f	\N	\N	2025-08-15	2025-08-15	10:00:00	Manual cleaning	pending	2025-07-17 19:08:05.836924+00	2025-07-21 01:48:43.848589+00	manual_recurring	79adaaaf-a17e-4f89-b538-1142440f62bc	f	2025-08-15	2025-08-15	\N	[]	f	\N	\N	0
ab454e7c-1f9a-49eb-bb3d-8656adef58a3	a60784bc-9413-48d3-a597-7cc09eaed658	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-a4cb3078803ed932467f1a833aa25468@airbnb.com	Guest	2025-09-01	2025-09-06	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMSJWDRBYQ\nPhone Number (Last 4 Digits): 8684 | Cancelled on 2025-07-17	cancelled	2025-07-17 15:37:14.049442+00	2025-07-21 01:52:35.551357+00	airbnb	\N	f	2025-09-01	2025-09-06	2025-07-21 01:48:43.848589+00	[]	f	\N	\N	0
00ee4791-5064-49c5-978d-7307352ea806	e12dcb31-fd02-455b-b279-1a5fc926fdd6	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-700df23867f12be1713a34ab98485b62@airbnb.com	\N	2025-08-29	2025-09-03	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HME9R8CY9A\nPhone Number (Last 4 Digits): 8605	pending	2025-07-17 19:13:12.892963+00	2025-07-21 16:13:51.558151+00	airbnb	\N	f	2025-08-29	2025-09-03	\N	[]	f	\N	\N	0
3a6dac11-89ac-46db-9f92-32ee71b77310	495b382e-b4ad-4e0d-8218-4a352172bc79	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-6146941de70467e2c65ea3c0c3ae5da5@airbnb.com	Guest	2025-06-24	2025-07-20	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMMMDDXRQR\nPhone Number (Last 4 Digits): 9777	completed	2025-07-16 17:45:39.472855+00	2025-07-21 15:47:26.759762+00	airbnb	\N	t	2025-06-24	2025-07-20	\N	[{"type": "completion", "timestamp": "2025-07-21T15:47:26.759762+00:00", "previous_status": "pending"}]	f	\N	\N	0
f6193713-857f-456a-b528-cfa92dd17f38	46fc3a26-1894-469d-a0e3-90f8e464b444	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-88175f4a1139cc4b803cb35aa23d34e3@airbnb.com	\N	2025-08-01	2025-08-04	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMNCT932CY\nPhone Number (Last 4 Digits): 9930	pending	2025-07-19 17:59:04.991421+00	2025-07-21 16:13:45.655957+00	airbnb	\N	f	2025-08-01	2025-08-04	\N	[]	f	\N	\N	0
a132adbc-d9d0-4cc4-9fab-e9d151a37bc7	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-2ebdd80b15387cc35d82e5c3c73df66f@airbnb.com	\N	2025-08-20	2025-08-23	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMFNXN94PA\nPhone Number (Last 4 Digits): 8602	pending	2025-07-17 15:36:59.577818+00	2025-07-21 16:13:46.119122+00	airbnb	\N	f	2025-08-20	2025-08-23	\N	[]	f	\N	\N	0
fd0b15b9-af84-460a-a9b4-98311ae65ba0	00f5296d-ed3a-49cb-8a96-f930bf554171	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-dce5b775c1fc2c7fe0dab76b830fefb2@airbnb.com	\N	2025-07-18	2025-07-21	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM8R9HKJC2\nPhone Number (Last 4 Digits): 6228	pending	2025-07-19 17:59:07.634745+00	2025-07-21 16:13:47.174322+00	airbnb	\N	f	2025-07-18	2025-07-21	\N	[]	f	\N	\N	0
bc6725f1-4847-4ce3-b643-8095992d331f	dea8aed7-2ad2-496e-bf8b-9512fe16b817	9064fba7-66f0-43f3-8e22-8208bda532e8	1418fb94e984-d081b71c51547f40765b6a84a2be2eaa@airbnb.com	Guest	2025-07-15	2025-07-19	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMZWBNNFMY\nPhone Number (Last 4 Digits): 6931	completed	2025-07-17 15:36:59.576+00	2025-07-21 15:47:22.902886+00	airbnb	\N	t	2025-07-15	2025-07-19	\N	[{"type": "completion", "timestamp": "2025-07-21T15:47:22.902886+00:00", "previous_status": "pending"}]	f	\N	\N	0
d18365ba-724c-492c-8448-4ce3c7ce4744	e12dcb31-fd02-455b-b279-1a5fc926fdd6	696f311d-ec39-4693-a5cf-f8879594f54f	1418fb94e984-8de6adae006071cfb76cf2ff58f83134@airbnb.com	\N	2025-07-28	2025-07-31	11:00:00	Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMZBMPE4HD\nPhone Number (Last 4 Digits): 2377	pending	2025-07-19 17:59:14.916392+00	2025-07-21 16:13:51.55742+00	airbnb	\N	f	2025-07-28	2025-07-31	\N	[]	f	\N	\N	0
\.


ALTER TABLE public.schedule_items ENABLE TRIGGER ALL;

--
-- Data for Name: cleaner_feedback; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cleaner_feedback DISABLE TRIGGER ALL;

COPY public.cleaner_feedback (id, schedule_item_id, cleaner_id, listing_id, cleanliness_rating, notes, completed_at, created_at, updated_at) FROM stdin;
\.


ALTER TABLE public.cleaner_feedback ENABLE TRIGGER ALL;

--
-- Data for Name: cleaner_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.cleaner_sessions DISABLE TRIGGER ALL;

COPY public.cleaner_sessions (id, cleaner_id, token, device_info, expires_at, last_activity, created_at) FROM stdin;
\.


ALTER TABLE public.cleaner_sessions ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

-- Enable RLS policies
