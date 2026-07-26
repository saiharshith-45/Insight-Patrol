'use strict';

const fs = require('fs');
const path = require('path');
const sample = require('./lib/sampleData');

function csvEscape(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, cols) {
  return [cols.join(',')]
    .concat(rows.map((r) => cols.map((c) => csvEscape(r[c])).join(',')))
    .join('\n');
}

const out = path.join(__dirname, '..', '..', 'sample-data');
fs.mkdirSync(out, { recursive: true });

// Use crime_date as YYYY-MM-DD only (valid for Catalyst Date OR Var Char)
const crimeRows = sample.CRIMES.map((c) => ({
  ...c,
  crime_date: c.date, // e.g. 2026-07-05
}));

fs.writeFileSync(
  path.join(out, 'crimes.csv'),
  toCsv(crimeRows, [
    'crime_id',
    'crime_type',
    'location',
    'crime_date',
    'severity',
    'station_code',
    'station_name',
    'locality',
    'fir_no',
    'status',
    'modus',
    'section_hint',
  ])
);

fs.writeFileSync(
  path.join(out, 'offenders.csv'),
  toCsv(sample.OFFENDERS, [
    'offender_id',
    'name',
    'age',
    'repeat_flag',
    'alias',
    'native_place',
  ])
);

fs.writeFileSync(
  path.join(out, 'cases.csv'),
  toCsv(sample.CASES, ['case_id', 'crime_id', 'offender_id', 'io_rank', 'stage'])
);

fs.writeFileSync(
  path.join(out, 'crime_links.csv'),
  toCsv(sample.CRIME_LINKS, ['case_id', 'related_case_id'])
);

console.log('CSV export OK →', out);
console.log('crimes header uses crime_date (not date)');
console.log('sample:', crimeRows[0].crime_id, crimeRows[0].crime_date);
