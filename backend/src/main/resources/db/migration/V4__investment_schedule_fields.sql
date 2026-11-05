-- Sprint 6 (S6-04): what a scheduled investment such as Sukanya Samriddhi is projected from.
ALTER TABLE investments ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS yearly_contribution numeric(38,2);
ALTER TABLE investments ADD COLUMN IF NOT EXISTS interest_rate float(53);
