-- Sprint 5 (S5-03): the details a loan's full EMI schedule is built from.
ALTER TABLE loans ADD COLUMN IF NOT EXISTS tenure_months integer;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS first_emi_date date;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS disbursement_date date;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS paid_installments_opening integer;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS foreclosure_rate float(53);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS foreclosure_lock_in_months integer;
