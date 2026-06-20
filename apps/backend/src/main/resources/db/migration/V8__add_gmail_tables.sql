create table if not exists gmail_tokens (
    id bigserial primary key,
    user_id bigint not null,
    company_id varchar(255) not null,
    email varchar(500) not null,
    access_token text not null,
    refresh_token text,
    token_expiry timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index if not exists idx_gmail_tokens_company_id on gmail_tokens (company_id);
create index if not exists idx_gmail_tokens_user_id on gmail_tokens (user_id);

create table if not exists gmail_messages (
    id bigserial primary key,
    company_id varchar(255) not null,
    message_id varchar(500) not null,
    from_addr varchar(500),
    to_addr varchar(500),
    subject varchar(1000),
    snippet text,
    received_at timestamp with time zone,
    fetched_at timestamp with time zone not null
);

create index if not exists idx_gmail_messages_company_id on gmail_messages (company_id);
create index if not exists idx_gmail_messages_message_id on gmail_messages (message_id);
