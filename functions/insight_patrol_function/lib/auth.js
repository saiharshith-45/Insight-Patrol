'use strict';

/**
 * Officer authentication against Catalyst Data Store `officers_auth`
 * (falls back to embedded demo roster for datathon).
 * DEMO ONLY — plain passwords for hackathon; replace with Catalyst Auth later.
 */

const catalyst = require('zcatalyst-sdk-node');

const DEMO_OFFICERS = [
  {
    officer_id: 'OFF-DYSP-01',
    username: 'dysp.ramesh',
    password: 'Ksp@2026',
    rank: 'DySP',
    name: 'V. Ramesh',
    unit: 'Bengaluru East Sub-Division',
    role_key: 'dysp-east',
    can_assign: true,
    can_patrol_plan: true,
    can_investigate: true,
  },
  {
    officer_id: 'OFF-CI-01',
    username: 'ci.deepa',
    password: 'Ksp@2026',
    rank: 'Circle Inspector',
    name: 'M. Deepa',
    unit: 'Bengaluru East Circle',
    role_key: 'ci-east',
    can_assign: true,
    can_patrol_plan: true,
    can_investigate: true,
  },
  {
    officer_id: 'OFF-SHO-01',
    username: 'sho.prakash',
    password: 'Ksp@2026',
    rank: 'Inspector / SHO',
    name: 'K. Prakash',
    unit: 'Whitefield Police Station',
    role_key: 'sho-whitefield',
    can_assign: true,
    can_patrol_plan: true,
    can_investigate: true,
  },
  {
    officer_id: 'OFF-PSI-01',
    username: 'psi.naveen',
    password: 'Ksp@2026',
    rank: 'PSI',
    name: 'A. Naveen',
    unit: 'Cyber Crime PS, Bengaluru City',
    role_key: 'psi-io-cyber',
    can_assign: false,
    can_patrol_plan: false,
    can_investigate: true,
  },
  {
    officer_id: 'OFF-PSI-02',
    username: 'psi.kavitha',
    password: 'Ksp@2026',
    rank: 'PSI',
    name: 'S. Kavitha',
    unit: 'Indiranagar PS',
    role_key: 'psi-io-indira',
    can_assign: false,
    can_patrol_plan: false,
    can_investigate: true,
  },
  {
    officer_id: 'OFF-ASI-01',
    username: 'asi.mahesh',
    password: 'Ksp@2026',
    rank: 'ASI',
    name: 'R. Mahesh',
    unit: 'Cyber Crime PS, Bengaluru City',
    role_key: 'asi-ccps',
    can_assign: false,
    can_patrol_plan: false,
    can_investigate: true,
  },
  {
    officer_id: 'OFF-HC-01',
    username: 'hc.sunil',
    password: 'Ksp@2026',
    rank: 'Head Constable',
    name: 'Sunil B',
    unit: 'Indiranagar PS — Beat 3',
    role_key: 'patrol-hc',
    can_assign: false,
    can_patrol_plan: false,
    can_investigate: false,
    can_patrol: true,
  },
  {
    officer_id: 'OFF-PC-01',
    username: 'pc.anand',
    password: 'Ksp@2026',
    rank: 'Police Constable',
    name: 'Anand P',
    unit: 'Whitefield PS — Night Patrol',
    role_key: 'patrol-pc',
    can_assign: false,
    can_patrol_plan: false,
    can_investigate: false,
    can_patrol: true,
  },
];

function publicOfficer(o) {
  return {
    officer_id: o.officer_id,
    username: o.username,
    rank: o.rank,
    name: o.name,
    unit: o.unit,
    role_key: o.role_key,
    can_assign: !!o.can_assign,
    can_patrol_plan: !!o.can_patrol_plan,
    can_investigate: o.can_investigate !== false,
    can_patrol: !!o.can_patrol || !!o.can_patrol_plan,
  };
}

async function loadOfficers(req) {
  try {
    const app = catalyst.initialize(req);
    const table = app.datastore().table('officers_auth');
    const rows = (await table.getAllRows()) || [];
    if (rows.length) {
      return rows.map((r) => {
        const n = {};
        Object.entries(r).forEach(([k, v]) => { n[String(k).toLowerCase()] = v; });
        return {
          officer_id: n.officer_id,
          username: n.username,
          password: n.password,
          rank: n.rank,
          name: n.name,
          unit: n.unit,
          role_key: n.role_key,
          can_assign: String(n.can_assign).toLowerCase() === 'true' || n.can_assign === true,
          can_patrol_plan: String(n.can_patrol_plan).toLowerCase() === 'true' || n.can_patrol_plan === true,
          can_investigate: n.can_investigate === undefined ? true : (String(n.can_investigate).toLowerCase() === 'true' || n.can_investigate === true),
          can_patrol: String(n.can_patrol).toLowerCase() === 'true' || n.can_patrol === true,
        };
      });
    }
  } catch (e) {
    // fallback
  }
  return DEMO_OFFICERS;
}

async function login(req, body) {
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || !password) {
    return {
      ok: false,
      summary: 'Enter username and password.',
      reasons: ['Both fields are required.'],
    };
  }

  const officers = await loadOfficers(req);
  const match = officers.find(
    (o) => String(o.username).toLowerCase() === username && String(o.password) === password
  );

  if (!match) {
    return {
      ok: false,
      summary: 'Login failed. Check credentials or contact your SHO / admin.',
      reasons: ['Invalid username or password.', 'Demo tip: psi.naveen / Ksp@2026'],
    };
  }

  const session = {
    token: `sess_${match.officer_id}_${Date.now()}`,
    officer: publicOfficer(match),
    logged_in_at: new Date().toISOString(),
  };

  return {
    ok: true,
    summary: `Welcome ${match.rank} ${match.name}. Duty unit: ${match.unit}.`,
    data: { session },
    reasons: [
      `Authenticated as ${match.rank}.`,
      `Unit: ${match.unit}.`,
      'Session is for investigation / patrol desk use only.',
    ],
  };
}

function listDemoLogins() {
  return DEMO_OFFICERS.map((o) => ({
    username: o.username,
    rank: o.rank,
    name: o.name,
    unit: o.unit,
  }));
}

module.exports = {
  DEMO_OFFICERS,
  login,
  loadOfficers,
  publicOfficer,
  listDemoLogins,
};
