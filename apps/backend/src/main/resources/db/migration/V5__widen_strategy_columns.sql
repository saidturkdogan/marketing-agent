alter table if exists strategies
    alter column business_type type text,
    alter column target_country type text,
    alter column target_language type text,
    alter column product_description type text,
    alter column average_price type text,
    alter column persona_type type text,
    alter column goal type text;
