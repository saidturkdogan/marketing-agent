CREATE TABLE IF NOT EXISTS outreach_prospects (
    id              BIGSERIAL PRIMARY KEY,
    prospect_id     VARCHAR(36) NOT NULL UNIQUE,
    company_id      VARCHAR(255) NOT NULL,
    contact_name    VARCHAR(255),
    organization    VARCHAR(500),
    email           VARCHAR(500),
    website         VARCHAR(1000),
    segment         VARCHAR(100),
    rationale       TEXT,
    source          VARCHAR(50) NOT NULL DEFAULT 'agent',
    subject         VARCHAR(1000),
    outreach_draft  TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'discovered',
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_prospects_company ON outreach_prospects (company_id, status);
CREATE INDEX IF NOT EXISTS idx_outreach_prospects_email ON outreach_prospects (company_id, email);

ALTER TABLE approvals ADD COLUMN IF NOT EXISTS outreach_prospect_id VARCHAR(36);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS outreach_to_email VARCHAR(500);
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS outreach_subject VARCHAR(1000);
