-- Sprint 8 · S8-1: daily bank balance check. Each check records what the bank showed, what the ledger said,
-- and the adjustment entry (if any) that closed the gap. The ledger stays the only source of the balance (D-03).
CREATE TABLE bank_balance_checks (
    id uuid NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL,
    user_id uuid,
    created_at timestamp(6),
    updated_at timestamp(6),
    bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    check_date date NOT NULL,
    actual_balance numeric(38,2) NOT NULL,
    ledger_balance numeric(38,2) NOT NULL,
    difference numeric(38,2) NOT NULL,
    adjustment_expense_id uuid
);
CREATE INDEX idx_balance_checks_account_date ON bank_balance_checks (tenant_id, bank_account_id, check_date DESC, created_at DESC);
