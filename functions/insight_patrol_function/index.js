'use strict';

/**
 * InsightPatrol — Catalyst Advanced I/O Function
 * Routes: login, health, queryCrime, crimeTrends, networkAnalysis, investigate,
 *         caseDesk, assignCase, updateCase, patrolDesk, createPatrolDuty, addPatrolLog
 */

const { handleQueryCrime } = require('./queryHandler');
const { readJsonBody, loadCrimeData } = require('./lib/dataStore');
const caseDesk = require('./lib/caseDesk');
const auth = require('./lib/auth');
const patrol = require('./lib/patrol');
const { homeScrbCards } = require('./lib/realStats');
const contactDesk = require('./lib/contactDesk');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function sendJson(res, status, body) {
  res.writeHead(status, CORS_HEADERS);
  res.end(JSON.stringify(body));
}

function pathOnly(url) {
  try {
    return new URL(url, 'http://localhost').pathname.replace(/\/$/, '') || '/';
  } catch (e) {
    return String(url || '/').split('?')[0].replace(/\/$/, '') || '/';
  }
}

async function extractQuery(req) {
  if (req.method === 'GET') {
    const url = new URL(req.url, 'http://localhost');
    return {
      query: url.searchParams.get('query') || url.searchParams.get('fir') || url.searchParams.get('offender') || url.searchParams.get('offender_id') || '',
      location: url.searchParams.get('location') || '',
      crime_type: url.searchParams.get('crime_type') || '',
      language_pref: url.searchParams.get('language_pref') || url.searchParams.get('lang') || '',
      offender_id: url.searchParams.get('offender_id') || '',
      body: {},
    };
  }
  const body = await readJsonBody(req);
  return {
    query: body.query || body.message || body.text || body.fir || body.offender || body.offender_id || '',
    location: body.location || '',
    crime_type: body.crime_type || '',
    language_pref: body.language_pref || body.lang || '',
    offender_id: body.offender_id || '',
    body,
  };
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS_HEADERS);
    res.end();
    return;
  }

  const path = pathOnly(req.url);

  try {
    if (path === '/' || path === '' || path.endsWith('/health')) {
      const domain = await loadCrimeData(req);
      sendJson(res, 200, {
        summary: 'InsightPatrol function is live.',
        data: {
          service: 'insight_patrol_function',
          routes: [
            '/login', '/demoLogins', '/queryCrime', '/crimeTrends', '/networkAnalysis',
            '/investigate', '/accusedHistory', '/caseDesk', '/assignCase', '/updateCase',
            '/patrolDesk', '/createPatrolDuty', '/addPatrolLog', '/patrolSuggest', '/beatOfficers',
            '/scrbStats', '/contacts', '/matchContact', '/health',
          ],
          connection: domain.connection,
          data_source: domain.source,
          desk: caseDesk.listDesk(),
          patrol: patrol.listPatrol(),
          scrb: homeScrbCards(),
          contacts: contactDesk.directorySummary(),
        },
        visual_payload: { focus: 'none' },
        reasons: [
          domain.connection?.status === 'connected'
            ? 'Catalyst Data Store connection active.'
            : 'Running on synthetic SCRB fallback — seed Data Store tables for live DB reads.',
          'Officer login required on client before investigation / patrol desks.',
          'Real-datasets (2023–2025) district aggregates included for AI context.',
        ],
      });
      return;
    }

    if (path.endsWith('/scrbStats')) {
      sendJson(res, 200, {
        summary: 'SCRB Karnataka public crime statistics (Real-datasets).',
        data: homeScrbCards(),
        visual_payload: { focus: 'scrb' },
        reasons: ['Aggregate district figures only — not individual accused/FIR rows.'],
      });
      return;
    }

    if (path.endsWith('/contacts')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      const url = new URL(req.url, 'http://localhost');
      const q = body.q || body.query || url.searchParams.get('q') || '';
      const type = body.type || url.searchParams.get('type') || 'all';
      const data = contactDesk.searchContacts(q, { type, limit: Number(body.limit) || 48 });
      sendJson(res, 200, {
        summary: q
          ? `Found ${data.total} contact(s) for “${q}”.`
          : `Bengaluru City Police directory — ${data.counts.stations} PS, ${data.counts.traffic} traffic, ${data.counts.seniors} seniors.`,
        data,
        visual_payload: { focus: 'contacts' },
        reasons: [
          'Source: City_Police_Contact_info (public KSP contact lists).',
          'Use Quick Dial to call PS / Traffic / DCP from investigation.',
        ],
      });
      return;
    }

    if (path.endsWith('/matchContact')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      const url = new URL(req.url, 'http://localhost');
      const station = body.station || body.station_name || url.searchParams.get('station') || '';
      const matched = contactDesk.matchStation(station);
      sendJson(res, 200, {
        summary: matched.station
          ? `Contact found for ${matched.station.name}: ${matched.station.primary_phone}.`
          : (station ? `No exact PS match for “${station}”. Try Contacts search.` : 'Provide a station name.'),
        data: matched,
        visual_payload: { focus: 'contacts' },
        reasons: ['Matched from Law & Order / Traffic / DCP directory.'],
      });
      return;
    }

    if (path.endsWith('/demoLogins')) {
      sendJson(res, 200, {
        summary: 'Demo officer logins for datathon (replace with Catalyst Auth for production).',
        data: { logins: auth.listDemoLogins(), password_hint: 'Ksp@2026' },
        visual_payload: { focus: 'auth' },
        reasons: ['Use these usernames with the shared demo password.', 'Seed officers_auth table to override roster.'],
      });
      return;
    }

    if (path.endsWith('/login')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      const result = await auth.login(req, body);
      sendJson(res, result.ok ? 200 : 401, {
        summary: result.summary,
        data: result.data || { error: true },
        visual_payload: { focus: 'auth' },
        reasons: result.reasons || [],
      });
      return;
    }

    if (path.endsWith('/patrolDesk')) {
      sendJson(res, 200, {
        summary: 'Patrol desk — beats, duties and field logs.',
        data: patrol.listPatrol(),
        visual_payload: { focus: 'patrol' },
        reasons: ['Beat master + session duties/logs loaded.', 'Create patrol_duties / patrol_logs tables for persistence.'],
      });
      return;
    }

    if (path.endsWith('/createPatrolDuty')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      const result = await patrol.createDuty(req, body);
      sendJson(res, result.ok ? 200 : 403, {
        summary: result.summary,
        data: result.data || { error: true },
        visual_payload: { focus: 'patrol' },
        reasons: result.reasons || [],
      });
      return;
    }

    if (path.endsWith('/addPatrolLog')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      const result = await patrol.addPatrolLog(req, body);
      sendJson(res, result.ok ? 200 : 400, {
        summary: result.summary,
        data: result.data || { error: true },
        visual_payload: { focus: 'patrol' },
        reasons: result.reasons || [],
      });
      return;
    }

    if (path.endsWith('/patrolSuggest')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      let stations = body.station_breakdown || [];
      let hotspots = body.hotspots || [];
      if (!stations.length && (body.query || body.refresh)) {
        const q = body.query || 'Show cyber crime hotspots Bengaluru last 6 months';
        const intel = await handleQueryCrime(q, req, { language_pref: body.language_pref || 'en' });
        stations = intel.data?.station_breakdown || [];
        hotspots = intel.visual_payload?.map?.hotspots || intel.visual_payload?.map?.station_hotspots || [];
      }
      const suggestions = patrol.suggestFromIntel(stations, hotspots);
      sendJson(res, 200, {
        summary: `Field duty suggestions ready (${suggestions.length} areas).`,
        data: { suggestions, beats: patrol.listBeats(), patrol: patrol.listPatrol() },
        visual_payload: { focus: 'patrol', suggestions },
        reasons: [
          'Suggestions based on police station case load.',
          'SHO / CI / DySP can create a duty from a HIGH suggestion.',
        ],
      });
      return;
    }

    if (path.endsWith('/beatOfficers')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      const url = new URL(req.url, 'http://localhost');
      const beatId = body.beat_id || url.searchParams.get('beat_id') || '';
      const officers = beatId ? patrol.officersByBeat(beatId) : patrol.listPatrol().officers;
      sendJson(res, 200, {
        summary: beatId ? `Officers for selected area.` : 'All station officers.',
        data: { beat_id: beatId, officers },
        visual_payload: { focus: 'patrol' },
        reasons: ['Select an officer from this list when creating a field duty.'],
      });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
      sendJson(res, 405, {
        summary: 'Method not allowed.',
        data: { error: true },
        visual_payload: { focus: 'none' },
        reasons: ['Use GET or POST.'],
      });
      return;
    }

    // Case desk routes
    if (path.endsWith('/caseDesk')) {
      sendJson(res, 200, {
        summary: 'Case work roster and investigation ledger.',
        data: caseDesk.listDesk(),
        visual_payload: { focus: 'desk' },
        reasons: ['Duty roster and recent assignments/updates loaded.'],
      });
      return;
    }

    if (path.endsWith('/assignCase')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      const result = await caseDesk.assignCase(req, body);
      sendJson(res, result.ok ? 200 : 403, {
        summary: result.summary,
        data: result.data || { error: true },
        visual_payload: { focus: 'desk' },
        reasons: result.reasons || [],
      });
      return;
    }

    if (path.endsWith('/updateCase')) {
      const body = req.method === 'POST' ? (await readJsonBody(req)) : {};
      const result = await caseDesk.updateStatus(req, body);
      sendJson(res, result.ok ? 200 : 403, {
        summary: result.summary,
        data: result.data || { error: true },
        visual_payload: { focus: 'desk' },
        reasons: result.reasons || [],
      });
      return;
    }

    const payload = await extractQuery(req);
    let query = payload.query;
    const langOpt = { language_pref: payload.language_pref || payload.body?.language_pref || 'en' };

    if (path.endsWith('/accusedHistory')) {
      const { buildOffenderDossier } = require('./lib/investigation');
      const domain = await loadCrimeData(req);
      const key = payload.offender_id || query;
      const dossier = buildOffenderDossier(domain, key);
      if (!dossier) {
        sendJson(res, 404, {
          summary: 'Accused not found in register.',
          data: { error: true },
          visual_payload: { focus: 'none' },
          reasons: ['Check offender id or name.', 'Engine: rule-based lookup (not generative AI).'],
        });
        return;
      }
      sendJson(res, 200, {
        summary: `${dossier.offender.name} — ${dossier.case_count} FIR(s) from ${dossier.years_covered?.join(', ') || 'records'}.`,
        data: {
          intent: 'ACCUSED_HISTORY',
          engine: 'rule_based_nlp',
          offender_dossier: dossier,
          case_register: dossier.crimes,
          total_matches: dossier.case_count,
          data_source: domain.source,
        },
        visual_payload: {
          focus: 'history',
          investigation: {
            offender_id: dossier.offender.offender_id,
            prior_fir_count: dossier.prior_fir_count,
            years: dossier.years_covered,
          },
        },
        reasons: [
          `Full FIR list (no 6-month cut) for ${dossier.offender.name}.`,
          `Stations: ${(dossier.stations || []).join('; ') || 'n/a'}.`,
          'Engine: rule-based NLP on crime register — not ChatGPT-style AI.',
        ],
      });
      return;
    }

    if (path.endsWith('/crimeTrends')) {
      if (query && !/trend|pravrutti|pattern|month/i.test(query)) query = `${query} trend last 6 months`;
      const result = await handleQueryCrime(query, req, langOpt);
      result.visual_payload.focus = 'trend';
      if (result.data) {
        result.data.endpoint = 'crimeTrends';
        result.data.view_hint = 'trend';
      }
      sendJson(res, 200, result);
      return;
    }

    if (path.endsWith('/networkAnalysis')) {
      if (!query) query = 'show connected offenders network cyber Bengaluru';
      else if (!/network|connected|offender|jalu|samband|linked/i.test(query)) {
        query = `Show connected offenders network for ${query}`;
      }
      const result = await handleQueryCrime(query, req, langOpt);
      result.visual_payload.focus = 'network';
      if (result.data) {
        result.data.endpoint = 'networkAnalysis';
        result.data.view_hint = 'links';
      }
      sendJson(res, 200, result);
      return;
    }

    if (path.endsWith('/investigate')) {
      if (!query) query = 'Repeat offenders cyber Bengaluru';
      else if (!/repeat|offender|accused|profile/i.test(query)) {
        query = `Repeat offenders ${query}`;
      }
      const result = await handleQueryCrime(query, req, langOpt);
      if (result.data) {
        result.data.endpoint = 'investigate';
        result.data.view_hint = 'repeats';
      }
      result.visual_payload.focus = 'network';
      sendJson(res, 200, result);
      return;
    }

    if (path.endsWith('/queryCrime')) {
      const result = await handleQueryCrime(query, req, langOpt);
      if (result.data) result.data.endpoint = 'queryCrime';
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, {
      summary: 'Route not found.',
      data: { error: true, path },
      visual_payload: { focus: 'none' },
      reasons: ['See /health for available routes.'],
    });
  } catch (err) {
    sendJson(res, 500, {
      summary: 'Unable to process request.',
      data: { error: true, detail: err.message },
      visual_payload: { focus: 'none' },
      reasons: ['Internal function error.', err.message],
    });
  }
};
