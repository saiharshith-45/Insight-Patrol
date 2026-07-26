'use strict';

/**
 * Investigation helpers — case dossier, offender profile, FIR lookup.
 */

function lookupByFirOrCrime(domain, queryText) {
  const q = String(queryText || '').toLowerCase();
  const firMatch = q.match(/(\d{4}\/[a-z0-9]+\/\d{3,})/i);
  const crimeMatch = q.match(/\bc0*\d{3,}\b/i) || q.match(/\bcrime[_\s-]?id[:\s]*([a-z0-9]+)/i);

  let crime = null;
  if (firMatch) {
    crime = domain.crimes.find((c) => String(c.fir_no || '').toLowerCase() === firMatch[1].toLowerCase());
  }
  if (!crime && crimeMatch) {
    const id = (crimeMatch[1] || crimeMatch[0] || '').toUpperCase().replace(/^CRIME[_\s-]*/, '');
    crime = domain.crimes.find((c) => c.crime_id.toUpperCase() === id.toUpperCase());
  }
  if (!crime) {
    crime = domain.crimes.find((c) =>
      String(c.fir_no || '').toLowerCase().includes(q) ||
      String(c.crime_id || '').toLowerCase() === q.trim()
    );
  }
  if (!crime) return null;

  const linkedCases = domain.cases.filter((c) => c.crime_id === crime.crime_id);
  const offenders = linkedCases
    .map((c) => domain.offenders.find((o) => o.offender_id === c.offender_id))
    .filter(Boolean);

  const relatedCaseIds = new Set();
  for (const lc of linkedCases) {
    domain.crime_links.forEach((link) => {
      if (link.case_id === lc.case_id) relatedCaseIds.add(link.related_case_id);
      if (link.related_case_id === lc.case_id) relatedCaseIds.add(link.case_id);
    });
  }
  const relatedCases = domain.cases.filter((c) => relatedCaseIds.has(c.case_id));
  const relatedCrimes = relatedCases
    .map((c) => domain.crimes.find((cr) => cr.crime_id === c.crime_id))
    .filter(Boolean);

  return {
    crime,
    accused: offenders,
    linked_cases: linkedCases,
    related_crimes: relatedCrimes,
  };
}

function buildOffenderDossier(domain, offenderIdOrName) {
  let q = String(offenderIdOrName || '').toLowerCase().trim();
  q = q.replace(/^offender:/, '');
  const offender = domain.offenders.find((o) =>
    o.offender_id.toLowerCase() === q ||
    o.name.toLowerCase() === q ||
    o.name.toLowerCase().includes(q) ||
    (o.alias && o.alias.toLowerCase() === q)
  );
  if (!offender) return null;

  const linkedCases = domain.cases.filter((c) => c.offender_id === offender.offender_id);
  const crimes = linkedCases
    .map((c) => domain.crimes.find((cr) => cr.crime_id === c.crime_id))
    .filter(Boolean)
    .sort((a, b) => String(b.date || b.crime_date || '').localeCompare(String(a.date || a.crime_date || '')));

  const years = [...new Set(crimes.map((c) => String(c.date || c.crime_date || '').slice(0, 4)).filter(Boolean))].sort();

  return {
    offender,
    case_count: linkedCases.length,
    crimes,
    fir_timeline: crimes.map((c) => ({
      crime_id: c.crime_id,
      fir_no: c.fir_no,
      crime_date: c.date || c.crime_date,
      crime_type: c.crime_type,
      station_name: c.station_name,
      locality: c.locality,
      severity: c.severity,
      status: c.status,
      modus: c.modus,
      section_hint: c.section_hint,
    })),
    stations: [...new Set(crimes.map((c) => c.station_name).filter(Boolean))],
    crime_types: [...new Set(crimes.map((c) => c.crime_type))],
    years_covered: years,
    prior_fir_count: Math.max(0, crimes.length - 1),
  };
}

module.exports = {
  lookupByFirOrCrime,
  buildOffenderDossier,
};
