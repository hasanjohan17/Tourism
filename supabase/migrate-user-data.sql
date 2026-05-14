-- Update schema to add missing columns to profiles table
-- This matches the schema.sql file exactly
-- Run this in Supabase Dashboard > SQL Editor

alter table public.profiles
  add column if not exists email text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists region text,
  add column if not exists passport_image_url text;
