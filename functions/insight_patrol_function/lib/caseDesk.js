'use strict';

/**
 * Case Desk — assignment, status updates, investigation notes.
 * Tries Catalyst Data Store table `case_updates` when present;
 * always returns a session-ready ledger payload for the UI.
 */

const catalyst = require('zcatalyst-sdk-node');

/** Demo duty roster (KSP-style designations) */
const DUTY_ROSTER = [
  { id: 'OFF-PSI-01', rank: 'PSI', name: 'A. Naveen', unit: 'Cyber Crime PS, Bengaluru City', role: 'IO' },
  { id: 'OFF-PSI-02', rank: 'PSI', name: 'S. Kavitha', unit: 'Indiranagar PS', role: 'IO' },
  { id: 'OFF-ASI-01', rank: 'ASI', name: 'R. Mahesh', unit: 'Cyber Crime PS, Bengaluru City', role: 'Assist' },
  { id: 'OFF-SHO-01', rank: 'Inspector / SHO', name: 'K. Prakash', unit: 'Whitefield PS', role: 'SHO' },
  { id: 'OFF-CI-01', rank: 'Circle Inspector', name: 'M. Deepa', unit: 'Bengaluru East Circle', role: 'Supervisor' },
  { id: 'OFF-DYSP-01', rank: 'DySP', name: 'V. Ramesh', unit: 'Bengaluru East Sub-Division', role: 'Supervisor' },
];

const STATUS_OPTIONS = [
  'Under Investigation',
  'Evidence Collection',
  'Accused Not Identified',
  'Accused Identified',
  'Arrest / Notice Issued',
  'Charge Sheet Filed',
  'Referred to Cyber Cell',
  'Closed / Final Report',
];

// Process-memory ledger (demo persistence within warm instance)
const ledger = {
  assignments: [],
  updates: [],
  attachments: [],
};

function canAssign(roleKey) {
  return /ci-|dysp-|sho-/.test(String(roleKey || ''));
}

function canUpdate(roleKey) {
  return /psi-|asi-|sho-|ci-|dysp-/.test(String(roleKey || ''));
}

async function tryInsertUpdate(req, row) {
  try {
    const app = catalyst.initialize(req);
    const table = app.datastore().table('case_updates');
    await table.insertRow({
      update_id: row.update_id,
      fir_no: row.fir_no,
      crime_id: row.crime_id,
      action_type: row.action_type,
      status: row.status || '',
      assigned_to: row.assigned_to || '',
      assigned_by: row.assigned_by || '',
      note: row.note || '',
      attachment_name: row.attachment_name || '',
      officer_role: row.officer_role || '',
      created_at: row.created_at,
    });
    return 'catalyst_datastore';
  } catch (err) {
    return 'session_ledger';
  }
}

function listDesk() {
  return {
    roster: DUTY_ROSTER,
    status_options: STATUS_OPTIONS,
    assignments: ledger.assignments.slice().reverse(),
    updates: ledger.updates.slice().reverse(),
    attachments: ledger.attachments.slice().reverse(),
  };
}

async function assignCase(req, body) {
  const roleKey = body.role_key || '';
  if (!canAssign(roleKey) && !body.force) {
    return {
      ok: false,
      summary: 'Only SHO / Circle Inspector / DySP can assign cases in this desk.',
      reasons: ['Assignment requires supervisory designation.'],
    };
  }

  const officer = DUTY_ROSTER.find((o) => o.id === body.assigned_to_id)
    || DUTY_ROSTER.find((o) => o.name === body.assigned_to);
  if (!officer) {
    return { ok: false, summary: 'Select a valid officer from the duty roster.', reasons: ['Unknown assignee.'] };
  }

  const row = {
    update_id: `ASG-${Date.now()}`,
    action_type: 'ASSIGN',
    fir_no: body.fir_no || '',
    crime_id: body.crime_id || '',
    status: body.status || 'Under Investigation',
    assigned_to: `${officer.rank} ${officer.name} · ${officer.unit}`,
    assigned_to_id: officer.id,
    assigned_by: body.assigned_by || roleKey,
    note: body.note || `Case assigned for investigation follow-up.`,
    attachment_name: '',
    officer_role: roleKey,
    created_at: new Date().toISOString(),
  };

  const source = await tryInsertUpdate(req, row);
  ledger.assignments.push(row);
  ledger.updates.push(row);

  return {
    ok: true,
    summary: `Assigned ${row.fir_no || row.crime_id} to ${officer.rank} ${officer.name}.`,
    data: { row, desk: listDesk(), persist: source },
    reasons: [
      `Assignee: ${officer.rank} ${officer.name} (${officer.unit}).`,
      `Assigned by session role: ${roleKey || 'supervisor'}.`,
      `Persist mode: ${source}.`,
    ],
  };
}

async function updateStatus(req, body) {
  const roleKey = body.role_key || '';
  if (!canUpdate(roleKey) && !body.force) {
    return {
      ok: false,
      summary: 'Your designation cannot update investigation status in this desk.',
      reasons: ['Status update requires IO / ASI / SHO / supervisory role.'],
    };
  }

  if (!STATUS_OPTIONS.includes(body.status) && body.status) {
    // allow custom but prefer listed
  }

  const row = {
    update_id: `UPD-${Date.now()}`,
    action_type: 'STATUS',
    fir_no: body.fir_no || '',
    crime_id: body.crime_id || '',
    status: body.status || 'Under Investigation',
    assigned_to: body.assigned_to || '',
    assigned_by: body.assigned_by || roleKey,
    note: body.note || '',
    attachment_name: body.attachment_name || '',
    officer_role: roleKey,
    created_at: new Date().toISOString(),
  };

  const source = await tryInsertUpdate(req, row);
  ledger.updates.push(row);
  if (row.attachment_name) {
    ledger.attachments.push({
      id: `ATT-${Date.now()}`,
      fir_no: row.fir_no,
      crime_id: row.crime_id,
      name: row.attachment_name,
      note: row.note,
      uploaded_by: roleKey,
      created_at: row.created_at,
    });
  }

  return {
    ok: true,
    summary: `Status updated for ${row.fir_no || row.crime_id}: ${row.status}.`,
    data: { row, desk: listDesk(), persist: source },
    reasons: [
      `New status: ${row.status}.`,
      row.note ? `Note recorded for case file.` : 'No additional note provided.',
      row.attachment_name ? `Attachment linked: ${row.attachment_name}.` : 'No attachment linked.',
      `Persist mode: ${source}.`,
    ],
  };
}

module.exports = {
  DUTY_ROSTER,
  STATUS_OPTIONS,
  listDesk,
  assignCase,
  updateStatus,
  canAssign,
  canUpdate,
};
