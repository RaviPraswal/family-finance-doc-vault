-- Sprint 7 T3 (ADR-001 / D-03): totals become "starting point + ledger".
-- The starting point is back-filled so every figure shown today stays exactly the same.

ALTER TABLE loans ADD COLUMN IF NOT EXISTS opening_outstanding numeric(38,2);
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS opening_deposited numeric(38,2);

-- Loan: outstanding = opening − principal repaid by ledger debits + amounts added by ledger credits.
UPDATE loans l SET opening_outstanding = l.outstanding_amount + COALESCE((
    SELECT SUM(CASE WHEN UPPER(e.type) = 'CREDIT' THEN -e.amount ELSE COALESCE(e.loan_principal_portion, e.amount) END)
      FROM expenses e WHERE e.linked_loan_id = l.id AND e.amount IS NOT NULL), 0)
 WHERE l.outstanding_amount IS NOT NULL;

-- Recurring deposit: total deposited = opening + ledger debits (instalments) − ledger credits (withdrawals).
UPDATE deposits d SET opening_deposited = COALESCE(d.total_deposited, 0) - COALESCE((
    SELECT SUM(CASE WHEN UPPER(e.type) = 'CREDIT' THEN -e.amount ELSE e.amount END)
      FROM expenses e WHERE e.linked_deposit_id = d.id AND e.amount IS NOT NULL), 0)
 WHERE UPPER(d.type) = 'RD';
