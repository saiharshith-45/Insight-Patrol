# InsightPatrol

KSP Datathon 2026 project. Officer-facing crime intelligence app for Karnataka State Police, built and hosted on **Zoho Catalyst**.

**Live demo:** https://insight-patrol-60079903362.development.catalystserverless.in/app/index.html  

Login (demo): `sho.prakash` / `Ksp@2026`  
Other test users: `psi.naveen`, `ci.deepa`, `hc.sunil` (same password)

Team: **Insight Patrol**

---

## What it does

Officers can ask questions in English or Kannada (including Romanized), see matching FIRs, a short briefing, hotspots on a Karnataka map, repeat-accused history, then move to case assignment or patrol duty with Maps links.

We kept the data model close to the official FIR ER idea: CaseMaster ≈ crimes, Accused ≈ offenders, Unit ≈ police station, Employee ≈ officers. Notes in `sample-data/ER_ALIGNMENT.md`.

---

## Stack

- Zoho Catalyst — Advanced I/O function, web client, Data Store (optional)
- Node.js function under `functions/insight_patrol_function`
- Static web client under `client/`
- Chart.js for trends; GeoJSON for district map; Google Maps links for navigation
- SCRB district figures from `Real-datasets` (where available); FIR/accused demo data is sample seed

---

## Folder layout

```
client/                            web UI
functions/insight_patrol_function/ API + NLP + briefing + patrol
sample-data/                       CSV seeds + schema notes
Real-datasets/                     SCRB-related source files
```

---

## Run / deploy

Needs Catalyst CLI and a linked project (`catalyst.json` is already here).

```powershell
cd functions/insight_patrol_function
npm install

cd ../..
# if SSL issues on corporate network:
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
catalyst deploy
```

Client URLs are in `client/config.js`. Point them at your function URL if you fork the project.

Data Store tables are optional for the demo — the function ships with an embedded sample register. To use Data Store, create tables in the Catalyst console and import CSVs from `sample-data/` (see `sample-data/README.md`). Quick local check:

```powershell
cd functions/insight_patrol_function
node -e "const {parseIntent}=require('./lib/intentParser'); console.log(parseIntent('pending cases in jayanagar ps'));"
```

---

## Quick walkthrough (demo)

1. Login as SHO  
2. Search: `pending cases in jayanagar ps`  
3. Open PS hotspots (Karnataka / Bengaluru) → Open in Maps  
4. Repeat accused → open a name → open an FIR in Case work  
5. Patrol tab → suggestion → Navigate / create duty  

---

## Datathon notes

- Deployment is on Catalyst only (as required).  
- Accused names in the sample register are for demo workflows, not live CCTNS extract.  
- Submission PPT notes: `SUBMISSION_PPT_TEMPLATE_FILLED.md`
