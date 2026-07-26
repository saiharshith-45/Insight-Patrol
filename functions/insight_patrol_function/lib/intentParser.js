'use strict';

/**
 * InsightPatrol NLP — rule-based intent + entity extraction
 * Supports:
 *  1. English
 *  2. Kannada script (ಕನ್ನಡ)
 *  3. Kannada typed in English letters (transliteration / Manglish)
 *
 * No heavy NLP frameworks — Catalyst Function safe.
 */

const INTENTS = {
  TREND_QUERY: 'TREND_QUERY',
  HOTSPOT_QUERY: 'HOTSPOT_QUERY',
  NETWORK_QUERY: 'NETWORK_QUERY',
  REPEAT_OFFENDER_QUERY: 'REPEAT_OFFENDER_QUERY',
  SUMMARY_QUERY: 'SUMMARY_QUERY',
};

/**
 * Crime types — English + Kannada script + common Romanized spellings
 * (how officers actually type on phone keyboards)
 */
const CRIME_TYPE_KEYWORDS = {
  CYBER: [
    'cyber', 'cybercrime', 'cyber crime', 'online fraud', 'online', 'phishing',
    'hacking', 'digital', 'upi fraud', 'otp fraud',
    // Romanized Kannada / mixed
    'saibar', 'sai bar', 'saiber', 'siber', 'cyberaparadha', 'cyber aparadha',
    'online mose', 'net crime', 'netcrime',
    // Kannada script
    'ಸೈಬರ್', 'ಸೈಬರ', 'ಸೈಬರ್ ಅಪರಾಧ', 'ಆನ್‌ಲೈನ್',
  ],
  THEFT: [
    'theft', 'steal', 'stolen', 'burglary', 'robbery', 'chain snatch', 'snatching',
    'vehicle theft', 'bike theft',
    // Romanized
    'kalla', 'kallatana', 'kallagadda', 'kallategada', 'daku', 'dakaiti',
    'chain snatching', 'mobile kalla',
    // Kannada
    'ಕಳ್ಳತನ', 'ಕಳ್ಳಗದ್ದ', 'ಕಳ್ಳ', 'ದರೋಡೆ', 'ಸರಪಳಿ ಕಿತ್ತು',
  ],
  ASSAULT: [
    'assault', 'attack', 'violence', 'physical assault', 'beating', 'hurt',
    // Romanized
    'halle', 'halla', 'himse', 'himsa', 'maramari', 'dadi', 'daali',
    // Kannada
    'ಹಲ್ಲೆ', 'ದಾಳಿ', 'ಹಿಂಸೆ', 'ಮಾರಾಮಾರಿ',
  ],
  FRAUD: [
    'fraud', 'scam', 'cheat', 'cheating', 'financial fraud', 'banking fraud',
    // Romanized
    'mose', 'mosaga', 'vanchanе', 'vanchane', 'cheat', 'scamu',
    // Kannada
    'ವಂಚನೆ', 'ಮೋಸ', 'ಮೋಸಗಾರಿಕೆ',
  ],
  MURDER: [
    'murder', 'homicide', 'kill', 'killing', 'death case',
    // Romanized
    'kole', 'pranahatye', 'pranantaka', 'hatye',
    // Kannada
    'ಕೊಲೆ', 'ಪ್ರಾಣಹತ್ಯೆ',
  ],
  DRUG: [
    'drug', 'drugs', 'narcotic', 'narcotics', 'mdma', 'ganja', 'ndps',
    // Romanized
    'madaka', 'maadaka', 'ganja', 'drugs',
    // Kannada
    'ಮಾದಕ', 'ಮಾದಕವಸ್ತು',
  ],
};

const LOCATION_KEYWORDS = {
  BENGALURU: [
    'bengaluru', 'bangalore', 'blr', 'bengaluru urban', 'bengaluru city',
    'banglore', 'bengalooru', 'bengloor', 'benagluru', 'blore',
    'ಬೆಂಗಳೂರು', 'ಬೆಂಗಲೂರು',
  ],
  MYSURU: [
    'mysuru', 'mysore', 'maisuru', 'mysuru city',
    'ಮೈಸೂರು',
  ],
  MANGALURU: [
    'mangaluru', 'mangalore', 'manglore', 'mangloor',
    'ಮಂಗಳೂರು',
  ],
  HUBBALLI: [
    'hubballi', 'hubli', 'hubballi dharwad', 'dharwad',
    'ಹುಬ್ಬಳ್ಳಿ', 'ಧಾರವಾಡ',
  ],
  BELAGAVI: [
    'belagavi', 'belgaum', 'belgaam',
    'ಬೆಳಗಾವಿ',
  ],
  DAVANAGERE: [
    'davanagere', 'davangere', 'davangere',
    'ದಾವಣಗೆರೆ',
  ],
};

/** Police station / PS name cues → search token for station_name / station_code */
const STATION_KEYWORDS = {
  jayanagar: ['jayanagar', 'jayanagar ps', 'jayanagar police', 'ಜಯನಗರ'],
  indiranagar: ['indiranagar', 'indiranagara', 'indira nagar', 'ಇಂದಿರಾನಗರ'],
  whitefield: ['whitefield', 'white field', 'ವೈಟ್‌ಫೀಲ್ಡ್'],
  'yelahanka': ['yelahanka', 'yalahanka', 'ಯಲಹಂಕ'],
  'cyber': ['cyber crime ps', 'cyber ps', 'ccps', 'cyber crime police'],
  'k.g. halli': ['kg halli', 'k.g. halli', 'k g halli', 'kghalli'],
  koramangala: ['koramangala', 'koramangla'],
  hebbal: ['hebbal'],
  'shivajinagar': ['shivajinagar', 'shivaji nagar'],
  marathahalli: ['marathahalli', 'marathalli'],
};

const STATUS_KEYWORDS = {
  open: [
    'pending', 'open', 'under investigation', 'ui', 'pending cases', 'open cases',
    'not closed', 'active cases', 'ಬಾಕಿ', 'ತೆರೆದ',
  ],
  closed: [
    'closed', 'charge sheet', 'chargesheeted', 'final report', 'disposed',
  ],
};

const INTENT_KEYWORDS = {
  TREND_QUERY: [
    'trend', 'trends', 'pattern', 'patterns', 'over time', 'monthly', 'weekly',
    'increase', 'decrease', 'growth', 'rising', 'falling',
    // Romanized Kannada
    'pravritti', 'pravrutti', 'trendu', 'heccu', 'kammi', 'badalavane',
    'last 6 months', 'last six months', 'past 6 months', 'kone 6',
    'kone 6 months', 'kone 6 tingalu', 'kone aru tingalu', 'tingalu',
    // Kannada script
    'ಪ್ರವೃತ್ತಿ', 'ಟ್ರೆಂಡ್', 'ತಿಂಗಳು', 'ಕೊನೆ',
  ],
  HOTSPOT_QUERY: [
    'hotspot', 'hot spot', 'hotspots', 'high risk', 'high-risk', 'concentrated',
    'cluster', 'area flagged', 'danger zone', 'most cases', 'highest',
    // Romanized
    'hotspotu', 'hot spotu', 'uccha', 'jaasti', 'jasti area', 'risky area',
    'yelli heccu', 'elli heccu',
    // Kannada script (with/without space / ZWJ)
    'ಹಾಟ್‌ಸ್ಪಾಟ್', 'ಹಾಟ್ಸ್ಪಾಟ್', 'ಹಾಟ್ ಸ್ಪಾಟ್', 'ಹಾಟ್‌ ಸ್ಪಾಟ್', 'ಗುಂಪು', 'ಅಪಾಯ',
  ],
  NETWORK_QUERY: [
    'network', 'link', 'links', 'connected', 'connection', 'associate', 'gang',
    'ring', 'related cases', 'view connected', 'offender link', 'linked',
    // Romanized
    'networku', 'sambanda', 'sambandha', 'jalu', 'jaalu', 'connected offenders',
    'repeat connection', 'gangu',
    // Kannada
    'ಜಾಲ', 'ಸಂಪರ್ಕ', 'ಸಂಬಂಧ', 'ನೆಟ್‌ವರ್ಕ್',
  ],
  REPEAT_OFFENDER_QUERY: [
    'repeat offender', 'repeat offenders', 'recidivist', 'known offender',
    'habitual', 'multiple cases', 'repeat flag',
    // Romanized
    'punaravarti', 'punaha', 'same person', 'habitual offender',
    'mara mari case',
    // Kannada
    'ಪುನರಾವರ್ತಿ', 'ಪುನಃ',
  ],
  SUMMARY_QUERY: [
    'summary', 'overview', 'brief', 'report', 'status', 'total', 'count',
    'how many', 'show all',
    // Romanized
    'saransha', 'saransh', 'vivarane', 'otal', 'eshtu', 'eshtu cases',
    // Kannada
    'ಸಾರಾಂಶ', 'ವಿವರಣೆ', 'ಎಷ್ಟು',
  ],
};

const TIME_RANGE_PATTERNS = [
  {
    months: 1,
    patterns: [
      'last month', 'past month', '1 month', 'one month', '30 days',
      'kone 1 tingalu', 'kone ondu tingalu', 'ಕೊನೆ ತಿಂಗಳು',
    ],
  },
  {
    months: 3,
    patterns: [
      'last 3 months', 'past 3 months', '3 months', 'three months', 'quarter',
      'kone 3 tingalu', 'kone muru tingalu', 'ಕೊನೆ 3 ತಿಂಗಳು',
    ],
  },
  {
    months: 6,
    patterns: [
      'last 6 months', 'past 6 months', '6 months', 'six months', 'half year',
      'kone 6', 'kone 6 months', 'kone 6 tingalu', 'kone aru tingalu',
      'last six', 'ಕೊನೆ 6 ತಿಂಗಳು', 'ಆರು ತಿಂಗಳು',
    ],
  },
  {
    months: 12,
    patterns: [
      'last year', 'past year', '12 months', 'one year', '1 year',
      'kone 1 varsha', 'kone ondu varsha', 'ಕೊನೆ ವರ್ಷ',
    ],
  },
];

/** Common phrase normalizations before matching (Romanized Kannada → English cues) */
const TRANSLITERATION_ALIASES = [
  [/sai\s*bar/g, 'cyber'],
  [/saibar/g, 'cyber'],
  [/saiber/g, 'cyber'],
  [/siber/g, 'cyber'],
  [/cyberaparadha/g, 'cyber'],
  [/kallatana/g, 'theft'],
  [/kallagadda/g, 'theft'],
  [/kallategada/g, 'theft'],
  [/dakaiti/g, 'robbery'],
  [/vanchane/g, 'fraud'],
  [/mosaga/g, 'fraud'],
  [/pranahatye/g, 'murder'],
  [/maadaka|madaka/g, 'drug'],
  [/bengalooru|banglore|bengloor|benagluru|blore/g, 'bengaluru'],
  [/maisuru/g, 'mysuru'],
  [/manglore|mangloor/g, 'mangaluru'],
  [/hubli/g, 'hubballi'],
  [/belgaum|belgaam/g, 'belagavi'],
  [/pravrutti|pravritti|trendu/g, 'trend'],
  [/hot\s*spot|ಹಾಟ್\s*ಸ್ಪಾಟ್|ಹಾಟ್ಸ್ಪಾಟ್/g, 'hotspot'],
  [/networku|jaalu|jalu/g, 'network'],
  [/sambanda|sambandha/g, 'connected'],
  [/punaravarti/g, 'repeat offender'],
  [/saransh[a]?/g, 'summary'],
  [/kone\s*6\s*(tingalu|months)?/g, 'last 6 months'],
  [/kone\s*aru\s*tingalu/g, 'last 6 months'],
  [/torsi|torisi|tori/g, 'show'],
  [/eshtu/g, 'how many'],
  [/heccu\s*area|jasti\s*area|elli\s*heccu|yelli\s*heccu/g, 'hotspot'],
];

const DEFAULT_TIME_RANGE_MONTHS = 6;

function normalizeText(text) {
  let t = String(text || '')
    .toLowerCase()
    .replace(/[^\w\s\u0C80-\u0CFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [pattern, replacement] of TRANSLITERATION_ALIASES) {
    t = t.replace(pattern, replacement);
  }

  return t.replace(/\s+/g, ' ').trim();
}

/**
 * Detect input language flavour for explainability / UI badge.
 * @param {string} original
 * @returns {'en'|'kn'|'kn_latin'|'mixed'}
 */
function detectLanguageMode(original) {
  const hasKannadaScript = /[\u0C80-\u0CFF]/.test(original);
  const lower = String(original || '').toLowerCase();
  const hasRomanized = TRANSLITERATION_ALIASES.some(([pattern]) => {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    return pattern.test(lower);
  });
  const hasEnglishCrimeWords = /\b(cyber|theft|trend|hotspot|network|show|crime|fraud)\b/i.test(original);

  if (hasKannadaScript && hasEnglishCrimeWords) return 'mixed';
  if (hasKannadaScript) return 'kn';
  if (hasRomanized && !hasEnglishCrimeWords) return 'kn_latin';
  if (hasRomanized && hasEnglishCrimeWords) return 'mixed';
  return 'en';
}

function matchFromMap(text, keywordMap) {
  // Prefer longer keywords first to avoid short false positives (e.g. "kalla" vs "kallatana")
  let best = null;
  let bestLen = 0;

  for (const [key, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      const needle = kw.toLowerCase();
      if (needle && text.includes(needle) && needle.length > bestLen) {
        best = key;
        bestLen = needle.length;
      }
    }
  }
  return best;
}

function detectIntent(text) {
  const scores = Object.fromEntries(Object.keys(INTENTS).map((k) => [k, 0]));

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        scores[intent] += 1;
      }
    }
  }

  if (/(show|display|list|torisi|torsi)/.test(text) && /(trend|month|tingalu|prav)/.test(text)) {
    scores.TREND_QUERY += 2;
  }
  if (/(connected|offender|network|jalu|samband)/.test(text)) {
    scores.NETWORK_QUERY += 2;
  }
  if (/(where|elli|yelli|hotspot|heccu|jasti)/.test(text) && /(high|most|heccu|area)/.test(text)) {
    scores.HOTSPOT_QUERY += 2;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = ranked[0];

  if (topScore === 0) {
    const hasFilter = matchFromMap(text, CRIME_TYPE_KEYWORDS) || matchFromMap(text, LOCATION_KEYWORDS);
    return hasFilter ? INTENTS.TREND_QUERY : INTENTS.SUMMARY_QUERY;
  }

  return topIntent;
}

function extractTimeRangeMonths(text) {
  for (const { months, patterns } of TIME_RANGE_PATTERNS) {
    if (patterns.some((p) => text.includes(p))) {
      return months;
    }
  }
  return DEFAULT_TIME_RANGE_MONTHS;
}

function extractStation(text) {
  let best = null;
  let bestLen = 0;
  for (const [token, keywords] of Object.entries(STATION_KEYWORDS)) {
    for (const kw of keywords) {
      const needle = kw.toLowerCase();
      if (needle && text.includes(needle) && needle.length > bestLen) {
        best = token;
        bestLen = needle.length;
      }
    }
  }
  // Generic: "... in <name> ps"
  if (!best) {
    const m = text.match(/\bin\s+([a-z0-9.\s]{3,40}?)\s*(?:ps|police\s*station)\b/);
    if (m) best = m[1].trim();
  }
  return best;
}

function extractStatus(text) {
  return matchFromMap(text, STATUS_KEYWORDS);
}

/**
 * Parse natural-language query into intent + entities.
 * @param {string} query
 * @returns {{ intent: string, entities: object, normalized_query: string, language_mode: string }}
 */
function parseIntent(query) {
  const languageMode = detectLanguageMode(query);
  const normalized = normalizeText(query);
  const station = extractStation(normalized);
  const status = extractStatus(normalized);

  // If officer names a PS, default city to Bengaluru when not otherwise set
  let location = matchFromMap(normalized, LOCATION_KEYWORDS);
  if (station && !location) location = 'BENGALURU';

  return {
    intent: detectIntent(normalized),
    entities: {
      crime_type: matchFromMap(normalized, CRIME_TYPE_KEYWORDS),
      location,
      station,
      status,
      time_range_months: extractTimeRangeMonths(normalized),
    },
    normalized_query: normalized,
    language_mode: languageMode,
  };
}

module.exports = {
  INTENTS,
  CRIME_TYPE_KEYWORDS,
  LOCATION_KEYWORDS,
  STATION_KEYWORDS,
  parseIntent,
  normalizeText,
  detectLanguageMode,
};
