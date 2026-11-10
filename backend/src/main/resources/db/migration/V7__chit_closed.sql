-- Sprint 8 fix: a chit is active until its owner marks it closed (allotment alone does not end it).
ALTER TABLE chit_funds ADD COLUMN is_closed boolean NOT NULL DEFAULT false;
ALTER TABLE chit_funds ADD COLUMN closed_on date;
