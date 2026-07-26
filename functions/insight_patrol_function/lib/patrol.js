'use strict';

/**
 * Field Duty (patrol) — beat planning from hotspots + field logging.
 * Beats include lat/lng so officers can open Google Maps from the client.
 */

const catalyst = require('zcatalyst-sdk-node');
const { officersForBeat, allStationOfficers } = require('./stationOfficers');

const patrolLedger = {
  duties: [],
  logs: [],
};

const BEAT_AREAS = [
  { id: 'BEAT-IND-01', name: 'Indiranagar 100 Feet / 12th Main', station: 'Indiranagar PS', station_key: 'INDIRANAGAR-PS', city: 'Bengaluru', lat: 12.9784, lng: 77.6408 },
  { id: 'BEAT-WF-01', name: 'Whitefield ITPL Road', station: 'Whitefield PS', station_key: 'WHITEFIELD-PS', city: 'Bengaluru', lat: 12.9698, lng: 77.7499 },
  { id: 'BEAT-KOR-01', name: 'Koramangala 5th Block', station: 'Cyber Crime PS / South', station_key: 'CCPS-BLR', city: 'Bengaluru', lat: 12.9352, lng: 77.6245 },
  { id: 'BEAT-MG-01', name: 'MG Road / Brigade', station: 'Ashok Nagar area', station_key: 'ASHOKNAGAR-PS', city: 'Bengaluru', lat: 12.975, lng: 77.6063 },
  { id: 'BEAT-YEL-01', name: 'Yelahanka New Town', station: 'Yelahanka PS', station_key: 'YELAHANKA-PS', city: 'Bengaluru', lat: 13.1005, lng: 77.5963 },
  { id: 'BEAT-JAY-01', name: 'Jayanagar 4th Block', station: 'Jayanagar PS', station_key: 'JAYANAGAR-PS', city: 'Bengaluru', lat: 12.9308, lng: 77.5838 },
  { id: 'BEAT-KG-01', name: 'K.G. Halli / Tannery Road', station: 'K.G. Halli PS', station_key: 'KG HALLI-PS', city: 'Bengaluru', lat: 13.0206, lng: 77.6203 },
  { id: 'BEAT-EC-01', name: 'Electronic City Phase 1', station: 'Electronic City area', station_key: 'CCPS-BLR', city: 'Bengaluru', lat: 12.8399, lng: 77.6770 },
  { id: 'BEAT-MAJ-01', name: 'Majestic / Kempegowda Bus Stand', station: 'City Market area', station_key: 'ASHOKNAGAR-PS', city: 'Bengaluru', lat: 12.9767, lng: 77.5713 },
  { id: 'BEAT-MYS-01', name: 'Mysuru — Nazarabad / Devaraja', station: 'Nazarabad PS', station_key: 'NAZARABAD-PS', city: 'Mysuru', lat: 12.3100, lng: 76.6550 },
  { id: 'BEAT-MNG-01', name: 'Mangaluru — Pandeshwar / Port', station: 'Pandeshwar PS', station_key: 'PANDESHWAR-PS', city: 'Mangaluru', lat: 12.8700, lng: 74.8400 },
  { id: 'BEAT-HUB-01', name: 'Hubballi East / Gokul Road', station: 'Hubballi East PS', station_key: 'HUBBALLI EAST-PS', city: 'Hubballi', lat: 15.3647, lng: 75.1400 },
  { id: 'BEAT-BEL-01', name: 'Belagavi APMC / College Road', station: 'APMC PS Belagavi', station_key: 'APMC-PS', city: 'Belagavi', lat: 15.8497, lng: 74.5100 },
  { id: 'BEAT-DVG-01', name: 'Davanagere East / PB Road', station: 'Davanagere East PS', station_key: 'DAVANAGERE EAST-PS', city: 'Davanagere', lat: 14.4644, lng: 75.9300 },
];

function mapsLinks(lat, lng, label) {
  const q = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  const name = encodeURIComponent(label || q);
  return {
    maps_url: `https://www.google.com/maps/search/?api=1&query=${q}`,
    navigate_url: `https://www.google.com/maps/dir/?api=1&destination=${q}&destination_place_id=&travelmode=driving`,
    maps_label_url: `https://www.google.com/maps/search/?api=1&query=${name}`,
  };
}

function withMaps(beat) {
  const links = mapsLinks(beat.lat, beat.lng, beat.name);
  return { ...beat, ...links };
}

function listBeats() {
  return BEAT_AREAS.map(withMaps);
}

function listPatrol() {
  return {
    beats: listBeats(),
    duties: patrolLedger.duties.slice().reverse(),
    logs: patrolLedger.logs.slice().reverse(),
    officers: allStationOfficers(),
  };
}

function officersByBeat(beatId) {
  return officersForBeat(beatId);
}

async function tryInsert(req, tableName, row) {
  try {
    const app = catalyst.initialize(req);
    await app.datastore().table(tableName).insertRow(row);
    return 'catalyst_datastore';
  } catch (e) {
    return 'session_ledger';
  }
}

async function createDuty(req, body) {
  if (!body.can_patrol_plan && !/sho-|ci-|dysp-/.test(body.role_key || '')) {
    return {
      ok: false,
      summary: 'Only SHO / Circle Inspector / DySP can create field duties.',
      reasons: ['Your login cannot create field duties.'],
    };
  }

  const beat = BEAT_AREAS.find((b) => b.id === body.beat_id) || BEAT_AREAS[0];
  const officerList = officersForBeat(beat.id);
  const assignee = officerList.find((o) => o.id === body.assigned_to_id)
    || officerList.find((o) => `${o.rank} ${o.name}` === body.assigned_to)
    || null;
  const links = mapsLinks(beat.lat, beat.lng, beat.name);

  const row = {
    duty_id: `DUTY-${Date.now()}`,
    beat_id: beat.id,
    beat_name: beat.name,
    station: beat.station,
    city: beat.city || '',
    lat: beat.lat,
    lng: beat.lng,
    maps_url: links.maps_url,
    navigate_url: links.navigate_url,
    assigned_to_id: assignee?.id || body.assigned_to_id || '',
    assigned_to: assignee ? `${assignee.rank} ${assignee.name}` : (body.assigned_to || ''),
    assigned_by: body.assigned_by || '',
    duty_date: body.duty_date || new Date().toISOString().slice(0, 10),
    shift: body.shift || 'Evening / Night',
    priority: body.priority || 'NORMAL',
    reason: body.reason || 'Based on crime load in this area',
    status: 'Scheduled',
    created_at: new Date().toISOString(),
  };

  patrolLedger.duties.push(row);
  const persist = await tryInsert(req, 'PatrolDuties', row);

  return {
    ok: true,
    summary: `Field duty created: ${beat.name} on ${row.duty_date} → ${row.assigned_to || 'unit'} (${row.shift}).`,
    reasons: [
      `Area: ${beat.name}.`,
      `Maps: open navigate link for field team.`,
      `Persist: ${persist}.`,
    ],
    data: { patrol: listPatrol(), duty: row },
  };
}

async function addPatrolLog(req, body) {
  const beat = BEAT_AREAS.find((b) => b.id === body.beat_id);
  const row = {
    log_id: `PLOG-${Date.now()}`,
    beat_id: body.beat_id || '',
    beat_name: beat?.name || body.beat_name || '',
    lat: beat?.lat || null,
    lng: beat?.lng || null,
    maps_url: beat ? mapsLinks(beat.lat, beat.lng, beat.name).maps_url : '',
    officer: body.officer || '',
    observation_type: body.observation_type || 'General',
    detail: body.detail || '',
    action_taken: body.action_taken || '',
    linked_fir: body.linked_fir || '',
    duty_id: body.duty_id || '',
    duty_status: body.duty_status || '',
    created_at: new Date().toISOString(),
  };

  patrolLedger.logs.push(row);
  if (body.duty_id && body.duty_status) {
    const duty = patrolLedger.duties.find((d) => d.duty_id === body.duty_id);
    if (duty) duty.status = body.duty_status;
  }
  const persist = await tryInsert(req, 'PatrolLogs', row);

  return {
    ok: true,
    summary: `Field note saved${row.beat_name ? ` for ${row.beat_name}` : ''}.`,
    reasons: [
      `Type: ${row.observation_type}.`,
      row.linked_fir ? `Linked FIR: ${row.linked_fir}.` : 'No FIR linked.',
      `Persist: ${persist}.`,
    ],
    data: { patrol: listPatrol() },
  };
}

function matchBeatForStation(stationName, fallbackIdx) {
  const n = String(stationName || '').toLowerCase();
  const hit = BEAT_AREAS.find((b) =>
    n.includes(String(b.station_key || '').toLowerCase().split('-')[0])
    || n.includes(b.station.split(' ')[0].toLowerCase())
    || n.includes(b.name.split(' ')[0].toLowerCase())
    || (n.includes('jayanagar') && b.id === 'BEAT-JAY-01')
    || (n.includes('indira') && b.id === 'BEAT-IND-01')
    || (n.includes('white') && b.id === 'BEAT-WF-01')
    || (n.includes('yelahanka') && b.id === 'BEAT-YEL-01')
    || (n.includes('halli') && b.id === 'BEAT-KG-01')
    || (n.includes('cyber') && b.id === 'BEAT-KOR-01')
    || (n.includes('mysur') && b.id === 'BEAT-MYS-01')
    || (n.includes('mangal') && b.id === 'BEAT-MNG-01')
    || (n.includes('hubball') && b.id === 'BEAT-HUB-01')
    || (n.includes('belag') && b.id === 'BEAT-BEL-01')
    || (n.includes('davanag') && b.id === 'BEAT-DVG-01')
  );
  return hit || BEAT_AREAS[fallbackIdx % BEAT_AREAS.length];
}

function suggestFromIntel(stationBreakdown = [], hotspots = []) {
  const suggestions = [];

  stationBreakdown.slice(0, 6).forEach((s, idx) => {
    const beat = matchBeatForStation(s.station, idx);
    const links = mapsLinks(beat.lat, beat.lng, beat.name);
    suggestions.push({
      beat_id: beat.id,
      beat_name: beat.name,
      station: s.station || beat.station,
      city: beat.city,
      lat: beat.lat,
      lng: beat.lng,
      maps_url: links.maps_url,
      navigate_url: links.navigate_url,
      priority: (s.high || 0) >= 2 || (s.count || 0) >= 5 ? 'HIGH' : 'NORMAL',
      reason: `Crime load: ${s.count || 0} cases (${s.high || 0} HIGH) at ${s.station || beat.station}`,
      officers: officersForBeat(beat.id),
    });
  });

  if (!suggestions.length) {
    hotspots.slice(0, 4).forEach((h, i) => {
      const beat = matchBeatForStation(h.label || h.station_name, i);
      const links = mapsLinks(beat.lat, beat.lng, beat.name);
      suggestions.push({
        beat_id: beat.id,
        beat_name: beat.name,
        station: h.label || beat.station,
        city: beat.city,
        lat: beat.lat,
        lng: beat.lng,
        maps_url: links.maps_url,
        navigate_url: links.navigate_url,
        priority: h.flagged ? 'HIGH' : 'NORMAL',
        reason: `Hot area: ${h.label || beat.name} (${h.count || 0} incidents)`,
        officers: officersForBeat(beat.id),
      });
    });
  }

  if (!suggestions.length) {
    return BEAT_AREAS.slice(0, 4).map((b) => {
      const links = mapsLinks(b.lat, b.lng, b.name);
      return {
        beat_id: b.id,
        beat_name: b.name,
        station: b.station,
        city: b.city,
        lat: b.lat,
        lng: b.lng,
        maps_url: links.maps_url,
        navigate_url: links.navigate_url,
        priority: 'NORMAL',
        reason: 'Default coverage area — run a search first for better suggestions',
        officers: officersForBeat(b.id),
      };
    });
  }

  return suggestions;
}

module.exports = {
  listBeats,
  listPatrol,
  createDuty,
  addPatrolLog,
  suggestFromIntel,
  officersByBeat,
  BEAT_AREAS,
  mapsLinks,
};
