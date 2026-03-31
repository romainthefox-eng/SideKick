-- Migration: Add postal_code column to logements table
-- This adds support for storing postal code separately from the address

ALTER TABLE logements 
ADD COLUMN postal_code VARCHAR(20);

-- Optional: If you want to extract existing postal codes from addresses
-- UPDATE logements 
-- SET postal_code = TRIM(SUBSTRING_INDEX(address, ',', -1))
-- WHERE postal_code IS NULL;
