'use strict';

const { LOCATION_COORDS } = require('./sampleData');

function isKannada(mode) {
  return mode === 'kn' || mode === 'kn_latin' || mode === 'mixed';
}

function crimeLabelKn(type) {
  const map = {
    CYBER: 'ಸೈಬರ್',
    THEFT: 'ಕಳ್ಳತನ',
    FRAUD: 'ವಂಚನೆ',
    ASSAULT: 'ಹಲ್ಲೆ',
    DRUG: 'ಮಾದಕ ವಸ್ತು',
    MURDER: 'ಕೊಲೆ',
    ROBBERY: 'ದರೋಡೆ',
  };
  return map[type] || 'ಎಲ್ಲಾ ಅಪರಾಧಗಳು';
}

function directionKn(dir) {
  if (dir === 'increasing') return 'ಏರುತ್ತಿರುವ';
  if (dir === 'decreasing') return 'ಕಡಿಮೆಯಾಗುತ್ತಿರುವ';
  return 'ಸ್ಥಿರ';
}

function intentKn(intent) {
  const map = {
    TREND_QUERY: 'ಪ್ರವೃತ್ತಿ ವಿಶ್ಲೇಷಣೆ',
    HOTSPOT_QUERY: 'ಹಾಟ್‌ಸ್ಪಾಟ್ ವಿಶ್ಲೇಷಣೆ',
    NETWORK_QUERY: 'ಸಂಪರ್ಕ / ಲಿಂಕ್ ವಿಶ್ಲೇಷಣೆ',
    REPEAT_OFFENDER_QUERY: 'ಪುನರಾವೃತ್ತಿ ಆರೋಪಿ ಪಟ್ಟಿ',
    SUMMARY_QUERY: 'ಸಾರಾಂಶ',
  };
  return map[intent] || 'ವಿಶ್ಲೇಷಣೆ';
}

function buildReasons(params) {
  return isKannada(params.languageMode)
    ? buildReasonsKn(params)
    : buildReasonsEn(params);
}

function buildReasonsEn({
  intent,
  entities,
  filteredCrimes,
  allCrimesInScope,
  repeatOffenders,
  hotspots,
  network,
  trend,
  dataSource,
  stationBreakdown,
}) {
  const reasons = [];
  const months = entities.time_range_months || 6;

  // Operational reasons only — language is shown via UI badge, not here
  reasons.push(`Insight type: ${intent.replace(/_/g, ' ').toLowerCase()}.`);

  if (entities.crime_type) {
    reasons.push(`Filter applied: crime type = ${entities.crime_type}.`);
  } else {
    reasons.push('No specific crime type filter — all types in scope considered.');
  }

  if (entities.location) {
    const label = LOCATION_COORDS[entities.location]?.label || entities.location;
    reasons.push(`Geographic filter: ${label}.`);
  }

  reasons.push(`Time window: last ${months} month(s).`);

  if (filteredCrimes.length === 0) {
    reasons.push('No matching records for these filters.');
    return reasons;
  }

  reasons.push(
    `${filteredCrimes.length} case(s) matched from ${allCrimesInScope.length} in the selected window.`
  );

  const highSeverity = filteredCrimes.filter((c) => c.severity === 'HIGH').length;
  if (highSeverity > 0) {
    reasons.push(`${highSeverity} HIGH severity case(s) — priority for IO review.`);
  }

  if (intent === 'TREND_QUERY' && trend?.direction) {
    reasons.push(
      `Trend is ${trend.direction} (recent avg ${trend.recent_avg} vs earlier ${trend.earlier_avg}).`
    );
    if (trend.direction === 'increasing') {
      reasons.push('Rising monthly counts suggest pattern needing cyber cell / beat attention.');
    }
  }

  if (intent === 'HOTSPOT_QUERY' && hotspots?.length) {
    const top = hotspots[0];
    reasons.push(
      `Hotspot: ${top.label} — ${top.count} case(s), severity score ${top.severity_score}.`
    );
    reasons.push('Stations with higher count/severity are highlighted on the map.');
  }

  if (intent === 'NETWORK_QUERY' && network?.nodes?.length) {
    const repeatNodes = network.nodes.filter((n) => n.repeat_flag);
    reasons.push(
      `Link analysis: ${network.nodes.length} node(s), ${network.links.length} link(s).`
    );
    if (repeatNodes.length) {
      reasons.push(`${repeatNodes.length} repeat accused appear in connected cases.`);
    }
  }

  if (intent === 'REPEAT_OFFENDER_QUERY' && repeatOffenders?.length) {
    reasons.push(
      `${repeatOffenders.length} repeat accused identified with multiple linked cases.`
    );
  }

  if (stationBreakdown?.length) {
    const top = stationBreakdown[0];
    reasons.push(
      `Highest PS load: ${top.station} (${top.count} cases, ${top.high} HIGH).`
    );
  }

  if (dataSource === 'sample_fallback') {
    reasons.push('Source: synthetic SCRB sample (seed Data Store for live rows).');
  } else {
    reasons.push('Source: Zoho Catalyst Data Store.');
  }

  return reasons;
}

function buildReasonsKn({
  intent,
  entities,
  filteredCrimes,
  allCrimesInScope,
  repeatOffenders,
  hotspots,
  network,
  trend,
  dataSource,
  stationBreakdown,
}) {
  const reasons = [];
  const months = entities.time_range_months || 6;

  reasons.push(`ವಿಶ್ಲೇಷಣೆ ವಿಧ: ${intentKn(intent)}.`);

  if (entities.crime_type) {
    reasons.push(`ಅಪರಾಧ ಪ್ರಕಾರದ ಫಿಲ್ಟರ್: ${crimeLabelKn(entities.crime_type)} (${entities.crime_type}).`);
  } else {
    reasons.push('ನಿರ್ದಿಷ್ಟ ಅಪರಾಧ ಪ್ರಕಾರ ಕಂಡುಬಂದಿಲ್ಲ — ಎಲ್ಲಾ ಪ್ರಕಾರಗಳನ್ನು ಪರಿಗಣಿಸಲಾಗಿದೆ.');
  }

  if (entities.location) {
    const label = LOCATION_COORDS[entities.location]?.label || entities.location;
    reasons.push(`ಭೌಗೋಳಿಕ ಫಿಲ್ಟರ್: ${label}.`);
  }

  reasons.push(`ಕಾಲಾವಧಿ: ಕೊನೆಯ ${months} ತಿಂಗಳು(ಗಳು).`);

  if (filteredCrimes.length === 0) {
    reasons.push('ಈ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಹೊಂದುವ ದಾಖಲೆಗಳು ಸಿಗಲಿಲ್ಲ.');
    return reasons;
  }

  reasons.push(
    `ಆಯ್ದ ಅವಧಿಯ ${allCrimesInScope.length} ದಾಖಲೆಗಳಲ್ಲಿ ${filteredCrimes.length} ಪ್ರಕರಣ(ಗಳು) ಹೊಂದಿಕೆಯಾದವು.`
  );

  const highSeverity = filteredCrimes.filter((c) => c.severity === 'HIGH').length;
  if (highSeverity > 0) {
    reasons.push(`${highSeverity} HIGH ತೀವ್ರತೆಯ ಪ್ರಕರಣ(ಗಳು) — IO ಪರಿಶೀಲನೆಗೆ ಆದ್ಯತೆ.`);
  }

  if (intent === 'TREND_QUERY' && trend?.direction) {
    reasons.push(
      `ಪ್ರವೃತ್ತಿ ${directionKn(trend.direction)} (ಇತ್ತೀಚಿನ ಸರಾಸರಿ ${trend.recent_avg}, ಹಿಂದಿನ ${trend.earlier_avg}).`
    );
    if (trend.direction === 'increasing') {
      reasons.push('ತಿಂಗಳವಾರು ಪ್ರಕರಣಗಳು ಹೆಚ್ಚುತ್ತಿರುವುದರಿಂದ ಸೈಬರ್ ಸೆಲ್ / ಬೀಟ್ ಗಮನ ಅಗತ್ಯ.');
    }
  }

  if (intent === 'HOTSPOT_QUERY' && hotspots?.length) {
    const top = hotspots[0];
    reasons.push(
      `ಹಾಟ್‌ಸ್ಪಾಟ್: ${top.label} — ${top.count} ಪ್ರಕರಣ(ಗಳು), ತೀವ್ರತೆ ಅಂಕ ${top.severity_score}.`
    );
    reasons.push('ಹೆಚ್ಚು ಪ್ರಕರಣ/ತೀವ್ರತೆ ಇರುವ ಪೊಲೀಸ್ ಠಾಣೆಗಳನ್ನು ನಕ್ಷೆಯಲ್ಲಿ ಗುರುತಿಸಲಾಗಿದೆ.');
  }

  if (intent === 'NETWORK_QUERY' && network?.nodes?.length) {
    const repeatNodes = network.nodes.filter((n) => n.repeat_flag);
    reasons.push(
      `ಸಂಪರ್ಕ ವಿಶ್ಲೇಷಣೆ: ${network.nodes.length} ನೋಡ್‌ಗಳು, ${network.links.length} ಲಿಂಕ್‌ಗಳು.`
    );
    if (repeatNodes.length) {
      reasons.push(`${repeatNodes.length} ಪುನರಾವೃತ್ತಿ ಆರೋಪಿಗಳು ಸಂಪರ್ಕಿತ ಪ್ರಕರಣಗಳಲ್ಲಿದ್ದಾರೆ.`);
    }
  }

  if (intent === 'REPEAT_OFFENDER_QUERY' && repeatOffenders?.length) {
    reasons.push(
      `${repeatOffenders.length} ಪುನರಾವೃತ್ತಿ ಆರೋಪಿಗಳನ್ನು ಗುರುತಿಸಲಾಗಿದೆ.`
    );
  }

  if (stationBreakdown?.length) {
    const top = stationBreakdown[0];
    reasons.push(
      `ಹೆಚ್ಚು ಭಾರ: ${top.station} (${top.count} ಪ್ರಕರಣ, ${top.high} HIGH).`
    );
  }

  if (dataSource === 'sample_fallback') {
    reasons.push('ಮೂಲ: ಡೆಮೊ SCRB ಮಾದರಿ ಡೇಟಾ (ಲೈವ್‌ಗಾಗಿ Data Store ಸೀಡ್ ಮಾಡಿ).');
  } else {
    reasons.push('ಮೂಲ: Zoho Catalyst Data Store.');
  }

  return reasons;
}

function buildSummary(params) {
  return isKannada(params.languageMode)
    ? buildSummaryKn(params)
    : buildSummaryEn(params);
}

function buildSummaryEn({
  intent,
  entities,
  filteredCrimes,
  repeatOffenders,
  hotspots,
  trend,
  stationBreakdown,
}) {
  const locationLabel = entities.location
    ? (LOCATION_COORDS[entities.location]?.label || entities.location)
    : 'Karnataka (mapped districts)';
  const crimeLabel = entities.crime_type || 'all crime types';
  const months = entities.time_range_months || 6;
  const topStation = stationBreakdown?.[0]?.station;

  switch (intent) {
    case 'TREND_QUERY': {
      const direction = trend?.direction || 'stable';
      return `Last ${months} months: ${filteredCrimes.length} ${crimeLabel} case(s) in ${locationLabel} — trend ${direction}${topStation ? `. Highest PS load: ${topStation}` : ''}.`;
    }
    case 'HOTSPOT_QUERY': {
      const top = hotspots?.[0];
      if (!top) {
        return `No significant hotspots for ${crimeLabel} in ${locationLabel} (last ${months} months).`;
      }
      return `${top.label} flagged as hotspot — ${top.count} ${crimeLabel} incident(s) in last ${months} months.`;
    }
    case 'NETWORK_QUERY':
      return `Link analysis for ${crimeLabel} in ${locationLabel}: ${filteredCrimes.length} case(s), ${repeatOffenders?.length || 0} repeat accused for IO review.`;
    case 'REPEAT_OFFENDER_QUERY':
      return `${repeatOffenders?.length || 0} repeat offender(s) for ${crimeLabel} in ${locationLabel} (last ${months} months).`;
    default:
      return `Brief: ${filteredCrimes.length} ${crimeLabel} incident(s) in ${locationLabel} over last ${months} months.`;
  }
}

function buildSummaryKn({
  intent,
  entities,
  filteredCrimes,
  repeatOffenders,
  hotspots,
  trend,
  stationBreakdown,
}) {
  const locationLabel = entities.location
    ? (LOCATION_COORDS[entities.location]?.label || entities.location)
    : 'ಕರ್ನಾಟಕ (ನಕ್ಷೆ ಜಿಲ್ಲೆಗಳು)';
  const crimeKn = crimeLabelKn(entities.crime_type);
  const months = entities.time_range_months || 6;
  const topStation = stationBreakdown?.[0]?.station;

  switch (intent) {
    case 'TREND_QUERY': {
      const direction = directionKn(trend?.direction || 'stable');
      return `ಕೊನೆಯ ${months} ತಿಂಗಳು: ${locationLabel} ನಲ್ಲಿ ${filteredCrimes.length} ${crimeKn} ಪ್ರಕರಣ(ಗಳು) — ಪ್ರವೃತ್ತಿ ${direction}${topStation ? `. ಹೆಚ್ಚು ಭಾರ: ${topStation}` : ''}.`;
    }
    case 'HOTSPOT_QUERY': {
      const top = hotspots?.[0];
      if (!top) {
        return `ಕೊನೆಯ ${months} ತಿಂಗಳಲ್ಲಿ ${locationLabel} ನಲ್ಲಿ ${crimeKn} ಹಾಟ್‌ಸ್ಪಾಟ್ ಕಂಡುಬಂದಿಲ್ಲ.`;
      }
      return `${top.label} ಹಾಟ್‌ಸ್ಪಾಟ್ ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ — ಕೊನೆಯ ${months} ತಿಂಗಳಲ್ಲಿ ${top.count} ${crimeKn} ಪ್ರಕರಣ(ಗಳು).`;
    }
    case 'NETWORK_QUERY':
      return `${locationLabel} ನಲ್ಲಿ ${crimeKn} ಸಂಪರ್ಕ ವಿಶ್ಲೇಷಣೆ: ${filteredCrimes.length} ಪ್ರಕರಣ(ಗಳು), ${repeatOffenders?.length || 0} ಪುನರಾವೃತ್ತಿ ಆರೋಪಿ(ಗಳು).`;
    case 'REPEAT_OFFENDER_QUERY':
      return `${locationLabel} ನಲ್ಲಿ ${crimeKn} — ಕೊನೆಯ ${months} ತಿಂಗಳಲ್ಲಿ ${repeatOffenders?.length || 0} ಪುನರಾವೃತ್ತಿ ಆರೋಪಿ(ಗಳು).`;
    default:
      return `ಸಾರಾಂಶ: ಕೊನೆಯ ${months} ತಿಂಗಳಲ್ಲಿ ${locationLabel} ನಲ್ಲಿ ${filteredCrimes.length} ${crimeKn} ಪ್ರಕರಣ(ಗಳು).`;
  }
}

module.exports = {
  buildReasons,
  buildSummary,
  isKannada,
};
