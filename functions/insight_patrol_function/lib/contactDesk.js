'use strict';

/**
 * Quick Dial / Contact Desk — search & match Bengaluru City Police contacts.
 */

const data = require('./policeContacts');

function telHref(phone) {
  const raw = String(phone || '').split(',')[0].trim().replace(/[^\d+]/g, '');
  if (!raw) return '';
  return `tel:${raw}`;
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function scoreMatch(hay, needle) {
  const h = normalize(hay);
  const n = normalize(needle);
  if (!n || !h) return 0;
  if (h === n) return 100;
  if (h.includes(n) || n.includes(h)) return 80;
  // token overlap
  const ht = String(hay || '').toLowerCase().split(/\s+/);
  const nt = String(needle || '').toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  let hits = 0;
  nt.forEach((t) => { if (ht.some((x) => x.includes(t) || t.includes(x))) hits += 1; });
  return hits ? 40 + hits * 10 : 0;
}

function enrich(row) {
  const phone = row.phone || row.office || '';
  return {
    ...row,
    primary_phone: String(phone).split(',')[0].trim(),
    tel: telHref(phone || row.mobile),
    mobile_tel: telHref(row.mobile),
  };
}

function searchContacts(q, opts = {}) {
  const query = String(q || '').trim();
  const type = opts.type || 'all'; // all | station | traffic | senior
  const limit = opts.limit || 40;

  let pool = [];
  if (type === 'all' || type === 'station') pool = pool.concat(data.stations);
  if (type === 'all' || type === 'traffic') pool = pool.concat(data.traffic);
  if (type === 'all' || type === 'senior') {
    pool = pool.concat(data.seniors.map((s) => ({
      name: s.designation,
      designation: s.designation,
      division: 'Command',
      subdivision: '',
      phone: s.office,
      mobile: s.mobile,
      cug: s.cug,
      email: '',
      type: 'senior',
    })));
  }

  if (!query) {
    return {
      total: pool.length,
      results: pool.slice(0, limit).map(enrich),
      divisions: [...new Set(data.stations.map((s) => s.division))].sort(),
      counts: {
        stations: data.stations.length,
        traffic: data.traffic.length,
        seniors: data.seniors.length,
      },
    };
  }

  const ranked = pool.map((row) => {
    const s = Math.max(
      scoreMatch(row.name, query),
      scoreMatch(row.division, query),
      scoreMatch(row.subdivision, query),
      scoreMatch(row.designation, query),
      scoreMatch(row.email, query)
    );
    return { row, s };
  }).filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => enrich(x.row));

  return {
    total: ranked.length,
    results: ranked,
    query,
    divisions: [...new Set(data.stations.map((s) => s.division))].sort(),
    counts: {
      stations: data.stations.length,
      traffic: data.traffic.length,
      seniors: data.seniors.length,
    },
  };
}

/**
 * Match a FIR station_name to Law & Order + Traffic contacts.
 */
function matchStation(stationName) {
  const q = String(stationName || '').trim();
  if (!q) return { station: null, traffic: null, related: [] };

  const law = data.stations
    .map((row) => ({ row, s: scoreMatch(row.name, q) }))
    .filter((x) => x.s >= 40)
    .sort((a, b) => b.s - a.s)[0];

  const traf = data.traffic
    .map((row) => ({ row, s: scoreMatch(row.name, q) }))
    .filter((x) => x.s >= 40)
    .sort((a, b) => b.s - a.s)[0];

  const related = [];
  if (law) related.push(enrich(law.row));
  if (traf) related.push(enrich(traf.row));

  // Same division seniors hint for East / Whitefield etc.
  const div = law?.row?.division || '';
  if (div) {
    const dcp = data.seniors.find((s) =>
      String(s.designation).toLowerCase().includes(div.toLowerCase())
      && /dcp/i.test(s.designation)
    );
    if (dcp) {
      related.push(enrich({
        name: dcp.designation,
        designation: dcp.designation,
        phone: dcp.office,
        mobile: dcp.mobile,
        type: 'senior',
        division: div,
      }));
    }
  }

  return {
    query: q,
    station: law ? enrich(law.row) : null,
    traffic: traf ? enrich(traf.row) : null,
    related,
  };
}

function directorySummary() {
  return {
    counts: {
      stations: data.stations.length,
      traffic: data.traffic.length,
      seniors: data.seniors.length,
    },
    divisions: [...new Set(data.stations.map((s) => s.division))].sort(),
    featured: [
      ...data.stations.filter((s) =>
        /indiranagar|whitefield|jayanagar|yelahanka|koramangala|electronic|k\.g\. halli|ashoknagar|shivaji/i.test(s.name)
      ).map(enrich),
      ...data.seniors.filter((s) =>
        /Commissioner of Police, Bengaluru|DCP East|DCP Whitefield|DCP Control Room|Jt\.C\.P Crime/i.test(s.designation)
      ).map((s) => enrich({
        name: s.designation,
        designation: s.designation,
        phone: s.office,
        mobile: s.mobile,
        cug: s.cug,
        type: 'senior',
        division: 'Command',
      })),
    ],
  };
}

module.exports = {
  searchContacts,
  matchStation,
  directorySummary,
  telHref,
};
