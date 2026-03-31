-- Migration: Add reservation-specific fields to rentals table
-- Run this in your Supabase SQL Editor

ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'direct'
    CHECK (source IN ('airbnb', 'booking', 'direct', 'autre')),
  ADD COLUMN IF NOT EXISTS booking_status VARCHAR(20) DEFAULT 'pending'
    CHECK (booking_status IN ('confirmed', 'pending', 'paid')),
  ADD COLUMN IF NOT EXISTS pets BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_requests TEXT;

-- Update existing rows with sensible defaults
UPDATE rentals SET
  adults = 1,
  children = 0,
  source = 'direct',
  booking_status = CASE
    WHEN status = 'active'  THEN 'confirmed'
    WHEN status = 'pending' THEN 'pending'
    ELSE 'confirmed'
  END,
  pets = FALSE
WHERE adults IS NULL;
