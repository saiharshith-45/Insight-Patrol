'use strict';

const catalyst = require('zcatalyst-sdk-node');
const sampleData = require('./sampleData');

const TABLE_NAMES = ['crimes', 'offenders', 'cases', 'crime_links'];

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); }
      catch (err) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

async function fetchTableRows(catalystApp, tableName) {
  try {
    const table = catalystApp.datastore().table(tableName);
    const response = await table.getAllRows();
    return response || [];
  } catch (err) {
    // Try ZCQL fallback (table name may need exact Catalyst casing)
    try {
      const zcql = catalystApp.zcql();
      const result = await zcql.executeZCQLQuery(`SELECT * FROM ${tableName}`);
      return (result || []).map((row) => row[tableName] || row);
    } catch (zcqlErr) {
      return [];
    }
  }
}

async function loadCrimeData(req) {
  const meta = { attempted_datastore: false, error: null };
  try {
    meta.attempted_datastore = true;
    const catalystApp = catalyst.initialize(req);
    const [crimes, offenders, cases, crimeLinks] = await Promise.all(
      TABLE_NAMES.map((name) => fetchTableRows(catalystApp, name))
    );

    if (crimes.length > 0) {
      const base = {
        crimes: normalizeRows(crimes, 'crimes'),
        offenders: normalizeRows(offenders, 'offenders'),
        cases: normalizeRows(cases, 'cases'),
        crime_links: normalizeRows(crimeLinks, 'crime_links'),
      };
      const merged = mergeSampleHistory(base);
      return {
        ...merged,
        source: 'catalyst_datastore',
        connection: {
          status: 'connected',
          tables: {
            crimes: merged.crimes.length,
            offenders: merged.offenders.length,
            cases: merged.cases.length,
            crime_links: merged.crime_links.length,
          },
          note: 'Prior FIR history rows from demo sample may be merged when missing in Data Store.',
        },
      };
    }
    meta.error = 'Data Store tables empty or not seeded';
  } catch (err) {
    meta.error = err.message;
  }

  return {
    crimes: sampleData.CRIMES,
    offenders: sampleData.OFFENDERS,
    cases: sampleData.CASES,
    crime_links: sampleData.CRIME_LINKS,
    source: 'sample_fallback',
    connection: {
      status: 'fallback',
      message: meta.error || 'Using embedded synthetic SCRB dataset until Data Store is seeded',
      tables: {
        crimes: sampleData.CRIMES.length,
        offenders: sampleData.OFFENDERS.length,
        cases: sampleData.CASES.length,
        crime_links: sampleData.CRIME_LINKS.length,
      },
    },
  };
}

function normalizeRows(rows, tableName) {
  return rows.map((row) => {
    const normalized = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[String(key).toLowerCase()] = value;
    }
    if (tableName === 'crime_links') {
      return {
        case_id: normalized.case_id,
        related_case_id: normalized.related_case_id,
      };
    }
    if (tableName === 'offenders') {
      return {
        offender_id: normalized.offender_id,
        name: normalized.name,
        age: Number(normalized.age) || normalized.age,
        repeat_flag: String(normalized.repeat_flag).toLowerCase() === 'true' || normalized.repeat_flag === true,
        alias: normalized.alias || '',
        native_place: normalized.native_place || '',
      };
    }
    if (tableName === 'crimes') {
      return {
        ...normalized,
        date: normalized.crime_date || normalized.date,
        crime_date: normalized.crime_date || normalized.date,
      };
    }
    return normalized;
  });
}

function mergeSampleHistory(domain) {
  const crimeIds = new Set(domain.crimes.map((c) => c.crime_id));
  const offenderIds = new Set(domain.offenders.map((o) => o.offender_id));
  const caseIds = new Set(domain.cases.map((c) => c.case_id));

  const extraCrimes = sampleData.CRIMES.filter((c) => !crimeIds.has(c.crime_id));
  const extraOffenders = sampleData.OFFENDERS.filter((o) => !offenderIds.has(o.offender_id));
  const extraCases = sampleData.CASES.filter((c) => !caseIds.has(c.case_id));
  const extraLinks = sampleData.CRIME_LINKS.filter((l) =>
    !domain.crime_links.some((x) => x.case_id === l.case_id && x.related_case_id === l.related_case_id)
  );

  const offenders = domain.offenders.concat(extraOffenders);
  // refresh repeat flags from full case set
  const allCases = domain.cases.concat(extraCases);
  const countByOff = {};
  allCases.forEach((c) => { countByOff[c.offender_id] = (countByOff[c.offender_id] || 0) + 1; });
  offenders.forEach((o) => {
    if ((countByOff[o.offender_id] || 0) >= 2) o.repeat_flag = true;
  });

  return {
    crimes: domain.crimes.concat(extraCrimes),
    offenders,
    cases: allCases,
    crime_links: domain.crime_links.concat(extraLinks),
  };
}

function filterCrimes(crimes, entities) {
  const months = entities.time_range_months;
  const cutoff = months === 0 || months == null ? null : (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - (months || 6));
    return d;
  })();

  const stationNeedle = String(entities.station || '').toLowerCase().trim();
  const statusNeedle = String(entities.status || '').toLowerCase().trim();

  return crimes.filter((crime) => {
    const raw = crime.crime_date || crime.date;
    const crimeDate = new Date(raw);
    if (cutoff && (Number.isNaN(crimeDate.getTime()) || crimeDate < cutoff)) return false;
    if (entities.crime_type && crime.crime_type !== entities.crime_type) return false;
    if (entities.location && crime.location !== entities.location) return false;
    if (stationNeedle) {
      // Match PS name/code only — not locality (scene area ≠ station jurisdiction).
      const code = String(crime.station_code || '').toLowerCase();
      const name = String(crime.station_name || '').toLowerCase();
      const hit = name.includes(stationNeedle) || code.includes(stationNeedle)
        || stationNeedle.split(/\s+/).filter((t) => t.length >= 3).every((t) => name.includes(t) || code.includes(t));
      if (!hit) return false;
    }
    if (statusNeedle === 'open') {
      if (!/open|under investigation|pending|accused not identified|evidence/i.test(crime.status || '')) {
        return false;
      }
    }
    if (statusNeedle === 'closed') {
      if (!/charge sheet|closed|final report/i.test(crime.status || '')) return false;
    }
    return true;
  });
}

module.exports = {
  readJsonBody,
  loadCrimeData,
  filterCrimes,
  mergeSampleHistory,
};
