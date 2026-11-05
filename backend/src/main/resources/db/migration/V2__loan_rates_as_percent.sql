-- Sprint 3 (S3-11): interest rates are stored as a percent per year (0.5 = 0.5%).
-- Before Sprint 3 a value below 1 was read as a fraction (0.105 = 10.5%); convert those rows once.
UPDATE loans SET interest_rate = interest_rate * 100 WHERE interest_rate > 0 AND interest_rate < 1;
