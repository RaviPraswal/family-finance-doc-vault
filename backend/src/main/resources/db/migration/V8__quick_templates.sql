-- Sprint 8: Quick Logger templates move from the browser (shared by everyone on the computer) to the server, one set per person.
create table quick_templates (
    id uuid not null primary key,
    tenant_id uuid not null,
    user_id uuid not null,
    name varchar(120) not null,
    amount numeric(38,2) not null,
    category varchar(255) not null,
    type varchar(20) not null check (type in ('DEBIT','CREDIT')),
    made_against varchar(50),
    linked_investment_id uuid,
    linked_income_source_id uuid,
    created_at timestamp(6),
    updated_at timestamp(6)
);
create index idx_quick_templates_owner on quick_templates (tenant_id, user_id);
