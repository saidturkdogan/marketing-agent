-- Flyway migration V10: Add body column to gmail_messages table
ALTER TABLE gmail_messages ADD COLUMN IF NOT EXISTS body TEXT;
