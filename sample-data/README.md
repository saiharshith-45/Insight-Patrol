# Data Store: what CLI can and cannot do

## Important (Zoho Catalyst limitation)

**Tables and columns must be created in the Catalyst Console.**  
The CLI **cannot** create Data Store tables.

CLI **can** bulk-import CSV rows **after** tables exist:

```powershell
cd "C:\Users\vmpsuryv\Cursor\Datathon 2026\Insight_Patrol"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

catalyst ds:import ".\sample-data\crimes.csv" --table crimes
catalyst ds:import ".\sample-data\offenders.csv" --table offenders
catalyst ds:import ".\sample-data\cases.csv" --table cases
catalyst ds:import ".\sample-data\crime_links.csv" --table crime_links
```

Check job status:

```powershell
catalyst ds:status import <job_id>
```

## Create tables in Console (one-time)

1. Open [Catalyst Console](https://console.catalyst.zoho.in/) → project **Insight-Patrol**
2. Cloud Scale → **Data Store** → Create table

### crimes
crime_id, crime_type, location, date, severity, station_code, station_name, locality, fir_no, status, modus, section_hint  
(all Text except date can be text; date as text/date)

### offenders
offender_id, name, age (number), repeat_flag (boolean or text), alias, native_place

### cases
case_id, crime_id, offender_id, io_rank, stage

### crime_links
case_id, related_case_id

3. Then run the `ds:import` commands above.

Until tables are seeded, InsightPatrol uses the embedded synthetic SCRB dataset (46 crimes) — demo still works.
