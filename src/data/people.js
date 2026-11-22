// Roles per the Carnegie "Consolidated Feedback and Requirements" (v2.1).
// One account may hold several roles; navigation and permissions are the union.
export const ROLES = {
  employee: { label: 'Employee / User' },
  hod: { label: 'HOD' },
  ra_designee: { label: 'RA Designee' },
  qa_designee: { label: 'QA Designee' },
  ceo: { label: 'CEO' },
  admin: { label: 'System Admin' },
};
export const DEPARTMENTS = ['Manufacturing', 'Quality Control', 'Operations', 'Analytical R&D', 'Information Technology', 'EHS', 'Quality Assurance', 'Regulatory Affairs'];
export const USERS = [
  { id: 'u_ananya', name: 'Ananya Sharma', roles: ['employee'], dept: 'Manufacturing', title: 'Manufacturing Executive', group: 'Employees / Users' },
  { id: 'u_pooja', name: 'Pooja Menon', roles: ['employee'], dept: 'Quality Control', title: 'QC Analyst', group: 'Employees / Users' },
  { id: 'u_karan', name: 'Karan Patel', roles: ['employee'], dept: 'Manufacturing', title: 'Production Supervisor', group: 'Employees / Users' },
  { id: 'u_nikhil', name: 'Nikhil Verma', roles: ['employee'], dept: 'Engineering', title: 'Maintenance Engineer', group: 'Employees / Users' },
  { id: 'u_sonal', name: 'Sonal Desai', roles: ['employee'], dept: 'Regulatory Affairs', title: 'Regulatory Executive', group: 'Employees / Users' },
  { id: 'u_arjun', name: 'Arjun Nair', roles: ['employee'], dept: 'Manufacturing', title: 'Senior Executive', group: 'Employees / Users' },
  { id: 'u_vikram', name: 'Vikram Rao', roles: ['hod'], dept: 'Manufacturing', title: 'HOD – Manufacturing', group: 'HODs' },
  { id: 'u_rajesh', name: 'Rajesh Kulkarni', roles: ['hod'], dept: 'Operations', title: 'HOD – Operations', group: 'HODs' },
  { id: 'u_saurabh', name: 'Dr. Saurabh Joshi', roles: ['hod'], dept: 'Analytical R&D', title: 'HOD – ARD', group: 'HODs' },
  { id: 'u_meenal', name: 'Meenal Shah', roles: ['hod'], dept: 'Quality Control', title: 'HOD – QCS', group: 'HODs' },
  { id: 'u_vivek', name: 'Vivek Menon', roles: ['hod'], dept: 'Information Technology', title: 'HOD – ITR', group: 'HODs' },
  { id: 'u_kavita', name: 'Kavita Reddy', roles: ['hod'], dept: 'EHS', title: 'HOD – EHS', group: 'HODs' },
  { id: 'u_neha', name: 'Dr. Neha Kapoor', roles: ['hod'], dept: 'Quality Assurance', title: 'QAD HOD', group: 'HODs' },
  { id: 'u_meera', name: 'Meera Iyer', roles: ['hod', 'ra_designee'], dept: 'Regulatory Affairs', title: 'HOD – Regulatory Affairs (also RA Designee)', group: 'RA Designee' },
  { id: 'u_priya', name: 'Priya Nair', roles: ['qa_designee'], dept: 'Quality Assurance', title: 'QA Designee', group: 'QA Designee' },
  { id: 'u_karuna', name: 'Karuna Rao', roles: ['ceo'], dept: 'Management', title: 'CEO', group: 'CEO' },
  { id: 'u_rohit', name: 'Rohit Sinha', roles: ['admin'], dept: 'Information Technology', title: 'System Administrator', group: 'System Admin' },
];
export const DEPT_HEAD = { Manufacturing: 'u_vikram', 'Quality Control': 'u_meenal', Operations: 'u_rajesh', 'Analytical R&D': 'u_saurabh', 'Information Technology': 'u_vivek', EHS: 'u_kavita', 'Quality Assurance': 'u_neha', 'Regulatory Affairs': 'u_meera', Engineering: 'u_rajesh' };
export const userById = (id) => USERS.find((u) => u.id === id);
export const hasRole = (u, ...rs) => !!u && u.roles.some((r) => rs.includes(r));
export const roleLabel = (u) => (u ? u.roles.map((r) => ROLES[r].label).join(' + ') : '');
export const isQadHod = (u) => !!u && hasRole(u, 'hod') && u.dept === 'Quality Assurance';
export const EMPLOYEES = USERS.filter((u) => !hasRole(u, 'admin', 'ceo'));
