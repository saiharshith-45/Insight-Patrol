'use strict';

const { LOCATION_COORDS, STATIONS } = require('./sampleData');

function buildTrendPayload(crimes) {
  const buckets = {};
  for (const crime of crimes) {
    const month = String(crime.crime_date || crime.date).slice(0, 7);
    buckets[month] = (buckets[month] || 0) + 1;
  }
  const labels = Object.keys(buckets).sort();
  const values = labels.map((label) => buckets[label]);

  let direction = 'stable';
  let recent_avg = 0;
  let earlier_avg = 0;
  if (values.length >= 2) {
    const mid = Math.ceil(values.length / 2);
    const earlier = values.slice(0, mid);
    const recent = values.slice(mid);
    earlier_avg = avg(earlier);
    recent_avg = avg(recent);
    if (recent_avg > earlier_avg * 1.15) direction = 'increasing';
    else if (recent_avg < earlier_avg * 0.85) direction = 'decreasing';
  } else if (values.length === 1) {
    recent_avg = earlier_avg = values[0];
  }
  return { labels, values, direction, recent_avg: round(recent_avg), earlier_avg: round(earlier_avg) };
}

function buildMapPayload(crimes, focusLocation) {
  const locationCounts = {};
  for (const crime of crimes) {
    locationCounts[crime.location] = locationCounts[crime.location] || { count: 0, severity_score: 0 };
    locationCounts[crime.location].count += 1;
    locationCounts[crime.location].severity_score += severityWeight(crime.severity);
  }

  const hotspots = Object.entries(locationCounts)
    .map(([location, stats]) => {
      const coords = LOCATION_COORDS[location] || LOCATION_COORDS.BENGALURU;
      return {
        location,
        label: coords.label,
        lat: coords.lat,
        lng: coords.lng,
        count: stats.count,
        severity_score: stats.severity_score,
        flagged: stats.count >= 3 || stats.severity_score >= 6,
      };
    })
    .sort((a, b) => b.severity_score - a.severity_score || b.count - a.count);

  // Station-level markers for investigation drill-down
  const stationAgg = {};
  for (const crime of crimes) {
    const key = crime.station_code || crime.location;
    stationAgg[key] = stationAgg[key] || {
      station_code: crime.station_code || key,
      station_name: crime.station_name || crime.location,
      count: 0,
      severity_score: 0,
      lat: null,
      lng: null,
      locality_samples: [],
    };
    stationAgg[key].count += 1;
    stationAgg[key].severity_score += severityWeight(crime.severity);
    if (crime.locality && stationAgg[key].locality_samples.length < 3) {
      stationAgg[key].locality_samples.push(crime.locality);
    }
    if (!stationAgg[key].lat) {
      const stList = STATIONS[crime.location] || [];
      const st = stList.find((s) => s.code === crime.station_code) || stList[0];
      const fallback = LOCATION_COORDS[crime.location] || LOCATION_COORDS.BENGALURU;
      stationAgg[key].lat = (st && st.lat) || fallback.lat;
      stationAgg[key].lng = (st && st.lng) || fallback.lng;
    }
  }

  const station_hotspots = Object.values(stationAgg)
    .map((s) => ({ ...s, flagged: s.count >= 2 || s.severity_score >= 4 }))
    .sort((a, b) => b.count - a.count);

  const center = focusLocation && LOCATION_COORDS[focusLocation]
    ? { lat: LOCATION_COORDS[focusLocation].lat, lng: LOCATION_COORDS[focusLocation].lng, zoom: 11 }
    : { lat: 12.9716, lng: 77.5946, zoom: 7 };

  const markers = crimes.slice(0, 80).map((crime) => {
    const stList = STATIONS[crime.location] || [];
    const st = stList.find((s) => s.code === crime.station_code) || stList[0];
    const coords = st || LOCATION_COORDS[crime.location] || LOCATION_COORDS.BENGALURU;
    return {
      crime_id: crime.crime_id,
      fir_no: crime.fir_no,
      crime_type: crime.crime_type,
      location: crime.location,
      station_name: crime.station_name,
      locality: crime.locality,
      lat: coords.lat + jitter(crime.crime_id, 0.012),
      lng: coords.lng + jitter(crime.crime_id, 0.012),
      severity: crime.severity,
      date: crime.date,
      status: crime.status,
    };
  });

  return { center, hotspots, station_hotspots, markers };
}

function buildNetworkPayload(crimes, offenders, cases, crimeLinks) {
  const crimeIds = new Set(crimes.map((c) => c.crime_id));
  const relevantCases = cases.filter((c) => crimeIds.has(c.crime_id));
  const offenderMap = Object.fromEntries(offenders.map((o) => [o.offender_id, o]));
  const caseMap = Object.fromEntries(relevantCases.map((c) => [c.case_id, c]));

  const nodes = [];
  const links = [];
  const nodeIds = new Set();

  function addNode(node) {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  }

  for (const caseRow of relevantCases) {
    const offender = offenderMap[caseRow.offender_id];
    const crime = crimes.find((c) => c.crime_id === caseRow.crime_id);
    addNode({
      id: `offender:${caseRow.offender_id}`,
      type: 'offender',
      label: offender?.name || caseRow.offender_id,
      repeat_flag: Boolean(offender?.repeat_flag),
      age: offender?.age,
      native_place: offender?.native_place,
    });
    addNode({
      id: `case:${caseRow.case_id}`,
      type: 'case',
      label: crime?.fir_no || caseRow.case_id,
      crime_type: crime?.crime_type || 'UNKNOWN',
      station_name: crime?.station_name,
    });
    links.push({
      source: `offender:${caseRow.offender_id}`,
      target: `case:${caseRow.case_id}`,
      relation: 'accused_in',
    });
  }

  for (const link of crimeLinks) {
    if (!caseMap[link.case_id] || !caseMap[link.related_case_id]) continue;
    addNode({ id: `case:${link.case_id}`, type: 'case', label: link.case_id });
    addNode({ id: `case:${link.related_case_id}`, type: 'case', label: link.related_case_id });
    links.push({
      source: `case:${link.case_id}`,
      target: `case:${link.related_case_id}`,
      relation: 'linked_case',
    });
  }

  return { nodes, links };
}

function findRepeatOffenders(crimes, offenders, cases) {
  const crimeIds = new Set(crimes.map((c) => c.crime_id));
  const inWindowCounts = {};
  const totalCounts = {};
  const offenderCrimes = {};

  for (const caseRow of cases) {
    totalCounts[caseRow.offender_id] = (totalCounts[caseRow.offender_id] || 0) + 1;
    if (!crimeIds.has(caseRow.crime_id)) continue;
    inWindowCounts[caseRow.offender_id] = (inWindowCounts[caseRow.offender_id] || 0) + 1;
    offenderCrimes[caseRow.offender_id] = offenderCrimes[caseRow.offender_id] || [];
    const crime = crimes.find((c) => c.crime_id === caseRow.crime_id);
    if (crime) offenderCrimes[caseRow.offender_id].push(crime);
  }

  return offenders
    .filter((o) => (totalCounts[o.offender_id] || 0) > 1 || o.repeat_flag)
    .filter((o) => (inWindowCounts[o.offender_id] || 0) > 0 || o.repeat_flag)
    .map((o) => ({
      offender_id: o.offender_id,
      name: o.name,
      age: o.age,
      alias: o.alias || '',
      native_place: o.native_place || '',
      repeat_flag: o.repeat_flag || (totalCounts[o.offender_id] || 0) > 1,
      linked_cases: totalCounts[o.offender_id] || 0,
      recent_modus: (offenderCrimes[o.offender_id] || []).slice(0, 3).map((c) => c.modus).filter(Boolean),
      stations: [...new Set((offenderCrimes[o.offender_id] || []).map((c) => c.station_name).filter(Boolean))],
    }))
    .sort((a, b) => b.linked_cases - a.linked_cases);
}

function buildStationBreakdown(crimes) {
  const map = {};
  for (const c of crimes) {
    const key = c.station_name || c.location;
    map[key] = map[key] || { station: key, count: 0, high: 0, open: 0 };
    map[key].count += 1;
    if (c.severity === 'HIGH') map[key].high += 1;
    if (/open|under investigation/i.test(c.status || '')) map[key].open += 1;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

function buildCaseRegister(crimes, limit = 12) {
  return crimes
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit)
    .map((c) => ({
      fir_no: c.fir_no || c.crime_id,
      crime_id: c.crime_id,
      crime_type: c.crime_type,
      date: c.date,
      station_name: c.station_name || '',
      locality: c.locality || '',
      severity: c.severity,
      status: c.status || '',
      modus: c.modus || '',
    }));
}

function severityWeight(severity) {
  if (severity === 'HIGH') return 3;
  if (severity === 'MEDIUM') return 2;
  return 1;
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((sum, n) => sum + n, 0) / arr.length;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function jitter(key, scale) {
  let hash = 0;
  const str = String(key);
  for (let i = 0; i < str.length; i += 1) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return ((hash % 100) / 100 - 0.5) * scale;
}

module.exports = {
  buildTrendPayload,
  buildMapPayload,
  buildNetworkPayload,
  findRepeatOffenders,
  buildStationBreakdown,
  buildCaseRegister,
};
