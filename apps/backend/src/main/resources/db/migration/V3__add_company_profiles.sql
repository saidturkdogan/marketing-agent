create table if not exists companies (
    id bigserial primary key,
    company_id varchar(255) not null unique,
    name varchar(500) not null,
    website_url varchar(2000),
    logo_url varchar(2000),
    industry varchar(500),
    description text,
    target_audience text,
    brand_voice text,
    value_proposition text,
    products_or_services text,
    competitors text,
    social_links text,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index if not exists idx_companies_company_id on companies (company_id);

alter table campaigns add column if not exists company_id varchar(255);
alter table campaigns add column if not exists company_snapshot text;

create index if not exists idx_campaigns_company_id on campaigns (company_id);
