'use strict';

/**
 * Embedded SCRB / KSP public crime statistics (2023–2025 Real-datasets).
 * These are district aggregates — used for AI context & Home briefing,
 * not for accused/FIR person lookup.
 */

const DISTRICT_2025 = [
  { unit: 'Bengaluru City', ipc: 37181, sll: 19291 },
  { unit: 'Mysuru City', ipc: 2224, sll: 1040 },
  { unit: 'Hubballi Dharwad City', ipc: 1488, sll: 1160 },
  { unit: 'Mangaluru City', ipc: 2278, sll: 1205 },
  { unit: 'Belagavi City', ipc: 1655, sll: 652 },
  { unit: 'Kalaburagi City', ipc: 1730, sll: 1010 },
  { unit: 'Bengaluru Dist', ipc: 6433, sll: 1187 },
  { unit: 'Bengaluru South', ipc: 3644, sll: 936 },
  { unit: 'Tumakuru', ipc: 5961, sll: 2509 },
  { unit: 'Davanagere', ipc: 3385, sll: 1386 },
  { unit: 'Mysuru Dist', ipc: 4952, sll: 912 },
  { unit: 'Mandya', ipc: 4780, sll: 1150 },
];

/** 2024 district head-wise (key cities) — from Crime_date_2024 matrix */
const CITY_HEADS_2024 = [
  {
    unit: 'Bengaluru City',
    murder: 176,
    theft: 9605,
    robbery: 693,
    cyber: 17682,
    pocso: 586,
    hurt: 3828,
  },
  {
    unit: 'Mysuru City',
    murder: 22,
    theft: 356,
    robbery: 45,
    cyber: 272,
    pocso: 65,
    hurt: 309,
  },
  {
    unit: 'Hubballi Dharwad City',
    murder: 22,
    theft: 221,
    robbery: 28,
    cyber: 247,
    pocso: 63,
    hurt: 170,
  },
  {
    unit: 'Mangaluru City',
    murder: 10,
    theft: 206,
    robbery: 19,
    cyber: 149,
    pocso: 63,
    hurt: 187,
  },
  {
    unit: 'Belagavi City',
    murder: 15,
    theft: 270,
    robbery: 28,
    cyber: 105,
    pocso: 28,
    hurt: 173,
  },
];

const SOURCE_NOTE = 'SCRB Karnataka public statistics (Real-datasets 2023–2025). Aggregate only — not individual FIR rows.';

function topDistrictsByIpc(limit = 6) {
  return DISTRICT_2025.slice().sort((a, b) => b.ipc - a.ipc).slice(0, limit);
}

function lookupCity2024(nameHint) {
  const q = String(nameHint || '').toLowerCase();
  if (!q) return CITY_HEADS_2024[0];
  return CITY_HEADS_2024.find((c) => c.unit.toLowerCase().includes(q) || q.includes(c.unit.toLowerCase().split(' ')[0]))
    || (q.includes('bengaluru') || q.includes('bangalore') ? CITY_HEADS_2024[0] : null);
}

function realStatsBrief(locationHint, crimeTypeHint) {
  const city = lookupCity2024(locationHint) || CITY_HEADS_2024[0];
  const tops = topDistrictsByIpc(5);
  const type = String(crimeTypeHint || '').toUpperCase();
  let headFocus = null;
  if (type === 'CYBER') headFocus = { label: 'Cyber crime (2024)', value: city.cyber };
  else if (type === 'THEFT') headFocus = { label: 'Theft (2024)', value: city.theft };
  else if (type === 'ROBBERY') headFocus = { label: 'Robbery (2024)', value: city.robbery };
  else if (type === 'MURDER') headFocus = { label: 'Murder (2024)', value: city.murder };

  return {
    source: SOURCE_NOTE,
    year_district_ipc_2025: tops,
    focus_city_2024: city,
    head_focus: headFocus,
    statewide_note: `Bengaluru City alone reported ${city.cyber.toLocaleString('en-IN')} cyber crimes and ${city.theft.toLocaleString('en-IN')} thefts in 2024 SCRB figures.`,
  };
}

function homeScrbCards() {
  const blr = CITY_HEADS_2024[0];
  const tops = topDistrictsByIpc(4);
  return {
    source: SOURCE_NOTE,
    cards: [
      { label: 'BLR cyber (2024)', value: blr.cyber },
      { label: 'BLR theft (2024)', value: blr.theft },
      { label: 'BLR IPC (2025)', value: DISTRICT_2025[0].ipc },
      { label: 'BLR SLL (2025)', value: DISTRICT_2025[0].sll },
    ],
    top_districts: tops,
  };
}

module.exports = {
  DISTRICT_2025,
  CITY_HEADS_2024,
  SOURCE_NOTE,
  topDistrictsByIpc,
  lookupCity2024,
  realStatsBrief,
  homeScrbCards,
};
