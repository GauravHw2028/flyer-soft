// Both statements execute in one D1 batch (an atomic write transaction).
// The ledger is the sole source of truth; no cached client balance is trusted.
export const reserveJobSql = "INSERT INTO enhancements (id,owner,source,status,created) SELECT ?,?,?,'reserved',? WHERE (SELECT COALESCE(SUM(delta),0) FROM credit_ledger WHERE owner=?) >= 1";
export const debitSql = "INSERT INTO credit_ledger (id,owner,delta,reason,created) SELECT ?,?,-1,?,? WHERE EXISTS (SELECT 1 FROM enhancements WHERE id=? AND owner=? AND status='reserved')";
