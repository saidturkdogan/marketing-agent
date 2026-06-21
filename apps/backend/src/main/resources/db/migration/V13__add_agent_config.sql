CREATE TABLE IF NOT EXISTS agent_configs (
    id                      BIGSERIAL PRIMARY KEY,
    company_id              VARCHAR(255) NOT NULL UNIQUE,
    autopilot_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
    twitter_posts_per_week  INT NOT NULL DEFAULT 3,
    email_drafts_per_week   INT NOT NULL DEFAULT 2,
    outreach_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    outreach_emails_per_week INT NOT NULL DEFAULT 5,
    outreach_daily_cap      INT NOT NULL DEFAULT 10,
    outreach_type           VARCHAR(30) NOT NULL DEFAULT 'auto',
    quiet_hours_start       VARCHAR(5) DEFAULT '22:00',
    quiet_hours_end         VARCHAR(5) DEFAULT '08:00',
    timezone                VARCHAR(64) DEFAULT 'Europe/Istanbul',
    risk_threshold          VARCHAR(30) NOT NULL DEFAULT 'warn_requires_approval',
    last_run_at             TIMESTAMP WITH TIME ZONE,
    last_run_status         VARCHAR(30),
    last_run_message        TEXT,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE approvals ALTER COLUMN campaign_id DROP NOT NULL;
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS company_id VARCHAR(255);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS content_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_approvals_company_status ON approvals (company_id, status);
CREATE INDEX IF NOT EXISTS idx_approvals_content_id ON approvals (content_id);

ALTER TABLE contents ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'none';
