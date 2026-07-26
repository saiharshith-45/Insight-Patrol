'use strict';

/**
 * Officer AI Analyst — analyses query + FIR results + SCRB real stats
 * and returns an actionable briefing in English or Kannada.
 *
 * Uses Catalyst Zia keyword extraction when available; always returns
 * a deterministic investigative analysis (no random answers).
 */

const catalyst = require('zcatalyst-sdk-node');
const { realStatsBrief } = require('./realStats');

async function tryZiaKeywords(req, text) {
  try {
    const app = catalyst.initialize(req);
    const zia = app.zia();
    if (!zia || typeof zia.getKeywordExtraction !== 'function') return null;
    const out = await zia.getKeywordExtraction([String(text || '').slice(0, 1500)]);
    const first = Array.isArray(out) ? out[0] : out;
    const keywords = first?.keywords || first?.keyword_extraction || first?.data || [];
    if (Array.isArray(keywords) && keywords.length) {
      return keywords.map((k) => (typeof k === 'string' ? k : k.keyword || k.text || String(k))).filter(Boolean).slice(0, 8);
    }
  } catch (e) {
    return null;
  }
  return null;
}

function isKn(lang) {
  return lang === 'kn' || lang === 'kannada';
}

function buildAnalysis(ctx) {
  const {
    query,
    intent,
    languageMode,
    filteredCrimes,
    stationBreakdown,
    repeatOffenders,
    trend,
    entities,
    ziaKeywords,
  } = ctx;

  const kn = isKn(languageMode);
  const loc = entities?.location || 'KARNATAKA';
  const type = entities?.crime_type || null;
  const stationFilter = entities?.station || null;
  const statusFilter = entities?.status || null;
  const scrb = realStatsBrief(loc, type);
  const city = scrb.focus_city_2024;
  const matchCount = filteredCrimes.length;
  const high = filteredCrimes.filter((c) => c.severity === 'HIGH').length;
  const open = filteredCrimes.filter((c) => /open|under investigation/i.test(c.status || '')).length;
  const topPs = (stationBreakdown || []).slice(0, 3);
  const topRepeat = (repeatOffenders || []).slice(0, 3);
  const direction = trend?.direction || 'stable';

  const paragraphs = [];
  const actions = [];
  const scrb_lines = [];

  const filterBits = [];
  if (stationFilter) filterBits.push(`PS filter: ${stationFilter}`);
  if (statusFilter) filterBits.push(`status: ${statusFilter}`);
  if (type) filterBits.push(`type: ${type}`);
  if (loc) filterBits.push(`city/district: ${loc}`);
  const filterText = filterBits.length ? filterBits.join('; ') : 'no PS/status filter (statewide window)';

  if (kn) {
    paragraphs.push(
      `ಅಧಿಕಾರಿ ಪ್ರಶ್ನೆ: “${query}”. ಫಿಲ್ಟರ್: ${filterText}. ಸಿಕ್ಕಿದ ಪ್ರಕರಣಗಳು: ${matchCount} (HIGH: ${high}, ತೆರೆದ: ${open}). ಪ್ರವೃತ್ತಿ: ${direction === 'increasing' ? 'ಏರುತ್ತಿದೆ' : direction === 'decreasing' ? 'ಕಡಿಮೆಯಾಗುತ್ತಿದೆ' : 'ಸ್ಥಿರ'}.`
    );
    if (stationFilter && matchCount === 0) {
      paragraphs.push(`“${stationFilter}” PS ನಲ್ಲಿ ಈ ಸಮಯ/ಸ್ಥಿತಿ ಫಿಲ್ಟರ್‌ಗೆ ಪ್ರಕರಣ ಸಿಗಲಿಲ್ಲ. ಫಿಲ್ಟರ್ ಸಡಿಲಗೊಳಿಸಿ ಅಥವಾ FIR ಪಟ್ಟಿ ಪರಿಶೀಲಿಸಿ.`);
    } else if (stationFilter) {
      paragraphs.push(`ಈ ಉತ್ತರ ${stationFilter} PS ಗೆ ಸೀಮಿತವಾಗಿದೆ — ಇತರ ಠಾಣೆಗಳ ಸಂಖ್ಯೆಗಳನ್ನು ಮುಖ್ಯ ಉತ್ತರವಾಗಿ ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ.`);
    }
    if (topPs.length && !stationFilter) {
      paragraphs.push(
        `ಹೆಚ್ಚು ಹೊರೆಯಿರುವ ಪೊಲೀಸ್ ಠಾಣೆಗಳು: ${topPs.map((s) => `${s.station} (${s.count})`).join('; ')}.`
      );
    }
    if (topRepeat.length) {
      paragraphs.push(
        `ಪುನರಾವೃತ್ತಿ ಆರೋಪಿ: ${topRepeat.map((o) => `${o.name} (${o.linked_cases} FIR)`).join('; ')}.`
      );
    }
    if (!stationFilter) {
      scrb_lines.push(
        `SCRB (${city.unit}, 2024): ಸೈಬರ್ ${city.cyber.toLocaleString('en-IN')}, ಕಳ್ಳತನ ${city.theft.toLocaleString('en-IN')}.`
      );
    } else {
      scrb_lines.push('SCRB figures are city-level totals — use only as background, not as this PS count.');
    }
    actions.push(stationFilter
      ? `${stationFilter} ಮೇಲಿನ ತೆರೆದ / HIGH FIR ಗಳನ್ನು Case work ನಲ್ಲಿ IO ಗೆ ನಿಯೋಜಿಸಿ.`
      : 'HIGH ಮತ್ತು ತೆರೆದ FIR ಗಳನ್ನು Case work ನಲ್ಲಿ IO ಗೆ ನಿಯೋಜಿಸಿ.');
    actions.push('Repeat accused ಮೇಲೆ ಕ್ಲಿಕ್ ಮಾಡಿ prior FIR ಪರಿಶೀಲಿಸಿ.');
  } else {
    paragraphs.push(
      `Officer query: “${query}”. Applied filters — ${filterText}. Matches in FIR register: ${matchCount} (${high} HIGH, ${open} open). Trend: ${direction}.`
    );
    if (stationFilter && matchCount === 0) {
      paragraphs.push(
        `No cases matched “${stationFilter}” for this status/time window. Try removing “pending/open” or widening months.`
      );
    } else if (stationFilter) {
      paragraphs.push(
        `This answer is limited to ${stationFilter} PS. Do not treat other stations’ counts as the answer to your question.`
      );
    }
    if (topPs.length && !stationFilter) {
      paragraphs.push(
        `Highest load PS: ${topPs.map((s) => `${s.station} (${s.count} cases${s.high ? `, ${s.high} HIGH` : ''})`).join('; ')}.`
      );
    } else if (topPs.length && stationFilter) {
      paragraphs.push(
        `Within filter: ${topPs.map((s) => `${s.station} (${s.count} cases${s.high ? `, ${s.high} HIGH` : ''})`).join('; ')}.`
      );
    }
    if (topRepeat.length) {
      paragraphs.push(
        `Repeat accused in this filter: ${topRepeat.map((o) => `${o.name} (${o.linked_cases} FIR(s))`).join('; ')}. Click name for full history.`
      );
    } else {
      paragraphs.push('No repeat accused in this filtered set.');
    }
    if (!stationFilter) {
      paragraphs.push(scrb.statewide_note);
      scrb_lines.push(
        `${city.unit} 2024 — Cyber ${city.cyber.toLocaleString('en-IN')}, Theft ${city.theft.toLocaleString('en-IN')}, Robbery ${city.robbery}.`
      );
      scrb_lines.push(
        `2025 IPC leaders: ${scrb.year_district_ipc_2025.slice(0, 4).map((d) => `${d.unit} (${d.ipc})`).join('; ')}.`
      );
    } else {
      scrb_lines.push('SCRB 2024/2025 numbers are city/district aggregates — background only for this PS query.');
    }
    actions.push(stationFilter
      ? `Assign open/HIGH FIRs of ${stationFilter} to IO in Case work.`
      : 'Assign open HIGH FIRs to IO in Case work with a clear note.');
    actions.push(stationFilter
      ? `Create night patrol duty covering ${stationFilter} if open HIGH load remains.`
      : 'Create field duty on the top-loaded PS area for tonight/tomorrow.');
    actions.push('Click repeat accused names to review all prior FIRs before arrest/notice.');
  }

  if (ziaKeywords?.length) {
    paragraphs.push(
      kn
        ? `Zia AI ಕೀವರ್ಡ್‌ಗಳು: ${ziaKeywords.join(', ')}.`
        : `Catalyst Zia AI keywords from your question: ${ziaKeywords.join(', ')}.`
    );
  }

  return {
    title: kn ? 'AI ವಿಶ್ಲೇಷಣೆ (ಅಧಿಕಾರಿ ಬ್ರೀಫ್)' : 'AI analysis (officer briefing)',
    engine: ziaKeywords?.length ? 'insightpatrol_analyst+catalyst_zia' : 'insightpatrol_analyst',
    paragraphs,
    recommended_actions: actions,
    scrb_context: scrb_lines,
    scrb_source: scrb.source,
    zia_keywords: ziaKeywords || [],
    filters_applied: { station: stationFilter, status: statusFilter, crime_type: type, location: loc },
  };
}

async function analyseOfficerQuery(req, ctx) {
  const ziaKeywords = await tryZiaKeywords(req, ctx.query);
  return buildAnalysis({ ...ctx, ziaKeywords });
}

module.exports = {
  analyseOfficerQuery,
  buildAnalysis,
  tryZiaKeywords,
};
