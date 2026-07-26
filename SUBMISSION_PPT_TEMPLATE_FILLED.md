# Submission notes (official template)

Copy into the organizer PPT. Team name: **Insight Patrol**.

Deployed app: https://insight-patrol-60079903362.development.catalystserverless.in/app/index.html  
Login: `sho.prakash` / `Ksp@2026`  
GitHub: https://github.com/saiharshith-45/Insight-Patrol  
Demo video: _(add after upload)_

---

## 1. Team details

- Team name: Insight Patrol  
- Team leader: _(fill)_  
- Team size: _(fill)_  
- Problem: Officers need a Catalyst-based way to query FIR/crime data in plain language, see hotspots and repeat accused, and act (assign case / send patrol) without jumping across many systems.

## 2. Brief

InsightPatrol is a web app on Zoho Catalyst. Login as an officer, ask a question (English or Kannada), get matching FIRs plus a short briefing, map hotspots, accused history, then Case work or Patrol with Maps links. Data model follows the FIR ER at a practical level (CaseMaster/Accused/Unit/Employee).

## 3. Opportunities

- Different from a plain dashboard: search + briefing + case desk + patrol in one place, with roles.  
- Solves “what’s pending at this PS / who is repeat / where to send beat tonight” faster.  
- USP: multilingual query, explainable reasons, Catalyst-only deploy, offline district map + Open in Maps (works when tile maps fail).

## 4. Features

Login · Home brief + SCRB cards · NLP search · AI briefing · Trends · Karnataka/BLR hotspots · Maps links · Linked/Repeat accused · FIR dossier · Case assign/status · Patrol duty · Contacts · Daily report

## 5–7. Diagrams

Use simple boxes: Login → Search/NLP → Function → Briefing/Map/Accused → Case work / Patrol.  
Architecture: Browser client → Catalyst Advanced I/O → Data Store / sample data / SCRB files.

## 8. Tech

Catalyst, Node.js, HTML/CSS/JS, Chart.js, GeoJSON SVG, Google Maps links, jsPDF.

## 9. Catalyst services

Advanced I/O Function, Web Client, Data Store, Catalyst CLI deploy.

## 10. Cost

Optional — prototype on Catalyst development; no paid map tiles or LLM required for demo.

## 11. Snapshots

Add screenshots from the live app (login, search, map, accused, patrol).

## 12. Performance notes

One function call per search; map works offline (GeoJSON); demo runs even if Data Store is empty (embedded sample).

## 13. Links

1. GitHub: https://github.com/saiharshith-45/Insight-Patrol  
2. Demo video: _(fill)_  
3. Deployed: https://insight-patrol-60079903362.development.catalystserverless.in/app/index.html  

## 14. Later

Full Act/Section/Victim/Court tables, live CCTNS feed, KGID login, audit log.

## 3-min video outline

Login → search Jayanagar pending → map + Open in Maps → repeat accused → FIR in Case work → patrol Navigate → end.
