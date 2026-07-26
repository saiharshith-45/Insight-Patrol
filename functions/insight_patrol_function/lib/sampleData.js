'use strict';

/**
 * Realistic synthetic SCRB-style dataset for Karnataka (demo only).
 * Extra fields (station, locality, fir_no, status, modus) support investigation UI
 * while keeping core schema: crime_id, crime_type, location, date, severity.
 */

const LOCATION_COORDS = {
  BENGALURU: { lat: 12.9716, lng: 77.5946, label: 'Bengaluru City' },
  MYSURU: { lat: 12.2958, lng: 76.6394, label: 'Mysuru' },
  MANGALURU: { lat: 12.9141, lng: 74.856, label: 'Mangaluru' },
  HUBBALLI: { lat: 15.3647, lng: 75.124, label: 'Hubballi-Dharwad' },
  BELAGAVI: { lat: 15.8497, lng: 74.4977, label: 'Belagavi' },
  DAVANAGERE: { lat: 14.4644, lng: 75.9218, label: 'Davanagere' },
};

const STATIONS = {
  BENGALURU: [
    { code: 'CCPS-BLR', name: 'Cyber Crime Police Station, Bengaluru City', lat: 12.9784, lng: 77.5946 },
    { code: 'INDIRANAGAR-PS', name: 'Indiranagar Police Station', lat: 12.9784, lng: 77.6408 },
    { code: 'WHITEFIELD-PS', name: 'Whitefield Police Station', lat: 12.9698, lng: 77.7499 },
    { code: 'KG HALLI-PS', name: 'K.G. Halli Police Station', lat: 13.0206, lng: 77.6203 },
    { code: 'JAYANAGAR-PS', name: 'Jayanagar Police Station', lat: 12.9308, lng: 77.5838 },
    { code: 'YELAHANKA-PS', name: 'Yelahanka Police Station', lat: 13.1005, lng: 77.5963 },
  ],
  MYSURU: [
    { code: 'NAZARABAD-PS', name: 'Nazarabad Police Station', lat: 12.3100, lng: 76.6550 },
    { code: 'VV PURAM-PS', name: 'V.V. Puram Police Station', lat: 12.2950, lng: 76.6400 },
  ],
  MANGALURU: [
    { code: 'PANDESHWAR-PS', name: 'Pandeshwar Police Station', lat: 12.8700, lng: 74.8400 },
  ],
  HUBBALLI: [
    { code: 'HUBBALLI EAST-PS', name: 'Hubballi East Police Station', lat: 15.3647, lng: 75.1400 },
  ],
  BELAGAVI: [
    { code: 'APMC-PS', name: 'APMC Police Station, Belagavi', lat: 15.8497, lng: 74.5100 },
  ],
  DAVANAGERE: [
    { code: 'DAVANAGERE EAST-PS', name: 'Davanagere East Police Station', lat: 14.4644, lng: 75.9300 },
  ],
};

function monthOffset(monthsAgo, day = 10) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.min(day, 28));
  return d.toISOString().slice(0, 10);
}

function firNo(year, stationCode, seq) {
  const short = stationCode.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase();
  return `${year}/${short}/${String(seq).padStart(4, '0')}`;
}

function buildDataset() {
  const crimes = [];
  const offenders = [
    { offender_id: 'O001', name: 'Ravi Kumar', age: 34, repeat_flag: true, alias: 'RK', native_place: 'Tumkur' },
    { offender_id: 'O002', name: 'Suresh M', age: 28, repeat_flag: true, alias: 'Suri', native_place: 'Bengaluru' },
    { offender_id: 'O003', name: 'Anil Prasad', age: 41, repeat_flag: false, alias: '', native_place: 'Mysuru' },
    { offender_id: 'O004', name: 'Kiran Shetty', age: 31, repeat_flag: true, alias: 'KS', native_place: 'Mangaluru' },
    { offender_id: 'O005', name: 'Manoj D', age: 26, repeat_flag: false, alias: '', native_place: 'Hubballi' },
    { offender_id: 'O006', name: 'Naveen Gowda', age: 29, repeat_flag: true, alias: 'NG', native_place: 'Mandya' },
    { offender_id: 'O007', name: 'Imran Pasha', age: 36, repeat_flag: true, alias: 'IP', native_place: 'Bengaluru' },
    { offender_id: 'O008', name: 'Deepak Rao', age: 33, repeat_flag: false, alias: '', native_place: 'Belagavi' },
    { offender_id: 'O009', name: 'Sathish H', age: 45, repeat_flag: true, alias: 'SH', native_place: 'Davanagere' },
    { offender_id: 'O010', name: 'Venkatesh B', age: 38, repeat_flag: false, alias: '', native_place: 'Bengaluru' },
    { offender_id: 'O011', name: 'Farhan Ali', age: 27, repeat_flag: true, alias: 'FA', native_place: 'Shivajinagar' },
    { offender_id: 'O012', name: 'Prakash N', age: 42, repeat_flag: false, alias: '', native_place: 'Whitefield' },
  ];

  const cases = [];
  const crimeLinks = [];
  let crimeSeq = 1;
  let caseSeq = 1;
  let firSeq = 100;

  function addCrime(spec) {
    const stations = STATIONS[spec.location] || STATIONS.BENGALURU;
    const station = stations[spec.stationIndex % stations.length];
    const crimeId = `C${String(crimeSeq++).padStart(4, '0')}`;
    const year = new Date(spec.date).getFullYear();
    const crime = {
      crime_id: crimeId,
      crime_type: spec.crime_type,
      location: spec.location,
      date: spec.date,
      severity: spec.severity,
      station_code: station.code,
      station_name: station.name,
      locality: spec.locality,
      fir_no: firNo(year, station.code, firSeq++),
      status: spec.status || 'Under Investigation',
      modus: spec.modus || '',
      section_hint: spec.section_hint || '',
    };
    crimes.push(crime);

    if (spec.offender_id) {
      const caseId = `CS${String(caseSeq++).padStart(4, '0')}`;
      cases.push({
        case_id: caseId,
        crime_id: crimeId,
        offender_id: spec.offender_id,
        io_rank: spec.io_rank || 'PSI',
        stage: spec.status || 'Under Investigation',
      });
      return { crime, caseId };
    }
    return { crime, caseId: null };
  }

  // --- Cyber cluster Bengaluru (demo primary story) ---
  const cyberLocalities = [
    'Indiranagar 100 Feet Road', 'Whitefield ITPL Road', 'Koramangala 5th Block',
    'Electronic City Phase 1', 'MG Road', 'Yelahanka New Town', 'Jayanagar 4th Block',
    'Marathahalli Bridge', 'Hebbal Flyover area', 'Shivajinagar Market',
  ];
  const cyberModus = [
    'UPI phishing via fake bank SMS',
    'OTP fraud on customer care call',
    'Investment app scam',
    'Fake KYC WhatsApp link',
    'Job offer advance fee fraud',
    'SIM swap leading to account drain',
  ];
  const cyberMonths = [
    [0, 'HIGH', 0], [0, 'HIGH', 1], [0, 'MEDIUM', 2],
    [1, 'HIGH', 0], [1, 'MEDIUM', 3], [1, 'HIGH', 4],
    [2, 'MEDIUM', 1], [2, 'HIGH', 5], [2, 'LOW', 2],
    [3, 'HIGH', 0], [3, 'MEDIUM', 3], [3, 'MEDIUM', 4],
    [4, 'HIGH', 1], [4, 'MEDIUM', 5], [4, 'LOW', 2],
    [5, 'HIGH', 0], [5, 'HIGH', 3], [5, 'MEDIUM', 4], [5, 'LOW', 1], [5, 'HIGH', 5],
  ];
  const cyberOffenders = ['O001', 'O002', 'O004', 'O006', 'O007', 'O011', 'O001', 'O002', 'O006', 'O007'];
  const cyberCaseIds = [];

  cyberMonths.forEach(([m, sev, locIdx], i) => {
    const { caseId } = addCrime({
      crime_type: 'CYBER',
      location: 'BENGALURU',
      date: monthOffset(m, 5 + (i % 20)),
      severity: sev,
      stationIndex: i % 6,
      locality: cyberLocalities[locIdx % cyberLocalities.length],
      modus: cyberModus[i % cyberModus.length],
      offender_id: cyberOffenders[i % cyberOffenders.length],
      section_hint: 'IT Act / IPC 420',
      status: i % 5 === 0 ? 'Charge Sheet Filed' : 'Under Investigation',
      io_rank: 'PSI',
    });
    if (caseId) cyberCaseIds.push(caseId);
  });

  // Link cyber network (repeat offender ring)
  for (let i = 0; i < cyberCaseIds.length - 1; i += 2) {
    crimeLinks.push({ case_id: cyberCaseIds[i], related_case_id: cyberCaseIds[i + 1] });
  }
  crimeLinks.push({ case_id: cyberCaseIds[0], related_case_id: cyberCaseIds[4] });
  crimeLinks.push({ case_id: cyberCaseIds[2], related_case_id: cyberCaseIds[8] });

  // --- Theft / chain snatching Bengaluru ---
  const theftSpecs = [
    [1, 'HIGH', 'Indiranagar 12th Main', 'O006', 'TWO-wheeler snatching'],
    [1, 'MEDIUM', 'Jayanagar 4th Block', 'O010', 'Mobile snatching'],
    [2, 'HIGH', 'MG Road metro exit', 'O006', 'Chain snatching'],
    [2, 'MEDIUM', 'Koramangala Forum Mall area', 'O012', 'Vehicle theft'],
    [3, 'LOW', 'Yelahanka NES Road', 'O010', 'Bicycle / mobile theft'],
    [4, 'MEDIUM', 'Whitefield main road', 'O006', 'Chain snatching'],
  ];
  theftSpecs.forEach(([m, sev, loc, off, modus], i) => {
    addCrime({
      crime_type: 'THEFT',
      location: 'BENGALURU',
      date: monthOffset(m, 8 + i),
      severity: sev,
      stationIndex: i,
      locality: loc,
      modus,
      offender_id: off,
      section_hint: 'IPC 379 / 356',
      status: 'Under Investigation',
    });
  });

  // --- Assault ---
  [[2, 'HIGH', 'Shivajinagar', 'O007'], [3, 'MEDIUM', 'K.G. Halli', 'O011'], [5, 'HIGH', 'Hebbal', 'O007']].forEach(([m, sev, loc, off], i) => {
    addCrime({
      crime_type: 'ASSAULT',
      location: 'BENGALURU',
      date: monthOffset(m, 12),
      severity: sev,
      stationIndex: i + 1,
      locality: loc,
      modus: 'Physical assault / quarrel',
      offender_id: off,
      section_hint: 'IPC 323 / 324',
    });
  });

  // --- Fraud Mysuru / Bengaluru ---
  [[1, 'MEDIUM', 'MYSURU', 'O003', 'Nazarabad'], [2, 'HIGH', 'BENGALURU', 'O011', 'Commercial Street'], [4, 'MEDIUM', 'MYSURU', 'O003', 'V.V. Puram']].forEach(([m, sev, city, off, loc], i) => {
    addCrime({
      crime_type: 'FRAUD',
      location: city,
      date: monthOffset(m, 14),
      severity: sev,
      stationIndex: i,
      locality: loc,
      modus: 'Cheating / fake document',
      offender_id: off,
      section_hint: 'IPC 420',
    });
  });

  // --- Other districts ---
  addCrime({ crime_type: 'CYBER', location: 'MYSURU', date: monthOffset(3, 7), severity: 'LOW', stationIndex: 0, locality: 'Nazarbad circle', modus: 'Online shopping fraud', offender_id: 'O003', section_hint: 'IT Act' });
  addCrime({ crime_type: 'THEFT', location: 'MANGALURU', date: monthOffset(2, 9), severity: 'MEDIUM', stationIndex: 0, locality: 'Pandeshwar harbour road', modus: 'Shop theft', offender_id: 'O004', section_hint: 'IPC 379' });
  addCrime({ crime_type: 'DRUG', location: 'HUBBALLI', date: monthOffset(4, 11), severity: 'HIGH', stationIndex: 0, locality: 'Hubballi East', modus: 'NDPS recovery', offender_id: 'O005', section_hint: 'NDPS Act', status: 'Charge Sheet Filed' });
  addCrime({ crime_type: 'ROBBERY', location: 'BELAGAVI', date: monthOffset(2, 16), severity: 'HIGH', stationIndex: 0, locality: 'APMC yard', modus: 'Highway robbery', offender_id: 'O008', section_hint: 'IPC 392' });
  addCrime({ crime_type: 'THEFT', location: 'DAVANAGERE', date: monthOffset(1, 18), severity: 'MEDIUM', stationIndex: 0, locality: 'Davanagere East', modus: 'House break', offender_id: 'O009', section_hint: 'IPC 457 / 380' });
  addCrime({ crime_type: 'MURDER', location: 'BENGALURU', date: monthOffset(5, 3), severity: 'HIGH', stationIndex: 3, locality: 'K.G. Halli outskirts', modus: 'Homicide - under probe', offender_id: 'O009', section_hint: 'IPC 302', status: 'Under Investigation', io_rank: 'PI' });

  // Extra cyber without named accused yet (open for investigation)
  for (let i = 0; i < 8; i += 1) {
    addCrime({
      crime_type: 'CYBER',
      location: 'BENGALURU',
      date: monthOffset(i % 4, 20 + i),
      severity: i % 2 === 0 ? 'HIGH' : 'MEDIUM',
      stationIndex: i,
      locality: cyberLocalities[i % cyberLocalities.length],
      modus: cyberModus[i % cyberModus.length],
      offender_id: null,
      section_hint: 'IT Act',
      status: 'Open — Accused not identified',
    });
  }

  // --- Prior FIRs 2023–2025 (same accused, multi-year history for IO one-click dossier) ---
  function fixedDate(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const priorHistory = [
    { y: 2023, m: 3, d: 12, type: 'CYBER', loc: 'BENGALURU', st: 0, locality: 'Indiranagar 100 Feet Road', off: 'O001', modus: 'Fake loan app KYC fraud', sev: 'HIGH', status: 'Charge Sheet Filed' },
    { y: 2023, m: 8, d: 22, type: 'CYBER', loc: 'BENGALURU', st: 1, locality: 'MG Road', off: 'O001', modus: 'OTP fraud on customer care call', sev: 'HIGH', status: 'Charge Sheet Filed' },
    { y: 2024, m: 2, d: 9, type: 'FRAUD', loc: 'BENGALURU', st: 2, locality: 'Whitefield ITPL Road', off: 'O001', modus: 'Investment app scam', sev: 'MEDIUM', status: 'Charge Sheet Filed' },
    { y: 2024, m: 11, d: 4, type: 'CYBER', loc: 'BENGALURU', st: 0, locality: 'Koramangala 5th Block', off: 'O001', modus: 'UPI phishing via fake bank SMS', sev: 'HIGH', status: 'Under Investigation' },
    { y: 2023, m: 5, d: 18, type: 'THEFT', loc: 'BENGALURU', st: 1, locality: 'Indiranagar 12th Main', off: 'O006', modus: 'Chain snatching', sev: 'HIGH', status: 'Charge Sheet Filed' },
    { y: 2023, m: 11, d: 7, type: 'THEFT', loc: 'BENGALURU', st: 4, locality: 'Jayanagar 4th Block', off: 'O006', modus: 'TWO-wheeler snatching', sev: 'MEDIUM', status: 'Charge Sheet Filed' },
    { y: 2024, m: 4, d: 21, type: 'CYBER', loc: 'BENGALURU', st: 0, locality: 'Electronic City Phase 1', off: 'O006', modus: 'Job offer advance fee fraud', sev: 'HIGH', status: 'Under Investigation' },
    { y: 2024, m: 9, d: 15, type: 'THEFT', loc: 'BENGALURU', st: 2, locality: 'Whitefield main road', off: 'O006', modus: 'Chain snatching', sev: 'HIGH', status: 'Under Investigation' },
    { y: 2025, m: 1, d: 28, type: 'CYBER', loc: 'BENGALURU', st: 5, locality: 'Yelahanka New Town', off: 'O006', modus: 'SIM swap leading to account drain', sev: 'HIGH', status: 'Under Investigation' },
    { y: 2023, m: 6, d: 3, type: 'ASSAULT', loc: 'BENGALURU', st: 3, locality: 'K.G. Halli', off: 'O007', modus: 'Physical assault / quarrel', sev: 'MEDIUM', status: 'Charge Sheet Filed' },
    { y: 2024, m: 1, d: 19, type: 'CYBER', loc: 'BENGALURU', st: 0, locality: 'Shivajinagar Market', off: 'O007', modus: 'Fake KYC WhatsApp link', sev: 'HIGH', status: 'Charge Sheet Filed' },
    { y: 2024, m: 7, d: 30, type: 'ASSAULT', loc: 'BENGALURU', st: 4, locality: 'Hebbal Flyover area', off: 'O007', modus: 'Physical assault / quarrel', sev: 'HIGH', status: 'Under Investigation' },
    { y: 2025, m: 3, d: 11, type: 'CYBER', loc: 'BENGALURU', st: 1, locality: 'Marathahalli Bridge', off: 'O007', modus: 'OTP fraud on customer care call', sev: 'HIGH', status: 'Under Investigation' },
    { y: 2023, m: 9, d: 14, type: 'CYBER', loc: 'BENGALURU', st: 0, locality: 'Indiranagar 100 Feet Road', off: 'O002', modus: 'UPI phishing via fake bank SMS', sev: 'HIGH', status: 'Charge Sheet Filed' },
    { y: 2024, m: 6, d: 2, type: 'CYBER', loc: 'BENGALURU', st: 2, locality: 'Whitefield ITPL Road', off: 'O002', modus: 'Investment app scam', sev: 'MEDIUM', status: 'Under Investigation' },
    { y: 2025, m: 2, d: 17, type: 'CYBER', loc: 'BENGALURU', st: 0, locality: 'Koramangala 5th Block', off: 'O002', modus: 'Fake KYC WhatsApp link', sev: 'HIGH', status: 'Under Investigation' },
    { y: 2023, m: 4, d: 8, type: 'THEFT', loc: 'MANGALURU', st: 0, locality: 'Pandeshwar harbour road', off: 'O004', modus: 'Shop theft', sev: 'MEDIUM', status: 'Charge Sheet Filed' },
    { y: 2024, m: 10, d: 25, type: 'CYBER', loc: 'BENGALURU', st: 0, locality: 'Electronic City Phase 1', off: 'O004', modus: 'Job offer advance fee fraud', sev: 'HIGH', status: 'Under Investigation' },
    { y: 2023, m: 12, d: 1, type: 'FRAUD', loc: 'MYSURU', st: 0, locality: 'Nazarabad', off: 'O003', modus: 'Cheating / fake document', sev: 'MEDIUM', status: 'Charge Sheet Filed' },
    { y: 2024, m: 8, d: 16, type: 'CYBER', loc: 'MYSURU', st: 1, locality: 'V.V. Puram', off: 'O003', modus: 'Online shopping fraud', sev: 'LOW', status: 'Under Investigation' },
    { y: 2023, m: 7, d: 20, type: 'CYBER', loc: 'BENGALURU', st: 3, locality: 'Shivajinagar Market', off: 'O011', modus: 'OTP fraud on customer care call', sev: 'HIGH', status: 'Charge Sheet Filed' },
    { y: 2024, m: 5, d: 6, type: 'FRAUD', loc: 'BENGALURU', st: 1, locality: 'Commercial Street', off: 'O011', modus: 'Cheating / fake document', sev: 'MEDIUM', status: 'Under Investigation' },
    { y: 2025, m: 4, d: 22, type: 'ASSAULT', loc: 'BENGALURU', st: 3, locality: 'K.G. Halli', off: 'O011', modus: 'Physical assault / quarrel', sev: 'MEDIUM', status: 'Under Investigation' },
    { y: 2023, m: 2, d: 14, type: 'THEFT', loc: 'DAVANAGERE', st: 0, locality: 'Davanagere East', off: 'O009', modus: 'House break', sev: 'MEDIUM', status: 'Charge Sheet Filed' },
    { y: 2024, m: 12, d: 9, type: 'MURDER', loc: 'BENGALURU', st: 3, locality: 'K.G. Halli outskirts', off: 'O009', modus: 'Homicide - under probe', sev: 'HIGH', status: 'Under Investigation', io_rank: 'PI' },
  ];
  priorHistory.forEach((h) => {
    addCrime({
      crime_type: h.type,
      location: h.loc,
      date: fixedDate(h.y, h.m, h.d),
      severity: h.sev,
      stationIndex: h.st,
      locality: h.locality,
      modus: h.modus,
      offender_id: h.off,
      section_hint: h.type === 'CYBER' ? 'IT Act / IPC 420' : h.type === 'THEFT' ? 'IPC 379' : h.type === 'MURDER' ? 'IPC 302' : 'IPC',
      status: h.status,
      io_rank: h.io_rank || 'PSI',
    });
  });

  // Mark anyone with 2+ FIRs as repeat
  const countByOff = {};
  cases.forEach((c) => { countByOff[c.offender_id] = (countByOff[c.offender_id] || 0) + 1; });
  offenders.forEach((o) => {
    if ((countByOff[o.offender_id] || 0) >= 2) o.repeat_flag = true;
  });

  return { crimes, offenders, cases, crimeLinks };
}

const built = buildDataset();

module.exports = {
  LOCATION_COORDS,
  STATIONS,
  CRIMES: built.crimes,
  OFFENDERS: built.offenders,
  CASES: built.cases,
  CRIME_LINKS: built.crimeLinks,
};
