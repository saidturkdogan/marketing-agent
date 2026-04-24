create table if not exists campaigns (
    id bigserial primary key,
    campaign_id varchar(255) not null unique,
    topic varchar(2000) not null,
    status varchar(255) not null,
    target_platforms text,
    requested_outputs text,
    plan text,
    assets text,
    completed_steps text,
    performance_score double precision,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create table if not exists assets (
    id bigserial primary key,
    campaign_id varchar(255) not null,
    asset_type varchar(255) not null,
    content text,
    created_at timestamp with time zone not null
);

create index if not exists idx_assets_campaign_id on assets (campaign_id);

create table if not exists jobs (
    id bigserial primary key,
    job_id varchar(255) not null unique,
    campaign_id varchar(255) not null,
    status varchar(255) not null,
    error varchar(4000),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index if not exists idx_jobs_campaign_id on jobs (campaign_id);

create table if not exists publish_logs (
    id bigserial primary key,
    campaign_id varchar(255) not null,
    platform varchar(255) not null,
    status varchar(255) not null,
    external_post_id varchar(255),
    url varchar(255),
    payload text,
    created_at timestamp with time zone not null
);

create index if not exists idx_publish_logs_campaign_id on publish_logs (campaign_id);

create table if not exists rag_documents (
    id bigserial primary key,
    campaign_id varchar(255) not null,
    topic varchar(4000) not null,
    content text not null,
    embedding text,
    created_at timestamp with time zone not null
);

create index if not exists idx_rag_documents_campaign_id on rag_documents (campaign_id);
