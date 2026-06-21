create table if not exists twitter_tokens (
    id bigserial primary key,
    user_id bigint not null,
    company_id varchar(255) not null,
    access_token text not null,
    access_secret text not null,
    twitter_user_id varchar(100),
    screen_name varchar(100),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create unique index if not exists idx_twitter_tokens_company_id on twitter_tokens (company_id);
create index if not exists idx_twitter_tokens_user_id on twitter_tokens (user_id);
