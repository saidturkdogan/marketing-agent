CREATE TABLE contents (
    id              BIGSERIAL PRIMARY KEY,
    content_id      VARCHAR(36) NOT NULL UNIQUE,
    company_id      VARCHAR(36) NOT NULL,
    user_id         BIGINT NOT NULL,
    type            VARCHAR(30) NOT NULL DEFAULT 'tweet',
    title           VARCHAR(500),
    body            TEXT,
    hashtags        TEXT,
    image_url       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    platform_post_id VARCHAR(255),
    platform_url    TEXT,
    scheduled_at    TIMESTAMP WITH TIME ZONE,
    published_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contents_company ON contents(company_id);
CREATE INDEX idx_contents_user ON contents(user_id);
CREATE INDEX idx_contents_status ON contents(status);
