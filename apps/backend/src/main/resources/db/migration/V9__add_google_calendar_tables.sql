create table if not exists google_calendar_tokens (
    id bigserial primary key,
    user_id bigint not null,
    company_id varchar(255) not null,
    email varchar(500) not null default '',
    access_token text not null,
    refresh_token text,
    token_expiry timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create unique index if not exists idx_google_calendar_tokens_company_id on google_calendar_tokens (company_id);
create index if not exists idx_google_calendar_tokens_user_id on google_calendar_tokens (user_id);
