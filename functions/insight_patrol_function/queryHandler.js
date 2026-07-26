'use strict';

const { parseIntent, INTENTS } = require('./lib/intentParser');
const { loadCrimeData, filterCrimes } = require('./lib/dataStore');
const { buildReasons, buildSummary } = require('./lib/explainability');
const {
  buildTrendPayload,
  buildMapPayload,
  buildNetworkPayload,
  findRepeatOffenders,
  buildStationBreakdown,
  buildCaseRegister,
} = require('./lib/analytics');
const { lookupByFirOrCrime, buildOffenderDossier } = require('./lib/investigation');
const { analyseOfficerQuery } = require('./lib/aiAnalyst');
const { realStatsBrief } = require('./lib/realStats');

async function handleQueryCrime(queryText, req, options = {}) {
  const query = String(queryText || '').trim();
  if (!query) {
    return errorResponse('Enter a query. Example: "Show cyber crime trends in Bengaluru in last 6 months"');
  }

  const domain = await loadCrimeData(req);
  const langPref = String(options.language_pref || options.language || '').toLowerCase();

  // FIR / crime dossier shortcut
  if (/fir|crime[_\s-]?id|dossier|case\s*(details|file)/i.test(query) || /\d{4}\/[a-z0-9]+\//i.test(query)) {
    const dossier = lookupByFirOrCrime(domain, query);
    if (dossier) {
      return buildDossierResponse(dossier, domain, query, langPref);
    }
  }

  // Offender profile shortcut
  if (/offender|accused|suspect|profile|who is|prior fir|history/i.test(query)) {
    const nameGuess = query.replace(/offender|accused|suspect|profile|who is|show|details|of|prior|fir|history/gi, '').trim();
    const dossier = buildOffenderDossier(domain, nameGuess || query);
    if (dossier) {
      return buildOffenderResponse(dossier, domain, langPref);
    }
  }

  const parsed = parseIntent(query);
  let { intent, entities, language_mode: languageMode } = parsed;

  // Global UI language overrides auto-detect (so Kannada query can still answer in English)
  if (langPref === 'en' || langPref === 'english') languageMode = 'en';
  else if (langPref === 'kn' || langPref === 'kannada') languageMode = 'kn';

  if (options.forceIntent) intent = options.forceIntent;

  const allInWindow = filterCrimes(domain.crimes, {
    crime_type: null,
    location: entities.location,
    time_range_months: entities.time_range_months,
  });
  const filteredCrimes = filterCrimes(domain.crimes, entities);

  const trend = buildTrendPayload(filteredCrimes);
  const map = buildMapPayload(filteredCrimes, entities.location);
  const network = buildNetworkPayload(
    filteredCrimes,
    domain.offenders,
    domain.cases,
    domain.crime_links
  );
  const repeatOffenders = findRepeatOffenders(filteredCrimes, domain.offenders, domain.cases);
  const stationBreakdown = buildStationBreakdown(filteredCrimes);
  const caseRegister = buildCaseRegister(filteredCrimes, 15);

  const reasons = buildReasons({
    intent,
    entities,
    filteredCrimes,
    allCrimesInScope: allInWindow,
    repeatOffenders,
    hotspots: map.hotspots,
    network,
    trend,
    dataSource: domain.source,
    languageMode,
    stationBreakdown,
  });

  const summary = buildSummary({
    intent,
    entities,
    filteredCrimes,
    repeatOffenders,
    hotspots: map.hotspots,
    trend,
    stationBreakdown,
    languageMode,
  });

  const ai_analysis = await analyseOfficerQuery(req, {
    query,
    intent,
    languageMode,
    filteredCrimes,
    stationBreakdown,
    repeatOffenders,
    trend,
    entities,
  });

  const scrb = realStatsBrief(entities.location, entities.crime_type);

  return {
    summary,
    data: {
      intent,
      entities,
      language_mode: languageMode,
      language_pref: langPref || 'auto',
      original_query: query,
      normalized_query: parsed.normalized_query,
      engine: 'rule_based_nlp+ai_analyst',
      total_matches: filteredCrimes.length,
      crimes: filteredCrimes.slice(0, 30),
      case_register: caseRegister,
      station_breakdown: stationBreakdown,
      repeat_offenders: repeatOffenders,
      trend_direction: trend.direction,
      top_hotspot: map.hotspots[0] || null,
      data_source: domain.source,
      connection: domain.connection,
      ai_analysis,
      scrb_stats: scrb,
    },
    visual_payload: {
      focus: resolveVisualFocus(intent),
      trend: {
        labels: trend.labels,
        values: trend.values,
        direction: trend.direction,
      },
      map,
      network,
      investigation: {
        open_cases: filteredCrimes.filter((c) => /open|under investigation/i.test(c.status || '')).length,
        charge_sheeted: filteredCrimes.filter((c) => /charge sheet/i.test(c.status || '')).length,
        high_severity: filteredCrimes.filter((c) => c.severity === 'HIGH').length,
        top_stations: stationBreakdown.slice(0, 5),
      },
      ai_analysis,
    },
    reasons,
  };
}

function buildDossierResponse(dossier, domain, query, langPref) {
  const { crime, accused, related_crimes } = dossier;
  const accusedHistory = accused.map((a) => buildOffenderDossier(domain, a.offender_id)).filter(Boolean);
  const reasons = [
    `FIR/crime record located for ${crime.fir_no || crime.crime_id}.`,
    `Registered at ${crime.station_name || crime.location} on ${crime.date}.`,
    `Current status: ${crime.status || 'Unknown'}.`,
    crime.modus ? `Reported modus: ${crime.modus}.` : 'Modus not recorded in sample register.',
    accused.length
      ? `Linked accused: ${accused.map((a) => a.name).join(', ')}.`
      : 'No accused linked yet — open for investigation.',
    accusedHistory.some((h) => h.case_count > 1)
      ? `Prior FIR history available for accused (click name for full list).`
      : 'No prior FIRs found for linked accused in register.',
    related_crimes.length
      ? `${related_crimes.length} related case(s) found via crime_links.`
      : 'No linked cases in crime_links table.',
    `Data source: ${domain.source}.`,
    'Engine: rule-based NLP (not generative AI).',
  ];

  return {
    summary: `Case file ${crime.fir_no || crime.crime_id}: ${crime.crime_type} at ${crime.locality || crime.location} (${crime.station_name || 'PS'}). Status: ${crime.status}.`,
    data: {
      intent: 'CASE_DOSSIER',
      language_mode: langPref === 'kn' ? 'kn' : 'en',
      original_query: query,
      engine: 'rule_based_nlp',
      dossier: {
        crime,
        accused,
        related_crimes,
        accused_history: accusedHistory,
      },
      case_register: [crime],
      repeat_offenders: accused.filter((a) => a.repeat_flag),
      data_source: domain.source,
      connection: domain.connection,
      total_matches: 1,
    },
    visual_payload: {
      focus: 'investigation',
      trend: null,
      map: buildMapPayload([crime].concat(related_crimes), crime.location),
      network: buildNetworkPayload(
        [crime].concat(related_crimes),
        domain.offenders,
        domain.cases,
        domain.crime_links
      ),
      investigation: {
        fir_no: crime.fir_no,
        station: crime.station_name,
        status: crime.status,
        related_count: related_crimes.length,
      },
    },
    reasons,
  };
}

function buildOffenderResponse(dossier, domain, langPref) {
  const { offender, crimes, stations, crime_types, case_count, years_covered, prior_fir_count } = dossier;
  const reasons = [
    `Accused profile loaded for ${offender.name} (${offender.offender_id}).`,
    `Repeat accused: ${offender.repeat_flag ? 'YES — priority follow-up' : 'No'}.`,
    `Total linked FIRs: ${case_count} across ${stations.length} police station(s).`,
    prior_fir_count ? `Prior FIRs before latest: ${prior_fir_count}.` : 'Only one FIR on record.',
    years_covered?.length ? `Years covered: ${years_covered.join(', ')}.` : '',
    `Crime types: ${crime_types.join(', ') || 'n/a'}.`,
    offender.native_place ? `Native place: ${offender.native_place}.` : 'Native place not recorded.',
    `Data source: ${domain.source}.`,
    'Engine: rule-based NLP (not generative AI).',
  ].filter(Boolean);

  return {
    summary: `${offender.name}${offender.repeat_flag ? ' (repeat accused)' : ''} — ${case_count} FIR(s). Stations: ${stations.slice(0, 3).join('; ') || 'n/a'}.`,
    data: {
      intent: 'OFFENDER_PROFILE',
      language_mode: langPref === 'kn' ? 'kn' : 'en',
      engine: 'rule_based_nlp',
      offender_dossier: dossier,
      case_register: crimes,
      repeat_offenders: [{ ...offender, linked_cases: case_count, stations, recent_modus: crimes.map((c) => c.modus).filter(Boolean).slice(0, 3) }],
      total_matches: case_count,
      data_source: domain.source,
      connection: domain.connection,
    },
    visual_payload: {
      focus: 'network',
      trend: buildTrendPayload(crimes),
      map: buildMapPayload(crimes, crimes[0]?.location || null),
      network: buildNetworkPayload(crimes, domain.offenders, domain.cases, domain.crime_links),
      investigation: {
        offender_id: offender.offender_id,
        repeat_flag: offender.repeat_flag,
        stations,
        prior_fir_count,
      },
    },
    reasons,
  };
}

function resolveVisualFocus(intent) {
  switch (intent) {
    case INTENTS.NETWORK_QUERY:
    case INTENTS.REPEAT_OFFENDER_QUERY:
      return 'network';
    case INTENTS.HOTSPOT_QUERY:
      return 'map';
    case INTENTS.TREND_QUERY:
      return 'trend';
    default:
      return 'summary';
  }
}

function errorResponse(message) {
  return {
    summary: message,
    data: { error: true },
    visual_payload: { focus: 'none', trend: null, map: null, network: null },
    reasons: [message, 'Ensure query is a non-empty natural language question.'],
  };
}

module.exports = {
  handleQueryCrime,
  INTENTS,
};
