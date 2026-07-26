# Optional table: case_updates

Create in Catalyst Data Store if you want assignments/status to persist beyond the function warm instance.

## Columns (all Text/Var Char unless noted)
- update_id
- fir_no
- crime_id
- action_type   (ASSIGN / STATUS)
- status
- assigned_to
- assigned_by
- note
- attachment_name
- officer_role
- created_at

Without this table, Case Desk still works using the function session ledger (demo-safe).
