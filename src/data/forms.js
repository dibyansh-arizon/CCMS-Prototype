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
    completedBy: 'Head of Operations Department / Designee',
    department: 'Operations',
    roles: ['ops_head'],
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
    completedBy: 'Head of ARD or QCS / Designee',
    department: 'ARD / QCS',
    roles: ['ard_head', 'qcs_head'],
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
    completedBy: 'Head of ARD or QCS / Designee',
    department: 'ARD / QCS',
    roles: ['ard_head', 'qcs_head'],
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
    completedBy: 'Head of ITR Department / Designee',
    department: 'Information Technology (ITR)',
    roles: ['itr_head'],
    sop: 'SOP 5.5.1.4',
    fields: [{ id: 'validation', type: 'yna', label: 'Validation/Qualification Required?' }],
  },
  {
    key: 'safety',
    name: 'Safety Risk Assessment',
    shortName: 'Safety Risk',
    completedBy: 'Head of EHS Department / Designee',
    department: 'EHS',
    roles: ['ehs_head'],
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
    completedBy: "Head of the Initiator's Department / Designee",
    department: "Initiator's Department",
    roles: [], // resolved at runtime: head of the initiating department
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
    completedBy: 'Head of QAD / Designee',
    department: 'Quality Assurance (QAD)',
    roles: ['qa_head'],
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
  { id: 'clarify', label: 'Request Clarification', hint: 'Returns only this assessment to the initiator.' },
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

// ---- Extensions (SOP 5.11): level drives duration and review/approval chain ----
export const EXTENSION_LEVELS = [
  { level: 1, days: 60, label: '1st extension – 60 days', chain: [{ role: 'qa_designee', type: 'approve', label: 'QAD Designee' }] },
  {
    level: 2,
    days: 90,
    label: '2nd extension – 90 days',
    chain: [
      { role: 'qa_designee', type: 'review', label: 'QAD Designee' },
      { role: 'dept_head', type: 'approve', label: "Head of Initiator's Department" },
    ],
  },
  {
    level: 3,
    days: 120,
    label: '3rd extension – 120 days',
    chain: [
      { role: 'qa_designee', type: 'review', label: 'QAD Designee' },
      { role: 'dept_head', type: 'review', label: "Head of Initiator's Department" },
      { role: 'qa_head', type: 'approve', label: 'Head of QAD' },
    ],
  },
  {
    level: 4,
    days: 180,
    label: '4th extension – 180 days',
    chain: [
      { role: 'qa_designee', type: 'review', label: 'QAD Designee' },
      { role: 'dept_head', type: 'review', label: "Head of Initiator's Department" },
      { role: 'qa_head', type: 'review', label: 'Head of QAD' },
      { role: 'management', type: 'approve', label: 'Management' },
    ],
  },
];

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
  IMPL: 'Implementation in Progress',
  CLOSEOUT: 'Pending QA Closeout',
  CLOSED: 'Closed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned for Correction',
};
