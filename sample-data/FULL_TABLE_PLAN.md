# InsightPatrol — full Data Store table plan (investigation + patrol)

ZCQL cannot `CREATE TABLE`. Create each table in **Catalyst Console → Data Store**.

Demo login works **without** tables (embedded roster). Seed `officers_auth` to override.

---

## Priority tables (create these)

| # | Table | Purpose |
|---|--------|---------|
| 1 | `crimes` | FIR / crime register |
| 2 | `offenders` | Accused persons |
| 3 | `cases` | Crime ↔ offender IO stage |
| 4 | `crime_links` | Related FIRs |
| 5 | `officers_auth` | Officer login + permissions |
| 6 | `case_updates` | Assignments / status / notes |
| 7 | `patrol_duties` | Beat deployment orders |
| 8 | `patrol_logs` | Field observations from patrol |

Optional later: `attachments_meta`, `watchlist`, `duty_roster`.

---

## officers_auth columns

| Column | Type | Notes |
|--------|------|-------|
| officer_id | Text (40) | OFF-PSI-01 |
| username | Text (40) | psi.naveen |
| password | Text (40) | **Demo only** — Ksp@2026 |
| rank | Text (40) | PSI / SHO / CI / DySP / HC / PC |
| name | Text (80) | |
| unit | Text (120) | PS / Circle / Sub-Division |
| role_key | Text (40) | psi-io-cyber, sho-whitefield… |
| can_assign | Boolean/Text | SHO/CI/DySP |
| can_patrol_plan | Boolean/Text | Supervisors |
| can_investigate | Boolean/Text | IO desk |
| can_patrol | Boolean/Text | HC/PC field |

Import: `sample-data/officers_auth.csv`

**Demo password for all:** `Ksp@2026`

| Username | Role |
|----------|------|
| dysp.ramesh | DySP |
| ci.deepa | Circle Inspector |
| sho.prakash | SHO Whitefield |
| psi.naveen | PSI IO Cyber |
| psi.kavitha | PSI IO Indiranagar |
| asi.mahesh | ASI Cyber |
| hc.sunil | Head Constable (patrol) |
| pc.anand | Constable (patrol) |

---

## case_updates columns

| Column | Type |
|--------|------|
| update_id | Text (40) |
| action_type | Text (20) | ASSIGN / STATUS |
| crime_id | Text (20) |
| fir_no | Text (40) |
| status | Text (80) |
| assigned_to | Text (120) |
| assigned_by | Text (120) |
| note | Text (500) |
| attachment_name | Text (200) |
| created_at | Text (40) |

---

## patrol_duties columns

| Column | Type |
|--------|------|
| duty_id | Text (40) |
| beat_id | Text (40) |
| beat_name | Text (120) |
| station | Text (120) |
| assigned_to | Text (120) |
| assigned_by | Text (120) |
| shift | Text (40) |
| priority | Text (20) | HIGH / NORMAL |
| reason | Text (300) |
| status | Text (40) | Scheduled / On Beat / Completed |
| created_at | Text (40) |

---

## patrol_logs columns

| Column | Type |
|--------|------|
| log_id | Text (40) |
| duty_id | Text (40) |
| beat_id | Text (40) |
| beat_name | Text (120) |
| officer | Text (120) |
| observation_type | Text (60) | Suspicious / Verification / Community / Arrest assist |
| detail | Text (500) |
| action_taken | Text (300) |
| linked_fir | Text (40) |
| status | Text (40) |
| created_at | Text (40) |

---

## crimes / offenders / cases / crime_links

See `ZCQL_AND_SCHEMA.md` and existing CSVs. Prefer `crime_date` (YYYY-MM-DD) for crimes.

---

## How officers should use the product (senior officer view)

1. **Login** — every action attributed to a named officer / unit.
2. **Command** — open HIGH cases, repeat accused, patrol suggestions at a glance.
3. **Intelligence** — conversational EN / ಕನ್ನಡ query → trends, hotspots, links, repeats.
4. **Case Desk** — SHO/CI/DySP assign; IO update status + attachment names.
5. **Patrol** — convert hotspot intel into beat duties; HC/PC file field logs linked to FIR.
6. **Brief** — one PDF for night briefing / court prep / senior review.
