# Official Police FIR ER ↔ InsightPatrol alignment

**Source:** `Datathon 2026/Police_FIR_ER_Diagram.pdf` (Karnataka Police FIR System ER)  
**App:** InsightPatrol (Catalyst Data Store + demo seed)

> We did **not** miss the problem domain. Our tables are a **simplified operational slice** of the official ER, shaped for NLP/AI briefing + IO desk + patrol. Judges should see this mapping, not a full CCTNS rebuild.

---

## 1) What the ER requires (core)

| Official table | Role |
|----------------|------|
| **CaseMaster** | Central FIR / case |
| **Accused** | Accused linked to CaseMaster |
| **Victim** | Victims linked to CaseMaster |
| **ComplainantDetails** | Complainant(s) |
| **Act / Section / ActSectionAssociation** | Legal sections on FIR |
| **CrimeHead / CrimeSubHead** | Major / minor crime heads |
| **Unit** (+ UnitType, District, State) | Police station hierarchy |
| **Employee** (+ Rank, Designation) | Officers (IO / registrar) |
| **CaseStatusMaster / CaseCategory / GravityOffence** | Lookups |
| **ArrestSurrender** (+ ChargesheetDetails) | Arrest / CS events |
| **Court** | Court link |

---

## 2) How InsightPatrol maps today

| Official ER | InsightPatrol (current) | Status |
|-------------|-------------------------|--------|
| CaseMaster | `crimes` (+ `fir_no`, station, status, modus, lat/lng via locality/coords) | **Mapped (simplified)** |
| CaseMaster.CrimeNo / CaseNo | `crimes.fir_no`, `crimes.crime_id` | Partial — demo FIR format, not full 20-digit CrimeNo yet |
| Accused | `offenders` + link table `cases` (crime ↔ offender) | **Mapped** |
| Victim | — | **Gap** (optional demo table) |
| ComplainantDetails | — | **Gap** (optional) |
| Act / Section / ActSectionAssociation | `crimes.section_hint` (text) | **Partial** |
| CrimeHead / CrimeSubHead | `crimes.crime_type` | **Partial** (major type only) |
| GravityOffence | `crimes.severity` (HIGH/MEDIUM/LOW) | **Mapped (simplified)** |
| CaseStatusMaster | `crimes.status` + desk `case_updates` | **Mapped** |
| Unit (Police Station) | `station_code` / `station_name` on crimes; contacts desk | **Mapped (simplified)** |
| District / State | `crimes.location` (district city key) + SCRB Real-datasets | **Mapped (simplified)** |
| Employee | `officers_auth` + station officer roster | **Mapped (simplified)** |
| ArrestSurrender | — | **Gap** (status text covers “arrest” narrative only) |
| ChargesheetDetails | status “Charge Sheet Filed” on crime / updates | **Partial** |
| Court | — | **Gap** (low priority for intel demo) |
| Related cases | `crime_links` | **Extra** (useful for network / repeat accused) |
| Field duty (not in FIR ER) | `patrol_duties`, `patrol_logs` | **Product add-on** (datathon ops value) |

---

## 3) Field-level CaseMaster ↔ `crimes`

| CaseMaster column | InsightPatrol `crimes` |
|-------------------|------------------------|
| CaseMasterID | `crime_id` (C0001…) |
| CrimeNo / CaseNo | `fir_no` (e.g. 2026/CCPSBL/0100) — can add `crime_no` alias |
| CrimeRegisteredDate | `date` / `crime_date` |
| PoliceStationID → Unit | `station_code`, `station_name` |
| CrimeMajor/MinorHead | `crime_type` |
| GravityOffence | `severity` |
| CaseStatusID | `status` |
| latitude / longitude | station/beat coords + hotspot pins |
| BriefFacts | `modus` (+ AI brief) |
| PolicePersonID → Employee | assign IO via Case work / `case_updates` |

---

## 4) Accused ↔ `offenders` + `cases`

| Accused ER | InsightPatrol |
|------------|---------------|
| AccusedMasterID | `offenders.offender_id` |
| AccusedName | `offenders.name` |
| AgeYear | `offenders.age` |
| CaseMasterID (1:N) | `cases.crime_id` + `cases.offender_id` |
| PersonID (A1, A2…) | optional later |

Repeat accused / prior FIR history = same AccusedMaster across many CaseMaster rows — we already demo this.

---

## 5) What to do now (priority order)

### Must do before demo / submission (high impact, low risk)
1. **Keep this mapping doc** in the repo and show it to judges (“aligned to official FIR ER”).
2. **Rename language in UI/pitch:** say *CaseMaster / Accused / Unit* when explaining architecture.
3. **Add alias columns or comments** in schema docs: e.g. `crime_id` = CaseMasterID, `offender_id` = AccusedMasterID.
4. **Do not rewrite the whole app** into 25+ tables before the pitch — judges care about intelligence use-case + clear ER alignment.

### Should do if time (1–3 hours)
5. Seed minimal lookup-style rows or constants: CaseStatus, Gravity, CrimeHead names matching ER terms.
6. Add optional tables (even empty / few rows): `Victim`, `ComplainantDetails`, `ActSectionAssociation` — or one JSON field on crime for sections.
7. Format one demo `CrimeNo` like the PDF example (`104430006202600001`) alongside friendly `fir_no`.

### Nice to have (only if spare time)
8. ArrestSurrender / ChargesheetDetails / Court full tables.
9. Full Unit hierarchy (ParentUnit, UnitType).

---

## 6) One-line pitch for judges

> “InsightPatrol uses the official Karnataka FIR ER as the conceptual model: **CaseMaster → crimes**, **Accused → offenders**, **Unit → police stations**, **Employee → officers**. We implement the operational core needed for NLP query, repeat-accused history, IO desk, and patrol — with SCRB real aggregates — without rebuilding the entire CCTNS schema in Catalyst.”

---

## 7) Honest gaps (say this if asked)

- Full Act/Section master, Victim, Complainant, Court, ArrestSurrender are **not fully normalised** in Catalyst yet.
- Demo FIRs use readable station FIR numbers; official CrimeNo format can be added as an alias field.
- Patrol tables are **beyond** the FIR ER and are intentional for field-duty value.

That is acceptable for a datathon **intelligence** product if the mapping is explicit.
