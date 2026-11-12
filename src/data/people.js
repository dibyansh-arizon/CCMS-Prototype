export const ROLES = {
  initiator: { label: 'Initiator', group: 'Requesting Department' },
  dept_head: { label: 'Department Head', group: 'Requesting Department' },
  employee: { label: 'Action Owner (Employee)', group: 'Requesting Department' },
  qa_designee: { label: 'QA Designee', group: 'Quality Assurance' },
  qa_head: { label: 'Head of QA', group: 'Quality Assurance' },
  ops_head: { label: 'Head of Operations', group: 'Assessment Heads' },
  ard_head: { label: 'Head of ARD', group: 'Assessment Heads' },
  qcs_head: { label: 'Head of QCS', group: 'Assessment Heads' },
  itr_head: { label: 'Head of ITR', group: 'Assessment Heads' },
  ehs_head: { label: 'Head of EHS', group: 'Assessment Heads' },
  ra_head: { label: 'Head of Regulatory Affairs', group: 'Regulatory Affairs' },
  management: { label: 'Management', group: 'Management' },
  admin: { label: 'System Administrator', group: 'System' },
  auditor: { label: 'Auditor / Inspector', group: 'System' },
};

export const DEPARTMENTS = [
  'Manufacturing',
  'Quality Control',
  'Operations',
  'Analytical R&D',
  'Information Technology',
  'EHS',
  'Quality Assurance',
  'Regulatory Affairs',
];

export const USERS = [
  { id: 'u_ananya', name: 'Ananya Sharma', roleId: 'initiator', dept: 'Manufacturing', title: 'Manufacturing Executive' },
  { id: 'u_pooja', name: 'Pooja Menon', roleId: 'initiator', dept: 'Quality Control', title: 'QC Analyst' },
  { id: 'u_vikram', name: 'Vikram Rao', roleId: 'dept_head', dept: 'Manufacturing', title: 'Head of Manufacturing' },
  { id: 'u_karan', name: 'Karan Patel', roleId: 'employee', dept: 'Manufacturing', title: 'Production Supervisor' },
  { id: 'u_nikhil', name: 'Nikhil Verma', roleId: 'employee', dept: 'Engineering', title: 'Maintenance Engineer' },
  { id: 'u_sonal', name: 'Sonal Desai', roleId: 'employee', dept: 'Regulatory Affairs', title: 'Regulatory Executive' },
  { id: 'u_arjun', name: 'Arjun Nair', roleId: 'employee', dept: 'Manufacturing', title: 'Senior Executive' },
  { id: 'u_priya', name: 'Priya Nair', roleId: 'qa_designee', dept: 'Quality Assurance', title: 'QA Designee' },
  { id: 'u_neha', name: 'Dr. Neha Kapoor', roleId: 'qa_head', dept: 'Quality Assurance', title: 'Head of Quality Assurance' },
  { id: 'u_rajesh', name: 'Rajesh Kulkarni', roleId: 'ops_head', dept: 'Operations', title: 'Head of Operations' },
  { id: 'u_saurabh', name: 'Dr. Saurabh Joshi', roleId: 'ard_head', dept: 'Analytical R&D', title: 'Head of ARD' },
  { id: 'u_meenal', name: 'Meenal Shah', roleId: 'qcs_head', dept: 'Quality Control', title: 'Head of QCS' },
  { id: 'u_vivek', name: 'Vivek Menon', roleId: 'itr_head', dept: 'Information Technology', title: 'Head of ITR' },
  { id: 'u_kavita', name: 'Kavita Reddy', roleId: 'ehs_head', dept: 'EHS', title: 'Head of EHS' },
  { id: 'u_meera', name: 'Meera Iyer', roleId: 'ra_head', dept: 'Regulatory Affairs', title: 'Head of Regulatory Affairs' },
  { id: 'u_karuna', name: 'Karuna Rao', roleId: 'management', dept: 'Management', title: 'Site Head' },
  { id: 'u_rohit', name: 'Rohit Sinha', roleId: 'admin', dept: 'Information Technology', title: 'System Administrator' },
  { id: 'u_amit', name: 'Amit Khanna', roleId: 'auditor', dept: 'Quality Assurance', title: 'Internal Auditor (read-only)' },
];

// Head of each department (used for endorsement, training assessment, extension approval)
export const DEPT_HEAD = {
  Manufacturing: 'u_vikram',
  'Quality Control': 'u_meenal',
  Operations: 'u_rajesh',
  'Analytical R&D': 'u_saurabh',
  'Information Technology': 'u_vivek',
  EHS: 'u_kavita',
  'Quality Assurance': 'u_neha',
  'Regulatory Affairs': 'u_meera',
};

export const userById = (id) => USERS.find((u) => u.id === id);
export const usersByRole = (roleId) => USERS.filter((u) => u.roleId === roleId);
export const roleLabel = (u) => (u ? ROLES[u.roleId]?.label || u.roleId : '');
export const EMPLOYEES = USERS.filter((u) => !['admin', 'auditor', 'management'].includes(u.roleId));
