create table if not exists users (
    id bigserial primary key,
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    name varchar(255) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

alter table companies add column if not exists user_id bigint;
alter table companies add constraint fk_companies_user foreign key (user_id) references users(id);