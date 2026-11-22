# Carnegie Pharma – Change Control Management System (CCMS) Prototype

| | |
|---|---|
| **Version** | **v2.1** (update of CCMS Prototype v2.0) |
| **Source document** | Carnegie “CCMS Prototype: Consolidated Feedback and Requirements” – `docs/Feedback_on_UI.docx` |
| **Procedure basis** | Carnegie Master Workflow (8 stages) + SOP QAD003.04 (used where the Master Workflow is silent) |

> Demonstration software – not validated, not for GMP records. Data is stored locally (`data/ccms-db.json` under `npm run dev`, otherwise browser storage).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm test         # 31 workflow-engine checks
```
Node 18+. Sign in as any user; switch user/role from the top-right menu. Administration → Settings → *Reset demo data* restores the starting scenario (sign in as Rohit Sinha).

## What changed in v2.1 (mapped to the Carnegie feedback)
| Feedback point | Implemented |
|---|---|
| **1. Roles & navigation** – Employee/User, HOD, RA Designee, QA Designee, CEO, System Admin; one account may hold several roles | New role model; menus and permissions are the union of an account’s roles (e.g. *Meera Iyer = HOD + RA Designee*). Sidebar shows only permitted items: **Dashboard · My Tasks · Change Controls · Reports · Administration · Audit Trail**. Admin sees Dashboard, Administration and Audit Trail only. Audit Trail is Admin-only; authorized users read each CC’s *Activity History*. |
| Create Change Control button | In the sidebar above Dashboard, and on the Dashboard |
| Notifications in the header | Bell with pending tasks and **one-week due-date reminders** (CC due date and action due dates) |
| **2a Dashboard** | Role-specific: Employee (My Tasks, My open CCs, Due soon + pending list); HOD adds department activity; QA Designee / CEO site-wide status. Duplicate activity/overview widgets removed. |
| **2b My Tasks** | One inbox for endorsements, reviews, action items, clarifications, corrections, extension approvals and QA decisions. Each row opens the record directly on the required action (action items open the exact action). |
| **2c Change Controls list** | Search by CC number / title keywords; **Open** requests shown first; quick-view (ⓘ) per row; contextual **Request Extension / Request Amendment** for permitted users. |
| **2d Create CC** | Dynamic four-column table **S.No · Current State · Proposed Change · Justification**, one change per row, Add Row, expand icon for long text; the same table is shown to every reviewer. Redundant “supporting/reference documents required” prompt removed. Temporary ID until QA issues the CC number. |
| **2e Documents** | Multiple uploads; preview for HOD, departmental reviewers, RA and QA; **final signed documents** can be added at implementation/closeout; superseded drafts and version history are retained. |
| **2f Reports** | Search by CC number; downloadable **interim report** (any time) and **final dossier** (closed CCs: details, assessments incl. earlier rounds, actions, extensions, document versions, decisions and e-signatures, activity history). HOD = department scope; QA Designee/CEO = site-wide. |
| **3a Review & endorsement** | HOD endorsement and QA screening (QA Designee issues the CC number). Departmental HODs assess with the exact QAD checklists; **remarks** are separate from **actions**, which are created and assigned separately **with target dates**. ARD **or** QCS HOD signs Analytical/Stability once (no duplicate sign-off). |
| **Restart rule** | Any HOD (or RA) clarification/correction → CC returns to the initiator → **initiator’s HOD re-endorses → ALL designated HODs reassess and sign again** (prior answers and action items prefilled and editable; earlier rounds, signatures and history preserved; same CC number). The same applies when RA or QA returns a pre-approval proposal. |
| **3b RA / client approval** | RA Designee records whether client approval/regulatory action is needed; the related work goes into the **common action list**; QA Designee confirms the RA determination at approval. The client-evidence blocker is **off by default** (open decision). |
| **3c QA approval & execution** | QA Designee performs routine QA functions; overall due date defaults to **60 days after final QA approval**, editable by authorized QA, never earlier than the latest action deadline. |
| **3d Implementation & closeout** | Owners complete with mandatory comments and applicable evidence (or “no evidence applicable”); initiator verifies all actions; QA reviews Section X and closes with e-signature; returns/rejections need reasons; closeout can be returned under the same CC number with flagged actions and an initiator resubmit step. |
| **4 Extensions** | Initiator enters **additional days** + reason (CC details and extension count prefilled). Sequential: **1st–3rd** Initiator’s HOD → QAD HOD (QAD HOD may optionally forward *any* request to the CEO); **4th** Initiator’s HOD → QAD HOD → **CEO (mandatory)**. Approvers approve, reject or return with reasons. Only approved extensions count. CC due date and **pending action deadlines change only after full approval**; original dates and completed actions are retained. |
| **5 Open decisions** | Tracked in Administration → *Open decisions* (not assumed approved): client/regulatory gates · amendment & cancellation after QA approval · controlled-document/training evidence & Part 11 retention · **fifth extension** (blocked with a message). |

## Users
Employees/Users: Ananya Sharma (Manufacturing, initiator), Pooja Menon (QC), Karan Patel, Nikhil Verma, Sonal Desai, Arjun Nair · HODs: Vikram Rao (Manufacturing), Rajesh Kulkarni (Operations), Dr. Saurabh Joshi (ARD), Meenal Shah (QCS), Vivek Menon (ITR), Kavita Reddy (EHS), **Dr. Neha Kapoor (QAD HOD)** · **Meera Iyer (HOD + RA Designee)** · **Priya Nair (QA Designee)** · **Karuna Rao (CEO, read-only except extension decisions)** · Rohit Sinha (System Admin).

## Demo scenarios (pre-loaded, built by the real engine)
* **Ananya** – respond to the clarification on the BMR-114 CC; create a CC with the change table.
* **Vikram** – re-endorse a corrected CC (all HODs then reassess); endorse a new request.
* **Pooja’s HOD (Meenal)** – re-endorsement task; round-2 reassessment with prefilled answers.
* **Dr. Neha Kapoor** – QAD checklist only; extension waiting for the QAD HOD (*Approve (final)* / *Forward to CEO*).
* **Karuna Rao (CEO)** – read-only access; decides extensions forwarded to the CEO.
* **Priya Nair** – screening, approval (RA determination review), closeout, interim/final reports.
* **Nikhil / Karan** – My Tasks opens the exact action; one action is overdue, one due within a week.
* **Rohit Sinha** – Administration (users, checklists, settings, open decisions, version/source) and the system-wide Audit Trail.

## Notes
* Includes the closeout-correction loop added after v2.0 feedback (QA return with flagged actions → initiator returns action → owner adds evidence → initiator resubmits).
* Not modelled (open decisions): client/regulatory gate timing, post-approval amendment/cancellation rules, Part 11 retention, fifth extension.
* Structure: `src/data/forms.js` (exact QAD questions, extension chain, open decisions, version) · `src/data/people.js` (roles/users) · `src/engine.js` (workflow rules + audit history) · `src/views/*` · `src/report.js` · `tests/`.
