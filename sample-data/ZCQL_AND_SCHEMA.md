# InsightPatrol Data Store setup

## Important
ZCQL does **NOT** support:
```sql
CREATE TABLE ...
ALTER TABLE ...
ADD COLUMN ...
```
Create tables/columns in **Catalyst Console → Data Store** only.

---

## 1) Create tables (Console)

Create these 4 tables (names exact):

| Table        | Purpose              |
|--------------|----------------------|
| `crimes`     | Crime / FIR register |
| `offenders`  | Accused persons      |
| `cases`      | Crime ↔ offender     |
| `crime_links`| Related FIRs         |

System columns (`ROWID`, `CREATORID`, `CREATEDTIME`, `MODIFIEDTIME`) appear automatically — **do not delete**.

---

## 2) Columns to add (Console → Schema View → + New Column)

### crimes
| Column         | Data Type | Notes        |
|----------------|-----------|--------------|
| crime_id       | Text / Var Char (50) | already created |
| crime_type     | Text / Var Char (40) | |
| location       | Text / Var Char (40) | |
| date           | Text / Var Char (20) or Date | use text if unsure |
| severity       | Text / Var Char (20) | HIGH/MEDIUM/LOW |
| station_code   | Text / Var Char (40) | |
| station_name   | Text / Var Char (120) | |
| locality       | Text / Var Char (120) | |
| fir_no         | Text / Var Char (40) | |
| status         | Text / Var Char (80) | |
| modus          | Text / Var Char (200) | |
| section_hint   | Text / Var Char (80) | |

### offenders
| Column       | Data Type |
|--------------|-----------|
| offender_id  | Text / Var Char (20) |
| name         | Text / Var Char (80) |
| age          | Number / BigInt |
| repeat_flag  | Boolean (or Text) |
| alias        | Text / Var Char (40) |
| native_place | Text / Var Char (80) |

### cases
| Column      | Data Type |
|-------------|-----------|
| case_id     | Text / Var Char (20) |
| crime_id    | Text / Var Char (20) |
| offender_id | Text / Var Char (20) |
| io_rank     | Text / Var Char (20) |
| stage       | Text / Var Char (80) |

### crime_links
| Column           | Data Type |
|------------------|-----------|
| case_id          | Text / Var Char (20) |
| related_case_id  | Text / Var Char (20) |

---

## 3) After columns exist — ZCQL (ZCQL Console tab)

### Sample INSERTs (crimes)
```sql
INSERT INTO crimes (crime_id, crime_type, location, date, severity, station_code, station_name, locality, fir_no, status, modus, section_hint)
VALUES ('C0001', 'CYBER', 'BENGALURU', '2026-01-15', 'HIGH', 'CCPS-BLR', 'Cyber Crime Police Station, Bengaluru City', 'Indiranagar 100 Feet Road', '2026/CCPSBL/0100', 'Under Investigation', 'UPI phishing via fake bank SMS', 'IT Act / IPC 420')
```

```sql
INSERT INTO crimes (crime_id, crime_type, location, date, severity, station_code, station_name, locality, fir_no, status, modus, section_hint)
VALUES ('C0002', 'CYBER', 'BENGALURU', '2025-12-20', 'HIGH', 'WHITEFIELD-PS', 'Whitefield Police Station', 'Whitefield ITPL Road', '2026/WHITEF/0101', 'Under Investigation', 'OTP fraud on customer care call', 'IT Act / IPC 420')
```

### Sample INSERTs (offenders)
```sql
INSERT INTO offenders (offender_id, name, age, repeat_flag, alias, native_place)
VALUES ('O001', 'Ravi Kumar', 34, true, 'RK', 'Tumkur')
```

```sql
INSERT INTO offenders (offender_id, name, age, repeat_flag, alias, native_place)
VALUES ('O002', 'Suresh M', 28, true, 'Suri', 'Bengaluru')
```

### Sample INSERTs (cases)
```sql
INSERT INTO cases (case_id, crime_id, offender_id, io_rank, stage)
VALUES ('CS0001', 'C0001', 'O001', 'PSI', 'Under Investigation')
```

### Sample INSERTs (crime_links)
```sql
INSERT INTO crime_links (case_id, related_case_id)
VALUES ('CS0001', 'CS0002')
```

### Verify
```sql
SELECT * FROM crimes
```

```sql
SELECT crime_id, crime_type, location, fir_no, severity FROM crimes WHERE location = 'BENGALURU'
```

```sql
SELECT * FROM offenders WHERE repeat_flag = true
```

```sql
SELECT * FROM cases
```

```sql
SELECT * FROM crime_links
```

---

## 4) Faster bulk load (recommended)

After all columns exist, use CLI instead of many INSERTs:

```powershell
cd "C:\Users\vmpsuryv\Cursor\Datathon 2026\Insight_Patrol"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
catalyst ds:import ".\sample-data\crimes.csv" --table crimes
catalyst ds:import ".\sample-data\offenders.csv" --table offenders
catalyst ds:import ".\sample-data\cases.csv" --table cases
catalyst ds:import ".\sample-data\crime_links.csv" --table crime_links
```

CSV files are already in `sample-data/`.
