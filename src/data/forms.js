// ---------------------------------------------------------------------------
// Master data taken verbatim from Carnegie SOP QAD003.04 (Attachment A01 form).
// The Master Workflow decides WHO does WHAT and WHEN; these are the exact
// questions each department answers inside its step.
// Field types:  yna = Yes / No / Not Applicable   yn = Yes / No
//               yna8 = Yes / No / N/A (risk and closeout wording)
//               multi = tick one or more          single = tick one
// ---------------------------------------------------------------------------

export const CHANGE_TYPES = [
  'Batch Record',
  'Test Method',
  'Specification',
  'Equipment/Facility/Utility',
  'SOP',
  'Computer System',
  'Labeling Component',
  'Vendor',
  'Protocol/Report',
  'Other',
];

export const YNA = ['Yes', 'No', 'Not Applicable'];
export const YN = ['Yes', 'No'];
export const YNNA = ['Yes', 'No', 'N/A'];

// ---- Section IV: departmental assessments (one question set per department) ----
export const ASSESSMENTS = [
  {
    key: 'validation',
    name: 'Validation / Qualification Assessment',
    shortName: 'Validation / Qualification',
    completedBy: 'HOD of Operations / Designee',
    department: 'Operations',
    heads: ['u_rajesh'],
    sop: 'SOP 5.5.1.1',
    fields: [
      { id: 'process', type: 'yna', label: 'Process Validation Required?' },
      { id: 'cleaning', type: 'yna', label: 'Cleaning Validation Required?' },
      { id: 'equipment', type: 'yna', label: 'Equipment Qualification/Calibration Required?' },
    ],
  },
  {
    key: 'analytical',
    name: 'Analytical Validation / Qualification Assessment',
    shortName: 'Analytical Validation / Qualification',
    completedBy: 'HOD of ARD or QCS / Designee (either one signs)',
    department: 'ARD / QCS',
    heads: ['u_saurabh', 'u_meenal'],
    sop: 'SOP 5.5.1.2',
    fields: [
      { id: 'method', type: 'yna', label: 'Method Validation Required?' },
      { id: 'equipment', type: 'yna', label: 'Equipment Qualification/Calibration Required?' },
    ],
  },
  {
    key: 'stability',
    name: 'Stability Assessment',
    shortName: 'Stability',
    completedBy: 'HOD of ARD or QCS / Designee (either one signs)',
    department: 'ARD / QCS',
    heads: ['u_saurabh', 'u_meenal'],
    sop: 'SOP 5.5.1.3',
    fields: [
      { id: 'required', type: 'yn', label: 'Stability required?' },
      {
        id: 'conditions',
        type: 'multi',
        label: 'If yes, check one or more of the following options below:',
        dependsOn: { field: 'required', value: 'Yes' },
        options: [
          'Accelerated Stability (40°C ± 2°C/75% RH ± 5% RH)',
          'Long-term Stability (25°C ± 2°C/60% RH ± 5% RH)',
          'Refrigerated Stability (5°C ± 3°C)',
          'Other',
        ],
        otherText: true,
      },
    ],
  },
  {
    key: 'computer',
    name: 'Computer System Assessment',
    shortName: 'Computer System',
    completedBy: 'HOD of ITR / Designee',
    department: 'Information Technology (ITR)',
    heads: ['u_vivek'],
    sop: 'SOP 5.5.1.4',
    fields: [{ id: 'validation', type: 'yna', label: 'Validation/Qualification Required?' }],
  },
  {
    key: 'safety',
    name: 'Safety Risk Assessment',
    shortName: 'Safety Risk',
    completedBy: 'HOD of EHS / Designee',
    department: 'EHS',
    heads: ['u_kavita'],
    sop: 'SOP 5.5.1.5',
    fields: [
      { id: 'operator', type: 'yna', label: 'Is there an impact on operator safety?' },
      { id: 'environment', type: 'yna', label: 'Is there an impact on environmental safety?' },
    ],
  },
  {
    key: 'training',
    name: 'Training Assessment',
    shortName: 'Training',
    completedBy: "HOD of the Initiator's Department / Designee",
    department: "Initiator's Department",
    heads: [], // resolved at runtime: HOD of the initiating department
    sop: 'SOP 5.5.1.6',
    fields: [
      {
        id: 'departments',
        type: 'multi',
        label: 'Check the departments affected:',
        options: ['QAD', 'OPS', 'ARD', 'PRD', 'EHS', 'ITR', 'RAC', 'QCS', 'All Departments', 'Other'],
        otherText: true,
        inline: true,
      },
      {
        id: 'trainingType',
        type: 'single',
        label: 'Type of Training:',
        options: ['Classroom Based or Group Training', 'Read and Understand', 'On-The-Job Training', 'N/A', 'Other'],
        otherText: true,
      },
    ],
  },
  {
    key: 'qad',
    name: 'QAD Assessment',
    shortName: 'QAD Assessment',
    completedBy: 'QAD HOD / Designee',
    department: 'Quality Assurance (QAD)',
    heads: ['u_neha'],
    sop: 'SOP 5.5.1.7',
    fields: [
      { id: 'stabilityProtocol', type: 'yna', label: 'Is there an impact on the Stability Protocol?' },
      { id: 'vendor', type: 'yna', label: 'Is there an impact on the Vendor Qualification?' },
      { id: 'qualityAgreement', type: 'yna', label: 'Is there an impact on the Quality Agreement?' },
    ],
  },
];

export const ASSESSMENT_BY_KEY = Object.fromEntries(ASSESSMENTS.map((a) => [a.key, a]));

// Master Workflow Stage 3 decision outcomes (the paper form only has Accepted / Rejected)
export const DECISIONS = [
  { id: 'accept', label: 'Accept without Action', hint: 'No additional action required.' },
  { id: 'accept_action', label: 'Accept with Action', hint: 'Identify action items, owners and due dates/durations.' },
  { id: 'clarify', label: 'Request Clarification / Correction', hint: 'Returns the CC to the initiator; after re-endorsement ALL HODs reassess.' },
  { id: 'reject', label: 'Not Acceptable', hint: 'Justification required; QA resolves.' },
];

// ---- Section V: regulatory assessment (Regulatory Affairs) ----
export const ANDA_STATUS = ['Not Yet Submitted', 'Submitted/Pending', 'Approved', 'Not Applicable'];
export const REPORTING_CRITERIA = [
  'Supplement- Prior Approval Required',
  'Supplement-Changes being affected in 30 days',
  'Supplement- Changes being affected',
  'Annual Reportable Change',
  'File with Original NDA/ANDA/DMF',
  'Amendment to DMF',
  'File with Deficiency Letter Response',
  'No Filing Required',
];

// ---- Section VIII: QA risk assessment ----
export const RISK_QUESTIONS = [
  { id: 'q1a', group: '1. Quality Risks', label: 'Is there an impact on the CQA of any product?' },
  { id: 'q1b', group: '1. Quality Risks', label: 'Is there an impact on the manufacturability of any product?' },
  { id: 'q1c', group: '1. Quality Risks', label: 'Is there an impact on the stability of any product?' },
  { id: 'q1d', group: '1. Quality Risks', label: 'Is there an impact on any method/process validation?' },
  { id: 'q2a', group: '2. Other Risks', label: 'Are there any other potential risks? (If yes, describe below)' },
];

// ---- Section X: QA closeout ----
export const CLOSEOUT_QUESTIONS = [
  { id: 'c1', label: '1. Has the Change Control been reviewed by all applicable departments?' },
  { id: 'c2', label: '2. Is the list of activities/action items completed?' },
  { id: 'c3', label: '3. Have applicable assessments been performed?' },
  { id: 'c4', label: '4. Does the Change Control impact any other documents/systems?' },
  {
    id: 'c4b',
    label: 'If yes, has an appropriate action plan been initiated to update the impacted documents/systems accordingly?',
    sub: true,
    dependsOn: { field: 'c4', value: 'Yes' },
  },
  { id: 'c5', label: '5. Does the Change Control impact a third party outside of Carnegie?' },
  {
    id: 'c6',
    label: '6. Have all copies of the superseded document including relevant attachments been removed from circulation?',
  },
  { id: 'c7', label: '7. Is there any extension to the Change Control? (If yes, attach supporting documents)' },
  { id: 'c8', label: '8. Has training been completed?' },
];
export const FINAL_DISPOSITION = [
  'The change was implemented, and the request is considered closed',
  'Change Request canceled – no action is taken',
];

// ---- Extension rules (Carnegie feedback section 4): requested additional DAYS, sequential approval.
// 1st–3rd: Initiator's HOD > QAD HOD (QAD HOD may optionally forward ANY request to the CEO for final approval)
// 4th:     Initiator's HOD > QAD HOD > CEO (mandatory).  A fifth extension is an open decision (not assumed).
export const MAX_EXTENSIONS = 4;
export function extensionChain(level) {
  const chain = [{ role: 'initiator_hod', label: "Initiator's HOD", kind: 'step' }, { role: 'qad_hod', label: 'QAD HOD', kind: level >= 4 ? 'forward_only' : 'final_or_forward' }];
  if (level >= 4) chain.push({ role: 'ceo', label: 'CEO (mandatory)', kind: 'final' });
  return chain;
}
// ---- Items tracked as OPEN decisions (Carnegie feedback section 5) – not assumed approved
export const OPEN_DECISIONS = [
  { id: 'OD-1', title: 'Client / regulatory approval gates', detail: 'Exact timing gates for client and regulatory approval are not confirmed.', behaviour: 'The RA determination is recorded and the related action goes into the common list. No blanket client-evidence blocker at QA approval (Administration > Settings can enable one for demonstration).' },
  { id: 'OD-2', title: 'Amendment and cancellation after QA approval', detail: 'Rules after QA approval, especially after partial implementation, are not confirmed.', behaviour: 'The initiator can request an amendment and a QA Designee decides it; a QA Designee can cancel with a documented reason. Both are shown as “pending QA/Management confirmation”.' },
  { id: 'OD-3', title: 'Controlled-document / training evidence and retention (Part 11)', detail: 'Evidence requirements for controlled documents and training, and system retention / Part 11 controls, are not confirmed.', behaviour: 'Each action needs evidence or a “not applicable” statement; document versions are retained. Retention and Part 11 controls are not modelled.' },
  { id: 'OD-4', title: 'Fifth extension', detail: 'Treatment of any fifth extension is not confirmed.', behaviour: 'A fifth request is blocked with a message to contact QA; no routing is assumed.' },
];
export const VERSION = { number: '2.1', label: 'CCMS Prototype v2.1', source: 'Carnegie “CCMS Prototype: Consolidated Feedback and Requirements” (Feedback_on_UI.docx)', base: 'CCMS Prototype v2.0 (Master Workflow + SOP QAD003.04)' };

// ---- Master Workflow stages (the tracker shown on every Change Control) ----
export const STAGES = [
  { n: 1, name: 'Initiation & Endorsement' },
  { n: 2, name: 'QA Screening' },
  { n: 3, name: 'Departmental Assessment' },
  { n: 4, name: 'Regulatory & Client' },
  { n: 5, name: 'Consolidation' },
  { n: 6, name: 'QA Approval' },
  { n: 7, name: 'Implementation' },
  { n: 8, name: 'QA Closeout' },
];

export const STATUS = {
  DRAFT: 'Draft',
  PEND_ENDORSE: 'Pending Department Head Endorsement',
  PEND_SCREEN: 'Pending QA Screening',
  ASSESS: 'Departmental Assessment',
  REG: 'Regulatory Assessment',
  CONSOL: 'Pending Initiator Consolidation',
  QA_APPROVAL: 'Pending QA Approval',
  CLARIFY: 'Clarification Requested',
  REENDORSE: 'Pending HOD Re-endorsement',
  IMPL: 'Implementation in Progress',
  CLOSEOUT: 'Pending QA Closeout',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned for Correction',
};
