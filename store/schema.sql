CREATE DATABASE store;
CREATE USER storebackend;

--
-- PostgreSQL database dump
--

-- Dumped from database version 12.1
-- Dumped by pg_dump version 12.3 (Ubuntu 12.3-1.pgdg18.04+1)

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
-- Name: latest; Type: TABLE; Schema: public; Owner: storebackend
--

CREATE TABLE public.latest (
    userid uuid,
    id uuid,
    "timestamp" timestamp without time zone
);


ALTER TABLE public.latest OWNER TO storebackend;

--
-- Name: logins; Type: TABLE; Schema: public; Owner: storebackend
--

CREATE TABLE public.logins (
    id uuid,
    info text,
    "time" timestamp without time zone
);


ALTER TABLE public.logins OWNER TO storebackend;

--
-- Name: objects; Type: TABLE; Schema: public; Owner: storebackend
--

CREATE TABLE public.objects (
    id uuid,
    userid uuid,
    serialized text
);


ALTER TABLE public.objects OWNER TO storebackend;

--
-- Name: users; Type: TABLE; Schema: public; Owner: storebackend
--

CREATE TABLE public.users (
    id uuid,
    enabled boolean
);


ALTER TABLE public.users OWNER TO storebackend;

--
-- PostgreSQL database dump complete
--
