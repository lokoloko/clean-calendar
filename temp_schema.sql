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

