-- Email agent state on synced messages
ALTER TABLE gmail_messages ADD COLUMN IF NOT EXISTS agent_status VARCHAR(30) DEFAULT 'none';
ALTER TABLE gmail_messages ADD COLUMN IF NOT EXISTS agent_draft TEXT;
ALTER TABLE gmail_messages ADD COLUMN IF NOT EXISTS agent_label VARCHAR(50);
ALTER TABLE gmail_messages ADD COLUMN IF NOT EXISTS agent_priority VARCHAR(20);
ALTER TABLE gmail_messages ADD COLUMN IF NOT EXISTS agent_processed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_gmail_messages_agent_status ON gmail_messages (company_id, agent_status);

-- Link approvals to Gmail messages for agent-drafted replies
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS gmail_message_id VARCHAR(500);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS draft_body TEXT;

CREATE INDEX IF NOT EXISTS idx_approvals_gmail_message ON approvals (gmail_message_id);
